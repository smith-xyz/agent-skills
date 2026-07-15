export type FieldType = "string" | "integer" | "float" | "datetime" | "enum" | "array";

export interface FieldDef {
  type: FieldType;
  required?: boolean;
  max?: number;
  values?: string[];
  items?: FieldType;
  description?: string;
}

export interface Schema {
  kind: string;
  version: number;
  description?: string;
  fields: Record<string, FieldDef>;
}

export type ArtifactStatus = "done" | "active" | "waiting" | "needs-me" | "stale";

export interface Envelope {
  id: string;
  kind: string;
  title: string;
  domain: string;
  source: string;
  url?: string | null;
  related?: string[] | null;
  diagram_ref?: string | null;
  node?: string | null;
  next?: string | null;
  blocked?: string | null;
  status: ArtifactStatus;
  last_action?: string | null;
  last_action_at?: string | null;
  updated: string;
  created: string;
}

export type LinkRel = "feeds-into" | "depends-on" | "tracks" | "dupes";

export const LINK_RELS: LinkRel[] = ["feeds-into", "depends-on", "tracks", "dupes"];

export interface ValidationError {
  field: string;
  message: string;
}

export interface DomainConfig {
  domain: string;
  initiative: string;
  topology?: {
    nodes: Array<{ id: string; label: string; type?: string }>;
    edges: Array<{ from: string; to: string }>;
  };
  gates?: Array<{ name: string; applies_when: string }>;
  stakeholders?: string[];
  delivers_to?: string[];
}

export interface EmitResult {
  id: string;
  action: "created" | "updated";
}

export interface SuggestionResult {
  id: number;
}

export interface LinkResult {
  from: string;
  to: string;
  rel: LinkRel;
}

export interface InitDbResult {
  db: string;
  tables: string[];
}

export interface ValidateDomainsResult {
  valid: number;
  errors: Array<{ file: string; message: string }>;
}
