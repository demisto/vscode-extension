import * as vscode from 'vscode';
import * as path from 'path';
import * as tools from './tools';
import * as fs from 'fs';
import * as yaml from "yaml";
import minimatch = require('minimatch');

import { TerminalManager } from './terminalManager';
import { Logger } from './logger';
import { writeJSONSync } from 'fs-extra';
import {setupIntegrationEnv} from "./devEnvs"
export function updateReleaseNotesCommand(file: string): void {

	const regs = new RegExp('Packs/[^/]*');  // TODO: Bug - Won't work in windows. 
	const matchGroup = file.match(regs);
	const packName = matchGroup ? matchGroup[0] : null;
	if (packName) {
		vscode.window.showQuickPick(
			['revision', 'minor', 'major', 'documentation'],
			{
				'placeHolder': 'What kind of update do you want to do?'
			}
		).then(
			(value) => {
				if (value) {
					const command = ['update-release-notes -i', packName.toString(), '-u', value];
					TerminalManager.sendDemistoSDKCommand(command);
				}
			});
	} else {
		vscode.window.showErrorMessage('Could not find a valid pack to update');
	}
}

export function validateCommand(file: string): void {
	const json_path = tools.getReportPath(file);
	const command = ['validate -i', file, '-j', json_path];
	TerminalManager.sendDemistoSDKCommand(command);
}

export function validateUsingGit(workspace: vscode.WorkspaceFolder): void {
	TerminalManager.sendDemistoSDKCommand(['validate', '-g', '-j', tools.getReportPathFromConf(workspace)]);
}
export function formatCommand(file: string): void {

	const command = ['format', '-i', file];
	TerminalManager.sendDemistoSDKCommand(command);
}
export async function uploadToXSOAR(file: string, progress = false): Promise<void> {
	const command = ['upload', '-i', file];
	if (progress) {
		await TerminalManager.sendDemistoSdkCommandWithProgress(command)
	}
	else {
		TerminalManager.sendDemistoSDKCommand(command);
	}

}
export function lintUsingGit(file: string): void {
	const command = ['lint', '-g', '-i ', file];
	TerminalManager.sendDemistoSDKCommand(command);

}
export async function lint(file: string, tests = true, lints = true, report = true, progress = false): Promise<void> {
	const command = ['lint', '-i', file];
	if (report) {
		command.push('-j', tools.getReportPath(file));
	}
	if (!tests) {
		command.push('--no-test', '--no-pwsh-test')
	}
	if (!lints) {
		command.push('--no-flake8', '--no-mypy', '--no-bandit', '--no-xsoar-linter', '--no-vulture', '--no-pylint', '--no-pwsh-analyze')
	}
	if (progress) {
		const isSuccess = await TerminalManager.sendDemistoSdkCommandWithProgress(command)
		if (!isSuccess) {
			await tools.isDemistoSDKinstalled()
			throw new Error('Demisto-SDK lint failed')
		}
	}
	else {
		TerminalManager.sendDemistoSDKCommand(command);
	}
}

/*************************** 
	  RUN   COMMAND
****************************/

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
				
	if (!launchConfig || !Array.isArray(launchConfig)){
		vscode.window.showErrorMessage("Please run Setup integration env command")
		throw new Error
	}
	
	const debugConfig = launchConfig.find((config: vscode.DebugConfiguration) => config.name == configName)
	if (!debugConfig){
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
	const commandName = await vscode.window.showQuickPick(
		commandNames, {
		title: "Choose your command",
		placeHolder: placeHolder
	}
	)
	return commandName

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

	const command = await vscode.window.showQuickPick(['DEBUG', 'RUN'], {title: 'do you want debug it locally or run in XSOAR?'})
	if (command === undefined) {
		return
	}

	if (command === "RUN") {
		await vscode.window.showQuickPick(['Yes', 'No'], {title:'Do you want to upload before running?'}).then(async (upload) => {
			if (upload === undefined) {
				return
			}
			else if (upload) {
				if (upload === 'YES') {
					await uploadToXSOAR(dirPath, true)
				}
			}
		}
	)}
	const shouldSetup = await vscode.window.showQuickPick(['No', 'Yes'], {title: 'do you want to setup environment?'})
	if (shouldSetup){
		if (shouldSetup === "Yes") {
			await setupIntegrationEnv(dirPath) 
		}
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
				writeJSONSync(
					path.join(dirPath, ".args_command.json"),
					Object.fromEntries(queryMap),
					{ spaces: 4 }
				)
				const contentWorkspace = tools.getContentWorkspace()
				if (!contentWorkspace) {
					vscode.window.showErrorMessage("Could not find content workspace")
					return
				}
				const debugConfig = getDebuggingConfiguration(contentWorkspace, `Docker: Debug (${filePath.name})`)

				vscode.debug.startDebugging(tools.getContentWorkspace(), debugConfig)
			}
			else if (command == "RUN") {
				runCommand(queryMap)
			}
		}
	}
	await runAndDebug()
}


export async function init(): Promise<void> {
	const command = ['init'];
	const contentItem = await vscode.window.showQuickPick(['Integration', 'Script', 'Pack', 'Cancel'],
		{ placeHolder: 'Select the content item you would like to init' })

	if (contentItem === 'Integration') {
		command.push('--integration');
	}
	else if (contentItem === 'Script') {
		command.push('--script')
	}
	else if (contentItem === 'Pack') {
		command.push('--pack');
	}
	else {
		vscode.window.showInformationMessage('Demisto-SDK init cancelled');
		return;
	}
	const name = await vscode.window.showInputBox({ placeHolder: "Choose the name of the content item." })
	if (name) {
		command.push('--name');
		command.push(name)
	}
	else {
		vscode.window.showInformationMessage('Demisto-SDK init cancelled');
		return
	}

	await vscode.window.showQuickPick(['Use current working directory', 'Select output directory'], { placeHolder: 'Select output option' }).then(async (answer) => {
		if (answer === 'Select output directory') {
			await vscode.window.showOpenDialog({
				"canSelectMany": false,
				"openLabel": "Select the path to the content item.",
				canSelectFiles: false,
				canSelectFolders: true
			}).then(answer => {
				if (answer) {
					command.push('--output');
					command.push(answer[0].fsPath)
				}
			})
		}
	})
	if (contentItem == 'Integration') {
		await vscode.window.showQuickPick(['default', 'HelloWorld', 'HelloIAMWorld', 'FeedHelloWorld'],
			{ placeHolder: 'Choose the integration template.' }).then(answer => {
				if (answer && answer !== 'default') {
					command.push('--template');
					command.push(answer)
				}
			})
	}

	if (contentItem === 'Script') {
		await vscode.window.showQuickPick(['default', 'HelloWorldScript'],
			{ placeHolder: 'Choose the integration template.' }).then(answer => {
				if (answer && answer !== 'default') {
					command.push('--template');
					command.push(answer)
				}
			})

	}
	vscode.window.showInformationMessage('Proceed with VSCode integrated terminal')
	TerminalManager.sendDemistoSDKCommand(command);

}

interface demistoSDKReport {
	"filePath": string,
	"fileType": string,
	"entityType": string,
	"errorType": string,
	"name": string,
	"linter": string,
	"severity": string,
	"errorCode": string,
	"message": string,
	"row": string,
	"col": string
}
export function getDiagnostic(reports: Array<demistoSDKReport>): Map<string, vscode.Diagnostic[]> {
	const diagnostics = new Map<string, vscode.Diagnostic[]>();
	for (const report of reports) {
		try {
			const row = parseInt(report.row) - 1;
			const col = parseInt(report.col) + 1;
			let diagObj = diagnostics.get(report.filePath);
			if (!diagObj) {
				diagObj = Array<vscode.Diagnostic>();
			}
			diagObj.push({
				severity: report.severity === 'warning' ? vscode.DiagnosticSeverity.Warning : vscode.DiagnosticSeverity.Error,
				message: report.message,
				range: new vscode.Range(
					new vscode.Position(row, col - 1),
					new vscode.Position(row, col)
				),
				source: `xsoar::${report.linter}(${report.errorCode})`
			});
			diagnostics.set(report.filePath, diagObj);
		} catch (err) {
			Logger.error('failed to parse report' + JSON.stringify(report));
		}
	}
	return diagnostics;
}
export function getDiagnostics(file: fs.PathLike): Map<string, vscode.Diagnostic[]> {
	const fileText = fs.readFileSync(file, 'utf-8')
	const diagnostics = new Map<string, Array<vscode.Diagnostic>>();
	if (!fileText) {
		Logger.error('could not read' + file);
	}
	try {
		const parsed = JSON.parse(fileText);
		const newDiagnostics = getDiagnostic(parsed);
		newDiagnostics.forEach((diag: vscode.Diagnostic[], filePath: string) => {
			const existsObject = diagnostics.get(filePath);
			if (existsObject) {
				diagnostics.set(filePath, existsObject.concat(diag))
			} else {
				diagnostics.set(filePath, diag);
			}
		});
	} catch (e) {
		let result = ''; // error under useUnknownInCatchVariables 
		if (typeof e === "string") {
			result = e // works, `e` narrowed to string
		} else if (e instanceof Error) {
			result = e.message // works, `e` narrowed to Error
		}
		Logger.error(result);
	}
	return diagnostics;
}
export function showProblems(diagnosticCollection: vscode.DiagnosticCollection) {
	return (): void => {
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (!workspaceFolders) {
			return
		}

		for (const workspace of workspaceFolders) {
			const reportPath = tools.getReportPathFromConf(workspace);
			const file = path.join(workspace.uri.fsPath, reportPath);
			tools.publishDiagnostics(diagnosticCollection, getDiagnostics(file));
		}
	}
}


export function isGlobPatternMatch(docUri: string, patterns: Array<string>): boolean {
	for (const pattern of patterns) {
		if (minimatch(docUri, pattern)) {
			return true
		}
	}
	return false

}
export async function backgroundLint(document: vscode.TextDocument, showTerminal: boolean): Promise<void> {
	const docUri = document.uri.path;

	const command = [
		'lint',
		'-i', path.dirname(docUri.toString()),
		'-j', tools.getReportPath(docUri.toString()),
		'--no-test', '--no-pwsh-test'
	]

	if (showTerminal) {
		TerminalManager.sendDemistoSDKCommand(command, true, false)
	} else {
		const cwd = vscode.workspace.getWorkspaceFolder(document.uri)
		TerminalManager.sendDemistoSDKCommandBackground(command, { cwd: cwd?.uri.path })
	}

}


export async function backgroundValidate(document: vscode.TextDocument, showTerminal: boolean): Promise<void> {
	const docUri = document.uri.path;

	const command = [
		'validate',
		'-i', path.dirname(docUri.toString()),
		'-j', tools.getReportPath(docUri.toString())
	]
	if (showTerminal) {
		TerminalManager.sendDemistoSDKCommand(command, true, false)
	} else {
		const cwd = vscode.workspace.getWorkspaceFolder(document.uri)
		TerminalManager.sendDemistoSDKCommandBackground(command, { cwd: cwd?.uri.path })
	}

}

export async function setupEnv(dirPath: string, createVirtualenv: boolean, overwriteVirtualenv: boolean, secretId?: string, instanceName?: string): Promise<void> {
	const contentPath = tools.getContentPath()
	if (!contentPath) {
		vscode.window.showErrorMessage('Could not find content path');
		return;
	}
	const command = [
		'setup-env',
		'-i',
		dirPath,
	]
	if (createVirtualenv) {
		command.push('--create-virtualenv')
	}
	if (overwriteVirtualenv) {
		command.push('--overwrite-virtualenv')
	}
	if (secretId) {
		command.push('--secret-id', secretId)
	}
	if (instanceName) {
		command.push("--instance-name", instanceName)
	}
	const isSuccess = await TerminalManager.sendDemistoSdkCommandWithProgress(command)
	if (!isSuccess){
		vscode.window.showErrorMessage('Demisto-SDK setup-env failed')
		throw new Error('Demisto-SDK setup-env failed')
	}
}