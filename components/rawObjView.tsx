"use client";

import { Task } from "@/lib/typeDefinitions";
import { useState } from "react";
import MOValSidebar from "./moValSidebar";

export default function RawObjHeader({
  objective,
  parsedObjective,
}: {
  objective: Task;
  parsedObjective: { id: number; name: string }[] | null;
}) {
  const [isSidebarOpen, setOpen] = useState(false);
  return (
    <div className="flex flex-row gap-3">
      <span>Type:</span>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className={`flex items-center font-light cursor-pointer transition-transform hover:scale-105 ${
          !parsedObjective || parsedObjective.length === 0
            ? "text-yellow-400"
            : ""
        }`}
      >
        {parsedObjective && parsedObjective.length > 0
          ? parsedObjective[0].name
          : String(objective.type) + "! Unkwown"}
      </button>
      {isSidebarOpen ? (
        <MOValSidebar
          id={objective.type}
          valObj={parsedObjective ?? []}
          tableName="objectiveType"
          onClose={() => setOpen(false)}
        ></MOValSidebar>
      ) : null}
    </div>
  );
}
