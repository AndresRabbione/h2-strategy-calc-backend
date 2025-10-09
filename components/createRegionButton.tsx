"use client";

import { useState } from "react";
import RegionsSidebar from "./regionsSidebar";

export default function CreateRegionBtn({
  onDelete,
  onClose,
  disabled,
  planets,
}: {
  onDelete: () => void;
  onClose: () => void;
  disabled: boolean;
  planets: { id: number; name: string }[];
}) {
  const [isSidebarOpen, setOpen] = useState(false);
  return (
    <div className="pt-3">
      <button
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className="font-semibold cursor-pointer before:content-['+'] before:mr-1 before:text-super-earth-blue before:text-xl transition-colors delay-75 duration-150 ease-in-out hover:text-super-earth-blue"
      >
        Create Region
      </button>
      {isSidebarOpen ? (
        <RegionsSidebar
          region={null}
          planet={null}
          onClose={() => {
            setOpen(false);
            onClose();
          }}
          onDelete={onDelete}
          allPlanets={planets}
        ></RegionsSidebar>
      ) : null}
    </div>
  );
}
