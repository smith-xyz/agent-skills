import { existsSync, readdirSync } from "fs";
import { join } from "path";
import * as vscode from "vscode";
import { createLink, dismissUnlinked, updateSuggestionStatus } from "./db-reader";
import type { DbWatcher } from "./db-watcher";
import type { HostMessage, WebViewMessage } from "./types";
import { getWebviewHtml } from "./webview-html";

type LogFn = (msg: string) => void;

export class ArtifactPanel {
  public static currentPanel: ArtifactPanel | undefined;
  private static readonly viewType = "artifact-viewer.panel";

  private pendingMessages: HostMessage[] = [];
  private ready = false;

  private constructor(
    private readonly panel: vscode.WebviewPanel,
    private readonly extensionUri: vscode.Uri,
    private readonly workspaceRoot: string,
    private readonly dbPath: string,
    private readonly dbWatcher: DbWatcher,
    private readonly log: LogFn
  ) {
    this.panel.onDidDispose(() => this.dispose());
    this.panel.webview.onDidReceiveMessage((msg: WebViewMessage & { type: string }) => {
      if (msg.type === "ready") {
        this.log("Panel: WebView ready");
        this.ready = true;
        this.flushPending();
        this.dbWatcher.refresh();
        return;
      }
      this.log(`Panel: message '${msg.type}'`);
      this.handleMessage(msg).catch((err) => {
        this.log(`Panel: handleMessage error: ${err}`);
      });
    });

    this.setHtml();
  }

  static createOrShow(
    context: vscode.ExtensionContext,
    workspaceRoot: string,
    dbPath: string,
    dbWatcher: DbWatcher,
    log: LogFn
  ): void {
    if (ArtifactPanel.currentPanel) {
      ArtifactPanel.currentPanel.panel.reveal(vscode.ViewColumn.One);
      log("Panel: revealed existing");
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      ArtifactPanel.viewType,
      "Artifacts",
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, "dist", "webview")],
      }
    );

    ArtifactPanel.currentPanel = new ArtifactPanel(panel, context.extensionUri, workspaceRoot, dbPath, dbWatcher, log);
    log("Panel: created");
  }

  postMessages(messages: HostMessage[]): void {
    if (!this.ready) {
      this.pendingMessages.push(...messages);
      return;
    }
    for (const message of messages) {
      void this.panel.webview.postMessage(message);
    }
  }

  private setHtml(): void {
    try {
      this.panel.webview.html = getWebviewHtml(this.panel.webview, this.extensionUri);
      this.log("Panel: HTML set");
    } catch (err) {
      this.log(`Panel: ERROR setting HTML: ${err}`);
    }
  }

  private flushPending(): void {
    if (this.pendingMessages.length === 0) return;
    this.log(`Panel: flushing ${this.pendingMessages.length} pending messages`);
    const messages = this.pendingMessages;
    this.pendingMessages = [];
    this.postMessages(messages);
  }

  private async handleMessage(message: WebViewMessage): Promise<void> {
    switch (message.type) {
      case "open-file":
        await this.openFile(message.path);
        break;
      case "dismiss-suggestion":
        await updateSuggestionStatus(this.dbPath, message.id, "dismissed", this.log);
        this.dbWatcher.refresh();
        break;
      case "accept-suggestion":
        await updateSuggestionStatus(this.dbPath, message.id, "accepted", this.log);
        await this.openSchemaFile();
        this.dbWatcher.refresh();
        break;
      case "link-artifact":
        await createLink(this.dbPath, message.artifactId, message.jiraItemId, "tracks", this.log);
        this.dbWatcher.refresh();
        break;
      case "create-jira-issue":
        void vscode.window.showInformationMessage(
          `Create Jira issue for "${message.artifactId}" in ${message.domain} — use Atlassian MCP in chat`
        );
        break;
      case "dismiss-unlinked":
        await dismissUnlinked(this.dbPath, message.artifactId, this.log);
        this.dbWatcher.refresh();
        break;
      case "open-url":
        void vscode.env.openExternal(vscode.Uri.parse(message.url));
        break;
    }
  }

  private async openFile(filePath: string): Promise<void> {
    const absolutePath = join(this.workspaceRoot, filePath);
    if (!existsSync(absolutePath)) {
      this.log(`Panel: file not found: ${absolutePath}`);
      return;
    }
    const document = await vscode.workspace.openTextDocument(absolutePath);
    await vscode.window.showTextDocument(document, { preview: false });
  }

  private async openSchemaFile(): Promise<void> {
    const candidates = [
      join(this.workspaceRoot, ".cursor", "schemas", "envelope.yaml"),
      join(this.workspaceRoot, ".cursor", "schemas", "README.md"),
    ];

    const kindsDir = join(this.workspaceRoot, ".cursor", "schemas", "kinds");
    if (existsSync(kindsDir)) {
      const kindFiles = readdirSync(kindsDir).filter(
        (f) => f.endsWith(".yaml") || f.endsWith(".yml")
      );
      if (kindFiles[0]) candidates.unshift(join(kindsDir, kindFiles[0]));
    }

    const domainsDir = join(this.workspaceRoot, ".cursor", "schemas", "domains");
    if (existsSync(domainsDir)) {
      const domainFiles = readdirSync(domainsDir).filter(
        (f) => f.endsWith(".yaml") || f.endsWith(".yml")
      );
      if (domainFiles[0]) candidates.unshift(join(domainsDir, domainFiles[0]));
    }

    const target = candidates.find((c) => existsSync(c));
    if (!target) {
      void vscode.window.showWarningMessage("No schema files found under .cursor/schemas/");
      return;
    }

    const document = await vscode.workspace.openTextDocument(target);
    await vscode.window.showTextDocument(document, { preview: false });
  }

  private dispose(): void {
    this.log("Panel: disposed");
    ArtifactPanel.currentPanel = undefined;
  }
}
