import { Assignment, Factions, ParsedAssignment } from "@/lib/typeDefinitions";
import { createClient } from "../supabase/server";
import { Objective } from "../objectives/classes";
import { MOParser } from "./classes";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../../../database.types";

export async function generateStrategy(assignments: Assignment[]) {
  const supabase = await createClient();
  for (const assignment of assignments) {
    let { data: parsedAssingnment } = await supabase
      .from("assignment")
      .select("*")
      .eq("id", assignment.id32);

    if (!parsedAssingnment || parsedAssingnment.length === 0) {
      parsedAssingnment = await parseAssignmentAndRecord(supabase, assignment);
    }
  }
}

export async function parseAssignmentAndRecord(
  supabase: SupabaseClient<Database>,
  assignment: Assignment
): Promise<ParsedAssignment[] | null> {
  const tasks = assignment.setting.tasks;
  const progress = assignment.progress;
  const objectives: Objective[] = [];
  const targetedFactions = new Set<Factions>();
  const parser = new MOParser();
  for (let i = 0; i < progress.length; i++) {
    const parsedObj = await parser.getParsedObjective(tasks[i], progress[i]);

    if (parsedObj !== null) {
      objectives.push(parsedObj);

      const currentFaction = parsedObj.getTargetedFaction();

      if (currentFaction) {
        targetedFactions.add(currentFaction);
      }
    }
  }

  const endTime = Date.now() + assignment.expiresIn * 1000;
  const endDate = new Date(endTime);

  const { data } = await supabase
    .from("assignment")
    .insert({
      id: assignment.id32,
      endDate: endDate.toISOString(),
      isMajorOrder: assignment.setting.overrideTitle.includes("ORDER"),
      title: assignment.setting.overrideTitle,
      brief: assignment.setting.overrideBrief,
    })
    .select();

  return data;
}
