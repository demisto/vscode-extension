import { Logger } from "./logger"
import vscode from 'vscode'
import path from 'path'
import JSON5 from 'json5'
import * as dsdk from "./demistoSDKWrapper";
import * as yaml from "yaml";
import * as fs from "fs-extra";

export async function createIntegrationDevContainer(dirPath: string): Promise<void> {
    const devcontainerFolder = path.join(dirPath, '.devcontainer')
    Logger.info(`devcontainerFolder is ${devcontainerFolder}`)
    Logger.info('Create json configuration for debugging')
    const launchJsonPath = path.resolve(__dirname, '../Templates/launch.json')
    const launchJsonOutput = path.join(dirPath, '.vscode', 'launch.json')
    fs.copySync(launchJsonPath, launchJsonOutput)

    const filePath = path.parse(dirPath)
    const ymlFilePath = path.join(dirPath, filePath.name.concat('.yml'))

    const ymlObject = yaml.parseDocument(fs.readFileSync(ymlFilePath, 'utf8')).toJSON();
    const dockerImage = ymlObject.dockerimage || ymlObject?.script.dockerimage
    Logger.info(`docker image is ${dockerImage}`)
    if (!await fs.pathExists(path.join(devcontainerFolder, 'devcontainer.json'))) {
        vscode.window.showInformationMessage("Starting demisto-sdk lint, please wait")
        await dsdk.lint(dirPath, false, false, true)
        vscode.window.showInformationMessage("Building devcontainer folder")
        const devcontainerJsonPath = path.resolve(__dirname, '../Templates/integration_env/.devcontainer/devcontainer.json')
        const devcontainer = JSON.parse(fs.readFileSync(devcontainerJsonPath, 'utf-8'))
        devcontainer.build.args.IMAGENAME = dockerImage
        fs.copySync(path.resolve(__dirname, '../Templates/integration_env/.devcontainer'), devcontainerFolder)
        fs.copySync(path.resolve(__dirname, '../Scripts/create_certs.sh'), devcontainerFolder)
        fs.writeJSONSync(path.join(devcontainerFolder, 'devcontainer.json'), devcontainer, { spaces: 2 })
        Logger.info('devcontainer folder created')
    }
    else {
        Logger.info(`devcontainer folder exists. Updating Image to ${dockerImage}`)
        const devcontainer = JSON5.parse(fs.readFileSync(path.join(devcontainerFolder, 'devcontainer.json'), 'utf-8'))
        devcontainer.build.args.IMAGENAME = dockerImage
        fs.writeJSONSync(path.join(devcontainerFolder, 'devcontainer.json'), devcontainer, { spaces: 2 })
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

export async function createVirtualenv(dirPath: string): Promise<void> {
    Logger.info(`Creating virtualenv in ${dirPath}`)
    const filePath = path.parse(dirPath)

    let createVirtualenv = true
    if (await fs.pathExists(path.join(dirPath, 'venv'))) {
        //show input dialog if create virtualenv
        Logger.info('Virtualenv exists.')
        await vscode.window.showInformationMessage(`Found virtualenv in ${filePath.name}. Open existing virtualenv?`, "Yes", "No")
            .then(async (answer) => {
                if (answer === "Yes") {
                    createVirtualenv = false
                }
                else{
                    //remove venv dir
                    await fs.remove(path.join(dirPath, 'venv'))
                    createVirtualenv = true
                }
            }
            )
    }
    const launchJsonPath = path.resolve(__dirname, '../Templates/launch.json')
    const launchJsonOutput = path.join(dirPath, '.vscode', 'launch.json')
    Logger.info('Copy launch.json')
    fs.copySync(launchJsonPath, launchJsonOutput)
    if (createVirtualenv) {
        Logger.info('Run lint')
        await dsdk.lint(dirPath, false, false, true)
        const ymlFilePath = path.join(dirPath, filePath.name.concat('.yml'))
        const ymlObject = yaml.parseDocument(fs.readFileSync(ymlFilePath, 'utf8')).toJSON();
        const dockerImage = ymlObject.dockerimage || ymlObject?.script.dockerimage
        Logger.info(`docker image is ${dockerImage}, getting data`)
        vscode.window.showInformationMessage(`Creating virtualenv, please wait`)
        await virtualenvTask(filePath.name, dirPath, dockerImage)
    }

    // get settings path
    const vsCodePath = path.join(dirPath, '.vscode')
    if (!await fs.pathExists(vsCodePath)) {
        Logger.info('Creating .vscode folder')
        fs.mkdirSync(vsCodePath)
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
    fs.writeJSONSync(settingsPath, settings, { spaces: 2 })
    // open folder in new window
    Logger.info('Opening folder')
    vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(dirPath), true)

}

async function virtualenvTask(name: string, dirPath: string, dockerImage: string): Promise<void> {
    Logger.info('Running virtualenv task')
    const extraReqs = path.resolve(__dirname, '../Templates/integration_env/.devcontainer/extra-requirements.txt')
    const extraReqsPY3 = path.resolve(__dirname, '../Templates/integration_env/.devcontainer/extra-requirements-py3.txt')
    const setupVenvScript = path.resolve(__dirname, '../Scripts/setup_venv.sh')
    const cmd = `sh -x ${setupVenvScript} ${dockerImage} ${name} ${dirPath} ${extraReqs} ${extraReqsPY3}`
    const task = new vscode.Task(
        { type: 'virtualenv', name: 'Setup virtualenv' },
        vscode.TaskScope.Workspace,
        'virtualenv',
        dockerImage,
        new vscode.ShellExecution(cmd));
    return new Promise<void>(resolve => {
        vscode.window.withProgress({
            cancellable: false,
            title: `Creating virtualenv in ${dirPath}`,
            location: vscode.ProgressLocation.Notification
        }, async (progress) => {
            progress.report({ message: `Creating virtualenv please wait` })
            const execution = await vscode.tasks.executeTask(task);
            const disposable = vscode.tasks.onDidEndTask(e => {
                if (e.execution == execution) {
                    progress.report({ message: "Finished setup virtualenv", increment: 100 })
                    disposable.dispose();
                    resolve();
                }

            })
            progress.report({ message: "Proccessing..." });
        });

    })
}
