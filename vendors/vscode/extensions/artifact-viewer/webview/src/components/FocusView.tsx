import type { ArtifactRow } from "../types/artifact";
import { ArtifactCard } from "./ArtifactCard";
import { StatusGroup } from "./StatusGroup";
import { SuggestionsPanel } from "./SuggestionsPanel";
import type { UseArtifactsReturn } from "../hooks/useArtifacts";

interface FocusViewProps {
  data: UseArtifactsReturn;
  onSelect: (artifact: ArtifactRow) => void;
}

export function FocusView({ data, onSelect }: FocusViewProps) {
  const {
    focusItems,
    waitingItems,
    activeItems,
    doneItems,
    suggestions,
    sendMessage,
  } = data;

  return (
    <div className="flex h-full flex-col">
      <header className="av-header-bar">
        <div className="flex items-center justify-between">
          <h1 className="av-page-title">Focus</h1>
          <span className="av-meta">{focusItems.length} items</span>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {focusItems.length === 0 ? (
          <p className="av-empty">Nothing needs attention.</p>
        ) : (
          <ul className="av-list av-list-gutter">
            {focusItems.map((item) => (
              <li key={item.id}>
                <ArtifactCard artifact={item} onClick={onSelect} />
              </li>
            ))}
          </ul>
        )}

        <StatusGroup label="Waiting" items={waitingItems} onSelect={onSelect} />
        <StatusGroup label="Active" items={activeItems} onSelect={onSelect} />
        <StatusGroup label="Done" items={doneItems} onSelect={onSelect} />

        <SuggestionsPanel
          suggestions={suggestions}
          onDismiss={(id) => sendMessage({ type: "dismiss-suggestion", id })}
          onAccept={(id) => sendMessage({ type: "accept-suggestion", id })}
        />
      </div>
    </div>
  );
}
