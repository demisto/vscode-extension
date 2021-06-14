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
