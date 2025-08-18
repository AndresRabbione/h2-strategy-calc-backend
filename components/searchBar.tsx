"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentFilter = searchParams.get("filter") || "";

  const [searchString, setSearchString] = useState(currentFilter);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchString.length > 2 || searchString.length === 0) {
        const params = new URLSearchParams(searchParams);
        params.set("filter", searchString);
        params.set("page", "0");
        router.push(`?${params.toString()}`);
      }
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchString]);

  const changeHandler = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setSearchString(event.target.value);
  };

  return (
    <div className="p-6 rounded-xl">
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css"
      ></link>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <label
          htmlFor="movie-filter"
          className="text-white text-lg font-semibold"
        >
          Filter:
        </label>
        <div className="relative w-full sm:w-auto">
          <input
            autoComplete="off"
            type="search"
            id="search"
            className="rounded-sm border border-[#545454b7] w-full pl-10 py-2 bg-gray-900"
            placeholder={"Search..."}
            onChange={changeHandler}
            value={searchString}
          />
          <span className="fa fa-search absolute left-4 top-1/2 -translate-y-1/2"></span>
        </div>
      </div>
    </div>
  );
}
