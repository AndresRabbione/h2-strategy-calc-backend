import { Edge, EdgeProps, getStraightPath, MarkerType } from "@xyflow/react";

import { PlanetLink } from "../../hooks/usePlanetGraph";

function FloatingEdge({
  id,
  style,
  sourceX,
  sourceY,
  targetX,
  targetY,
}: EdgeProps<Edge<PlanetLink>>) {
  const [edgePath] = getStraightPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  return (
    <path
      id={id}
      className="react-flow__edge-path"
      d={edgePath}
      markerEnd={MarkerType.ArrowClosed}
      style={style}
    />
  );
}

export default FloatingEdge;
