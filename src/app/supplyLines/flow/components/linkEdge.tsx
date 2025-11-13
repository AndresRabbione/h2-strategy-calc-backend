"use client";

import {
  Edge,
  EdgeProps,
  getStraightPath,
  useInternalNode,
} from "@xyflow/react";
import { PlanetLink } from "../../hooks/usePlanetGraph";
import { getEdgeParams } from "../helpers/helpers";

export default function LinkEdge({
  id,
  data,
  style,
  source,
  target,
}: EdgeProps<Edge<PlanetLink>>) {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);

  if (!sourceNode || !targetNode) {
    return null;
  }

  const { sx, sy, tx, ty } = getEdgeParams(sourceNode, targetNode);

  const [edgePath] = getStraightPath({
    sourceX: sx,
    sourceY: sy,
    targetX: tx,
    targetY: ty,
  });
  const isDisabled =
    (data?.origin_disabled || data?.destination_disabled) ?? false;

  return (
    <g className="react-flow__edge-path">
      <path
        id={id}
        d={edgePath}
        strokeWidth={isDisabled ? 1 : 2}
        stroke={isDisabled ? "#6b7280" : "#60a5fa"}
        fill="none"
        strokeDasharray={isDisabled ? "10 6" : undefined}
        style={style}
      />
    </g>
  );
}
