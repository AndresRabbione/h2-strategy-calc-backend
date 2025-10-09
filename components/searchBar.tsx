"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function SearchBar({
  disabled,
  searchParamsString,
}: {
  disabled: boolean;
  searchParamsString: string;
}) {
  const router = useRouter();
  const searchParams = new URLSearchParams(searchParamsString);

  const search = searchParams.get("search") as string;

  const [searchString, setSearchString] = useState(search);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchString.length > 2 || searchString.length === 0) {
        const newParams = new URLSearchParams(searchParams.toString());
        newParams.set("search", searchString);
        newParams.set("page", "0");
        router.push(`?${newParams.toString()}`);
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
    <div className="p-3 pt-1.5 md:pt-6 md:p-6 md:pr-3 rounded-xl">
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css"
      ></link>
      <div className="flex flex-col sm:flex-row sm:items-center gap-1 md:gap-3">
        <label className="text-white text-lg font-semibold">Search:</label>
        <div className="relative w-full sm:w-auto">
          <input
            disabled={disabled}
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
