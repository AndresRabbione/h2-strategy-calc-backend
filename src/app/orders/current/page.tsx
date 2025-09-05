"use server";

import { createClient } from "@/utils/supabase/server";
import NoData from "../../../../components/noData";
import {
  getCurrentMajorOrders,
  getStrategicOpportunities,
} from "@/utils/helldiversAPI/assignments";
import RawAssingmentBody from "../../../../components/rawAssignmentBody";

export default async function CurrentOrder() {
  const majorOrders = await getCurrentMajorOrders();

  if (!majorOrders) {
    return <NoData text="No Major Order"></NoData>;
  }

  const [opportunities, supabase] = await Promise.all([
    getStrategicOpportunities(),
    createClient(),
  ]);

  const { data: difficulties } = await supabase
    .from("difficulty")
    .select("*")
    .gt("id", 0);

  return (
    <div className="flex flex-col">
      <h1 className="text-3xl m-4 justify-center items-center flex">
        Major Orders
      </h1>
      {majorOrders.map((majorOrder) => (
        <RawAssingmentBody
          assignment={majorOrder}
          hasOpportunities={opportunities !== null && opportunities.length > 0}
          headerText="Major Order"
          key={majorOrder.id32}
          difficulties={difficulties ?? []}
        ></RawAssingmentBody>
      ))}
      <div
        className={`${
          opportunities && opportunities.length > 0
            ? "flex flex-col xl:items-center xl:justify-center"
            : "hidden"
        }`}
      >
        <h2 className="text-3xl m-3">Opportunities</h2>
        {opportunities && opportunities.length > 0
          ? opportunities.map((opportunity) => (
              <RawAssingmentBody
                assignment={opportunity}
                headerText="Opportunity"
                hasOpportunities={true}
                key={opportunity.id32}
                difficulties={difficulties ?? []}
              ></RawAssingmentBody>
            ))
          : null}
      </div>
    </div>
  );
}
