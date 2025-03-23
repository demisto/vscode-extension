// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as yaml from "yaml";
import * as dotenv from 'dotenv';
import * as fs from "fs-extra";
import * as path from "path";
import * as tools from "./tools";
import * as dsdk from "./demistoSDKWrapper";
import * as integration from "./integrationLoader";
import { AutomationI, IntegrationI } from './contentObject';
import * as automation from './automation';
import { Logger } from './logger';
import { setupIntegrationEnv, installDevEnv as installDevEnv, configureDemistoVars, developDemistoSDK } from './devEnvs';
import JSON5 from 'json5'
import * as runAndDebug from './runAndDebug'
import { openLastRN } from './openLastRN';

// this function returns the directory path of the file
export function getDirPath(file: vscode.Uri | undefined): string {
	let dirname = getPathFromContext(file)
	if (!fs.lstatSync(dirname).isDirectory()) {
		dirname = path.dirname(dirname)
	}
	return dirname
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext): void {
	Logger.createLogger()
	const contentPath = tools.getContentPath()
	if (!contentPath) {
		// dont activate outside of content path
		return
	}
	dotenv.config({ path: path.resolve(contentPath, ".env") })

	const diagnosticCollection = vscode.languages.createDiagnosticCollection('XSOAR problems');
	context.subscriptions.push(diagnosticCollection);
	context.subscriptions.push(
		vscode.commands.registerCommand('xsoar.init', dsdk.init)
	)
	context.subscriptions.push(
		vscode.commands.registerCommand('xsoar.installDevEnv', installDevEnv)
	)
	context.subscriptions.push(
		vscode.commands.registerCommand('xsoar.configureXSOAR', configureDemistoVars)
	)

	context.subscriptions.push(vscode.commands.registerCommand('xsoar.developDemistoSDK', developDemistoSDK)),
		context.subscriptions.push(
			vscode.commands.registerCommand('xsoar.setupIntegrationEnv', (file: vscode.Uri | undefined) => {
				const fileToRun = getDirPath(file)
				setupIntegrationEnv(fileToRun)
			})
		)
	context.subscriptions.push(
		vscode.commands.registerCommand('xsoar.configureTests', (file: vscode.Uri | undefined) => {
			const fileToRun = getDirPath(file)
			configureTests(fileToRun)
		})
	)

	context.subscriptions.push(
		vscode.commands.registerCommand('xsoar.load', loadYAML(context.extensionUri))
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('xsoar.loadScript', loadScriptYAML(context.extensionUri))
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('xsoar.run', (file: vscode.Uri | undefined) => {
			const fileToRun = getDirPath(file)
			runAndDebug.run(fileToRun)
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('xsoar.upload', (file: vscode.Uri | undefined) => {
			const fileToRun = getPathFromContext(file) // here we want to use the actual file, not directory!
			dsdk.uploadToXSOAR(fileToRun)
		})
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('xsoar.preCommit', (file: vscode.Uri | undefined) => {
			const fileToRun = getDirPath(file)
			vscode.window.showQuickPick(['Default configuration', 'Only tests', 'No docker based hooks'], { placeHolder: 'Select pre-commit configuration' }).then(option => {
				if (option === 'Default configuration') {
					dsdk.preCommit(fileToRun, false, false)
				} else if(option === 'Only tests'){
					dsdk.preCommit(fileToRun, true, false)
				}
				else {
					dsdk.preCommit(fileToRun, false, true)
				}
			})
		}))
	context.subscriptions.push(
		vscode.commands.registerCommand('xsoar.preCommitUsingGit', () => {
			dsdk.preCommitUsingGit()
		})
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('xsoar.format', (file: vscode.Uri | undefined) => {
			const fileToRun = getPathFromContext(file) // here we want to use the actual file, not directory!
			dsdk.formatCommand(fileToRun)
		})
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('xsoar.validate', (file: vscode.Uri | undefined) => {
			const fileToRun = getDirPath(file)
			dsdk.validateCommand(fileToRun)
		})
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('xsoar.validateUsingGit', dsdk.validateUsingGit)
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('xsoar.updateReleaseNotes', (file: vscode.Uri | undefined) => {
			const fileToRun = getDirPath(file)
			dsdk.updateReleaseNotesCommand(fileToRun)
		})
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('xsoar.updateDSDK', tools.installDemistoSDK)
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('xsoar.readProblems', () => {
			const workspaces = vscode.workspace.workspaceFolders
			if (workspaces) {
				for (const workspace of workspaces) {
					const reportPath = tools.getReportPathFromConf(workspace);
					const fullReportPath = path.join(workspace.uri.fsPath, reportPath)
					if (fs.existsSync(fullReportPath)) {
						Logger.info(`Reading logs file from ${fullReportPath}`)
						tools.publishDiagnostics(diagnosticCollection, dsdk.getDiagnostics(fullReportPath));
					}
				}
			}
		})
	)
	context.subscriptions.push(
		vscode.workspace.onDidSaveTextDocument(async (document: vscode.TextDocument) => {
			const showTerminal = <boolean>vscode.workspace.getConfiguration('xsoar').get('linter.showOnSaveTerminal')
			Logger.info('Processing ' + document.fileName)
			if (<boolean>vscode.workspace.getConfiguration('xsoar').get('linter.validate.enable')) {
				if (dsdk.isGlobPatternMatch(document.uri.path, <Array<string>>vscode.workspace.getConfiguration('xsoar').get('linter.validate.patterns'))) {
					dsdk.backgroundValidate(document, showTerminal)
				}
			}

		})
	)


	context.subscriptions.push(
		vscode.commands.registerCommand('xsoar.openLastRN', (file: vscode.Uri | undefined) => {
			const fileToRun = getDirPath(file)
			openLastRN(fileToRun)
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
		if (tools.getShouldReadProblems(workspace)) {
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
		} else {
			Logger.info(`Not watching the report of ${workspace.name}.`)
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
				const yml = loadIntegration(ymlPath);
				if (!yml) {
					throw Error('No yml could be resolved.')
				}
				vscode.window.showInformationMessage('YML Succesfully loaded 🚀');
				integration.createViewFromYML(yml, ymlPath, extensionUri);
			} catch (exception) {
				let result = ''
				if (typeof exception === 'string') {
					result = exception
				} else if (exception instanceof Error) {
					result = exception.message
				}
				vscode.window.showErrorMessage(result);
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
				let result = ''
				if (typeof exception === 'string') {
					result = exception
				} else if (exception instanceof Error) {
					result = exception.message
				}
				vscode.window.showErrorMessage(result);
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

function configureTests(dirPath: string) {
	const contentPath = tools.getContentPath()
	if (!contentPath) {
		vscode.window.showErrorMessage('Please run this command from Content repository.')
		return
	}
	// read settings file
	const settingsPath = path.join(contentPath, '.vscode', 'settings.json')
	let settings
	if (!fs.existsSync(settingsPath)) {
		fs.writeJSONSync(settingsPath, {})
	}
	try {
		settings = JSON5.parse(fs.readFileSync(settingsPath, 'utf-8'))
	}
	catch (err) {
		vscode.window.showErrorMessage("Could not parse settings file")
		fs.writeJSONSync(settingsPath, {})
		settings = JSON5.parse(fs.readFileSync(settingsPath, 'utf-8'))

	}

	settings["python.testing.cwd"] = dirPath
	settings["python.testing.pytestEnabled"] = true
	settings["python.testing.pytestArgs"] = ["."]
	fs.writeJSONSync(settingsPath, settings, { spaces: 2 })
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
