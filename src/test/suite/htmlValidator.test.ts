import { after } from 'mocha';
import * as yaml from 'yaml';
import * as fs from 'fs';
import * as validator from 'html-validator';
import * as path from 'path';
// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { Integration } from '../../contentObject';
import { getWebviewFromYML } from '../../panelloader';

suite('HTML validator', () => {
    after(() => {
        vscode.window.showInformationMessage('All tests done!');
    });

    test('Test full html', (done) => {
        const integration = new Integration(
            yaml.parse(
                fs.readFileSync(
                    path.resolve(__dirname, './test_files/Hello.yml').replace('/out/', '/src/'),
                    { encoding: 'utf-8' }
                )
            )
        );
        const page = getWebviewFromYML(integration, vscode.Uri.parse(''), vscode.Uri.parse(''))

        validator(
            {
                format: "html",
                data: page
            }

        ).then(
            (result: string) => {
                console.log(result)
                done()
            }
        )
    });
});

