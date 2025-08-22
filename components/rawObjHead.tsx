"use client";

import { Task } from "@/lib/typeDefinitions";
import { useEffect, useState } from "react";
import MOValSidebar from "./moValSidebar";
import { createClient } from "@/utils/supabase/client";

export default function RawObjHeader({
  objective,
  parsedObjective,
}: {
  objective: Task;
  parsedObjective: { id: number; name: string }[] | null;
}) {
  const [isSidebarOpen, setOpen] = useState(false);
  const [submitted, setSubmit] = useState(false);
  const [objState, setObj] = useState(parsedObjective);

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();
      const { data } = await supabase
        .from("objectiveType")
        .select("*")
        .eq("id", objective.type);
      if (data) setObj(data);
    }

    if (submitted) {
      fetchData();
      setSubmit(false);
    }
  }, [submitted]);
  return (
    <div className="flex flex-row gap-3">
      <span>Type:</span>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className={`flex items-center font-light cursor-pointer transition-transform hover:scale-105 ${
          !objState || objState.length === 0 ? "text-yellow-400" : ""
        }`}
      >
        {objState && objState.length > 0
          ? objState[0].name
          : String(objective.type) + "! Unkwown"}
      </button>
      {isSidebarOpen ? (
        <MOValSidebar
          id={objective.type}
          valObj={objState ?? []}
          tableName="objectiveType"
          onClose={() => setOpen(false)}
          onSave={() => setSubmit(true)}
        ></MOValSidebar>
      ) : null}
    </div>
  );
}
