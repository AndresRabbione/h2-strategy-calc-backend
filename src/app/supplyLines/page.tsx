import { createClient } from "@/utils/supabase/server";
import Pagination from "../../../components/pagination";
import { PageProps } from "../../../.next/types/app/supplyLines/page";
import SearchBar from "../../../components/searchBar";

export default async function SupplyLines({ searchParams }: PageProps) {
  const supabase = await createClient();

  const limit = 7;
  const awaitedSearchParams = await searchParams;
  const filter: string = awaitedSearchParams.filter ?? "";
  const page: number = awaitedSearchParams?.page
    ? Number(awaitedSearchParams.page)
    : 0;

  const { count, data: links } = await supabase
    .from("supplyLineFull")
    .select("*", { count: "exact" })
    .or(
      `origin_planet_name.ilike.%${filter}%,destination_planet_name.ilike.%${filter}%`
    )
    .range(limit * page, limit - 1 + limit * page);

  if (!links) {
    return (
      <div className="min-h-screen flex flex-col">
        <section className="px-6 py-10 bg-[#003566] flex-1 flex flex-col">
          <h1 className="text-center pb-4 text-3xl font-bold">Supply Lines</h1>
          <div className="bg-[#001d3d] flex-col">
            <div className="flex flex-row justify-between w-full">
              <Pagination currentPage={page} hasNext={false} />
              <SearchBar></SearchBar>
            </div>
            <div className="flex flex-1 items-center justify-center gap-6 p-5">
              <p className="text-red-900 text-2xl">Something went wrong</p>
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (links.length === 0) {
    return (
      <div className="min-h-screen flex flex-col">
        <section className="px-6 py-10 bg-[#003566] flex-1 flex flex-col">
          <h1 className="text-center pb-4 text-3xl font-bold">Supply Lines</h1>
          <div className="bg-[#001d3d] flex-col">
            <div className="flex flex-row justify-between w-full">
              <Pagination currentPage={page} hasNext={false} />
              <SearchBar></SearchBar>
            </div>
            <div className="flex flex-1 items-center justify-center gap-6 p-5">
              <p className="text-red-900 text-2xl">
                No Supply Lines could be found
              </p>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col min-h-screen">
      <section className="px-6 py-10  flex flex-col">
        <h1 className="text-center pb-4 text-3xl font-bold">Supply Lines</h1>
        <div className="bg-gray-700 flex flex-col">
          <div className="flex flex-row justify-between w-full">
            <Pagination
              currentPage={page}
              hasNext={count !== null && count > limit * page + links.length}
            />
            <SearchBar></SearchBar>
          </div>
          <div className="grid grid-cols-1 p-5 items-center">
            {links.map((link) => {
              let connector = !link.bidirectional
                ? ""
                : link.bidirectional && link.origin_disabled
                ? "|"
                : "<";
              connector = connector.concat(
                "------",
                link.destination_disabled ? "|" : ">"
              );
              return (
                <button
                  key={link.supply_line_id}
                  className="rounded p-2 flex flex-row"
                >
                  <span>{link.origin_planet_name}</span>
                  <span className="min-w-[100px]">{connector}</span>
                  <span>{link.destination_planet_name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
