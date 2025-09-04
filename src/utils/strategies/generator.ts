import {
  Factions,
  FullParsedAssignment,
  ObjectiveTypes,
} from "@/lib/typeDefinitions";
import { fetchAllPlanets } from "../helldiversAPI/planets";
import { getDSS } from "../helldiversAPI/spaceStation";
import { createClient } from "../supabase/server";
import { PlanetRouter } from "./routing";
import { getLatestPlanetSnapshots } from "./snapshots";
import { getAllAssignments } from "../helldiversAPI/assignments";

export async function generateStrategies() {
  const maxRetries = 3;
  const now = new Date().toISOString();
  const supabase = await createClient();
  const currentAssignments = await getAllAssignments();

  let { data: assignments } = await supabase
    .from("assignment")
    .select("*, objective(*)")
    .gte("endDate", now);

  for (let retry = 0; retry < maxRetries && !assignments; retry++) {
    const { data } = await supabase
      .from("assignment")
      .select("*, objective(*)")
      .gte("endDate", now);
    assignments = data;
  }

  if (currentAssignments && currentAssignments.length > 0) {
    const activeIds = currentAssignments.map((assignment) => assignment.id32);
    assignments =
      assignments?.filter((assignment) => activeIds.includes(assignment.id)) ??
      [];
  } else {
    return;
  }

  if (
    !assignments ||
    assignments.length === 0 ||
    !canGenerateStrategies(assignments)
  ) {
    return;
  }

  const planetRouter = new PlanetRouter();

  const assignmentIds = assignments.map((assignment) => assignment.id);

  const [
    allPlanets,
    strategies,
    spaceStation,
    latestSnapshots,
    adjacency,
    sectors,
  ] = await Promise.all([
    fetchAllPlanets(),
    supabase
      .from("strategy")
      .select("*, strategyStep(*), dssStep(*)")
      .in("assignmentId", assignmentIds!),
    getDSS(),
    getLatestPlanetSnapshots(supabase),
    planetRouter.buildAdjacencyMap(),
    supabase.from("planet").select("id, sector"),
  ]);

  const targets: {
    objectiveId: number;
    targetId: number;
  }[] = [];

  for (const assignment of assignments) {
    for (const objective of assignment.objective) {
      if (
        (!objective.factionId || objective.type === ObjectiveTypes.KILL) &&
        !objective.planetId &&
        !objective.sectorId
      ) {
        continue;
      }

      if (objective.type === ObjectiveTypes.LIBERATE) {
        const linkedPlanets = adjacency.get(objective.planetId!);

        if (linkedPlanets) {
          const route = await planetRouter.findShortestRoute(
            allPlanets[objective.planetId!]
          );

          route.pop();
          route.shift();

          for (const planet of route) {
            targets.push({
              objectiveId: objective.id,
              targetId: planet.index,
            });
          }
        }

        targets.push({
          objectiveId: objective.id,
          targetId: objective.planetId!,
        });
      } else if (
        objective.type === ObjectiveTypes.DEFEND ||
        objective.type === ObjectiveTypes.HOLD
      ) {
        const planet = allPlanets[objective.planetId!];
        const linkedPlanets = adjacency.get(objective.planetId!);

        if (planet.currentOwner !== Factions.HUMANS || planet.event) {
          if (!planet.event) {
            if (linkedPlanets) {
              const route = await planetRouter.findShortestRoute(
                allPlanets[objective.planetId!]
              );

              route.pop();
              route.shift();

              for (const planet of route) {
                targets.push({
                  objectiveId: objective.id,
                  targetId: planet.index,
                });
              }
            }
          }

          targets.push({
            objectiveId: objective.id,
            targetId: objective.planetId!,
          });
        } else if (planet.currentOwner === Factions.HUMANS && !planet.event) {
          for (const link of linkedPlanets!) {
            const otherPlanetId =
              link.planetId === planet.index
                ? link.linkedPlanetId!
                : link.planetId!;
            const isDisabled =
              link.planetId === planet.index
                ? link.destination_disabled!
                : link.origin_disabled!;
            if (
              allPlanets[otherPlanetId].currentOwner !== Factions.HUMANS &&
              !isDisabled
            ) {
              targets.push({
                objectiveId: objective.id,
                targetId: otherPlanetId,
              });
            }
          }
        }
      } else if (objective.type === ObjectiveTypes.DEFEND_AMOUNT) {
        if (objective.factionId && objective.sectorId) {
        } else if (objective.factionId && !objective.sectorId) {
        } else if (!objective.factionId && objective.sectorId) {
        } else {
        }
      }
    }
  }

  let playerbasePercentage = 100;
}

export function canGenerateStrategies(
  assignments: FullParsedAssignment[]
): boolean {
  for (const assignment of assignments) {
    const isPossible = assignment.objective.some(
      (objective) =>
        (objective.factionId && objective.type !== ObjectiveTypes.KILL) ||
        objective.planetId ||
        objective.sectorId
    );

    if (isPossible) return isPossible;
  }

  return false;
}
