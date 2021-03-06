import { Logger } from "./logger"
import vscode from 'vscode'
import path from 'path'
import JSON5 from 'json5'
import * as dsdk from "./demistoSDKWrapper";
import * as yaml from "yaml";
import * as fs from "fs-extra";
import { execSync } from "child_process";

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
        await vscode.window.showInformationMessage(`Found virtualenv in ${filePath.name}. Open existing virtualenv?`, "Yes", "No")
            .then(async (answer) => {
                if (answer === "Yes") {
                    shouldCreateVirtualenv = false
                }
                else {
                    //remove venv dir
                    await fs.remove(path.join(dirPath, 'venv'))
                    shouldCreateVirtualenv = true
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