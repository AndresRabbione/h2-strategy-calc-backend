"use client";

import { Handle, Node, NodeProps, Position } from "@xyflow/react";
import { PlanetNodeData } from "../../hooks/usePlanetGraph";
import { memo } from "react";
import { getFactionColorFromId } from "@/utils/parsing/colors";
import { FactionIDs } from "@/lib/typeDefinitions";

function PlanetNode({ id, data, selected }: NodeProps<Node<PlanetNodeData>>) {
  const factionColor = getFactionColorFromId(data.current_faction, false);

  return (
    <div
      className={`flex items-center justify-center relative w-35 h-16 p-3 rounded-lg border bg-linear-to-b from-slate-800/70 to-black/20 ${
        selected
          ? `ring-2 ${
              data.current_faction === FactionIDs.HUMANS
                ? "ring-super-earth-blue/50"
                : data.current_faction === FactionIDs.AUTOMATONS
                ? "ring-automaton/50"
                : data.current_faction === FactionIDs.ILLUMINATE
                ? "ring-illuminate/50"
                : "ring-terminid/50"
            }`
          : ""
      } shadow-[0_6px_18px_rgba(0,200,255,0.04)] transition-all duration-150 ease-in-out`}
      style={{ borderColor: factionColor }}
    >
      <div className="text-sm font-semibold text-cyan-100 text-center">
        {data.name}
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-2 bg-linear-to-r from-transparent via-white/5 to-transparent opacity-20" />

      <div className="hidden">
        <Handle type="target" position={Position.Left} id={`t-${id}`} />
        <Handle type="source" position={Position.Right} id={`s-${id}`} />
      </div>
    </div>
  );
}

export default memo(PlanetNode);
