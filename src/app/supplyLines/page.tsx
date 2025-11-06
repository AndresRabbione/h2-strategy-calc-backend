"use server";

import SupplyLineContainer from "../../../components/supplyLineContainer";
import { createClient } from "@/utils/supabase/server";
import Pagination from "../../../components/pagination";
import SearchBar from "../../../components/searchBar";

export default async function SupplyLines({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = await createClient();

  const limit = 10;
  const awaitedSearchParams = await searchParams;
  const search = (awaitedSearchParams.search as string) ?? "";
  const page: number = awaitedSearchParams?.page
    ? Number(awaitedSearchParams.page)
    : 0;
  const currentVerifiedParams = new URLSearchParams();

  Object.entries(awaitedSearchParams).forEach(([key, value]) => {
    if (value !== undefined) {
      currentVerifiedParams.set(key, String(value));
    }
  });
  currentVerifiedParams.set("search", search);
  currentVerifiedParams.set("page", page.toString());

  const { count, data: links } = await supabase
    .from("supplyLineFull")
    .select("*", { count: "exact" })
    .or(
      `origin_planet_name.ilike.%${search}%,destination_planet_name.ilike.%${search}%`
    )
    .range(limit * page, limit - 1 + limit * page);

  return (
    <div className="h-full flex flex-col min-h-screen">
      <section className="px-6 py-10  flex flex-col">
        <h1 className="text-center pb-4 text-3xl font-bold">Supply Lines</h1>
        <div className="bg-gray-700 flex flex-col">
          <div className="flex flex-col md:flex-row md:justify-between w-full">
            <Pagination
              searchParamsString={currentVerifiedParams.toString()}
              hasNext={
                links !== null &&
                links.length !== 0 &&
                count !== null &&
                count > limit * page + links.length
              }
            />
            <SearchBar
              disabled={false}
              searchParamsString={currentVerifiedParams.toString()}
            ></SearchBar>
          </div>
          <SupplyLineContainer links={links ?? []}></SupplyLineContainer>
        </div>
      </section>
    </div>
  );
}
