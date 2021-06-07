import { PathLike, writeFileSync } from "fs";
import * as yamlParser from "yaml";
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
}

export interface IntegrationInterface {
    name: string,
    category: string,
    display: string,
    configuration: Array<ParamsTypes>
    description: string,
    longRunning: boolean,
    longRunningPort: boolean,
    script: {
        commands: Array<Command>,
        dockerimage: string,
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

export class Integration {
    name: string;
    category: string;
    display: string;
    configuration: ParamsClassesTypes[];
    description: string;
    longRunning: boolean;
    longRunningPort: boolean;
    script: {
        commands: Command[];
        dockerimage: string;
        isfetch: boolean;
        runonce: boolean;
        subtype: string;
        script: string;
        feed: boolean;
    };
    commonfields: { id: string; version: number; };
    constructor(yml: IntegrationInterface) {
        this.name = yml.name;
        this.category = yml.category;
        this.display = yml.display;
        yml.configuration = yml.configuration ? yml.configuration : Array<ParamsTypes>();
        this.configuration = Array<ParamsClassesTypes>();
        yml.configuration.forEach((value: ParamsTypes) => {
            this.configuration.push(typeToClass(value))
        })
        this.description = yml.description;
        this.longRunning = yml.longRunning;
        this.longRunningPort = yml.longRunningPort;
        this.script = yml.script;
        this.commonfields = yml.commonfields;
    }
}
export class IntegrationHolder {
    path: PathLike;
    imgPath: vscode.Uri;
    integration: Integration;

    constructor(yml: IntegrationInterface, ymlPath: PathLike, imgPath: vscode.Uri) {
        this.path = ymlPath;
        this.imgPath = imgPath;
        // Get lists ready
        if (!(yml.script.commands)) {
            yml.script.commands = Array<Command>();
        }
        for (var command of yml.script.commands) {
            var args = command.arguments;
            if (!(args)) {
                command.arguments = Array<Argument>();
            }
            var outputs = command.outputs;
            if (!(outputs)) {
                command.outputs = Array<Output>();
            }
        }
        this.integration = new Integration(yml);
    }

    /**
     * name
     */
    public saveYML() {
        const ymlString = yamlParser.stringify(this.integration);
        writeFileSync(this.path, ymlString);
    }

}