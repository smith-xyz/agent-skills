import { existsSync } from "fs";
import { join } from "path";
import * as vscode from "vscode";
import { DbWatcher } from "./db-watcher";
import { ArtifactPanel } from "./webview-provider";

let log: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext): void {
  log = vscode.window.createOutputChannel("Artifact Viewer");
  context.subscriptions.push(log);

  try {
    log.appendLine("Activating Artifact Viewer...");
    log.appendLine(`Extension path: ${context.extensionUri.fsPath}`);

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      log.appendLine("No workspace folder — deactivating.");
      return;
    }

    const workspaceRoot = workspaceFolder.uri.fsPath;
    log.appendLine(`Workspace: ${workspaceRoot}`);

    const dbPath = join(workspaceRoot, ".cursor", "artifacts.db");
    const dbExists = existsSync(dbPath);
    log.appendLine(`DB: ${dbPath} (exists: ${dbExists})`);

    const schemasDir = join(workspaceRoot, ".cursor", "schemas", "domains");
    log.appendLine(`Schemas: ${schemasDir} (exists: ${existsSync(schemasDir)})`);

    const logFn = (msg: string) => log.appendLine(msg);

    const watcher = new DbWatcher(dbPath, schemasDir, (messages) => {
      log.appendLine(`→ Panel: ${messages.length} messages`);
      ArtifactPanel.currentPanel?.postMessages(messages);
    }, logFn);

    context.subscriptions.push(
      vscode.commands.registerCommand("artifact-viewer.open", () => {
        log.appendLine("Command: open");
        ArtifactPanel.createOrShow(context, workspaceRoot, dbPath, watcher, logFn);
      }),
      { dispose: () => watcher.stop() }
    );

    if (dbExists) {
      watcher.start();
    }

    log.appendLine("Ready. Run 'Artifact Viewer: Open' to launch.");
  } catch (err) {
    const msg = err instanceof Error ? err.stack || err.message : String(err);
    log.appendLine(`FATAL activation error: ${msg}`);
  }
}

export function deactivate(): void {
  log?.appendLine("Deactivated.");
}
