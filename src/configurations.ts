import { getWebviewSelectParamType } from "./configurationWebviewBuilder";
import { getCheckboxChecked, getConfigurationDivId, getRemoveConfigurationButtonId } from "./tools";

export interface BasicConfigI {
    name: string
    display: string
    required: boolean
    defaultvalue: string
    type: number
    additionalinfo: string
}

export class BasicConfig implements BasicConfigI {
    name: string;
    display: string;
    required: boolean;
    defaultvalue: string;
    type: number;
    additionalinfo: string;
    constructor(basicConfig: BasicConfigI) {
        this.name = basicConfig.name;
        this.display = basicConfig.display;
        this.required = basicConfig.required;
        this.defaultvalue = basicConfig.defaultvalue;
        this.type = basicConfig.type;
        this.additionalinfo = basicConfig.additionalinfo;
    }
    /**
     * getWebview
     */
    public toWebview(configurationIndex: number): string {
        const configurationId = getConfigurationDivId(configurationIndex);
        return `
            <p class=partblock>
            <form id="${configurationId}">
                <label for=name>Name: </label>
                <input type=text id="name" value=${this.name}><br>
                <label for=name>Display: </label>
                <input type=text id=display value="${this.display}"><br>
                <label for=type>Type: </label>
                ${getWebviewSelectParamType(parseInt(this.type.toString()))}<br>
                <label for=additionalinfo>Additional Info: </label>
                <textarea id=additionalinfo>${this.additionalinfo ? this.additionalinfo : ''}</textarea>
                <br>
                <label for=required>Required: </label>
                <input type=checkbox id=required ${getCheckboxChecked(this.required)}><br><br>
            </form>
            ${getWebviewRemoveConfigurationButton(configurationIndex)}
            <script>
            { (() => {
                var form = document.querySelector("#${configurationId}");
                var inputs = [form.getElementsByTagName("input"), form.getElementsByTagName("select"), form.getElementsByTagName("textarea")];
    
                for (var inputType of inputs){
                    for (var input of inputType){
                        input.onchange = () => {
                            console.debug("Updating configuration ${configurationIndex}");
                            vscode.postMessage({
                                    command: 'updateConfiguration',
                                    configurationIndex: parseInt(${configurationIndex}),
                                    data: {
                                        name: form.querySelector("#name").value,
                                        display: form.querySelector("#display").value,
                                        type: ntot[form.querySelector("#type").value],
                                        required: form.querySelector("#required").checked,
                                        additionalinfo: form.querySelector("#additionalinfo").value
                                    }
                            });
                    }
                }
            }
            })();}
            </script>
            </p>
            `;
    }
}
export interface OptionsConfigI extends BasicConfigI {
    options: Array<string>

}

export class OptionsConfig extends BasicConfig {
    options: string[]
    constructor(basicConfig: OptionsConfigI) {
        super(basicConfig)
        this.options = basicConfig.options;
    }
}
export interface BooleanI extends BasicConfigI {
}

export class Boolean_ extends BasicConfig {
    constructor(boolean_: BooleanI) {
        super(boolean_);
    }
}

export interface ShortTextI extends BasicConfigI {
}

export class ShortText extends BasicConfig {
}

export interface EncryptedI extends BasicConfigI {
}
export class Encrypted extends BasicConfig {
    constructor(encrypted: EncryptedI) {
        super(encrypted);
    }
}
export interface AuthenticationI extends BasicConfigI {
    displaypassword: string
    hiddenusername: boolean
}
export class Authentication extends BasicConfig {
    displaypassword?: string
    hiddenusername?: boolean
    constructor(authentication: AuthenticationI) {
        super(authentication);
        this.displaypassword = authentication.displaypassword === undefined ? '' : authentication.displaypassword;
        if (authentication.hiddenusername === undefined){
            this.hiddenusername = false;
        } else {
            this.hiddenusername = authentication.hiddenusername;
        }
    }
    /**
     * getWebview
     */
    public toWebview(configurationIndex: number): string {
        const configurationId = getConfigurationDivId(configurationIndex);
        return `
            <p class=partblock>
            <form id="${configurationId}">
                <label for=name>Name: </label>
                <input type=text id="name" value=${this.name}><br>
                <label for=name>Display Username: </label>
                <input type=text id=display value="${this.display}"></input>
                <input type=checkbox id="showUsername" ${!this.hiddenusername ? 'checked' : ''}>Show</input><br>
                <label for=name>Display Password: </label>
                <input type=text id=password value="${this.displaypassword ? this.displaypassword : ''}"></input>
                <input type=checkbox id="showPassword" ${Boolean(this.displaypassword) ? 'checked' : ''}>Show</input><br>
                <label for=type>Type: </label>
                ${getWebviewSelectParamType(parseInt(this.type.toString()))}<br>
                <label for=additionalinfo>Additional Info: </label>
                <textarea id=additionalinfo>${this.additionalinfo ? this.additionalinfo : ''}</textarea>
                <br>
                <label for=required>Mandatory: </label>
                <input type=checkbox id=required ${getCheckboxChecked(this.required)}><br><br>
            </form>
            ${getWebviewRemoveConfigurationButton(configurationIndex)}
            <script>
            { (() => {
                var form = document.querySelector("#${configurationId}");
                var showPassword = form.querySelector("#showPassword");
                var password = form.querySelector("#password");
                password.disabled = !showPassword.checked;
                var showUsername = form.querySelector("#showUsername");
                var username = form.querySelector("#display");
                username.disabled = !showUsername.checked;
                var inputs = [form.getElementsByTagName("input"), form.getElementsByTagName("select"), form.getElementsByTagName("textarea")];
    
                for (var inputType of inputs){
                    for (var input of inputType){
                        input.onchange = () => {
                            username.disabled = !showUsername.checked;
                            password.disabled = !showPassword.checked;
                            if (showPassword.checked){
                                password.value = password.value ? password.value : 'Password';
                            } else {
                                password.value = '';
                            }
                            console.debug("Updating configuration ${configurationIndex}");
                            vscode.postMessage({
                                    command: 'updateConfiguration',
                                    configurationIndex: parseInt(${configurationIndex}),
                                    data: {
                                        name: form.querySelector("#name").value,
                                        display: form.querySelector("#display").value,
                                        type: ntot[form.querySelector("#type").value],
                                        required: form.querySelector("#required").checked,
                                        hiddenusername: !showUsername.checked,
                                        displaypassword: password.value,
                                        additionalinfo: form.querySelector("#additionalinfo").value
                                    }
                            });
                    }
                }
            }
            })();}
            </script>
            </p>
            `;
    }
}
export interface LongTextI extends BasicConfigI {
}
export class LongText extends BasicConfig {
    constructor(longtext: LongTextI) {
        super(longtext);
    }
}
export interface SingleSelectI extends OptionsConfigI {
}
export class SingleSelect extends OptionsConfig {
    constructor(singleselect: OptionsConfigI) {
        super(singleselect);
    }

}
export interface MultiSelectI extends OptionsConfigI {
}
export class MultiSelect extends OptionsConfig {
    constructor(multiselect: OptionsConfigI) {
        super(multiselect);
    }
}

export type ParamsTypes = AuthenticationI | EncryptedI | ShortTextI | LongTextI | BooleanI | SingleSelectI | MultiSelectI;
export type ParamsClassesTypes = Authentication | Encrypted | ShortText | LongText | Boolean_ | SingleSelect | MultiSelect;

export type BasicParams = BooleanI | ShortTextI | LongTextI | EncryptedI;

export type OptionsParams = SingleSelectI | MultiSelectI;

export function typeToInterface(data: BasicConfigI) {
    switch (data.type) {
        case 0:
            return data as ShortTextI;
        case 12:
            return data as LongTextI;
        case 8:
            return data as BooleanI;
        case 4:
            return data as EncryptedI;
        case 9:
            return data as AuthenticationI;
        case 15:
            return data as SingleSelectI;
        case 16:
            return data as MultiSelectI;
        default:
            throw TypeError('Unknown type ' + data.type)
    }
}

export function typeToClass(data: ParamsTypes): BasicConfig {
    switch (data.type) {
        case 0:
            return new ShortText(data);
        case 12:
            return new LongText(data);
        case 8:
            return new Boolean_(data);
        case 4:
            return new Encrypted(data);
        case 9:
            return new Authentication(data as AuthenticationI);
        case 15:
            return new SingleSelect(data as SingleSelectI);
        case 16:
            return new MultiSelect(data as MultiSelectI);
        default:
            throw TypeError('Unknown type ' + data.type)
    }
}
export const displayNames: { [name: string]: string } = {
    ShortText: 'ShortText',
    Encrypted: 'Encrypted',
    Boolean: 'Boolean',
    Authentication: 'Authentication',
    LongText: 'LongText',
    SingleSelect: 'SingleSelect',
    MultiSelect: 'MultiSelect'
}

export const ntot: { [name: string]: number } = {
    ShortText: 0,
    Encrypted: 4,
    Boolean: 8,
    Authentication: 9,
    LongText: 12,
    SingleSelect: 15,
    MultiSelect: 16
}

export const tton: { [type: number]: string } = {
    0: displayNames.ShortText,
    4: displayNames.Encrypted,
    8: displayNames.Boolean,
    9: displayNames.Authentication,
    12: displayNames.LongText,
    15: displayNames.SingleSelect,
    16: displayNames.MultiSelect
}


export function nameToType(name: string): number {
    const name_ = ntot[name];
    if (name_) {
        return name_;
    }
    throw TypeError('Unknown name ' + name)
}

export function typeToName(type: number): string {
    const name_ = tton[type];
    if (name_) {
        return name_;
    }
    throw TypeError('Unknown name ' + type)
}

function getWebviewRemoveConfigurationButton(configurationIndex: number): string {
    const buttonId = getRemoveConfigurationButtonId(configurationIndex);
    return `
    <button id="${buttonId}">Remove Configuration</button>
    <script>
    { (() => {
        document.querySelector("#${buttonId}").addEventListener("click", () => {
            console.log("Remove output clicked. Command index: ${configurationIndex}");
            vscode.postMessage({
                command: 'removeConfiguration',
                configurationIndex: parseInt(${configurationIndex})
            });
        });
    })();}
    </script>
    `;
    return '';
}