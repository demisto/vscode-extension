import { textToNumber, ParamsClassesTypes } from "./configurations";
import { getRemoveCommandButtonId } from "./tools";

// Basic are similar to each other. Nothing special;
export function getWebviewSingleConfiguration(configurationIndex: number, configuration: ParamsClassesTypes): string {
    const wview = configuration.toWebview(configurationIndex);
    return wview;
}


export function getWebviewConfiguration(configurations: Array<ParamsClassesTypes>): string{
    let configurationBlock = '';
    configurationBlock += '<script> const ntot = ' + JSON.stringify(textToNumber) + '</script>'
    for (const [index, configuration] of configurations.entries()){
        configurationBlock += configuration.toWebview(index);
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