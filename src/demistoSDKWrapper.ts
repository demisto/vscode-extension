import * as vscode from 'vscode';
import * as path from 'path';
import * as tools from './tools';
import * as fs from 'fs';
import minimatch = require('minimatch');

import { TerminalManager } from './terminalManager';
import { Logger } from './logger';
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
					const command = ['update-release-notes', '-i', packName.toString(), '-u', value];
					TerminalManager.sendDemistoSdkCommandWithProgress(command);
				}
			});
	} else {
		vscode.window.showErrorMessage('Could not find a valid pack to update');
	}
}

export function validateCommand(file: string): void {
	const json_path = tools.getReportPath(file);
	const command = ['validate -i', file, '-j', json_path];
	TerminalManager.sendDemistoSdkCommandWithProgress(command);
}

export function validateUsingGit(workspace: vscode.WorkspaceFolder): void {
	TerminalManager.sendDemistoSdkCommandWithProgress(['validate', '-g', '-j', tools.getReportPathFromConf(workspace)]);
}
export function formatCommand(file: string): void {

	const command = ['format', '-i', file];
	TerminalManager.sendDemistoSdkCommandWithProgress(command);
}
export async function uploadToXSOAR(file: string): Promise<void> {
	const command = ['upload', '-i', file];
	await TerminalManager.sendDemistoSdkCommandWithProgress(command)


}
export async function lintUsingGit(file: string): Promise<void> {
	const command = ['lint', '-g', '-i ', file];
	await TerminalManager.sendDemistoSdkCommandWithProgress(command);

}
export async function lint(file: string, tests = true, lints = true, report = true): Promise<void> {
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
	await TerminalManager.sendDemistoSdkCommandWithProgress(command)
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

export async function setupEnv(dirPath?: string, createVirtualenv?: boolean, overwriteVirtualenv?: boolean, secretId?: string, instanceName?: string): Promise<void> {
	const contentPath = tools.getContentPath()
	if (!contentPath) {
		vscode.window.showErrorMessage('Could not find content path');
		return;
	}
	const command: string[] = ["setup-env"];
	if (dirPath) {
		command.push('-i', dirPath)
	}
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
	if (!isSuccess) {
		vscode.window.showErrorMessage('Demisto-SDK setup-env failed')
		throw new Error('Demisto-SDK setup-env failed')
	}
}