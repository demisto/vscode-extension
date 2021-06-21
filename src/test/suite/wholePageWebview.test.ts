import { Integration } from "../../contentObject";
import * as yaml from 'yaml';
import * as fs from 'fs';
import * as validator from 'html-validator';
import * as path from 'path';
// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { getWebviewFromYML } from '../../panelloader';
import { removeDuplicateIdErrors } from "./testTools";

suite("Full HTML validator", () => {
    const integration = new Integration(
        yaml.parse(
            fs.readFileSync(
                path.resolve(__dirname, './test_files/Hello.yml').replace('/out/', '/src/'),
                { encoding: 'utf-8' }
            )
        )
    );

    test('Test full HTML', async () => {
        const page = getWebviewFromYML(integration, vscode.Uri.parse(''), vscode.Uri.parse(''))

        const res = await validator({
            format: "text",
            data: page
        })

        const newRes = removeDuplicateIdErrors(res)
        /* 3 lines meaning it'll display only that error founds, which removed
        in the previous step
        */
        if (newRes.split('\n').length > 3){  
            throw Error(newRes)
        }
    });
})