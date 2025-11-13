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
  planets: Planet[],
  adjacencyMap: Map<number, DBLinks[]>,
  sectors: { id: number; sector: number }[],
  foundTargets: Map<number, Set<number>>
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
      const planet = planets[objective.planetId!];
      if (planet.currentOwner === Factions.HUMANS) continue;

      const targets = getPlanetLiberationTargets(
        objective,
        planets,
        planetRouter,
        adjacencyMap
      );

      for (const target of targets) {
        addTarget(target.index, objective.id, foundTargets);
      }
    }

    if (objective.type === ObjectiveTypes.HOLD) {
      const targets = getHoldOrDefendTargets(
        objective,
        planets,
        planetRouter,
        adjacencyMap
      );

      for (const target of targets) {
        addTarget(target.index, objective.id, foundTargets);
      }
    }

    if (objective.type === ObjectiveTypes.DEFEND) {
      if (!objective.planetId) {
        const targets = getDefendAmountTargets(
          objective,
          planets,
          adjacencyMap,
          sectors
        );

        for (const target of targets) {
          addTarget(target.index, objective.id, foundTargets);
        }
      } else {
        const targets = getHoldOrDefendTargets(
          objective,
          planets,
          planetRouter,
          adjacencyMap
        );

        for (const target of targets) {
          addTarget(target.index, objective.id, foundTargets);
        }
      }
    }

    if (
      ObjectiveTypes.KILL === objective.type ||
      ObjectiveTypes.OPERATIONS === objective.type ||
      ObjectiveTypes.COLLECT === objective.type
    ) {
      const mappedPlanets = planets.map((planet) => {
        const sectorId = sectors.find(
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
        addTarget(planet.id, objective.id, foundTargets);
      }
    }

    if (objective.type === ObjectiveTypes.LIBERATE_MORE) {
      const mappedPlanets = planets.map((planet) => {
        const sectorId = sectors.find(
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
          isPlanetAvailable(adjacencyMap, planet.id, planets)
      );

      for (const planet of filteredPlanets) {
        addTarget(planet.id, objective.id, foundTargets);
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
 * Helper function for handling the logic of adding a target to the Map
 */
function addTarget(
  targetId: number,
  objectiveId: number,
  targetMap: Map<number, Set<number>>
): void {
  if (targetMap.has(targetId)) {
    targetMap.get(targetId)?.add(objectiveId);
  } else {
    targetMap.set(targetId, new Set<number>().add(objectiveId));
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
  allPlanets: Planet[],
  adjacencyMap: Map<number, DBLinks[]>
): Planet[] {
  const target = allPlanets[objective.planetId!];
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
  allPlanets: Planet[],
  planetRouter: PlanetRouter,
  adjacencyMap: Map<number, DBLinks[]>
): Planet[] {
  const target = allPlanets[objective.planetId!];
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
  allPlanets: Planet[],
  planetRouter: PlanetRouter,
  adjacencyMap: Map<number, DBLinks[]>
): Planet[] {
  const target = allPlanets[objective.planetId!];
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
    const attackers = getAttackersForPlanet(planet, adjacencyMap, allPlanets);

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
  targetList: Map<number, Set<number>>,
  assignments: FullParsedAssignment[],
  allPlanets: Planet[],
  adjacencyMap: Map<number, DBLinks[]>,
  estimatedPerPlayerImpact: number,
  totalPlayerCount: number
): ValidatedTargeting[] {
  const finalList: ValidatedTargeting[] = [];

  const mappedList: UnvalidatedTargeting[] = [...targetList.entries()].map(
    ([targetId, objectiveIds]) => {
      return { targetId: targetId, objectiveIds: [...objectiveIds.keys()] };
    }
  );

  mappedList.sort((a, b) => {
    if (a.objectiveIds.length !== b.objectiveIds.length) {
      return b.objectiveIds.length - a.objectiveIds.length;
    }

    return (
      allPlanets[a.targetId].regenPerSecond -
      allPlanets[b.targetId].regenPerSecond
    );
  });

  for (const assignment of assignments) {
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
              allPlanets,
              objective.planetId!,
              adjacencyMap,
              getLowestRemainingTime(assignments, objectiveIds)
            )
          );
          break;
        case ObjectiveTypes.HOLD:
          finalList.push(
            ...getFinalHoldOrDefendTargets(
              possibleTargets,
              allPlanets,
              objective.planetId!,
              adjacencyMap,
              getLowestRemainingTime(assignments, objectiveIds),
              estimatedPerPlayerImpact,
              totalPlayerCount
            )
          );
          break;
        case ObjectiveTypes.DEFEND:
          if (objective.planetId) {
            finalList.push(
              ...getFinalHoldOrDefendTargets(
                possibleTargets,
                allPlanets,
                objective.planetId!,
                adjacencyMap,
                getLowestRemainingTime(assignments, objectiveIds),
                estimatedPerPlayerImpact,
                totalPlayerCount
              )
            );
          } else {
            const remainingAmount =
              objective.totalAmount! - objective.playerProgress;
            finalList.push(
              ...getFinalDefendAmountTargets(
                possibleTargets,
                allPlanets,
                remainingAmount,
                adjacencyMap,
                getLowestRemainingTime(assignments, objectiveIds),
                estimatedPerPlayerImpact,
                totalPlayerCount
              )
            );
          }
          break;
        case ObjectiveTypes.LIBERATE_MORE:
          finalList.push(
            ...getFinalLiberateMoreTargets(
              possibleTargets,
              allPlanets,
              objective.playerProgress,
              objective.enemyProgress!,
              adjacencyMap,
              getLowestRemainingTime(assignments, objectiveIds),
              estimatedPerPlayerImpact,
              totalPlayerCount
            )
          );
          break;
        case ObjectiveTypes.COLLECT:
          finalList.push(
            getFinalDoAmountTarget(
              possibleTargets,
              allPlanets,
              getLowestRemainingTime(assignments, objectiveIds)
            )
          );
          break;
        case ObjectiveTypes.KILL:
          finalList.push(
            getFinalDoAmountTarget(
              possibleTargets,
              allPlanets,
              getLowestRemainingTime(assignments, objectiveIds)
            )
          );
          break;
        case ObjectiveTypes.OPERATIONS:
          finalList.push(
            getFinalDoAmountTarget(
              possibleTargets,
              allPlanets,
              getLowestRemainingTime(assignments, objectiveIds)
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
  allPlanets: Planet[],
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

        const neighbor = allPlanets[neighborId!];

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
        regen: allPlanets[target.targetId].regenPerSecond,
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
    regen: allPlanets[liberationTarget!.targetId].regenPerSecond,
  });

  return finalTargets;
}

export function getFinalDefenseTargets(
  targets: UnvalidatedTargeting[],
  allPlanets: Planet[],
  specifiedTargetId: number,
  assignmentEndTime: number,
  estimatedPerPlayerImpact: number,
  totalPlayerCount: number
): ValidatedTargeting[] {
  const defenseTarget = allPlanets[specifiedTargetId];
  const finalTargets: ValidatedTargeting[] = [];
  const defenseEndDate = new Date(defenseTarget.event!.endTime);
  const attackers = targets.filter(
    (target) => target.targetId !== specifiedTargetId
  );

  //TODO: Attackers length < 2 is temporary until this can be optimized,
  // but is generally true
  const willComplete = defenseEndDate.getTime() < assignmentEndTime;
  const fullAttackers = attackers.map(
    (attacker) => allPlanets[attacker.targetId]
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
        regen: allPlanets[attacker.targetId].regenPerSecond,
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
      regen: allPlanets[specifiedTarget!.targetId].regenPerSecond,
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
  allPlanets: Planet[],
  specifiedTargetId: number,
  adjacencyMap: Map<number, DBLinks[]>,
  assignmentEndTime: number,
  estimatedPerPlayerImpact: number,
  totalPlayerCount: number
): ValidatedTargeting[] {
  const finalTargets: ValidatedTargeting[] = [];

  const defenseTarget = allPlanets[specifiedTargetId];
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
  allPlanets: Planet[],
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

    const targetInfo = allPlanets[target.targetId];
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

      const linkedPlanetInfo = allPlanets[linkedPlanetId!];

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
  allPlanets: Planet[],
  playerProgress: number,
  enemyProgress: number,
  adjacencyMap: Map<number, DBLinks[]>,
  assignmentEndTime: number,
  estimatedPlayerImpact: number,
  totalPlayerCount: number
): ValidatedTargeting[] {
  const max = 2 - (playerProgress - enemyProgress);
  if (max === 0) {
    return [];
  }

  let addedCount = 0;

  const finalTargets: ValidatedTargeting[] = [];

  const defenses = targets.filter(
    (target) => allPlanets[target.targetId].event !== null
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

    if (addedCount >= max) return finalTargets;
  }

  const liberationTargets = targets.filter(
    (target) => allPlanets[target.targetId].event === null
  );

  for (const liberationTarget of liberationTargets) {
    finalTargets.push({
      ...liberationTarget,
      valid: true,
      dependants: [],
      needsCompletion: true,
      timeRemaining: assignmentEndTime,
      regen: allPlanets[liberationTarget.targetId].regenPerSecond,
    });

    addedCount++;

    if (addedCount >= max) return finalTargets;
  }

  return finalTargets;
}

export function getFinalDoAmountTarget(
  targets: UnvalidatedTargeting[],
  allPlanets: Planet[],
  remainingTime: number
): ValidatedTargeting {
  const finalTarget: ValidatedTargeting = {
    ...targets[0],
    valid: true,
    needsCompletion: false,
    dependants: [],
    timeRemaining: remainingTime,
    regen: allPlanets[targets[0].targetId].regenPerSecond,
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
  allPlanets: Planet[],
  adjacencyMap: Map<number, DBLinks[]>
): UnvalidatedTargeting[] {
  const linkedPlanets = adjacencyMap.get(specifiedTargetId);

  const linkedPlanetIds = linkedPlanets?.map((linkedPlanet) => {
    const otherPlanetId =
      linkedPlanet.planetId === specifiedTargetId
        ? linkedPlanet.linkedPlanetId
        : linkedPlanet.planetId;

    return allPlanets[otherPlanetId!].index;
  });

  return targets.filter(
    (target) =>
      linkedPlanetIds?.includes(target.targetId) &&
      allPlanets[target.targetId].currentOwner !== Factions.HUMANS
  );
}

function isPlanetAvailable(
  adjacencyMap: Map<number, DBLinks[]>,
  planetId: number,
  allPlanets: Planet[]
): boolean {
  if (allPlanets[planetId].currentOwner === Factions.HUMANS) return true;

  const linkedPlanets = adjacencyMap.get(planetId);

  if (!linkedPlanets || linkedPlanets.length === 0) return false;

  for (const linkedPlanet of linkedPlanets) {
    const otherPlanetId =
      planetId === linkedPlanet.planetId
        ? linkedPlanet.linkedPlanetId
        : linkedPlanet.planetId;
    if (allPlanets[otherPlanetId!].currentOwner === Factions.HUMANS)
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
  foundTargets: Map<number, Set<number>>,
  planets: Planet[],
  planetRouter: PlanetRouter,
  adjacencyMap: Map<number, DBLinks[]>,
  sectors: { id: number; sector: number }[]
) {
  let lowestResistance = Infinity;
  let highestOccurrences = 0;
  let bestTargets: Planet[] = [];
  let bestObjectiveId: number | null = null;

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
      const planet = planets[objective.planetId!];
      if (planet.currentOwner === Factions.HUMANS) continue;

      const targets = getPlanetLiberationTargets(
        objective,
        planets,
        planetRouter,
        adjacencyMap
      );

      const cumulativeResistance = planetRouter.calcRouteResistance(targets);
      const objectiveCount = foundTargets.get(objective.planetId!)?.size ?? 1;

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
        planets,
        planetRouter,
        adjacencyMap
      );

      const cumulativeResistance = planetRouter.calcRouteResistance(targets);
      const objectiveCount = foundTargets.get(objective.planetId!)?.size ?? 1;

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
          planets,
          adjacencyMap,
          sectors
        );

        const cumulativeResistance = planetRouter.calcRouteResistance(targets);
        const objectiveCount = foundTargets.get(objective.planetId!)?.size ?? 1;

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
          planets,
          planetRouter,
          adjacencyMap
        );

        const cumulativeResistance = planetRouter.calcRouteResistance(targets);
        const objectiveCount = foundTargets.get(objective.planetId!)?.size ?? 1;

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
      const mappedPlanets = planets.map((planet) => {
        const sectorId = sectors.find(
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
        .map((planet) => planets[planet.id]);

      const cumulativeResistance =
        planetRouter.calcRouteResistance(filteredPlanets);
      const objectiveCount = foundTargets.get(objective.planetId!)?.size ?? 1;

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
      const mappedPlanets = planets.map((planet) => {
        const sectorId = sectors.find(
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
            isPlanetAvailable(adjacencyMap, planet.id, planets)
        )
        .map((planet) => planets[planet.id]);

      const cumulativeResistance =
        planetRouter.calcRouteResistance(filteredPlanets);
      const objectiveCount = foundTargets.get(objective.planetId!)?.size ?? 1;

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
    addTarget(planet.index, bestObjectiveId!, foundTargets);
  }
}
