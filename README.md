
![Github Actions Badge](https://github.com/demisto/vscode-extension/actions/workflows/steps.yml/badge.svg)

# XSOAR VSCode Plugin

Validate, Format, Update Release Notes

## How to develop

Install:

* `npm install`
* `npm run compile`

Locations:

* _package.json_: Define commands

* _src/extension.ts_: entry point

* _css/panel.css_: The css of xsoar.load

Commands:

* *XSOAR: Load integration*: Load integration to UI.
* *XSOAR: Validate/Lint*: Run linters and validators on opened file directory.
* *XSOAR: Update Release Notes*: Update release notes of the opened file's pack.
