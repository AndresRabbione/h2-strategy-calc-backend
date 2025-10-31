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
import { calcPlanetProgressPercentage } from "../helldiversAPI/formulas";
import { calcMinOffense } from "../parsing/winning";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../../../database.types";
import { playerImpactBaselineEstimate } from "@/lib/constants";

type Allocation = {
  planet: number;
  regions: number[];
};

export async function generateStrategies(
  supabase: SupabaseClient<Database>
): Promise<boolean> {
  const now = new Date().toISOString();

  console.time("Initial fetching");

  const currentAssignments = await getAllAssignments();
  let { data: assignments } = await supabase
    .from("assignment")
    .select("*, objective(*)")
    .gte("endDate", now);

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
    console.log("No active assignments found, stopping");
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
      .in("assignmentId", assignmentIds),
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

  const estimatedPerPlayerImpact =
    estimatePlayerImpactPerHour(allPlanets, latestSnapshots) ||
    playerImpactBaselineEstimate;

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
      const { data: newStrategy, error } = await supabase
        .from("strategy")
        .insert({ assignmentId: assignment.id })
        .select()
        .single();

      if (error) {
        console.warn(
          `Error creating new strategy for assignment ${assignment.id}`,
          error
        );
      } else {
        rawStrategies.push(newStrategy);
        console.log(`New strategy ${newStrategy.id} created`);
      }
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

  finalTargets.sort((a, b) => {
    if (a.objectiveIds.length !== b.objectiveIds.length) {
      return b.objectiveIds.length - a.objectiveIds.length;
    }

    return (
      allPlanets[a.targetId].regenPerSecond -
      allPlanets[b.targetId].regenPerSecond
    );
  });

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

  const [{ data: insertedSteps, error: stepInsertError }, updatedResults] =
    await Promise.all([
      supabase.from("strategyStep").insert(newSteps.toInsert).select(),
      Promise.all(
        newSteps.toUpdate.map((step) =>
          supabase
            .from("strategyStep")
            .update({ progress: step.progress })
            .eq("id", step.id)
            .select()
            .single()
        )
      ),
    ]);

  if (stepInsertError) {
    console.log(`Error when inserting steps`, stepInsertError);
  }

  const updatedSteps = updatedResults
    .map((result) => result.data)
    .filter((result) => result !== null);

  console.timeEnd("Step generation");

  console.time("Region splits");

  const regionSplits = await getSplitsForTargets(
    insertedSteps?.concat(updatedSteps) ?? updatedSteps,
    allPlanets,
    now,
    estimatedPerPlayerImpact,
    totalPlayerCount,
    supabase
  );

  const { error: splitError } = await supabase
    .from("planet_region_split")
    .insert(regionSplits);

  if (splitError) {
    console.warn(`Error when creating region splits`, splitError);
  } else {
    console.log("Region splits created successfully");
  }

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
  if (finalTargets.length === 0) return { toInsert: [], toUpdate: [] };
  let playerbasePercentage = 100;

  const createdSteps: StrategyStepInsert[] = [];
  const updatedSteps: StrategyStepFull[] = [];
  const interimSteps: StrategyStepInsert[] = [];
  const seenTargets = new Set<number>();
  let firstIndependantId: number | null = null;

  for (const target of finalTargets) {
    if (!target.needsCompletion || seenTargets.has(target.targetId)) {
      continue;
    }

    seenTargets.add(target.targetId);

    const planetTarget = allPlanets[target.targetId];

    const mainProgress = calcPlanetProgressPercentage(
      planetTarget.health,
      planetTarget.maxHealth,
      planetTarget.event
    );

    const strategyId = getStrategyIdForObjectives(
      assignments,
      target.objectiveIds,
      rawStrategies
    );

    if (!target.valid) {
      const futureStep = {
        planetId: target.targetId,
        playerPercentage: 0,
        strategyId: strategyId,
        created_at: now,
        progress: mainProgress,
        limit_date: new Date(Date.now() + target.timeRemaining).toISOString(),
      };

      interimSteps.push(futureStep);

      continue;
    }

    if (!firstIndependantId && target.dependants.length === 0)
      firstIndependantId = target.targetId;

    let runningTotal = calcMinOffense(
      estimatedPerPlayerImpact,
      totalPlayerCount,
      allPlanets[target.targetId],
      target.timeRemaining
    );

    const dependantTargets = finalTargets.filter((dependant) =>
      target.dependants.includes(dependant.targetId)
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
        strategyId,
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
      interimSteps.push(...temporarySteps);
    } else if (target.dependants.length > 0) {
      continue;
    } else {
      break;
    }
  }

  if (playerbasePercentage > 0) {
    const alreadyTargetedIds = new Set<number>(
      interimSteps.map((step) => step.planetId)
    );
    const longTermTarget = finalTargets.find(
      (target) =>
        !target.needsCompletion &&
        !alreadyTargetedIds.has(target.targetId) &&
        target.valid
    );

    if (longTermTarget) {
      const strategyId = getStrategyIdForObjectives(
        assignments,
        longTermTarget.objectiveIds,
        rawStrategies
      );

      const planet = allPlanets[longTermTarget.targetId];
      const progress = calcPlanetProgressPercentage(
        planet.health,
        planet.maxHealth,
        planet.event
      );

      const leftoverStep: StrategyStepInsert = {
        planetId: longTermTarget.targetId,
        playerPercentage: playerbasePercentage,
        strategyId,
        created_at: now,
        progress,
        limit_date: new Date(
          Date.now() + longTermTarget.timeRemaining / 3600000
        ).toISOString(),
      };

      interimSteps.push(leftoverStep);
    } else {
      if (interimSteps.length > 0) {
        const bestStep = interimSteps[0];
        bestStep.playerPercentage += playerbasePercentage;
      } else {
        const bestTarget = finalTargets[0];

        const strategyId = getStrategyIdForObjectives(
          assignments,
          bestTarget.objectiveIds,
          rawStrategies
        );

        const planet = allPlanets[bestTarget.targetId];
        const progress = calcPlanetProgressPercentage(
          planet.health,
          planet.maxHealth,
          planet.event
        );

        interimSteps.push({
          planetId: bestTarget.targetId,
          playerPercentage: playerbasePercentage,
          strategyId,
          created_at: now,
          progress,
          limit_date: new Date(
            Date.now() + bestTarget.timeRemaining / 3600000
          ).toISOString(),
        });
      }
    }
  }

  const cleanupSteps = genererateStepCleanup(
    interimSteps,
    currentStrategySteps,
    now,
    allPlanets,
    true,
    now //Dummy Value
  );

  for (const step of interimSteps) {
    const priorStep = currentStrategySteps
      .filter((fullStep) => fullStep.planetId === step.planetId)
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0];

    if (
      priorStep &&
      Math.abs(priorStep.playerPercentage - step.playerPercentage) <= 0.5
    ) {
      updatedSteps.push({ ...priorStep, progress: step.progress });
    } else {
      createdSteps.push(step);
    }
  }

  return {
    toInsert: createdSteps.concat(cleanupSteps.toInsert),
    toUpdate: updatedSteps.concat(cleanupSteps.toUpdate),
  };
}

export function genererateStepCleanup(
  newSteps: StrategyStepInsert[],
  currentSteps: StrategyStepFull[],
  now: string,
  allPlanets: Planet[],
  isActive: boolean,
  endDate: string
): { toInsert: StrategyStepInsert[]; toUpdate: StrategyStepFull[] } {
  const cleanupStepsInsert: StrategyStepInsert[] = [];
  const cleanupStepsUpdate: StrategyStepFull[] = [];
  const seenPlanets = new Set<number>(newSteps.map((step) => step.planetId));
  const newestSteps = getNewestStepsForPlanets(currentSteps);

  if (!newestSteps.some((step) => step.playerPercentage !== 0)) {
    return { toInsert: [], toUpdate: [] };
  }

  for (const step of newestSteps) {
    if (seenPlanets.has(step.planetId)) continue;

    seenPlanets.add(step.planetId);

    const planet = allPlanets[step.planetId];

    const progress = calcPlanetProgressPercentage(
      planet.health,
      planet.maxHealth,
      planet.event
    );

    if (step.playerPercentage === 0 && progress !== step.progress && isActive) {
      cleanupStepsUpdate.push({ ...step, progress: progress });
    } else if (isActive && step.playerPercentage !== 0) {
      const newStep: StrategyStepInsert = {
        planetId: step.planetId,
        strategyId: step.strategyId,
        limit_date: step.limit_date,
        playerPercentage: 0,
        created_at: now,
        progress: progress,
      };

      cleanupStepsInsert.push(newStep);
    } else if (
      !isActive &&
      (Math.abs(new Date().getTime() - new Date(endDate).getTime()) <= 60000 ||
        new Date().getTime() <= new Date(endDate).getTime())
    ) {
      cleanupStepsUpdate.push({ ...step, progress: progress });
    }
  }

  return { toInsert: cleanupStepsInsert, toUpdate: cleanupStepsUpdate };
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
  step: StrategyStepFull
): Allocation {
  const numRegions = planet.regions.length;
  const totalPower =
    estimatedPerPlayerImpact *
    (totalPlayerCount * (step.playerPercentage / 100));
  let bestAlloc: Allocation = {
    planet: totalPower,
    regions: Array(numRegions).fill(0),
  };
  let bestTime =
    simulateCompletionTime(planet, bestAlloc, timeHorizon) ?? Infinity;

  const increment = Math.max(1, Math.floor(totalPower / 20));

  // Generate all possible allocations (planet + regions = totalPower)
  function* allocations(
    remaining: number,
    idx: number,
    current: number[]
  ): Generator<number[]> {
    if (idx === numRegions) {
      yield current;
      return;
    }
    if (!planet.regions[idx].isAvailable) {
      yield* allocations(remaining, idx + 1, [...current, 0]);
    } else {
      for (let alloc = 0; alloc <= remaining; alloc += increment) {
        yield* allocations(remaining - alloc, idx + 1, [...current, alloc]);
      }
    }
  }

  for (const regionAlloc of allocations(totalPower, 0, [])) {
    const planetAlloc = totalPower - regionAlloc.reduce((a, b) => a + b, 0);
    const alloc: Allocation = { planet: planetAlloc, regions: regionAlloc };
    const time = simulateCompletionTime(planet, alloc, timeHorizon);
    console.log(alloc, time);
    if (time !== null && time < bestTime) {
      bestTime = time;
      bestAlloc = alloc;
    }
  }

  return bestAlloc;
}

export async function getSplitsForTargets(
  newSteps: StrategyStepFull[],
  allPlanets: Planet[],
  now: string,
  estimatedPerPlayerImpact: number,
  totalPlayerCount: number,
  supabase: SupabaseClient<Database>
): Promise<RegionSplitInsert[]> {
  const regionSplits: RegionSplitInsert[] = [];

  for (const step of newSteps) {
    if (step.playerPercentage <= 0) continue;

    const identicalSplits: RegionSplitInsert[] = [];
    const newSplits: RegionSplitInsert[] = [];

    let { data: previousSplits } = await supabase
      .from("planet_region_split")
      .select("*")
      .order("created_at", { ascending: false })
      .eq("step_id", step.id);

    if (!previousSplits) previousSplits = [];

    const latestTimestamp =
      previousSplits[0]?.created_at ?? new Date().toISOString();

    const planet = allPlanets[step.planetId];
    const timeHorizon =
      (new Date(step.limit_date).getTime() - Date.now()) / 3600000;

    const assingedPlayerCount =
      totalPlayerCount * (step.playerPercentage / 100);

    const allocation = optimizeRegionAllocation(
      allPlanets[step.planetId],
      timeHorizon,
      estimatedPerPlayerImpact,
      totalPlayerCount,
      step
    );

    if (allocation.planet > 0) {
      const percentage =
        allocation.planet / estimatedPerPlayerImpact / assingedPlayerCount;

      const priorSplit = previousSplits.find(
        (split) =>
          split.planet_id === planet.index &&
          !split.region_id &&
          split.created_at === latestTimestamp
      );

      const mainSplit: RegionSplitInsert = {
        planet_id: planet.index,
        step_id: step.id,
        region_id: null,
        created_at: now,
        percentage: percentage * 100,
      };

      if (
        !priorSplit ||
        Math.abs(priorSplit.percentage - percentage * 100) > 0.1
      ) {
        newSplits.push(mainSplit);
      } else {
        identicalSplits.push(mainSplit);
      }
    }

    for (let i = 0; i < planet.regions.length; i++) {
      const currentRegion = planet.regions[i];
      const currentRegionAllocation = allocation.regions[i];

      if (currentRegionAllocation <= 0) continue;

      const percentage =
        currentRegionAllocation /
        estimatedPerPlayerImpact /
        assingedPlayerCount;

      const priorSplit = previousSplits.find(
        (split) =>
          split.planet_id === planet.index &&
          split.region_id === currentRegion.hash &&
          split.created_at === latestTimestamp
      );

      const secondarySplit: RegionSplitInsert = {
        planet_id: planet.index,
        step_id: step.id,
        region_id: currentRegion.hash,
        created_at: now,
        percentage: percentage * 100,
      };

      if (
        !priorSplit ||
        Math.abs(priorSplit.percentage - percentage * 100) < 0.1
      ) {
        newSplits.push(secondarySplit);
      } else {
        identicalSplits.push(secondarySplit);
      }
    }

    if (newSplits.length !== 0) {
      regionSplits.push(...identicalSplits);
      regionSplits.push(...newSplits);
    }
  }
  return regionSplits;
}

export function getNewestStepsForPlanets(
  steps: StrategyStepFull[]
): StrategyStepFull[] {
  const newestStepMap = new Map<number, StrategyStepFull>();

  for (const step of steps) {
    const existing = newestStepMap.get(step.planetId);
    if (
      !existing ||
      new Date(step.created_at).getTime() >
        new Date(existing.created_at).getTime()
    ) {
      newestStepMap.set(step.planetId, step);
    }
  }

  return Array.from(newestStepMap.values());
}
