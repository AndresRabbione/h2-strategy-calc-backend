"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function RegionFilter({
  disabled,
  searchParamsString,
}: {
  disabled: boolean;
  searchParamsString: string;
}) {
  const router = useRouter();
  const searchParams = new URLSearchParams(searchParamsString);

  const filter = searchParams.has("filter")
    ? searchParams.get("filter")!
    : "none";

  const [filterState, setFilter] = useState(filter);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (filterState.length > 2 || filterState.length === 0) {
        const newParams = new URLSearchParams(searchParams.toString());
        newParams.set("filter", filterState);
        newParams.set("page", "0");
        router.push(`?${newParams.toString()}`);
      }
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [filterState]);

  const changeHandler = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    setFilter(event.target.value);
  };

  return (
    <div className="p-3 pt-1.5 md:pt-6 md:p-6 md:pr-3 rounded-xl justify-center items-center">
      <div className="flex flex-col sm:flex-row sm:items-center gap-1 md:gap-3">
        <label className="text-white text-lg font-semibold">Filter:</label>
        <div className="relative w-full sm:w-auto">
          <select
            disabled={disabled}
            id="search"
            className="rounded-sm border border-[#545454b7] w-full p-4 py-2 bg-gray-900"
            onChange={changeHandler}
            value={filterState}
          >
            <option value="none">All Regions</option>
            <option value="friendly">Friendly Regions</option>
            <option value="enemy">Enemy Regions</option>
            <option value="nameKnown">Named Regions</option>
            <option value="nameUnknown">Unnamed Regions</option>
            <option value="hasPlayers">Has Players</option>
          </select>
        </div>
      </div>
    </div>
  );
}
