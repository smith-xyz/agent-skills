import { useMemo } from "react";
import type { ArtifactRow, LinkRow } from "../../types/artifact";
import { postToHost } from "../../vscode-api";
import { getStatusStyle } from "../../utils/status";
import { relativeTime } from "../../utils/time";

interface ThreadViewProps {
  artifacts: ArtifactRow[];
  links: LinkRow[];
}

interface ThreadChain {
  title: string;
  items: ThreadItem[];
}

interface ThreadItem {
  artifact: ArtifactRow;
  dependsOn: ArtifactRow[];
  hasOutgoing: boolean;
  isLast: boolean;
}

const FEEDS_INTO = "feeds-into";
const DEPENDS_ON = "depends-on";

function buildArtifactMap(artifacts: ArtifactRow[]): Map<string, ArtifactRow> {
  return new Map(artifacts.map((artifact) => [artifact.id, artifact]));
}

function getFeedsIntoLinks(links: LinkRow[]): LinkRow[] {
  return links.filter((link) => link.rel === FEEDS_INTO);
}

function getDependsOnLinks(links: LinkRow[]): LinkRow[] {
  return links.filter((link) => link.rel === DEPENDS_ON);
}

function findRoots(
  feedsLinks: LinkRow[],
  artifactIds: Set<string>,
): string[] {
  const incoming = new Set<string>();
  const outgoing = new Set<string>();

  for (const link of feedsLinks) {
    if (!artifactIds.has(link.from_id) || !artifactIds.has(link.to_id)) {
      continue;
    }
    outgoing.add(link.from_id);
    incoming.add(link.to_id);
  }

  return [...outgoing].filter((id) => !incoming.has(id));
}

function buildChain(
  rootId: string,
  feedsLinks: LinkRow[],
  dependsLinks: LinkRow[],
  artifactMap: Map<string, ArtifactRow>,
  visited: Set<string>,
): ThreadItem[] {
  const items: ThreadItem[] = [];
  let currentId: string | undefined = rootId;

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const artifact = artifactMap.get(currentId);
    if (!artifact) break;

    const dependsOn = dependsLinks
      .filter((link) => link.from_id === currentId)
      .map((link) => artifactMap.get(link.to_id))
      .filter((dep): dep is ArtifactRow => dep != null);

    const hasOutgoing = feedsLinks.some((link) => link.from_id === currentId);
    items.push({ artifact, dependsOn, hasOutgoing, isLast: false });
    currentId = feedsLinks.find((link) => link.from_id === currentId)?.to_id;
  }

  if (items.length > 0) {
    items[items.length - 1].isLast = true;
  }

  return items;
}

function buildThreads(
  artifacts: ArtifactRow[],
  links: LinkRow[],
): ThreadChain[] {
  const artifactMap = buildArtifactMap(artifacts);
  const artifactIds = new Set(artifacts.map((artifact) => artifact.id));
  const feedsLinks = getFeedsIntoLinks(links);
  const dependsLinks = getDependsOnLinks(links);
  const roots = findRoots(feedsLinks, artifactIds);
  const visited = new Set<string>();
  const threads: ThreadChain[] = [];

  for (const rootId of roots) {
    const items = buildChain(
      rootId,
      feedsLinks,
      dependsLinks,
      artifactMap,
      visited,
    );
    if (items.length === 0) continue;
    threads.push({
      title: items[0].artifact.title,
      items,
    });
  }

  return threads;
}

function openArtifact(artifact: ArtifactRow): void {
  postToHost({ type: "open-file", path: artifact.source });
}

function ThreadItemRow({
  item,
  isFirst,
}: {
  item: ThreadItem;
  isFirst: boolean;
}) {
  const statusStyle = getStatusStyle(item.artifact.status);
  const prefix = item.isLast ? "└─" : "├─";
  const connector = isFirst ? "" : "│  ";

  return (
    <div className="font-mono text-sm leading-relaxed">
      <button
        type="button"
        onClick={() => openArtifact(item.artifact)}
        className="group w-full text-left hover:text-accent"
      >
        <span className="select-none text-muted">
          {connector}
          {prefix}{" "}
        </span>
        <span className="text-foreground group-hover:underline">
          {item.artifact.id}
        </span>
        <span className={`av-status-badge ml-2 ${statusStyle.badge}`}>
          {item.artifact.status}
        </span>
        {item.artifact.last_action_at && (
          <span className="ml-2 av-meta">
            {relativeTime(item.artifact.last_action_at)}
          </span>
        )}
      </button>
      {item.hasOutgoing && (
        <div className="select-none av-meta">
          {item.isLast ? "   " : "│  "} feeds-into →
        </div>
      )}
      {item.dependsOn.map((dep) => (
        <div key={dep.id} className="av-meta">
          {item.isLast ? "   " : "│  "} depends-on {dep.id}
        </div>
      ))}
    </div>
  );
}

export function ThreadView({ artifacts, links }: ThreadViewProps) {
  const threads = useMemo(
    () => buildThreads(artifacts, links),
    [artifacts, links],
  );

  const feedsLinks = getFeedsIntoLinks(links);
  if (feedsLinks.length === 0) {
    return (
      <p className="av-empty">
        No threads yet — artifacts will be linked as work progresses
      </p>
    );
  }

  if (threads.length === 0) {
    return (
      <p className="av-empty">
        No threads yet — artifacts will be linked as work progresses
      </p>
    );
  }

  return (
    <div className="space-y-6 av-page">
      {threads.map((thread) => (
        <section key={thread.items.map((item) => item.artifact.id).join("→")}>
          <h3 className="mb-3 av-page-title">Thread: {thread.title}</h3>
          <div className="pl-2">
            {thread.items.map((item, index) => (
              <ThreadItemRow
                key={item.artifact.id}
                item={item}
                isFirst={index === 0}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
