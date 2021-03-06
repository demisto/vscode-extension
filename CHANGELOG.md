# Change Log

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
