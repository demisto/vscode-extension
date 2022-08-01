import { Logger } from "./logger"
import vscode from 'vscode'
import path from 'path'
import JSON5 from 'json5'
import * as dsdk from "./demistoSDKWrapper";
import * as yaml from "yaml";
import * as fs from "fs-extra";
import { execSync } from "child_process";
import { parse, stringify } from "envfile"
import { installDemistoSDKGlobally } from "./tools";


export async function installDevEnv(): Promise<void> {
    const workspaces = vscode.workspace.workspaceFolders;
    if (!workspaces) {
        vscode.window.showErrorMessage('Could not find a valid workspace');
        return;
    }
    const workspace = workspaces[0];
    const dirPath = workspace.uri.fsPath;

    // should we install global dependencies?
    await vscode.window.showQuickPick(['Yes', 'No'], {
        title: "Install global dependencies with Homebrew?",
        placeHolder: "Homebrew should be installed to run this step. Skip if you want to install dependencies manually."
    }).then(async (answer) => {
        if (answer === 'Yes') {
            await vscode.window.showQuickPick(['python', 'poetry', 'node', 'docker', 'pyenv', 'pipx'],
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

    // install code to path
    vscode.commands.executeCommand('workbench.action.installCommandLine')

    // install recommended extensions
    // To install recommended extensions, we need to show them first
    await vscode.commands.executeCommand('workbench.extensions.action.showRecommendedExtensions')
    // sleep for 3 seconds to let the windows load
    await new Promise(resolve => setTimeout(resolve, 3000))
    vscode.commands.executeCommand('workbench.extensions.action.installWorkspaceRecommendedExtensions', true)

    // bootstrap content (run bootstrap script)
    await bootstrapContent(dirPath)
    // copy settings file
    const settingsFile = path.resolve(__dirname, '../Templates/settings.json')
    const settingsFileOutput = path.resolve(dirPath, '.vscode/settings.json')
    fs.copyFileSync(settingsFile, settingsFileOutput)

    // set up environment variables
    let PYTHONPATH = `${dirPath}/Packs/Base/Scripts/CommonServerPython/:${dirPath}/Tests/demistomock/:`
    const apiModules = execSync(`printf '%s: ' ${dirPath}/Packs/ApiModules/Scripts/*`).toString().trim()
    PYTHONPATH += apiModules
    const envFilePath = path.join(dirPath, '.env')
    if (!await fs.pathExists(envFilePath)) {
        fs.createFileSync(envFilePath)
    }
    const envFile = fs.readFileSync(envFilePath, 'utf8')
    Logger.info(`envFile: ${envFile}`)
    const env = parse(envFile)
    env["PYTHONPATH"] = PYTHONPATH
    env["MYPYPATH"] = PYTHONPATH
    Logger.info(JSON5.stringify(env))
    Logger.info(stringify(env))
    fs.writeFileSync(envFilePath, stringify(env))
    fs.createFileSync(path.join(dirPath, 'Packs/Base/Scripts/CommonServerPython/CommonServerUserPython.py'))
    configureDemistoVars()

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
        value: 'http://localhost:8080'
    }).then(url => {
        if (url) {
            env["DEMISTO_BASE_URL"] = url
        }
    })
    vscode.window.showInformationMessage('Enter either XSOAR username and password, or an API key')
    await vscode.window.showInputBox({
        title: 'XSOAR username (optional)',
        value: 'admin'
    }).then(username => {
        if (username) {
            env["DEMISTO_USERNAME"] = username
        }
    })
    await vscode.window.showInputBox({
        title: 'XSOAR password (optional)',
        value: 'admin',
        password: true
    }).then(password => {
        if (password) {
            env["DEMISTO_PASSWORD"] = password
        }
    })

    await vscode.window.showInputBox({
        title: 'XSOAR API key (optional)',
        placeHolder: 'Leaving blank will use username and password',
        password: true
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
    const vsCodePath = path.join(dirPath, '.vscode')

    const devcontainerFolder = path.join(dirPath, '.devcontainer')
    Logger.info(`devcontainerFolder is ${devcontainerFolder}`)
    Logger.info('Create json configuration for debugging')
    if (!await fs.pathExists(vsCodePath)) {
        fs.mkdirSync(vsCodePath)
    }
    const ymlFilePath = path.join(dirPath, filePath.name.concat('.yml'))
    const ymlObject = yaml.parseDocument(fs.readFileSync(ymlFilePath, 'utf8')).toJSON();

    let launchJson
    if (ymlObject.type === 'powershell') {
        const launchJsonPath = path.resolve(__dirname, '../Templates/launch-powershell.json')
        launchJson = JSON5.parse(fs.readFileSync(launchJsonPath, 'utf-8'))
        launchJson.configurations[0].script = "${workspaceFolder}/" + `${filePath.name}.ps1`

    }
    else {
        const launchJsonPath = path.resolve(__dirname, '../Templates/launch-python.json')
        launchJson = JSON5.parse(fs.readFileSync(launchJsonPath, 'utf-8'))
        launchJson.configurations[0].program = "${workspaceFolder}/" + `${filePath.name}.py`
    }
    const launchJsonOutput = path.join(vsCodePath, 'launch.json')
    if (!await fs.pathExists(vsCodePath)) {
        fs.mkdirSync(vsCodePath)
    }
    Logger.info('Copy launch.json')
    fs.writeJsonSync(launchJsonOutput, launchJson, { spaces: 2 })

    const dockerImage = ymlObject.dockerimage || ymlObject?.script.dockerimage
    Logger.info(`docker image is ${dockerImage}`)
    const devcontainerJsonPath = path.resolve(__dirname, '../Templates/integration_env/.devcontainer/devcontainer.json')
    const devcontainer = JSON5.parse(fs.readFileSync(devcontainerJsonPath, 'utf-8'))
    vscode.window.showInformationMessage("Building devcontainer folder")
    fs.copySync(path.resolve(__dirname, '../Templates/integration_env/.devcontainer'), devcontainerFolder)
    fs.copySync(path.resolve(__dirname, '../Scripts/create_certs.sh'), path.join(devcontainerFolder, 'create_certs.sh'))
    Logger.info('devcontainer folder created')
    vscode.window.showInformationMessage("Starting demisto-sdk lint, please wait")
    await dsdk.lint(dirPath, false, false, true)
    try {
        const testDockerImage = execSync(`docker images --format "{{.Repository}}:{{.Tag}}" | grep devtest${dockerImage} | head -1`,
            { cwd: dirPath, }).toString().trim()
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
    let fileNameUri = vscode.Uri.file(dirPath)
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
        fileNameUri = vscode.Uri.parse(`vscode://${dirPath}`)
    }

    if (!(await vscode.commands.getCommands()).includes('remote-containers.openFolder')) {
        vscode.window.showErrorMessage('Please install remote-containers extension to use this feature')
    }
    else {
        // second argument is open in new window
        vscode.commands.executeCommand('remote-containers.openFolder', fileNameUri, true)
    }
}

export async function openInVirtualenv(dirPath: string): Promise<void> {
    Logger.info(`Creating virtualenv in ${dirPath}`)
    const filePath = path.parse(dirPath)
    const vsCodePath = path.join(dirPath, '.vscode')

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
    let launchJson
    if (ymlObject.type === 'powershell') {
        const launchJsonPath = path.resolve(__dirname, '../Templates/launch-powershell.json')
        launchJson = JSON5.parse(fs.readFileSync(launchJsonPath, 'utf-8'))
        launchJson.configurations[0].script = "${workspaceFolder}/" + `${filePath.name}.ps1`

    }
    else {
        const launchJsonPath = path.resolve(__dirname, '../Templates/launch-python.json')
        launchJson = JSON5.parse(fs.readFileSync(launchJsonPath, 'utf-8'))
        launchJson.configurations[0].program = "${workspaceFolder}/" + `${filePath.name}.py`
    }
    const launchJsonOutput = path.join(vsCodePath, 'launch.json')
    if (!await fs.pathExists(vsCodePath)) {
        fs.mkdirSync(vsCodePath)
    }
    Logger.info('Copy launch.json')
    fs.writeJsonSync(launchJsonOutput, launchJson, { spaces: 2 })

    if (shouldCreateVirtualenv) {
        vscode.window.showInformationMessage('Creating virtual environment. Might take a few minutes.')
        Logger.info('Run lint')
        await dsdk.lint(dirPath, false, false, true)

        const dockerImage = ymlObject.dockerimage || ymlObject?.script.dockerimage
        Logger.info(`docker image is ${dockerImage}, getting data`)
        vscode.window.showInformationMessage(`Creating virtualenv, please wait`)
        await createVirtualenv(filePath.name, dirPath, dockerImage)
    }

    const settingsPath = path.join(vsCodePath, 'settings.json')
    // create if not exists
    if (!await fs.pathExists(settingsPath)) {
        Logger.info('Creating settings.json')
        fs.writeJSONSync(settingsPath, {})
    }
    Logger.info('Getting settings.json')
    const settings = JSON5.parse(fs.readFileSync(settingsPath, 'utf-8'))
    Logger.info('Setting settings.json to venv')
    settings['python.defaultInterpreterPath'] = `${dirPath}/venv/bin/python`
    settings['python.testing.cwd'] = dirPath
    settings["python.testing.pytestEnabled"] = true
    settings["python.testing.pytestArgs"] = ["."]
    settings["python.linting.mypyEnabled"] = true
    settings["python.linting.mypyArgs"] = [
        "--follow-imports=silent",
        "--ignore-missing-imports",
        "--show-column-numbers",
        "--no-pretty",
        "--allow-redefinition"
    ]
    settings["python.linting.flake8Enabled"] = true
    fs.writeJSONSync(settingsPath, settings, { spaces: 2 })
    // open folder in new window
    Logger.info('Opening folder')
    // second argument is open in new window
    vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(dirPath), true)

}

async function bootstrapContent(dirPath: string) {
    Logger.info('Bootstrap content')
    const task = new vscode.Task(
        { type: 'bootstrap', name: 'Bootstrap content' },
        vscode.TaskScope.Workspace,
        'bootstrap',
        'bootstrap',
        new vscode.ShellExecution(`NO_HOOKS=1 ${dirPath}/.hooks/bootstrap`),
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
    const extraReqsPY3 = path.resolve(__dirname, '../Templates/integration_env/.devcontainer/extra-requirements-py3.txt')
    const setupVenvScript = path.resolve(__dirname, '../Scripts/setup_venv.sh')
    const cmd = `${setupVenvScript} ${dockerImage} ${name} ${dirPath} ${extraReqsPY3} ` + "$(dirname '${command:python.interpreterPath}')"
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


