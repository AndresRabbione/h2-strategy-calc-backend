import {
  FullParsedAssignment,
  ObjectiveTypes,
  Planet,
  RegionSplitInsert,
  StrategyStepFull,
  StrategyStepInsert,
} from "@/lib/typeDefinitions";
import { fetchAllPlanets } from "../helldiversAPI/planets";
import { PlanetRouter } from "./routing";
import {
  estimatePlayerImpactPerHour,
  getLatestPlanetSnapshots,
} from "./snapshots";
import { getAllAssignments } from "../helldiversAPI/assignments";
import {
  getAllTargetsForAssignment,
  getFinalTargetList,
  getTargetsForDecisionAssignment,
  ValidatedTargeting,
} from "./targeting";
import {
  calcHourlyPlayerProgress,
  calcPlanetProgressPercentage,
} from "../helldiversAPI/formulas";
import { calcMinOffense } from "../parsing/winning";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../../../database.types";

type Allocation = {
  planet: number;
  regions: number[];
};

export async function generateStrategies(
  supabase: SupabaseClient<Database>
): Promise<boolean> {
  const maxRetries = 3;
  const now = new Date().toISOString();

  console.time("Initial fetching");

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

  console.timeEnd("Initial fetching");

  if (!currentAssignments) {
    return false;
  }

  if (currentAssignments && currentAssignments.length > 0) {
    const activeIds = currentAssignments.map((assignment) => assignment.id32);
    assignments =
      assignments?.filter((assignment) => activeIds.includes(assignment.id)) ??
      [];
  } else {
    return true;
  }

  if (
    !assignments ||
    assignments.length === 0 ||
    !canGenerateStrategies(assignments)
  ) {
    return true;
  }

  const planetRouter = new PlanetRouter();

  const assignmentIds = assignments.map((assignment) => assignment.id);

  console.time("Second fetching");

  const [
    allPlanets,
    latestSnapshots,
    adjacency,
    { data: strategies },
    { data: sectors },
  ] = await Promise.all([
    fetchAllPlanets(),
    getLatestPlanetSnapshots(supabase),
    planetRouter.buildAdjacencyMap(supabase),
    supabase
      .from("strategy")
      .select("*, strategyStep(*), dssStep(*)")
      .in("assignmentId", assignmentIds!),
    supabase.from("planet").select("id, sector"),
  ]);

  const rawStrategies = strategies!.map((strategy) => {
    return { id: strategy.id, assignmentId: strategy.assignmentId };
  });
  const currentStrategySteps =
    strategies?.flatMap((strategy) => strategy.strategyStep) ?? [];

  const totalPlayerCount = allPlanets.reduce((accumulator, planet) => {
    return accumulator + planet.statistics.playerCount;
  }, 0);

  const estimatedPerPlayerImpact = estimatePlayerImpactPerHour(
    allPlanets,
    latestSnapshots
  );

  console.timeEnd("Second fetching");

  console.time("Target gathering");

  const targets = new Map<number, Set<number>>();

  for (const assignment of assignments) {
    if (!assignment.is_decision) {
      getAllTargetsForAssignment(
        assignment,
        allPlanets,
        adjacency,
        sectors ?? [],
        targets
      );
    } else {
      getTargetsForDecisionAssignment(
        assignment,
        targets,
        allPlanets,
        planetRouter,
        adjacency,
        sectors ?? []
      );
    }

    const strategyForAssignment = strategies?.find(
      (strategy) => strategy.assignmentId === assignment.id
    );

    if (!strategyForAssignment) {
      const { data: newStrategies } = await supabase
        .from("strategy")
        .insert({ assignmentId: assignment.id })
        .select();

      rawStrategies.push(...(newStrategies ?? []));
    }
  }

  console.timeEnd("Target gathering");

  console.time("Final Target gathering");

  const finalTargets = getFinalTargetList(
    targets,
    assignments,
    allPlanets,
    adjacency,
    estimatedPerPlayerImpact,
    totalPlayerCount
  );

  console.timeEnd("Final Target gathering");

  console.time("Step generation");

  const newSteps = generateStepsFromTargets(
    finalTargets,
    allPlanets,
    totalPlayerCount,
    estimatedPerPlayerImpact,
    assignments,
    rawStrategies,
    now,
    currentStrategySteps
  );

  const [{ data: insertedSteps }] = await Promise.all([
    supabase.from("strategyStep").insert(newSteps.toInsert).select(),
    supabase.from("strategyStep").upsert(newSteps.toUpdate).select(),
  ]);

  console.timeEnd("Step generation");

  console.time("Region splits");

  const regionSplits = getSplitsForTargets(
    insertedSteps ?? [],
    allPlanets,
    now,
    estimatedPerPlayerImpact,
    totalPlayerCount
  );

  await supabase.from("planet_region_split").insert(regionSplits);

  console.timeEnd("Region splits");

  return true;
}

/**
 * This function is used to skip repeating this check later on and filters out
 * strategies that have no targets
 */
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

export function generateStepsFromTargets(
  finalTargets: ValidatedTargeting[],
  allPlanets: Planet[],
  totalPlayerCount: number,
  estimatedPerPlayerImpact: number,
  assignments: FullParsedAssignment[],
  rawStrategies: { id: number; assignmentId: number }[],
  now: string,
  currentStrategySteps: StrategyStepFull[]
): {
  toInsert: StrategyStepInsert[];
  toUpdate: StrategyStepFull[];
} {
  let playerbasePercentage = 100;

  const createdSteps: StrategyStepInsert[] = [];
  const updatedSteps: StrategyStepFull[] = [];
  const seenTargets = new Set<number>();
  let firstIndependantId: number | null = null;

  for (const target of finalTargets) {
    //We'll circle back later
    if (!target.needsCompletion || seenTargets.has(target.targetId)) continue;

    seenTargets.add(target.targetId);

    if (!firstIndependantId && target.dependants.length === 0)
      firstIndependantId = target.targetId;

    const planetTarget = allPlanets[target.targetId];

    let runningTotal = calcMinOffense(
      estimatedPerPlayerImpact,
      totalPlayerCount,
      allPlanets[target.targetId],
      target.timeRemaining
    );

    const dependantTargets = finalTargets.filter((dependant) =>
      target.dependants.includes(dependant.targetId)
    );

    const strategyId = getStrategyIdForObjectives(
      assignments,
      target.objectiveIds,
      rawStrategies
    );

    const mainProgress = calcPlanetProgressPercentage(
      planetTarget.health,
      planetTarget.maxHealth,
      planetTarget.event
    );

    const temporarySteps: StrategyStepInsert[] = [
      {
        planetId: target.targetId,
        playerPercentage: runningTotal,
        strategyId: strategyId,
        created_at: now,
        progress: mainProgress,
        limit_date: new Date(Date.now() + target.timeRemaining).toISOString(),
      },
    ];

    for (const dependant of dependantTargets) {
      if (seenTargets.has(dependant.targetId)) continue;

      seenTargets.add(dependant.targetId);

      const dependantPlanet = allPlanets[dependant.targetId];

      const dependantProgress = calcPlanetProgressPercentage(
        dependantPlanet.health,
        dependantPlanet.maxHealth,
        dependantPlanet.event
      );

      const dependantOffense = calcMinOffense(
        estimatedPerPlayerImpact,
        totalPlayerCount,
        allPlanets[dependant.targetId],
        dependant.timeRemaining
      );
      runningTotal += dependantOffense;

      const dependantStep = {
        planetId: dependant.targetId,
        playerPercentage: dependantOffense,
        strategyId: strategyId,
        created_at: now,
        progress: dependantProgress,
        limit_date: new Date(
          Date.now() + target.timeRemaining * 60 * 60 * 1000
        ).toISOString(),
      };

      temporarySteps.push(dependantStep);
    }

    if (runningTotal <= playerbasePercentage) {
      playerbasePercentage -= runningTotal;
      for (const step of temporarySteps) {
        const priorStep = currentStrategySteps?.find(
          (recordedStep) => recordedStep.planetId === step.planetId
        );

        if (priorStep && priorStep.playerPercentage === step.playerPercentage) {
          updatedSteps.push({ ...priorStep, progress: step.progress });
        } else {
          createdSteps.push(step);
        }
      }
    } else if (target.dependants.length > 0) {
      continue;
    } else {
      break;
    }
  }

  if (playerbasePercentage > 0) {
    const alreadyTargetedIds = new Set<number>(
      createdSteps.concat(updatedSteps).map((step) => step.planetId)
    );
    const longTermTargets = finalTargets.filter(
      (target) =>
        !target.needsCompletion && !alreadyTargetedIds.has(target.targetId)
    );

    if (longTermTargets.length > 0) {
      const selectedTarget = longTermTargets[0];

      const strategyId = getStrategyIdForObjectives(
        assignments,
        selectedTarget.objectiveIds,
        rawStrategies
      );

      const planet = allPlanets[selectedTarget.targetId];
      const progress = calcPlanetProgressPercentage(
        planet.health,
        planet.maxHealth,
        planet.event
      );

      const leftoverStep: StrategyStepInsert = {
        planetId: longTermTargets[0].targetId,
        playerPercentage: playerbasePercentage,
        strategyId: strategyId,
        created_at: now,
        progress: progress,
        limit_date: new Date(
          Date.now() + longTermTargets[0].timeRemaining / 3600000
        ).toISOString(),
      };

      createdSteps.push(leftoverStep);
    } else {
      const firstInsert = createdSteps[0];
      const firstUpdate = updatedSteps[0];

      if (!firstInsert && firstUpdate) {
        updatedSteps[0].playerPercentage += playerbasePercentage;
      } else if (firstInsert && !firstUpdate) {
        createdSteps[0].playerPercentage += playerbasePercentage;
      } else {
        if (
          allPlanets[firstInsert.planetId].regenPerSecond <
          allPlanets[firstUpdate.planetId].regenPerSecond
        ) {
          createdSteps[0].playerPercentage += playerbasePercentage;
        } else {
          updatedSteps[0].playerPercentage += playerbasePercentage;
        }
      }
    }
  }

  const cleanupSteps = genererateStepCleanup(
    createdSteps,
    currentStrategySteps,
    now,
    allPlanets
  );

  return {
    toInsert: createdSteps.concat(cleanupSteps),
    toUpdate: updatedSteps,
  };
}

export function genererateStepCleanup(
  newSteps: StrategyStepInsert[],
  currentSteps: StrategyStepFull[],
  now: string,
  allPlanets: Planet[]
): StrategyStepInsert[] {
  const cleanupSteps: StrategyStepInsert[] = [];

  const selectedTargetIds = newSteps.map((step) => step.planetId);

  for (const step of currentSteps) {
    if (selectedTargetIds.includes(step.planetId)) continue;

    const planet = allPlanets[step.planetId];

    const progress = calcPlanetProgressPercentage(
      planet.health,
      planet.maxHealth,
      planet.event
    );

    const newStep: StrategyStepInsert = {
      planetId: step.planetId,
      playerPercentage: 0,
      strategyId: step.strategyId,
      created_at: now,
      progress: progress,
      limit_date: step.limit_date,
    };

    cleanupSteps.push(newStep);
  }

  return cleanupSteps;
}

function getStrategyIdForObjectives(
  assignments: FullParsedAssignment[],
  objectiveIds: number[],
  strategies: { id: number; assignmentId: number }[]
): number {
  const objectiveIdsSet = new Set<number>(objectiveIds);
  let idsFound = 0;
  let maxAssignmentId: number | null = null;
  let maxCount = -Infinity;

  for (const assignment of assignments) {
    let count = 0;

    for (const objective of assignment.objective) {
      if (objectiveIdsSet.has(objective.id)) {
        count++;
        idsFound++;
      }
    }

    if (count > maxCount) {
      maxCount = count;
      maxAssignmentId = assignment.id;
    }

    if (idsFound >= objectiveIds.length) break;
  }

  const strategy = strategies.find(
    (strategy) => strategy.assignmentId === maxAssignmentId
  );

  return strategy!.id;
}

function simulateCompletionTime(
  planet: Planet,
  alloc: Allocation,
  timeHorizon: number
): number | null {
  let t = 0;
  const dt = 0.1;
  let planetHealth = planet.event ? planet.event.health : planet.health;
  const regionsHealth = planet.regions.map((region) => region.health);

  while (t < timeHorizon) {
    const planetRegen = (planet.event ? 0 : planet.regenPerSecond) * 3600;

    const regionRegens = planet.regions.map(
      (region) => region.regenPerSecond * 3600
    );

    planetHealth -= (alloc.planet - planetRegen) * dt;

    for (let i = 0; i < planet.regions.length; i++) {
      if (!planet.regions[i].isAvailable) continue;

      if (regionsHealth[i] > 0 && alloc.regions[i] > 0) {
        regionsHealth[i] -= (alloc.regions[i] - regionRegens[i]) * dt;

        if (regionsHealth[i] <= 0) {
          planetHealth -= planet.regions[i].maxHealth * 1.5;

          regionsHealth[i] = 0;
        }
      }
    }

    if (planetHealth <= 0) return t;
    t += dt;
  }

  return null;
}

export function optimizeRegionAllocation(
  planet: Planet,
  timeHorizon: number,
  estimatedPerPlayerImpact: number,
  totalPlayerCount: number,
  step: StrategyStepFull,
  planetMaxHealth: number
): Allocation {
  let bestAlloc: Allocation = {
    planet: calcHourlyPlayerProgress(
      estimatedPerPlayerImpact,
      totalPlayerCount,
      step.playerPercentage,
      planetMaxHealth
    ),
    regions: Array(planet.regions.length).fill(0),
  };
  let bestTime =
    simulateCompletionTime(planet, bestAlloc, timeHorizon) ?? Infinity;

  if (bestTime === Infinity) {
    bestTime =
      simulateCompletionTime(planet, bestAlloc, timeHorizon * 2) ?? Infinity;
  }

  let improved = true;
  while (improved) {
    improved = false;

    for (let i = 0; i < planet.regions.length; i++) {
      if (!planet.regions[i].isAvailable) continue;

      const chunk = Math.min(2500, bestAlloc.planet);

      if (chunk <= 0) continue;

      const trial: Allocation = {
        planet: bestAlloc.planet - chunk,
        regions: [...bestAlloc.regions],
      };
      trial.regions[i] += chunk;

      let time = simulateCompletionTime(planet, trial, timeHorizon);

      if (time === null) {
        time = simulateCompletionTime(planet, trial, timeHorizon * 1.5);
      }

      if (time !== null && time < bestTime) {
        bestTime = time;
        bestAlloc = trial;
        improved = true;
      }
    }
  }

  return bestAlloc;
}

export function getSplitsForTargets(
  newSteps: StrategyStepFull[],
  allPlanets: Planet[],
  now: string,
  estimatedPerPlayerImpact: number,
  totalPlayerCount: number
): RegionSplitInsert[] {
  const regionSplits: RegionSplitInsert[] = [];

  for (const step of newSteps) {
    const planet = allPlanets[step.planetId];
    const timeHorizon =
      (new Date(step.limit_date).getTime() - Date.now()) / 3600000;

    console.log(new Date(timeHorizon * 3600000 + Date.now()));
    const assingedPlayerCount =
      totalPlayerCount * (step.playerPercentage / 100);

    const planetMaxHealth = planet.event
      ? planet.event.maxHealth
      : planet.maxHealth;

    const allocation = optimizeRegionAllocation(
      allPlanets[step.planetId],
      timeHorizon,
      estimatedPerPlayerImpact,
      totalPlayerCount,
      step,
      planetMaxHealth
    );

    console.log(allocation);

    if (allocation.planet > 0) {
      const percentage =
        allocation.planet / estimatedPerPlayerImpact / assingedPlayerCount;
      const mainSplit: RegionSplitInsert = {
        planet_id: planet.index,
        step_id: step.id,
        region_id: null,
        created_at: now,
        percentage: percentage * 100,
      };
      regionSplits.push(mainSplit);
    }

    for (let i = 0; i < planet.regions.length; i++) {
      const currentRegion = planet.regions[i];
      const currentRegionAllocation = allocation.regions[i];

      if (currentRegionAllocation <= 0) continue;

      const percentage =
        currentRegionAllocation /
        estimatedPerPlayerImpact /
        assingedPlayerCount;
      const secondarySplit: RegionSplitInsert = {
        planet_id: planet.index,
        step_id: step.id,
        region_id: currentRegion.hash,
        created_at: now,
        percentage: percentage * 100,
      };

      regionSplits.push(secondarySplit);
    }
  }
  return regionSplits;
}
