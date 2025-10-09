"use client";

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import "@/styles/sidebar.css";
import { Flip, toast, ToastContainer } from "react-toastify";
import { sidebarToastConfig } from "@/lib/constants";

type RegionSize = "Town" | "Settlement" | "City" | "MegaCity";
const defaultRegion = {
  id: -1,
  name: "",
  size: "Town" as RegionSize,
};
export default function RegionsSidebar({
  region,
  planet,
  onClose,
  onDelete,
  allPlanets,
}: {
  region: {
    id: number;
    name: string;
    size: RegionSize;
  } | null;
  planet: { id: number; name: string } | null;
  onClose: (needsRefresh: boolean) => void;
  onDelete: () => void;
  allPlanets: { id: number; name: string }[];
}) {
  const [regionChanged, setRegionChanged] = useState(false);
  const [planetChanged, setPlanetChanged] = useState(false);
  const [planetState, setPlanet] = useState(planet);
  const [isMounted, setMounted] = useState(false);
  const [isSavePending, setSavePending] = useState(false);
  const [isDeletePending, setDeletePending] = useState(false);
  const [regionState, setRegion] = useState(region ?? defaultRegion);
  const [planets] = useState<{ id: number; name: string }[]>(allPlanets);
  const [deleteClicked, setDeleteClicked] = useState(false);
  const [edited, setEdited] = useState(false);
  const [isInserting, setInsertionState] = useState(!region);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 10);

    return () => clearTimeout(timer);
  }, []);

  function handleClose() {
    setDeleteClicked(false);
    setMounted(false);

    setTimeout(() => {
      onClose(edited);
    }, 300);
  }

  function isValidRegion(currentRegion: {
    id: number;
    name: string;
    size: RegionSize;
  }) {
    console.log(currentRegion !== null && currentRegion.name !== "");
    return currentRegion !== null && currentRegion.name !== "";
  }

  async function handleEdit() {
    setSavePending(true);

    const supabase = createClient();

    if (regionChanged && isValidRegion(regionState)) {
      setEdited(true);

      const { error: regionError, data: regionData } = await supabase
        .from("planet_region")
        .update({ name: regionState.name, size: regionState.size })
        .eq("id", regionState.id)
        .select()
        .single();

      setRegionChanged(false);

      if (regionError) {
        toast.error(regionError.message, sidebarToastConfig);
      }

      if (regionData) {
        toast.success("Region edited successfully", sidebarToastConfig);
        setInsertionState(true);
      }
    }

    if (planetState && planetChanged && regionState) {
      setEdited(true);

      const { error: regionError, data: regionData } = await supabase
        .from("planet_region")
        .update({ planet_id: planetState.id })
        .eq("id", regionState.id)
        .select()
        .single();

      setRegionChanged(false);

      if (regionError) {
        toast.error(regionError.message, sidebarToastConfig);
      }

      if (regionData) {
        toast.success("Region edited successfully", sidebarToastConfig);
        setInsertionState(true);
      }
    }

    setSavePending(false);
  }

  async function handleInsert() {
    if (!planetState && !isValidRegion(regionState)) return;

    setEdited(true);
    setSavePending(true);

    const supabase = createClient();

    const { error, data } = await supabase
      .from("planet_region")
      .insert({
        id: regionState!.id,
        planet_id: planetState!.id,
        name: regionState!.name,
        size: regionState!.size,
      })
      .select()
      .single();

    setRegionChanged(false);
    setPlanetChanged(false);
    setSavePending(false);

    if (error) {
      toast.error(error.message, sidebarToastConfig);
    } else if (data) {
      toast.success("Region created", sidebarToastConfig);
      setRegion(data);
    }
  }

  async function handleDelete() {
    setEdited(true);
    setDeleteClicked(false);
    setDeletePending(true);

    const supabase = createClient();

    const { error } = await supabase
      .from("planet_region")
      .delete()
      .eq("id", regionState!.id);

    setDeletePending(false);

    if (error) {
      toast.error(error.message, sidebarToastConfig);
    } else {
      onDelete();
      handleClose();
    }
  }

  return (
    <div>
      <ToastContainer
        position="bottom-left"
        autoClose={5000}
        limit={3}
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
        onClick={() => {
          if (deleteClicked) setDeleteClicked(false);
        }}
        id="val-edit-sidebar"
        className={`h-full fixed top-0 right-0 z-2 overflow-x-hidden bg-white dark:bg-gray-700 dark:text-white pt-15 w-4/5 md:w-1/3 xl:w-1/5 text-black ${
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
        <div className="flex flex-col pt-3 p-6 gap-4 h-full justify-between">
          <div className="flex flex-col gap-4 items-center">
            <div className="flex flex-col gap-1 w-full">
              <label className="pl-2" htmlFor="regionName">
                Name
              </label>
              <div className="flex gap-1">
                <input
                  type="text"
                  id="regionName"
                  autoComplete="off"
                  required
                  name="regionName"
                  className="w-full border-1 p-2 text-start rounded-md items-start justify-start placeholder-gray-400 bg-gray-800"
                  placeholder="Name..."
                  onChange={(event) => {
                    setRegion({
                      ...regionState!,
                      name: event.target.value,
                    });
                    setRegionChanged(true);
                  }}
                  value={regionState.name}
                />
              </div>
              <div className="flex flex-col gap-1 w-full">
                <label className="pl-2" htmlFor="sizeSelect">
                  Size
                </label>
                <select
                  required
                  className="border-1 p-2 text-start rounded-md items-start justify-start placeholder-gray-400 bg-gray-800"
                  name="sizeSelect"
                  id="sizeSelect"
                  value={regionState.size}
                  onChange={(event) => {
                    setRegion({
                      ...regionState,
                      size: event.target.value as RegionSize,
                    });
                    setPlanetChanged(true);
                  }}
                >
                  <option value="Town">Town</option>
                  <option value="Settlement">Settlement</option>
                  <option value="City">City</option>
                  <option value="MegaCity">MegaCity</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1 w-full">
              <label className="pl-2" htmlFor="planetSelect">
                Planet
              </label>
              <select
                required
                className="border-1 p-2 text-start rounded-md items-start justify-start placeholder-gray-400 bg-gray-800"
                name="planetSelect"
                id="planetSelect"
                value={
                  planetState
                    ? `${planetState.id}-${planetState.name}`
                    : "default"
                }
                onChange={(event) => {
                  const formattedValues = event.target.value.split("-");
                  setPlanet({
                    id: Number(formattedValues[0]),
                    name: formattedValues[1],
                  });
                  setPlanetChanged(true);
                }}
              >
                {!planetState ? (
                  <option value="default" disabled>
                    Planet...
                  </option>
                ) : null}
                {planets
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((planet, index) => (
                    <option
                      key={`${planet.id}-${index}`}
                      value={`${planet.id}-${planet.name}`}
                    >
                      {planet.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col justify-center items-center gap-3">
            <button
              type="button"
              disabled={
                isSavePending ||
                isDeletePending ||
                (!regionState && !planetState) ||
                (!planetChanged && !regionChanged) ||
                !isValidRegion(regionState)
              }
              className={`${
                (planetChanged || regionChanged) &&
                planetState &&
                !isSavePending &&
                isValidRegion(regionState)
                  ? "bg-[#001d3dcf] dark:bg-green-800 hover:bg-[#001d3d] dark:hover:bg-green-700 cursor-pointer font-bold"
                  : "bg-[#05470593]"
              }  text-white  py-2 px-4 rounded-full w-full transition-all duration-100 ease-in-out`}
              onClick={isInserting ? handleInsert : handleEdit}
            >
              {isSavePending ? (
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
              {!isSavePending && !isInserting
                ? "Save"
                : !isInserting && isSavePending
                ? "Saving"
                : isInserting && !isSavePending
                ? "Insert"
                : "Inserting"}
            </button>
            {!isInserting ? (
              <button
                type="button"
                disabled={isSavePending || isDeletePending}
                className={`${
                  !isDeletePending || deleteClicked
                    ? "bg-[#001d3dcf] dark:bg-red-900 hover:bg-[#001d3d] dark:hover:bg-red-800 cursor-pointer font-bold"
                    : "bg-[#47050593]"
                }  text-white  py-2 px-4 rounded-full w-full transition-all duration-100 ease-in-out`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (deleteClicked) {
                    handleDelete();
                  } else {
                    setDeleteClicked(true);
                  }
                }}
              >
                {isDeletePending ? (
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
                {!isDeletePending && !deleteClicked
                  ? "Delete"
                  : deleteClicked && !isDeletePending
                  ? "Are you sure?"
                  : "Deleting"}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
