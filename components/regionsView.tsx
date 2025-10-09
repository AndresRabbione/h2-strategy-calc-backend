"use client";

import { useState } from "react";
import RegionsSidebar from "./regionsSidebar";
import { getFactionColorFromId } from "@/utils/parsing/colors";
import { RegionView } from "@/lib/typeDefinitions";

export default function RegionsView({
  region,
  onDelete,
  onClose,
  disabled,
  planets,
}: {
  region: RegionView;
  onDelete: () => void;
  onClose: () => void;
  disabled: boolean;
  planets: { name: string; id: number }[];
}) {
  const [isSidebarOpen, setOpen] = useState(false);
  const regionColor = getFactionColorFromId(region.current_region_owner!);
  const planetColor = getFactionColorFromId(region.current_planet_owner!);

  return (
    <div className="h-full">
      <button
        className="rounded p-2 flex flex-row justify-center items-center cursor-pointer gap-2 border-1 border-gray-400 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ease-in-out min-h-[1/3] h-full min-w-[50%] md:min-w-[25%] w-full"
        onClick={() => {
          setOpen((prev) => !prev);
          console.log(region.region_id);
        }}
        disabled={disabled}
      >
        <div className="grid grid-cols-[70% 30%] grid-rows-[80% 20%] w-full h-full items-center">
          <div className="flex flex-col items-start">
            <span
              className={`text-md text-pretty wrap-anywhere ${
                region.region_name?.length === 0 ? "text-yellow-400" : ""
              }`}
            >
              {region.region_name?.length === 0
                ? "Unknown"
                : region.region_name}
            </span>
            <span style={{ color: regionColor }} className={`text-sm`}>
              {region.size}
            </span>
          </div>
          <div className={`flex flex-fow gap-1 items-center justify-end`}>
            <span>{region.latest_region_regen?.toFixed(2) + "%"}</span>
          </div>
          <span className="col-span-2" style={{ color: planetColor }}>
            {region.planet_name}
          </span>
        </div>
      </button>
      {isSidebarOpen ? (
        <RegionsSidebar
          region={{
            id: region.region_id!,
            name: region.region_name!,
            size: region.size!,
          }}
          planet={{ id: region.planet_id!, name: region.planet_name! }}
          allPlanets={planets}
          onClose={(needsRefresh: boolean) => {
            setOpen(false);
            if (needsRefresh) onClose();
          }}
          onDelete={onDelete}
        ></RegionsSidebar>
      ) : null}
    </div>
  );
}
