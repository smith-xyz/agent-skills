import { useState } from "react";
import type { ArtifactRow } from "../types/artifact";
import { ArtifactCard } from "./ArtifactCard";

interface StatusGroupProps {
  label: string;
  items: ArtifactRow[];
  onSelect: (artifact: ArtifactRow) => void;
  defaultExpanded?: boolean;
}

export function StatusGroup({
  label,
  items,
  onSelect,
  defaultExpanded = false,
}: StatusGroupProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (items.length === 0) return null;

  return (
    <section className="av-divider-section">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="av-collapsible-header"
      >
        <span>
          {label} ({items.length})
        </span>
        <span className="av-collapsible-action">
          {expanded ? "collapse" : "expand"}
        </span>
      </button>
      {expanded && (
        <ul className="av-list px-4 pb-4">
          {items.map((item) => (
            <li key={item.id}>
              <ArtifactCard artifact={item} onClick={onSelect} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
