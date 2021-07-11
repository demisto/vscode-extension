import * as vscode from "vscode";

export enum LogLevel{
    info = 'info',
    warn = 'warn',
    error = 'error',
    debug = 'debug'
}

export class Logger{
    private static logger?: vscode.OutputChannel
    public static createLogger(name = 'Cortex XSOAR'): void{
        this.logger = vscode.window.createOutputChannel(name)
    }
    private static async log(level: LogLevel, message: string): Promise<void>{
        const date = new Date().toISOString()
        this.logger?.appendLine(`[${level}] ${date} : ${message}`)
    }
    public static async info(message: string): Promise<void>{
        this.log(LogLevel.info, message)
    }
    
    public static async warn(message: string): Promise<void>{
        this.log(LogLevel.warn, message)
    }

    public static async error(message: string): Promise<void>{
        this.log(LogLevel.error, message)
    }

    public static async debug(message: string): Promise<void>{
        this.log(LogLevel.debug, message)
    }
}