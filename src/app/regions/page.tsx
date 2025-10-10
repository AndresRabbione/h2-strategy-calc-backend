import { createClient } from "@/utils/supabase/server";
import Pagination from "../../../components/pagination";
import SearchBar from "../../../components/searchBar";
import RegionsContainer from "../../../components/regionsContainer";
import { FactionIDs, RegionView } from "@/lib/typeDefinitions";
import RegionFilter from "../../../components/regionFilter";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../../../database.types";

async function filterSearchResults(
  filter: string,
  limit: number,
  page = 0,
  search = "",
  supabase: SupabaseClient<Database>
): Promise<{ regions: RegionView[]; count: number }> {
  let query = supabase
    .from("region_planet_join_view")
    .select("*", { count: "exact" })
    .or(`region_name.ilike.%${search}%,planet_name.ilike.%${search}%`)
    .order("planet_id", { ascending: true })
    .order("region_name", { ascending: true });

  // Filter logic applied before pagination
  switch (filter) {
    case "friendly":
      query = query.eq("current_region_owner", FactionIDs.HUMANS);
      break;
    case "enemy":
      query = query.neq("current_region_owner", FactionIDs.HUMANS);
      break;
    case "nameKnown":
      query = query.neq("region_name", "");
      break;
    case "nameUnknown":
      query = query.eq("region_name", "");
      break;
    case "hasPlayers":
      query = query.gt("region_player_count", 0);
      break;
  }

  query = query.range(limit * page, limit - 1 + limit * page);

  const { count, data: regions, error } = await query;

  if (error) {
    console.warn("Supabase filter error:", error);
    return { regions: [], count: 0 };
  }

  return { regions: regions ?? [], count: count ?? 0 };
}

export default async function RegionsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = await createClient();

  const limit = 12;
  const awaitedSearchParams = await searchParams;
  const search = (awaitedSearchParams.search as string) ?? "";
  const page: number = awaitedSearchParams?.page
    ? Number(awaitedSearchParams.page)
    : 0;
  const filter = (awaitedSearchParams.filter as string) ?? "none";
  const currentVerifiedParams = new URLSearchParams();

  Object.entries(awaitedSearchParams).forEach(([key, value]) => {
    if (value !== undefined) {
      currentVerifiedParams.set(key, String(value));
    }
  });
  currentVerifiedParams.set("search", search);
  currentVerifiedParams.set("page", page.toString());
  currentVerifiedParams.set("filter", filter);

  const [{ count, regions }, { data: planets }] = await Promise.all([
    filterSearchResults(filter, limit, page, search, supabase),
    await supabase.from("planet").select("id, name"),
  ]);

  return (
    <div className="h-full flex flex-col min-h-screen">
      <section className="px-6 py-10  flex flex-col">
        <h1 className="text-center pb-4 text-3xl font-bold">Regions</h1>
        <div className="bg-gray-700 flex flex-col">
          <div className="flex flex-col md:flex-row md:justify-between w-full">
            <Pagination
              searchParamsString={currentVerifiedParams.toString()}
              hasNext={
                regions !== null &&
                regions.length !== 0 &&
                count !== null &&
                count > limit * page + regions.length
              }
            />
            <RegionFilter
              disabled={false}
              searchParamsString={currentVerifiedParams.toString()}
            ></RegionFilter>
            <SearchBar
              disabled={false}
              searchParamsString={currentVerifiedParams.toString()}
            ></SearchBar>
          </div>
          <RegionsContainer
            regions={regions ?? []}
            planets={planets ?? []}
          ></RegionsContainer>
        </div>
      </section>
    </div>
  );
}
