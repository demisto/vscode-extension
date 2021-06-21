import * as vscode from 'vscode';
import {
    IntegrationHolder, CommandMessage, ConfigurationMessage, IntegrationInterface, ArgumentMessage, OutputMessage, Command, Output, Argument, categories, BasicMessage, AdvancedMessage, Integration, scriptI} from './contentObject';
import { PathLike } from 'fs';
import {getAddArgumentButtonId, getAddOutputButtonId, getArgumentsDivId, getArgumentSingleDivId, getCheckboxChecked, getCommandDivId, getOutputsDivId, getRemoveArgumentButtonId, getRemoveOutputButtonId, getSelectedSelect, htmlspecialchars} from './tools';
import { glob } from 'glob';
import * as path from 'path';
import { ParamsClassesTypes, typeToClass } from './configurations';
import { getWebviewConfiguration, getWebviewRemoveCommandButton } from './configurationWebviewBuilder';

let panel: vscode.WebviewPanel;
let integrationHolder: IntegrationHolder;
let styleSrc: vscode.Uri;
const commandsDivId = 'commandsDivId';
const advancedDivId = 'advancedDivId';
const configurationDivId = "configDivId";

export function createViewFromYML(yml: IntegrationInterface, ymlPath: PathLike, extensionUri: vscode.Uri): void{
    const dirOfYML = path.dirname(ymlPath.toString());
    const dirOfYMLUri = vscode.Uri.parse(dirOfYML);
    const cssPath = vscode.Uri.joinPath(extensionUri, 'css');
    const g = new glob.Glob(dirOfYML + '/*.png', {sync: true});
    
    const imagePath = vscode.Uri.joinPath(dirOfYMLUri, path.parse(g.found[0]).base);
    try{
        integrationHolder = new IntegrationHolder(yml, ymlPath, imagePath);
    } catch (err){
        vscode.window.showErrorMessage(err);
        panel.dispose()
        return
    }

    panel = vscode.window.createWebviewPanel(
        'integrationPanel',
        `${integrationHolder.integration.display} Settings`,
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
                    integrationHolder.saveYML();
                    vscode.window.showInformationMessage('Integration "' + integrationHolder.integration.display + '" has been saved!');
                    break;
                case 'removeConfiguration':
                    removeConfiguration(message);
                    break;
                case 'updateBasic':
                    updateBasic(message);
                    break;
                case 'updateConfiguration':
                    updateConfiguration(message);
                    break;
                case 'addConfiguration':
                    addConfiguration(message);
                    break;
                case 'updateCommand':
                    updateCommand(message);
                    break;
                case 'removeCommand':
                    removeCommand(message);
                    break;
                case 'addCommand':
                    addCommand(message);
                    break;
                case 'updateOutput':
                    updateOutput(message);
                    break;
                case 'addOutput':
                    addOutput(message);
                    break;
                case 'updateArgument':
                    updateArgment(message);
                    break;
                case 'addArgument':
                    addArgument(message);
                    break;
                case 'removeArgument':
                    removeArgument(message);
                    break;
                case 'removeOutput':
                    removeOutput(message);
                    break;
                case 'updateAdvanced':
                    updateAdvanced(message);
                    break;
            }
        }
    );
    styleSrc = vscode.Uri.joinPath(cssPath, 'panel.css');
    const cssFile = panel.webview.asWebviewUri(styleSrc);
    const image = panel.webview.asWebviewUri(integrationHolder.imgPath);
    const html = getWebviewFromYML(integrationHolder.integration, cssFile, image);
    panel.webview.html = html;
}
function  updateAdvanced(message: AdvancedMessage){
    const yml = integrationHolder.integration;
    const data = message.data;
    yml.script.dockerimage = data.dockerImage ? data.dockerImage : undefined;
    yml.script.longRunning = data.longRunning;
    if (data.longRunning){
        yml.script.longRunningPort = data.longRunningPort;
    }
}
function removeConfiguration(message: ConfigurationMessage) {
    const popedConf = integrationHolder.integration.configuration.splice(message.configurationIndex, 1)[0];
    panel.webview.postMessage({
        command: 'removeConfiguration',
        divId: configurationDivId,
        html: getWebviewConfiguration(integrationHolder.integration.configuration)
    });
    console.log('Removed configuration ' + popedConf.name);
}

function updateBasic(message: BasicMessage){
    const basic = message.data;
    integrationHolder.integration.name = basic.name;
    integrationHolder.integration.commonfields.id = basic.id;
    integrationHolder.integration.category = basic.category;
    integrationHolder.integration.description = basic.description;
    integrationHolder.integration.script.feed = basic.feed;
    integrationHolder.integration.script.isfetch = basic.isFetch;
}
function addConfiguration(message: ConfigurationMessage){
    const newConfiguration: ParamsClassesTypes = typeToClass(message.data);
    integrationHolder.integration.configuration.push(newConfiguration);
    const newConfigurationWebview = newConfiguration.toWebview(integrationHolder.integration.configuration.length-1);
    panel.webview.postMessage(
        {
            command: 'addConfiguration',
            divId: configurationDivId,
            html: newConfigurationWebview
        }
    );
}
function updateConfiguration(message: ConfigurationMessage){
    const configuration = message.data;
    integrationHolder.integration.configuration[message.configurationIndex] = typeToClass(configuration);
    console.debug('Configuration ' + message.configurationIndex + ' has been succesfully updated');
    panel.webview.postMessage(
        {
            command: 'updateConfiguration',
            divId: configurationDivId,
            html: getWebviewConfiguration(integrationHolder.integration.configuration)
        }
    );
}
function addCommand(message: CommandMessage){
    const newCommand: Command = message.data;
    integrationHolder.integration.script.commands.push(newCommand);
    const newCommandWebview = getWebviewSingleCommand(
        integrationHolder.integration.script.commands.length-1,
        newCommand
    );
    panel.webview.postMessage(
        {
            'command': 'addCommand',
            'divId': commandsDivId,
            'html': newCommandWebview
        }
    );
}
function removeCommand(message: CommandMessage){
    const removedCommand = integrationHolder.integration.script.commands.splice(message.index, 1);
    console.log('Removing command index ' + message.index + " " + removedCommand[0].name);
    panel.webview.postMessage({
        command: 'renderCommands',
        html: getWebviewCommands(integrationHolder.integration.script.commands),
        divId: commandsDivId
    });
}
function removeArgument(message: ArgumentMessage){
    const removedArgument = integrationHolder.integration.script.commands[message.commandIndex].arguments.splice(message.index, 1);
    console.log('Removing argument index ' + message.index + " from command " + message.commandIndex);
    console.log('removed command name is ' + removedArgument[0].name);
    panel.webview.postMessage({
        command: 'renderArguments',
        divId: getArgumentsDivId(message.commandIndex),
        html: getWebviewArguments(
            message.commandIndex, 
            integrationHolder.integration.script.commands[message.commandIndex].arguments
            )
    });
}
function removeOutput(message: OutputMessage){
    const removedOutput = integrationHolder.integration.script.commands[message.commandIndex].outputs.splice(message.index, 1);
    console.log('Removing output index ' + message.index + " from command " + message.commandIndex);
    console.log('removed contextPath is ' + removedOutput[0].contextPath);
    panel.webview.postMessage({
        command: 'renderOutputs',
        divId: getOutputsDivId(message.commandIndex),
        html: getWebviewOutputs(message.commandIndex, integrationHolder.integration.script.commands[message.commandIndex].outputs)
    });
}
function updateCommand(message: CommandMessage){
    const command = message.data;
    integrationHolder.integration.script.commands[message.index] = command;
    console.debug('Command ' + message.data.name + ' has been succesfully updated');
}
function addArgument(message: ArgumentMessage){
    const arg = message.data;
    integrationHolder.integration.script.commands[message.commandIndex].arguments.push(arg);
    const newArgWebview = getWebviewSingleArgument(
        message.commandIndex,
        integrationHolder.integration.script.commands[message.commandIndex].arguments.length-1,
        arg
    );
    panel.webview.postMessage({
        command: 'addArgument',
        divId: getArgumentsDivId(message.commandIndex),
        html: newArgWebview
    });
    const command = integrationHolder.integration.script.commands[message.commandIndex];
    console.debug('adding an argument to command ' + message.commandIndex + " name: " + command.name);

}
function updateArgment(message: ArgumentMessage){
    const arg = message.data;
    if (typeof arg.predefined === 'string' || arg.predefined instanceof String){
        arg.predefined = arg.predefined.split("\n")
    }
    
    integrationHolder.integration.script.commands[message.commandIndex].arguments[message.index] = arg;
    console.debug('updating an argument to command ' + message.commandIndex + " name: " + arg.name);
}
function addOutput(message: OutputMessage){
    const output = message.data;
    const command = integrationHolder.integration.script.commands[message.commandIndex];
    integrationHolder.integration.script.commands[message.commandIndex].outputs.push(output);
    const newOutputWebview = getWebviewSingleOutput(
        message.commandIndex,
        integrationHolder.integration.script.commands[message.commandIndex].outputs.length-1,
        output
    );
    panel.webview.postMessage({
        command: 'addOutput',
        divId: getOutputsDivId(message.commandIndex),
        html: newOutputWebview
    });
    console.debug('adding an output to command ' + message.commandIndex + " name: " + command.name);

}
function updateOutput(message: OutputMessage){
    integrationHolder.integration.script.commands[message.commandIndex].outputs[message.index] = message.data;
    console.debug('Output ' + message.index +  ' of command ' + message.commandIndex +' has been succesfully updated');
}
export function getWebviewFromYML(integration: Integration, cssFile: vscode.Uri, image: vscode.Uri): string{
    return `<!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${integration.display} Settings</title>
          <link rel="stylesheet" type="text/css" href="${cssFile}">
      </head>
      <body>
          <script> const vscode = acquireVsCodeApi(); </script>
          <h1><img alt="${integration.name}" src="${image}" />${integration.display} Integration</h1>
          <hr>
          <div id="basicPanel">
          ${getWebviewBasicPanel(integration)}
          </div>
          <br>
          <h2>Parameters</h2>
          <hr>
          <div id=${configurationDivId}>
          ${getWebviewConfiguration(integration.configuration)}
          </div>
          ${getWebviewAddConfigurationButton()}
          <h2>Commands</h2>
          <hr>
          <div id="${commandsDivId}">
          ${getWebviewCommands(integration.script.commands)}
          </div>
          ${getWebviewAddCommandButton()}
          <hr>
          <div id="${advancedDivId}">
          ${getWebviewAdvancedConfiguration(integration.script)}
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

function getWebviewRemoveArgumentButton(commandIndex: number, index: number): string{
    const buttonId = getRemoveArgumentButtonId(commandIndex, index);
    return `
    <button id="${buttonId}">Remove Argument</button>
    <script>
    document.querySelector("#${buttonId}").addEventListener("click", () => {
        console.log("Remove Argument clicked. Command index: ${commandIndex}, Argument index: ${index}");
        vscode.postMessage({
            command: 'removeArgument',
            commandIndex: parseInt(${commandIndex}),
            index: parseInt(${index})
        });
    });
    </script>
    `;
}
function getWebviewRemoveOutputButton(commandIndex: number, index: number): string{
    const buttonId = getRemoveOutputButtonId(commandIndex, index);
    return `
    <button id="${buttonId}">Remove Output</button>
    <script>
    document.querySelector("#${buttonId}").addEventListener("click", () => {
        console.log("Remove output clicked. Command index: ${commandIndex}, Output index: ${index}");
        vscode.postMessage({
            command: 'removeOutput',
            commandIndex: parseInt(${commandIndex}),
            index: parseInt(${index})
        });
    });
    </script>
    `;
}
export function getWebviewSingleCommand(commandIndex: number, command: Command): string{
    const commandId = getCommandDivId(commandIndex);
    const collapseId = commandId + 'collapse';
    return `
    <button class="collapsible" id="${collapseId}" >${command.name}</button>
    <div class="content">
    <form id="${commandId}">
        <label for=name>Command name: </label>
        <input type=text id=name value="${command.name}" /><br>
        <label for=description>Description: </label>
        <input type=text id=description value="${command.description}" /><br>
        <label for=deprecated>Deprecated: </label>
        <input type=checkbox id=deprecated ${getCheckboxChecked(command.deprecated)} /><br>
    </form>
    ${getWebviewRemoveCommandButton(commandIndex)}
    <h3>Arguments: </h3><br>
    ${getWebviewArguments(commandIndex, command.arguments)}
    ${getWebviewAddArgumentButton(commandIndex)}
    <br>
    <h3>Outputs: </h3>
    <div id="${getOutputsDivId(commandIndex)}">
    ${getWebviewOutputs(commandIndex, command.outputs)}
    <br>
    </div>
    ${getWebviewAddOutputButton(commandIndex)}
    <br>
    </div>
    <script>
    {( () => {
        // All inputs listener.
        var form = document.querySelector("#${commandId}");
        var inputs = form.getElementsByTagName("input");
        for (var i=0; i<inputs.length; i++){
            inputs[i].onchange = () => {
                console.log("Updating command ${commandIndex}");
                // Change collapsible name
                document.querySelector("#${collapseId}").innerHTML = form.querySelector("#name").value;
                console.log("Sending message");
                vscode.postMessage(
                    {
                        command: 'updateCommand',
                        index: parseInt(${commandIndex}),
                        data: {
                            name: form.querySelector("#name").value,
                            description: form.querySelector("#description").value,
                            deprecated: form.querySelector("#deprecated").checked,
                            arguments: Array(),
                            outputs: Array()
                        }
                    }
                );
                console.log("finish message sending message");
            }
        }
        // Collapsible listener
        var collapsible = document.querySelector("#${collapseId}");
        collapsible.addEventListener("click", function() {
            console.log("Collapsible clicked");
            this.classList.toggle("active");
            var content = this.nextElementSibling;
            if (content.style.display === "block") {
                content.style.display = "none";
            } else {
                content.style.display = "block";
            }
            })
    })();}
    </script>
    `;
}
function getWebviewCommands(commands: Array<Command>): string{
    let commandBlock = '';
    for (const [index, command] of commands.entries()){
        commandBlock += getWebviewSingleCommand(index, command);
    }
    return commandBlock;
}

export function getWebviewSingleArgument(commandIndex: number, argumentIndex: number, arg: Argument): string{
    const argId = getArgumentSingleDivId(commandIndex, argumentIndex);
    return `
    <form id="${argId}">
    <label for=name>Name: </label>
    <input type=text id=name value="${arg.name}" /><br>
    <label for=name>Description: </label>
    <input type=text id=description value="${htmlspecialchars(arg.description, null, false).replace(/(\r\n|\n|\r)/gm, "")}" /><br>
    <label for=required>Required: </label>
    <input type=checkbox id=required ${getCheckboxChecked(arg.required)} /><br>
    <label for=isArray>isArray: </label>
    <input type=checkbox id=isArray ${getCheckboxChecked(arg.isArray)} /><br>
    <label for=defaultValue>Default Value:</label>
    <input type=text id="defaultValue" value="${arg.defaultValue ? arg.defaultValue : ''}" /><br>
    <label for=predefined>Predefined values:</label>
    <textarea id=predefined>${arg.predefined ? arg.predefined.join('\n') : ''}</textarea><br>
    </form>
    <script>
    {
        ( () => {
            var form = document.querySelector("#${argId}");
            var inputs = [form.getElementsByTagName("input"), form.getElementsByTagName("textarea")];
            for (const inputType of inputs){
                for (var input of inputType){
                    input.onchange = () => {
                        console.debug("Updating argument ${argumentIndex} of command ${commandIndex}");
                        vscode.postMessage(
                            {
                                command: 'updateArgument',
                                commandIndex: parseInt(${commandIndex}),
                                index: parseInt(${argumentIndex}),
                                data: {
                                    name: form.querySelector("#name").value,
                                    description: form.querySelector("#description").value,
                                    required: form.querySelector("#required").checked,
                                    isArray: form.querySelector("#isArray").checked,
                                    defaultValue: form.querySelector("#defaultValue").value,
                                    predefined: form.querySelector("#predefined").value
                                }
                            }
                        );
                    }
                }
            }
        }
        )();
    }
    </script>
    ${getWebviewRemoveArgumentButton(commandIndex, argumentIndex)}
    `;
}
function getWebviewArguments(commandIndex: number, args?: Array<Argument>): string{
    if (!args){
        return'';
    }
    let argumentsBlock = `<div id=${getArgumentsDivId(commandIndex)}>`;
    for (const [argumentIndex, arg] of args.entries()){
        
        argumentsBlock += getWebviewSingleArgument(commandIndex, argumentIndex, arg);
    }
    argumentsBlock += '</div>';
    return argumentsBlock;

}
export function getWebviewSingleOutput(commandIndex: number, index: number, output: Output): string{
    function getWebviewSelectOutputType(type: string): string{
        const selected = 'selected';
        return `<select id=type>
            <option value=Unknown ${type === 'Unknown' ? selected : ''}>Unknown</option>
            <option value=Number ${type === 'Number' ? selected : ''}>Number</option>
            <option value=String ${type === 'String' ? selected : ''}>String</option>
            <option value=Date ${type === 'Date' ? selected : ''}>Date</option>
            <option value=Boolean ${type === 'Boolean' ? selected : ''}>Boolean</option>
        </select>`;
    }
    const outputId = "command" + commandIndex + "output" + index;
    return `
        <form id="${outputId}">
        <label for=contextPath>Context Path: </label>
        <input type=text id=contextPath value=${output.contextPath}><br>
        <label for=description>Description: </label>
        <input type=text id=description value="${output.description}"><br>
        <label for=type>Type: </label>
        ${getWebviewSelectOutputType(output.type)}
        </form>
        <script>
        (() => {
            var form = document.querySelector("#${outputId}");
            var inputs = [form.getElementsByTagName("input"), form.getElementsByTagName("select")];
            for (var inputType of inputs){
                for (var input of inputType){
                    input.onchange = () => {
                        console.debug("Updating output ${outputId}");
                        vscode.postMessage(
                            {
                                command: 'updateOutput',
                                commandIndex: parseInt(${commandIndex}),
                                index: parseInt(${index}),
                                data: {
                                    contextPath: form.querySelector("#contextPath").value,
                                    description: form.querySelector("#description").value,
                                    type: form.querySelector("#type").value
                                }
                            }
                        );
                    }
                }
            }
        })();
        </script>
        <br>
        ${getWebviewRemoveOutputButton(commandIndex, index)}
        <br>
        `;
}

function getWebviewOutputs(commandIndex: number, outputs?: Array<Output>){
    let outputsBlock = ''
    if (!outputs){
        return '';
    }
    for (const [index, output] of outputs.entries()){
        outputsBlock +=  getWebviewSingleOutput(commandIndex, index, output);
    }
    return outputsBlock;
}

function getWebviewAddCommandButton(): string{
    const commandName = 'new-command';
    const description = 'description';
    return `
    <button id="addCommandButton" onClick="addCommandFunc()">Add Command</button>
    <script>
    function addCommandFunc(){
        vscode.postMessage({
            command: 'addCommand',
            data: {
                name: '${commandName}',
                description: '${description}',
                deprecated: false,
                arguments: Array(),
                outputs: Array()
            }
        });
    };
    </script>
    `;
}

function getWebviewAddArgumentButton(commandIndex: number): string{
    const buttonId = getAddArgumentButtonId(commandIndex);
    const argName = 'new_argument';
    const description = 'description';
    return `
    <button id="${buttonId}">Add Argument</button>
    <script>
    document.querySelector("#${buttonId}").addEventListener("click", () => {
        console.log("addArgumentButton clicked. Command index: ${commandIndex}");
        vscode.postMessage({
            command: 'addArgument',
            commandIndex: parseInt(${commandIndex}),
            data: {
                name: "${argName}",
                description: "${description}",
                required: false,
                isArray: false,
                defaultValue: ''
            }
        });
    });
    </script>
    `;
}


function getWebviewAddConfigurationButton(): string{
    return `
    <button id="addConfigurationButton" onClick="addConfigurationButton()">Add Configuration</button>
    <script>
    function addConfigurationButton(){
        vscode.postMessage({
            command: 'addConfiguration',
            data: {
                name: 'param_name',
                display: 'Parameter Name',
                required: false,
                type: 0
            }
        });
    };
    </script>
    `;
}

function getWebviewAddOutputButton(commandIndex: number): string{
    const buttonId = getAddOutputButtonId(commandIndex);
    const contextPath = 'Path.To.Context';
    const description = 'description';
    return `
    <button id="${buttonId}">Add Output</button>
    <script>
    document.querySelector("#${buttonId}").addEventListener("click", () => {
        console.log("addOutputButton clicked. Command index: ${commandIndex}");
        vscode.postMessage({
            command: 'addOutput',
            commandIndex: parseInt(${commandIndex}),
            data: {
                contextPath: "${contextPath}",
                description: "${description}",
                type: "Unknown"
            }
        });
    });
    </script>
    `;
}

function getWebviewBasicPanel(yml: Integration): string{
    return `
    <form id="basicPanelForm">
        <label for=name>Name:</label>
        <input type=text id=name value="${yml.name}" /><br>
        <label for=id>ID:</label>
        <input type=text id=id value="${yml.commonfields.id}" /><br>
        <br>
        ${getWebviewCategorySelection(yml.category)}
        <br>
        <label for=description>Description:</label>
        <textarea id=description>${yml.description}</textarea>
        <br>
        <label>
        <input type=checkbox id=isFetch ${getCheckboxChecked(yml.script.isfetch)} />
        Fetching incidents
        </label>
        <br>
        <label>
        <input type=checkbox id=feed ${getCheckboxChecked(yml.script.feed)} />
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

function getWebviewCategorySelection(givenCategory: string){
    let htmlBlock = `<label for=category>Category:</label>
    <select id=category>`;
    for (const category of categories){
        htmlBlock += `<option value="${category}" ${getSelectedSelect(category === givenCategory)}>${category}</option>`;
    }
    htmlBlock += '</select>';
    return htmlBlock;

}
export function getWebviewAdvancedConfiguration(script: scriptI): string{
    const advancedFormId = + advancedDivId + 'form';
    return `
    <form id="${advancedFormId}">
        <label>Docker Image
        <input type=text id=dockerImage value=${script.dockerimage ? script.dockerimage : ''} />
        </label>
        <br>
        <label>Long running integration
        <input type=checkbox id=longRunning ${getCheckboxChecked(script.longRunning)} />
        </label>
        <br>
        <div id=longRunningPortDiv>
        <label>Long Running Port
        <input type=checkbox id=longRunningPort ${getCheckboxChecked(script.longRunningPort)} />
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
                console.log(3);
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
                        LongRunning: advancedform.querySelector("#longRunning").checked,
                        LongRunningPort: advancedform.querySelector("#longRunningPort").checked
                    }
                })
            }
        }
        
    </script>
    `;
}

