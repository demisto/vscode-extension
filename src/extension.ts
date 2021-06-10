// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as yaml from "yaml";
import * as fs from "fs";
import * as path from "path";
import * as tools from "./tools";
import * as dsdk from "./demistoSDKWrapper";
import * as panelLoader from "./panelloader";
import { IntegrationInterface } from './contentObject';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext): void {
	const diagnosticCollection = vscode.languages.createDiagnosticCollection('XSOAR problems');
	context.subscriptions.push(diagnosticCollection);
	context.subscriptions.push(
		vscode.commands.registerCommand('xsoar.load', loadYAML(context.extensionUri))
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('xsoar.showProblems', dsdk.showProblems(diagnosticCollection))
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('xsoar.upload', dsdk.uploadToXSOAR)
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('xsoar.lint', dsdk.lint)
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('xsoar.lintUsingGit', dsdk.lintUsingGit)
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('xsoar.format', dsdk.formatCommand)
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('xsoar.validate', dsdk.validateCommand)
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('xsoar.validateUsingGit', dsdk.validateUsingGit)
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('xsoar.updateReleaseNotes', dsdk.updateReleaseNotesCommand)
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('xsoar.updateDSDK', tools.installDemistoSDK)
	);
	// Create a file listener
	const workspaces = vscode.workspace.workspaceFolders;
	if (workspaces){
		autoGetProblems(workspaces, diagnosticCollection)
	}
}

// this method is called when your extension is deactivated
export function deactivate(): void { console.log('deactivated') }

  
function autoGetProblems(
	workspaces: readonly vscode.WorkspaceFolder[], 
	diagnosticCollection: vscode.DiagnosticCollection
	){
	for (const workspace of workspaces){
		if (tools.getProblemsFlag(workspace)){
			const reportPath = tools.getReportPathFromConf(workspace)
			const fullReportPath = path.join(workspace.uri.fsPath , reportPath)
			if (!fs.existsSync(fullReportPath)){
				fs.writeFileSync(fullReportPath, "[]");
			}
			console.log('watching report ' + fullReportPath);
			(dsdk.getDiagnostics(fullReportPath));
			const watcher = vscode.workspace.createFileSystemWatcher(fullReportPath);
			watcher.onDidChange(() => {
				console.debug('Report file was changed! ' + fullReportPath)
				dsdk.getDiagnostics(fullReportPath).forEach((diags, filePath) => {
					diagnosticCollection.set(vscode.Uri.parse(filePath), diags)
				})

			})
		}
	}
}
function loadYAML(extensionUri: vscode.Uri) {
	return (() => {
		const activeWindow = vscode.window.activeTextEditor;
		if (activeWindow) {
			let ymlPath: string;
			const fileName = activeWindow.document.fileName;
			const filePath = path.parse(fileName);
			if (filePath.ext === '.yml') {
				ymlPath = fileName;
			} else {
				ymlPath = fileName.replace(
					filePath.ext, '.yml'
				);
			}
			try {
				const yml = loadIntegrationYML(ymlPath);
				if (!yml){
					throw Error('No yml could be resolved.')
				}
				vscode.window.showInformationMessage('YML Succesfully loaded 🚀');
				panelLoader.createViewFromYML(yml, ymlPath, extensionUri);
			} catch (exception) {
				vscode.window.showErrorMessage(exception.message);
				return;
			}

		}
	});
}


function loadIntegrationYML(filePath: string): IntegrationInterface | undefined {
	return yaml.parse(fs.readFileSync(filePath, 'utf-8'));
}

