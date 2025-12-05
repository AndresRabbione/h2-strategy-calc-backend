import { DBPlanet, Planet } from "@/lib/typeDefinitions";

export function createPlanetMap(allPlanets: Planet[]): Map<number, Planet> {
  const map = new Map<number, Planet>();

  for (const planet of allPlanets) {
    map.set(planet.index, planet);
  }

  return map;
}

export function createDBPlanetMap(
  allPlanets: DBPlanet[]
): Map<number, DBPlanet> {
  const map = new Map<number, DBPlanet>();

  for (const planet of allPlanets) {
    map.set(planet.id, planet);
  }

  return map;
}
