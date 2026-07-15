import { useMemo, useState } from "react";
import type {
  ArtifactRow,
  DomainConfig,
  LinkRow,
  WebViewMessage,
} from "../../types/artifact";
import { getStatusStyle } from "../../utils/status";
import { relativeTime } from "../../utils/time";
import { DomainBadge } from "../DomainBadge";

interface MyWorkViewProps {
  artifacts: ArtifactRow[];
  links: LinkRow[];
  domains: DomainConfig[];
  sendMessage: (msg: WebViewMessage) => void;
  onSelect: (artifact: ArtifactRow) => void;
}

interface JiraItemGroup {
  jiraItem: ArtifactRow;
  linkedArtifacts: ArtifactRow[];
}

function isJiraItem(artifact: ArtifactRow): boolean {
  return artifact.kind === "jira-item";
}

function getJiraLinkedDomains(domains: DomainConfig[]): Set<string> {
  return new Set(domains.filter((d) => d.jira_linked).map((d) => d.domain));
}

export function MyWorkView({
  artifacts,
  links,
  domains,
  sendMessage,
  onSelect,
}: MyWorkViewProps) {
  const jiraLinkedDomains = useMemo(() => getJiraLinkedDomains(domains), [domains]);

  const { groups, unlinkedWork, noWorkItems } = useMemo(() => {
    const jiraItems = artifacts.filter(isJiraItem);
    const nonJiraArtifacts = artifacts.filter((a) => !isJiraItem(a));

    const tracksLinks = links.filter((l) => l.rel === "tracks");
    const linkedToJira = new Set(tracksLinks.map((l) => l.from_id));
    const jiraTargets = new Map<string, string[]>();
    for (const link of tracksLinks) {
      const existing = jiraTargets.get(link.to_id) ?? [];
      existing.push(link.from_id);
      jiraTargets.set(link.to_id, existing);
    }

    const groups: JiraItemGroup[] = [];
    const itemsWithWork = new Set<string>();

    for (const jiraItem of jiraItems) {
      const linkedIds = jiraTargets.get(jiraItem.id) ?? [];
      const linkedArtifacts = linkedIds
        .map((id) => nonJiraArtifacts.find((a) => a.id === id))
        .filter((a): a is ArtifactRow => a != null);

      if (linkedArtifacts.length > 0) {
        itemsWithWork.add(jiraItem.id);
      }
      groups.push({ jiraItem, linkedArtifacts });
    }

    groups.sort((a, b) => {
      if (a.linkedArtifacts.length > 0 && b.linkedArtifacts.length === 0) return -1;
      if (a.linkedArtifacts.length === 0 && b.linkedArtifacts.length > 0) return 1;
      return new Date(b.jiraItem.updated).getTime() - new Date(a.jiraItem.updated).getTime();
    });

    const noWorkItems = groups.filter((g) => g.linkedArtifacts.length === 0);
    const withWork = groups.filter((g) => g.linkedArtifacts.length > 0);

    const unlinkedWork = nonJiraArtifacts.filter(
      (a) => jiraLinkedDomains.has(a.domain) && !linkedToJira.has(a.id) && a.status !== "done"
    );

    return { groups: withWork, unlinkedWork, noWorkItems };
  }, [artifacts, links, jiraLinkedDomains]);

  if (groups.length === 0 && unlinkedWork.length === 0 && noWorkItems.length === 0) {
    return <p className="av-empty">No Jira-linked domains configured or no items synced yet.</p>;
  }

  return (
    <div className="av-page">
      <header className="av-header-bar">
        <div className="flex items-center justify-between">
          <h1 className="av-page-title">My Work</h1>
          <span className="av-meta">
            {groups.length} active · {unlinkedWork.length} unlinked
          </span>
        </div>
      </header>

      <div className="flex flex-col gap-1">
        {groups.map(({ jiraItem, linkedArtifacts }) => (
          <JiraItemCard
            key={jiraItem.id}
            jiraItem={jiraItem}
            linkedArtifacts={linkedArtifacts}
            onSelect={onSelect}
            sendMessage={sendMessage}
          />
        ))}

        {unlinkedWork.length > 0 && (
          <UnlinkedSection
            artifacts={unlinkedWork}
            jiraItems={groups.map((g) => g.jiraItem).concat(noWorkItems.map((g) => g.jiraItem))}
            sendMessage={sendMessage}
            onSelect={onSelect}
          />
        )}

        {noWorkItems.length > 0 && (
          <NoWorkSection items={noWorkItems} sendMessage={sendMessage} />
        )}
      </div>
    </div>
  );
}

function LinkedArtifactsCollapsible({
  artifacts,
  onSelect,
}: {
  artifacts: ArtifactRow[];
  onSelect: (a: ArtifactRow) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-t border-border bg-[var(--vscode-editor-background)]">
      <button
        type="button"
        className="w-full text-left px-4 py-1.5 flex items-center gap-2 text-xs text-muted hover:bg-[var(--vscode-list-hoverBackground)]"
        onClick={() => setOpen(!open)}
      >
        <span>{open ? "▾" : "▸"}</span>
        <span>{artifacts.length} linked artifact{artifacts.length !== 1 ? "s" : ""}</span>
      </button>
      {open && (
        <div>
          {artifacts.map((artifact) => {
            const aStyle = getStatusStyle(artifact.status);
            return (
              <button
                key={artifact.id}
                type="button"
                className="w-full text-left px-6 py-2 flex items-center gap-2 hover:bg-[var(--vscode-list-hoverBackground)] border-t border-border"
                onClick={() => onSelect(artifact)}
              >
                <span className={`h-2 w-2 shrink-0 rounded-full ${aStyle.dot}`} />
                <span className="truncate text-sm">{artifact.next ?? artifact.title}</span>
                <span className="ml-auto shrink-0 av-meta">{artifact.kind}</span>
                {artifact.last_action_at && (
                  <span className="shrink-0 av-meta">{relativeTime(artifact.last_action_at)}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function JiraItemCard({
  jiraItem,
  linkedArtifacts,
  onSelect,
  sendMessage,
}: {
  jiraItem: ArtifactRow;
  linkedArtifacts: ArtifactRow[];
  onSelect: (a: ArtifactRow) => void;
  sendMessage: (msg: WebViewMessage) => void;
}) {
  const style = getStatusStyle(jiraItem.status);
  const jiraKey = jiraItem.id.split("/").pop() ?? jiraItem.title;

  return (
    <div className="border border-border rounded-md overflow-hidden">
      <button
        type="button"
        className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-[var(--vscode-list-hoverBackground)]"
        onClick={() => {
          if (jiraItem.url) {
            sendMessage({ type: "open-url", url: jiraItem.url });
          }
        }}
      >
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${style.dot}`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-[var(--vscode-textLink-foreground)] underline">{jiraKey}</span>
            <span className={`av-status-badge ${style.badge}`}>{style.label}</span>
          </div>
          <p className="av-card-title mt-1">{jiraItem.title}</p>
        </div>
        <span className="shrink-0 text-xs text-muted">
          {linkedArtifacts.length} linked ↗
        </span>
      </button>

      {linkedArtifacts.length > 0 && (
        <LinkedArtifactsCollapsible artifacts={linkedArtifacts} onSelect={onSelect} />
      )}
    </div>
  );
}

function UnlinkedSection({
  artifacts,
  jiraItems,
  sendMessage,
  onSelect,
}: {
  artifacts: ArtifactRow[];
  jiraItems: ArtifactRow[];
  sendMessage: (msg: WebViewMessage) => void;
  onSelect: (a: ArtifactRow) => void;
}) {
  return (
    <div className="mt-4">
      <div className="flex items-center gap-2 px-4 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
        <h2 className="text-sm font-medium">Unlinked Work</h2>
        <span className="av-meta">({artifacts.length})</span>
      </div>
      <div className="flex flex-col gap-1">
        {artifacts.map((artifact) => (
          <UnlinkedCard
            key={artifact.id}
            artifact={artifact}
            jiraItems={jiraItems}
            sendMessage={sendMessage}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}

function UnlinkedCard({
  artifact,
  jiraItems,
  sendMessage,
  onSelect,
}: {
  artifact: ArtifactRow;
  jiraItems: ArtifactRow[];
  sendMessage: (msg: WebViewMessage) => void;
  onSelect: (a: ArtifactRow) => void;
}) {
  const style = getStatusStyle(artifact.status);

  return (
    <div className="border border-amber-500/30 rounded-md px-4 py-3">
      <button
        type="button"
        className="w-full text-left flex items-start gap-3"
        onClick={() => onSelect(artifact)}
      >
        <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${style.dot}`} />
        <div className="min-w-0 flex-1">
          <p className="av-card-title">{artifact.next ?? artifact.title}</p>
          <div className="mt-1 flex items-center gap-2">
            <DomainBadge domain={artifact.domain} />
            <span className="av-meta">/ {artifact.kind}</span>
          </div>
        </div>
      </button>
      <div className="mt-2 flex items-center gap-2 pl-6">
        <select
          className="av-select text-xs"
          defaultValue=""
          onChange={(e) => {
            if (e.target.value) {
              sendMessage({ type: "link-artifact", artifactId: artifact.id, jiraItemId: e.target.value });
            }
          }}
        >
          <option value="" disabled>Link to...</option>
          {jiraItems.map((item) => {
            const key = item.id.split("/").pop() ?? item.title;
            return (
              <option key={item.id} value={item.id}>
                {key}: {item.title.slice(0, 40)}
              </option>
            );
          })}
        </select>
        <button
          type="button"
          className="av-btn-sm text-blue-400"
          onClick={() => sendMessage({ type: "create-jira-issue", artifactId: artifact.id, domain: artifact.domain })}
        >
          Create
        </button>
        <button
          type="button"
          className="av-btn-sm text-gray-400"
          onClick={() => sendMessage({ type: "dismiss-unlinked", artifactId: artifact.id })}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

function NoWorkSection({
  items,
  sendMessage,
}: {
  items: JiraItemGroup[];
  sendMessage: (msg: WebViewMessage) => void;
}) {
  if (items.length === 0) return null;

  return (
    <div className="mt-4">
      <div className="flex items-center gap-2 px-4 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-gray-400" />
        <h2 className="text-sm font-medium text-muted">No Work Yet</h2>
        <span className="av-meta">({items.length})</span>
      </div>
      <div className="flex flex-col gap-1">
        {items.map(({ jiraItem }) => {
          const key = jiraItem.id.split("/").pop() ?? jiraItem.title;
          const style = getStatusStyle(jiraItem.status);
          return (
            <button
              key={jiraItem.id}
              type="button"
              className="w-full text-left px-4 py-2 flex items-center gap-3 rounded hover:bg-[var(--vscode-list-hoverBackground)]"
              onClick={() => {
                if (jiraItem.url) {
                  sendMessage({ type: "open-url", url: jiraItem.url });
                }
              }}
            >
              <span className={`h-2 w-2 shrink-0 rounded-full ${style.dot}`} />
              <span className="font-mono text-xs text-[var(--vscode-textLink-foreground)] underline">{key}</span>
              <span className="truncate text-sm">{jiraItem.title}</span>
              <span className="ml-auto text-xs text-muted">↗</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
