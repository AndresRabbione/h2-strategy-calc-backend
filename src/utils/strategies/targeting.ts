import {
  DBObjective,
  Factions,
  FullParsedAssignment,
  ObjectiveTypes,
  Planet,
} from "@/lib/typeDefinitions";
import { DBLinks, PlanetRouter } from "./routing";
import { getAttackersForPlanet } from "../helldiversAPI/gambits";
import {
  getAPIFactionNameFromId,
  getFactionIdFromName,
  isUnderAttackByFaction,
} from "../parsing/factions";
import { isGambitWinnable } from "../parsing/winning";
import { ContextObject } from "./context";

export type ValidatedTargeting = {
  targetId: number;
  objectiveIds: number[];
  valid: boolean;
  dependants: number[];
  needsCompletion: boolean;
  timeRemaining: number;
  regen: number;
};

export type UnvalidatedTargeting = {
  targetId: number;
  objectiveIds: number[];
};

/**
 * Initial function which gathers all possible targets for a given assignment
 * @param planets
 * An ordered array of all planets for O(1) lookup
 * @param adjacencyMap
 * A Map for O(1) lookup of supply lines
 * @param foundTargets
 * A Map represeting the already found targets from other objectives, new targets are added
 * in place
 */
export function getAllTargetsForAssignment(
  assignment: FullParsedAssignment,
  context: ContextObject
): void {
  const planetRouter = new PlanetRouter();

  for (const objective of assignment.objective) {
    if (
      (ObjectiveTypes.KILL === objective.type ||
        ObjectiveTypes.OPERATIONS === objective.type ||
        ObjectiveTypes.COLLECT === objective.type) &&
      !hasSpecificTargets(objective)
    ) {
      continue;
    }

    if (objective.type === ObjectiveTypes.LIBERATE) {
      const planet = context.planetMap.get(objective.planetId!)!;
      if (planet.currentOwner === Factions.HUMANS) continue;

      const targets = getPlanetLiberationTargets(
        objective,
        context.planetMap,
        planetRouter,
        context.adjacencyMap
      );

      for (const target of targets) {
        context.addTarget(target.index, objective.id);
      }
    }

    if (objective.type === ObjectiveTypes.HOLD) {
      const targets = getHoldOrDefendTargets(
        objective,
        context.planetMap,
        planetRouter,
        context.adjacencyMap
      );

      for (const target of targets) {
        context.addTarget(target.index, objective.id);
      }
    }

    if (objective.type === ObjectiveTypes.DEFEND) {
      if (!objective.planetId) {
        const targets = getDefendAmountTargets(
          objective,
          context.allPlanets,
          context.planetMap,
          context.adjacencyMap,
          context.sectors
        );

        for (const target of targets) {
          context.addTarget(target.index, objective.id);
        }
      } else {
        const targets = getHoldOrDefendTargets(
          objective,
          context.planetMap,
          planetRouter,
          context.adjacencyMap
        );

        for (const target of targets) {
          context.addTarget(target.index, objective.id);
        }
      }
    }

    if (
      ObjectiveTypes.KILL === objective.type ||
      ObjectiveTypes.OPERATIONS === objective.type ||
      ObjectiveTypes.COLLECT === objective.type
    ) {
      const mappedPlanets = context.allPlanets.map((planet) => {
        const sectorId = context.sectors.find(
          (sector) => sector.id === planet.index
        )?.sector;

        return {
          id: planet.index,
          sectorId: sectorId,
          factionId: getFactionIdFromName(planet.currentOwner),
        };
      });

      const filteredPlanets = mappedPlanets.filter(
        (planet) =>
          (!objective.planetId || planet.id === objective.planetId) &&
          (!objective.factionId || planet.factionId === objective.factionId) &&
          (!objective.sectorId || planet.sectorId === objective.sectorId)
      );

      for (const planet of filteredPlanets) {
        context.addTarget(planet.id, objective.id);
      }
    }

    if (objective.type === ObjectiveTypes.LIBERATE_MORE) {
      const mappedPlanets = context.allPlanets.map((planet) => {
        const sectorId = context.sectors.find(
          (sector) => sector.id === planet.index
        )?.sector;

        return {
          id: planet.index,
          sectorId: sectorId,
          factionId: getFactionIdFromName(planet.currentOwner),
        };
      });

      const filteredPlanets = mappedPlanets.filter(
        (planet) =>
          (!objective.factionId || planet.factionId === objective.factionId) &&
          (!objective.sectorId || planet.sectorId === objective.sectorId) &&
          isPlanetAvailable(context.adjacencyMap, planet.id, context.planetMap)
      );

      for (const planet of filteredPlanets) {
        context.addTarget(planet.id, objective.id);
      }
    }
  }
}

/**
 * Checks whether a given objective has targets to gather
 */
export function hasSpecificTargets(objective: DBObjective): boolean {
  switch (objective.type) {
    case ObjectiveTypes.KILL:
      return objective.planetId !== null && objective.sectorId !== null;
    default:
      return (
        objective.planetId !== null &&
        objective.sectorId !== null &&
        objective.factionId !== null
      );
  }
}

/**
 * Encapsulates the target gathering for planet defense
 * @param allPlanets
 * An ordered array of all planets for O(1) lookup
 * @param foundTargets
 * A Map represeting the already found targets from other objectives, new targets are added
 * in place
 */
export function getPlanetDefenseTargets(
  objective: DBObjective,
  allPlanets: Map<number, Planet>,
  adjacencyMap: Map<number, DBLinks[]>
): Planet[] {
  const target = allPlanets.get(objective.planetId!)!;
  const attackers = getAttackersForPlanet(target, adjacencyMap, allPlanets);

  return [target, ...attackers];
}

/**
 * Encapsulates the target gathering for planet liberation
 * @param foundTargets
 * A Map represeting the already found targets from other objectives, new targets are added
 * in place
 */
export function getPlanetLiberationTargets(
  objective: DBObjective,
  allPlanets: Map<number, Planet>,
  planetRouter: PlanetRouter,
  adjacencyMap: Map<number, DBLinks[]>
): Planet[] {
  const target = allPlanets.get(objective.planetId!)!;
  const route = planetRouter.findShortestRoute(
    target,
    allPlanets,
    adjacencyMap
  );

  route.pop();

  return route;
}

/**
 * An in-between function that determines whether the objective's
 * target requires liberation or defense and calls the respective function
 * @param foundTargets
 * A Map represeting the already found targets from other objectives, new targets are added
 * in place
 */
export function getHoldOrDefendTargets(
  objective: DBObjective,
  allPlanets: Map<number, Planet>,
  planetRouter: PlanetRouter,
  adjacencyMap: Map<number, DBLinks[]>
): Planet[] {
  const target = allPlanets.get(objective.planetId!)!;
  if (target.currentOwner !== Factions.HUMANS) {
    return getPlanetLiberationTargets(
      objective,
      allPlanets,
      planetRouter,
      adjacencyMap
    );
  } else {
    if (target.event) {
      return getPlanetDefenseTargets(objective, allPlanets, adjacencyMap);
    }
  }

  return [];
}

/**
 * Encapsulates the target gathering for DEFEND AMOUNT objectives, finding
 * appropriate gambits
 * @param foundTargets
 * A Map represeting the already found targets from other objectives, new targets are added
 * in place
 */
export function getDefendAmountTargets(
  objective: DBObjective,
  allPlanets: Planet[],
  planetMap: Map<number, Planet>,
  adjacencyMap: Map<number, DBLinks[]>,
  sectors: { id: number; sector: number }[]
): Planet[] {
  const filteredPlanets = allPlanets.filter((planet) => planet.event !== null);

  const planetIdsInSector = objective.sectorId
    ? sectors
        .filter((sector) => sector.sector === objective.sectorId)
        .map((sector) => sector.id)
    : sectors.map((sector) => sector.id);

  const finalTargets: Planet[] = [];
  filteredPlanets.forEach((planet) => {
    const attackers = getAttackersForPlanet(planet, adjacencyMap, planetMap);

    const factionName = objective.factionId
      ? getAPIFactionNameFromId(objective.factionId)
      : null;

    if (objective.factionId) {
      if (
        planetIdsInSector.includes(planet.index) &&
        isUnderAttackByFaction(attackers, factionName!)
      ) {
        finalTargets.push(planet, ...attackers);
      }
    } else {
      if (planetIdsInSector.includes(planet.index)) {
        finalTargets.push(planet, ...attackers);
      }
    }
  });

  return finalTargets;
}

export function getFinalTargetList(
  context: ContextObject
): ValidatedTargeting[] {
  const finalList: ValidatedTargeting[] = [];

  const mappedList: UnvalidatedTargeting[] = [
    ...context.getTargets().entries(),
  ].map(([targetId, objectiveIds]) => {
    return { targetId: targetId, objectiveIds: [...objectiveIds.keys()] };
  });

  mappedList.sort((a, b) => {
    if (a.objectiveIds.length !== b.objectiveIds.length) {
      return b.objectiveIds.length - a.objectiveIds.length;
    }

    return (
      context.planetMap.get(a.targetId)!.regenPerSecond -
      context.planetMap.get(b.targetId)!.regenPerSecond
    );
  });

  for (const assignment of context.dbAssignments) {
    for (const objective of assignment.objective) {
      const possibleTargets = mappedList.filter((target) =>
        target.objectiveIds.includes(objective.id)
      );
      const objectiveIds = [
        ...new Set(possibleTargets.flatMap((target) => target.objectiveIds)),
      ];

      if (possibleTargets.length === 0) continue;

      switch (objective.type) {
        case ObjectiveTypes.LIBERATE:
          finalList.push(
            ...getFinalLiberationTargets(
              possibleTargets,
              context.planetMap,
              objective.planetId!,
              context.adjacencyMap,
              getLowestRemainingTime(context.dbAssignments, objectiveIds)
            )
          );
          break;
        case ObjectiveTypes.HOLD:
          finalList.push(
            ...getFinalHoldOrDefendTargets(
              possibleTargets,
              context.planetMap,
              objective.planetId!,
              context.adjacencyMap,
              getLowestRemainingTime(context.dbAssignments, objectiveIds),
              context.estimatedPerPlayerImpact,
              context.totalPlayerCount
            )
          );
          break;
        case ObjectiveTypes.DEFEND:
          if (objective.planetId) {
            finalList.push(
              ...getFinalHoldOrDefendTargets(
                possibleTargets,
                context.planetMap,
                objective.planetId!,
                context.adjacencyMap,
                getLowestRemainingTime(context.dbAssignments, objectiveIds),
                context.estimatedPerPlayerImpact,
                context.totalPlayerCount
              )
            );
          } else {
            const remainingAmount =
              objective.totalAmount! - objective.playerProgress;
            finalList.push(
              ...getFinalDefendAmountTargets(
                possibleTargets,
                context.planetMap,
                remainingAmount,
                context.adjacencyMap,
                getLowestRemainingTime(context.dbAssignments, objectiveIds),
                context.estimatedPerPlayerImpact,
                context.totalPlayerCount
              )
            );
          }
          break;
        case ObjectiveTypes.LIBERATE_MORE:
          finalList.push(
            ...getFinalLiberateMoreTargets(
              possibleTargets,
              context.planetMap,
              objective.playerProgress,
              context.adjacencyMap,
              getLowestRemainingTime(context.dbAssignments, objectiveIds),
              context.estimatedPerPlayerImpact,
              context.totalPlayerCount
            )
          );
          break;
        case ObjectiveTypes.COLLECT:
          finalList.push(
            getFinalDoAmountTarget(
              possibleTargets,
              context.planetMap,
              getLowestRemainingTime(context.dbAssignments, objectiveIds)
            )
          );
          break;
        case ObjectiveTypes.KILL:
          finalList.push(
            getFinalDoAmountTarget(
              possibleTargets,
              context.planetMap,
              getLowestRemainingTime(context.dbAssignments, objectiveIds)
            )
          );
          break;
        case ObjectiveTypes.OPERATIONS:
          finalList.push(
            getFinalDoAmountTarget(
              possibleTargets,
              context.planetMap,
              getLowestRemainingTime(context.dbAssignments, objectiveIds)
            )
          );
          break;
      }
    }
  }

  return purgeDuplicates(finalList);
}

/**
 * Figures out if a route has been generated and marks all but the start as
 * invalid to ensure proper route order
 * @param specifiedTargetId
 * The main target of the LIBERATE objective
 * @returns
 * The valid property is used to indicate whether a planet can or should be pursued
 */
export function getFinalLiberationTargets(
  targets: UnvalidatedTargeting[],
  allPlanets: Map<number, Planet>,
  specifiedTargetId: number,
  adjacencyMap: Map<number, DBLinks[]>,
  remainingTime: number
): ValidatedTargeting[] {
  const finalTargets: ValidatedTargeting[] = [];

  const route = targets.filter(
    (target) => target.targetId !== specifiedTargetId
  );

  if (route.length > 0) {
    const startingPlanet = route.find((planet) => {
      const linkedPlanets = adjacencyMap.get(planet.targetId);

      return linkedPlanets!.some((element) => {
        const neighborId =
          element.planetId === planet.targetId
            ? element.linkedPlanetId
            : element.planetId;

        const neighbor = allPlanets.get(neighborId!)!;

        return neighbor.currentOwner === Factions.HUMANS;
      });
    });

    for (const target of route) {
      finalTargets.push({
        ...target,
        valid: target.targetId === startingPlanet!.targetId,
        dependants: [],
        needsCompletion: true,
        timeRemaining: remainingTime / (route.length + 1),
        regen: allPlanets.get(target.targetId)!.regenPerSecond,
      });
    }
  }

  const liberationTarget = targets.find(
    (target) => target.targetId === specifiedTargetId
  );

  finalTargets.push({
    ...liberationTarget!,
    valid: route.length <= 0,
    dependants: [],
    needsCompletion: true,
    timeRemaining: remainingTime / (route.length + 1),
    regen: allPlanets.get(liberationTarget!.targetId)!.regenPerSecond,
  });

  return finalTargets;
}

export function getFinalDefenseTargets(
  targets: UnvalidatedTargeting[],
  allPlanets: Map<number, Planet>,
  specifiedTargetId: number,
  assignmentEndTime: number,
  estimatedPerPlayerImpact: number,
  totalPlayerCount: number
): ValidatedTargeting[] {
  const defenseTarget = allPlanets.get(specifiedTargetId)!;
  const finalTargets: ValidatedTargeting[] = [];
  const defenseEndDate = new Date(defenseTarget.event!.endTime);
  const attackers = targets.filter(
    (target) => target.targetId !== specifiedTargetId
  );

  //TODO: Attackers length < 2 is temporary until this can be optimized,
  // but is generally true
  const willComplete = defenseEndDate.getTime() < assignmentEndTime;
  const fullAttackers = attackers.map(
    (attacker) => allPlanets.get(attacker.targetId)!
  );
  const willGambit = isGambitWinnable(
    defenseEndDate.getTime(),
    fullAttackers,
    estimatedPerPlayerImpact,
    totalPlayerCount
  );

  if (willGambit && willComplete) {
    for (const attacker of attackers) {
      finalTargets.push({
        ...attacker,
        valid: true,
        dependants: attackers.map((attacker) => attacker.targetId),
        needsCompletion: true,
        timeRemaining: assignmentEndTime,
        regen: allPlanets.get(attacker.targetId)!.regenPerSecond,
      });
    }
  }

  if (willComplete && !willGambit) {
    const specifiedTarget = targets.find(
      (target) => target.targetId === specifiedTargetId
    );
    finalTargets.push({
      ...specifiedTarget!,
      valid: willComplete,
      dependants: [],
      needsCompletion: true,
      timeRemaining: assignmentEndTime,
      regen: allPlanets.get(specifiedTarget!.targetId)!.regenPerSecond,
    });
  }

  return finalTargets;
}

/**
 * Determines whether the targeted gambits are winnable, which half to target,
 * and whether it will be won automatically
 * @param specifiedTargetId
 * The target ID to HOLD or DEFEND
 * @param assignmentEndTime
 * In milliseconds
 * @returns
 */
export function getFinalHoldOrDefendTargets(
  targets: UnvalidatedTargeting[],
  allPlanets: Map<number, Planet>,
  specifiedTargetId: number,
  adjacencyMap: Map<number, DBLinks[]>,
  assignmentEndTime: number,
  estimatedPerPlayerImpact: number,
  totalPlayerCount: number
): ValidatedTargeting[] {
  const finalTargets: ValidatedTargeting[] = [];

  const defenseTarget = allPlanets.get(specifiedTargetId)!;
  if (defenseTarget.event) {
    finalTargets.push(
      ...getFinalDefenseTargets(
        targets,
        allPlanets,
        specifiedTargetId,
        assignmentEndTime,
        estimatedPerPlayerImpact,
        totalPlayerCount
      )
    );
  } else if (defenseTarget.currentOwner !== Factions.HUMANS) {
    finalTargets.push(
      ...getFinalLiberationTargets(
        targets,
        allPlanets,
        specifiedTargetId,
        adjacencyMap,
        assignmentEndTime
      )
    );
  }

  return finalTargets;
}

//TODO: This sucks, but I'm not sure how, hard to read and understand
export function getFinalDefendAmountTargets(
  targets: UnvalidatedTargeting[],
  allPlanets: Map<number, Planet>,
  amount: number,
  adjacencyMap: Map<number, DBLinks[]>,
  assignmentEndTime: number,
  estimatedPerPlayerImpact: number,
  totalPlayerCount: number
): ValidatedTargeting[] {
  const interimTargets: {
    targetId: number;
    objectiveIds: number[];
    dependants: number[];
    attacking: number | null;
  }[] = [];
  const targetIds = targets.map((target) => target.targetId);

  const seenTargets = new Set<number>();
  const appearaceMap = new Map<number, number>();

  for (const target of targets) {
    if (seenTargets.has(target.targetId)) continue;

    seenTargets.add(target.targetId);

    const attackers: UnvalidatedTargeting[] = [];
    let defender: UnvalidatedTargeting | null = null;

    const targetInfo = allPlanets.get(target.targetId)!;
    const linkedPlanets = adjacencyMap.get(target.targetId);

    if (targetInfo.currentOwner !== Factions.HUMANS) {
      attackers.push(target);
      addAppearance(targetInfo.index, appearaceMap);
    } else {
      defender = target;
    }

    for (const linkedPlanet of linkedPlanets!) {
      const linkedPlanetId =
        linkedPlanet.planetId === target.targetId
          ? linkedPlanet.linkedPlanetId
          : linkedPlanet.planetId;

      if (!targetIds.includes(linkedPlanetId!)) continue;

      const linkedPlanetInfo = allPlanets.get(linkedPlanetId!)!;

      const linkTarget = targets.find(
        (target) => target.targetId === linkedPlanetId!
      );

      if (linkedPlanetInfo.currentOwner !== Factions.HUMANS) {
        addAppearance(linkedPlanetId!, appearaceMap);
        attackers.push(linkTarget!);
      } else {
        defender = linkTarget!;
      }

      seenTargets.add(linkedPlanetId!);
    }

    interimTargets.push({ ...defender!, attacking: null, dependants: [] });

    for (const attacker of attackers) {
      const otherAttacks = attackers
        .filter((attack) => attack.targetId !== attacker.targetId)
        .map((attack) => attack.targetId);
      interimTargets.push({
        ...attacker,
        attacking: defender!.targetId,
        dependants: [...otherAttacks],
      });
    }
  }

  const finalTargets: ValidatedTargeting[] = [];

  const appearanceTargets = interimTargets.map((target) => {
    return { ...target, appearances: appearaceMap.get(target.targetId) ?? 1 };
  });

  appearanceTargets.sort((a, b) => b.appearances - a.appearances);
  let targetsAdded = 0;
  for (const target of appearanceTargets) {
    if (target.attacking) {
      const relatedTargets = appearanceTargets
        .filter(
          (element) =>
            target.attacking === element.targetId ||
            target.dependants.includes(element.targetId)
        )
        .map((element) => {
          return {
            targetId: element.targetId,
            objectiveIds: element.objectiveIds,
          };
        });

      relatedTargets.push({
        targetId: target.targetId,
        objectiveIds: target.objectiveIds,
      });

      const possibleTargets = getFinalDefenseTargets(
        relatedTargets,
        allPlanets,
        target.attacking,
        assignmentEndTime,
        estimatedPerPlayerImpact,
        totalPlayerCount
      );

      for (const target of possibleTargets) {
        finalTargets.push(target);
      }
    } else {
      const relatedTargets = appearanceTargets
        .filter((element) => element.attacking === target.targetId)
        .map((element) => {
          return {
            targetId: element.targetId,
            objectiveIds: element.objectiveIds,
          };
        });

      relatedTargets.push({
        targetId: target.targetId,
        objectiveIds: target.objectiveIds,
      });

      const possibleTargets = getFinalDefenseTargets(
        relatedTargets,
        allPlanets,
        target.targetId,
        assignmentEndTime,
        estimatedPerPlayerImpact,
        totalPlayerCount
      );

      finalTargets.push(...possibleTargets);
    }
    targetsAdded++;

    if (targetsAdded >= amount) {
      return finalTargets;
    }
  }

  return finalTargets;
}

export function getFinalLiberateMoreTargets(
  targets: UnvalidatedTargeting[],
  allPlanets: Map<number, Planet>,
  playerProgress: number,
  adjacencyMap: Map<number, DBLinks[]>,
  assignmentEndTime: number,
  estimatedPlayerImpact: number,
  totalPlayerCount: number
): ValidatedTargeting[] {
  const maxTargetCount = 2 - playerProgress;

  if (maxTargetCount === 0) {
    return [];
  }

  let addedCount = 0;

  const finalTargets: ValidatedTargeting[] = [];

  const defenses = targets.filter(
    (target) => allPlanets.get(target.targetId)!.event !== null
  );

  for (const defense of defenses) {
    const attackers = findAttackers(
      targets,
      defense.targetId,
      allPlanets,
      adjacencyMap
    );

    const possibleTargets = getFinalDefenseTargets(
      [defense, ...attackers],
      allPlanets,
      defense.targetId,
      assignmentEndTime,
      estimatedPlayerImpact,
      totalPlayerCount
    );

    finalTargets.push(...possibleTargets);

    addedCount++;

    if (addedCount >= maxTargetCount) return finalTargets;
  }

  const liberationTargets = targets.filter(
    (target) => allPlanets.get(target.targetId)!.event === null
  );

  for (const liberationTarget of liberationTargets) {
    finalTargets.push({
      ...liberationTarget,
      valid: true,
      dependants: [],
      needsCompletion: true,
      timeRemaining: assignmentEndTime,
      regen: allPlanets.get(liberationTarget.targetId)!.regenPerSecond,
    });

    addedCount++;

    if (addedCount >= maxTargetCount) return finalTargets;
  }

  return finalTargets;
}

export function getFinalDoAmountTarget(
  targets: UnvalidatedTargeting[],
  allPlanets: Map<number, Planet>,
  remainingTime: number
): ValidatedTargeting {
  const finalTarget: ValidatedTargeting = {
    ...targets[0],
    valid: true,
    needsCompletion: false,
    dependants: [],
    timeRemaining: remainingTime,
    regen: allPlanets.get(targets[0].targetId)!.regenPerSecond,
  };

  return finalTarget;
}

function addAppearance(
  attackerId: number,
  appearaceMap: Map<number, number>
): void {
  if (appearaceMap.has(attackerId)) {
    const currentCount = appearaceMap.get(attackerId);
    appearaceMap.set(attackerId, currentCount! + 1);
  } else {
    appearaceMap.set(attackerId, 1);
  }
}

function purgeDuplicates(
  targetList: ValidatedTargeting[]
): ValidatedTargeting[] {
  const targetMap = new Map<number, ValidatedTargeting[]>();

  for (const target of targetList) {
    const group = targetMap.get(target.targetId) ?? [];
    group.push(target);
    targetMap.set(target.targetId, group);
  }

  const result: ValidatedTargeting[] = [];
  for (const [id, duplicates] of targetMap.entries()) {
    if (duplicates.length === 1) {
      result.push(duplicates[0]);
      continue;
    }

    const reducedTarget = duplicates.reduce(
      (previousTarget, currentTarget) => {
        previousTarget.valid ||= currentTarget.valid;
        previousTarget.needsCompletion ||= currentTarget.needsCompletion;
        previousTarget.objectiveIds = [
          ...new Set([
            ...(previousTarget.objectiveIds ?? []),
            ...(currentTarget.objectiveIds ?? []),
          ]),
        ];
        previousTarget.timeRemaining =
          previousTarget.timeRemaining <= currentTarget.timeRemaining
            ? previousTarget.timeRemaining
            : currentTarget.timeRemaining;
        previousTarget.dependants.push(...currentTarget.dependants);
        return previousTarget;
      },
      { ...duplicates[0], dependants: [...duplicates[0].dependants] }
    );

    reducedTarget.dependants = Array.from(new Set(reducedTarget.dependants));

    result.push(reducedTarget);
  }

  return result;
}

function findAttackers(
  targets: UnvalidatedTargeting[],
  specifiedTargetId: number,
  allPlanets: Map<number, Planet>,
  adjacencyMap: Map<number, DBLinks[]>
): UnvalidatedTargeting[] {
  const linkedPlanets = adjacencyMap.get(specifiedTargetId);

  const linkedPlanetIds = linkedPlanets?.map((linkedPlanet) => {
    const otherPlanetId =
      linkedPlanet.planetId === specifiedTargetId
        ? linkedPlanet.linkedPlanetId
        : linkedPlanet.planetId;

    return allPlanets.get(otherPlanetId!)!.index;
  });

  return targets.filter(
    (target) =>
      linkedPlanetIds?.includes(target.targetId) &&
      allPlanets.get(target.targetId)!.currentOwner !== Factions.HUMANS
  );
}

function isPlanetAvailable(
  adjacencyMap: Map<number, DBLinks[]>,
  planetId: number,
  allPlanets: Map<number, Planet>
): boolean {
  if (allPlanets.get(planetId)!.currentOwner === Factions.HUMANS) return true;

  const linkedPlanets = adjacencyMap.get(planetId);

  if (!linkedPlanets || linkedPlanets.length === 0) return false;

  for (const linkedPlanet of linkedPlanets) {
    const otherPlanetId =
      planetId === linkedPlanet.planetId
        ? linkedPlanet.linkedPlanetId
        : linkedPlanet.planetId;
    if (allPlanets.get(otherPlanetId!)!.currentOwner === Factions.HUMANS)
      return true;
  }

  return false;
}

function getLowestRemainingTime(
  assignments: FullParsedAssignment[],
  objectiveIds: number[]
): number {
  let minTimeRemaining = Infinity;
  let changedCount = 0;

  for (const assingment of assignments) {
    const remainingTime = new Date(assingment.endDate).getTime() - Date.now();

    for (const objective of assingment.objective) {
      if (
        objectiveIds.includes(objective.id) &&
        remainingTime < minTimeRemaining
      ) {
        minTimeRemaining = remainingTime;
        changedCount++;
      }

      if (changedCount === objectiveIds.length) return minTimeRemaining;
    }
  }

  return minTimeRemaining;
}

export function getTargetsForDecisionAssignment(
  assignment: FullParsedAssignment,
  context: ContextObject
) {
  let lowestResistance = Infinity;
  let highestOccurrences = 0;
  let bestTargets: Planet[] = [];
  let bestObjectiveId: number | null = null;

  const planetRouter = new PlanetRouter();

  for (const objective of assignment.objective) {
    if (
      (ObjectiveTypes.KILL === objective.type ||
        ObjectiveTypes.OPERATIONS === objective.type ||
        ObjectiveTypes.COLLECT === objective.type) &&
      !hasSpecificTargets(objective)
    ) {
      continue;
    }

    if (objective.type === ObjectiveTypes.LIBERATE) {
      const planet = context.planetMap.get(objective.planetId!)!;
      if (planet.currentOwner === Factions.HUMANS) continue;

      const targets = getPlanetLiberationTargets(
        objective,
        context.planetMap,
        planetRouter,
        context.adjacencyMap
      );

      const cumulativeResistance = planetRouter.calcRouteResistance(targets);
      const objectiveCount =
        context.getTargetById(objective.planetId!)?.size ?? 1;

      if (objectiveCount > highestOccurrences) {
        bestTargets = targets;
        highestOccurrences = objectiveCount;
        lowestResistance = cumulativeResistance;
        bestObjectiveId = objective.id;
      } else if (
        objectiveCount === highestOccurrences &&
        cumulativeResistance < lowestResistance
      ) {
        bestTargets = targets;
        highestOccurrences = objectiveCount;
        lowestResistance = cumulativeResistance;
        bestObjectiveId = objective.id;
      } else {
        continue;
      }
    }

    if (objective.type === ObjectiveTypes.HOLD) {
      const targets = getHoldOrDefendTargets(
        objective,
        context.planetMap,
        planetRouter,
        context.adjacencyMap
      );

      const cumulativeResistance = planetRouter.calcRouteResistance(targets);
      const objectiveCount =
        context.getTargetById(objective.planetId!)?.size ?? 1;

      if (objectiveCount > highestOccurrences) {
        bestTargets = targets;
        highestOccurrences = objectiveCount;
        lowestResistance = cumulativeResistance;
        bestObjectiveId = objective.id;
      } else if (
        objectiveCount === highestOccurrences &&
        cumulativeResistance < lowestResistance
      ) {
        bestTargets = targets;
        highestOccurrences = objectiveCount;
        lowestResistance = cumulativeResistance;
        bestObjectiveId = objective.id;
      } else {
        continue;
      }
    }

    if (objective.type === ObjectiveTypes.DEFEND) {
      if (!objective.planetId) {
        const targets = getDefendAmountTargets(
          objective,
          context.allPlanets,
          context.planetMap,
          context.adjacencyMap,
          context.sectors
        );

        const cumulativeResistance = planetRouter.calcRouteResistance(targets);
        const objectiveCount =
          context.getTargetById(objective.planetId!)?.size ?? 1;

        if (objectiveCount > highestOccurrences) {
          bestTargets = targets;
          highestOccurrences = objectiveCount;
          lowestResistance = cumulativeResistance;
          bestObjectiveId = objective.id;
        } else if (
          objectiveCount === highestOccurrences &&
          cumulativeResistance < lowestResistance
        ) {
          bestTargets = targets;
          highestOccurrences = objectiveCount;
          lowestResistance = cumulativeResistance;
          bestObjectiveId = objective.id;
        } else {
          continue;
        }
      } else {
        const targets = getHoldOrDefendTargets(
          objective,
          context.planetMap,
          planetRouter,
          context.adjacencyMap
        );

        const cumulativeResistance = planetRouter.calcRouteResistance(targets);
        const objectiveCount =
          context.getTargetById(objective.planetId!)?.size ?? 1;

        if (objectiveCount > highestOccurrences) {
          bestTargets = targets;
          highestOccurrences = objectiveCount;
          lowestResistance = cumulativeResistance;
          bestObjectiveId = objective.id;
        } else if (
          objectiveCount === highestOccurrences &&
          cumulativeResistance < lowestResistance
        ) {
          bestTargets = targets;
          highestOccurrences = objectiveCount;
          lowestResistance = cumulativeResistance;
          bestObjectiveId = objective.id;
        } else {
          continue;
        }
      }
    }

    if (
      ObjectiveTypes.KILL === objective.type ||
      ObjectiveTypes.OPERATIONS === objective.type ||
      ObjectiveTypes.COLLECT === objective.type
    ) {
      const mappedPlanets = context.allPlanets.map((planet) => {
        const sectorId = context.sectors.find(
          (sector) => sector.id === planet.index
        )?.sector;

        return {
          id: planet.index,
          sectorId: sectorId,
          factionId: getFactionIdFromName(planet.currentOwner),
        };
      });

      const filteredPlanets = mappedPlanets
        .filter(
          (planet) =>
            (!objective.planetId || planet.id === objective.planetId) &&
            (!objective.factionId ||
              planet.factionId === objective.factionId) &&
            (!objective.sectorId || planet.sectorId === objective.sectorId)
        )
        .map((planet) => context.planetMap.get(planet.id)!);

      const cumulativeResistance =
        planetRouter.calcRouteResistance(filteredPlanets);
      const objectiveCount =
        context.getTargetById(objective.planetId!)?.size ?? 1;

      if (objectiveCount > highestOccurrences) {
        bestTargets = filteredPlanets;
        highestOccurrences = objectiveCount;
        lowestResistance = cumulativeResistance;
        bestObjectiveId = objective.id;
      } else if (
        objectiveCount === highestOccurrences &&
        cumulativeResistance < lowestResistance
      ) {
        bestTargets = filteredPlanets;
        highestOccurrences = objectiveCount;
        lowestResistance = cumulativeResistance;
        bestObjectiveId = objective.id;
      } else {
        continue;
      }
    }

    if (objective.type === ObjectiveTypes.LIBERATE_MORE) {
      const mappedPlanets = context.allPlanets.map((planet) => {
        const sectorId = context.sectors.find(
          (sector) => sector.id === planet.index
        )?.sector;

        return {
          id: planet.index,
          sectorId: sectorId,
          factionId: getFactionIdFromName(planet.currentOwner),
        };
      });

      const filteredPlanets = mappedPlanets
        .filter(
          (planet) =>
            (!objective.factionId ||
              planet.factionId === objective.factionId) &&
            (!objective.sectorId || planet.sectorId === objective.sectorId) &&
            isPlanetAvailable(
              context.adjacencyMap,
              planet.id,
              context.planetMap
            )
        )
        .map((planet) => context.planetMap.get(planet.id)!);

      const cumulativeResistance =
        planetRouter.calcRouteResistance(filteredPlanets);
      const objectiveCount =
        context.getTargetById(objective.planetId!)?.size ?? 1;

      if (objectiveCount > highestOccurrences) {
        bestTargets = filteredPlanets;
        highestOccurrences = objectiveCount;
        lowestResistance = cumulativeResistance;
        bestObjectiveId = objective.id;
      } else if (
        objectiveCount === highestOccurrences &&
        cumulativeResistance < lowestResistance
      ) {
        bestTargets = filteredPlanets;
        highestOccurrences = objectiveCount;
        lowestResistance = cumulativeResistance;
        bestObjectiveId = objective.id;
      } else {
        continue;
      }
    }
  }

  for (const planet of bestTargets) {
    context.addTarget(planet.index, bestObjectiveId!);
  }
}
