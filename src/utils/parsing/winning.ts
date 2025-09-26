import { Planet } from "@/lib/typeDefinitions";
import {
  calcPlanetRegenPercentage,
  calcPlanetRemainingPercentage,
} from "../helldiversAPI/formulas";

/**
 * @param millisecondsRemaining
 *  Uses ms to make prior conversion easier from a Date object
 * @param estimatedPlayerImpact
 * The estimated percentage of hourly progress by the playerbase,
 * should be given the remaining/effective percentage if part of
 * the players are assigned
 */
export function isPlanetWinnable(
  millisecondsRemaining: number,
  planet: Planet,
  estimatedPlayerImpact: number
): boolean {
  const remainingHealthPercentage = calcPlanetRemainingPercentage(
    planet.health,
    planet.maxHealth,
    planet.event
  );
  const percentagePerHour = (estimatedPlayerImpact / planet.maxHealth) * 100;

  const hoursRemaining = (millisecondsRemaining - 1) / 1000 / 60 / 60;

  const enemyResistancePercentage = planet.event
    ? 0
    : calcPlanetRegenPercentage(planet.regenPerSecond, planet.maxHealth);

  const estimatedMaximumLiberation =
    remainingHealthPercentage -
    percentagePerHour * hoursRemaining +
    enemyResistancePercentage * hoursRemaining;

  return estimatedMaximumLiberation <= 0;
}

export function isGambitWinnable(
  millisecondsRemaining: number,
  attackers: Planet[],
  estimatedPerPlayerImpact: number,
  totalPlayerCount: number
): boolean {
  let playerbasePercentage = 100;

  for (const attacker of attackers) {
    playerbasePercentage -= calcMinOffense(
      estimatedPerPlayerImpact,
      totalPlayerCount,
      attacker,
      millisecondsRemaining
    );

    if (playerbasePercentage <= 0) return false;
  }

  return true;
}

export function calcMinOffense(
  estimatedPerPlayerImpact: number,
  totalPlayerCount: number,
  planet: Planet,
  remainingTime: number
): number {
  const hoursRemaining = remainingTime / 1000 / 60 / 60;
  if (planet.event) {
    const damagePerHour =
      (estimatedPerPlayerImpact / planet.event.maxHealth) * 100;
    const playersRequired =
      calcPlanetRemainingPercentage(
        planet.health,
        planet.maxHealth,
        planet.event
      ) / damagePerHour;

    return playersRequired / totalPlayerCount;
  }

  const damagePerHour = (estimatedPerPlayerImpact / planet.maxHealth) * 100;

  const effectiveHealth =
    calcPlanetRemainingPercentage(
      planet.health,
      planet.maxHealth,
      planet.event
    ) +
    hoursRemaining *
      calcPlanetRegenPercentage(planet.regenPerSecond, planet.maxHealth);

  const playersRequired = effectiveHealth / damagePerHour;

  return playersRequired / totalPlayerCount;
}
