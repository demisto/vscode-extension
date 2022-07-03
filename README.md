
[![Run Node Test](https://img.shields.io/github/workflow/status/demisto/vscode-extension/Run%20Node%20Test)](https://github.com/demisto/vscode-extension/actions/workflows/steps.yml)

# Cortex  XSOAR VSCode Plugin

Work with Visual Studio Code to edit, validate and format your Cortex XSOAR integrations and automations.

To start using the extension, first of all, install [demisto-sdk](https://pypi.org/project/demisto-sdk/).  

You can also use the *XSOAR: Install/Update Demisto-SDK* command.  

Commands:

* *XSOAR: Load integration/Script*: Loads an integration or a script to the UI.
* *XSOAR: Demisto-SDK Validate/Lint*: Run linters and validators on opened file directory.
* *XSOAR: Demisto-SDK Update Release Notes*: Update release notes of the opened file's pack.
* You can also run the commands directry from the explorer menu:  
![sidebar](documentation/changelog/0.0.3/sidebar.png)

## Configurations  

To use this extension, `demisto-sdk` needs to be correctly configured.
Either configure it locally with:
```bash
pip install demisto-sdk
```

Or you can follow [this guide](https://xsoar.pan.dev/docs/tutorials/tut-setup-env) to configure a fully configured remote development environnement, with `demisto-sdk` and more features preinstalled.

### Demisto-SDK Path

The default behavior of the extension when running a demisto-sdk command is to run `demisto-sdk <command>`. You can set a different demisto-sdk path (if you want to run always on the same demisto-sdk or when you're using a tool like pipx). You can set the `xsoar.demisto-sdk.Path` to the demisto-sdk executable.

### Auto Linters

The Cortex XSOAR extension will automatically use the demisto-sdk to lint (code files) and validate (.yml files) your packs.

To turn on auto-linters in your workspace, set the `xsoar.autoFindProblems.readProblems` setting to `true`.
To control the auto-lints behaviour:  

* `xsoar.linter.[linter-name].enable`: Whether to enable the auto-lint. Default to false.

* `xsoar.linter.[linter-name].patterns`: Which file patterns (glob) to run with the linter.

The linters will write its data to the path configured in `xsoar.autoFindProblems.reportPath`, which is also the file that VSCode takes the problems from.

If you wish to see the process running (or check why it's failing or not working), change `xsoar.linter.showOnSaveTerminal` to `true`.

### Auto Save  

By default, the extension will automatically save changes made to the integration/automation file made in the webview (opened with *XSOAR: Load Integration/Script*).
to disable it, change `xsoar.autoSave` to `false`.

## Open in virtual environment

When working on an integration or a script, you can right click on it, and click on `Open integration/script in virtual environment`. This will open the integration or the script in a new folder, with configured `python` virtual environment. This environment consists exactly the same python environment of the `docker image` of the integration or a script, with testing and linting libraries added.

This is the recommended way to develop and debug your integration.

## Dev Containers

The extension supports opening an integration or a script in a dev container.
This opens a new folder inside a container that is based upon the integration or script docker image (which is specified in their YAML file). This workspace is fully configured with `Python`, `Pylance`, `flake8`, `mypy` and `pytest`, allowing developing and debugging inside the integration environment. 
### System requirements


**Windows**: Docker Desktop 2.0+ on Windows 10 Pro/Enterprise. Windows 10 Home (2004+) requires Docker Desktop 2.3+ and the WSL 2 back-end.
**macOS**: Docker Desktop 2.0+.
**Linux**: Docker CE/EE 18.06+ and Docker Compose 1.21+
**Remote hosts**: 1 GB RAM is required, but at least 2 GB RAM and a 2-core CPU is recommended.

Follow the [VSCode instructions](https://code.visualstudio.com/docs/remote/containers#_installation) for the installation process.

### Usage

When working on an integration or a script, you can right click on it, and click on `Open integration/script in virtual environment`. This will open the integration or the script in a new folder, exactly the same environment of the `docker image` of the integration or a script, with testing and linting libraries added.

This is mainly used to debug your integration.
   
#### Dev Container Notes

* Make sure you have [`ms-vscode-remote.remote-containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)` extension installed.
* Make sure you have `docker daemon` running (you can check with executing `docker ps`).
* The integration/script Dev Container does not have `demisto-sdk` or `git`.
* The workspace folder is bind with the local folder. It is possible to work simultaneously on the same files locally and with Dev Container, because they are mirrored.

## Python 2.* Support

Using a Python 2.* virtual environnement or container, *mypy* will not be able to be installed.

For debugging the tests, it is necessary to install The VSCode Python extension version `2022.2`:
![Python 2](documentation/changelog/0.2.0/python2_1.png)

![Python 2](documentation/changelog/0.2.0/python2_2.png)

## Contributing

Contributions are welcome and appreciated. To contribute follow the instructions below and submit a PR.

Before merging any PRs, we need all contributors to sign a contributor license agreement. By signing a contributor license agreement, we ensure that the community is free to use your contributions.

When you open a new pull request, a bot will evaluate whether you have signed the CLA. If required, the bot will comment on the pull request, including a link to accept the agreement. The CLA document is also available for review as a [PDF](https://github.com/demisto/content/blob/master/docs/cla.pdf).

If the `license/cla` status check remains on *Pending*, even though all contributors have accepted the CLA, you can recheck the CLA status by visiting the following link (replace **[PRID]** with the ID of your PR): <https://cla-assistant.io/check/demisto/vscode-extension?pullRequest=[PRID]> .

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
