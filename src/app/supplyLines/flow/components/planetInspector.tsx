import { Node } from "@xyflow/react";
import { PlanetNodeData } from "../../hooks/usePlanetGraph";
import { useEffect, useState } from "react";

export default function PlanetInspector({
  node,
  updatePlanetData,
  isSaving,
}: {
  node: Node<PlanetNodeData>;
  updatePlanetData: (nodeId: string, disabled: boolean) => void;
  isSaving: boolean;
}) {
  const [disabledState, setDisabled] = useState(node.data.disabled);

  useEffect(() => setDisabled(node.data.disabled), [node]);

  return (
    <div>
      <h3 className="font-medium">Planet</h3>

      <div className="flex flex-col mt-2 text-sm">
        <span>
          <strong>ID:</strong> {node.id}
        </span>
        <span>
          <strong>Name:</strong> {node.data.name}
        </span>

        <div className="flex items-center gap-2">
          <label htmlFor="planetDisabled" className="text-sm">
            <strong>Disabled</strong>
          </label>
          <input
            id="planetDisabled"
            type="checkbox"
            checked={disabledState}
            onChange={(e) => {
              setDisabled(e.target.checked);
            }}
          />
        </div>

        <div className="pt-2">
          <button
            onClick={() => {
              updatePlanetData(node.id, disabledState);
            }}
            disabled={isSaving}
            className="px-3 py-1 rounded-md border border-green-500 bg-green-700/30 text-sm font-medium cursor-pointer hover:ring hover:ring-green-600/80 transition-all duration-300 ease-in-out"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
