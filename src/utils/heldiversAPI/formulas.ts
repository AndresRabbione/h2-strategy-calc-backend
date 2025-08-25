export function calcPlanetProgressPercentage(
  health: number,
  maxHealth: number
): number {
  return ((maxHealth - health) / maxHealth) * 100;
}

export function calcPlanetRegenPercentage(
  regenPerSecond: number,
  maxHealth: number
): number {
  return ((regenPerSecond * 3600) / maxHealth) * 100;
}

export function calcPlayerProgressPercentage() {}
