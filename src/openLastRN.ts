import * as vscode from 'vscode';
import * as path from "path";
import { findDir } from './tools';
import { promises as fsp } from 'fs';
import * as semver from 'semver';


export function openLastRN(dirPath: string): void {
	findDir(dirPath, 'ReleaseNotes').then(
		ReleaseNotesDir => {
			if (ReleaseNotesDir === undefined) {
				vscode.window.showErrorMessage('The current file is not under the "Packs" directory.');
				return;
			}
			if (!ReleaseNotesDir) {
				vscode.window.showErrorMessage('No ReleaseNotes directory found.');
				return;
			}
			getLastRNFile(ReleaseNotesDir).then(
				lastReleaseNotesFile => {
					const relativeFilePath = path.join(ReleaseNotesDir, lastReleaseNotesFile);
					vscode.workspace.openTextDocument(vscode.Uri.file(relativeFilePath))
						.then(doc => vscode.window.showTextDocument(doc));
				});
		}
	)
}

async function getLastRNFile(directoryPath: string): Promise<string> {
    try {
        const entries = await fsp.readdir(directoryPath, { withFileTypes: true });
        let maxSum = "0.0.0";
        let latestFile = "";

        entries.forEach(entry => {
            if (entry.isFile()) {
                const version = path.parse(entry.name).name.replace(/_/g, '.')
                if (semver.gt(version, maxSum)) {
                    maxSum = version;
                    latestFile = entry.name;
                }
            }
        });

        return latestFile;
    } catch (error) {
        console.error('Error reading directory:', error);
        throw error;
    }
}