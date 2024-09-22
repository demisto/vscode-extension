import * as vscode from "vscode";
import { exec, ProcessEnvOptions } from "child_process";
import * as tools from "./tools";
import { Logger } from "./logger";
/**
 * Used to manage backgrount terminal. Will auto-kill any terminal that is older than
 * 60 seconds.
 */

export function isRunningInsideContent(): boolean {
	const contentPath = tools.getContentPath()
	if (!contentPath) {
		vscode.window.showErrorMessage('Could not find content path, run the command from a content directory.');
		return false;
	}
	return true;
}

export class TerminalManager {
	static terminal: vscode.Terminal;
	private static delay(ms: number) {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	/**
	 * Runs a command in a predefined terminal
	 * @param command 
	 * @param options 
	 */
	public static async sendDemistoSDKCommandBackground(
		command: string[],
		// options: vscode.TerminalOptions,
		options: ProcessEnvOptions
	): Promise<void> {
		if (!isRunningInsideContent())
			return;
		const sdkPath = tools.getSDKPath()
		for (let i = 0; i < command.length; i++) {
			if (command[i].includes(' ')) {
				command[i] = `"${command[i]}"`
			}
		}
		const cmd = `${sdkPath} ${command.join(' ')}`;
	
		Logger.info(`Executing command in background: \`${cmd}\``)
		exec(cmd, options, (error, stdout) => {
			if (error) {
				Logger.error(error.message)
				Logger.error(stdout)
			} else {
				Logger.info(stdout)
			}

		})
	}

	public static async sendDemistoSdkCommandWithProgress(command: string[]): Promise<boolean> {
		const sdkPath = tools.getSDKPath()
		if (!isRunningInsideContent())
			return false;
		// loop the command and add quotes to each argument
		for (let i = 0; i < command.length; i++) {
			if (command[i].includes(' ')) {
				command[i] = `"${command[i]}"`
			}
		}
		let cmd = `${sdkPath} ${command.join(' ')}`
		const contentPath = tools.getContentPath()
		if (contentPath){
			cmd = `cd ${contentPath} && ${cmd}`
		}
		const task = new vscode.Task(
			{ type: 'demisto-sdk', name: command[0] },
			vscode.TaskScope.Workspace,
			command[0],
			'demisto-sdk',
			new vscode.ShellExecution(cmd));
		return new Promise<boolean>(resolve => {
			vscode.window.withProgress({
				cancellable: false,
				title: `demisto-sdk ${command}`,
				location: vscode.ProgressLocation.Notification
			}, async (progress) => {
				progress.report({ message: `Starting demisto-sdk ${command}, please wait` })
				const execution = await vscode.tasks.executeTask(task);
				const disposable = vscode.tasks.onDidEndTaskProcess(e => {
					if (e.execution == execution) {
						if (e.exitCode == 0){
							progress.report({ message: "Finished", increment: 100 })
							disposable.dispose();
							resolve(true);
						}
						else {
							Logger.error(`Demisto-SDK command ${command} have failed`)
							vscode.window.showErrorMessage('Demisto-SDK command have failed')
							resolve(false)
						}
					}

				})
				progress.report({ message: "Processing..." });
			});

		})
	}

	private static createTerminal(options: vscode.TerminalOptions): vscode.Terminal {
		return vscode.window.createTerminal(options)
	}
	public static async openTerminalIfNeeded(show = true): Promise<vscode.Terminal> {
		if (!this.terminal || this.terminal.exitStatus !== undefined) {
			this.terminal = this.createTerminal({ name: 'XSOAR Extension Terminal' });
			this.terminal.sendText('echo Welcome to the Cortex XSOAR Terminal!', true);
			await this.delay(5000)
		}
		if (show) {
			this.terminal.show(true);
		}
		return this.terminal
	}
	/**
	 * Runs a command in a predefined terminal
	 * @param command 
	 * @param show 
	 */
	public static async sendDemistoSDKCommand(
		command: string[],
		show = true,
		newTerminal = false,
		timeout = 10000
	): Promise<void> {
		if (!isRunningInsideContent())
			return;
		for (let i = 0; i < command.length; i++) {
			if (command[i].includes(' ')) {
				command[i] = `"${command[i]}"`
			}
		}
		const contentPath = tools.getContentPath()
		if (!await tools.isDemistoSDKinstalled()){
			vscode.window.showErrorMessage('Demisto-SDK is not available in your environment')
			return
		}
		let terminal: vscode.Terminal
		if (newTerminal) {
			terminal = this.createTerminal({ name: 'Demisto-SDK Terminal' })
		} else {
			terminal = await this.openTerminalIfNeeded(show)
		}
		if (!show) {
			terminal.hide()
		}
		terminal.sendText('')
		if (contentPath) {
			terminal.sendText(`cd ${contentPath}`)
		}
		terminal.sendText(`${tools.getSDKPath()} ${command.join(' ')}`)
		await this.delay(timeout)
	}
	public static async sendText(
		command: string[] | string,
		show = true
	): Promise<void> {
		this.openTerminalIfNeeded(show)
		this.terminal.sendText('')
		//check if command is array
		if (Array.isArray(command)) {
			command = command.join(' ')
		}
		Logger.info(`Executing command: \`${command}\``)
		this.terminal.sendText(command);
		//wait for command to finish
		await this.delay(5000)
	}

}
