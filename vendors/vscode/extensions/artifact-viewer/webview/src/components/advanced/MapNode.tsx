import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { ArtifactStatus } from "../../types/artifact";
import { getStatusStyle } from "../../utils/status";

export interface MapNodeData extends Record<string, unknown> {
  label: string;
  count: number;
  worstStatus: ArtifactStatus | null;
}

export function MapNode({ data }: NodeProps) {
  const nodeData = data as unknown as MapNodeData;
  const statusStyle = nodeData.worstStatus
    ? getStatusStyle(nodeData.worstStatus)
    : null;

  return (
    <div className="min-w-[140px] rounded border border-border bg-background px-4 py-3 text-sm shadow-sm">
      <Handle type="target" position={Position.Top} className="!bg-border" />
      <div className="flex items-center gap-2">
        {statusStyle && (
          <span
            className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${statusStyle.dot}`}
            title={statusStyle.label}
          />
        )}
        <span className="truncate font-medium text-foreground">
          {nodeData.label}
        </span>
      </div>
      {nodeData.count > 0 && (
        <div className="mt-1.5 text-xs text-muted">
          {nodeData.count} artifact{nodeData.count === 1 ? "" : "s"}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-border" />
    </div>
  );
}
