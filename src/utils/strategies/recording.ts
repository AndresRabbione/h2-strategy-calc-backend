import { getAllAssignments } from "../helldiversAPI/assignments";
import { Database } from "../../../database.types";
import {
  Assignment,
  DBObjectiveInsert,
  Factions,
  FullParsedAssignment,
  ObjectiveTypes,
  Planet,
  PlanetSnapshotInsert,
  ValueTypes,
} from "@/lib/typeDefinitions";
import { Objective } from "../objectives/classes";
import { MOParser } from "./parsing";
import { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "../supabase/server";
import { fetchAllPlanets } from "../helldiversAPI/planets";
import { DBLinks, PlanetRouter } from "./routing";
import { generateStrategies } from "./generator";
import { calcPlanetProgressPercentage } from "../helldiversAPI/formulas";

export async function recordCurrentState() {
  const router = new PlanetRouter();
  const [supabase, assignments, planets, adjacency] = await Promise.all([
    createClient(),
    getAllAssignments(),
    fetchAllPlanets(),
    router.buildAdjacencyMap(),
  ]);
  let hasNewAssignments = false;
  for (const assignment of assignments!) {
    const { data: parsedAssingnment } = await supabase
      .from("assignment")
      .select("*, objective(*)")
      .eq("id", assignment.id32);

    if (!parsedAssingnment || parsedAssingnment.length === 0) {
      await parseAssignmentAndRecord(supabase, assignment, planets);
      hasNewAssignments = true;
    } else {
      const fullParsedAssignment = parsedAssingnment[0];
      await updateObjectives(
        supabase,
        assignments ?? [],
        fullParsedAssignment,
        planets
      );
    }

    await takePlanetSnapshots(supabase, planets, adjacency);
  }

  if (hasNewAssignments) {
    //await generateStrategies();
  }
}

export async function updateObjectives(
  supabase: SupabaseClient<Database>,
  assignments: Assignment[],
  fullParsedAssignment: FullParsedAssignment,
  allPlanets: Planet[]
) {
  const currentAssignment = assignments.filter(
    (assignment) => assignment.id32 === fullParsedAssignment.id
  );

  await Promise.all(
    fullParsedAssignment.objective.map(async (objective) => {
      const currentObjectiveIndex = objective.objectiveIndex;

      if (objective.type !== ObjectiveTypes.LIBERATE_MORE) {
        let progress = currentAssignment[0].progress[currentObjectiveIndex];

        if (objective.planetId) {
          const planet = allPlanets[objective.planetId];
          if (!planet.event && planet.currentOwner === Factions.HUMANS) {
            progress = 100;
          } else {
            progress = planet.event
              ? calcPlanetProgressPercentage(
                  planet.event.health,
                  planet.event.maxHealth
                )
              : calcPlanetProgressPercentage(planet.health, planet.maxHealth);
          }
        }

        const { data, error } = await supabase
          .from("objective")
          .update({
            playerProgress: progress,
          })
          .eq("id", objective.id)
          .select();

        if (error) {
          console.warn("Insert error: ", error);
        }

        return data;
      } else {
        const amountIndex = currentAssignment[0].setting.tasks[
          currentObjectiveIndex
        ].valueTypes.findIndex((valueType) => valueType === ValueTypes.AMOUNT);

        const currentEnemyCount =
          currentAssignment[0].setting.tasks[currentObjectiveIndex].values[
            amountIndex
          ];

        const { data, error } = await supabase
          .from("objective")
          .update({
            playerProgress:
              currentAssignment[0].progress[currentObjectiveIndex],
            enemyProgress: currentEnemyCount,
          })
          .eq("id", objective.id)
          .select();

        if (error) {
          console.warn("Insert error: ", error);
        }

        return data;
      }
    })
  );
}

export async function parseAssignmentAndRecord(
  supabase: SupabaseClient<Database>,
  assignment: Assignment,
  allPlanets: Planet[]
) {
  const maxRetries = 3;
  const tasks = assignment.setting.tasks;
  const progress = assignment.progress;
  const objectives: Objective[] = [];
  const dbObjective: DBObjectiveInsert[] = [];
  const parser = new MOParser();

  for (let i = 0; i < progress.length; i++) {
    const parsedObj = await parser.getParsedObjective(
      tasks[i],
      progress[i],
      allPlanets
    );

    if (parsedObj !== null) {
      objectives.push(parsedObj);

      dbObjective.push({
        assignmentId: assignment.id32,
        planetId: parsedObj.getTargetPlanet()?.index ?? null,
        factionId: parsedObj.getTargetedFaction(),
        enemyId: parsedObj.getTargetedEnemy(),
        playerProgress: parsedObj.getPlayerProgress(),
        type: parsedObj.getObjectiveType(),
        totalAmount: parsedObj.getTotalAmount(),
        itemId: parsedObj.getItemId(),
        enemyProgress: parsedObj.getEnemyProgress(),
        stratagemId: parsedObj.getStratagemId(),
        difficulty: parsedObj.getDifficulty(),
        sectorId: parsedObj.getTargetedSector(),
        objectiveIndex: i,
      });
    }
  }

  const endTime = Date.now() + assignment.expiresIn * 1000;
  const endDate = new Date(endTime);

  let { data: newAssignment } = await supabase
    .from("assignment")
    .insert({
      id: assignment.id32,
      endDate: endDate.toISOString(),
      isMajorOrder: assignment.setting.overrideTitle.includes("ORDER"),
      title: assignment.setting.overrideTitle,
      brief: assignment.setting.overrideBrief,
      type: assignment.setting.type,
    })
    .select();

  for (let tries = 0; tries < maxRetries && !newAssignment; tries++) {
    const { data } = await supabase.from("assignment").insert({
      id: assignment.id32,
      endDate: endDate.toISOString(),
      isMajorOrder: assignment.setting.overrideTitle.includes("ORDER"),
      title: assignment.setting.overrideTitle,
      brief: assignment.setting.overrideBrief,
      type: assignment.setting.type,
    });
    newAssignment = data;
  }

  await Promise.all(
    dbObjective.map(async (objective) => {
      const { data, error } = await supabase
        .from("objective")
        .insert(objective)
        .select();

      if (error) {
        console.warn("Insert error: ", error);
      }

      return data;
    })
  );
}

export async function takePlanetSnapshots(
  supabase: SupabaseClient<Database>,
  allPlanets: Planet[],
  adjacencyMap: Map<number, DBLinks>
): Promise<void> {
  const rowsToInsert: PlanetSnapshotInsert[] = [];
  const now = new Date().toISOString();

  for (const planet of allPlanets) {
    const links = adjacencyMap.get(planet.index);

    if (!links) continue;

    const friendlyLinks = links.filter((link) => {
      const otherPlanetId =
        link.planetId === planet.index ? link.linkedPlanetId! : link.planetId!;
      return allPlanets[otherPlanetId].currentOwner === Factions.HUMANS;
    });

    const isDisabled = links.some(
      (link) =>
        (link.planetId === planet.index && link.origin_disabled) ||
        (link.linkedPlanetId === planet.index && link.destination_disabled)
    );

    if (
      (friendlyLinks.length > 0 &&
        !isDisabled &&
        planet.currentOwner !== Factions.HUMANS) ||
      planet.event
    ) {
      if (planet.event) {
        rowsToInsert.push({
          createdAt: now,
          eventId: planet.event.id,
          health: planet.event.health,
          planetId: planet.index,
          maxHealth: planet.event.maxHealth,
        });
      } else {
        rowsToInsert.push({
          createdAt: now,
          health: planet.health,
          planetId: planet.index,
          maxHealth: planet.maxHealth,
          eventId: null,
        });
      }
    }
  }

  if (rowsToInsert.length > 0) {
    await supabase.from("progressSnapshot").insert(rowsToInsert);
  }
}
