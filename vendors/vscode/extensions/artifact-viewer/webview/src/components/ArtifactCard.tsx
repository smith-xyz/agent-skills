import type { ArtifactRow } from "../types/artifact";
import { getStatusStyle } from "../utils/status";
import { relativeTime } from "../utils/time";
import { DomainBadge } from "./DomainBadge";

interface ArtifactCardProps {
  artifact: ArtifactRow;
  onClick: (artifact: ArtifactRow) => void;
}

export function ArtifactCard({ artifact, onClick }: ArtifactCardProps) {
  const style = getStatusStyle(artifact.status);
  const primary = artifact.next ?? artifact.title;
  const timeLabel = relativeTime(artifact.last_action_at);

  return (
    <button
      type="button"
      onClick={() => onClick(artifact)}
      className="av-card"
    >
      <div className="flex items-start gap-3">
        <span
          className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${style.dot}`}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className="av-card-title">{primary}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <DomainBadge domain={artifact.domain} />
            <span className="av-meta">/ {artifact.kind}</span>
            <span className={`av-status-badge ${style.badge}`}>
              {style.label}
            </span>
          </div>
          {(timeLabel || artifact.last_action) && (
            <p className="mt-2 truncate av-meta">
              {timeLabel && <span>{timeLabel}</span>}
              {timeLabel && artifact.last_action && <span>: </span>}
              {artifact.last_action && <span>{artifact.last_action}</span>}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}
