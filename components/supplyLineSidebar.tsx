"use client";

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import "@/styles/sidebar.css";
import { Flip, toast, ToastContainer } from "react-toastify";
import { sidebarToastConfig } from "@/lib/constants";

export default function SupplyLineSidebar({
  linkId,
  originPlanet,
  destinationPlanet,
  bidirectional,
  onClose,
  onDelete,
}: {
  linkId: number;
  originPlanet: { id: number; name: string; disabled: boolean } | null;
  destinationPlanet: { id: number; name: string; disabled: boolean } | null;
  bidirectional: boolean | null;
  onClose: (needsRefresh: boolean) => void;
  onDelete: () => void;
}) {
  const [originChanged, setOriginChanged] = useState(false);
  const [destinationChanged, setDestinationChanged] = useState(false);
  const [directionChanged, setDirectionChanged] = useState(false);
  const [originState, setOrigin] = useState(originPlanet);
  const [destinationState, setDestination] = useState(destinationPlanet);
  const [isMounted, setMounted] = useState(false);
  const [isSavePending, setSavePending] = useState(false);
  const [isDeletePending, setDeletePending] = useState(false);
  const [directionState, setDirection] = useState(bidirectional ?? true);
  const [linkState, setLink] = useState(linkId);
  const [planets, setPlanets] = useState<
    { disabled: boolean; id: number; name: string }[]
  >([]);
  const [deleteClicked, setDeleteClicked] = useState(false);
  const [edited, setEdited] = useState(false);

  function findPlanetStatus(id: number): boolean {
    const found = planets.find((planet) => planet.id === id);

    return found?.disabled ?? false;
  }

  useEffect(() => {
    async function fetchPlanets() {
      const supabase = createClient();

      const { data } = await supabase.from("planet").select("*");
      setPlanets(data ?? []);
    }

    fetchPlanets();

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

  async function handleEdit() {
    setSavePending(true);

    const supabase = createClient();

    if (originChanged && originState) {
      setEdited(true);

      const { error: linkError, data: linkData } = await supabase
        .from("supplyLine")
        .update({ planetId: originState.id, bidirectional: directionState })
        .eq("id", linkState)
        .select();

      const { error: planetError, data: planetData } = await supabase
        .from("planet")
        .update({ disabled: originState.disabled })
        .eq("id", originState.id)
        .select();

      setOriginChanged(false);

      if (linkError) {
        toast.error(
          linkError.code
            ? `${linkError.code}: ${linkError.message}`
            : "Something went wrong",
          sidebarToastConfig
        );
      }

      if (planetError) {
        toast.error(
          "Changes to the origin planet could not be saved",
          sidebarToastConfig
        );
      }

      if (linkData && planetData) {
        toast.success("Origin updated successfully", sidebarToastConfig);
      }
    }

    if (destinationChanged && destinationState) {
      setEdited(true);

      const { error: linkError, data: linkData } = await supabase
        .from("supplyLine")
        .update({
          linkedPlanetId: destinationState.id,
          bidirectional: directionState,
        })
        .eq("id", linkState)
        .select();

      const { error: planetError, data: planetData } = await supabase
        .from("planet")
        .update({ disabled: destinationState.disabled })
        .eq("id", destinationState.id)
        .select();

      setDestinationChanged(false);

      if (linkError) {
        toast.error(
          linkError.code
            ? `${linkError.code}: ${linkError.message}`
            : "Something went wrong",
          sidebarToastConfig
        );
      }

      if (planetError) {
        toast.error(
          "Changes to the linked planet could not be saved",
          sidebarToastConfig
        );
      }

      if (linkData && planetData) {
        toast.success("Destination updated successfully", sidebarToastConfig);
      }
    }

    if (directionChanged && !destinationChanged && !originChanged) {
      setEdited(true);

      const { error: linkError, data: linkData } = await supabase
        .from("supplyLine")
        .update({
          bidirectional: directionState,
        })
        .eq("id", linkState)
        .select();

      setDirectionChanged(false);

      if (linkError) {
        toast.error(
          linkError.code
            ? `${linkError.code}: ${linkError.message}`
            : "Something went wrong",
          sidebarToastConfig
        );
      }

      if (linkData) {
        toast.success("Direction updated successfully", sidebarToastConfig);
      }
    }

    if (directionChanged) setDirectionChanged(false);

    setSavePending(false);
  }

  async function handleInsert() {
    if (!originState || !destinationState) return;

    setEdited(true);
    setSavePending(true);

    const supabase = createClient();

    const { error, data } = await supabase
      .from("supplyLine")
      .insert({
        planetId: originState?.id,
        linkedPlanetId: destinationState?.id,
        bidirectional: directionState,
      })
      .select();

    setOriginChanged(false);
    setDestinationChanged(false);
    setDirectionChanged(false);
    setSavePending(false);

    if (error) {
      toast.error(
        error.code ? `${error.code}: ${error.message}` : "Something went wrong",
        sidebarToastConfig
      );
    } else if (data) {
      toast.success("Link created", sidebarToastConfig);
      setLink(data[0].id);
    }
  }

  async function handleDelete() {
    setEdited(true);
    setDeleteClicked(false);
    setDeletePending(true);

    const supabase = createClient();

    const { error } = await supabase
      .from("supplyLine")
      .delete()
      .eq("id", linkState);

    setDeletePending(false);

    if (error) {
      toast.error(
        error.code
          ? `${error.code}: ${error.message}`
          : "Link couldn't be deleted",
        sidebarToastConfig
      );
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
        <div className="flex flex-col p-6 gap-4 h-full justify-between">
          <div className="flex flex-col gap-4 items-center">
            <div className="flex flex-col gap-1 w-full">
              <label className="pl-2" htmlFor="originSelect">
                Origin
              </label>
              <select
                required
                className="border-1 p-2 text-start rounded-md items-start justify-start placeholder-gray-400 bg-gray-800"
                name="originSelect"
                id="originSelect"
                value={
                  originState
                    ? `${originState?.id}-${originState?.name}`
                    : "default"
                }
                onChange={(event) => {
                  const formattedValues = event.target.value.split("-");
                  setOrigin({
                    id: Number(formattedValues[0]),
                    name: formattedValues[1],
                    disabled: findPlanetStatus(Number(formattedValues[0])),
                  });
                  setOriginChanged(true);
                }}
              >
                {!originState ? (
                  <option value="default" disabled>
                    Origin...
                  </option>
                ) : null}
                {planets
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((planet) => (
                    <option
                      key={planet.id}
                      value={`${planet.id}-${planet.name}`}
                      disabled={
                        destinationState !== null &&
                        destinationState.id === planet.id
                      }
                    >
                      {planet.name}
                    </option>
                  ))}
              </select>
              <div className="flex gap-1">
                <input
                  type="checkbox"
                  id="originDisabled"
                  disabled={originState === null}
                  checked={originState?.disabled ?? false}
                  onChange={(event) => {
                    setOrigin({
                      ...originState!,
                      disabled: event.target.checked,
                    });
                    setOriginChanged(true);
                  }}
                />
                <label htmlFor="originDisabled">Disabled</label>
              </div>
            </div>

            <div className="flex flex-row gap-2 items-center justify-center w-full">
              <div className="flex flex-col justify-center items-center">
                {directionState ? (
                  <svg
                    width="24"
                    height="48"
                    viewBox="0 0 24 48"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    {destinationState ? (
                      <polygon
                        points="6,8 12,0 18,8"
                        fill={originState?.disabled ? "gray" : "white"}
                      />
                    ) : null}
                    <line
                      x1="12"
                      y1="8"
                      x2="12"
                      y2="48"
                      stroke={originState?.disabled ? "gray" : "white"}
                      strokeWidth="3"
                    />
                  </svg>
                ) : null}
                <svg
                  width="24"
                  height={directionState ? "48" : "96"}
                  viewBox={directionState ? "0 0 24 48" : "0 0 24 96"}
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <line
                    x1="12"
                    y1="0"
                    x2="12"
                    y2={directionState ? "40" : "88"}
                    stroke={destinationState?.disabled ? "gray" : "white"}
                    strokeWidth="3"
                  />
                  {originState ? (
                    <polygon
                      points={
                        directionState ? "6,40 12,48 18,40" : "6,88 12,96 18,88"
                      }
                      fill={destinationState?.disabled ? "gray" : "white"}
                    />
                  ) : null}
                </svg>
              </div>
              <div className="absolute left-[55%] flex flex-row items-center">
                <input
                  className="mr-1"
                  type="checkbox"
                  id="direction"
                  checked={directionState ?? true}
                  onChange={(event) => {
                    setDirection(event.target.checked);
                    setDirectionChanged(true);
                  }}
                />
                <label htmlFor="direction">Bidirectional</label>
              </div>
            </div>

            <div className="flex flex-col gap-1 w-full">
              <label className="pl-2" htmlFor="destinationSelect">
                Destination
              </label>
              <select
                required
                className="border-1 p-2 text-start rounded-md items-start justify-start placeholder-gray-400 bg-gray-800"
                name="destinationSelect"
                id="destinationSelect"
                value={
                  destinationState
                    ? `${destinationState.id}-${destinationState.name}`
                    : "default"
                }
                onChange={(event) => {
                  const formattedValues = event.target.value.split("-");
                  setDestination({
                    id: Number(formattedValues[0]),
                    name: formattedValues[1],
                    disabled: findPlanetStatus(Number(formattedValues[0])),
                  });
                  setDestinationChanged(true);
                }}
              >
                {!destinationState ? (
                  <option value="default" disabled>
                    Destination...
                  </option>
                ) : null}
                {planets
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((planet) => (
                    <option
                      key={planet.id}
                      value={`${planet.id}-${planet.name}`}
                      disabled={
                        originState !== null && originState.id === planet.id
                      }
                    >
                      {planet.name}
                    </option>
                  ))}
              </select>
              <div className="flex gap-1">
                <input
                  type="checkbox"
                  id="destinationDisabled"
                  disabled={destinationState === null}
                  checked={destinationState?.disabled ?? false}
                  onChange={(event) => {
                    setDestination({
                      ...destinationState!,
                      disabled: event.target.checked,
                    });
                    setDestinationChanged(true);
                  }}
                />
                <label htmlFor="destinationDisabled">Disabled</label>
              </div>
            </div>
          </div>
          <div className="flex flex-col justify-center items-center gap-3">
            <button
              type="button"
              disabled={
                isSavePending ||
                isDeletePending ||
                (!originState && !destinationState) ||
                (!originChanged && !destinationChanged && !directionChanged)
              }
              className={`${
                (destinationChanged || originChanged || directionChanged) &&
                originState &&
                destinationState &&
                !isSavePending
                  ? "bg-[#001d3dcf] dark:bg-green-800 hover:bg-[#001d3d] dark:hover:bg-green-700 cursor-pointer font-bold"
                  : "bg-[#05470593]"
              }  text-white  py-2 px-4 rounded-full w-full transition-all duration-100 ease-in-out`}
              onClick={linkState === -1 ? handleInsert : handleEdit}
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
              {!isSavePending ? "Save" : "Saving"}
            </button>
            {linkState !== -1 ? (
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
