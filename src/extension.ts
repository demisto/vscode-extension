// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as yaml from "yaml";
import * as fs from "fs";
import * as path from "path";
import * as tools from "./tools";
import * as dsdk from "./demistoSDKWrapper";
import * as integration from "./integrationLoader";
import { AutomationI, IntegrationI } from './contentObject';
import * as automation from './automation';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext): void {
	const diagnosticCollection = vscode.languages.createDiagnosticCollection('XSOAR problems');
	context.subscriptions.push(diagnosticCollection);
	context.subscriptions.push(
		vscode.commands.registerCommand('xsoar.load', loadYAML(context.extensionUri))
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('xsoar.loadScript', loadScriptYAML(context.extensionUri))
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('xsoar.upload', dsdk.uploadToXSOAR)
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('xsoar.lint', dsdk.lint)
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('xsoar.lintNoTests', () => { dsdk.lint(false) })
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
	context.subscriptions.push(
		vscode.workspace.onDidSaveTextDocument(async (document: vscode.TextDocument) => {
			const showTerminal = <boolean>vscode.workspace.getConfiguration('xsoar') .get('linter.showOnSaveTerminal')
			console.log('Processing ' + document.fileName)
			if (<boolean>vscode.workspace.getConfiguration('xsoar').get('linter.lint.enable')) {
				if (dsdk.isGlobPatternMatch(document.uri.path, <Array<string>>vscode.workspace.getConfiguration('xsoar').get('linter.lint.patterns'))) {
					dsdk.backgroundLint(document, showTerminal);
				}
			}
			if (<boolean>vscode.workspace.getConfiguration('xsoar').get('linter.validate.enable')) {
				if (dsdk.isGlobPatternMatch(document.uri.path, <Array<string>>vscode.workspace.getConfiguration('xsoar').get('linter.validate.patterns'))) {
					dsdk.backgroundValidate(document, showTerminal)
				}
			}

		})
	)
	// Create a file listener
	const workspaces = vscode.workspace.workspaceFolders;
	if (workspaces) {
		autoGetProblems(workspaces, diagnosticCollection)
	}
}

// this method is called when your extension is deactivated
export function deactivate(): void { console.log('deactivated') }


function autoGetProblems(
	workspaces: readonly vscode.WorkspaceFolder[],
	diagnosticCollection: vscode.DiagnosticCollection
) {
	for (const workspace of workspaces) {
		const reportPath = tools.getReportPathFromConf(workspace)
		const fullReportPath = path.join(workspace.uri.fsPath, reportPath)
		if (!fs.existsSync(fullReportPath)) {
			fs.writeFileSync(fullReportPath, "[]");
		}
		console.log('watching report ' + fullReportPath);
		dsdk.getDiagnostics(fullReportPath);
		const watcher = vscode.workspace.createFileSystemWatcher(fullReportPath);
		watcher.onDidChange(() => {
			console.debug('Report file was changed! ' + fullReportPath)
			dsdk.getDiagnostics(fullReportPath).forEach((diags, filePath) => {
				diagnosticCollection.set(vscode.Uri.parse(filePath), diags)
			})

		})

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
				const yml = loadIntegration(ymlPath);
				if (!yml) {
					throw Error('No yml could be resolved.')
				}
				vscode.window.showInformationMessage('YML Succesfully loaded 🚀');
				integration.createViewFromYML(yml, ymlPath, extensionUri);
			} catch (exception) {
				vscode.window.showErrorMessage(exception.message);
				return;
			}

		}
	});
}

function loadScriptYAML(extensionUri: vscode.Uri) {
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
			extensionUri
			try {
				const yml = loadScript(ymlPath);
				if (!yml) {
					throw Error('No yml could be resolved.')
				}
				vscode.window.showInformationMessage('YML Succesfully loaded 🚀');
				automation.createViewFromYML(yml, ymlPath, extensionUri)
			} catch (exception) {
				vscode.window.showErrorMessage(exception.message);
				return;
			}

		}
	});
}

function loadYamlToObject(filePath: string): IntegrationI | AutomationI | undefined {
	return yaml.parse(fs.readFileSync(filePath, 'utf-8'));
}

function loadIntegration(filePath: string): IntegrationI {
	return loadYamlToObject(filePath) as IntegrationI;
}

function loadScript(filePath: string): AutomationI {
	return loadYamlToObject(filePath) as AutomationI;
}

