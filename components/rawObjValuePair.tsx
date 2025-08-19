"use client";

import { ValueTypes } from "@/lib/typeDefinitions";
import { useState } from "react";
import MOValSidebar from "./moValSidebar";
import { getTableNameFromType } from "@/utils/parsing/values";

export default function RawObjValuePair({
  valueType,
  currentValueType,
  parsedValue,
  value,
  auxValue,
}: {
  valueType: { id: number; name: string }[] | null;
  currentValueType: number;
  parsedValue: { id: number; name: string }[];
  value: number;
  auxValue: number;
}) {
  const [isTypeOpen, setTypeOpen] = useState(false);
  const [isValueOpen, setValueOpen] = useState(false);
  const tableName = getTableNameFromType(currentValueType, auxValue);
  return (
    <div className="flex flex-col gap-3 xl:gap-2">
      <div className="flex flex-row gap-2 items-center">
        <span>Type:</span>
        <button
          onClick={() => setTypeOpen((prev) => !prev)}
          className={`font-light cursor-pointer transition-transform hover:scale-110 ${
            !valueType || valueType.length === 0 ? "text-yellow-400" : ""
          }`}
        >
          <i>
            {valueType && valueType.length > 0
              ? valueType[0].name
              : `${currentValueType} ! Unkwown`}
          </i>
        </button>
        {isTypeOpen ? (
          <MOValSidebar
            id={currentValueType}
            valObj={valueType ?? []}
            tableName="objectiveValueType"
            onClose={() => setTypeOpen(false)}
          ></MOValSidebar>
        ) : null}
      </div>
      <div className="flex flex-row gap-2 items-center">
        <span>Value: </span>
        <button
          onClick={() => setValueOpen((prev) => !prev)}
          disabled={
            currentValueType === ValueTypes.AMOUNT ||
            (auxValue === 0 &&
              (currentValueType === ValueTypes.TARGET_ID ||
                currentValueType === ValueTypes.ITEM))
          }
          className={`font-light ${
            parsedValue.length === 0 ? "text-yellow-400" : ""
          } ${
            currentValueType === ValueTypes.AMOUNT ||
            (auxValue === 0 &&
              (currentValueType === ValueTypes.TARGET_ID ||
                currentValueType === ValueTypes.ITEM))
              ? "cursor-default"
              : "cursor-pointer transition-transform hover:scale-105"
          }`}
        >
          <i>
            {parsedValue.length > 0
              ? parsedValue[0].name
              : `${value} ! Unkwown`}
          </i>
        </button>
        {isValueOpen ? (
          <MOValSidebar
            id={value}
            valObj={parsedValue ?? []}
            tableName={tableName}
            onClose={() => setValueOpen(false)}
          ></MOValSidebar>
        ) : null}
      </div>
    </div>
  );
}
