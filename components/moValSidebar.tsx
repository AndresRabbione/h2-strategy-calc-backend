"use client";

import { createClient } from "@/utils/supabase/client";
import { useState } from "react";
import { TableNames } from "@/lib/typeDefinitions";

export default function MOValSidebar({
  id,
  valObj,
  tableName,
  onClose,
}: {
  id: number;
  valObj: { id: number; name: string }[];
  tableName: TableNames;
  onClose: () => void;
}) {
  const [nameValue, setName] = useState(valObj[0]?.name || "");
  const [nameChanged, setChanged] = useState(false);
  const [selectItemType] = useState(tableName === "item");
  const [selectedTable, setTable] = useState(tableName);

  async function handleEdit() {
    if (nameChanged) {
      const supabase = createClient();

      const { error, data } = await supabase
        .from(selectedTable)
        .update({ name: nameValue })
        .eq("id", id)
        .select();
      valObj = data as typeof valObj;
      setChanged(false);
    }
    //TODO: Add toast to confirm or fail
  }

  async function handleInsert() {
    const supabase = createClient();

    const { error, data } = await supabase
      .from(selectedTable)
      .insert([{ id: id, name: nameValue }])
      .select();

    //TODO: Add toast to confirm or fail
  }

  if (valObj.length === 0) {
    return (
      <div className="fixed">
        <div className="fixed inset-0 bg-black opacity-60 z-1"></div>
        <div
          id="val-edit-sidebar"
          className="h-full fixed top-0 right-0 z-2 overflow-x-hidden bg-white dark:bg-gray-700 dark:text-white pt-15 w-1/5 text-black"
        >
          <button
            className="fixed top-3 right-3 text-4xl mr-4 mt-0.5 justify-center dark:text-white text-black cursor-pointer rounded-full hover:bg-[#bdbcb968] h-10 w-10 transition-all delay-75 duration-100 ease-in-out"
            onClick={onClose}
          >
            &times;
          </button>
          <link
            rel="stylesheet"
            href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css"
          ></link>
          <div className="flex flex-col p-6 gap-4 h-full justify-between">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-0.5">
                <span className="pl-2">ID</span>
                <span className="border-1 p-2 rounded-md">{id}</span>
              </div>
              {selectItemType ? (
                <div className="flex flex-col gap-0.5">
                  <label className="pl-2" htmlFor="itemTypeSelect">
                    Table
                  </label>
                  <select
                    className="border-1 p-2 text-start rounded-md items-start justify-start placeholder-gray-400 bg-gray-800"
                    name="itemTypeSelect"
                    id="itemTypeSelect"
                    value={selectedTable}
                    onChange={(event) =>
                      setTable(event.target.value as TableNames)
                    }
                  >
                    <option value="item">Item</option>
                    <option value="stratagem">Stratagem</option>
                  </select>
                </div>
              ) : null}
              <div className="flex flex-col gap-0.5">
                <span className="pl-2">Name</span>
                <input
                  required
                  name="edit-content"
                  id="edit-content"
                  className="border-1 p-2 text-start rounded-md items-start justify-start placeholder-gray-400 bg-gray-800"
                  placeholder="Name..."
                  onChange={(e) => {
                    setName(e.target.value);
                    setChanged(true);
                  }}
                  value={nameValue}
                />
              </div>
            </div>
            <div className="flex flex-col justify-center items-center">
              <button
                disabled={!nameChanged}
                className="bg-[#001d3dcf] hover:bg-[#001d3d] dark:bg-green-800 dark:hover:bg-green-700 text-white font-bold py-2 px-4 rounded-full cursor-pointer w-full"
                onClick={handleInsert}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed">
      <div className="fixed inset-0 bg-black opacity-60 z-1"></div>
      <div
        id="val-edit-sidebar"
        className="h-full fixed top-0 right-0 z-2 overflow-x-hidden bg-white dark:bg-gray-700 dark:text-white pt-15 w-1/5 text-black"
      >
        <button
          className="fixed top-3 right-3 text-4xl mr-4 mt-0.5 justify-center dark:text-white text-black cursor-pointer rounded-full hover:bg-[#bdbcb968] h-10 w-10 transition-all delay-75 duration-100 ease-in-out"
          onClick={onClose}
        >
          &times;
        </button>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css"
        ></link>
        <div className="flex flex-col p-6 gap-4 h-full justify-between">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-0.5">
              <span className="pl-2">ID</span>
              <span className="border-1 p-2 rounded-md">{id}</span>
            </div>
            {selectItemType ? (
              <div className="flex flex-col gap-0.5">
                <label className="pl-2" htmlFor="itemTypeSelect">
                  Table
                </label>
                <select
                  className="border-1 p-2 text-start rounded-md items-start justify-start placeholder-gray-400 bg-gray-800"
                  name="itemTypeSelect"
                  id="itemTypeSelect"
                  value={selectedTable}
                  onChange={(event) =>
                    setTable(event.target.value as TableNames)
                  }
                >
                  <option value="item">Item</option>
                  <option value="stratagem">Stratagem</option>
                </select>
              </div>
            ) : null}
            <div className="flex flex-col gap-0.5">
              <span className="pl-2">Name</span>
              <input
                autoComplete="off"
                required
                name="edit-content"
                id="edit-content"
                className="border-1 p-2 text-start rounded-md items-start justify-start placeholder-gray-400 bg-gray-800"
                placeholder="Name..."
                onChange={(e) => {
                  setName(e.target.value);
                  setChanged(true);
                }}
                value={nameValue}
              />
            </div>
          </div>
          <div className="flex flex-col justify-center items-center">
            <button
              disabled={!nameChanged}
              className={`${
                nameChanged
                  ? "bg-[#001d3dcf] dark:bg-green-800 hover:bg-[#001d3d] dark:hover:bg-green-700 cursor-pointer font-bold"
                  : "bg-[#05470593]"
              }  text-white  py-2 px-4 rounded-full w-full transition-all duration-100 ease-in-out`}
              onClick={handleEdit}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
