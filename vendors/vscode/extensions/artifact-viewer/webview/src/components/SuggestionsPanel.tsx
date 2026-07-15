import { useState } from "react";
import type { SuggestionRow } from "../types/artifact";

interface SuggestionsPanelProps {
  suggestions: SuggestionRow[];
  onDismiss: (id: number) => void;
  onAccept: (id: number) => void;
}

export function SuggestionsPanel({
  suggestions,
  onDismiss,
  onAccept,
}: SuggestionsPanelProps) {
  const [expanded, setExpanded] = useState(false);

  if (suggestions.length === 0) return null;

  return (
    <section className="av-divider-section">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="av-collapsible-header"
      >
        <span>Suggestions ({suggestions.length})</span>
        <span className="av-collapsible-action">
          {expanded ? "collapse" : "expand"}
        </span>
      </button>
      {expanded && (
        <ul className="av-list px-4 pb-4">
          {suggestions.map((suggestion) => (
            <li
              key={suggestion.id}
              className="rounded border border-border/50 px-4 py-3"
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 text-muted" aria-hidden>
                  ○
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-base text-foreground">{suggestion.text}</p>
                  {suggestion.source_skill && (
                    <p className="mt-1 av-meta">{suggestion.source_skill}</p>
                  )}
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => onDismiss(suggestion.id)}
                      className="av-button-ghost"
                    >
                      dismiss
                    </button>
                    <button
                      type="button"
                      onClick={() => onAccept(suggestion.id)}
                      className="av-button-primary"
                    >
                      accept
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
