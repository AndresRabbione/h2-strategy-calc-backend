"use client";

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import { TableNames } from "@/lib/typeDefinitions";
import "@/styles/sidebar.css";
import { Flip, toast, ToastContainer } from "react-toastify";

export default function MOValSidebar({
  id,
  valObj,
  tableName,
  onClose,
  onSave,
}: {
  id: number;
  valObj: { id: number; name: string }[];
  tableName: TableNames;
  onClose: () => void;
  onSave: () => void;
}) {
  const [nameValue, setName] = useState(valObj[0]?.name || "");
  const [nameChanged, setChanged] = useState(false);
  const [selectItemType] = useState(tableName === "item");
  const [selectedTable, setTable] = useState(tableName);
  const [isMounted, setMounted] = useState(false);
  const [isPending, setPending] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 10);

    return () => clearTimeout(timer);
  }, []);

  function handleClose() {
    setMounted(false);
    setTimeout(() => {
      onClose();
    }, 300);
  }

  async function handleEdit() {
    setPending(true);
    const supabase = createClient();

    const { error, data } = await supabase
      .from(selectedTable)
      .update({ name: nameValue })
      .eq("id", id)
      .select();

    setChanged(false);
    setPending(false);
    if (error) {
      toast.error("Something went wrong", {
        position: "bottom-left",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: false,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "dark",
        transition: Flip,
      });
    } else if (data) {
      toast.success("Changes saved", {
        position: "bottom-left",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: false,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "dark",
        transition: Flip,
      });
    }
    onSave();
  }

  async function handleInsert() {
    setPending(true);
    const supabase = createClient();

    const { error, data } = await supabase
      .from(selectedTable)
      .insert([{ id: id, name: nameValue }])
      .select();

    setPending(false);
    onSave();
    if (error) {
      toast.error(
        error.code ? `${error.code}: ${error.message}` : "Something went wrong",
        {
          position: "bottom-left",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: false,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "dark",
          transition: Flip,
        }
      );
    } else if (data) {
      toast.success("Changes saved", {
        position: "bottom-left",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: false,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "dark",
        transition: Flip,
      });
    }
  }

  if (valObj.length === 0) {
    return (
      <div>
        <ToastContainer
          position="bottom-left"
          autoClose={5000}
          limit={1}
          hideProgressBar={false}
          newestOnTop
          closeOnClick={false}
          rtl={false}
          draggable
          pauseOnHover
          theme="dark"
          transition={Flip}
        />
        <div
          className={`fixed inset-0 bg-black opacity-60 z-1 ${
            isMounted
              ? "overlay-fade-enter overlay-fade-enter-active"
              : "overlay-fade-enter overlay-fade-exit-active"
          }`}
        ></div>
        <div
          id="val-edit-sidebar"
          className={`h-full fixed top-0 right-0 z-2 overflow-x-hidden bg-white dark:bg-gray-700 dark:text-white pt-15 w-2/3 md:w-1/3 xl:w-1/5 text-black ${
            isMounted
              ? "sidebar-enter sidebar-enter-active"
              : "sidebar-enter sidebar-exit-active"
          }`}
        >
          <button
            className="fixed top-3 right-3 text-4xl mr-4 mt-0.5 justify-center dark:text-white text-black cursor-pointer rounded-full hover:bg-[#bdbcb968] h-10 w-10 transition-all delay-75 duration-100 ease-in-out"
            onClick={handleClose}
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
                disabled={isPending || (!nameChanged && nameValue.length > 0)}
                className={`bg-[#001d3dcf] hover:bg-[#001d3d] dark:bg-green-800 dark:hover:bg-green-700 text-white font-bold py-2 px-4 rounded-full cursor-pointer w-full hover:motion-reduce:animate-bounce`}
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
    <div>
      <ToastContainer
        position="bottom-left"
        autoClose={5000}
        limit={1}
        hideProgressBar={false}
        newestOnTop
        closeOnClick={false}
        rtl={false}
        draggable
        pauseOnHover
        theme="dark"
        transition={Flip}
      />
      <div
        className={`fixed inset-0 bg-black opacity-60 z-1 ${
          isMounted
            ? "overlay-fade-enter overlay-fade-enter-active"
            : "overlay-fade-enter overlay-fade-exit-active"
        }`}
      ></div>
      <div
        id="val-edit-sidebar"
        className={`h-full fixed top-0 right-0 z-2 overflow-x-hidden bg-white dark:bg-gray-700 dark:text-white pt-15 w-2/3 md:w-1/3 xl:w-1/5 text-black ${
          isMounted
            ? "sidebar-enter sidebar-enter-active"
            : "sidebar-exit sidebar-exit-active"
        }`}
      >
        <button
          className="fixed top-3 right-3 text-4xl mr-4 mt-0.5 justify-center dark:text-white text-black cursor-pointer rounded-full hover:bg-[#bdbcb968] h-10 w-10 transition-all delay-75 duration-100 ease-in-out"
          onClick={handleClose}
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
              type="button"
              disabled={isPending || (!nameChanged && nameValue.length > 0)}
              className={`${
                nameChanged
                  ? "bg-[#001d3dcf] dark:bg-green-800 hover:bg-[#001d3d] dark:hover:bg-green-700 cursor-pointer font-bold"
                  : "bg-[#05470593]"
              }  text-white  py-2 px-4 rounded-full w-full transition-all duration-100 ease-in-out`}
              onClick={handleEdit}
            >
              {isPending ? (
                <svg
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="fixed mr-3 -ml-1 size-7 animate-spin text-white"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="white"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="white"
                    d="M 4 12 a 8 8 0 0 1 8 -8 V 0 C 5.373 0 0 5.373 0 12 h 4 Z m 2 5.291 A 7.962 7.962 0 0 1 4 12 H 0 c 0 3.042 1.135 5.824 3 7.938 l 3 -2.647 Z"
                  ></path>
                </svg>
              ) : null}
              {!isPending ? "Save" : "Saving"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
