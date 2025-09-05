"use client";

import { ValueTypes } from "@/lib/typeDefinitions";
import { useEffect, useState } from "react";
import MOValSidebar from "./moValSidebar";
import { getTableNameFromType, parseValueType } from "@/utils/parsing/values";
import { createClient } from "@/utils/supabase/client";

export default function RawObjValuePair({
  valueType,
  currentValueType,
  parsedValue,
  value,
  auxValue,
  difficulties,
}: {
  valueType: { id: number; name: string }[] | null;
  currentValueType: number;
  parsedValue: { id: number; name: string }[];
  value: number;
  auxValue: number;
  difficulties: { id: number; name: string }[];
}) {
  const [isTypeOpen, setTypeOpen] = useState(false);
  const [isValueOpen, setValueOpen] = useState(false);
  const [typeState, setType] = useState(valueType);
  const [valueState, setValue] = useState(parsedValue);
  const [typeSubmitted, setTypeSubmit] = useState(false);
  const [valueSubmitted, setValueSubmit] = useState(false);
  const tableName = getTableNameFromType(currentValueType, auxValue);

  useEffect(() => {
    async function fetchType() {
      const supabase = createClient();
      const { data } = await supabase
        .from("objectiveValueType")
        .select("*")
        .eq("id", currentValueType);
      if (data) setType(data);
    }

    async function fetchValue() {
      const newValue = await parseValueType(currentValueType, value, auxValue);
      if (newValue) {
        setValue(newValue);
      }
    }

    if (typeSubmitted) {
      fetchType();
      setTypeSubmit(false);
    }

    if (valueSubmitted) {
      fetchValue();
      setValueSubmit(false);
    }
  }, [typeSubmitted, valueSubmitted]);

  return (
    <div className="flex flex-col gap-3 xl:gap-2">
      <div className="flex flex-row gap-2 items-center">
        <span>Type:</span>
        <button
          onClick={() => setTypeOpen((prev) => !prev)}
          className={`font-light cursor-pointer transition-transform hover:scale-110 ${
            !typeState || typeState.length === 0 ? "text-yellow-400" : ""
          }`}
        >
          <i>
            {typeState && typeState.length > 0
              ? typeState[0].name
              : `${currentValueType} ! Unkwown`}
          </i>
        </button>
        {isTypeOpen ? (
          <MOValSidebar
            id={currentValueType}
            valObj={typeState ?? []}
            tableName="objectiveValueType"
            onClose={() => setTypeOpen(false)}
            onSave={() => setTypeSubmit(true)}
            difficulties={difficulties}
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
            valueState.length === 0 ? "text-yellow-400" : ""
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
            {valueState.length > 0 ? valueState[0].name : `${value} ! Unkwown`}
          </i>
        </button>
        {isValueOpen ? (
          <MOValSidebar
            id={value}
            valObj={valueState ?? []}
            tableName={tableName}
            onClose={() => setValueOpen(false)}
            onSave={() => setValueSubmit(true)}
            difficulties={difficulties}
          ></MOValSidebar>
        ) : null}
      </div>
    </div>
  );
}
