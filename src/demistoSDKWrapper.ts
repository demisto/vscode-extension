import * as vscode from 'vscode';
import * as path from 'path';
import * as tools from './tools';
import * as fs from 'fs';

export function updateReleaseNotesCommand() {
	var activeWindow = vscode.window.activeTextEditor;
	if (activeWindow) {
		const openeFile = activeWindow.document.fileName;
		const regs = new RegExp("Packs\/.*?\/");
		const packName = openeFile.match(regs);
		if (packName) {
			vscode.window.showQuickPick(
				['revision', 'minor', 'major', 'maintenance', 'documentation'],
				{
					'placeHolder': 'What kind of update do you want to do?'
				}
			).then(
				(value) => {
					if (value) {
						const command = ['demisto-sdk update-release-notes -i', packName.toString(), '-u', value];
						tools.sendCommand(command);
					}
				});
		} else {
			vscode.window.showErrorMessage('Could not find a valid pack to update');
		}


	} else {
		vscode.window.showErrorMessage('No active window, please save your file.');
	}
}

export function validateCommand() {
	var activeWindow = vscode.window.activeTextEditor;
	if (activeWindow) {
		const openeFile = activeWindow.document.fileName;
	
		const json_path = tools.getReportPath(openeFile);
		const command = ['demisto-sdk validate -i', path.dirname(openeFile), '-j', json_path];
		tools.sendCommand(command);

	} else {
		vscode.window.showErrorMessage('No active window, please save your file.');
	}
}

export function validateUsingGit(workspace: vscode.WorkspaceFolder) {
	tools.sendCommand(['demisto-sdk', 'validate',  '-g' ,'-j', tools.getReportPathFromConf(workspace)]);
}
export function formatCommand() {
	var activeWindow = vscode.window.activeTextEditor;
	if (activeWindow) {
		const openeFile = activeWindow.document.fileName;
		var command = ['demisto-sdk', 'format', '-i', path.dirname(openeFile)];
		tools.sendCommandExtraArgsWithUserInput(command);

	} else {
		vscode.window.showErrorMessage('No active window, please save your file.');
	}
}
export function uploadToXSOAR() {
	var activeWindow = vscode.window.activeTextEditor;
	if (activeWindow) {
		const openeFile = activeWindow.document.fileName;
		var command = ['demisto-sdk', 'upload', '-i', path.dirname(openeFile)];
		tools.sendCommand(command);

	} else {
		vscode.window.showErrorMessage('No active window, please save your file.');
	}
};
export function lintUsingGit() {
	var activeWindow = vscode.window.activeTextEditor;
	if (activeWindow) {
		const openedFile = activeWindow.document.fileName;
		var command = ['demisto-sdk', 'lint', '-g', '-i ', path.dirname(openedFile)];
		tools.sendCommand(command);
	} else {
		vscode.window.showErrorMessage('No active window, please save your file.');
	}
};
export function lint() {
	var activeWindow = vscode.window.activeTextEditor;
	if (activeWindow) {
		const openedFile = activeWindow.document.fileName;
		var command = ['demisto-sdk', 'lint', '-i', path.dirname(openedFile), '-j', tools.getReportPath(openedFile)];
		tools.sendCommand(command);
	} else {
		vscode.window.showErrorMessage('No active window, please save your file.');
	}
};

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
	var diagnostics = new Map<string, vscode.Diagnostic[]>();
	for (const report of reports) {
		try {
			const row = parseInt(report.row) - 1;
			var col = parseInt(report.col) + 1;
			var diagObj = diagnostics.get(report.filePath);
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
				source: report.linter + '(' + report.errorCode + ')'
			});
			diagnostics.set(report.filePath, diagObj);
		} catch (err) {
			console.log('failed to parse report' + JSON.stringify(report));
		}
	}
	return diagnostics;
}
export function getDiagnostics(file: fs.PathLike): Map<string, vscode.Diagnostic[]> {
	const fileText = fs.readFileSync(file, 'utf-8')
	var diagnostics = new Map<string, Array<vscode.Diagnostic>>();
	if (!fileText) {
		console.log('could not read' + file);
	}
	try {
		const parsed = JSON.parse(fileText);
		const newDiagnostics = getDiagnostic(parsed);
		newDiagnostics.forEach((diag: vscode.Diagnostic[], filePath: string) => {
			var existsObject = diagnostics.get(filePath);
			if (existsObject) {
				diagnostics.set(filePath, existsObject.concat(diag))
			} else {
				diagnostics.set(filePath, diag);
			}
		});
	} catch (err) {
		console.log(err);
	}
	return diagnostics;
}
export function showProblems(diagnosticCollection: vscode.DiagnosticCollection) {
	return () => {
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