import * as vscode from "vscode";
import { ProcessEnvOptions, exec } from "child_process";
import * as tools from "./tools";
import { Logger } from "./logger";
/**
 * Used to manage backgrount terminal. Will auto-kill any terminal that is older than
 * 60 seconds.
 */
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
		const sdkPath = tools.getSDKPath()
		let cmd = '';
		if (sdkPath){
			cmd = `${tools.getSDKPath()} -m demisto_sdk ${command.join(' ')}`
		} else {
			cmd = `${tools.getPythonpath()} -m demisto_sdk ${command.join(' ')}`
		}
		Logger.info(`Executing command in background: \`${cmd}\``)
		exec(cmd, options, (error, stdout) => {
			if (error){
				Logger.error(error.message)
				Logger.error(stdout)
			} else {
				Logger.info(stdout)
			}
			
		})
	}
	private static createTerminal(options: vscode.TerminalOptions): vscode.Terminal{
		return vscode.window.createTerminal(options)
	}
	public static async openTerminalIfNeeded(show = true): Promise<vscode.Terminal> {
		if (!this.terminal || this.terminal.exitStatus !== undefined) {
			this.terminal = this.createTerminal({name: 'XSOAR Extension Terminal'});
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
		newTerminal = false
	): Promise<void> {
		let terminal: vscode.Terminal
		if (newTerminal){
			terminal = this.createTerminal({name: 'Demisto-SDK Terminal'})
		} else {
			terminal = await this.openTerminalIfNeeded(show)
		}
		terminal.sendText('')
		terminal.sendText(`${tools.getSDKPath()} ${command.join(' ')}`);
	}
	public static async sendText(
		command: string[],
		show = true
	): Promise<void> {
		this.openTerminalIfNeeded(show)
		this.terminal.sendText('')
		const cmd = command.join(' ')
		Logger.info(`Executing command: \`${cmd}\``)
		this.terminal.sendText(cmd);
	}
}