import { after } from 'mocha';
import * as validator from 'html-validator';
// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { Authentication, BasicConfig, Boolean_, MultiSelect, SingleSelect, textToNumber } from '../../configurations';
import { getWebviewAdvancedConfiguration, getWebviewSingleArgument, getWebviewSingleCommand, getWebviewSingleOutput } from '../../panelloader';

suite('Configurations Webview Validator', () => {
    after(() => {
        vscode.window.showInformationMessage('All tests done!');
    });

    test('Basic', async () => {
        const data = new BasicConfig(
            {
                name: "name",
                display: "Name",
                required: false,
                defaultvalue: "name",
                type: textToNumber.ShortText,
                additionalinfo: ""
            }
        )
        const res = await validator({
            format: "text",
            data: data.toWebview(0),
            isFragment: true
        })
        if (!res.includes('The document validates according to the specified schema')) {
            throw Error(res)
        }
    })

    test('Authentication', async () => {
        const data = new Authentication(
            {
                name: "name",
                display: "Name",
                required: false,
                defaultvalue: "name",
                type: textToNumber.Authentication,
                additionalinfo: "",
                displaypassword: "password",
                hiddenusername: false
            }
        )
        const res = await validator({
            format: "text",
            data: data.toWebview(0),
            isFragment: true
        })
        if (!res.includes('The document validates according to the specified schema')) {
            throw Error(res)
        }
    })


    test('Boolean', async () => {
        const data = new Boolean_(
            {
                name: "name",
                display: "Name",
                required: false,
                defaultvalue: "false",
                type: textToNumber.Boolean,
                additionalinfo: ""
            }
        )
        const res = await validator({
            format: "text",
            data: data.toWebview(0),
            isFragment: true
        })

        if (!res.includes('The document validates according to the specified schema')) {
            throw Error(res)
        }
    })
    test('SingleSelect', async () => {
        const data = new SingleSelect(
            {
                name: "name",
                display: "Name",
                required: false,
                defaultvalue: "name",
                type: textToNumber.SingleSelect,
                additionalinfo: ""
            }
        )
        const res = await validator({
            format: "text",
            data: data.toWebview(0),
            isFragment: true
        })
        if (!res.includes('The document validates according to the specified schema')) {
            throw Error(res)
        }
    })

    test('MultiSelect', async () => {
        const data = new MultiSelect(
            {
                name: "name",
                display: "Name",
                required: false,
                defaultvalue: "name",
                options: ["1", "2", "3"],
                type: textToNumber.MultiSelect,
                additionalinfo: ""
            }
        )
        const res = await validator({
            format: "text",
            data: data.toWebview(0),
            isFragment: true
        })
        if (!res.includes('The document validates according to the specified schema')) {
            throw Error(res)
        }
    })
});

suite('Command Webview Validator', () => {
    test("Argument validator", async () => {
        const argumentWebview = getWebviewSingleArgument(
            0, 0,
            {
                name: 'mashu',
                required: true,
                description: '',
                predefined: ['true', 'false'],
                isArray: false,
                defaultValue: 'true'
            }
        )
        const res = await validator({
            format: "text",
            data: argumentWebview,
            isFragment: true
        })
        if (!res.includes('The document validates according to the specified schema')) {
            throw Error(res)
        }
    })

    test("Output validator", async () => {
        const outputWebview = getWebviewSingleOutput(
            0, 0,
            {
                description: '',
                contextPath: 'Path.To.Here',
                type: 'bool'
            }
        )
        const res = await validator({
            format: "text",
            data: outputWebview,
            isFragment: true
        })
        if (!res.includes('The document validates according to the specified schema')) {
            throw Error(res)
        }
    })

    test("Command validator", async () => {
        const commandWebview = getWebviewSingleCommand(
            0,
            {
                name: 'command',
                description: '',
                deprecated: false,
                arguments: [],
                outputs: []
            }
        )
        const res = await validator({
            format: "text",
            data: commandWebview,
            isFragment: true
        })
        if (!res.includes('The document validates according to the specified schema')) {
            throw Error(res)
        }
    })

    test("Advanced panel", async () => {
        const advancedWebview = getWebviewAdvancedConfiguration(
            {
                dockerimage: 'demisto/python3:1333',
                longRunning: false,
                longRunningPort: false,
                isfetch: true,
                runonce: false,
                commands: [],
                feed: false,
                subtype: 'python3',
                script: ''
            }
        )
        const res = await validator({
            format: "text",
            data: advancedWebview,
            isFragment: true
        })
        if (!res.includes('The document validates according to the specified schema')) {
            throw Error(res)
        }
    })
})
