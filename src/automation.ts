import { PathLike } from "fs";
import * as vscode from 'vscode';
import { AutomationI, Argument, Output, OutputMessage, BasicMessage, ArgumentMessage, AdvancedMessage } from "./contentObject";
import { getWebviewAddArgumentButton, getWebviewAddOutputButton, getWebviewArguments, getWebviewOutputs, getWebviewSingleArgument, getWebviewSingleOutput } from "./integrationLoader";
import * as path from "path";
import { saveYML } from "./tools";

let panel: vscode.WebviewPanel;
let scriptHolder: ScriptHolder;
let styleSrc: vscode.Uri;
const advancedDivId = 'advancedDivId';
const outputsDivId = 'outputsDivId';
const argumentDivId = 'argumentsDivId';
const basicDivId = 'basicDivId';

export class ScriptHolder {
    removeOutput(message: OutputMessage): void{
        const removedOutput = this.script.outputs.splice(message.index, 1);
        console.log('Removing output index ' + message.index + " from command " + message.commandIndex);
        console.log('removed contextPath is ' + removedOutput[0].contextPath);
        panel.webview.postMessage({
            command: 'renderOutputs',
            divId: outputsDivId,
            html: getWebviewOutputs(message.commandIndex, this.script.outputs)
        });
    }
    addArgument(message: ArgumentMessage): void{
        const arg = message.data;
        this.script.args.push(arg);
        const newArgWebview = getWebviewSingleArgument(
            0,
            this.script.args.length-1,
            arg
        );
        panel.webview.postMessage({
            command: 'addArgument',
            divId: argumentDivId,
            html: newArgWebview
        });
        console.debug('adding an argument');
    }
    removeArgument(message: ArgumentMessage): void {
        const removedArgument = this.script.args.splice(message.index, 1);
        console.log('Removing argument index ' + message.index + " from command " + message.commandIndex);
        console.log('removed command name is ' + removedArgument[0].name);
        panel.webview.postMessage({
            command: 'renderArguments',
            divId: argumentDivId,
            html: getWebviewArguments(
                message.commandIndex, 
                this.script.args
                )
        });
    }
    updateAdvanced(message: AdvancedMessage): void {
        this.script.dockerimage = message.data.dockerImage;
    }
    updateArgment(message: ArgumentMessage): void {
        const arg = message.data;
        if (typeof arg.predefined === 'string' || arg.predefined instanceof String){
            arg.predefined = arg.predefined.split("\n")
        }
        
        this.script.args[message.index] = arg;
        console.debug('updating an argument number ' + message.index);
    }
    addOutput(message: OutputMessage): void{
        const output = message.data;
        this.script.outputs.push(output);
        const newOutputWebview = getWebviewSingleOutput(
            message.commandIndex,
            this.script.outputs.length-1,
            output
        );
        panel.webview.postMessage({
            command: 'addOutput',
            divId: outputsDivId,
            html: newOutputWebview
        });
        console.debug('adding an output');
    
    }
    updateOutput(message: OutputMessage): void {
        this.script.outputs[message.index] =  message.data;
        console.debug('Output ' + message.index +  ' of command ' + message.commandIndex +' has been succesfully updated');

    }
    updateBasic(message: BasicMessage): void {
        const data = message.data
        this.script.name = data.name
        this.script.commonfields.id = data.id
        this.script.comment = data.description
    }

    path: PathLike;
    script: AutomationI;
    constructor(yml: AutomationI, ymlPath: PathLike) {
        this.path = ymlPath;
        this.script = yml;
        if (!(yml.args)) {
            yml.args = Array<Argument>();
        }
        if (!(yml.outputs)) {
            yml.outputs = Array<Output>();
        }
        this.script = yml;
    }

    public getWebview(cssFile: vscode.Uri): string {
        return `<!DOCTYPE html>
          <html lang="en">
          <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>${this.script.name} Settings</title>
              <link rel="stylesheet" type="text/css" href="${cssFile}">
          </head>
          <body>
              <script> const vscode = acquireVsCodeApi(); </script>
              <h1>${this.script.name} Automation</h1>
              <hr>
              <div id="${basicDivId}">
              ${this.getWebviewBasicPanel()}
              </div>
              <br>
              <hr>
              <h2>Argments:</h2>
              <div id="${argumentDivId}">
              ${this.getArgumentsWebview()}
              ${getWebviewAddArgumentButton(0)}
              </div>
              <div id="${outputsDivId}">
              <hr>
              <h2>Outputs: </h2>
              ${this.getOutputsWebview()}
              ${getWebviewAddOutputButton(0)}
              </div>
              <div id="${advancedDivId}">
              <hr>
              <h2>Advanced: </h2>
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
                        case 'addArgument':
                        case 'addOutput':
                            appendAndExecute(message.divId, message.html);
                            break;
                        case 'renderArguments':
                        case 'renderOutputs':
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

    getWebviewBasicPanel(): string {
        return `
        <form id="basicPanelForm">
            <label for=name>Name:</label>
            <input type=text id=name value="${this.script.name}" /><br>
            <label for=id>ID:</label>
            <input type=text id=id value="${this.script.commonfields.id}" /><br>
            <br>
            <label for=description>Description:</label>
            <textarea id=description>${this.script.comment}</textarea>
            <br>
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
                                comment: basicPanelform.querySelector("#description").value
                            }
                        }
                    );
                }
            }
        }
        </script>
        `;
    }

    public getArgumentsWebview(): string {
        return getWebviewArguments(0, this.script.args)
    }

    public getOutputsWebview(): string {
        return getWebviewOutputs(0, this.script.outputs)
    }

    public getWebviewAdvancedConfiguration(): string {
        const advancedFormId = + 'advanced' + 'form';
        return `
        <form id="${advancedFormId}">
            <label>Docker Image
            <input type=text id="dockerImage" value=${this.script.dockerimage ? this.script.dockerimage : ''} />
            </label>
            <br>
        </form>
        <script>
            var advancedform = document.querySelector("#${advancedFormId}");
            for (var input of advancedform.getElementsByTagName("input")){
                input.onchange = () => {
                    console.log('advanced panel changed');
                    vscode.postMessage({
                        command: 'updateAdvanced',
                        data: {
                            dockerImage: advancedform.querySelector("#dockerImage").value
                        }
                    })
                }
            }
            
        </script>
        `;
    }
}


export function createViewFromYML(yml: AutomationI, ymlPath: PathLike, extensionUri: vscode.Uri): void{
    const dirOfYML = path.dirname(ymlPath.toString());
    const dirOfYMLUri = vscode.Uri.parse(dirOfYML);
    const cssPath = vscode.Uri.joinPath(extensionUri, 'css');
    
    try{
        scriptHolder = new ScriptHolder(yml, ymlPath);
    } catch (err){
        vscode.window.showErrorMessage(err);
        panel.dispose()
        return
    }

    panel = vscode.window.createWebviewPanel(
        'integrationPanel',
        `${scriptHolder.script.name} Settings`,
        vscode.ViewColumn.Beside,
        {
            enableScripts: true,
            localResourceRoots: [dirOfYMLUri, cssPath],
            retainContextWhenHidden: true
        }
    );

    panel.onDidDispose(
        () => {
        console.log('closing')
        },
        null,
      );

    panel.webview.onDidReceiveMessage(
        (message) => {
            console.debug('Got a command in the main switch: ' + message.command);
            switch (message.command){
                case 'save':
                    saveYML(scriptHolder.path, scriptHolder.script)
                    vscode.window.showInformationMessage('Integration "' + scriptHolder.script.name + '" has been saved!');
                    break;
                case 'updateBasic':
                    scriptHolder.updateBasic(message);
                    break;
                case 'updateOutput':
                    scriptHolder.updateOutput(message);
                    break;
                case 'addOutput':
                    scriptHolder.addOutput(message);
                    break;
                case 'updateArgument':
                    scriptHolder.updateArgment(message);
                    break;
                case 'addArgument':
                    scriptHolder.addArgument(message);
                    break;
                case 'removeArgument':
                    scriptHolder.removeArgument(message);
                    break;
                case 'removeOutput':
                    scriptHolder.removeOutput(message);
                    break;
                case 'updateAdvanced':
                    scriptHolder.updateAdvanced(message);
                    break;
            }
        }
    );
    styleSrc = vscode.Uri.joinPath(cssPath, 'panel.css');
    const cssFile = panel.webview.asWebviewUri(styleSrc);
    const html = scriptHolder.getWebview(cssFile)
    panel.webview.html = html;
}
