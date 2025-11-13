"use client";

import { DBLinks } from "@/utils/strategies/routing";
import { usePlanetGraph } from "../../hooks/usePlanetGraph";
import GraphHeader from "./GraphHeader";
import GraphCanvas from "./graphCanvas";
import Inspector from "./inspector";
import "@xyflow/react/dist/style.css";
import { GraphDBPlanet } from "../page";

export default function LinkGraphContainer({
  planets,
  supplyLines,
}: {
  planets: GraphDBPlanet[];
  supplyLines: DBLinks[];
}) {
  const graph = usePlanetGraph(planets, supplyLines);

  return (
    <div className="flex flex-col bg-gray-900 text-gray-100">
      <GraphHeader
        addMode={graph.addMode}
        setAddMode={graph.setAddMode}
        onDelete={graph.handleDeleteSelected}
        selectedElement={graph.selectedElement}
        restorePriorState={graph.restorePriorState}
        isSaving={graph.isSaving}
        hasEdits={
          graph.linkIdsToInsert.length > 0 ||
          graph.linksToDelete.length > 0 ||
          graph.planetsToUpdate.length > 0 ||
          graph.linksToUpdate.length > 0
        }
        finalizeEdits={graph.finalizeEdits}
        setReport={graph.setReport}
      ></GraphHeader>

      <div className="flex flex-1">
        <main className="flex-1 h-[calc(100vh-64px-54.4px)] relative">
          <GraphCanvas {...graph}></GraphCanvas>
        </main>

        <aside className="w-96 border-l border-gray-800 bg-gray-950 p-4">
          <Inspector {...graph}></Inspector>
        </aside>
      </div>
    </div>
  );
}
