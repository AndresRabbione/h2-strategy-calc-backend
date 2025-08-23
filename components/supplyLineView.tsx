"use client";

import { useState } from "react";
import SupplyLineSidebar from "./supplyLineSidebar";

export default function SupplyLineView({
  link,
  onDelete,
  onClose,
  disabled,
}: {
  link: {
    bidirectional: boolean | null;
    destination_disabled: boolean | null;
    destination_planet_name: string | null;
    linkedPlanetId: number | null;
    origin_disabled: boolean | null;
    origin_planet_name: string | null;
    planetId: number | null;
    supply_line_id: number | null;
  };
  onDelete: () => void;
  onClose: () => void;
  disabled: boolean;
}) {
  const [isSidebarOpen, setOpen] = useState(false);

  return (
    <div>
      <button
        className="rounded p-2 flex flex-row cursor-pointer gap-2 w-full"
        onClick={() => setOpen((prev) => !prev)}
        disabled={disabled}
      >
        <div className="flex flex-row w-full items-center justify-between">
          <span className="min-w-[120px] md:min-w-[220px] text-left text-balance">
            {link.origin_planet_name}
          </span>
          <div className="flex flex-row justify-center items-center min-w-[96px]">
            {link.bidirectional ? (
              <svg
                width="48"
                height="24"
                viewBox="0 0 48 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <polygon
                  points="8,6 0,12 8,18"
                  fill={link.origin_disabled ? "gray" : "white"}
                />
                <line
                  x1="8"
                  y1="12"
                  x2="48"
                  y2="12"
                  stroke={link.origin_disabled ? "gray" : "white"}
                  strokeWidth="3"
                />
              </svg>
            ) : null}
            <svg
              width={link.bidirectional ? "48" : "96"}
              height="24"
              viewBox={link.bidirectional ? "0 0 48 24" : "0 0 96 24"}
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <line
                x1="0"
                y1="12"
                x2={link.bidirectional ? "40" : "88"}
                y2="12"
                stroke={link.destination_disabled ? "gray" : "white"}
                strokeWidth="3"
              />
              <polygon
                points={
                  link.bidirectional ? "40,6 48,12 40,18" : "88,6 96,12 88,18"
                }
                fill={link.destination_disabled ? "gray" : "white"}
              />
            </svg>
          </div>
          <span className="min-w-[120px] md:min-w-[220px] text-right text-balance">
            {link.destination_planet_name}
          </span>
        </div>
      </button>
      {isSidebarOpen ? (
        <SupplyLineSidebar
          linkId={link.supply_line_id!}
          originPlanet={{
            id: link.planetId!,
            name: link.origin_planet_name!,
            disabled: link.origin_disabled!,
          }}
          destinationPlanet={{
            id: link.linkedPlanetId!,
            name: link.destination_planet_name!,
            disabled: link.destination_disabled!,
          }}
          bidirectional={link.bidirectional!}
          onClose={(needsRefresh: boolean) => {
            setOpen(false);
            if (needsRefresh) onClose();
          }}
          onDelete={onDelete}
        ></SupplyLineSidebar>
      ) : null}
    </div>
  );
}
