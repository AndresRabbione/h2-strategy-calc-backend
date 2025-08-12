"use client";

import { useRouter, useSearchParams } from "next/navigation";

export default function Sorting() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentOrder = searchParams.get("order") || "descending";

  const orderChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;

    const params = new URLSearchParams(searchParams);

    params.set("order", value);

    router.push(`?${params.toString()}`);
  };

  return (
    <div className="bg-[#001d3d] p-6 rounded-xl">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <label
          htmlFor="movie-filter"
          className="text-white text-lg font-semibold"
        >
          Sort:
        </label>
        <div className="relative w-full sm:w-auto">
          <select
            id="movie-filter"
            value={currentOrder}
            onChange={orderChange}
            className="appearance-none bg-gray-800 text-white border border-gray-600 rounded-lg px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:bg-gray-700 cursor-pointer w-full sm:min-w-[220px]"
          >
            <option value="ascending">Ascending</option>
            <option value="descending">Descending</option>
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
            <svg
              className="w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
