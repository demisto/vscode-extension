import { PathLike, writeFileSync } from 'fs';
import * as path from 'path';
import * as vscode from "vscode";
import { DiagnosticCollection } from "vscode";
import * as yaml from "yaml";
import { AutomationI, IntegrationI } from './contentObject';
import * as fs from "fs-extra";
import { Logger } from './logger';
import { TerminalManager } from './terminalManager';

export function sendCommandExtraArgsWithUserInput(command: string[]): void {
    vscode.window.showInputBox(
        {
            'placeHolder': 'Add extra arguments?'
        }
    ).then((value) => {
        if (value) {
            command.push(value);
        }
        TerminalManager.sendDemistoSDKCommand(command);
    });
}

export function getContentWorkspace(): vscode.WorkspaceFolder | undefined {
    const workspaces = vscode.workspace.workspaceFolders
    if (!workspaces) {
        return
    }
    for (const workspace of workspaces) {
        const path = workspace.uri.fsPath
        if (path.includes('content')) {
            return workspace;
        }
    }
    return
}


export function getContentPath(): string | undefined {
    const workspaces = vscode.workspace.workspaceFolders
    if (!workspaces) {
        return
    }
    for (const workspace of workspaces) {
        const path = workspace.uri.fsPath
        if (path.includes('content')) {
            return path;
        }
    }
    return
}

export function getPythonpath(): string {
    let sdkPath = <string>vscode.workspace.getConfiguration('xsoar').get('demisto-sdk.pythonPath')
    if (!sdkPath) {
        sdkPath = <string>vscode.workspace.getConfiguration('python').get('pythonPath')
    }
    if (!sdkPath) {
        sdkPath = 'python'
    }
    return sdkPath
}

export function getSDKPath(): string {
    const sdkPath = `${getContentPath()}/.venv/bin/demisto-sdk`
    if (fs.existsSync(sdkPath)) {
        return sdkPath
    }
    return 'demisto-sdk'
}

export async function installDemistoSDK(): Promise<void> {
    vscode.window.showQuickPick(['Poetry', 'Pip'], {
        title: 'Install Demisto SDK with Poetry or with Pip?',
        placeHolder: 'Poetry is recommended'
    }).then(answer => {
        if (answer === 'Poetry') {
            installDemistoSDKPoetry()
        }
        else if (answer == 'Local') {
            installDemistoSDKPip()
        }
    })
}

export async function installDemistoSDKPip(): Promise<void> {
    TerminalManager.sendText(['pip', 'install', 'demisto-sdk', '--upgrade']);
}

export async function installDemistoSDKPoetry(): Promise<void> {
    const contentPath = getContentPath()
    if (!contentPath) {
        TerminalManager.sendText(['pip', 'install', 'demisto-sdk', '--upgrade']);
    }
    else {
        TerminalManager.sendText(['cd', contentPath])
        TerminalManager.sendText(['deactivate'])
        TerminalManager.sendText(['poetry', 'install'])
    }
}

export async function isDemistoSDKinstalled(): Promise<boolean> {
    const isSDKInstalled = await TerminalManager.sendDemistoSdkCommandWithProgress(['--version']);
    if (isSDKInstalled) {
        return true
    }
    Logger.error('demisto-sdk is not installed')
    await installDemistoSDKPoetry()
    await new Promise(resolve => setTimeout(resolve, 15000))
    return TerminalManager.sendDemistoSdkCommandWithProgress(['--version'])
}

export function publishDiagnostics(
    diagnosticCollection: DiagnosticCollection,
    diagnostics: Map<string, vscode.Diagnostic[]>,
): void {
    console.debug('Got ' + diagnostics.size + ' diagnostics');
    diagnostics.forEach((diags, filePath) => {
        diagnosticCollection?.set(vscode.Uri.parse(filePath), diags)
    })
}
export function getCheckboxChecked(isChecked: boolean): string {
    return isChecked ? 'checked' : '';
}

export function getSelectedSelect(isSelected: boolean): string {
    return isSelected ? 'selected' : '';
}

export function getCommandDivId(commandIndex: number): string {
    return 'command' + commandIndex + 'div';
}

export function getRemoveCommandButtonId(commandIndex: number): string {
    return 'command' + commandIndex + 'removeButton';
}

export function getRemoveArgumentButtonId(commandIndex: number, argumentIndex: number): string {
    return 'command' + commandIndex + 'RemoveArgumentButton' + argumentIndex;
}

export function getArgumentsDivId(commandIndex: number): string {
    return 'command' + commandIndex + 'arguments';
}
export function getArgumentSingleDivId(commandIndex: number, argumentIndex: number): string {
    return "command" + commandIndex + "argument" + argumentIndex;
}
export function getAddArgumentButtonId(commandIndex: number): string {
    return "command" + commandIndex + "addArgumentButton";
}

export function getAddOutputButtonId(commandIndex: number): string {
    return "command" + commandIndex + "addOutputButton";
}
export function getRemoveConfigurationButtonId(configIndex: number): string {
    return getConfigurationDivId(configIndex) + 'removeButton';
}
export function getOutputsDivId(commandIndex: number): string {
    return "command" + commandIndex + "outputs";
}

export function getRemoveOutputButtonId(commandIndex: number, argumentIndex: number): string {
    return 'command' + commandIndex + 'RemoveOutputButton' + argumentIndex;
}

export function getConfigurationDivId(configurationIndex: number): string {
    return 'config' + configurationIndex + 'section';
}

export function getReportPath(openWindowPath: string): string {
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(
        vscode.Uri.parse(openWindowPath));
    if (workspaceFolder) {
        return path.join(workspaceFolder.uri.fsPath, getReportPathFromConf(workspaceFolder)).toString()
    }
    throw Error('Could not find report path');

}

function getAutofindProblems(workspace: vscode.WorkspaceFolder) {
    return vscode.workspace.getConfiguration('xsoar.autoFindProblems', workspace);
}

export function getReportPathFromConf(workspace: vscode.WorkspaceFolder): string {
    return String(getAutofindProblems(workspace).get('reportPath'))
}

export function getShouldReadProblems(workspace: vscode.WorkspaceFolder): boolean {
    return Boolean(getAutofindProblems(workspace).get('readProblems'))
}

export function htmlspecialchars(
    str: string, quoteStyle: number | never[] | null, doubleEncode: boolean)
    : string {
    //       discuss at: https://locutus.io/php/htmlspecialchars/
    //      original by: Mirek Slugen
    //      improved by: Kevin van Zonneveld (https://kvz.io)
    //      bugfixed by: Nathan
    //      bugfixed by: Arno
    //      bugfixed by: Brett Zamir (https://brett-zamir.me)
    //      bugfixed by: Brett Zamir (https://brett-zamir.me)
    //       revised by: Kevin van Zonneveld (https://kvz.io)
    //         input by: Ratheous
    //         input by: Mailfaker (https://www.weedem.fr/)
    //         input by: felix
    // reimplemented by: Brett Zamir (https://brett-zamir.me)
    //           note 1: charset argument not supported
    //        example 1: htmlspecialchars("<a href='test'>Test</a>", 'ENT_QUOTES')
    //        returns 1: '&lt;a href=&#039;test&#039;&gt;Test&lt;/a&gt;'
    //        example 2: htmlspecialchars("ab\"c'd", ['ENT_NOQUOTES', 'ENT_QUOTES'])
    //        returns 2: 'ab"c&#039;d'
    //        example 3: htmlspecialchars('my "&entity;" is still here', null, null, false)
    //        returns 3: 'my &quot;&entity;&quot; is still here'
    let optTemp = 0
    let i = 0
    let noquotes = false
    if (typeof quoteStyle === 'undefined' || quoteStyle === null) {
        quoteStyle = 2
    }
    str = str || ''
    str = str.toString()
    if (doubleEncode !== false) {
        // Put this first to avoid double-encoding
        str = str.replace(/&/g, '&amp;')
    }
    str = str
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
    const OPTS = {
        ENT_NOQUOTES: 0,
        ENT_HTML_QUOTE_SINGLE: 1,
        ENT_HTML_QUOTE_DOUBLE: 2,
        ENT_COMPAT: 2,
        ENT_QUOTES: 3,
        ENT_IGNORE: 4
    }
    if (quoteStyle === 0) {
        noquotes = true
    }
    if (typeof quoteStyle !== 'number') {
        // Allow for a single string or an array of string flags
        quoteStyle = [].concat(quoteStyle)
        for (i = 0; i < quoteStyle.length; i++) {
            // Resolve string input to bitwise e.g. 'ENT_IGNORE' becomes 4
            if (OPTS[quoteStyle[i]] === 0) {
                noquotes = true
            } else if (OPTS[quoteStyle[i]]) {
                optTemp = optTemp | OPTS[quoteStyle[i]]
            }
        }
        quoteStyle = optTemp
    }
    if (quoteStyle & OPTS.ENT_HTML_QUOTE_SINGLE) {
        str = str.replace(/'/g, '&#039;')
    }
    if (!noquotes) {
        str = str.replace(/"/g, '&quot;')
    }
    return str
}

export function saveYML(path: PathLike, obj: IntegrationI | AutomationI): void {
    const ymlString = yaml.stringify(obj);
    writeFileSync(path, ymlString);
}

export function getWebviewRemoveCommandButton(commandIndex: number): string {
    const buttonId = getRemoveCommandButtonId(commandIndex);
    return `
    <button id="${buttonId}">Remove Command</button>
    <script>
    document.querySelector("#${buttonId}").addEventListener("click", () => {
        console.log("Remove Command clicked. Command index: ${commandIndex}");
        vscode.postMessage({
            command: 'removeCommand',
            index: parseInt(${commandIndex})
        });
    });
    </script>
    `;
}

/** We don't normalize anything, so it is just strings and strings. */
export type Data = Record<string, string>

/** We typecast the value as a string so that it is compatible with envfiles.  */
export type Input = Record<string, any>

/** Parse an envfile string. */
export function parse(src: string): Data {
	const result: Data = {}
	const lines = src.toString().split('\n')
	let notHandleCount = 0
	for (const [lineIndex, line] of lines.entries()) {
		const match = line.match(/^([^=:#]+?)[=:](.*)/)
		if (match) {
			const key = match[1].trim()
			const value = match[2].trim().replace(/['"]+/g, '')
			result[key] = value
		} else if ( line.trim().startsWith('#')) {
			const sym = Symbol.for(`comment#${lineIndex - notHandleCount}`)
			result[sym as any] = line
		} else {
			notHandleCount++
		}
	}
	return result
}

/** Turn an object into an envfile string. */
export function stringify(obj: Input): string {
	const result = []
	for (const key of Reflect.ownKeys(obj)) {
		const value = obj[key as string]
		if (key) {
			if (
				typeof key === 'symbol' &&
				(key as Symbol).toString().startsWith('Symbol(comment')
			) {
				
                const [_, lineIndex] = (
                    (key as Symbol).description ?? 'comment#0'
                ).split('#')
                result.splice(parseInt(lineIndex, 10), 0, value)
				
			} else {
				const line = `${key as string}=${String(value)}`
				result.push(line)
			}
		}
	}
	return result.join('\n')
}