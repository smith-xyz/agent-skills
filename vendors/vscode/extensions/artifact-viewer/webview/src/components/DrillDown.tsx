import type { ArtifactRow, DomainConfig, LinkRow } from "../types/artifact";
import { parseRelated } from "../types/artifact";
import { getStatusStyle } from "../utils/status";
import { relativeTime } from "../utils/time";
import { DomainBadge } from "./DomainBadge";

function ArrowIcon({ direction }: { direction: "out" | "in" }) {
  return (
    <svg className="inline-block h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
      {direction === "out" ? (
        <path d="M1 8h12.2l-4.6 4.6L10 14l6-6-6-6-1.4 1.4L13.2 8H1z" />
      ) : (
        <path d="M15 8H2.8l4.6-4.6L6 2 0 8l6 6 1.4-1.4L2.8 8H15z" />
      )}
    </svg>
  );
}

interface DrillDownProps {
  artifact: ArtifactRow;
  links: LinkRow[];
  domainConfig?: DomainConfig;
  getArtifactById: (id: string) => ArtifactRow | undefined;
  onBack: () => void;
  onSelectLinked: (artifact: ArtifactRow) => void;
}

interface FieldRow {
  label: string;
  value: string;
}

function formatValue(value: unknown): string {
  if (value == null || value === "") return "—";
  if (Array.isArray(value)) return value.join(", ") || "—";
  return String(value);
}

function buildEnvelopeFields(artifact: ArtifactRow): FieldRow[] {
  return [
    { label: "ID", value: artifact.id },
    { label: "Kind", value: artifact.kind },
    { label: "Title", value: artifact.title },
    { label: "Domain", value: artifact.domain },
    { label: "Source", value: artifact.source },
    { label: "Status", value: artifact.status },
    { label: "Next", value: formatValue(artifact.next) },
    { label: "Blocked", value: formatValue(artifact.blocked) },
    { label: "Last action", value: formatValue(artifact.last_action) },
    {
      label: "Last action at",
      value: artifact.last_action_at
        ? `${relativeTime(artifact.last_action_at)} (${artifact.last_action_at})`
        : "—",
    },
    { label: "Updated", value: artifact.updated },
    { label: "Created", value: artifact.created },
    { label: "URL", value: formatValue(artifact.url) },
    { label: "Diagram", value: formatValue(artifact.diagram_ref) },
    { label: "Node", value: formatValue(artifact.node) },
    {
      label: "Related",
      value: formatValue(parseRelated(artifact.related)),
    },
  ];
}

function buildKindFields(artifact: ArtifactRow): FieldRow[] {
  const envelopeKeys = new Set([
    "id",
    "kind",
    "title",
    "domain",
    "source",
    "status",
    "next",
    "blocked",
    "last_action",
    "last_action_at",
    "updated",
    "created",
    "url",
    "diagram_ref",
    "node",
    "related",
  ]);

  return Object.entries(artifact)
    .filter(([key]) => !envelopeKeys.has(key))
    .map(([label, value]) => ({ label, value: formatValue(value) }));
}

interface LinkedArtifact {
  rel: string;
  direction: "out" | "in";
  artifact: ArtifactRow;
}

function getLinkedArtifacts(
  artifactId: string,
  links: LinkRow[],
  getArtifactById: (id: string) => ArtifactRow | undefined
): LinkedArtifact[] {
  const linked: LinkedArtifact[] = [];

  for (const link of links) {
    if (link.from_id === artifactId) {
      const target = getArtifactById(link.to_id);
      if (target) linked.push({ rel: link.rel, direction: "out", artifact: target });
    }
    if (link.to_id === artifactId) {
      const source = getArtifactById(link.from_id);
      if (source) linked.push({ rel: link.rel, direction: "in", artifact: source });
    }
  }

  return linked;
}

function DetailFields({ fields }: { fields: FieldRow[] }) {
  return (
    <dl className="av-detail-fields">
      {fields.map(({ label, value }) => (
        <div key={label} className="space-y-1">
          <dt className="av-detail-label">{label}</dt>
          <dd className="av-detail-value">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function DrillDown({
  artifact,
  links,
  domainConfig,
  getArtifactById,
  onBack,
  onSelectLinked,
}: DrillDownProps) {
  const style = getStatusStyle(artifact.status);
  const envelopeFields = buildEnvelopeFields(artifact);
  const kindFields = buildKindFields(artifact);
  const linked = getLinkedArtifacts(artifact.id, links, getArtifactById);

  return (
    <div className="flex h-full flex-col">
      <header className="av-header-bar">
        <button type="button" onClick={onBack} className="mb-3 av-button-link">
          <ArrowIcon direction="in" /> Back
        </button>
        <div className="flex items-start gap-3">
          <span className={`mt-2 h-3 w-3 shrink-0 rounded-full ${style.dot}`} />
          <div className="min-w-0">
            <h2 className="av-view-title">{artifact.next ?? artifact.title}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <DomainBadge domain={artifact.domain} />
              <span className="av-meta">{artifact.kind}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <section className="av-section">
          <h3 className="av-section-heading">Envelope</h3>
          <DetailFields fields={envelopeFields} />
        </section>

        {kindFields.length > 0 && (
          <section className="av-section">
            <h3 className="av-section-heading">Kind-specific</h3>
            <DetailFields fields={kindFields} />
          </section>
        )}

        {domainConfig && (
          <section className="av-section">
            <h3 className="av-section-heading">Domain</h3>
            <dl className="av-detail-fields">
              {domainConfig.initiative && (
                <div className="space-y-1">
                  <dt className="av-detail-label">Initiative</dt>
                  <dd className="av-detail-value">{domainConfig.initiative}</dd>
                </div>
              )}
              {domainConfig.stakeholders && domainConfig.stakeholders.length > 0 && (
                <div className="space-y-1">
                  <dt className="av-detail-label">Stakeholders</dt>
                  <dd className="av-detail-value">
                    {domainConfig.stakeholders.join(", ")}
                  </dd>
                </div>
              )}
            </dl>
          </section>
        )}

        {linked.length > 0 && (
          <section>
            <h3 className="av-section-heading">Links</h3>
            <ul className="av-list">
              {linked.map(({ rel, direction, artifact: linkedArtifact }) => (
                <li key={`${rel}-${direction}-${linkedArtifact.id}`}>
                  <button
                    type="button"
                    onClick={() => onSelectLinked(linkedArtifact)}
                    className="av-card"
                  >
                    <span className="av-meta">
                      <ArrowIcon direction={direction} /> {rel}
                    </span>
                    <p className="truncate text-base font-medium text-foreground">
                      {linkedArtifact.title}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
