"use server";

import { warStartTime } from "@/lib/constants";
import { ValueTypes } from "@/lib/typeDefinitions";
import { parseValueType } from "@/utils/parsing/values";
import { createClient } from "@/utils/supabase/server";
import NoData from "../../../../components/noData";
import RawObjHeader from "../../../../components/rawObjHead";
import RawObjValuePair from "../../../../components/rawObjValuePair";
import {
  getCurrentMajorOrders,
  getStrategicOpportunities,
} from "@/utils/helldiversAPI/assignments";

export default async function CurrentOrder() {
  const majorOrders = await getCurrentMajorOrders();

  if (!majorOrders) {
    return <NoData text="No Major Order"></NoData>;
  }

  const opportunities = await getStrategicOpportunities();

  const supabase = await createClient();

  return (
    <div className="flex flex-col">
      <h1 className="text-3xl m-4 justify-center items-center flex">
        Major Orders
      </h1>
      {majorOrders.map((majorOrder, index) => (
        <div
          key={index}
          className={`gap-5 ${
            opportunities && opportunities.length > 0 ? "pb-6" : ""
          } m-4 text-xl`}
        >
          <h2 className="text-2xl mb-2">
            Major Order -{" "}
            {/* FIXME: This doesn't produce the correct date, figure it out sometime */}
            {new Date(
              warStartTime + majorOrder.startTime * 1000
            ).toLocaleString("en-GB", { timeZone: "UTC" }) + " (UTC)"}
          </h2>

          <div className="flex flex-col xl:flex-row xl:justify-center xl:divide-x-2 xl:divide-gray-50">
            {majorOrder.setting.tasks.map(async (task, taskIndex) => {
              const { data: objectiveType } = await supabase
                .from("objectiveType")
                .select("*")
                .eq("id", task.type);
              return (
                <div
                  key={taskIndex}
                  className="flex flex-col gap-3 xl:gap-2 p-4 pl-2 xl:p-7"
                >
                  <div className="flex flex-col gap-1">
                    <RawObjHeader
                      objective={task}
                      parsedObjective={objectiveType}
                    ></RawObjHeader>
                  </div>
                  <hr></hr>
                  {task.values.map(async (value, valueIndex) => {
                    const currentValueType = task.valueTypes[valueIndex];
                    const { data: valueType } = await supabase
                      .from("objectiveValueType")
                      .select("*")
                      .eq("id", currentValueType);
                    let auxValue = 0;
                    if (currentValueType === ValueTypes.TARGET_ID) {
                      for (let i = 0; i < task.valueTypes.length; i++) {
                        if (task.valueTypes[i] === ValueTypes.TARGET_TYPE) {
                          auxValue = task.values[i];
                          break;
                        }
                      }
                    }
                    if (currentValueType === ValueTypes.ITEM) {
                      for (let i = 0; i < task.valueTypes.length; i++) {
                        if (task.valueTypes[i] === ValueTypes.ITEM_TYPE) {
                          auxValue = task.values[i];
                          break;
                        }
                      }
                    }
                    const parsedValue = await parseValueType(
                      currentValueType,
                      value,
                      auxValue
                    );
                    return (
                      <RawObjValuePair
                        key={valueIndex}
                        valueType={valueType}
                        currentValueType={currentValueType}
                        value={value}
                        parsedValue={parsedValue}
                        auxValue={auxValue}
                      ></RawObjValuePair>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
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
          ? opportunities.map((opportunity) => {
              return (
                <div key={opportunity.id32} className="gap-5 pb-6 m-4 text-xl">
                  <h2 className="text-2xl mb-2">
                    Opportunity - {opportunity.id32}
                  </h2>

                  <div className="flex flex-col xl:flex-row xl:justify-center xl:divide-x-2 xl:divide-gray-50">
                    {opportunity.setting.tasks.map(async (task, taskIndex) => {
                      const { data: objectiveType } = await supabase
                        .from("objectiveType")
                        .select("*")
                        .eq("id", task.type);
                      return (
                        <div
                          key={taskIndex}
                          className="flex flex-col gap-3 xl:gap-2 p-4 pl-2 xl:p-7"
                        >
                          <div className="flex flex-col gap-1">
                            <RawObjHeader
                              objective={task}
                              parsedObjective={objectiveType}
                            ></RawObjHeader>
                          </div>
                          <hr></hr>
                          {task.values.map(async (value, valueIndex) => {
                            const currentValueType =
                              task.valueTypes[valueIndex];
                            const { data: valueType } = await supabase
                              .from("objectiveValueType")
                              .select("*")
                              .eq("id", currentValueType);
                            let auxValue = 0;
                            if (currentValueType === ValueTypes.TARGET_ID) {
                              for (let i = 0; i < task.valueTypes.length; i++) {
                                if (
                                  task.valueTypes[i] === ValueTypes.TARGET_TYPE
                                ) {
                                  auxValue = task.values[i];
                                  break;
                                }
                              }
                            }
                            if (currentValueType === ValueTypes.ITEM) {
                              for (let i = 0; i < task.valueTypes.length; i++) {
                                if (
                                  task.valueTypes[i] === ValueTypes.ITEM_TYPE
                                ) {
                                  auxValue = task.values[i];
                                  break;
                                }
                              }
                            }
                            const parsedValue = await parseValueType(
                              currentValueType,
                              value,
                              auxValue
                            );
                            return (
                              <RawObjValuePair
                                key={valueIndex}
                                valueType={valueType}
                                currentValueType={currentValueType}
                                value={value}
                                parsedValue={parsedValue}
                                auxValue={auxValue}
                              ></RawObjValuePair>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          : null}
      </div>
    </div>
  );
}
