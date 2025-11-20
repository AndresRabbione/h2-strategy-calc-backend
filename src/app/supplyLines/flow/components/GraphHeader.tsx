"use client";

import { Dispatch, SetStateAction } from "react";
import { FinalReport } from "../../hooks/usePlanetGraph";

export default function GraphHeader({
  addMode,
  setAddMode,
  onDelete,
  selectedElement,
  restorePriorState,
  hasEdits,
  finalizeEdits,
  setReports,
  isSaving,
}: {
  addMode: boolean;
  setAddMode: Dispatch<SetStateAction<boolean>>;
  onDelete: () => void;
  selectedElement: {
    type: "node" | "edge";
    id: string;
  } | null;
  restorePriorState: () => void;
  hasEdits: boolean;
  finalizeEdits: () => Promise<FinalReport>;
  setReports: Dispatch<SetStateAction<FinalReport[]>>;
  isSaving: boolean;
}) {
  const saveChanges = async () => {
    const report = await finalizeEdits();

    setReports((prev) => [...prev, report]);
  };

  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
      <h1 className="text-lg font-semibold">Supply Line Editor</h1>
      <div className="flex items-center justify-between gap-5">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAddMode((prev) => !prev)}
            disabled={isSaving}
            className={`px-3 py-1 rounded-md text-sm font-medium cursor-pointer border hover:ring ${
              addMode
                ? "border-green-400 bg-green-700/30 hover:ring-green-700/80"
                : !isSaving
                ? "border-gray-700 bg-transparent hover:ring-gray-700/60"
                : "bg-transparent border-gray-800/20"
            } transition-all duration-300 ease-in-out`}
          >
            {addMode ? "Click two planets to link together" : "Add Link"}
          </button>
          <button
            onClick={onDelete}
            disabled={!selectedElement || isSaving}
            className={`px-3 py-1 rounded-md text-sm font-medium border ${
              selectedElement && !isSaving
                ? "border-red-600 bg-red-700/30 cursor-pointer hover:ring hover:ring-red-700/60 transition-all duration-300 ease-in-out"
                : "border-red-900/20 bg-red-700/10 text-white/60"
            }`}
          >
            Delete
          </button>
        </div>

        {hasEdits && !isSaving && (
          <div className="flex items-center gap-2">
            <button
              onClick={saveChanges}
              className="px-3 py-1 rounded-md text-sm font-medium border border-green-400 bg-green-700/30 cursor-pointer"
            >
              Confirm
            </button>
            <button
              onClick={restorePriorState}
              className="px-3 py-1 rounded-md text-sm font-medium border border-gray-700 bg-transparent cursor-pointer"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
