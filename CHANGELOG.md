# Change Log

# Unreleased

# [0.7.4] (2024-11-26)

- Added **Open last release note** command to open the last release note (`Cmd+R` on Mac, `Ctrl+Alt+R` on Linux and Windows)

# [0.7.3] (2024-09-24)

- Documentation improvements.

# [0.7.2] (2024-07-24)

- Fixed an issue where the "Update Release Notes" command failed due to incorrect command calling.
- Fixed an issue where the "Validate" command failed due to incorrect command calling.

# [0.7.1] (2024-04-25)

- Fixed an issue with `demisto-sdk` arguments where there are special characters in the path.
- Added support for XSOAR NG/ XSIAM env vars setting.
- Added support for comments in `.env` file.

# [0.7.0] (2023-11-21)

- Fixed an issue with installing `poetry` in **Install XSOAR local development environment** command.
- Added **Run And Debug** command to run and debug integrations/scripts locally and in XSOAR/XSIAM.

# [0.6.2] (2023-06-28)

- Fixed an issue with debugging integrations and scripts with `Docker`.

# [0.6.1] (2023-06-22)

- Set `python.analysis.typeCheckingMode` to `basic` In Content and Demisto-SDK VSCode settings.
- Set `justMyCode` setting to `false` when running tests, to debug third party code.
- Fixed an issue in **Install XSOAR local development environment** where `pyenv` installation fails.

# [0.6.0] (2023-05-21)

- Removed `flake8` from `settings.json` for `content` and `demisto-sdk` settings..
- Introduced **Setup integration/script environment** command to setup the environment for the integration/script.
- Deprecated **Open integration/script in virtual environment** command.

# [0.5.12] (2023-04-24)

- Automatically add `__init__.py` to the `test_data` folder in the integration/script when opening in Virtual Environment or in Dev Container.

# [0.5.11] (2023-04-24)

- Added the content path to `PYTHONPATH` inside the `.env` file.
- Will not copy the `.env` file to the integration/script folder when opening in Virtual Environment.

# [0.5.10] (2023-03-25)

- Drop support for installation of `'docker', 'pipx', 'shellcheck'` in **Install XSOAR local development environment**.
- Selecting `python` in **Install XSOAR local development environment** will install the latest version of `python3` and the latest version of `python2` using `pyenv`.
- Selecting `poetry` in **Install XSOAR local development environment** will install the latest version of `poetry` using the official installation script.
- Demisto-SDK commands will now run from the `poetry` environment, if available.
- Demisto-SDK commands will now run from the `content` path, if available.
- Added options to **Install/Update Demisto-SDK**, to install using poetry or pip.

# [0.5.9] (2023-01-25)

- Fixed an issue where Dev Container fails to open in arm64 architecture.
- Renamed `Configure Demisto-SDK for XSOAR` to `Configure XSOAR connection`.
- Fixed an issue in **Open integration/script in virtual environment** and in **Open integration/script in Dev Container** for `CommonServerPython` integration.

# [0.5.8] (2022-11-22)

- Fixed an issue where Python Language Server crashes on virtual environment.
- Added XSOAR_LINTER to linters.

# [0.5.7] (2022-11-17)

- Fixed an issue where `mypy` fails to show issues.
- Added `Python Test Explorer` extension to Dev Container.
- Changed pytest settings to `verbose` mode.
- Maintenance and bug fixes.

# [0.5.6] (2022-10-30)

- Fixed broken installation of local development environment with python and poetry.
- Fixed installation of virtual environment of broken `types` packages.

# [0.5.5] (2022-09-15)

- When opening integrations or scripts with **Open integration/script in Virtual Environment** or **Open integration/script in Dev Container** the extension will open the `Pack` workspace.
- Fixed an issue with importing `DemistoClassApiModule` when debugging integration or scripts.
- Moved Dev Container settings to `.vscode/settings.json`.
- Fixed `Homebrew` path in Linux in **Install XSOAR local development environment**.

# [0.5.4] (2022-09-07)

- Hotfix for **Install XSOAR local development environment**.

# [0.5.3] (2022-09-07)

- Fixed installation of `poetry install` in M1 MacOS.

# [0.5.2] (2022-09-06)

- Add `bandit` to **Open integration/script in Virtual Environment**.
- Fixed `pyenv` detection in **Open integration/script in Virtual Environment**.
- Fixed an issue with opening workspaces in `WSL`.

# [0.5.1] (2022-09-04)
  
- Fixed installation of `pyenv` in **Install XSOAR local development environment**.
- Added Demisto-SDK settings in **Develop and Debug Demisto-SDK**.

# [0.5.0] (2022-08-31)

- Removing cache and python compiled files when using **Open integration/script in Virtual Environment**.
- Added command **Develop and Debug Demisto-SDK** to open a multi-root workspace with Content and Demisto-SDK repo that is ready for developing.
- **Open integration/script in Virtual Environment** will open a multi-root workspace with Content and the integration/script.
- Add **Demisto-SDK init** command.

# [0.4.10] (2022-08-24)

- Fixed an issue in **Install XSOAR local development environment** where dependency installation fails even though installation succeeded.
- Install `virtualenv` module in **Open integration/script in virtual environment** if the module is not installed.
- Installing **Demisto-SDK** globally will update it.

# [0.4.9] (2022-08-23)

- Added installation and configuration of `pyenv` in **Install XSOAR local development environment**.
- Fixed an issue where `python2` from `pyenv` was not recognized in **Open integration/script in virtual environment**.
- Improve performance of **Open integration/script in virtual environment** by installing packages with `--no-cache-dir` flag.
- Removing cache and python compiled files when using **Open integration/script in Dev Container**.

# [0.4.8] (2022-08-17)

- Fixed the APIModules in PYTHONPATH when running **Install XSOAR local development environment**.
- Do not fail when installation of`flake8`, `autopep8`, or `mypy` fails when opening in virtual environment or Dev Container.
- Validate that **Install XSOAR local development environment** runs in a `content` workspace.
- Add support for enabling pre-commit hooks in **Install XSOAR local development environment**.
- Ask the user if execute the **Configure Demisto-SDK for XSOAR** command in **Install XSOAR local development environment**.

# [0.4.7] (2022-08-15)

- Fixed installation of docker in **Install XSOAR local development environment**.

# [0.4.6] (2022-08-11)

- Fixed an issue with flake8.
- Fixed Git issues in Dev Containers.
- Added more extensions to Dev Containers.

# [0.4.5] (2022-08-11)

- Fixed an issue with opening a Virtual Environnement in a development image.

# [0.4.4] (2022-08-10)

- Fixed an issue with opening a Dev Container in a development image.
- Fixed an issue with Git installation in Dev Container.
- If **demisto-sdk lint** fails when opening a Dev Container or Virtual Environment, show error message and not proceed.

# [0.4.3] (2022-08-05)

- Fixed issues with M1 Macs.
- Added gcc as dependency to install.
- Added validation if no dependencies were selected in the selection box.
- Added git to integration dev containers.
- Removing `vscode/settings.json` from integration folder when creating dev container because of conflicts with virtual environment feature.
- Removed Demisto-SDK lint with no tests.
- Fixed Demisto-SDK upload to take the file instead of the folder

# [0.4.2] (2022-08-01)

- Added default python interpreter path setting in content environment.
- Fix message when `brew` is not installed when installing dependencies.
- Change user to `QuickPick` instead of `InformationMessage`.

# [0.4.1] (2022-07-25)

- Fixed an issue of missing commands in context view.

# [0.4.0] (2022-07-25)

- Added the command **Install XSOAR local development environment**.
- Added the command **Configure Demisto-SDK for XSOAR**
- Added `isInstalledDemistoSDK` to check if **demisto-sdk** is installed. If it's not installed, ask the user to install it.
- Added an option to install **demisto-sdk** globally with `pipx`.

# [0.3.8] (2022-07-20)

- Fixed opening `Powershell` Dev Container.
- Added VSCode `launch` configuration for `Powershell`.
- Added to `launch` configuration the integration/script file to run.

# [0.3.7] (2022-07-14)

- Hotfix for integration Dev Containers.

# [0.3.6] (2022-07-13)

- Fixed format to use the current file as input, not the current folder
- Fixed activating python environment when using system interpreter.

# [0.3.5] (2022-07-11)

- Fixed installation of `mypy` in python3 Dev Containers.
- Added `flake8` and `mypy` settings in virtual environment.
- Fixed handling `pip` conflicts when installing virtual environment.
- Added installation of `autopep8` to the virtual environment and containers.

# [0.3.4] (2022-07-11)

- Fixed finding the docker test image when same test images are available locally.
- Using the VSCode selected python interpreter when creating a Dev Container or a Virtual Environment.

## [0.3.3] (2022-07-05)

- Disabled auto-save configuration in dev containers.
- Enable pytest in the command `Configure XSOAR unit tests` and in `Open integration/script in virtual environment`
  
## [0.3.2] (2022-07-03)

- Hotfix to add test settings when creating a virtual environment.

## [0.3.1] (2022-07-03)

- Hotfix for integration Dev Containers.

## [0.3.0] (2022-07-03)

- Added an option to create a virtualenv for integrations or scripts.
- Integration Dev Container now use the test image,
- Fixed an issue on which the updated docker image in YML wasn't updated in the devcontainer.
- Opens integration environment in new windos (virtualenv or Dev Container)
- Added option to `Configure XSOAR Tests` for integrations or scripts.
- Deleted content dev container since it's available on `content` repo.
- Setting **xsoar.linter.lint.enable** default to ***false*** because of lint performance issues.

## [0.2.0] (2022-05-09)

- The **xsoar.autoFindProblems.readProblems** setting defaults to ***false*** which prevents the log file from appearing in each workspace opened.
- The **xsoar.demisto-sdk.pythonPath** is now deprecated.  
    Please use the **xsoar.demisto-sdk.Path** setting. The default behavior is to run all commands with `demisto-sdk <command>`. You may set the demisto-sdk executable with the given setting and use tools such as pipx.  
    Alternatively, you may also use it with your python executable of choice (`<python-path> -m demisto_sdk` as an example.)
- Added the **Run a Command in XSOAR** command.
- Removed the support of the **maintenance** option from the *Update Release Notes* command.
- Fixed running demisto-sdk commands in menus from directories to run in the correct directory.
- Added an option to run lint with tests in menu.
- Added an option to run content and integrations/scripts in a development container with right-click and pick *Open content in Dev Container* or *Open integration/script in Dev Container*.

## [0.1.0] (2021-11-09)

- The Cortex XSOAR extension for Visual Studio Code is now official GA!

## [0.0.7] (2021-10-05)

- **Hotfix**: Fixed an issue which caused the extension to fail on all commands (on version 0.0.6).

## [0.0.6] (2021-09-29)

- **Hotfix**: Fixed an issue which caused the extension to fail.

## [0.0.5] (2021-09-29)

- Fixed an issue where the right-click menu was not available on Windows systems.

## [0.0.4] (2021-07-20)

- Added the `xsoar.autoFindProblems.readProblems` setting that can enable/disable automatic-problem reading in workspace.
- Added the command `XSOAR: Read Problems` that reads the demisto-sdk report file positioned in the `xsoar.autoFindProblems.reportPath` setting.
- Added the demisto-sdk commands dropdown when right-clicking an opened file in `Packs/*` directory.
- Limited the demisto-sdk commands dropdown when right-clicking a file in workspace to work only with file in `Packs/*` directory.  
![right click](documentation/changelog/0.0.4/rightclick.png)

## [0.0.3] (2021-07-13)

- Added a side menu to easily run demisto-sdk command from the explorer  
![side bar](documentation/changelog/0.0.3/sidebar.png)
- renamed all demisto-sdk command names to include Demisto-SDK as the prefix (XSOAR: Lint -> XSOAR: Demisto-SDK Lint)

## [0.0.2] (2021-07-12)

- Added a new output window, "Cortex XSOAR" for extension logs and other outputs.
- Added the `xsoar.demisto-sdk.pythonPath` setting to point to where the python environment with [demisto-sdk](https://github.com/demisto/demisto-sdk) is located.
- Added basic light-theme.

## [0.0.1] (2021-07-11)

- Initial release
