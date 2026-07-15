import dagre from "@dagrejs/dagre";
import {
  Background,
  ReactFlow,
  type Edge,
  type Node,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useMemo } from "react";
import type { ArtifactRow, DomainConfig, LinkRow } from "../../types/artifact";
import type { ArtifactStatus } from "../../types/artifact";
import { MapNode, type MapNodeData } from "./MapNode";

interface SystemMapProps {
  domain: DomainConfig;
  artifacts: ArtifactRow[];
  links: LinkRow[];
}

const NODE_WIDTH = 140;
const NODE_HEIGHT = 56;

const STATUS_PRIORITY: Record<ArtifactStatus, number> = {
  "needs-me": 5,
  waiting: 4,
  active: 3,
  stale: 2,
  done: 1,
};

function worstStatus(statuses: ArtifactStatus[]): ArtifactStatus | null {
  if (statuses.length === 0) return null;
  return statuses.reduce((worst, status) =>
    STATUS_PRIORITY[status] > STATUS_PRIORITY[worst] ? status : worst,
  );
}

function layoutNodes(nodes: Node[], edges: Edge[]): Node[] {
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({ rankdir: "TB", nodesep: 40, ranksep: 60 });

  for (const node of nodes) {
    graph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const edge of edges) {
    graph.setEdge(edge.source, edge.target);
  }

  dagre.layout(graph);

  return nodes.map((node) => {
    const positioned = graph.node(node.id);
    return {
      ...node,
      targetPosition: Position.Top,
      sourcePosition: Position.Bottom,
      position: {
        x: positioned.x - NODE_WIDTH / 2,
        y: positioned.y - NODE_HEIGHT / 2,
      },
    };
  });
}

function buildGraph(
  domain: DomainConfig,
  artifacts: ArtifactRow[],
): { nodes: Node[]; edges: Edge[] } {
  const topology = domain.topology;
  if (!topology) return { nodes: [], edges: [] };

  const domainArtifacts = artifacts.filter(
    (artifact) => artifact.domain === domain.domain,
  );

  const nodes: Node[] = topology.nodes.map((topoNode) => {
    const nodeArtifacts = domainArtifacts.filter(
      (artifact) => artifact.node === topoNode.id,
    );
    const data: MapNodeData = {
      label: topoNode.label,
      count: nodeArtifacts.length,
      worstStatus: worstStatus(nodeArtifacts.map((a) => a.status)),
    };
    return {
      id: topoNode.id,
      type: "mapNode",
      data,
      position: { x: 0, y: 0 },
    };
  });

  const edges: Edge[] = topology.edges.map((edge, index) => ({
    id: `${edge.from}-${edge.to}-${index}`,
    source: edge.from,
    target: edge.to,
    type: "default",
  }));

  return { nodes: layoutNodes(nodes, edges), edges };
}

const nodeTypes = { mapNode: MapNode };

export function SystemMap({ domain, artifacts, links: _links }: SystemMapProps) {
  const { nodes, edges } = useMemo(
    () => buildGraph(domain, artifacts),
    [domain, artifacts],
  );

  if (!domain.topology?.nodes.length) {
    return (
      <p className="av-empty">
        Add topology to domain config to see system map
      </p>
    );
  }

  return (
    <div
      className="h-[400px] w-full min-w-0"
      style={{ background: "var(--vscode-editor-background)" }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag
        zoomOnScroll
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={16} size={1} color="var(--vscode-panel-border)" />
      </ReactFlow>
    </div>
  );
}
