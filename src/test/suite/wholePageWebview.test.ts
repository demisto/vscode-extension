import { IntegrationHolder } from "../../contentObject";
import * as yaml from 'yaml';
import * as fs from 'fs';
import * as validator from 'html-validator';
import * as path from 'path';
// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import * as integrationLoader from '../../integrationLoader';
import * as scriptLoader from '../../automation';
import { removeDuplicateIdErrors } from "./testTools";

suite("Full HTML validator", () => {


    test('Test integration HTML', async () => {
        const yml_path = path.resolve(__dirname, './test_files/Hello.yml').replace('/out/', '/src/');
        const parsed_yml = yaml.parse(
            fs.readFileSync(
                yml_path,
                { encoding: 'utf-8' }
            )
        )
        const integration = new IntegrationHolder(
            parsed_yml,
            yml_path,
            vscode.Uri.parse('')
        );
        const page = integrationLoader.getWebviewFromYML(integration.integration, vscode.Uri.parse(''), vscode.Uri.parse(''))

        const res = await validator({
            format: "text",
            data: page
        })

        const newRes = removeDuplicateIdErrors(res)
        /* 3 lines meaning it'll display only that error founds, which removed
        in the previous step
        */
        if (newRes.split('\n').length > 3) {
            throw Error(newRes)
        }
    });

    test('Test script HTML', async () => {
        const yml_path = path.resolve(__dirname, './test_files/script.yml').replace('/out/', '/src/');
        const parsed_yml = yaml.parse(
            fs.readFileSync(
                yml_path,
                { encoding: 'utf-8' }
            )
        )
        const script = new scriptLoader.ScriptHolder(
            parsed_yml,
            yml_path,
        );
        const page = script.getWebview(vscode.Uri.parse(''))

        const res = await validator({
            format: "text",
            data: page
        })

        const newRes = removeDuplicateIdErrors(res)
        /* 3 lines meaning it'll display only that error founds, which removed
        in the previous step
        */
        if (newRes.split('\n').length > 3) {
            throw Error(newRes)
        }
    });
})