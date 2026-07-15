import { useMemo } from "react";
import type { CiStatus, OpenPrRow, PrSource, PrState, WebViewMessage } from "../../types/artifact";
import { relativeTime } from "../../utils/time";

interface MyPrsViewProps {
  openPrs: OpenPrRow[];
  sendMessage: (msg: WebViewMessage) => void;
}

interface StatusStyle {
  dot: string;
  label: string;
  badge: string;
}

const STATE_PRIORITY: Record<PrState, number> = {
  approved: 0,
  open: 1,
  "review-requested": 2,
  draft: 3,
  merged: 4,
  closed: 5,
};

const PR_STATE_STYLES: Partial<Record<PrState, StatusStyle>> = {
  approved: {
    dot: "bg-green-500",
    label: "approved",
    badge: "text-green-400 border-green-500/40",
  },
  open: {
    dot: "bg-blue-500",
    label: "open",
    badge: "text-blue-400 border-blue-500/40",
  },
  "review-requested": {
    dot: "bg-amber-500",
    label: "review",
    badge: "text-amber-400 border-amber-500/40",
  },
  draft: {
    dot: "bg-gray-400",
    label: "draft",
    badge: "text-gray-400 border-gray-500/40",
  },
};

const CI_DOT: Record<string, string> = {
  passing: "bg-green-500",
  failing: "bg-red-500",
  pending: "bg-amber-500",
};

function getPrStateStyle(state: PrState): StatusStyle {
  return (
    PR_STATE_STYLES[state] ?? {
      dot: "bg-gray-400",
      label: state,
      badge: "text-gray-400 border-gray-500/40",
    }
  );
}

function getCiDot(status: CiStatus | undefined): string {
  if (!status) return "bg-gray-400";
  return CI_DOT[status] ?? "bg-gray-400";
}

function sortPrs(prs: OpenPrRow[]): OpenPrRow[] {
  return [...prs].sort((a, b) => {
    const stateDiff = STATE_PRIORITY[a.state] - STATE_PRIORITY[b.state];
    if (stateDiff !== 0) return stateDiff;
    const aTime = a.updated_at ? new Date(a.updated_at).getTime() : 0;
    const bTime = b.updated_at ? new Date(b.updated_at).getTime() : 0;
    return bTime - aTime;
  });
}

function groupByRepo(prs: OpenPrRow[]): Map<string, OpenPrRow[]> {
  const groups = new Map<string, OpenPrRow[]>();
  for (const pr of prs) {
    const existing = groups.get(pr.repo) ?? [];
    existing.push(pr);
    groups.set(pr.repo, existing);
  }
  return groups;
}

function SourceBadge({ source }: { source: PrSource }) {
  const isGitHub = source === "github";
  return (
    <span
      className={`av-badge shrink-0 ${
        isGitHub
          ? "bg-[var(--vscode-badge-background)] text-[var(--vscode-badge-foreground)]"
          : "border border-border text-muted"
      }`}
    >
      {isGitHub ? "GH" : "GL"}
    </span>
  );
}

function PrRow({
  pr,
  sendMessage,
}: {
  pr: OpenPrRow;
  sendMessage: (msg: WebViewMessage) => void;
}) {
  const stateStyle = getPrStateStyle(pr.state);

  return (
    <button
      type="button"
      className="w-full text-left px-4 py-2.5 flex items-center gap-2.5 hover:bg-[var(--vscode-list-hoverBackground)] border-t border-border"
      onClick={() => sendMessage({ type: "open-url", url: pr.url })}
    >
      <span
        className={`h-2 w-2 shrink-0 rounded-full ${getCiDot(pr.ci_status)}`}
        title={pr.ci_status ?? "unknown"}
      />
      <span className={`av-status-badge shrink-0 ${stateStyle.badge}`}>
        {stateStyle.label}
      </span>
      <span className="truncate text-sm text-[var(--vscode-textLink-foreground)] hover:underline">
        #{pr.number} {pr.title}
      </span>
      {pr.reviewers && pr.reviewers.length > 0 && (
        <span className="shrink-0 av-meta truncate max-w-[8rem]">
          {pr.reviewers.join(", ")}
        </span>
      )}
      {pr.updated_at && (
        <span className="ml-auto shrink-0 av-meta">{relativeTime(pr.updated_at)}</span>
      )}
    </button>
  );
}

function RepoGroup({
  repo,
  prs,
  sendMessage,
}: {
  repo: string;
  prs: OpenPrRow[];
  sendMessage: (msg: WebViewMessage) => void;
}) {
  const source = prs[0]?.source ?? "github";

  return (
    <div className="border border-border rounded-md overflow-hidden">
      <div className="px-4 py-2 flex items-center gap-2 bg-[var(--vscode-editor-background)]">
        <SourceBadge source={source} />
        <span className="font-mono text-xs text-foreground">{repo}</span>
        <span className="av-meta ml-auto">{prs.length}</span>
      </div>
      {prs.map((pr) => (
        <PrRow key={pr.id} pr={pr} sendMessage={sendMessage} />
      ))}
    </div>
  );
}

export function MyPrsView({ openPrs, sendMessage }: MyPrsViewProps) {
  const repoGroups = useMemo(() => {
    const grouped = groupByRepo(openPrs);
    const sorted = [...grouped.entries()]
      .map(([repo, prs]) => [repo, sortPrs(prs)] as const)
      .sort(([, aPrs], [, bPrs]) => {
        const aLatest = aPrs[0]?.updated_at ? new Date(aPrs[0].updated_at).getTime() : 0;
        const bLatest = bPrs[0]?.updated_at ? new Date(bPrs[0].updated_at).getTime() : 0;
        return bLatest - aLatest;
      });
    return sorted;
  }, [openPrs]);

  if (openPrs.length === 0) {
    return <p className="av-empty">No open pull requests synced yet.</p>;
  }

  return (
    <div className="av-page">
      <header className="av-header-bar">
        <div className="flex items-center justify-between">
          <h1 className="av-page-title">My PRs</h1>
          <span className="av-meta">
            {openPrs.length} across {repoGroups.length} repo
            {repoGroups.length !== 1 ? "s" : ""}
          </span>
        </div>
      </header>

      <div className="flex flex-col gap-2">
        {repoGroups.map(([repo, prs]) => (
          <RepoGroup key={repo} repo={repo} prs={prs} sendMessage={sendMessage} />
        ))}
      </div>
    </div>
  );
}
