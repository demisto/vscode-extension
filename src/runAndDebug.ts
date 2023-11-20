import * as vscode from 'vscode';
import { TerminalManager } from './terminalManager';
import { setupIntegrationEnv } from './devEnvs';
import path from "path";
import * as fs from "fs-extra";
import * as yaml from "yaml";
import * as tools from './tools';

interface Argumnet {
    name: string
    description: string
    required: string | boolean
    predefined: string[]
}

interface Command {
    name: string
    description: string
    arguments: Argumnet[]
}

function getDebuggingConfiguration(workspaceFolder: vscode.WorkspaceFolder, configName: string): vscode.DebugConfiguration {
    const launchConfig = vscode.workspace.getConfiguration('launch', workspaceFolder).get<vscode.DebugConfiguration[]>(`configurations`)

    if (!launchConfig || !Array.isArray(launchConfig)) {
        vscode.window.showErrorMessage("Please run Setup integration env command")
        throw new Error
    }

    const debugConfig = launchConfig.find((config: vscode.DebugConfiguration) => config.name == configName)
    if (!debugConfig) {
        vscode.window.showErrorMessage("Debug configuration was not found. Please run Setup integration env command")
        throw new Error
    }
    return debugConfig
}

function quickPickItemForCommands(_list: Command[]): vscode.QuickPickItem[] {
    if (_list.length > 0) {
        return _list.map((command: Command) => {
            return { label: command.name, detail: command.description }
        })
    }
    else {
        return []
    }
}

function QuickPickItemForArgs(_list: Argumnet[]): [vscode.QuickPickItem[], string[]] {

    const argsRequired: string[] = []
    const argsList: vscode.QuickPickItem[] = _list.map((arg: Argumnet) => {
        if (arg.required === "true" || arg.required === true) {
            arg.required = "required";
            argsRequired.push(arg.name)
        }
        else {
            arg.required = "optional"
        }
        return { label: arg.name, detail: arg.description, description: arg.required }
    })
    // Order the argument list so that required is at the beginning
    return [argumentSorted(argsList), argsRequired]
}

function QuickPickItemForPredefined(_list: string[]): vscode.QuickPickItem[] {
    if (_list.length > 0) {
        return _list.map((item: string) => {
            return { label: item }
        })
    }
    return []
}

function argumentSorted(_list: vscode.QuickPickItem[]): vscode.QuickPickItem[] {
    if (_list.length > 0) {
        _list.sort((arg1: vscode.QuickPickItem, arg2: vscode.QuickPickItem) => {
            if (arg1.description == "required" && arg2.description != "required") {
                return -1;
            }
            if (arg1.description != "required" && arg2.description == "required") {
                return 1;
            }
            return 0
        })
        return _list
    }
    return _list
}

function runCommand(query: Map<string, string>) {
    let cmd = `"${query.get('cmd')}`
    if (typeof cmd === 'string') {
        query.delete('cmd')
        const queryTest = Array.from(query.entries())
        queryTest.map((arg: [string, string]) => {
            cmd += ` ${arg[0]}=${arg[1]}`
        })
        const q: string[] = ['run', '-q', cmd + `"`]
        TerminalManager.sendDemistoSDKCommand(q);
    }
}

async function showCommandsOrArguments(commandNames: vscode.QuickPickItem[], runOrDebug: string): Promise<vscode.QuickPickItem | undefined> {

    let placeHolder: string;
    if (runOrDebug == "DEBUG") {
        placeHolder = "The command to debug in IDE"
    }
    else {
        placeHolder = "The command to run with XSOAR"
    }
    return await vscode.window.showQuickPick(
        commandNames, {
        title: "Choose your command",
        placeHolder: placeHolder
    }
    );

}

async function argsManagment(argumentNames: vscode.QuickPickItem[], args: Argumnet[], argsRequired: string[],
    query: Map<string, string>, runOrDebug: string): Promise<[Map<string, string> | undefined, boolean | undefined]> {

    let flag = false
    return await showCommandsOrArguments(argumentNames, runOrDebug).then(async (arg) => {
        if (arg && arg.label != "Run command") {
            const argument = args.find(x => x.name == arg.label)
            if (argument?.predefined) {
                const predefined: vscode.QuickPickItem[] | undefined = QuickPickItemForPredefined(argument.predefined)
                if (predefined) {
                    await vscode.window.showQuickPick(
                        predefined
                    ).then((value) => {
                        if (value && value.label) {
                            query.set(arg.label, value.label)
                        }
                    })
                }
            }
            else {
                await vscode.window.showInputBox(
                    {
                        placeHolder: arg.description
                    }
                ).then(
                    async (value) => {
                        if (value) {
                            query.set(arg.label, value)
                        }
                    }
                )
            }
            return [query, flag]
        }
        else {
            const argsRequiredMissing: string[] = []
            if (argsRequired.length > 0) {
                argsRequired.map((argName: string) => {
                    if (query.has(argName)) {
                        console.log(argName)
                    }
                    else {
                        argsRequiredMissing.push(argName)
                    }
                })
            }
            if (argsRequiredMissing.length > 0) {
                let message = ''
                argsRequiredMissing.map((arg: string) => {
                    message += '\n' + arg
                })
                const header = 'The following arguments are required:'
                await vscode.window.showInformationMessage(header, { modal: true, detail: message }, "Back").then(async (response) => {
                    if (response != "Back") {
                        flag = true
                        return [query, flag]
                    }
                    else {
                        return [query, flag]
                    }
                })
            }
            else {
                flag = true
                return [query, flag]
            }
        }
    }).then(() => { return [query, flag] })
}

async function runIntegration(ymlObject: any, runOrDebug: string): Promise<Map<string, string> | undefined> {
    // Map for query the command
    const query: Map<string, string> = new Map<string, string>()

    // Map contain all of the integration's commands
    const commandNames: vscode.QuickPickItem[] | undefined = quickPickItemForCommands(ymlObject.script.commands)
    const commands: Map<string, Command> = new Map<string, Command>()
    ymlObject.script.commands.forEach((command: Command) => { commands.set(command.name, command) })

    return await showCommandsOrArguments(commandNames, runOrDebug).then(async (commandName) => {
        if (commandName) {
            const command = commands.get(commandName.label)
            if (command) {
                query.set('cmd', command.name)
                const [argumentNames, argsRequired] = QuickPickItemForArgs(command.arguments)
                if (argumentNames) {
                    argumentNames.unshift({ label: "Run command", detail: "After you've finished filling in the arguments, or no arguments have been consumed" })
                    let flag = true
                    while (flag == true) {
                        await argsManagment(argumentNames, command.arguments, argsRequired, query, runOrDebug).then(async ([queryForRun, ForRun]) => {
                            if (ForRun == true) {
                                flag = false
                                console.log(`${queryForRun}`)
                            }
                            if (!queryForRun && !ForRun) {
                                return
                            }
                        })
                    }
                }
            }
        }
    }).then(() => { return query })
}

async function runScript(ymlObject: any, runOrDebug: string): Promise<Map<string, string>> {
    const query: Map<string, string> = new Map<string, string>()
    const [argumentNames, argsRequired] = QuickPickItemForArgs(ymlObject.args)
    query.set('cmd', ymlObject.name)

    argumentNames.unshift({ label: "Run command", detail: "After you've finished filling in the arguments, or no arguments have been consumed" })
    let flag = true
    const a = async () => {
        while (flag == true) {
            await argsManagment(argumentNames, ymlObject.args, argsRequired, query, runOrDebug).then(async ([queryForRun, ForRun]) => {
                if (ForRun == true) {
                    flag = false
                    console.log(`${queryForRun}`)
                }
            })
        }
        return query
    }

    return await a()

}


export async function run(dirPath: string): Promise<void> {

    const commandRes = await vscode.window.showQuickPick(['Debug in VSCode', 'Run in XSOAR'], { title: 'do you want debug it locally or run in XSOAR?' })
    if (commandRes === undefined) {
        return
    }
    let command: string;
    if (commandRes === "Debug in VSCode") {
        command = "DEBUG"
    }
    else {
        command = "RUN"
    }

    const shouldSetup = await vscode.window.showQuickPick(['No', 'Yes'], { title: 'do you want to setup environment before?' })
    if (shouldSetup && shouldSetup === "Yes") {
        await setupIntegrationEnv(dirPath)
    }
    const runAndDebug = async () => {
        const filePath = path.parse(dirPath)
        const ymlFilePath = path.join(dirPath, filePath.name.concat('.yml'))
        const ymlObject = yaml.parseDocument(fs.readFileSync(ymlFilePath, 'utf8')).toJSON()

        let queryMap: Map<string, string> | undefined
        if ("configuration" in ymlObject) {
            queryMap = await runIntegration(ymlObject, command)
        }
        else {
            queryMap = await runScript(ymlObject, command)
        }
        if (queryMap === undefined || queryMap.size === 0) {
            return
        }
        if (queryMap) {
            if (command == "DEBUG") {
                fs.writeJSONSync(
                    path.join(dirPath, ".args_command.json"),
                    Object.fromEntries(queryMap),
                    { spaces: 4 }
                )
                const contentWorkspace = tools.getContentWorkspace()
                if (!contentWorkspace) {
                    vscode.window.showErrorMessage("Could not find content workspace")
                    return
                }
                let debugConfig = getDebuggingConfiguration(contentWorkspace, `Docker: Debug (${filePath.name})`)
                if (!debugConfig) {
                    debugConfig = getDebuggingConfiguration(contentWorkspace, "Python: Debug Integration locally")
                }
                vscode.debug.startDebugging(contentWorkspace, debugConfig)
            }
            else if (command == "RUN") {
                runCommand(queryMap)
            }
        }
    }
    await runAndDebug()
}
