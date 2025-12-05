import { Attack, Factions, Planet } from "@/lib/typeDefinitions";
import { createClient } from "../supabase/server";
import { fetchAllPlanets } from "./planets";
import { DBLinks } from "../strategies/routing";
import { helldiversAPIHeaders } from "@/lib/constants";
import { createPlanetMap } from "../parsing/mapping";

const api = process.env.NEXT_PUBLIC_HELLDIVERS_API_URL;

function isAttackAlreadyFound(sourceId: number, attacks: Attack[]): boolean {
  if (attacks.length === 0) return false;

  return (
    attacks.filter((attack) => attack.source.index === sourceId).length > 0
  );
}

export async function fetchAllAttacks(retries: number = 3): Promise<Attack[]> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const supabase = await createClient();
      const request = await fetch(`${api}/api/v1/planet-events`, {
        method: "GET",
        headers: helldiversAPIHeaders,
      });

      if (request.status === 503) {
        console.warn(`Service unavailable ${request.status}.`);
        return [];
      }

      if (request.status === 429) {
        const retryAfter = request.headers.get("retry-after");
        const delay = retryAfter ? parseInt(retryAfter) * 1000 : 10000;
        console.warn(`Rate limited. Retrying in ${delay / 1000}s...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      if (request.status === 503) {
        return [];
      }

      const responseJson: Planet[] = await request.json();
      const attacks: Attack[] = [];

      let { data: links } = await supabase.from("supplyLineFull").select("*");

      for (let retry = 0; retry < 3 && !links; retry++) {
        const { data } = await supabase.from("supplyLineFull").select("*");
        links = data;
      }

      if (!links || links?.length === 0) {
        return [];
      }

      const allPlanets = await fetchAllPlanets();

      const planetMap = createPlanetMap(allPlanets);

      for (const defense of responseJson) {
        const filteredLinks = links.filter(
          (link) =>
            link.planetId === defense.index ||
            link.linkedPlanetId === defense.index
        );

        for (const planet of filteredLinks) {
          const otherPlanetId =
            defense.index === planet.planetId
              ? planet.linkedPlanetId!
              : planet.planetId!;
          const fullPlanetInfo = planetMap.get(otherPlanetId)!;

          if (
            fullPlanetInfo.currentOwner !== Factions.HUMANS &&
            fullPlanetInfo.attacking.includes(defense.index) &&
            !isAttackAlreadyFound(fullPlanetInfo.index, attacks)
          ) {
            const attack: Attack = { source: fullPlanetInfo, targets: [] };

            for (const targetId of fullPlanetInfo.attacking) {
              const target = planetMap.get(targetId)!;
              if (target.event) attack.targets.push(target);
            }

            attacks.push(attack);
          }
        }
      }

      return attacks;
    } catch (e) {
      console.error(e);
      return [];
    }
  }
  return [];
}

export async function findGambitForPlanet(planetId: number): Promise<Attack> {
  const allPlanets = await fetchAllPlanets(planetId);
  const planetMap = createPlanetMap(allPlanets);
  try {
    const supabase = await createClient();
    const { data: linksFromPlanet } = await supabase
      ?.from("supplyLineFull")
      .select("*")
      .eq("planetId", planetId);
    const { data: linksToPlanet } = await supabase
      .from("supplyLineFull")
      .select("*")
      .eq("linkedPlanetId", planetId);

    const links =
      linksFromPlanet && linksToPlanet
        ? [...linksFromPlanet, ...linksToPlanet]
        : linksFromPlanet && !linksToPlanet
        ? linksFromPlanet
        : !linksFromPlanet && linksToPlanet
        ? linksToPlanet
        : [];

    for (const linkedPlanet of links) {
      const otherPlanetId =
        planetId === linkedPlanet.planetId
          ? linkedPlanet.linkedPlanetId!
          : linkedPlanet.planetId!;
      const fullPlanetInfo = planetMap.get(otherPlanetId)!;

      if (
        fullPlanetInfo.currentOwner !== Factions.HUMANS &&
        fullPlanetInfo.attacking.includes(planetId)
      ) {
        const attack: Attack = { source: fullPlanetInfo, targets: [] };

        for (const targetId of fullPlanetInfo.attacking) {
          const target = planetMap.get(targetId)!;
          if (target.event) attack.targets.push(target);
        }

        return attack;
      }
    }

    return {
      source: planetMap.get(planetId)!,
      targets: [],
    };
  } catch (e) {
    console.error(e);
    return {
      source: planetMap.get(planetId)!,
      targets: [],
    };
  }
}

export function getAttackersForPlanet(
  planet: Planet,
  supplyLines: Map<number, DBLinks[]>,
  planetMap: Map<number, Planet>
): Planet[] {
  const attackers: Planet[] = [];

  const linkedPlanets = supplyLines.get(planet.index);
  if (!linkedPlanets) return attackers;

  for (const linkedPlanet of linkedPlanets) {
    const otherPlanetId =
      planet.index === linkedPlanet.planetId
        ? linkedPlanet.linkedPlanetId!
        : linkedPlanet.planetId!;

    const otherPlanet = planetMap.get(otherPlanetId)!;
    if (
      otherPlanet.currentOwner !== Factions.HUMANS &&
      otherPlanet.attacking.includes(planet.index)
    ) {
      attackers.push(otherPlanet);
    }
  }

  return attackers;
}
