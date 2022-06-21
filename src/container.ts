import { execSync } from "child_process"
import { Logger } from "./logger"
import vscode from 'vscode'
import path from 'path'
import * as dsdk from "./demistoSDKWrapper";
import * as yaml from "yaml";
import * as fs from "fs-extra";


export async function createIntegrationDevContainer(fileName: string): Promise<void> {
    const devcontainerFolder = path.join(fileName, '.devcontainer')
    Logger.info(`devcontainerFolder is ${devcontainerFolder}`)
    const filePath = path.parse(fileName)
    const ymlFilePath = path.join(fileName, filePath.name.concat('.yml'))
    const ymlObject = yaml.parseDocument(fs.readFileSync(ymlFilePath, 'utf8')).toJSON();
    const dockerImage = ymlObject.dockerimage || ymlObject?.script.dockerimage
    Logger.info(`docker image is ${dockerImage}`)
    if (!await fs.pathExists(path.join(devcontainerFolder, 'devcontainer.json'))) {
        vscode.window.showInformationMessage("Starting demisto-sdk lint, please wait")
        await dsdk.lint(fileName, false, false, true)
        vscode.window.showInformationMessage("Building devcontainer folder")
        const devcontainerJsonPath = path.resolve(__dirname, '../Templates/integration_env/.devcontainer/devcontainer.json')
        const devcontainer = JSON.parse(fs.readFileSync(devcontainerJsonPath, 'utf-8'))
        devcontainer.build.args.IMAGENAME = dockerImage
        fs.copySync(path.resolve(__dirname, '../Templates/integration_env/.devcontainer'), devcontainerFolder)
        fs.writeJSONSync(path.join(devcontainerFolder, 'devcontainer.json'), devcontainer)
        Logger.info('devcontainer folder created')
        const cmd = `sh -x ${path.resolve(__dirname, '../Templates/create_certs.sh')} ${path.join(devcontainerFolder, 'certs.crt')}`
        Logger.info(cmd)
        execSync(cmd, { cwd: fileName })
        Logger.info('certs.crt created, now creating container')
    }
    else {
        Logger.info(`devcontainer folder exists. Updating Image to ${dockerImage}`)
        const devcontainer = JSON.parse(fs.readFileSync(path.join(devcontainerFolder, 'devcontainer.json'), 'utf-8'))
        devcontainer.build.args.IMAGENAME = dockerImage
        fs.writeJSONSync(path.join(devcontainerFolder, 'devcontainer.json'), devcontainer)
    }
    Logger.info(`remote name is: ${vscode.env.remoteName}`)
    Logger.info(`fileName is: ${fileName}`)
    Logger.info(`uri schema is ${vscode.env.uriScheme}`)
    let fileNameUri = vscode.Uri.file(fileName)
    // if we are already inside a remote, the URI prefix should be `vscode://`
    if (vscode.env.remoteName === 'dev-container') {
        const local_workspace_path = process.env.LOCAL_WORKSPACE_PATH
        if (!local_workspace_path) {
            return
        }
        const reltaveFileName = vscode.workspace.asRelativePath(fileName)
        Logger.debug(`relative pack is ${reltaveFileName}`)
        const localFileName = path.join(local_workspace_path, reltaveFileName)
        Logger.debug(`local file path is ${localFileName}`)
        fileNameUri = vscode.Uri.parse(`vscode://${localFileName}`)
    }
    else if (vscode.env.remoteName === "wsl") {
        fileNameUri = vscode.Uri.parse(`vscode://${fileName}`)
    }

    if (!(await vscode.commands.getCommands()).includes('remote-containers.openFolder')) {
        vscode.window.showErrorMessage('Please install remote-containers extension to use this feature')
    }
    else {
        // second argument is open in new window
        vscode.commands.executeCommand('remote-containers.openFolder', fileNameUri, true)
    }


}

export async function createContentDevContainer(): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders
    if (!workspaceFolders) {
        return
    }
    const workspaceFolder = workspaceFolders[0]
    const devcontainerFolder = path.join(workspaceFolder.uri.fsPath, '.devcontainer')
    Logger.info(`devcontainerFolder is ${devcontainerFolder}`)
    fs.copySync(path.resolve(__dirname, '../Templates/content_env/.devcontainer'), devcontainerFolder)
    const cmd = `sh -x ${path.resolve(__dirname, '../Templates/create_certs.sh')} ${path.join(devcontainerFolder, 'certs.crt')}`
    Logger.info(cmd)
    execSync(cmd, { cwd: devcontainerFolder })
    if (!(await vscode.commands.getCommands()).includes('remote-containers.openFolder')) {
        vscode.window.showErrorMessage('Please install remote-containers extension to use this feature')
    }
    else {
        vscode.commands.executeCommand('remote-containers.openFolder', vscode.Uri.file(workspaceFolder.uri.fsPath))
    }
}