import { execSync } from "child_process"
import { Logger } from "./logger"
import fetch from 'node-fetch'
import { Cache, CacheContainer } from 'node-ts-cache'
import { MemoryStorage } from 'node-ts-cache-storage-memory'
import os from 'os'
import vscode from 'vscode'
import path from 'path'
import JSON5 from 'json5'
import * as dsdk from "./demistoSDKWrapper";
import * as yaml from "yaml";
import * as fs from "fs-extra";
import { TerminalManager } from "./terminalManager"

const testVersion = true

export async function createIntegrationDevContainer(fileName: string): Promise<void> {
    const devcontainerFolder = path.join(fileName, '.devcontainer')
    Logger.info(`devcontainerFolder is ${devcontainerFolder}`)
    Logger.info('Create json configuration for debugging')
    const launchJsonPath = path.resolve(__dirname, '../Templates/launch.json')
    const launchJsonOutput = path.join(fileName, '.vscode', 'launch.json')
    fs.copySync(launchJsonPath, launchJsonOutput)

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
        let cmd
        const output = path.join(devcontainerFolder, 'certs.crt')
        if (os.platform() === 'win32'){
            cmd = `powershell ${path.resolve(__dirname, '../Templates/create_certs.ps1')} ${output}`
        }
        else{
            cmd = `sh -x ${path.resolve(__dirname, '../Templates/create_certs.sh')} ${output}`
        }
        Logger.info(cmd)
        TerminalManager.sendText(cmd, false)
        Logger.info('certs.crt created, now creating container')
    }
    else {
        Logger.info(`devcontainer folder exists. Updating Image to ${dockerImage}`)
        const devcontainer = JSON5.parse(fs.readFileSync(path.join(devcontainerFolder, 'devcontainer.json'), 'utf-8'))
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
        const localFileName = path.join(local_workspace_path, reltaveFileName).replaceAll('\\', '/')
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
    const devcontainerJsonPath = path.resolve(__dirname, '../Templates/content_env/.devcontainer/devcontainer.json')
    fs.copySync(path.resolve(__dirname, '../Templates/content_env/.devcontainer'), devcontainerFolder)
    const devcontainer = JSON5.parse(fs.readFileSync(devcontainerJsonPath, 'utf-8'))
    const dockerImage = await LatestDockerService.getLatestImage()
    Logger.info(`docker image is ${dockerImage}`)
    if (!testVersion && dockerImage) {
        devcontainer.build.args.IMAGENAME = dockerImage
        fs.writeJSONSync(path.join(devcontainerFolder, 'devcontainer.json'), devcontainer)
    }

    let cmd
    const output = path.join(devcontainerFolder, 'certs.crt')
    if (os.platform() === 'win32') {
        cmd = `powershell ${path.resolve(__dirname, '../Templates/create_certs.ps1')} ${output}`
    }
    else {
        cmd = `sh -x ${path.resolve(__dirname, '../Templates/create_certs.sh')} ${output}`
    }
    Logger.info(cmd)
    TerminalManager.sendText(cmd, false)
    Logger.info('certs.crt created, now creating container')
    if (!(await vscode.commands.getCommands()).includes('remote-containers.openFolder')) {
        vscode.window.showErrorMessage('Please install remote-containers extension to use this feature')
    }
    else {
        vscode.commands.executeCommand('remote-containers.openFolder', vscode.Uri.file(workspaceFolder.uri.fsPath))
    }
}
interface Docker {
    name: string
}

interface Dockers {
    results: Docker[]
}


const imageCache = new CacheContainer(new MemoryStorage())
//get latest image from docker hub
class LatestDockerService {
    @Cache(imageCache, { ttl: 60 * 60 })
    public static async getLatestImage(): Promise<string> {
        const url = `https://registry.hub.docker.com/v2/repositories/demisto/content-env/tags/`
        const response = await fetch(url)
        const json = await response.json() as Dockers
        try {
            return json.results[0].name
        }
        catch (error) {
            return ''
        }
    }
}