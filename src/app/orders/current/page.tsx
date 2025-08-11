"use server";

import { warStartTime } from "@/lib/constants";
import { ValueTypes } from "@/lib/typeDefinitions";
import {
  getLatestMajorOrder,
  getStrategicOpportunities,
} from "@/utils/heldiversAPI/assignments";
import { parseValueType } from "@/utils/parsing/values";
import { createClient } from "@/utils/supabase/server";
import Link from "next/link";

export default async function CurrentOrder() {
  const majorOrder = await getLatestMajorOrder();

  if (!majorOrder) {
    //TODO: Implement as component
    return <div>No major order</div>;
  }

  const opportunities = await getStrategicOpportunities();

  const supabase = await createClient();

  return (
    <div className="flex flex-col">
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css"
      ></link>
      <div className="gap-5 pb-6 m-4 text-xl">
        <h1 className="text-3xl mb-2">
          Major Order -{" "}
          {new Date(warStartTime + majorOrder.startTime * 1000).toUTCString()}
        </h1>

        <div className="flex flex-row md:justify-center md:divide-x-2 divide-gray-50">
          {majorOrder.setting.tasks.map(async (task, taskIndex) => {
            const { data: objectiveType } = await supabase
              .from("objectiveType")
              .select("*")
              .eq("id", task.type);
            return (
              <div key={taskIndex} className="flex flex-col gap-4 xl:gap-2 p-7">
                <div className="flex flex-col gap-1">
                  <div className="flex flex-row gap-3">
                    <span>Type:</span>
                    <Link
                      href={`/objectives/${task.type}`}
                      className={`items-center font-light flex cursor-pointer hover:font-normal transition-all ${
                        !objectiveType || objectiveType.length === 0
                          ? "text-yellow-400"
                          : ""
                      }`}
                    >
                      {objectiveType && objectiveType.length > 0
                        ? objectiveType[0].name
                        : String(task.type) + "! Unkwown"}
                      <i className="fa-thin fa-arrow-up-right-from-square"></i>
                    </Link>
                  </div>
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
                    <div
                      key={valueIndex}
                      className="flex flex-col gap-3 xl:gap-2"
                    >
                      <div className="flex flex-row gap-2 items-center">
                        <span>Type:</span>
                        <Link
                          href={`/values/${currentValueType}`}
                          className={`font-light cursor-pointer hover:font-normal transition-all ${
                            !valueType || valueType.length === 0
                              ? "text-yellow-400"
                              : ""
                          }`}
                        >
                          <i>
                            {valueType && valueType.length > 0
                              ? valueType[0].name
                              : `${currentValueType} ! Unkwown`}
                          </i>
                          <i className="fa-thin fa-arrow-up-right-from-square"></i>
                        </Link>
                      </div>
                      <div className="flex flex-row gap-2 items-center">
                        <span>Value: </span>
                        <Link
                          href={`/values/${currentValueType}/${value}`}
                          className={`font-light ${
                            parsedValue.length === 0 ? "text-yellow-400" : ""
                          } ${
                            currentValueType !== ValueTypes.AMOUNT
                              ? "cursor-pointer hover:font-normal transition-all"
                              : "cursor-default"
                          }`}
                        >
                          <i>
                            {parsedValue.length > 0
                              ? parsedValue[0].name
                              : `${value} ! Unkwown`}
                          </i>
                          <i className="fa-thin fa-arrow-up-right-from-square"></i>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
      <div className={`${opportunities ? "flex" : "hidden"}`}>
        <h2>Opportunities</h2>
        {opportunities
          ? opportunities.map((opportunity) => {
              return (
                <div key={opportunity.id32} className="gap-5 pb-6 m-4 text-xl">
                  <h2 className="text-3xl mb-2">
                    Opportunity -{" "}
                    {new Date(
                      warStartTime + majorOrder.startTime * 1000
                    ).toUTCString()}
                  </h2>

                  <div className="flex flex-row md:justify-center md:divide-x-2 divide-gray-50">
                    {opportunity.setting.tasks.map(async (task, taskIndex) => {
                      const { data: objectiveType } = await supabase
                        .from("objectiveType")
                        .select("*")
                        .eq("id", task.type);
                      return (
                        <div
                          key={taskIndex}
                          className="flex flex-col gap-4 xl:gap-2 p-7"
                        >
                          <div className="flex flex-col gap-1">
                            <div className="flex flex-row gap-3">
                              <span>Type:</span>
                              <Link
                                href={"/objectives"}
                                className={`items-center flex cursor-pointer hover:font-normal transition-all ${
                                  !objectiveType || objectiveType.length === 0
                                    ? "text-yellow-400"
                                    : ""
                                }`}
                              >
                                {objectiveType && objectiveType.length > 0
                                  ? objectiveType[0].name
                                  : String(task.type) + "! Unkwown"}
                                <i className="fa-thin fa-arrow-up-right-from-square"></i>
                              </Link>
                            </div>
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
                              <div
                                key={valueIndex}
                                className="flex flex-col gap-3 xl:gap-2"
                              >
                                <div className="flex flex-row gap-2 items-center">
                                  <span>Type:</span>
                                  <span
                                    className={`font-light ${
                                      !valueType || valueType.length === 0
                                        ? "text-yellow-400"
                                        : ""
                                    } ${
                                      currentValueType !== ValueTypes.AMOUNT
                                        ? "cursor-pointer hover:font-normal transition-all"
                                        : ""
                                    }`}
                                  >
                                    <i>
                                      {valueType && valueType.length > 0
                                        ? valueType[0].name
                                        : `${currentValueType} ! Unkwown`}
                                    </i>
                                    <i className="fa-thin fa-arrow-up-right-from-square"></i>
                                  </span>
                                </div>
                                <div className="flex flex-row gap-2 items-center">
                                  <span>Value: </span>
                                  <span
                                    className={`font-light ${
                                      parsedValue.length === 0
                                        ? "text-yellow-400"
                                        : ""
                                    } ${
                                      currentValueType !== ValueTypes.AMOUNT
                                        ? "cursor-pointer hover:font-normal transition-all"
                                        : ""
                                    }`}
                                  >
                                    <i>
                                      {parsedValue.length > 0
                                        ? parsedValue[0].name
                                        : `${value} ! Unkwown`}
                                    </i>
                                    <i className="fa-thin fa-arrow-up-right-from-square"></i>
                                  </span>
                                </div>
                              </div>
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
