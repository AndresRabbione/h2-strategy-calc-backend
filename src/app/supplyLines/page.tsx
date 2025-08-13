import { createClient } from "@/utils/supabase/server";
import Pagination from "../../../components/pagination";
import { PageProps } from "../../../.next/types/app/supplyLines/page";

export default async function SupplyLines({ searchParams }: PageProps) {
  const supabase = await createClient();

  const limit = 10;
  const awaitedSearchParams = await searchParams;
  const page: number = awaitedSearchParams?.page
    ? Number(awaitedSearchParams.page)
    : 0;

  const { count, data: links } = await supabase
    .from("supplyLine")
    .select(
      "*, planet:planetId ( name ), linkedPlanet:linkedPlanetId ( name )",
      { count: "exact" }
    )
    .range(limit * page, limit - 1 + limit * page);

  if (!links) {
    return (
      <div>
        <section className="px-6 py-10 bg-[#003566] min-h-screen">
          <h1 className="text-center pb-4 text-3xl font-bold">Supply Lines</h1>
          <div className="bg-[#001d3d]">
            <div></div>
            <div className="flex items-center justify-center gap-6 p-5">
              <p className="text-red-900 text-2xl">Something went wrong</p>
            </div>
            <div>
              <Pagination currentPage={page} hasNext={false} />
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
          <div className="bg-[#001d3d] flex flex-col flex-1">
            <div></div>
            <div className="flex flex-1 items-center justify-center gap-6 p-5">
              <p className="text-red-900 text-2xl">
                No Supply Lines could be found
              </p>
            </div>
            <div>
              <Pagination currentPage={page} hasNext={false} />
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="h-full min-h-screen flex flex-col">
      <section className="px-6 py-10 bg-[#003566] flex-1 flex flex-col h-full">
        <h1 className="text-center pb-4 text-3xl font-bold">Supply Lines</h1>
        <div className="bg-[#001d3d] h-full flex flex-col flex-1">
          <div></div>
          <h2 className="text-2xl font-semibold mb-4 p-5"></h2>
          <div className="grid grid-cols-1 gap-6 p-5 flex-1 h-full">
            {links.map((link) => (
              <button
                key={link.id}
                className="rounded p-4 h-full self-stretch w-2/5 flex flex-col gap-1"
              ></button>
            ))}
          </div>
          <div>
            <Pagination
              currentPage={page}
              hasNext={count !== null && count > limit * page + links.length}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
