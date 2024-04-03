import { Logger } from "./logger";
import vscode from "vscode";
import path from "path";
import JSON5 from "json5";
import * as dsdk from "./demistoSDKWrapper";
import * as fs from "fs-extra";
import { spawn } from "child_process";
import { parse, stringify } from "envfile";
import { getContentPath } from "./tools";

enum Platform {
  XSOAR6 = 'XSOAR 6',
  XSOAR8_XSIAM = 'XSOAR 8/XSIAM'
}

export async function installDevEnv(): Promise<void> {
  const workspaces = vscode.workspace.workspaceFolders;
  if (!workspaces) {
    vscode.window.showErrorMessage("Could not find a valid workspace");
    return;
  }
  const dirPath = getContentPath()
  if (!dirPath) {
    vscode.window.showErrorMessage(
      "Please run this command from a content repository"
    );
    return;
  }

  await vscode.window
    .showQuickPick(["python", "poetry"], {
      title: "Select dependencies to install",
      placeHolder: "Leave blank to skip dependencies installation",
      canPickMany: true,
    })
    .then(async (dependencies) => {
      if (dependencies) {
        await installGlobalDependencies(dependencies);
      }
    });

  // install recommended extensions
  // To install recommended extensions, we need to show them first
  await vscode.commands.executeCommand(
    "workbench.extensions.action.showRecommendedExtensions"
  );
  // sleep for 3 seconds to let the windows load
  await new Promise((resolve) => setTimeout(resolve, 3000));
  vscode.commands.executeCommand(
    "workbench.extensions.action.installWorkspaceRecommendedExtensions",
    true
  );

  let shouldPreCommit = false;
  await vscode.window
    .showQuickPick(["Yes", "No"], {
      title: "Do you want to install pre-commit hooks?",
      placeHolder:
        "Installing pre-commit hooks will run `validate` and `lint` before every commit",
    })
    .then(async (answer) => {
      if (answer === "Yes") {
        shouldPreCommit = true;
      }
    });

  // bootstrap content (run bootstrap script)
  await bootstrapContent(dirPath, shouldPreCommit);
  // copy settings file
  dsdk.setupEnv()
  // set up environment variables
  fs.createFileSync(
    path.join(
      dirPath,
      "Packs/Base/Scripts/CommonServerPython/CommonServerUserPython.py"
    )
  );
  await vscode.window
    .showQuickPick(["Yes", "No"], {
      title: "Would you like to configure the connection to XSOAR?",
      placeHolder:
        "This will ask you to configure the connection XSOAR, allowing Demisto-SDK commands such as upload and download",
    })
    .then(async (answer) => {
      if (answer === "Yes") {
        configureDemistoVars();
      }
    });
}

function installGlobalDependencies(dependencies: string[]) {
  Logger.info("Install global dependencies");
  const task = new vscode.Task(
    { type: "dependencies", name: "Install global dependencies" },
    vscode.TaskScope.Workspace,
    "dependencies",
    "dependencies",
    new vscode.ShellExecution(
      `bash -x ${path.resolve(
        __dirname,
        "../Scripts/setup_dependencies.sh"
      )} "${dependencies.join(" ")}"`
    )
  );
  return new Promise<void>((resolve) => {
    vscode.window.withProgress(
      {
        title: `Bootstrap content`,
        location: vscode.ProgressLocation.Notification,
      },
      async (progress) => {
        progress.report({ message: `Installing global dependencies` });
        const execution = await vscode.tasks.executeTask(task);
        const disposable = vscode.tasks.onDidEndTaskProcess((e) => {
          if (e.execution === execution) {
            if (e.exitCode === 0) {
              disposable.dispose();
              resolve();
            } else {
              vscode.window.showWarningMessage(
                "Could not installing global dependencies"
              );
            }
          }
        });
        progress.report({ message: "Processing..." });
      }
    );
  });
}

async function getDemistoSDKPath(
  contentPath: string
): Promise<string | undefined> {
  const demistoSDKParentPath = path.resolve(path.join(contentPath, ".."));
  let demistoSDKPathString = path.resolve(demistoSDKParentPath, "demisto-sdk");
  if (!(await fs.pathExists(demistoSDKPathString))) {
    Logger.info(`demisto-sdk not found in ${demistoSDKPathString}`);
    const answer = await vscode.window.showQuickPick(
      ["Select Demisto-SDK path", "Clone repository"],
      {
        placeHolder:
          "Do you want to use an existing repository or clone a new one?",
        title: "Select Demisto-SDK repository path",
      }
    );
    if (answer === "Clone repository") {
      // If the user doesn't close the VSCode window, it will not proceed to the next step
      vscode.window.showInformationMessage(
        "After cloning, close VSCode message to proceed.",
        { modal: true }
      );
      await vscode.commands.executeCommand(
        "git.clone",
        "git@github.com:demisto/demisto-sdk.git",
        demistoSDKParentPath
      );
    }
    if (answer === "Select Demisto-SDK path") {
      const demistoSDKPath = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        openLabel: "Select demisto-sdk repository",
        title: "Select demisto-sdk repository",
      });
      if (!demistoSDKPath) {
        return;
      }
      demistoSDKPathString = demistoSDKPath[0].fsPath;
    }
  }
  return demistoSDKPathString;
}

export async function developDemistoSDK(): Promise<void> {
  const contentPath = getContentPath();
  if (!contentPath) {
    vscode.window.showErrorMessage(
      "Please run this command from a content repository"
    );
    return;
  }
  const demistoSDKPathString = await getDemistoSDKPath(contentPath);
  if (!demistoSDKPathString) {
    vscode.window.showErrorMessage(
      "Please select a valid demisto-sdk repository"
    );
    return;
  }
  const vsCodePath = path.join(contentPath, ".vscode");

  vscode.window.showInformationMessage(
    `Using Demisto-SDK path: ${demistoSDKPathString}`
  );
  Logger.info(`demisto sdk path is ${demistoSDKPathString}`);
  const launchDemistoSDK = JSON5.parse(
    fs.readFileSync(
      path.resolve(__dirname, "../Templates/launch-demisto-sdk.json"),
      "utf-8"
    )
  );
  launchDemistoSDK.configurations[0].cwd = contentPath;
  fs.writeJSONSync(
    path.join(demistoSDKPathString, ".vscode", "launch.json"),
    launchDemistoSDK,
    { spaces: 4 }
  );
  fs.copyFileSync(
    path.resolve(__dirname, "../Templates/demisto_sdk_settings.json"),
    path.join(demistoSDKPathString, ".vscode", "settings.json")
  );
  const workspace = {
    folders: [{ path: contentPath }, { path: demistoSDKPathString }],
    settings: {},
  };
  const workspaceOutput = path.join(
    vsCodePath,
    `demisto-sdk_content.code-workspace`
  );
  fs.writeJsonSync(workspaceOutput, workspace, { spaces: 2 });
  const response = await vscode.window.showQuickPick(
    ["Existing Window", "New Window"],
    {
      placeHolder:
        "Select if you want to open in existing window or new window",
      title: "Where would you like to open the environment?",
    }
  );
  const openInNewWindow = response === "New Window";
  const installDemistoSDK = await vscode.window.showQuickPick(["Yes", "No"], {
    title: "Do you want to install Demisto-SDK dependencies?",
    placeHolder: " Will run poetry install in the demisto-sdk repository",
  });
  if (installDemistoSDK === "Yes") {
    spawn(`cd ${demistoSDKPathString} && poetry install`);
  }
  vscode.commands.executeCommand(
    "vscode.openFolder",
    vscode.Uri.file(workspaceOutput),
    openInNewWindow
  );
}

export async function configureDemistoVars(): Promise<void> {
  const workspaces = vscode.workspace.workspaceFolders;

  if (!workspaces) {
    vscode.window.showErrorMessage("Could not find a valid workspace");
    return;
  }
  const workspace = workspaces[0];
  const dirPath = workspace.uri.fsPath;
  const envFilePath = path.join(dirPath, ".env");
  if (!(await fs.pathExists(envFilePath))) {
    fs.createFileSync(envFilePath);
  }
  vscode.window.showInformationMessage(
    `Setting up environment in .env file in ${envFilePath}`
  );
  let env = parse(fs.readFileSync(envFilePath, "utf8"));
  if (!env) {
    env = {};
  }
  
  // Select configured platform
  const configuredPlatform = await vscode.window
    .showQuickPick([Platform.XSOAR6, Platform.XSOAR8_XSIAM], {
      title: "Platform",
      placeHolder: "Select configured platform",
    }) ?? Platform.XSOAR6;    

  // XSOAR url  
  await vscode.window
    .showInputBox({
      title: "XSOAR URL",
      value: "http://localhost:8080",
      ignoreFocusOut: true,
    })
    .then((url) => {
      if (url) {
        env["DEMISTO_BASE_URL"] = url;
      }
    });
  vscode.window.showInformationMessage(
    "Enter either XSOAR username and password, or an API key"
  );

  // XSOAR username
  await vscode.window
    .showInputBox({
      title: "XSOAR username (optional)",
      value: "admin",
      ignoreFocusOut: true,
    })
    .then((username) => {
      if (username) {
        env["DEMISTO_USERNAME"] = username;
      }
    });

  // XSOAR password  
  await vscode.window
    .showInputBox({
      title: "XSOAR password (optional)",
      value: "admin",
      password: true,
      ignoreFocusOut: true,
    })
    .then((password) => {
      if (password) {
        env["DEMISTO_PASSWORD"] = password;
      }
    });

  // XSOAR API Key
  await vscode.window
    .showInputBox({
      title: "XSOAR API key (optional)",
      placeHolder: "Leaving blank will use username and password",
      password: true,
      ignoreFocusOut: true,
    })
    .then((apiKey) => {
      if (apiKey) {
        env["DEMISTO_API_KEY"] = apiKey;
      }
    });
  
  if (configuredPlatform === Platform.XSOAR8_XSIAM){
    // XISAM Auth ID
    await vscode.window
      .showInputBox({
        title: "XSIAM Auth ID",
        ignoreFocusOut: true,
      }).then((authId) => {
        if (authId){
          env["XSIAM_AUTH_ID"] = authId;
        }
      })
  }

  // Verify SSL  
  await vscode.window
    .showQuickPick(["true", "false"], {
      title: "XSOAR SSL verification",
      placeHolder: "Should XSOAR SSL verification be enabled?",
    })
    .then((verifySSL) => {
      if (verifySSL) {
        env["DEMISTO_VERIFY_SSL"] = verifySSL;
      }
    });
  fs.writeFileSync(envFilePath, stringify(env));
}

async function openInDevcontainer(dirPath: string) {

  let fileNameUri = vscode.Uri.file(dirPath);
  // if we are already inside a remote, the URI prefix should be `vscode://`
  if (vscode.env.remoteName === "dev-container") {
    const local_workspace_path = process.env.LOCAL_WORKSPACE_PATH;
    if (!local_workspace_path) {
      return;
    }
    const reltaveFileName = vscode.workspace.asRelativePath(dirPath);
    Logger.debug(`relative pack is ${reltaveFileName}`);
    const localFileName = path
      .join(local_workspace_path, reltaveFileName)
      .replaceAll("\\", "/");
    Logger.debug(`local file path is ${localFileName}`);
    fileNameUri = vscode.Uri.parse(`vscode://${localFileName}`);
  } else if (vscode.env.remoteName === "wsl") {
    fileNameUri = vscode.Uri.parse(`vscode://${dirPath}`);
  }

  if (
    !(await vscode.commands.getCommands()).includes(
      "remote-containers.openFolder"
    )
  ) {
    vscode.window.showErrorMessage(
      "Please install remote-containers extension to use this feature"
    );
  } else {
    // second argument is open in new window
    vscode.commands.executeCommand(
      "remote-containers.openFolder",
      fileNameUri,
      true
    );
  }
}


export async function setupIntegrationEnv(dirPath: string): Promise<void> {
  const contentPath = getContentPath();
  if (!contentPath) {
    vscode.window.showErrorMessage("Please run this from Content repository");
    return;
  }

  Logger.info(`Setting up integration env in ${dirPath}`);
  const filePath = path.parse(dirPath);
  if (!(dirPath.includes("Integrations")) && !(dirPath.includes("Scripts"))) {
    vscode.window.showErrorMessage("Please run this from an integration or script directory");
    return
  }
  const packDir = path.resolve(path.join(dirPath, "..", ".."));
  let newWorkspace;
  let shouldCreateVirtualenv = false;
  let shouldOverwriteVirtualenv = false
  let vsCodePath = path.join(contentPath, ".vscode");
  const virutalEnvPath = path.join(dirPath, "venv", "bin", "python")
  const answer = await vscode.window
    .showQuickPick(
      ["Current workspace, no virtual environment (recommended)", "New workspace, with virtual environment", "Devcontainer (advanced)"],
      {
        title: `Do you want to open a new workspace with a virtual environment, or inside a Devcontainer?`,
        placeHolder: "Virtual environment creation is slow, but provide better IDE autocompletion",
      }
    )
  if (!answer) {
    return
  }
  if (answer === "New workspace, with virtual environment") {
    newWorkspace = true;
    shouldCreateVirtualenv = true
  }
  else {
    newWorkspace = false;
  }

  if (newWorkspace && await fs.pathExists(virutalEnvPath)) {
    Logger.info("Virtualenv exists.");
    vsCodePath = path.join(packDir, ".vscode");
    await vscode.window
      .showQuickPick(
        ["Open existing virtual environment", "Create new virtual environment"],
        {
          title: `Found virtual environment in ${filePath.name}`,
          placeHolder: "Creating virtual environment can take few minutes",
        }
      )
      .then(async (answer) => {
        if (answer === "Create new virtual environment") {
          //remove venv dir
          await fs.remove(path.join(dirPath, "venv"));
          shouldOverwriteVirtualenv = true;
        } else {
          shouldOverwriteVirtualenv = false;
        }
      });
  }

  if (shouldCreateVirtualenv) {
    vscode.window.showInformationMessage(
      "Creating virtual environment. Might take a few minutes."
    );
  }
  // check if GCP is set
  let secretId: string | undefined;
  let instanceName: string | undefined;

  if (process.env.DEMISTO_SDK_GCP_PROJECT_ID) {
    secretId = await vscode.window.showInputBox({ title: "Do you want to fetch a custom secret from GCP?", placeHolder: "Enter secret name, leave blank to skip" })
    instanceName = await vscode.window.showInputBox({ title: "Create an instance on XSOAR/XSIAM", placeHolder: "Enter the instance name. Leave blank to skip" })
  }
  await dsdk.setupEnv(dirPath, shouldCreateVirtualenv, shouldOverwriteVirtualenv, secretId, instanceName);
  if (answer === "Devcontainer (advanced)") {
    await openInDevcontainer(dirPath);
    return
  }
  if (newWorkspace) {
    const workspace = {
      folders: [{ path: contentPath }, { path: packDir }],
      settings: {},
    };
    const workspaceOutput = path.join(
      vsCodePath,
      `content-${filePath.name}.code-workspace`
    );
    fs.writeJsonSync(workspaceOutput, workspace, { spaces: 2 });
    const response = await vscode.window.showQuickPick(
      ["Existing Window", "New Window"],
      {
        placeHolder:
          "Select if you want to open in existing window or new window",
        title: "Where would you like to open the environment?",
      }
    );
    const openInNewWindow = response === "New Window";
    vscode.commands.executeCommand(
      "vscode.openFolder",
      vscode.Uri.file(workspaceOutput),
      openInNewWindow
    );
  }
  vscode.window.showInformationMessage(`Done setting up environment for ${filePath.name}!`);
}


async function bootstrapContent(dirPath: string, shouldPreCommit: boolean) {
  Logger.info("Bootstrap content");
  let command = `${dirPath}/.hooks/bootstrap`;
  if (!shouldPreCommit) {
    command = `NO_HOOKS=1 ${command}`;
  }
  command = `export PATH=/opt/homebrew/bin:"$PATH" && ${command}`;
  const task = new vscode.Task(
    { type: "bootstrap", name: "Bootstrap content" },
    vscode.TaskScope.Workspace,
    "bootstrap",
    "bootstrap",
    new vscode.ShellExecution(command)
  );
  return new Promise<void>((resolve) => {
    vscode.window.withProgress(
      {
        title: `Bootstrap content`,
        location: vscode.ProgressLocation.Notification,
      },
      async (progress) => {
        progress.report({ message: `In bootstrap please wait` });
        const execution = await vscode.tasks.executeTask(task);
        const disposable = vscode.tasks.onDidEndTaskProcess((e) => {
          if (e.execution === execution) {
            if (e.exitCode === 0) {
              disposable.dispose();
              resolve();
            } else {
              vscode.window.showErrorMessage("Could not bootstrap content");
              throw new Error("Could not bootstrap content");
            }
          }
        });
        progress.report({ message: "Processing..." });
      }
    );
  });
}

