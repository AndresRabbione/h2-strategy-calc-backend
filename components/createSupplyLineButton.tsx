"use client";

import { useState } from "react";
import SupplyLineSidebar from "./supplyLineSidebar";

export default function CreateSupplyLineBtn({
  onDelete,
  onClose,
  disabled,
}: {
  onDelete: () => void;
  onClose: () => void;
  disabled: boolean;
}) {
  const [isSidebarOpen, setOpen] = useState(false);
  return (
    <div className="pt-3">
      <button
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className="font-semibold cursor-pointer before:content-['+'] before:mr-1 before:text-super-earth-blue before:text-xl transition-colors delay-75 duration-150 ease-in-out hover:text-super-earth-blue"
      >
        Create Link
      </button>
      {isSidebarOpen ? (
        <SupplyLineSidebar
          linkId={-1}
          originPlanet={null}
          destinationPlanet={null}
          bidirectional={null}
          onClose={() => {
            setOpen(false);
            onClose();
          }}
          onDelete={onDelete}
        ></SupplyLineSidebar>
      ) : null}
    </div>
  );
}
