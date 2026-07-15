import type { DomainConfig } from "../../types/artifact";

interface ViewTabsProps {
  activeView: string;
  domains: DomainConfig[];
  selectedDomain?: string;
  onViewChange: (view: string) => void;
  onDomainSelect: (domain: string) => void;
}

const VIEWS = [
  { id: "my-work", label: "My Work" },
  { id: "my-prs", label: "My PRs" },
  { id: "focus", label: "Focus" },
  { id: "threads", label: "Threads" },
  { id: "system-map", label: "System Map" },
  { id: "portfolio", label: "Portfolio" },
] as const;

export function ViewTabs({
  activeView,
  domains,
  selectedDomain,
  onViewChange,
  onDomainSelect,
}: ViewTabsProps) {
  const showDomainDropdown =
    activeView === "system-map" && domains.length > 0;

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
      {VIEWS.map((view) => {
        const isActive = activeView === view.id;
        const isSystemMap = view.id === "system-map";

        return (
          <div key={view.id} className="inline-flex items-center">
            <button
              type="button"
              onClick={() => onViewChange(view.id)}
              className={`av-tab ${isActive ? "av-tab-active" : "av-tab-inactive"}`}
            >
              {view.label}
              {isSystemMap && isActive && domains.length > 0 ? " ▾" : ""}
            </button>
            {isSystemMap && showDomainDropdown && (
              <select
                value={selectedDomain ?? domains[0]?.domain ?? ""}
                onChange={(event) => onDomainSelect(event.target.value)}
                className="av-select"
              >
                {domains.map((domain) => (
                  <option key={domain.domain} value={domain.domain}>
                    {domain.domain}
                  </option>
                ))}
              </select>
            )}
          </div>
        );
      })}
    </div>
  );
}
