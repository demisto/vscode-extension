
[![Run Node Test](https://img.shields.io/github/workflow/status/demisto/vscode-extension/Run%20Node%20Test)](https://github.com/demisto/vscode-extension/actions/workflows/steps.yml)

# Cortex  XSOAR VSCode Plugin

Work with Visual Studio Code to edit, validate and format your Cortex XSOAR integrations and automations.

To start using the extension, first of all, install [demisto-sdk](https://pypi.org/project/demisto-sdk/).  

You can also use the *XSOAR: Install/Update Demisto-SDK* command.  

Commands:

* *XSOAR: Load integration/Script*: Loads an integration or a script to the UI.
* *XSOAR: Validate/Lint*: Run linters and validators on opened file directory.
* *XSOAR: Update Release Notes*: Update release notes of the opened file's pack.

## Configurations  

### Auto Linters

The Cortex XSOAR extension will automatically use the demisto-sdk to lint (code files) and validate (.yml files) your packs.

To control the auto-lints behaviour:  

* `xsoar.linter.[linter-name].enable`: Whether to enable the auto-lint.

* `xsoar.linter.[linter-name].patterns`: Which file patterns (glob) to run with the linter.

The linters will write its data to the path configured in `xsoar.autoFindProblems.reportPath`, which is also the file that VSCode takes the problems from.

If you wish to see the process running (or check why it's failing or not working), change `xsoar.linter.showOnSaveTerminal` to `true`.

### Auto Save  

By default, the extension will automatically save changes made to the integration/automation file made in the webview (opened with *XSOAR: Load Integration/Script*).
to disable it, change `xsoar.autoSave` to `false`.

## Contributing

Contributions are welcome and appreciated. To contribute follow the instructions below and submit a PR.

Before merging any PRs, we need all contributors to sign a contributor license agreement. By signing a contributor license agreement, we ensure that the community is free to use your contributions.

When you open a new pull request, a bot will evaluate whether you have signed the CLA. If required, the bot will comment on the pull request, including a link to accept the agreement. The CLA document is also available for review as a [PDF](https://github.com/demisto/content/blob/master/docs/cla.pdf).

If the `license/cla` status check remains on *Pending*, even though all contributors have accepted the CLA, you can recheck the CLA status by visiting the following link (replace **[PRID]** with the ID of your PR): <https://cla-assistant.io/check/demisto/vscode-extension?pullRequest=[PRID>] .

## Development

### Dev Setup Environment  

* `npm install`
* `npm run compile`
* `pip demisto-sdk` or use [pipenv](https://pipenv.pypa.io/en/latest/) to install the demisto-sdk from the Pipfile.

### Main Locations

* _package.json_: Define commands

* _src/extension.ts_: The entry point of the extension

* _src/tests/_: Location of the mocha-suite test files.

* _css/panel.css_: The CSS file of script/automation webview
