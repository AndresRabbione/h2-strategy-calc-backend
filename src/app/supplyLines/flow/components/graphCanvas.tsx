"use client";

import {
  Background,
  Controls,
  Edge,
  Node,
  NodeMouseHandler,
  OnConnect,
  OnEdgesChange,
  OnNodeDrag,
  OnNodesChange,
  OnSelectionChangeParams,
  ReactFlow,
} from "@xyflow/react";
import {
  GraphInstance,
  PlanetLink,
  PlanetNodeData,
} from "../../hooks/usePlanetGraph";
import PlanetNode from "./PlanetNode";
import LinkEdge from "./linkEdge";
import FloatingConnectionLine from "./floatingConnection";

type CanvasProps = {
  nodes: Node<PlanetNodeData>[];
  edges: Edge<Partial<PlanetLink>>[];
  onNodesChange: OnNodesChange<Node<PlanetNodeData>>;
  onEdgesChange: OnEdgesChange<Edge<Partial<PlanetLink>>>;
  onConnect: OnConnect;
  onSelectionChange: (selection: OnSelectionChangeParams) => void;
  setRfInstance: (instance: GraphInstance) => GraphInstance;
  onNodeDragStop: OnNodeDrag<Node<PlanetNodeData>>;
  onNodeClick: NodeMouseHandler<Node<PlanetNodeData>>;
};

const NODE_HEIGHT = 64;
const NODE_WIDTH = 140;

export default function GraphCanvas({
  nodes,
  edges,
  onConnect,
  onEdgesChange,
  onNodesChange,
  onSelectionChange,
  setRfInstance,
  onNodeDragStop,
  onNodeClick,
}: CanvasProps) {
  return (
    <ReactFlow
      proOptions={{ hideAttribution: true }}
      onlyRenderVisibleElements
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onNodeClick={onNodeClick}
      onInit={(instance: GraphInstance) => {
        requestAnimationFrame(() => {
          const { innerWidth, innerHeight } = window;
          instance.setViewport({
            x: innerWidth / 2.5 - NODE_WIDTH / 2,
            y: innerHeight / 2.5 - NODE_HEIGHT / 2,
            zoom: 1,
          });
        });

        setRfInstance(instance);
      }}
      onSelectionChange={(selection) =>
        onSelectionChange({ nodes: selection.nodes, edges: selection.edges })
      }
      connectionLineComponent={FloatingConnectionLine}
      nodeTypes={{ planet: PlanetNode }}
      edgeTypes={{ link: LinkEdge }}
      defaultEdgeOptions={{
        type: "link",
        interactionWidth: 25,
        selectable: true,
      }}
      onNodeDragStop={onNodeDragStop}
    >
      <Background gap={16} size={1} />
      <Controls className="text-black"></Controls>
    </ReactFlow>
  );
}
