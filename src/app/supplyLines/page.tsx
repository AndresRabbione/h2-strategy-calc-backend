import { createClient } from "@/utils/supabase/server";
import Pagination from "../../../components/pagination";
import { PageProps } from "../../../.next/types/app/supplyLines/page";
import SearchBar from "../../../components/searchBar";
import SupplyLineContainer from "../../../components/supplyLineContainer";

export default async function SupplyLines({ searchParams }: PageProps) {
  const supabase = await createClient();

  const limit = 10;
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

  return (
    <div className="h-full flex flex-col min-h-screen">
      <section className="px-6 py-10  flex flex-col">
        <h1 className="text-center pb-4 text-3xl font-bold">Supply Lines</h1>
        <div className="bg-gray-700 flex flex-col">
          <div className="flex flex-col md:flex-row md:justify-between w-full">
            <Pagination
              currentPage={page}
              hasNext={
                links !== null &&
                links.length !== 0 &&
                count !== null &&
                count > limit * page + links.length
              }
            />
            <SearchBar disabled={false}></SearchBar>
          </div>
          <SupplyLineContainer links={links}></SupplyLineContainer>
        </div>
      </section>
    </div>
  );
}
