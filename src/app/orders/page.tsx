import { createClient } from "@/utils/supabase/server";
import Sorting from "../../../components/sorting";
import Pagination from "../../../components/pagination";
import Link from "next/link";
import { PageProps } from "../../../.next/types/app/orders/page";

export default async function MajorOrders({ searchParams }: PageProps) {
  const supabase = await createClient();
  const limit = 10;
  const awaitedSearchParams = await searchParams;
  const order = awaitedSearchParams?.order === "ascending";
  const page: number = awaitedSearchParams?.page
    ? Number(awaitedSearchParams.page)
    : 0;

  const { count, data: assignments } = await supabase
    .from("assignment")
    .select("*", { count: "exact" })
    .eq("isMajorOrder", true)
    .range(limit * page, limit - 1 + limit * page)
    .order("endDate", { ascending: order });

  if (!assignments) {
    return (
      <div>
        <section className="px-6 py-10 min-h-screen">
          <h1 className="text-center pb-4 text-3xl font-bold">Major Orders</h1>
          <div className="bg-gray-700">
            <div>
              <Sorting />
            </div>
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

  if (assignments.length === 0) {
    return (
      <div className="min-h-screen flex flex-col">
        <section className="px-6 py-10 flex-1 flex flex-col">
          <h1 className="text-center pb-4 text-3xl font-bold">Major Orders</h1>
          <div className="bg-gray-700 flex flex-col flex-1">
            <div>
              <Sorting />
            </div>
            <div className="flex flex-1 items-center justify-center gap-6 p-5">
              <p className="text-red-900 text-2xl">
                No Major Orders could be found
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
      <section className="px-6 py-10 flex-1 flex flex-col h-full">
        <h1 className="text-center pb-4 text-3xl font-bold">Major Orders</h1>
        <div className="bg-gray-700 h-full flex flex-col flex-1 rounded shadow">
          <div>
            <Sorting />
          </div>
          <h2 className="text-2xl font-semibold mb-4 p-5"></h2>
          <div className="grid grid-cols-1 gap-6 p-5 flex-1 h-full">
            {assignments.map((assignment) => (
              <Link
                href={`/orders/${assignment.id}`}
                key={assignment.id}
                className="rounded p-4 h-full self-stretch w-2/5 flex flex-col gap-1"
              >
                <h3 className="font-semibold text-2xl">
                  Major Order - {new Date(assignment.endDate).toUTCString()}
                </h3>
                <p className="text-xl">{assignment.brief}</p>
              </Link>
            ))}
          </div>
          <div className="bg-gray-700">
            <Pagination
              currentPage={page}
              hasNext={
                count !== null && count > limit * page + assignments.length
              }
            />
          </div>
        </div>
      </section>
    </div>
  );
}
