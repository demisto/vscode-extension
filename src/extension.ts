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
import { Logger } from './logger';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext): void {
	Logger.createLogger()
	const diagnosticCollection = vscode.languages.createDiagnosticCollection('XSOAR problems');
	context.subscriptions.push(diagnosticCollection);
	context.subscriptions.push(
		vscode.commands.registerCommand('xsoar.load', loadYAML(context.extensionUri))
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('xsoar.loadScript', loadScriptYAML(context.extensionUri))
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('xsoar.upload', (file: vscode.Uri | undefined) => {
			const fileToRun = getPathFromContext(file)
			dsdk.uploadToXSOAR(fileToRun)
		})
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('xsoar.lint', (file: vscode.Uri | undefined) => {
			const fileToRun = getPathFromContext(file)
			dsdk.lint(fileToRun)
		})
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('xsoar.lintNoTests', (file: vscode.Uri | undefined) => {
			const fileToRun = getPathFromContext(file)
			dsdk.lint(fileToRun, false)
		})
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('xsoar.lintUsingGit', (file: vscode.Uri | undefined) => {
			const fileToRun = getPathFromContext(file)
			dsdk.lintUsingGit(fileToRun)
		})
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('xsoar.format', (file: vscode.Uri | undefined) => {
			const fileToRun = getPathFromContext(file)
			dsdk.formatCommand(fileToRun)
		})
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('xsoar.validate', (file: vscode.Uri | undefined) => {
			const fileToRun = getPathFromContext(file)
			dsdk.validateCommand(fileToRun)
		})
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('xsoar.validateUsingGit', dsdk.validateUsingGit)
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('xsoar.updateReleaseNotes', (file: vscode.Uri | undefined) => {
			const fileToRun = getPathFromContext(file)
			dsdk.updateReleaseNotesCommand(fileToRun)
		})
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('xsoar.updateDSDK', tools.installDemistoSDK)
	);
	context.subscriptions.push(
		vscode.workspace.onDidSaveTextDocument(async (document: vscode.TextDocument) => {
			const showTerminal = <boolean>vscode.workspace.getConfiguration('xsoar').get('linter.showOnSaveTerminal')
			Logger.info('Processing ' + document.fileName)
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
export function deactivate(): void { Logger.info('deactivated') }


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

		Logger.info('watching report ' + fullReportPath);
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


/**
 * Will return a file path to an active text editor or a given URI.
 * It for making the demisto-sdk commands to work with both open text editor and sidebar.
 * @param  {vscode.Uri|undefined} path
 * @returns string
 */
function getPathFromContext(path: vscode.Uri | undefined): string {
	const activeWindow = vscode.window.activeTextEditor;
	if (path) {
		return path.fsPath
	} else if (activeWindow) {
		return activeWindow.document.fileName
	} else {
		const err = 'No active window to run the command on'
		vscode.window.showErrorMessage(err);
		Logger.error(err)
		throw Error(err)
	}
}