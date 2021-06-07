import { ParamsTypes, typeToName, tton, ntot, typeToClass, ParamsClassesTypes } from "./configurations";
import { getRemoveCommandButtonId, getRemoveConfigurationButtonId } from "./tools";


function paramSelectorOptionSingleBuilder(typeName: string, selectedType: number): string {
    return `<option value=${typeName} ${selectedType == ntot[typeName] ? 'selected' : ''}>${typeName}</option>`
}

export function getWebviewSelectParamType(selectedType: number): string {
    var selectedForm = '<select type=text id=type>'
    
    for (const type in tton){
        selectedForm += paramSelectorOptionSingleBuilder(tton[type], selectedType)
    }
    selectedForm += '</select>'
    return selectedForm
}


// Basic are similar to each other. Nothing special;
export function getWebviewSingleConfiguration(configurationIndex: number, configuration: ParamsClassesTypes): string {
    return configuration.toWebview(configurationIndex);
}


export function getWebviewConfiguration(configurations: Array<ParamsClassesTypes>): string{
    var configurationBlock = '';
    configurationBlock += '<script> const ntot = ' + JSON.stringify(ntot) + '</script>'
    for (const [index, configuration] of configurations.entries()){
        configurationBlock += getWebviewSingleConfiguration(index, configuration);
    }
    return configurationBlock;
}

export function getWebviewRemoveCommandButton(commandIndex: number): string{
    const buttonId = getRemoveCommandButtonId(commandIndex);
    return `
    <button id="${buttonId}">Remove Command</button>
    <script>
    document.querySelector("#${buttonId}").addEventListener("click", () => {
        console.log("Remove Command clicked. Command index: ${commandIndex}");
        vscode.postMessage({
            command: 'removeCommand',
            index: parseInt(${commandIndex})
        });
    });
    </script>
    `;
}