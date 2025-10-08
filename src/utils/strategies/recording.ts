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
import { fetchAllPlanets } from "../helldiversAPI/planets";
import { DBLinks, PlanetRouter } from "./routing";
import {
  calcPlanetProgressPercentage,
  calcPlanetRegenPercentage,
} from "../helldiversAPI/formulas";
import { generateStrategies, getNewestStepsForPlanets } from "./generator";
import {
  estimatePlayerImpactPerHour,
  getLatestPlanetSnapshots,
} from "./snapshots";
import { getFactionIdFromName } from "../parsing/factions";
import {
  getDispatchesAfterId,
  sanitizeDispatchMessage,
} from "../helldiversAPI/dispatch";

export async function recordCurrentState(
  supabase: SupabaseClient<Database>
): Promise<boolean> {
  const router = new PlanetRouter();
  const now = new Date().toISOString();

  const [
    assignments,
    planets,
    adjacency,
    { data: parsedAssingnments },
    snapshots,
    { data: lastRecordedDispatch },
  ] = await Promise.all([
    getAllAssignments(),
    fetchAllPlanets(),
    router.buildAdjacencyMap(supabase),
    supabase.from("assignment").select("*, objective(*)").eq("is_active", true),
    getLatestPlanetSnapshots(supabase),
    supabase
      .from("dispatch")
      .select("*")
      .order("published", { ascending: false })
      .limit(1)
      .single(),
  ]);

  if (!assignments || planets.length === 0 || !parsedAssingnments) {
    return false;
  }

  const totalPlayerCount = planets.reduce((accumulator, planet) => {
    return accumulator + planet.statistics.playerCount;
  }, 0);

  const seenAssignments = new Set<number>();

  let hasNewAssignments = false;
  for (const assignment of assignments!) {
    const parsedAssingnment = parsedAssingnments.find(
      (element) => element.id === assignment.id32
    );

    if (!parsedAssingnment) {
      await parseAssignmentAndRecord(supabase, assignment, planets, now);
      hasNewAssignments = true;
      seenAssignments.add(assignment.id32);
    } else {
      await updateObjectives(
        supabase,
        assignments!,
        parsedAssingnment,
        planets,
        now
      );
      seenAssignments.add(parsedAssingnment.id);
    }
  }

  const inactiveAssignmentIds: number[] = [];
  for (const parsedAssignment of parsedAssingnments) {
    if (
      !seenAssignments.has(parsedAssignment.id) &&
      parsedAssignment.is_active
    ) {
      inactiveAssignmentIds.push(parsedAssignment.id);
      parsedAssignment.is_active = false;
    }
    await updateSteps(supabase, parsedAssignment, planets, now);
  }

  const [unrecordedDispatches] = await Promise.all([
    getDispatchesAfterId(lastRecordedDispatch?.id ?? -Infinity),
    supabase
      .from("assignment")
      .update({ is_active: false })
      .in("id", inactiveAssignmentIds),
  ]);

  const finishedAssignments = parsedAssingnments.filter(
    (assignment) => !assignment.is_active
  );

  const estimatedPerPlayerImpact = estimatePlayerImpactPerHour(
    planets,
    snapshots
  );

  await Promise.all([
    takePlanetSnapshots(supabase, planets, adjacency),
    supabase
      .from("player_count_record")
      .insert({ player_count: totalPlayerCount, created_at: now }),
    finishObjectives(supabase, finishedAssignments),
    supabase
      .from("estimated_impact")
      .insert({ impact: estimatedPerPlayerImpact }),
    ...planets.map(async (planet) => {
      const factionId = getFactionIdFromName(planet.currentOwner);

      const { error } = await supabase
        .from("planet")
        .update({
          player_count: planet.statistics.playerCount,
          current_faction: factionId,
          latest_enemy: factionId,
          latest_regen: calcPlanetRegenPercentage(
            planet.regenPerSecond,
            planet.maxHealth
          ),
        })
        .eq("id", planet.index);

      await Promise.all(
        planet.regions.map(async (region) => {
          const { error: regionError } = await supabase
            .from("planet_region")
            .update({
              latest_regen: calcPlanetRegenPercentage(
                region.regenPerSecond,
                region.maxHealth
              ),
            })
            .eq("id", region.hash);

          if (regionError) {
            console.warn(regionError);
          }
        })
      );

      if (error) {
        console.warn(error);
      }
    }),
    supabase.from("dispatch").upsert(
      unrecordedDispatches.map((dispatch) => {
        return {
          id: dispatch.id,
          type: dispatch.type,
          message: sanitizeDispatchMessage(dispatch.message),
          published: dispatch.published,
        };
      })
    ),
  ]);

  if (hasNewAssignments) {
    //return await generateStrategies(supabase);
  }

  return true;
}

export async function updateObjectives(
  supabase: SupabaseClient<Database>,
  assignments: Assignment[],
  fullParsedAssignment: FullParsedAssignment,
  allPlanets: Planet[],
  now: string
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
            progress = calcPlanetProgressPercentage(
              planet.health,
              planet.maxHealth,
              planet.event
            );
          }
        }

        const { data, error } = await supabase
          .from("objective")
          .update({
            playerProgress: progress,
            last_updated: now,
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
            last_updated: now,
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

export async function updateSteps(
  supabase: SupabaseClient<Database>,
  assignment: FullParsedAssignment,
  allPlanets: Planet[],
  now: string
) {
  const { data: strategy } = await supabase
    .from("strategy")
    .select("*, strategyStep(*)")
    .eq("assignmentId", assignment.id)
    .single();

  if (!strategy || strategy.strategyStep.length === 0) {
    return;
  }

  const nowMilli = new Date(now).getTime();
  const endDateMilli = new Date(assignment.endDate).getTime();

  const newestSteps = getNewestStepsForPlanets(strategy.strategyStep);

  for (const step of newestSteps) {
    const planet = allPlanets[step.planetId];
    const progress = calcPlanetProgressPercentage(
      planet.health,
      planet.maxHealth,
      planet.event
    );

    if (assignment.is_active) {
      await supabase
        .from("strategyStep")
        .update({ progress: progress })
        .eq("id", step.id);
    } else if (nowMilli <= endDateMilli + 600000 && !assignment.is_active) {
      await supabase
        .from("strategyStep")
        .update({ progress: progress })
        .eq("id", step.id);
    }
  }
}

export async function parseAssignmentAndRecord(
  supabase: SupabaseClient<Database>,
  assignment: Assignment,
  allPlanets: Planet[],
  now: string
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
        last_updated: now,
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
      is_decision: assignment.setting.flags === 2,
      is_active: true,
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
      is_decision: assignment.setting.flags === 2,
      is_active: true,
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
          regenPerSecond: 0,
        });
      } else {
        rowsToInsert.push({
          createdAt: now,
          health: planet.health,
          planetId: planet.index,
          maxHealth: planet.maxHealth,
          eventId: null,
          regenPerSecond: planet.regenPerSecond,
        });
      }
    }
  }

  if (rowsToInsert.length > 0) {
    await supabase.from("progressSnapshot").insert(rowsToInsert);
  }
}

export async function finishObjectives(
  supabase: SupabaseClient<Database>,
  finishedAssignments: FullParsedAssignment[]
) {
  for (const assignment of finishedAssignments) {
    const assignmentEndDate = new Date(assignment.endDate);

    await Promise.all(
      assignment.objective.map(async (objective) => {
        const lastUpdateDate = new Date(objective.last_updated);
        const priorBreakpointDate = new Date(
          assignmentEndDate.getTime() - 60000
        ); //One minute

        if (
          objective.totalAmount &&
          calcPercentageDifference(
            objective.playerProgress,
            objective.totalAmount
          ) <= 1 &&
          lastUpdateDate <= priorBreakpointDate
        ) {
          const { data, error } = await supabase
            .from("objective")
            .update({
              playerProgress: objective.totalAmount,
            })
            .eq("id", objective.id)
            .select();

          if (error) {
            console.warn("Insert error: ", error);
          }

          return data;
        } else if (
          !objective.totalAmount &&
          100 - objective.playerProgress <= 1 &&
          lastUpdateDate <= priorBreakpointDate
        ) {
          const { data, error } = await supabase
            .from("objective")
            .update({
              playerProgress: 100,
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
}

export function calcPercentageDifference(
  progress: number,
  total: number
): number {
  return ((total - progress) / total) * 100;
}
