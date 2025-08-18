"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";

export default function MOValEditor({
  id,
  valObj,
  tableName,
  onClose,
}: {
  id: number;
  valObj: { id: number; name: string }[];
  tableName: string;
  onClose: () => void;
}) {
  const [isEditing, setEditing] = useState(false);
  const [nameValue, setName] = useState(valObj[0]?.name || "");

  async function handleEdit() {
    const supabase = createClient();

    const { error, data } = await supabase
      .from(tableName)
      .update({ name: nameValue })
      .select();

    setEditing(false);

    //TODO: Add toast to confirm or fail
    onClose();
  }

  async function handleInsert() {
    const supabase = createClient();

    const { error, data } = await supabase
      .from(tableName)
      .insert([{ id: id, name: nameValue }])
      .select();

    //TODO: Add toast to confirm or fail
    onClose();
  }

  if (valObj.length === 0) {
    return (
      <div className="flex flex-col items-center gap-6 bg-gray-700 w-fit p-5 self-center text-center rounded shadow">
        <div className="fixed inset-0 bg-black opacity-60 z-1"></div>
        <div className="flex flex-row">
          <div className="flex flex-col w-1/2">
            <span className="text-2xl font-semibold">ID</span>
            <span className="text-xl">{id}</span>
          </div>
          <div className="flex flex-col w-1/2">
            <span className="text-2xl font-semibold">Name</span>
            <input
              className="text-xl text-center shadow rounded border-1 border-black"
              value={nameValue}
              onChange={(e) => setName(e.target.value)}
            ></input>
          </div>
        </div>
        <div className="flex items-center justify-end self-end gap-3">
          <button onClick={handleInsert}>Create</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 bg-gray-700 w-fit p-5 self-center text-center rounded shadow">
      <div className="flex flex-row">
        <div className="flex flex-col w-1/2">
          <span className="text-2xl font-semibold">ID</span>
          <span className="text-xl">{valObj[0].id}</span>
        </div>
        <div className="flex flex-col w-1/2">
          <span className="text-2xl font-semibold">Name</span>
          <input
            className="text-xl text-center"
            disabled={!isEditing}
            value={nameValue}
            onChange={(e) => setName(e.target.value)}
          ></input>
        </div>
      </div>
      <div className="flex items-center justify-end self-end gap-3">
        <button onClick={() => setEditing((prev) => !prev)}>Edit</button>
        <button disabled={!isEditing} onClick={handleEdit}>
          Save
        </button>
      </div>
    </div>
  );
}
