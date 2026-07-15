import { useMemo } from "react";
import type { ArtifactRow, DomainConfig } from "../../types/artifact";
import type { ArtifactStatus } from "../../types/artifact";
import { getStatusStyle } from "../../utils/status";

interface PortfolioViewProps {
  artifacts: ArtifactRow[];
  domains: DomainConfig[];
}

interface DomainStats {
  domain: string;
  initiative: string;
  focus: number;
  active: number;
  waiting: number;
  done: number;
  health: ArtifactStatus | null;
}

const STATUS_PRIORITY: Record<ArtifactStatus, number> = {
  "needs-me": 5,
  waiting: 4,
  active: 3,
  stale: 2,
  done: 1,
};

function healthLabel(status: ArtifactStatus | null): string {
  if (!status) return "—";
  if (status === "done") return "healthy";
  return status;
}

function worstStatus(statuses: ArtifactStatus[]): ArtifactStatus | null {
  if (statuses.length === 0) return null;
  return statuses.reduce((worst, status) =>
    STATUS_PRIORITY[status] > STATUS_PRIORITY[worst] ? status : worst,
  );
}

function computeStats(
  artifacts: ArtifactRow[],
  domains: DomainConfig[],
): DomainStats[] {
  const domainArtifacts = new Map<string, ArtifactRow[]>();

  for (const artifact of artifacts) {
    const existing = domainArtifacts.get(artifact.domain) ?? [];
    existing.push(artifact);
    domainArtifacts.set(artifact.domain, existing);
  }

  const configuredDomains = new Set(domains.map((d) => d.domain));
  const allDomains = new Set([
    ...configuredDomains,
    ...domainArtifacts.keys(),
  ]);

  const stats: DomainStats[] = [];

  for (const domain of allDomains) {
    const config = domains.find((d) => d.domain === domain);
    const items = domainArtifacts.get(domain) ?? [];

    stats.push({
      domain,
      initiative: config?.initiative ?? domain,
      focus: items.filter((a) => a.next != null).length,
      active: items.filter((a) => a.status === "active").length,
      waiting: items.filter((a) => a.status === "waiting").length,
      done: items.filter((a) => a.status === "done").length,
      health: worstStatus(items.map((a) => a.status)),
    });
  }

  return stats.sort((a, b) => {
    if (a.focus !== b.focus) return b.focus - a.focus;
    return b.active - a.active;
  });
}

function handleRowClick(_domain: string): void {
  // TODO: navigate to focus view filtered by domain
}

export function PortfolioView({ artifacts, domains }: PortfolioViewProps) {
  const rows = useMemo(
    () => computeStats(artifacts, domains),
    [artifacts, domains],
  );

  if (rows.length === 0) {
    return <p className="av-empty">No domain data available</p>;
  }

  return (
    <div className="overflow-x-auto av-page">
      <table className="av-table">
        <thead>
          <tr className="av-table-header">
            <th className="av-table-cell font-medium">Domain</th>
            <th className="av-table-cell font-medium">Initiative</th>
            <th className="av-table-cell text-center font-medium">Focus</th>
            <th className="av-table-cell text-center font-medium">Active</th>
            <th className="av-table-cell text-center font-medium">Waiting</th>
            <th className="av-table-cell text-center font-medium">Done</th>
            <th className="av-table-cell font-medium">Health</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const healthStyle = row.health
              ? getStatusStyle(row.health)
              : null;
            const label = healthLabel(row.health);

            return (
              <tr
                key={row.domain}
                onClick={() => handleRowClick(row.domain)}
                className="cursor-pointer border-b border-border hover:bg-[var(--vscode-list-hoverBackground)]"
              >
                <td className="av-table-cell font-medium">{row.domain}</td>
                <td className="av-table-cell text-muted">{row.initiative}</td>
                <td className="av-table-cell text-center">{row.focus}</td>
                <td className="av-table-cell text-center">{row.active}</td>
                <td className="av-table-cell text-center">{row.waiting}</td>
                <td className="av-table-cell text-center">{row.done}</td>
                <td className="av-table-cell">
                  {healthStyle ? (
                    <span className="inline-flex items-center gap-2">
                      <span
                        className={`inline-block h-2.5 w-2.5 rounded-full ${healthStyle.dot}`}
                      />
                      {label}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
