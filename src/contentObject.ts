import { PathLike } from "fs";
import * as vscode from 'vscode';
import { ParamsClassesTypes, ParamsTypes, typeToClass } from "./configurations";

// TODO: categories - build to autopull categories from sdk.
export const categories = ['Analytics & SIEM', 'Utilities', 'Messaging', 'Endpoint', 'Network Security',
    'Vulnerability Management', 'Case Management', 'Forensics & Malware Analysis',
    'IT Services', 'Data Enrichment & Threat Intelligence', 'Authentication', 'Database',
    'Deception', 'Email Gateway', 'Identity and Access Management', 'File Integrity Management'
];
export interface Message {
    command: string
}
export interface ConfigurationMessage extends Message {
    configurationIndex: number,
    data: ParamsTypes
}

export interface ArgumentMessage extends Message {
    index: number,
    commandIndex: number,
    data: Argument
}



export interface OutputMessage extends Message {
    index: number,
    commandIndex: number,
    data: Output
}

export interface CommandMessage extends Message {
    index: number,
    data: Command
}

export interface BasicMessage extends Message {
    data: {
        name: string,
        id: string,
        category: string,
        description: string,
        feed: boolean,
        isFetch: boolean
    }
}
export interface AdvancedMessage extends Message {
    data: {
        dockerImage: string,
        longRunning: boolean,
        longRunningPort: boolean
    }
}
export interface Output {
    contextPath: string;
    description: string;
    type: string;
}

export interface Command {
    name: string;
    arguments: Array<Argument>;
    outputs: Array<Output>;
    description: string;
    deprecated: boolean;
}

export interface Argument {
    name: string;
    description: string;
    isArray: boolean;
    required: boolean;
    defaultValue: string;
    predefined: Array<string>
}

export interface IntegrationI {
    name: string,
    category: string,
    display: string,
    configuration: Array<ParamsClassesTypes>
    description: string,
    script: {
        longRunning: boolean,
        longRunningPort: boolean
        commands: Array<Command>,
        dockerimage?: string,
        isfetch: boolean,
        runonce: boolean,
        subtype: string,
        script: string
        feed: boolean
    }
    commonfields: {
        id: string
        version: number
    }
}
export interface scriptI {
    longRunning: boolean;
    longRunningPort: boolean;
    commands: Command[];
    dockerimage?: string;
    isfetch: boolean;
    runonce: boolean;
    subtype: string;
    script: string;
    feed: boolean;
}


export class IntegrationHolder {
    path: PathLike;
    imgPath: vscode.Uri;
    integration: IntegrationI;

    constructor(yml: IntegrationI, ymlPath: PathLike, imgPath: vscode.Uri) {
        this.path = ymlPath;
        this.imgPath = imgPath;
        this.integration = yml;
        // Get lists ready
        if (!(yml.script.commands)) {
            yml.script.commands = Array<Command>();
        }

        const configuration = Array<ParamsClassesTypes>();
        if (yml.configuration) {
            yml.configuration.forEach((value: unknown) => {
                configuration.push(typeToClass(value as ParamsTypes))
            })
        }
        yml.configuration = configuration;
        for (const command of yml.script.commands) {
            const args = command.arguments;
            if (!(args)) {
                command.arguments = Array<Argument>();
            }
            const outputs = command.outputs;
            if (!(outputs)) {
                command.outputs = Array<Output>();
            }
        }
        this.integration = yml;
    }

}

export interface AutomationI {
    name: string,
    script: string,
    commonfields: {
        id: string,
        version: number
    },
    args: Array<Argument>,
    outputs: Array<Output>,
    dockerimage: string,
    comment: string
}