import type { WebViewMessage } from "./types/artifact";

let api: ReturnType<typeof acquireVsCodeApi> | undefined;

export function getVsCodeApi(): ReturnType<typeof acquireVsCodeApi> | undefined {
  if (!api && typeof acquireVsCodeApi === "function") {
    api = acquireVsCodeApi();
  }
  return api;
}

export function postToHost(message: WebViewMessage): void {
  getVsCodeApi()?.postMessage(message);
}
