# Change Log

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
