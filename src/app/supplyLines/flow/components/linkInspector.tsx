"use client";

import { Edge } from "@xyflow/react";
import { PlanetLink } from "../../hooks/usePlanetGraph";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

export default function LinkInspector({
  edge,
  updateLinkData,
  isSaving,
}: {
  edge: Edge<Partial<PlanetLink>>;
  updateLinkData: (edgeId: string, patch: Partial<PlanetLink>) => void;
  isSaving: boolean;
}) {
  const [isLoading, setLoading] = useState(false);
  const [linkData, setLinkData] = useState<Partial<PlanetLink> | null>(null);

  useEffect(() => {
    const supabase = createClient();

    const fetchLinkData = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("supplyLineFull")
        .select("*")
        .eq("supply_line_id", edge.data!.supply_line_id!)
        .single();

      console.log(data, error);

      setLinkData(data);
      setLoading(false);
    };

    if (edge.data?.supply_line_id) {
      setLoading(true);
      fetchLinkData();
    } else {
      setLinkData(edge.data!);
    }
  }, [edge.data]);

  if (isLoading) {
    return (
      <div>
        <h3 className="font-medium">Link</h3>
        <div className="mt-2 space-y-2 flex flex-col items-center justify-center">
          <span>Loading</span>
          <svg
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="relative size-13 animate-spin text-white"
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
        </div>
      </div>
    );
  }

  if (!linkData?.supply_line_id) {
    return (
      <div>
        <h3 className="font-medium">Supply Line</h3>
        <div className="mt-2 space-y-2 text-sm">
          <div>
            <label className="block text-xs text-gray-300">Origin</label>
            <div className="text-sm">
              {linkData?.origin_planet_name ?? ""} (ID:{" "}
              {linkData?.planetId ?? -1})
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-300">Destination</label>
            <div className="text-sm">
              {linkData?.destination_planet_name ?? ""} (ID:{" "}
              {linkData?.linkedPlanetId ?? -1})
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="bidirectional"
              type="checkbox"
              checked={linkData?.bidirectional ?? true}
              onChange={(e) =>
                setLinkData((prev) => ({
                  ...prev,
                  bidirectional: e.target.checked,
                }))
              }
            />
            <label htmlFor="bidirectional" className="text-sm">
              Bidirectional
            </label>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="originDisabled"
              type="checkbox"
              checked={linkData?.origin_disabled ?? false}
              disabled
            />
            <label htmlFor="originDisabled" className="text-sm">
              Origin disabled
            </label>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="destDisabled"
              type="checkbox"
              checked={linkData?.destination_disabled ?? false}
              disabled
            />
            <label htmlFor="destDisabled" className="text-sm">
              Destination disabled
            </label>
          </div>

          <div className="pt-2">
            <button
              onClick={() => updateLinkData(edge.id, { ...linkData })}
              disabled={isSaving}
              className="px-3 py-1 rounded-md border hover:ring hover:ring-green-600/80 border-green-500 bg-green-700/30 text-sm font-medium cursor-pointer transition-all duration-300 ease-in-out"
            >
              Save changes
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h3 className="font-medium">Link</h3>
      <div className="mt-2 space-y-2 text-sm">
        <div>
          <label className="block text-xs text-gray-300">Supply Line ID</label>
          <span className="text-sm">{linkData?.supply_line_id}</span>
        </div>

        <div>
          <label className="block text-xs text-gray-300">Origin</label>
          <div className="text-sm">
            {linkData?.origin_planet_name ?? ""} (ID: {linkData?.planetId ?? -1}
            )
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-300">Destination</label>
          <div className="text-sm">
            {linkData?.destination_planet_name ?? ""} (ID:{" "}
            {linkData?.linkedPlanetId ?? -1})
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            id="bidirectional"
            type="checkbox"
            checked={linkData?.bidirectional ?? true}
            onChange={(e) =>
              setLinkData((prev) => ({
                ...prev,
                bidirectional: e.target.checked,
              }))
            }
          />
          <label htmlFor="bidirectional" className="text-sm">
            Bidirectional
          </label>
        </div>

        <div className="flex items-center gap-2">
          <input
            id="originDisabled"
            type="checkbox"
            checked={linkData?.origin_disabled ?? false}
            disabled
          />
          <label htmlFor="originDisabled" className="text-sm">
            Origin disabled
          </label>
        </div>

        <div className="flex items-center gap-2">
          <input
            id="destDisabled"
            type="checkbox"
            checked={linkData?.destination_disabled ?? false}
            disabled
          />
          <label htmlFor="destDisabled" className="text-sm">
            Destination disabled
          </label>
        </div>

        <div className="pt-2">
          <button
            onClick={() => {
              updateLinkData(edge.id, { ...linkData });
            }}
            className="px-3 py-1 rounded-md border hover:ring hover:ring-green-600/80 border-green-500 bg-green-700/30 text-sm font-medium cursor-pointer transition-all duration-300 ease-in-out"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
