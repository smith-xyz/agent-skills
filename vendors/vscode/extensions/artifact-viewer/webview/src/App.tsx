import { useCallback, useState } from "react";
import type { ArtifactRow } from "./types/artifact";
import { DrillDown } from "./components/DrillDown";
import { FocusView } from "./components/FocusView";
import {
  MyPrsView,
  MyWorkView,
  ThreadView,
  SystemMap,
  PortfolioView,
  ViewTabs,
} from "./components/advanced";
import { useArtifacts } from "./hooks/useArtifacts";

type ViewId = "my-work" | "my-prs" | "focus" | "threads" | "system-map" | "portfolio";

export function App() {
  const data = useArtifacts();
  const [selected, setSelected] = useState<ArtifactRow | null>(null);
  const [activeView, setActiveView] = useState<ViewId>("my-work");
  const [selectedDomain, setSelectedDomain] = useState<string | undefined>();

  const handleSelect = useCallback(
    (artifact: ArtifactRow) => {
      if (artifact.url) {
        data.sendMessage({ type: "open-file", path: artifact.url });
        return;
      }
      setSelected(artifact);
    },
    [data]
  );

  const handleBack = useCallback(() => {
    setSelected(null);
  }, []);

  if (selected) {
    return (
      <DrillDown
        artifact={selected}
        links={data.links}
        domainConfig={data.getDomainConfig(selected.domain)}
        getArtifactById={data.getArtifactById}
        onBack={handleBack}
        onSelectLinked={setSelected}
      />
    );
  }

  const domainForMap = selectedDomain ?? data.domains[0]?.domain;
  const domainConfig = domainForMap ? data.getDomainConfig(domainForMap) : undefined;

  return (
    <div className="flex flex-col h-full">
      <ViewTabs
        activeView={activeView}
        domains={data.domains}
        selectedDomain={selectedDomain}
        onViewChange={(v) => setActiveView(v as ViewId)}
        onDomainSelect={setSelectedDomain}
      />
      <div className="flex-1 overflow-auto">
        {activeView === "my-work" && (
          <MyWorkView
            artifacts={data.artifacts}
            links={data.links}
            domains={data.domains}
            sendMessage={data.sendMessage}
            onSelect={handleSelect}
          />
        )}
        {activeView === "my-prs" && (
          <MyPrsView openPrs={data.openPrs} sendMessage={data.sendMessage} />
        )}
        {activeView === "focus" && (
          <FocusView data={data} onSelect={handleSelect} />
        )}
        {activeView === "threads" && (
          <ThreadView artifacts={data.artifacts} links={data.links} />
        )}
        {activeView === "system-map" && domainConfig && (
          <SystemMap
            domain={domainConfig}
            artifacts={data.artifacts}
            links={data.links}
          />
        )}
        {activeView === "system-map" && !domainConfig && (
          <p className="av-empty">No domain configs found.</p>
        )}
        {activeView === "portfolio" && (
          <PortfolioView artifacts={data.artifacts} domains={data.domains} />
        )}
      </div>
    </div>
  );
}
