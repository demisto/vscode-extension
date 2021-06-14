import { getCheckboxChecked, getConfigurationDivId, getRemoveConfigurationButtonId } from "./tools";

export interface BasicConfigI {
    name: string
    display: string
    required: boolean
    defaultvalue?: string
    type: number
    additionalinfo: string
}

export class BasicConfig implements BasicConfigI {
    name: string;
    display: string;
    required: boolean;
    defaultvalue?: string;
    type: number;
    additionalinfo: string;
    constructor(basicConfig: BasicConfigI) {
        this.name = basicConfig.name;
        this.display = basicConfig.display;
        this.required = basicConfig.required;
        this.defaultvalue = basicConfig.defaultvalue ? basicConfig.defaultvalue : undefined;
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
                <label for=name>Name:</label>
                <input type=text id="name" value=${this.name}><br>
                <label for=name>Display:</label>
                <input type=text id=display value="${this.display}"></inpur><br>
                <label for="defaultvalue">Default Value:</label>
                <input type=text id=defaultvalue value="${this.defaultvalue ? this.defaultvalue : ''}"></input><br>
                ${this.selectParamType()}<br>
                <label for=additionalinfo>Additional Info:</label>
                <textarea id=additionalinfo>${this.additionalinfo ? this.additionalinfo : ''}</textarea>
                <br>
                <label for=required>Mandatory:</label>
                <input type=checkbox id=required ${getCheckboxChecked(this.required)}></input><br><br>
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
                                        additionalinfo: form.querySelector("#additionalinfo").value,
                                        defaultvalue: form.querySelector("#defaultvalue").value
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

    public paramSelectorOptionSingleBuilder(typeName: string): string {
        return `<option value=${typeName} ${this.type == textToNumber[typeName] ? 'selected' : ''}>${typeName}</option>`
    }
    public selectParamType(): string{
        let selectedForm = '<select type=text id=type>'
    
        for (const type in numberToText){
            selectedForm += this.paramSelectorOptionSingleBuilder(numberToText[type])
        }
        selectedForm += '</select>'
        return `
        <label for=type>Type:</label>
        ${selectedForm}
        <br>
        `
    }
}

export interface OptionsConfigI extends BasicConfigI {
    options?: Array<string>
}

export abstract class OptionsConfig extends BasicConfig {
    options: string[]
    constructor(basicConfig: OptionsConfigI) {
        super(basicConfig)
        if (typeof basicConfig.options === 'string' || basicConfig.options instanceof String){
            basicConfig.options = basicConfig.options.split('\n');
        }
        this.options = basicConfig.options ? basicConfig.options : Array<string>();
    }

    protected showOptions(): string {
        return `
        <label for=options>Options: </label>
        <textarea id=options>${this.options.join('\n')}</textarea>
        `
    }

    abstract toWebview(index: number): string;
}

export interface BooleanI extends BasicConfigI {
    defaultvalue?: "true" | "false";
}

export class Boolean_ extends BasicConfig {
    defaultvalue: "true" | "false";
    constructor(boolean_: BooleanI) {
        super(boolean_);
        this.defaultvalue = boolean_.defaultvalue ? boolean_.defaultvalue : 'true';
    }
    /**
     * getSelectDefault
     */
    public getSelectDefault(): string {
        return `
        <label for=defaultvalue>Default Value:</label>
        <select type=text id=defaultvalue>
            <option value="true" ${this.defaultvalue.toLowerCase() === 'true' ? 'selected' : ''}>true</option>
            <option value="false"" ${this.defaultvalue.toLowerCase() === 'false' ? 'selected' : ''}>false</option>
        </select>`
    }

    /**
     * getWebview
     */
    public toWebview(configurationIndex: number): string {
        const configurationId = getConfigurationDivId(configurationIndex);
        return `
                <p class=partblock>
                <form id="${configurationId}">
                    <label for=name>Name:</label>
                    <input type=text id="name" value=${this.name}><br>
                    <label for=name>Display:</label>
                    <input type=text id=display value="${this.display}"></inpur><br>
                    ${this.getSelectDefault()}
                    <br>
                    ${this.selectParamType()}<br>
                    <label for=additionalinfo>Additional Info:</label>
                    <textarea id=additionalinfo>${this.additionalinfo ? this.additionalinfo : ''}</textarea>
                    <br>
                    <label for=required>Mandatory:</label>
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
                                            additionalinfo: form.querySelector("#additionalinfo").value,
                                            defaultvalue: form.querySelector("#defaultvalue").value
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
        if (authentication.hiddenusername === undefined) {
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
                <input type=checkbox id="showPassword" ${this.displaypassword ? 'checked' : ''}>Show</input><br>
                ${this.selectParamType()}<br>
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
export class LongText extends BasicConfig {
    constructor(longtext: BasicConfigI) {
        super(longtext);
    }
}
export class SingleSelect extends OptionsConfig {
    constructor(singleselect: OptionsConfigI) {
        super(singleselect);
    }

    /**
    * selectDefaultValue
    */
    private selectDefaultValue(): string {
        let selectBlock = `
        <label for="defaultvalue">Default Value:</label>
        <select type=text id=defaultvalue>
        <option value="" ${!this.defaultvalue ? 'selected': ''}></option>
        `
        this.options.forEach((value: string) => {
            selectBlock += `<option value="${value}" ${this.defaultvalue === value ? 'selected' : ''}>${value}</option>`
        })
        selectBlock += '</select>'
        return selectBlock
    }

    /**
     * toWeview
     */
    public toWebview(configurationIndex: number): string {
        const configurationId = getConfigurationDivId(configurationIndex);

        return `
                <p class=partblock>
                <form id="${configurationId}">
                    <label for=name>Name:</label>
                    <input type=text id="name" value=${this.name}><br>
                    <label for=name>Display:</label>
                    <input type=text id=display value="${this.display}"></input><br>
                    ${this.selectDefaultValue()}
                    <br>
                    ${this.showOptions()}
                    <br>
                    ${this.selectParamType()}
                    <label for=additionalinfo>Additional Info:</label>
                    <textarea id=additionalinfo>${this.additionalinfo ? this.additionalinfo : ''}</textarea>
                    <br>
                    <label for=required>Mandatory:</label>
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
                                            additionalinfo: form.querySelector("#additionalinfo").value,
                                            defaultvalue: form.querySelector("#defaultvalue").value,
                                            options: form.querySelector("#options").value
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
export class MultiSelect extends OptionsConfig {
    constructor(multiselect: OptionsConfigI) {
        multiselect.defaultvalue = multiselect.defaultvalue ? multiselect.defaultvalue.replace('\n', ',') : multiselect.defaultvalue;
        super(multiselect);
    }
    /**
    * selectDefaultValue
    */
     private selectDefaultValue(): string {
        const defaultValue = new Set(this.defaultvalue?.split(','));
        let selectBlock = `
        <label for="defaultvalue">Default Value:</label>
        <select type=text id=defaultvalue multiple>
        <option value="" ${!this.defaultvalue ? 'selected': ''}></option>
        `
        this.options.forEach((value: string) => {
            selectBlock += `<option value="${value}" ${defaultValue?.has(value) ? 'selected' : ''}>${value}</option>`
        })
        selectBlock += '</select>'
        return selectBlock
    }

    /**
     * toWeview
     */
    public toWebview(configurationIndex: number): string {
        const configurationId = getConfigurationDivId(configurationIndex);

        const a =  `
                <p class=partblock>
                <form id="${configurationId}">
                    <label for=name>Name:</label>
                    <input type=text id="name" value=${this.name}><br>
                    <label for=name>Display:</label>
                    <input type=text id=display value="${this.display}"></input><br>
                    ${this.selectDefaultValue()}
                    <br>
                    ${this.showOptions()}
                    <br>
                    ${this.selectParamType()}
                    <label for=additionalinfo>Additional Info:</label>
                    <textarea id=additionalinfo>${this.additionalinfo ? this.additionalinfo : ''}</textarea>
                    <br>
                    <label for=required>Mandatory:</label>
                    <input type=checkbox id=required ${getCheckboxChecked(this.required)}><br><br>
                </form>
                ${getWebviewRemoveConfigurationButton(configurationIndex)}
                <script>
                { (() => {
                    var form = document.querySelector("#${configurationId}");
                    var inputs = [form.getElementsByTagName("input"), form.getElementsByTagName("select"), form.getElementsByTagName("textarea")];
                    var defaultvalue = [];
                    console.log(form.querySelector('#defaultvalue'));
                    for (var inputType of inputs){
                        for (var input of inputType){
                            console.log('updating'); console.log(input);
                            input.onchange = () => {
                                console.debug("Updating configuration ${configurationIndex}");
                                for (var option of form.querySelector('#defaultvalue').options)
                                {
                                    if (option.selected) {
                                        console.log('option selected');
                                        console.log(option.value);
                                        defaultvalue.push(option.value);
                                    }
                                }
                                vscode.postMessage({
                                        command: 'updateConfiguration',
                                        configurationIndex: parseInt(${configurationIndex}),
                                        data: {
                                            name: form.querySelector("#name").value,
                                            display: form.querySelector("#display").value,
                                            type: ntot[form.querySelector("#type").value],
                                            required: form.querySelector("#required").checked,
                                            additionalinfo: form.querySelector("#additionalinfo").value,
                                            defaultvalue: defaultvalue.join("\\n"),
                                            options: form.querySelector("#options").value
                                        }
                                });
                        }
                    }
                }
                })();}
                </script>
                </p>
                `;
                return a;
    }
}

export type ParamsTypes = AuthenticationI | BooleanI;
export type ParamsClassesTypes = Authentication | LongText | Boolean_ | SingleSelect | MultiSelect;

export type BasicParams = BooleanI 

export function typeToInterface(data: BasicConfigI): BasicConfigI {
    switch (data.type) {
        case 0:
        case 1:
        case 4:
        case 19:
            case 12:
        case 13:
            return data as BasicConfigI;

        case 8:
            return data as BooleanI;
        case 9:
            return data as AuthenticationI;
        case 15:
        case 17:
        case 18:
        case 16:
            return data as OptionsConfigI;
        default:
            throw TypeError('Unknown type ' + data.type)
    }
}

export function typeToClass(data: ParamsTypes): BasicConfig {
    switch (data.type) {
        case 0:
        case 1:
        case 4:
        case 19:
        case 13:
            return new BasicConfig(data);
        case 12:
            return new LongText(data);
        case 8:
            return new Boolean_(data as BooleanI);
        case 9:
            return new Authentication(data as AuthenticationI);
        case 15:
        case 17:
        case 18:
            return new SingleSelect(data as OptionsConfigI);
        case 16:
            return new MultiSelect(data as OptionsConfigI);
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
    MultiSelect: 'MultiSelect',
    feedReliability: 'feedReliability',
    incidentType: 'incidentType',
    feedExpirationPolicy: 'feedExpirationPolicy',
    feedExpirationInterval: 'feedExpirationInterval'
}

export const textToNumber: { [name: string]: number } = {
    ShortText: 0,
    Encrypted: 4,
    Boolean: 8,
    Authentication: 9,
    LongText: 12,
    incidentType: 13,
    SingleSelect: 15,
    MultiSelect: 16,
    feedExpirationInterval: 1,
    feedExpirationPolicy: 17,
    feedReliability: 18

}

export const numberToText: { [type: number]: string } = {
    0: displayNames.ShortText,
    4: displayNames.Encrypted,
    8: displayNames.Boolean,
    9: displayNames.Authentication,
    12: displayNames.LongText,
    13: displayNames.incidentType,
    15: displayNames.SingleSelect,
    16: displayNames.MultiSelect,
    1: displayNames.feedExpirationInterval,
    17: displayNames.feedExpirationPolicy,
    18: displayNames.feedReliability
}


export function nameToType(name: string): number {
    const name_ = textToNumber[name];
    if (name_) {
        return name_;
    }
    throw TypeError('Unknown name ' + name)
}

export function typeToName(type: number): string {
    const name_ = numberToText[type];
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
}