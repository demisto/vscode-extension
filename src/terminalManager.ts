import * as vscode from "vscode";

/**
 * Used to manage backgrount terminal. Will auto-kill any terminal that is older than
 * 60 seconds.
 */
export class TerminalManager {
	static activeBackgroudTerminals: { [givenTime: number]: vscode.Terminal } = {};
	static terminal: vscode.Terminal;
	public static async insert(terminal: vscode.Terminal): Promise<void> {
		this.activeBackgroudTerminals[Date.now()] = terminal;
		this.removeOutdatedTerminals()
	}

	private static delay(ms: number) {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	public static async runBackgroudCommand(commandName: string, command: string[]): Promise<void> {
		const xsoarConf = vscode.workspace.getConfiguration('xsoar')
		const dsdkPath = <string>xsoarConf.get('demistoSdkPath')
		const showOnSaveTerminal = <boolean>xsoarConf.get('linter.showOnSaveTerminal')

		const terminal = vscode.window.createTerminal(
			{
				name: `XSOAR: ${commandName}`,
				hideFromUser: !showOnSaveTerminal,

			}
		)
		if (!showOnSaveTerminal) {  // If the user want to see it, it should not be managed by the extension
			TerminalManager.insert(terminal)
		}

		await this.delay(5000)
		terminal.sendText('')
		terminal.sendText(`${dsdkPath} ${command.join(' ')}`)
	}
	/**
	 * Runs a command in a predefined terminal
	 * @param command 
	 * @param show 
	 */
	public static async sendCommand(
		command: string[],
		show = true
	): Promise<void> {
		if (!this.terminal || this.terminal.exitStatus !== undefined) {
			this.terminal = vscode.window.createTerminal('XSOAR Extension Terminal');
			this.terminal.sendText('echo Welcome to the Cortex XSOAR Terminal!', true);
			await this.delay(5000)
		}
		if (show) {
			this.terminal.show(true);
		}
		this.terminal.sendText('')
		this.terminal.sendText(command.join(' '));
	}

	private static async removeOutdatedTerminals() {
		const time_now = Date.now()
		const times_to_remove: number[] = []
		for (const givenTime in this.activeBackgroudTerminals) {
			const givenTimeNum = givenTime as unknown as number
			if ((time_now - givenTimeNum) >= 6000) {
				times_to_remove.push(givenTimeNum)
			}
		}

		times_to_remove.forEach((time_to_remove) => {
			try {
				this.activeBackgroudTerminals[time_to_remove].dispose()
			} catch (err) {
				console.debug(err)
			}

			delete this.activeBackgroudTerminals[time_to_remove]
		})

	}
}