import { warStartTime } from "@/lib/constants";
import { Assignment, ValueTypes } from "@/lib/typeDefinitions";
import { createClient } from "@/utils/supabase/server";
import RawObjHeader from "./rawObjHead";
import { parseValueType } from "@/utils/parsing/values";
import RawObjValuePair from "./rawObjValuePair";

export default async function RawAssingmentBody({
  assignment,
  hasOpportunities,
  headerText,
  difficulties,
}: {
  assignment: Assignment;
  hasOpportunities: boolean;
  headerText: string;
  difficulties: { id: number; name: string }[];
}) {
  const supabase = await createClient();

  return (
    <div className={`gap-5 ${hasOpportunities ? "pb-6" : ""} m-4 text-xl`}>
      <h2 className="text-2xl mb-2">
        {headerText} -{" "}
        {new Date(warStartTime + assignment.startTime * 1000).toLocaleString(
          "en-GB",
          { timeZone: "UTC" }
        ) + " (UTC)"}
      </h2>
      <p>{assignment.setting.overrideBrief}</p>

      <div className="flex flex-col xl:flex-row xl:justify-center xl:divide-x-2 xl:divide-gray-50">
        {assignment.setting.tasks.map(async (task, taskIndex) => {
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
                  difficulties={difficulties}
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
                    difficulties={difficulties}
                  ></RawObjValuePair>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
