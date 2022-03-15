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
	const command = ['validate -i', path.dirname(file), '-j', json_path];
	TerminalManager.sendDemistoSDKCommand(command);
}

export function validateUsingGit(workspace: vscode.WorkspaceFolder): void {
	TerminalManager.sendDemistoSDKCommand(['validate', '-g', '-j', tools.getReportPathFromConf(workspace)]);
}
export function formatCommand(file: string): void {

	const command = ['format', '-i', path.dirname(file)];
	TerminalManager.sendDemistoSDKCommand(command);
}
export function uploadToXSOAR(file: string): void {
	const command = ['upload', '-i', path.dirname(file)];
	TerminalManager.sendDemistoSDKCommand(command);


}
export function lintUsingGit(file: string): void {
	const command = ['lint', '-g', '-i ', path.dirname(file)];
	TerminalManager.sendDemistoSDKCommand(command);

}
export function lint(file: string, tests = true): void {
	const command = ['lint', '-i', path.dirname(file), '-j', tools.getReportPath(file)];
	if (!tests) {
		command.push('--no-test', '--no-pwsh-test')
	}
	TerminalManager.sendDemistoSDKCommand(command);

}

export function run(): void {
	vscode.window.showInputBox(
		{
			value: "Command to run"
		}
	).then(
		(value) => {
			if (value) {
				value = JSON.stringify(value)
				const command = ['run', '-q', value];
				TerminalManager.sendDemistoSDKCommand(command);
			}
		});


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
