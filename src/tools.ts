import * as path from 'path';
import * as vscode from "vscode";
import { DiagnosticCollection } from "vscode";

export function sendCommandExtraArgsWithUserInput(command: string[]): void {
    vscode.window.showInputBox(
        {
            'placeHolder': 'Add extra arguments?'
        }
    ).then((value) => {
        if (value) {
            command.push(value);
        }
        sendCommand(command);
    });
}

let terminal: vscode.Terminal | null = null;

export function sendCommandWithReport(
    command: string[],
    show = true): void {
    sendCommand(command, show);
}
export function sendCommand(
    command: string[],
    show = true
): void {
    if (!terminal) {
        terminal = vscode.window.createTerminal('XSOAR Extension Terminal');
        terminal.sendText('echo Welcome to the Cortex XSOAR Terminal!');
    }
    if (show) {
        terminal.show();
    }
    terminal.sendText(command.join(' '));
}


export function installDemistoSDK(): void {
    sendCommand(['pip3', 'install', 'demisto-sdk', '--upgrade']);
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
    return 'config' + configIndex + 'removeButton';
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

export function getProblemsFlag(workspace: vscode.WorkspaceFolder): boolean {
    return Boolean(getAutofindProblems(workspace).get('getProblems'))
}
export function htmlspecialchars (
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