/**
 * Format on Edit Extension
 *
 * Auto-formats files after edit/write tool calls, by language:
 *   *.go  → gofmt
 *   *.rs  → rustfmt
 *   *.py  → ruff format
 *   *.ts, *.tsx, *.js, *.jsx → prettier
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  pi.on("tool_result", async (event, _ctx) => {
    if (event.toolName !== "edit" && event.toolName !== "write") return;

    const filepath: string | undefined = (event.input as any).path;
    if (!filepath) return;

    const ext = filepath.split(".").pop() ?? "";

    switch (ext) {
      case "go":
        await pi.exec("gofmt", ["-w", filepath]).catch(() => {});
        break;
      case "rs":
        await pi.exec("rustfmt", [filepath]).catch(() => {});
        break;
      case "py":
        await pi.exec("ruff", ["format", filepath]).catch(() => {});
        break;
      case "ts":
      case "tsx":
      case "js":
      case "jsx":
        await pi.exec("prettier", ["--write", filepath]).catch(() => {});
        break;
    }
  });
}
