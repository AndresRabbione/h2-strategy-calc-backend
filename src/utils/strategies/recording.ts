import { getAllAssignments } from "../helldiversAPI/assignments";
import { Database } from "../../../database.types";
import {
  Assignment,
  CostInsert,
  DBObjectiveInsert,
  DBPlanet,
  Factions,
  FullParsedAssignment,
  ObjectiveTypes,
  Planet,
  PlanetSnapshotInsert,
  SpaceStationV2,
  StationStatusInsert,
  TacticalActionInsert,
  ValueTypes,
} from "@/lib/typeDefinitions";
import { Objective } from "../objectives/classes";
import { MOParser } from "./parsing";
import { SupabaseClient } from "@supabase/supabase-js";
import { fetchAllPlanets } from "../helldiversAPI/planets";
import { DBLinks, PlanetRouter } from "./routing";
import {
  calcEnemyProgressForEvent,
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
import { warStartTime } from "@/lib/constants";
import { getObjectiveTextMarkup } from "../objectives/textFormation";
import { stationStrategicDescriptionToPlainText } from "../parsing/spaceStations";
import { getAllSpaceStations } from "../helldiversAPI/spaceStation";

export async function recordCurrentState(
  supabase: SupabaseClient<Database>
): Promise<boolean> {
  console.time("Initial Fetching");
  const router = new PlanetRouter();
  const now = new Date().toISOString();

  const [
    assignments,
    planets,
    adjacency,
    { data: parsedAssingnments },
    snapshots,
    { data: lastRecordedDispatch },
    { data: eventIds },
    { data: dbPlanets },
    spaceStations,
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
    supabase.from("planet_event").select("id"),
    supabase.from("planet").select("*").order("id", { ascending: true }),
    getAllSpaceStations(),
  ]);

  if (
    !assignments ||
    planets.length === 0 ||
    !parsedAssingnments ||
    !eventIds
  ) {
    return false;
  }

  const flattenedEventIds = eventIds.map((event) => event.id);

  const totalPlayerCount = planets.reduce((accumulator, planet) => {
    return accumulator + planet.statistics.playerCount;
  }, 0);

  const seenAssignments = new Set<number>();

  console.timeEnd("Initial Fetching");

  console.time("Assignment parsing, recording, and updating");

  let hasNewAssignments = false;
  for (const assignment of assignments!) {
    const parsedAssingnment = parsedAssingnments.find(
      (element) => element.id === assignment.id32
    );

    if (!parsedAssingnment) {
      await parseAssignmentAndRecord(
        supabase,
        assignment,
        planets,
        now,
        dbPlanets ?? []
      );

      hasNewAssignments = true;
      seenAssignments.add(assignment.id32);
    } else {
      await updateObjectives(
        supabase,
        assignments,
        parsedAssingnment,
        planets,
        now
      );
      seenAssignments.add(parsedAssingnment.id);
    }
  }

  console.timeEnd("Assignment parsing, recording, and updating");

  console.time("Assignment activity and step progress update");

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

  const [unrecordedDispatches, { error: assignmentError }] = await Promise.all([
    getDispatchesAfterId(lastRecordedDispatch?.id ?? -Infinity),
    supabase
      .from("assignment")
      .update({
        is_active: false,
        actual_end_date: new Date(Date.now() - 300000).toISOString(),
      })
      .in("id", inactiveAssignmentIds),
  ]);

  if (assignmentError) {
    console.warn(
      `Error disabling assignments ${inactiveAssignmentIds}`,
      assignmentError
    );
  } else if (!assignmentError && inactiveAssignmentIds.length > 0) {
    console.log(`Disabled assignments ${inactiveAssignmentIds}`);
  }

  console.timeEnd("Assignment activity and step progress update");

  console.time("Snapshots, objective cleanup, various recording");

  const finishedAssignments = parsedAssingnments.filter(
    (assignment) => !assignment.is_active
  );

  const estimatedPerPlayerImpact = estimatePlayerImpactPerHour(
    planets,
    snapshots
  );

  const [
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _snapshots,
    { error: playerCountError },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _objComplete,
    { error: impactError },
  ] = await Promise.all([
    takePlanetSnapshots(supabase, planets, adjacency),
    supabase.from("player_count_record").insert({
      player_count: totalPlayerCount,
      created_at: now,
    }),
    finishObjectives(supabase, finishedAssignments),
    supabase
      .from("estimated_impact")
      .insert({ impact: estimatedPerPlayerImpact }),
    updatePlanetStatus(planets, supabase, new Set(flattenedEventIds)),
    supabase.from("dispatch").upsert(
      unrecordedDispatches.map((dispatch) => {
        const dispatchText = sanitizeDispatchMessage(dispatch.message);
        if (dispatchText.title === "") dispatchText.title = "BREAKING NEWS";

        return {
          id: dispatch.id,
          type: dispatch.type,
          body: dispatchText.body,
          published: dispatch.published,
          title: dispatchText.title,
        };
      })
    ),
    updateSpaceStationsStatus(spaceStations ?? [], supabase),
  ]);

  console.log("Planet statistics updated");

  if (playerCountError) {
    console.warn("Error updating total player count", playerCountError);
  } else {
    console.log("Total player count updated successfully");
  }

  if (impactError) {
    console.warn("Error updating player impact record", impactError);
  } else {
    console.log("Player impact record updated successfully");
  }

  console.timeEnd("Snapshots, objective cleanup, various recording");

  if (hasNewAssignments) {
    return await generateStrategies(supabase);
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
          console.warn("Error updating objective: ", error);
        } else {
          console.log(`Updated objective ${objective.id}`);
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
          console.warn("Error updating objective: ", error);
        } else {
          console.log(`Updated objective ${objective.id}`);
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
      const { error } = await supabase
        .from("strategyStep")
        .update({ progress: progress })
        .eq("id", step.id);

      if (error) {
        console.warn(`Error updating step ${step.id}: `, error);
      } else {
        console.log(`Updated step ${step.id}`);
      }
    } else if (nowMilli <= endDateMilli + 600000 && !assignment.is_active) {
      const { error } = await supabase
        .from("strategyStep")
        .update({ progress: progress })
        .eq("id", step.id);

      if (error) {
        console.warn(`Error cleaning up step ${step.id}: `, error);
      } else {
        console.log(`Cleaned up step ${step.id}`);
      }
    }
  }
}

export async function parseAssignmentAndRecord(
  supabase: SupabaseClient<Database>,
  assignment: Assignment,
  allPlanets: Planet[],
  now: string,
  allDBPlanets: DBPlanet[]
) {
  const tasks = assignment.setting.tasks;
  const progress = assignment.progress;
  const objectives: Objective[] = [];
  const dbObjective: DBObjectiveInsert[] = [];
  const parser = new MOParser(supabase);

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
        difficulty: parsedObj.getDifficulty(),
        sectorId: parsedObj.getTargetedSector(),
        objectiveIndex: i,
        last_updated: now,
        parsed_text: "",
      });
    }
  }

  const endTime = Date.now() + assignment.expiresIn * 1000;
  const endDate = new Date(endTime);
  const startDate = new Date(warStartTime + assignment.startTime * 1000);

  const { error } = await supabase
    .from("assignment")
    .insert({
      id: assignment.id32,
      endDate: endDate.toISOString(),
      isMajorOrder: assignment.setting.overrideTitle.includes("MAJOR"),
      title: assignment.setting.overrideTitle,
      brief: assignment.setting.overrideBrief,
      type: assignment.setting.type,
      is_decision: assignment.setting.flags === 2,
      is_active: true,
      start_date: startDate.toISOString(),
    })
    .select();

  if (!error) {
    console.log(`Recorded new assignment with id: ${assignment.id32}`);
  } else {
    console.warn(`Error recording new assignment ${assignment.id32}`, error);
    return;
  }

  await Promise.all(
    dbObjective.map(async (objective) => {
      objective.parsed_text = await getObjectiveTextMarkup(
        objective,
        allDBPlanets
      );
      const { data, error } = await supabase
        .from("objective")
        .insert(objective)
        .select()
        .single();

      if (error) {
        console.warn(
          `Error creating new objective from assignment ${objective.assignmentId} at index ${objective.objectiveIndex}: `,
          error
        );
      } else {
        console.log(`Objective ${data.id} created successfully`);
      }

      return data;
    })
  );
}

export async function takePlanetSnapshots(
  supabase: SupabaseClient<Database>,
  allPlanets: Planet[],
  adjacencyMap: Map<number, DBLinks[]>
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
          assignmentEndDate.getTime() - 1200000
        ); //Twenty minutes

        if (
          objective.totalAmount &&
          calcPercentageDifference(
            objective.playerProgress,
            objective.totalAmount
          ) <= 5 &&
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
          100 - objective.playerProgress <= 5 &&
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

export async function updateSpaceStationsStatus(
  spaceStations: SpaceStationV2[],
  supabase: SupabaseClient<Database>
) {
  const { data: dbStations, error: stationsError } = await supabase
    .from("station_status")
    .select("*, tacticalAction(*, tactical_action_cost(*))")
    .in(
      "id",
      spaceStations.map((station) => station.id32)
    );

  if (stationsError || !dbStations) {
    console.warn("Error fetching Space Stations from DB", stationsError);
    return;
  }

  const knownStations = new Set<number>(dbStations.map((s) => s.id));

  const stationsToUpdate: StationStatusInsert[] = [];
  const actionsToUpdate: Partial<TacticalActionInsert>[] = [];
  const costsToUpdate: Partial<CostInsert>[] = [];

  for (const station of spaceStations) {
    if (!knownStations.has(station.id32)) continue;

    stationsToUpdate.push({
      id: station.id32,
      current_planet: station.planet.index,
      election_end: station.electionEnd,
    });

    for (const action of station.tacticalActions) {
      actionsToUpdate.push({
        id: action.id32,
        status: action.status,
        status_expire_time: action.statusExpire,
      });

      for (const cost of action.costs) {
        costsToUpdate.push({
          id: cost.id,
          current_amount: cost.currentValue,
          delta_per_second: cost.deltaPerSecond,
        });
      }
    }
  }

  await Promise.all([
    stationsToUpdate.length &&
      supabase.from("station_status").upsert(stationsToUpdate),

    actionsToUpdate.length &&
      Promise.all(
        actionsToUpdate.map((action) =>
          supabase.from("tacticalAction").update(action).eq("id", action.id!)
        )
      ),

    costsToUpdate.length &&
      Promise.all(
        costsToUpdate.map((cost) =>
          supabase.from("tactical_action_cost").update(cost).eq("id", cost.id!)
        )
      ),
  ]);

  const unknownStations = spaceStations.filter(
    (station) => !knownStations.has(station.id32)
  );

  if (unknownStations.length > 0) {
    await recordNewSpaceStations(unknownStations, supabase);
  }
}

export async function recordNewSpaceStations(
  spaceStations: SpaceStationV2[],
  supabase: SupabaseClient<Database>
) {
  const stationsToInsert: StationStatusInsert[] = spaceStations.map(
    (station) => ({
      id: station.id32,
      current_planet: station.planet.index,
      election_end: station.electionEnd,
    })
  );

  const { error } = await supabase
    .from("station_status")
    .insert(stationsToInsert)
    .select();
  if (error) {
    console.warn(`Error creating new stations: `, error);
    return;
  }

  const actionsToInsert: TacticalActionInsert[] = [];
  const costsToInsert: CostInsert[] = [];

  for (const station of spaceStations) {
    for (const action of station.tacticalActions) {
      actionsToInsert.push({
        id: action.id32,
        name: action.name,
        status: action.status,
        description: action.description,
        tactical_description: stationStrategicDescriptionToPlainText(
          action.strategicDescription
        ),
        status_expire_time: action.statusExpire,
        station_id: station.id32,
      });

      for (const cost of action.costs) {
        costsToInsert.push({
          id: cost.id,
          action_id: action.id32,
          item_id: cost.itemMixId,
          amount_required: cost.targetValue,
          current_amount: cost.currentValue,
          delta_per_second: cost.deltaPerSecond,
        });
      }
    }
  }

  await Promise.all([
    actionsToInsert.length &&
      supabase.from("tacticalAction").insert(actionsToInsert),
    costsToInsert.length &&
      supabase.from("tactical_action_cost").insert(costsToInsert),
  ]);
}

export async function updatePlanetStatus(
  allPlanets: Planet[],
  supabase: SupabaseClient<Database>,
  eventIds: Set<number>
) {
  await Promise.all(
    allPlanets.map(async (planet) => {
      const factionId = getFactionIdFromName(planet.currentOwner);
      const event = planet.event;

      if (event && !eventIds.has(event.id)) {
        const { error } = await supabase.from("planet_event").insert({
          id: event.id,
          faction: getFactionIdFromName(event.faction),
          max_health: event.maxHealth,
          start_time: event.startTime,
          end_time: event.endTime,
          progress_per_hour: calcEnemyProgressForEvent(
            event.startTime,
            event.endTime
          ),
        });

        if (error) {
          console.warn(`Error recording event ${event.id}`, error);
        } else {
          console.log(`Event ${event.id} recorded successfully`);
        }
      }

      const { error: planetError } = await supabase
        .from("planet")
        .update({
          player_count: planet.statistics.playerCount,
          current_faction: factionId,
          latest_enemy: factionId,
          latest_regen: calcPlanetRegenPercentage(
            planet.regenPerSecond,
            planet.maxHealth
          ),
          current_event: event?.id ?? null,
        })
        .eq("id", planet.index);

      if (planetError) {
        console.warn(`Error updating ${planet.name} statistics`, planetError);
      }

      // Region updates
      await Promise.all(
        planet.regions.map(async (region) => {
          const latestRegen = calcPlanetRegenPercentage(
            region.regenPerSecond,
            region.maxHealth
          );

          const { error } = await supabase
            .from("planet_region")
            .update({
              latest_regen: latestRegen,
              current_faction: region.health === 0 ? 1 : factionId,
              latest_player_count: region.players,
            })
            .eq("id", region.hash);

          if (error) {
            console.warn(`Error updating region ${region.name}`, error);
          }
        })
      );
    })
  );
}
