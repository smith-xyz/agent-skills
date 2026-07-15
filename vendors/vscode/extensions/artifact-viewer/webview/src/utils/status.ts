import type { ArtifactStatus } from "../types/artifact";

export interface StatusStyle {
  dot: string;
  label: string;
  badge: string;
}

const STATUS_STYLES: Record<ArtifactStatus, StatusStyle> = {
  "needs-me": {
    dot: "bg-red-500",
    label: "critical",
    badge: "text-red-400 border-red-500/40",
  },
  active: {
    dot: "bg-blue-500",
    label: "ready",
    badge: "text-blue-400 border-blue-500/40",
  },
  waiting: {
    dot: "bg-amber-500",
    label: "waiting",
    badge: "text-amber-400 border-amber-500/40",
  },
  done: {
    dot: "bg-green-500",
    label: "done",
    badge: "text-green-400 border-green-500/40",
  },
  stale: {
    dot: "bg-gray-400",
    label: "stale",
    badge: "text-gray-400 border-gray-500/40",
  },
};

export function getStatusStyle(status: ArtifactStatus): StatusStyle {
  return STATUS_STYLES[status];
}
