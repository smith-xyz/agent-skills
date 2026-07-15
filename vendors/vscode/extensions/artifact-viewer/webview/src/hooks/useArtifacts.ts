import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  ArtifactRow,
  DomainConfig,
  HostMessage,
  LinkRow,
  OpenPrRow,
  SuggestionRow,
  WebViewMessage,
} from "../types/artifact";
import { isFocusItem } from "../types/artifact";
import { postToHost } from "../vscode-api";

export interface UseArtifactsReturn {
  artifacts: ArtifactRow[];
  suggestions: SuggestionRow[];
  domains: DomainConfig[];
  links: LinkRow[];
  openPrs: OpenPrRow[];
  focusItems: ArtifactRow[];
  waitingItems: ArtifactRow[];
  activeItems: ArtifactRow[];
  doneItems: ArtifactRow[];
  sendMessage: (message: WebViewMessage) => void;
  getArtifactById: (id: string) => ArtifactRow | undefined;
  getDomainConfig: (domain: string) => DomainConfig | undefined;
}

function sortFocusItems(items: ArtifactRow[]): ArtifactRow[] {
  return [...items].sort((a, b) => {
    const aPriority = a.status === "needs-me" ? 0 : 1;
    const bPriority = b.status === "needs-me" ? 0 : 1;
    if (aPriority !== bPriority) return aPriority - bPriority;

    const aTime = a.last_action_at ? new Date(a.last_action_at).getTime() : 0;
    const bTime = b.last_action_at ? new Date(b.last_action_at).getTime() : 0;
    return bTime - aTime;
  });
}

function sortByUpdated(items: ArtifactRow[]): ArtifactRow[] {
  return [...items].sort(
    (a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime()
  );
}

export function useArtifacts(): UseArtifactsReturn {
  const [artifacts, setArtifacts] = useState<ArtifactRow[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestionRow[]>([]);
  const [domains, setDomains] = useState<DomainConfig[]>([]);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [openPrs, setOpenPrs] = useState<OpenPrRow[]>([]);

  useEffect(() => {
    const handler = (event: MessageEvent<HostMessage>) => {
      const message = event.data;
      switch (message.type) {
        case "artifacts":
          setArtifacts(message.data);
          break;
        case "suggestions":
          setSuggestions(message.data);
          break;
        case "domains":
          setDomains(message.data);
          break;
        case "links":
          setLinks(message.data);
          break;
        case "open-prs":
          setOpenPrs(message.data);
          break;
        case "event":
          break;
      }
    };

    window.addEventListener("message", handler);
    postToHost({ type: "ready" } as unknown as WebViewMessage);
    return () => window.removeEventListener("message", handler);
  }, []);

  const focusItems = useMemo(
    () => sortFocusItems(artifacts.filter(isFocusItem)),
    [artifacts]
  );

  const waitingItems = useMemo(
    () =>
      sortByUpdated(
        artifacts.filter((a) => a.status === "waiting" && !isFocusItem(a))
      ),
    [artifacts]
  );

  const activeItems = useMemo(
    () =>
      sortByUpdated(
        artifacts.filter((a) => a.status === "active" && !isFocusItem(a))
      ),
    [artifacts]
  );

  const doneItems = useMemo(
    () => sortByUpdated(artifacts.filter((a) => a.status === "done")),
    [artifacts]
  );

  const artifactMap = useMemo(
    () => new Map(artifacts.map((a) => [a.id, a])),
    [artifacts]
  );

  const domainMap = useMemo(
    () => new Map(domains.map((d) => [d.domain, d])),
    [domains]
  );

  const getArtifactById = useCallback(
    (id: string) => artifactMap.get(id),
    [artifactMap]
  );

  const getDomainConfig = useCallback(
    (domain: string) => domainMap.get(domain),
    [domainMap]
  );

  const sendMessage = useCallback((message: WebViewMessage) => {
    postToHost(message);
  }, []);

  return {
    artifacts,
    suggestions,
    domains,
    links,
    openPrs,
    focusItems,
    waitingItems,
    activeItems,
    doneItems,
    sendMessage,
    getArtifactById,
    getDomainConfig,
  };
}
