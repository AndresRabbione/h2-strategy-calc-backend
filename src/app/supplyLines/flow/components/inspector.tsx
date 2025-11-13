"use client";

import { Edge, Node } from "@xyflow/react";
import {
  FinalReport,
  PlanetLink,
  PlanetNodeData,
} from "../../hooks/usePlanetGraph";
import PlanetInspector from "./planetInspector";
import LinkInspector from "./linkInspector";
import InspectorReport from "./inspectorReport";
import { Dispatch, SetStateAction } from "react";

export default function Inspector({
  selectedElement,
  selectedNode,
  selectedEdge,
  updateLinkData,
  updatePlanetData,
  saveReport,
  setReport,
  isSaving,
}: {
  selectedElement: {
    type: "node" | "edge";
    id: string;
  } | null;
  selectedNode: Node<PlanetNodeData> | undefined;
  selectedEdge: Edge<Partial<PlanetLink>> | undefined;
  updateLinkData: (edgeId: string, patch: Partial<PlanetLink>) => void;
  updatePlanetData: (nodeId: string, disabled: boolean) => void;
  saveReport: FinalReport | null;
  setReport: Dispatch<SetStateAction<FinalReport | null>>;
  isSaving: boolean;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">Inspector</h2>

      {!selectedElement && (
        <div className="text-sm text-gray-400">
          Select a planet or link to inspect its properties
        </div>
      )}

      {selectedNode && (
        <PlanetInspector
          node={selectedNode}
          updatePlanetData={updatePlanetData}
          isSaving={isSaving}
        ></PlanetInspector>
      )}
      {selectedEdge && (
        <LinkInspector
          edge={selectedEdge}
          updateLinkData={updateLinkData}
          isSaving={isSaving}
        ></LinkInspector>
      )}

      {saveReport || isSaving ? (
        <InspectorReport
          saveReport={saveReport}
          onClear={() => setReport(null)}
          isSaving={isSaving}
        ></InspectorReport>
      ) : (
        <div className="mt-6 border-t border-gray-800 pt-4 text-sm text-gray-400">
          <div className="mb-2">Quick tips</div>
          <ul className="list-disc pl-5 space-y-1">
            <li>Drag planets to rearrange them.</li>
            <li>
              Click &quot;Add Link&quot; then click two planets to create an
              link.
            </li>
            <li>
              Select a planet or link to edit its properties, clicking
              &quot;Save Changes&quot; stashes them.
            </li>
            <li>
              Stashed changes are not uploaded until you confirm them by
              clicking &quot;Confirm&quot;.
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
