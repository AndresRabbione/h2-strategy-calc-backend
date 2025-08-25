import {
  getCurrentMajorOrders,
  getStrategicOpportunities,
} from "@/utils/heldiversAPI/assignments";
import { getNumberOfUnparsedValues } from "@/utils/parsing/values";
import { createClient } from "@/utils/supabase/server";
import Link from "next/link";

export default async function MajorOrderDashboard() {
  const supabase = await createClient();
  const majorOrders = await getCurrentMajorOrders();
  const opportunities = await getStrategicOpportunities();

  const unparsedValueCount = await getNumberOfUnparsedValues(
    majorOrders && opportunities
      ? [...majorOrders, ...opportunities]
      : majorOrders && !opportunities
      ? majorOrders
      : []
  );

  const assingmentIds = majorOrders
    ? majorOrders.map((assignment) => assignment.id32)
    : [];

  if (opportunities) {
    assingmentIds.push(...opportunities.map((opportunity) => opportunity.id32));
  }

  const { count: recordedAssignmentCount } = await supabase
    .from("assignment")
    .select("*", { count: "exact" })
    .in("id", assingmentIds);

  const unrecordedAssingmentCount =
    assingmentIds.length - (recordedAssignmentCount ?? 0);

  return (
    <div className="flex flex-col justify-center items-center rounded-md bg-slate-500 w-1/4 p-3 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ease-in-out">
      <h2 className="text-2xl font-semibold">Assignments</h2>
      <Link
        href={"/orders/current"}
        className="grid grid-cols-2 grid-rows-2 divide-y-1 divide-white justify-center items-center w-full"
      >
        <div className="flex flex-row items-center justify-center col-span-2 divide-x-1 divide-white p-1">
          <div className="flex flex-col items-center justify-center w-1/2">
            <span>Active Assingnments</span>
            <span className="font-semibold text-xl">
              {assingmentIds.length}
            </span>
          </div>
          <div className="flex flex-col items-center justify-center w-1/2">
            <span className="text-nowrap">Unrecorded Assignments</span>
            <span className="font-semibold text-xl">
              {unrecordedAssingmentCount}
            </span>
          </div>
        </div>
        <div className="flex flex-col col-span-2 items-center justify-center">
          <span>Unknown Assignment Values</span>
          <span className="font-semibold text-xl">{unparsedValueCount}</span>
        </div>
      </Link>
    </div>
  );
}
