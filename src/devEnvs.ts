import { Logger } from "./logger"
import vscode from 'vscode'
import path from 'path'
import JSON5 from 'json5'
import * as dsdk from "./demistoSDKWrapper";
import * as yaml from "yaml";
import * as fs from "fs-extra";
import { execSync, spawn } from "child_process";
import { parse, stringify } from "envfile"
import { installDemistoSDKGlobally, getContentPath } from "./tools";
import glob from "glob";

async function addPythonPath(): Promise<void> 
    const contentPath = getContentPath()
    if (!contentPath) {
        return
    }

    const pylintPlugins = path.resolve(path.join(contentPath, "..", "demisto_sdk", "demisto_sdk", "commands", "lint", "resources", "pylint_plugins"))
    let PYTHONPATH = `${contentPath}/Packs/Base/Scripts/CommonServerPython/:${contentPath}/Tests/demistomock/:`
    const apiModules = execSync(`printf '%s:' ${contentPath}/Packs/ApiModules/Scripts/*`).toString().trim()
    PYTHONPATH += apiModules
    PYTHONPATH += pylintPlugins
    const envFilePath = path.join(contentPath, '.env')
    if (!await fs.pathExists(envFilePath)) {
        fs.createFileSync(envFilePath)
    }
    const envFile = fs.readFileSync(envFilePath, 'utf8')
    Logger.info(`envFile: ${envFile}`)
    const env = parse(envFile)
    env["PYTHONPATH"] = PYTHONPATH
    env["MYPYPATH"] = PYTHONPATH
    Logger.info(stringify(env))
    fs.writeFileSync(envFilePath, stringify(env))

}

export async function installDevEnv(): Promise<void> {
    const workspaces = vscode.workspace.workspaceFolders;
    if (!workspaces) {
        vscode.window.showErrorMessage('Could not find a valid workspace');
        return;
    }
    const workspace = workspaces[0];
    const dirPath = workspace.uri.fsPath;
    // check if content is in dirPath
    if (!dirPath.includes('content')) {
        vscode.window.showErrorMessage('Please run this command from a content repository');
        return;
    }

    // should we install global dependencies?
    await vscode.window.showQuickPick(['Yes', 'No'], {
        title: "Install global dependencies with Homebrew?",
        placeHolder: "Homebrew should be installed to run this step. Skip if you want to install dependencies manually."
    }).then(async (answer) => {
        if (answer === 'Yes') {
            await vscode.window.showQuickPick(['gcc', 'python', 'poetry', 'node', 'docker', 'pyenv', 'pipx', 'shellcheck'],
                { title: 'Select dependencies to install', canPickMany: true }).then(async (dependencies) => {
                    if (dependencies) {
                        await installGlobalDependencies(dependencies)
                    }
                })
        }
    })
    await vscode.window.showQuickPick(['Yes', 'No'], {
        title: 'Install Demisto-SDK globally?',
        placeHolder: "This will install demisto-sdk globally in your system with pipx"
    }).then(async (answer) => {
        if (answer === 'Yes') {
            installDemistoSDKGlobally()
        }
    })

    // install recommended extensions
    // To install recommended extensions, we need to show them first
    await vscode.commands.executeCommand('workbench.extensions.action.showRecommendedExtensions')
    // sleep for 3 seconds to let the windows load
    await new Promise(resolve => setTimeout(resolve, 3000))
    vscode.commands.executeCommand('workbench.extensions.action.installWorkspaceRecommendedExtensions', true)

    let shouldPreCommit = false
    await vscode.window.showQuickPick(['Yes', 'No'], {
        title: 'Do you want to install pre-commit hooks?',
        placeHolder: "Installing pre-commit hooks will run `validate` and `lint` before every commit"
    }).then(async (answer) => {
        if (answer === 'Yes') {
            shouldPreCommit = true
        }
    })

    // bootstrap content (run bootstrap script)
    await bootstrapContent(dirPath, shouldPreCommit)
    // copy settings file
    const settingsFile = path.resolve(__dirname, '../Templates/settings.json')
    const settingsFileOutput = path.resolve(dirPath, '.vscode/settings.json')
    fs.copyFileSync(settingsFile, settingsFileOutput)

    // set up environment variables
    await addPythonPath()
    fs.createFileSync(path.join(dirPath, 'Packs/Base/Scripts/CommonServerPython/CommonServerUserPython.py'))

    await vscode.window.showQuickPick(['Yes', 'No'], {
        title: 'Would you like to configure the connection to XSOAR?',
        placeHolder: "This will ask you to configure the connection XSOAR, allowing Demisto-SDK commands such as upload and download",
    }).then(async (answer) => {
        if (answer === 'Yes') {
            configureDemistoVars()
        }
    })


}

function installGlobalDependencies(dependencies: string[]) {
    Logger.info('Install global dependencies')
    const task = new vscode.Task(
        { type: 'dependencies', name: 'Install global dependencies' },
        vscode.TaskScope.Workspace,
        'dependencies',
        'dependencies',
        new vscode.ShellExecution(`sh -x ${path.resolve(__dirname, '../Scripts/setup_dependencies.sh')} "${dependencies.join(' ')}"`),
    )
    return new Promise<void>(resolve => {
        vscode.window.withProgress({
            title: `Bootstrap content`,
            location: vscode.ProgressLocation.Notification
        }, async (progress) => {
            progress.report({ message: `Installing global dependencies` })
            const execution = await vscode.tasks.executeTask(task);
            const disposable = vscode.tasks.onDidEndTaskProcess(e => {
                if (e.execution === execution) {
                    if (e.exitCode === 0) {
                        disposable.dispose()
                        resolve()
                    }
                    else {
                        vscode.window.showWarningMessage('Could not installing global dependencies')
                    }
                }
            })
            progress.report({ message: "Processing..." });
        })

    })
}

async function getDemistoSDKPath(contentPath: string): Promise<string | undefined> {
    const demistoSDKParentPath = path.resolve(path.join(contentPath, '..'))
    let demistoSDKPathString = path.resolve(demistoSDKParentPath, 'demisto-sdk')
    if (!await fs.pathExists(demistoSDKPathString)) {
        Logger.info(`demisto-sdk not found in ${demistoSDKPathString}`)
        const answer = await vscode.window.showQuickPick(['Select Demisto-SDK path', 'Clone repository'],
            {
                placeHolder: 'Do you want to use an existing repository or clone a new one?',
                title: 'Select Demisto-SDK repository path'
            })
        if (answer === 'Clone repository') {
            // If the user doesn't close the VSCode window, it will not proceed to the next step
            vscode.window.showInformationMessage(
                'After cloning, close VSCode message to proceed.',
                { modal: true })
            await vscode.commands.executeCommand('git.clone', 'git@github.com:demisto/demisto-sdk.git', demistoSDKParentPath)
        }
        if (answer === 'Select Demisto-SDK path') {
            const demistoSDKPath = await vscode.window.showOpenDialog({
                canSelectFiles: false,
                canSelectFolders: true,
                openLabel: 'Select demisto-sdk repository',
                title: 'Select demisto-sdk repository'
            })
            if (!demistoSDKPath) {
                return
            }
            demistoSDKPathString = demistoSDKPath[0].fsPath
        }

    }
    return demistoSDKPathString
}

export async function developDemistoSDK(): Promise<void> {
    const contentPath = getContentPath()
    if (!contentPath) {
        vscode.window.showErrorMessage('Please run this command from a content repository')
        return
    }
    const demistoSDKPathString = await getDemistoSDKPath(contentPath)
    if (!demistoSDKPathString) {
        vscode.window.showErrorMessage('Please select a valid demisto-sdk repository')
        return
    }
    const vsCodePath = path.join(contentPath, '.vscode')

    vscode.window.showInformationMessage(`Using Demisto-SDK path: ${demistoSDKPathString}`)
    Logger.info(`demisto sdk path is ${demistoSDKPathString}`)
    const launchDemistoSDK = JSON5.parse(fs.readFileSync(path.resolve(__dirname, '../Templates/launch-demisto-sdk.json'), 'utf-8'))
    launchDemistoSDK.configurations[0].cwd = contentPath
    fs.writeJSONSync(path.join(demistoSDKPathString, '.vscode', 'launch.json'), launchDemistoSDK, { spaces: 4 })
    fs.copyFileSync(path.resolve(__dirname, '../Templates/demisto_sdk_settings.json'), path.join(demistoSDKPathString, '.vscode', 'settings.json'))
    const workspace = {
        'folders':
            [{ 'path': contentPath }, { 'path': demistoSDKPathString }],
        'settings': {}
    }
    const workspaceOutput = path.join(vsCodePath, `demisto-sdk_content.code-workspace`)
    fs.writeJsonSync(workspaceOutput, workspace, { spaces: 2 })
    const response = await vscode.window.showQuickPick(['Existing Window', 'New Window'],
        {
            placeHolder: 'Select if you want to open in existing window or new window',
            title: 'Where would you like to open the environment?'
        })
    const openInNewWindow = response === 'New Window'
    const installDemistoSDK = await vscode.window.showQuickPick(['Yes', 'No'], {
        title: 'Do you want to install Demisto-SDK dependencies?',
        placeHolder: " Will run poetry install in the demisto-sdk repository"
    })
    if (installDemistoSDK === 'Yes') {
        spawn(`cd ${demistoSDKPathString} && poetry install`)
    }
    vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(workspaceOutput), openInNewWindow)

}

export async function configureDemistoVars(): Promise<void> {
    const workspaces = vscode.workspace.workspaceFolders;
    if (!workspaces) {
        vscode.window.showErrorMessage('Could not find a valid workspace');
        return;
    }
    const workspace = workspaces[0];
    const dirPath = workspace.uri.fsPath;
    const envFilePath = path.join(dirPath, '.env')
    if (!await fs.pathExists(envFilePath)) {
        fs.createFileSync(envFilePath)
    }
    vscode.window.showInformationMessage(`Setting up environment in .env file in ${envFilePath}`)
    let env = parse(fs.readFileSync(envFilePath, 'utf8'))
    if (!env) {
        env = {}
    }
    await vscode.window.showInputBox({
        title: 'XSOAR URL',
        value: 'http://localhost:8080',
        ignoreFocusOut: true,
    }).then(url => {
        if (url) {
            env["DEMISTO_BASE_URL"] = url
        }
    })
    vscode.window.showInformationMessage('Enter either XSOAR username and password, or an API key')
    await vscode.window.showInputBox({
        title: 'XSOAR username (optional)',
        value: 'admin',
        ignoreFocusOut: true,
    }).then(username => {
        if (username) {
            env["DEMISTO_USERNAME"] = username
        }
    })
    await vscode.window.showInputBox({
        title: 'XSOAR password (optional)',
        value: 'admin',
        password: true,
        ignoreFocusOut: true,
    }).then(password => {
        if (password) {
            env["DEMISTO_PASSWORD"] = password
        }
    })

    await vscode.window.showInputBox({
        title: 'XSOAR API key (optional)',
        placeHolder: 'Leaving blank will use username and password',
        password: true,
        ignoreFocusOut: true,
    }).then((apiKey) => {
        if (apiKey) {
            env["DEMISTO_API_KEY"] = apiKey
        }
    })
    await vscode.window.showQuickPick(
        ['true', 'false'],
        {
            title: "XSOAR SSL verification",
            placeHolder: 'Should XSOAR SSL verification be enabled?',
        }
    ).then(verifySSL => {
        if (verifySSL) {
            env["DEMISTO_VERIFY_SSL"] = verifySSL
        }
    })
    fs.writeFileSync(envFilePath, stringify(env))

}

export async function openIntegrationDevContainer(dirPath: string): Promise<void> {
    const filePath = path.parse(dirPath)
    const packDir = path.resolve(path.join(dirPath, '..', '..'))

    const vsCodePath = path.join(packDir, '.vscode')

    const devcontainerFolder = path.join(packDir, '.devcontainer')
    Logger.info(`devcontainerFolder is ${devcontainerFolder}`)
    Logger.info('Create json configuration for debugging')
    if (!await fs.pathExists(vsCodePath)) {
        fs.mkdirSync(vsCodePath)
    }
    const ymlFilePath = path.join(dirPath, filePath.name.concat('.yml'))
    const ymlObject = yaml.parseDocument(fs.readFileSync(ymlFilePath, 'utf8')).toJSON();


    let dockerImage = ymlObject.dockerimage || ymlObject?.script.dockerimage
    dockerImage = dockerImage.replace('demisto', 'devtestdemisto')
    Logger.info(`docker image is ${dockerImage}`)
    const devcontainerJsonPath = path.resolve(__dirname, '../Templates/integration_env/.devcontainer/devcontainer.json')
    const devcontainer = JSON5.parse(fs.readFileSync(devcontainerJsonPath, 'utf-8'))
    vscode.window.showInformationMessage("Building devcontainer folder")
    fs.copySync(path.resolve(__dirname, '../Templates/integration_env/.devcontainer'), devcontainerFolder)
    fs.copySync(path.resolve(__dirname, '../Scripts/create_certs.sh'), path.join(devcontainerFolder, 'create_certs.sh'))
    Logger.info('devcontainer folder created')
    vscode.window.showInformationMessage("Starting demisto-sdk lint, please wait")
    devcontainer.name = `XSOAR Integration: ${filePath.name}`

    // lint currently does not remove commonserverpython file for some reason
    const CommonServerPython = path.join(dirPath, 'CommonServerPython.py')
    if (filePath.name !== "CommonServerPython" && await fs.pathExists(CommonServerPython)) {
         fs.removeSync(CommonServerPython)
    }
    createLaunchJson(ymlObject.type, dirPath, filePath, vsCodePath);
    createSettings(vsCodePath, dirPath, '/usr/local/bin/python', false)

    await dsdk.lint(dirPath, false, false, false, true)

    // delete cache folders and *.pyc files
    fs.rmdir(path.join(dirPath, '__pycache__'), { recursive: true })
    fs.rmdir(path.join(dirPath, '.pytest_cache'), { recursive: true })
    fs.rmdir(path.join(dirPath, '.mypy_cache'), { recursive: true })
    fs.rmdir(path.join(dirPath, '__pycache__'), { recursive: true })
    // glob for *.pyc files and remove
    const pycFiles = glob.sync(path.join(dirPath, '*.pyc'))
    pycFiles.forEach(file => { fs.remove(file) })

    try {
        const testDockerImage = execSync(`docker images --format "{{.Repository}}:{{.Tag}}" | grep ${dockerImage} | head -1`,
            { cwd: dirPath, }).toString().trim()
        if (!testDockerImage) {
            Logger.error('Docker image not found, exiting')
            vscode.window.showErrorMessage('Docker image not found, exiting')
            return
        }
        devcontainer.build.args.IMAGENAME = testDockerImage
        fs.writeJSONSync(path.join(devcontainerFolder, 'devcontainer.json'), devcontainer, { spaces: 2 })
    }
    catch (err) {
        Logger.error(`Could not find docker image ${dockerImage}: ${err}}`)
        throw new Error(`Could not find docker image ${dockerImage}: ${err}}`)
    }
    Logger.info(`remote name is: ${vscode.env.remoteName}`)
    Logger.info(`fileName is: ${dirPath}`)
    Logger.info(`uri schema is ${vscode.env.uriScheme}`)
    let fileNameUri = vscode.Uri.file(packDir)
    // if we are already inside a remote, the URI prefix should be `vscode://`
    if (vscode.env.remoteName === 'dev-container') {
        const local_workspace_path = process.env.LOCAL_WORKSPACE_PATH
        if (!local_workspace_path) {
            return
        }
        const reltaveFileName = vscode.workspace.asRelativePath(dirPath)
        Logger.debug(`relative pack is ${reltaveFileName}`)
        const localFileName = path.join(local_workspace_path, reltaveFileName).replaceAll('\\', '/')
        Logger.debug(`local file path is ${localFileName}`)
        fileNameUri = vscode.Uri.parse(`vscode://${localFileName}`)
    }
    else if (vscode.env.remoteName === "wsl") {
        fileNameUri = vscode.Uri.parse(`vscode://${packDir}`)
    }

    if (!(await vscode.commands.getCommands()).includes('remote-containers.openFolder')) {
        vscode.window.showErrorMessage('Please install remote-containers extension to use this feature')
    }
    else {
        // second argument is open in new window
        vscode.commands.executeCommand('remote-containers.openFolder', fileNameUri, true)
    }
}

async function createLaunchJson(type: string, dirPath: string, filePath: path.ParsedPath, vsCodePath: string) {
    let launchJson;
    const cwd = '${workspaceFolder}/' + path.relative(path.join(vsCodePath, '..'), dirPath)
    if (type === 'powershell') {
        const launchJsonPath = path.resolve(__dirname, '../Templates/launch-powershell.json');
        launchJson = JSON5.parse(fs.readFileSync(launchJsonPath, 'utf-8'));
        const script = path.join(cwd, filePath.name.concat('.ps1'));
        launchJson.configurations[0].script = script;
        launchJson.configurations[0].cwd = cwd;
    }
    else {
        const launchJsonPath = path.resolve(__dirname, '../Templates/launch-python.json');
        launchJson = JSON5.parse(fs.readFileSync(launchJsonPath, 'utf-8'));
        const program = path.join(cwd, filePath.name.concat('.py'));
        launchJson.configurations[0].program = program;
        launchJson.configurations[0].cwd = cwd;
    }
    const launchJsonOutput = path.join(vsCodePath, 'launch.json');
    if (!await fs.pathExists(vsCodePath)) {
        fs.mkdirSync(vsCodePath);
    }
    Logger.info('Copy launch.json');
    fs.writeJsonSync(launchJsonOutput, launchJson, { spaces: 2 });
}

export async function openInVirtualenv(dirPath: string): Promise<void> {
    const contentPath = getContentPath()
    if (!contentPath) {
        vscode.window.showErrorMessage('Please run this from Content repository')
        return
    }
    Logger.info(`Creating virtualenv in ${dirPath}`)
    const filePath = path.parse(dirPath)
    const packDir = path.resolve(path.join(dirPath, '..', '..'))
    const vsCodePath = path.join(packDir, '.vscode')
    if (!await fs.pathExists(vsCodePath)) {
        fs.mkdirSync(vsCodePath)
    }

    let shouldCreateVirtualenv = true
    if (await fs.pathExists(path.join(dirPath, 'venv'))) {
        //show input dialog if create virtualenv
        Logger.info('Virtualenv exists.')
        await vscode.window.showQuickPick(["Open existing virtual environment", "Create new virtual environment"], {
            title: `Found virtual environemnt in ${filePath.name}`,
            placeHolder: "Creating virtual environment can take few minutes"
        })
            .then(async (answer) => {
                if (answer === "Create new virtual environment") {
                    //remove venv dir
                    await fs.remove(path.join(dirPath, 'venv'))
                    shouldCreateVirtualenv = true
                }
                else {
                    shouldCreateVirtualenv = false
                }
            }
            )
    }
    const ymlFilePath = path.join(dirPath, filePath.name.concat('.yml'))
    const ymlObject = yaml.parseDocument(fs.readFileSync(ymlFilePath, 'utf8')).toJSON();

    // lint currently does not remove commonserverpython file for some reason
    const CommonServerPython = path.join(dirPath, 'CommonServerPython.py')
    if (await fs.pathExists(CommonServerPython)) {
        fs.removeSync(CommonServerPython)
    }
    createLaunchJson(ymlObject.type, dirPath, filePath, vsCodePath);
    createSettings(vsCodePath, dirPath, path.join(dirPath, 'venv', 'bin', 'python'), true);
    await addPythonPath()
    fs.copySync(path.join(contentPath, '.env'), path.join(packDir, '.env'))

    Logger.info('Run lint')
    await dsdk.lint(dirPath, false, false, false, true)

    if (shouldCreateVirtualenv) {
        vscode.window.showInformationMessage('Creating virtual environment. Might take a few minutes.')

        let dockerImage = ymlObject.dockerimage || ymlObject?.script.dockerimage
        dockerImage = dockerImage.replace('demisto', 'devtestdemisto')
        Logger.info(`docker image is ${dockerImage}, getting data`)
        vscode.window.showInformationMessage(`Creating virtualenv, please wait`)
        await createVirtualenv(filePath.name, dirPath, dockerImage)
    }
    const workspace = { 'folders': [{ 'path': contentPath }, { 'path': packDir }], 'settings': {} }
    const workspaceOutput = path.join(vsCodePath, `content-${filePath.name}.code-workspace`)
    fs.writeJsonSync(workspaceOutput, workspace, { spaces: 2 })
    const response = await vscode.window.showQuickPick(['Existing Window', 'New Window'],
        {
            placeHolder: 'Select if you want to open in existing window or new window',
            title: 'Where would you like to open the environment?'
        })
    const openInNewWindow = response === 'New Window'
    vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(workspaceOutput), openInNewWindow)
}

async function createSettings(vsCodePath: string, dirPath: string, interpreterPath: string, changeLinterPath: boolean) {
    Logger.info('Getting settings.json');
    const contentPath = getContentPath()
    if (!contentPath) {
        throw new Error("No content path configured")
    }
    const settingsPath = path.join(vsCodePath, 'settings.json')
    // create if not exists
    if (!await fs.pathExists(settingsPath)) {
        Logger.info('Creating settings.json')
        fs.writeJSONSync(settingsPath, {})
    }

    const settings = JSON5.parse(fs.readFileSync(settingsPath, 'utf-8'));
    Logger.info('Setting settings.json to venv');
    const relativePath = '${workspaceFolder}/' + path.relative(path.join(vsCodePath, '..'), dirPath)
    settings['python.defaultInterpreterPath'] = interpreterPath;
    settings['python.testing.cwd'] = relativePath;
    settings["python.testing.pytestEnabled"] = true;
    settings["python.testing.pytestArgs"] = ["."];
    settings["python.linting.mypyEnabled"] = true;
    settings["python.linting.mypyArgs"] = [
        "--follow-imports=silent",
        "--ignore-missing-imports",
        "--show-column-numbers",
        "--no-pretty",
        "--allow-redefinition",
        "--check-untyped-defs",
    ];
    settings["python.linting.flake8Enabled"] = true;

    if (changeLinterPath && fs.pathExistsSync(path.join(contentPath, ".venv"))) {
        settings["python.linting.mypyPath"] = `${contentPath}/.venv/bin/mypy`
        settings["python.linting.flake8Path"] = `${contentPath}/.venv/bin/flake8`
        settings["python.formatting.autopep8Path"] = `${contentPath}/.venv/bin/autopep8`
    }
    else {
        settings["python.linting.mypyPath"] = 'mypy'
        settings["python.linting.flake8Path"] = 'flake8'
        settings["python.formatting.autopep8Path"] = 'autopep8'

    }
    fs.writeJSONSync(settingsPath, settings, { spaces: 2 });
}

async function bootstrapContent(dirPath: string, shouldPreCommit: boolean) {
    Logger.info('Bootstrap content')
    let command = `${dirPath}/.hooks/bootstrap`
    if (!shouldPreCommit) {
        command = `NO_HOOKS=1 ${command}`
    }
    command = `export PATH=/opt/homebrew/bin:"$PATH" && ${command}`
    const task = new vscode.Task(
        { type: 'bootstrap', name: 'Bootstrap content' },
        vscode.TaskScope.Workspace,
        'bootstrap',
        'bootstrap',
        new vscode.ShellExecution(command),
    )
    return new Promise<void>(resolve => {
        vscode.window.withProgress({
            title: `Bootstrap content`,
            location: vscode.ProgressLocation.Notification
        }, async (progress) => {
            progress.report({ message: `In bootstrap please wait` })
            const execution = await vscode.tasks.executeTask(task);
            const disposable = vscode.tasks.onDidEndTaskProcess(e => {
                if (e.execution === execution) {
                    if (e.exitCode === 0) {
                        disposable.dispose()
                        resolve()
                    }
                    else {
                        vscode.window.showErrorMessage('Could not bootstrap content')
                        throw new Error('Could not bootstrap content')
                    }
                }
            })
            progress.report({ message: "Processing..." });
        })

    })

}

async function createVirtualenv(name: string, dirPath: string, dockerImage: string): Promise<void> {
    // this implemented in a script, should be a command in SDK.
    // When SDK added this command, change to use it as wrapper.
    Logger.info('Running virtualenv task')
    const setupVenvScript = path.resolve(__dirname, '../Scripts/setup_venv.sh')
    const cmd = `${setupVenvScript} ${dockerImage} ${name} ${dirPath} ` + "${command:python.interpreterPath}"
    const task = new vscode.Task(
        { type: 'virtualenv', name: 'Setup virtualenv' },
        vscode.TaskScope.Workspace,
        'virtualenv',
        'virtualenv',
        new vscode.ShellExecution(cmd, { cwd: dirPath }));
    return new Promise<void>(resolve => {
        vscode.window.withProgress({
            cancellable: false,
            title: `Creating virtualenv in ${dirPath}`,
            location: vscode.ProgressLocation.Notification
        }, async (progress) => {
            progress.report({ message: `Creating virtualenv please wait` })
            const execution = await vscode.tasks.executeTask(task);
            const disposable = vscode.tasks.onDidEndTaskProcess(e => {
                if (e.execution === execution) {
                    if (e.exitCode === 0) {
                        disposable.dispose()
                        resolve()
                    }
                    else {
                        vscode.window.showErrorMessage('Could not create virtualenv')
                        throw new Error('Could not create virtualenv')
                    }
                }
            })
            progress.report({ message: "Processing..." });
        })
    })
}


