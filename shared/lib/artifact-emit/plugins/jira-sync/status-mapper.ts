export type ArtifactStatus = "done" | "active" | "waiting" | "needs-me" | "stale";

export function mapStatus(jiraStatus: string, statusCategory: string): ArtifactStatus {
  const name = jiraStatus.toLowerCase();
  if (name === "blocked" || name === "to do") return "waiting";
  if (name === "in progress") return "active";
  if (name === "done") return "done";

  if (statusCategory === "done") return "done";
  if (statusCategory === "indeterminate") return "active";
  if (statusCategory === "new") return "waiting";
  return "active";
}
