import { after } from 'mocha';
import * as yaml from 'yaml';
import * as fs from 'fs';
import * as validator from 'html-validator';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { Integration } from '../../contentObject';
import { getWebviewFromYML } from '../../panelloader';
// import * as myExtension from '../extension';

suite('HTML validator', () => {
    after(() => {
        vscode.window.showInformationMessage('All tests done!');
    });

    test('Test full html', () => {
        const integration = new Integration(
            yaml.parse(fs.readFileSync('./test_files/Hello.yml', {encoding: 'utf-8'}))
        );
        const page = getWebviewFromYML(integration, vscode.Uri.parse(''))

        validator(
            {
                format: "html",
                data: page
            }
        ).then(() => {
            console.log('validated')
        })


    });
});

