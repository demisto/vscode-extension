import { PathLike } from "fs";
import * as vscode from 'vscode';
import { ParamsClassesTypes, ParamsTypes, typeToClass } from "./configurations";
import { getWebviewAddCommandButton, getWebviewAddConfigurationButton, getWebviewCategorySelection, getWebviewSingleCommand } from "./integrationLoader";
import { getCheckboxChecked } from "./tools";

const commandsDivId = 'commandsDivId';
const advancedDivId = 'advancedDivId';
const configurationDivId = "configDivId";

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

    public getWebviewConfiguration(): string{
        let configurationBlock = '';
        for (const [index, configuration] of this.integration.configuration.entries()){
            configurationBlock += configuration.toWebview(index);
        }
        return configurationBlock;
    }
    public getWebview(cssFile: vscode.Uri, image: vscode.Uri): string {
        return `<!DOCTYPE html>
          <html lang="en">
          <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>${this.integration.display} Settings</title>
              <link rel="stylesheet" type="text/css" href="${cssFile}">
          </head>
          <body>
              <script> const vscode = acquireVsCodeApi(); </script>
              <h1><img alt="${this.integration.name}" src="${image}" />${this.integration.display} Integration</h1>
              <hr>
              <div id="basicPanel">
              ${this.getWebviewBasicPanel()}
              </div>
              <br>
              <h2>Parameters</h2>
              <hr>
              <div id=${configurationDivId}>
              ${this.getWebviewConfiguration()}
              </div>
              ${getWebviewAddConfigurationButton()}
              <h2>Commands</h2>
              <hr>
              <div id="${commandsDivId}">
              ${this.getWebviewCommands()}
              </div>
              ${getWebviewAddCommandButton()}
              <hr>
              <div id="${advancedDivId}">
              ${this.getWebviewAdvancedConfiguration()}
              </div>
              <button id="saveButton">Save</button>
              <script>
                document.querySelector("#saveButton").addEventListener("click", () => {
                    vscode.postMessage({
                        command: 'save'
                    });
                });
                function removeAllScripts(id){
                    var old_element = document.getElementById(id);
                    var new_element = old_element.cloneNode(true);
                    old_element.parentNode.replaceChild(new_element, old_element);
                }
                function enableAllScripts(id){
                    var scripts = Array.prototype.slice.call(document.getElementById(id).getElementsByTagName("script"));
                    for (var i = 0; i < scripts.length; i++) {
                        if (scripts[i].src != "") {
                            var tag = document.createElement("script");
                            tag.src = scripts[i].src;
                            document.getElementsByTagName("head")[0].appendChild(tag);
                        }
                        else {
                            eval(scripts[i].innerHTML);
                        }
                    }
                }
                // Handle the message inside the webview
                function disableEnableScripts(id){
                    removeAllScripts(id);
                    enableAllScripts(id);
                }
    
                function insertAndExecute(id, text) {
                    document.getElementById(id).innerHTML = text;
                    disableEnableScripts(id);
                }
    
                function appendAndExecute(id, text) {
                    frag = document.createRange().createContextualFragment(text);
                    document.getElementById(id).appendChild(frag);
                    disableEnableScripts(id);
    
                }
                window.addEventListener('message', event => {
                    const message = event.data; // The JSON data our extension sent
                    console.log("got a message with command " + message.command);
                    switch (message.command) {
                        case 'addConfiguration':
                        case 'addCommand':
                        case 'addArgument':
                        case 'addOutput':
                            appendAndExecute(message.divId, message.html);
                            break;
                        case 'renderCommands':
                        case 'renderArguments':
                        case 'renderOutputs':
                        case 'removeConfiguration':
                        case 'updateBasic':
                        case 'updateConfiguration':
                            insertAndExecute(message.divId, message.html);
                            break;
                    }
                });
              </script>
          </body>
          </html>`;
    }
    public getWebviewCommands(): string {
        let commandBlock = '';
        for (const [index, command] of this.integration.script.commands.entries()) {
            commandBlock += getWebviewSingleCommand(index, command);
        }
        return commandBlock;
    }
    public getWebviewBasicPanel(): string {
        return `
        <form id="basicPanelForm">
            <label for=name>Name:</label>
            <input type=text id=name value="${this.integration.name}" /><br>
            <label for=id>ID:</label>
            <input type=text id=id value="${this.integration.commonfields.id}" /><br>
            <br>
            ${getWebviewCategorySelection(this.integration.category)}
            <br>
            <label for=description>Description:</label>
            <textarea id=description>${this.integration.description}</textarea>
            <br>
            <label>
            <input type=checkbox id=isFetch ${getCheckboxChecked(this.integration.script.isfetch)} />
            Fetching incidents
            </label>
            <br>
            <label>
            <input type=checkbox id=feed ${getCheckboxChecked(this.integration.script.feed)} />
            Fetching indicators
            </label>
        </form>
        <script>
        var basicPanelform = document.querySelector("#basicPanelForm");
        var inputs = [
            basicPanelform.getElementsByTagName("input"),
            basicPanelform.getElementsByTagName("textarea"),
            basicPanelform.getElementsByTagName("select")
        ];
        for (var inputType of inputs){
            for (var input of inputType){
                input.onchange = () => {
                    console.log('updating basic panel');
                    vscode.postMessage(
                        {
                            command: 'updateBasic',
                            data: {
                                name: basicPanelform.querySelector("#name").value,
                                id: basicPanelform.querySelector("#id").value,
                                description: basicPanelform.querySelector("#description").value,
                                isFetch: basicPanelform.querySelector("#isFetch").checked,
                                feed: basicPanelform.querySelector("#feed").checked,
                                category: basicPanelform.querySelector("#category").value
                            }
                        }
                    );
                }
            }
        }
        </script>
        `;
    }
    public getWebviewAdvancedConfiguration(): string {
        const advancedFormId = + advancedDivId + 'form';
        return `
        <form id="${advancedFormId}">
            <label>Docker Image
            <input type=text id=dockerImage value=${this.integration.script.dockerimage ? this.integration.script.dockerimage : ''} />
            </label>
            <br>
            <label>Long running integration
            <input type=checkbox id=longRunning ${getCheckboxChecked(this.integration.script.longRunning)} />
            </label>
            <br>
            <div id=longRunningPortDiv>
            <label>Long Running Port
            <input type=checkbox id=longRunningPort ${getCheckboxChecked(this.integration.script.longRunningPort)} />
            </label>
            <br>
            </div>
        </form>
        <script>
            var advancedform = document.querySelector("#${advancedFormId}");
            var longRunningPortDiv = advancedform.querySelector("#longRunningPortDiv");
            longRunningPortDiv.style.display = advancedform.querySelector("#longRunning").checked ? 'block' : 'none';
            for (var input of advancedform.getElementsByTagName("input")){
                input.onchange = () => {
                    if (advancedform.querySelector("#longRunning").checked){
                        longRunningPortDiv.style.display = 'block';
                    } else {
                        longRunningPortDiv.style.display = 'none';
                        advancedform.querySelector("#longRunningPort").checked = false;
                    }
                    
                    console.log('advanced panel changed');
                    vscode.postMessage({
                        command: 'updateAdvanced',
                        data: {
                            dockerImage: advancedform.querySelector("#dockerImage").value,
                            longRunning: advancedform.querySelector("#longRunning").checked,
                            longRunningPort: advancedform.querySelector("#longRunningPort").checked
                        }
                    })
                }
            }
            
        </script>
        `;
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