import { Attack, Factions, Planet } from "@/lib/typeDefinitions";
import { findPlanetById } from "./planets";
import { createClient } from "../supabase/server";

const api = process.env.API_URL;

function isAttackAlreadyFound(sourceId: number, attacks: Attack[]): boolean {
  if (attacks.length === 0) return false;

  return (
    attacks.filter((attack) => attack.source.index === sourceId).length > 0
  );
}

export async function fetchAllAttacks(): Promise<Attack[]> {
  try {
    const supabase = await createClient();
    const request = await fetch(`${api}/api/v1/planet-events`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Super-Client": "helldivers.strategy.calc",
        "X-Super-Contact": "example@email.com",
      },
    });

    const responseJson: Planet[] = await request.json();
    const attacks: Attack[] = [];

    for (const defense of responseJson) {
      const { data: linksFromPlanet } = await supabase
        ?.from("supplyLineFull")
        .select("*")
        .eq("planetId", defense.index);
      const { data: linksToPlanet } = await supabase
        .from("supplyLineFull")
        .select("*")
        .eq("linkedPlanetId", defense.index);

      const links =
        linksFromPlanet && linksToPlanet
          ? [...linksFromPlanet, ...linksToPlanet]
          : linksFromPlanet && !linksToPlanet
          ? linksFromPlanet
          : !linksFromPlanet && linksToPlanet
          ? linksToPlanet
          : [];

      for (const planet of links) {
        const fullPlanetInfo = await findPlanetById(
          defense.index === planet.planetId
            ? planet.linkedPlanetId!
            : planet.planetId!
        );

        if (
          fullPlanetInfo &&
          fullPlanetInfo.currentOwner !== Factions.HUMANS &&
          fullPlanetInfo.attacking.includes(defense.index) &&
          !isAttackAlreadyFound(fullPlanetInfo.index, attacks)
        ) {
          const attack: Attack = { source: fullPlanetInfo, targets: [] };

          for (const targetId of fullPlanetInfo.attacking) {
            const target = await findPlanetById(targetId);
            if (target) attack.targets.push(target);
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

export async function isUnderAttack(planetId: number): Promise<boolean> {
  try {
    const target = await findPlanetById(planetId);

    if (!target) return false;

    return target.event !== null;
  } catch (e) {
    console.error(e);
    return false;
  }
}

export async function findGambitForPlanet(planetId: number): Promise<Attack> {
  const planet = await findPlanetById(planetId);
  try {
    const supabase = await createClient();
    const { data: linksFromPlanet } = await supabase
      ?.from("supplyLineFull")
      .select("*")
      .eq("planetId", planet!.index);
    const { data: linksToPlanet } = await supabase
      .from("supplyLineFull")
      .select("*")
      .eq("linkedPlanetId", planet!.index);

    const links =
      linksFromPlanet && linksToPlanet
        ? [...linksFromPlanet, ...linksToPlanet]
        : linksFromPlanet && !linksToPlanet
        ? linksFromPlanet
        : !linksFromPlanet && linksToPlanet
        ? linksToPlanet
        : [];

    for (const linkedPlanet of links) {
      const fullPlanetInfo = await findPlanetById(
        planet!.index === linkedPlanet.planetId
          ? linkedPlanet.linkedPlanetId!
          : linkedPlanet.planetId!
      );

      if (
        fullPlanetInfo &&
        fullPlanetInfo.currentOwner !== Factions.HUMANS &&
        fullPlanetInfo.attacking.includes(planet!.index)
      ) {
        const attack: Attack = { source: fullPlanetInfo, targets: [] };

        for (const targetId of fullPlanetInfo.attacking) {
          const target = await findPlanetById(targetId);
          if (target) attack.targets.push(target);
        }

        return attack;
      }
    }

    return { source: planet!, targets: [] };
  } catch (e) {
    console.error(e);
    return { source: planet!, targets: [] };
  }
}
