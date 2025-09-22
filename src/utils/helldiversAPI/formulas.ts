import { GameEvent } from "@/lib/typeDefinitions";

export function calcPlanetProgressPercentage(
  health: number,
  maxHealth: number,
  event: GameEvent | null
): number {
  if (event) {
    return ((event.maxHealth - event.health) / event.maxHealth) * 100;
  }
  return ((maxHealth - health) / maxHealth) * 100;
}

export function calcPlanetRemainingPercentage(
  health: number,
  maxHealth: number,
  event: GameEvent | null
): number {
  if (event) {
    return (event.health / event.maxHealth) * 100;
  }
  return (health / maxHealth) * 100;
}

export function calcPlanetRegenPercentage(
  regenPerSecond: number,
  maxHealth: number
): number {
  return ((regenPerSecond * 3600) / maxHealth) * 100;
}

export function calcHourlyPlayerProgress(
  estimatedPerPlayerImpact: number,
  totalPlayerCount: number,
  assignedPerentage: number,
  maxHealth: number
): number {
  const damagePerHour = (estimatedPerPlayerImpact / maxHealth) * 100;
  return totalPlayerCount * (assignedPerentage / 100) * damagePerHour;
}
