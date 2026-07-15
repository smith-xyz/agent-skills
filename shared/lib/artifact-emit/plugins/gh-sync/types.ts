export type PrSource = "github" | "gitlab";

export type PrState =
  | "open"
  | "draft"
  | "review-requested"
  | "approved"
  | "merged"
  | "closed";

export type CiStatus = "passing" | "failing" | "pending" | null;

export interface OpenPrRecord {
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
