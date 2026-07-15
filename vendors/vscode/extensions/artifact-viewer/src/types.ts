export interface ArtifactRow {
  id: string;
  kind: string;
  title: string;
  domain: string;
  source: string;
  url?: string;
  related?: string[];
  diagram_ref?: string;
  node?: string;
  next?: string;
  blocked?: string;
  status: "done" | "active" | "waiting" | "needs-me" | "stale";
  last_action?: string;
  last_action_at?: string;
  updated: string;
  created: string;
}

export interface SuggestionRow {
  id: number;
  text: string;
  source_skill?: string;
  session_id?: string;
  status: string;
  created_at: string;
}

export interface LinkRow {
  from_id: string;
  to_id: string;
  rel: string;
  created_at: string;
}

export interface DomainConfig {
  domain: string;
  initiative?: string;
  jira_linked?: boolean;
  jira_project?: string;
  jira_projects?: string[];
  topology?: {
    nodes: { id: string; label: string; type?: string }[];
    edges: { from: string; to: string }[];
  };
  gates?: { name: string; applies_when?: string }[];
  stakeholders?: string[];
  delivers_to?: string[];
}

export interface EventRow {
  id: number;
  artifact_id: string;
  action: string;
  changed_fields?: string;
  timestamp: string;
}

export type PrSource = "github" | "gitlab";
export type PrState =
  | "open"
  | "draft"
  | "review-requested"
  | "approved"
  | "merged"
  | "closed";
export type CiStatus = "passing" | "failing" | "pending" | null;

export interface OpenPrRow {
  id: string;
  source: PrSource;
  repo: string;
  number: number;
  title: string;
  url: string;
  state: PrState;
  author?: string;
  created_at?: string;
  updated_at?: string;
  labels?: string[];
  reviewers?: string[];
  ci_status?: CiStatus;
}

export type HostMessage =
  | { type: "artifacts"; data: ArtifactRow[] }
  | { type: "suggestions"; data: SuggestionRow[] }
  | { type: "domains"; data: DomainConfig[] }
  | { type: "links"; data: LinkRow[] }
  | { type: "open-prs"; data: OpenPrRow[] }
  | { type: "event"; data: EventRow };

export type WebViewMessage =
  | { type: "open-file"; path: string }
  | { type: "dismiss-suggestion"; id: number }
  | { type: "accept-suggestion"; id: number }
  | { type: "link-artifact"; artifactId: string; jiraItemId: string }
  | { type: "create-jira-issue"; artifactId: string; domain: string }
  | { type: "dismiss-unlinked"; artifactId: string }
  | { type: "open-url"; url: string };
