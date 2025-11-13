import {
  ConnectionLineComponentProps,
  getStraightPath,
  InternalNode,
  Node,
} from "@xyflow/react";
import { getEdgeParams } from "../helpers/helpers";
import { PlanetNodeData } from "../../hooks/usePlanetGraph";

function FloatingConnectionLine({
  toX,
  toY,
  fromNode,
}: ConnectionLineComponentProps<Node<PlanetNodeData>>) {
  if (!fromNode) {
    return null;
  }

  // Create a mock target node at the cursor position
  const targetNode = {
    id: "connection-target",
    measured: {
      width: 1,
      height: 1,
    },
    internals: {
      positionAbsolute: { x: toX, y: toY },
    },
  } as InternalNode<Node<PlanetNodeData>>;

  const { sx, sy, tx, ty } = getEdgeParams(fromNode, targetNode);

  const [edgePath] = getStraightPath({
    sourceX: sx,
    sourceY: sy,
    targetX: tx || toX,
    targetY: ty || toY,
  });

  return (
    <g>
      <path
        fill="none"
        stroke="#222"
        strokeWidth={1.5}
        className="animated"
        d={edgePath}
      />
      <circle
        cx={tx || toX}
        cy={ty || toY}
        fill="#fff"
        r={3}
        stroke="#222"
        strokeWidth={1.5}
      />
    </g>
  );
}

export default FloatingConnectionLine;
