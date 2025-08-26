import { Factions, Planet } from "@/lib/typeDefinitions";
import { findPlanetById } from "../heldiversAPI/planets";
import { createClient } from "../supabase/server";

export class PlanetRouter {
  constructor() {}

  protected calcRouteResistance(planets: Planet[]): number {
    return planets.reduce(
      (accumulator, currentPlanet) =>
        accumulator + currentPlanet.regenPerSecond,
      0
    );
  }

  protected async getAllRoutesStartingWithPlanet(
    startingPlanet: Planet,
    currentRoute: Planet[] = [],
    visited: Set<number> = new Set()
  ): Promise<Planet[][]> {
    const supabase = await createClient();
    // Discarding the route when it crosses a disabled planet or finding a circular dependancy
    const { data: linksFromPlanet } = await supabase
      ?.from("supplyLineFull")
      .select("*")
      .eq("planetId", startingPlanet.index);
    const { data: linksToPlanet } = await supabase
      .from("supplyLineFull")
      .select("*")
      .eq("linkedPlanetId", startingPlanet.index);

    const links =
      linksFromPlanet && linksToPlanet
        ? [...linksFromPlanet, ...linksToPlanet]
        : linksFromPlanet && !linksToPlanet
        ? linksFromPlanet
        : !linksFromPlanet && linksToPlanet
        ? linksToPlanet
        : [];

    const isDisabled =
      startingPlanet.index === links[0].planetId
        ? links[0].origin_disabled
        : links[0].destination_disabled ?? false;
    if (
      visited.has(startingPlanet.index) ||
      isDisabled ||
      currentRoute.length > 5
    )
      return [];

    // Adding the next planet in the route and marking it as seen
    const newRoute = [...currentRoute, startingPlanet];
    visited.add(startingPlanet.index);

    // The route is complete if it finds a plant under Super Earth control
    if (startingPlanet.currentOwner === Factions.HUMANS) {
      return [newRoute];
    }

    // The route is invalid if there are no remaining links
    if (!links || links.length === 0) {
      return [];
    }

    let allRoutes: Planet[][] = [];

    // Searching recursivley for all the routes
    for (const link of links) {
      const nextPlanet = await findPlanetById(
        startingPlanet.index === link.planetId
          ? link.linkedPlanetId!
          : link.planetId!
      );
      if (!nextPlanet) continue;
      const routes = await this.getAllRoutesStartingWithPlanet(
        nextPlanet,
        newRoute,
        new Set(visited)
      );
      allRoutes = allRoutes.concat(routes);
    }

    return allRoutes;
  }

  public async getAllRoutesForPlanet(planet: Planet): Promise<Planet[][]> {
    const supabase = await createClient();

    const { data: linksFromPlanet } = await supabase
      ?.from("supplyLineFull")
      .select("*")
      .eq("planetId", planet.index);
    const { data: linksToPlanet } = await supabase
      .from("supplyLineFull")
      .select("*")
      .eq("linkedPlanetId", planet.index);

    const links =
      linksFromPlanet && linksToPlanet
        ? [...linksFromPlanet, ...linksToPlanet]
        : linksFromPlanet && !linksToPlanet
        ? linksFromPlanet
        : !linksFromPlanet && linksToPlanet
        ? linksToPlanet
        : [];

    for (const link of links) {
      const fullPlanetData = await findPlanetById(
        planet.index === link.planetId ? link.linkedPlanetId! : link.planetId!
      );

      if (!fullPlanetData) return [];

      const routes = await this.getAllRoutesStartingWithPlanet(fullPlanetData);

      return routes;
    }

    return [];
  }

  public async findShortestRoute(planet: Planet): Promise<Planet[]> {
    const routes = await this.getAllRoutesForPlanet(planet);
    const routesRegen: number[] = [];

    for (const route of routes) {
      const totalRegen = this.calcRouteResistance(route);

      routesRegen.push(totalRegen);
    }

    const index = routesRegen.indexOf(Math.min(...routesRegen));

    return routes[index];
  }

  public async isPlanetAvailable(planet: Planet): Promise<boolean> {
    const supabase = await createClient();

    const { data: linksFromPlanet } = await supabase
      ?.from("supplyLineFull")
      .select("*")
      .eq("planetId", planet.index);
    const { data: linksToPlanet } = await supabase
      .from("supplyLineFull")
      .select("*")
      .eq("linkedPlanetId", planet.index);

    const links =
      linksFromPlanet && linksToPlanet
        ? [...linksFromPlanet, ...linksToPlanet]
        : linksFromPlanet && !linksToPlanet
        ? linksFromPlanet
        : !linksFromPlanet && linksToPlanet
        ? linksToPlanet
        : [];

    for (const link of links) {
      const planetData = await findPlanetById(
        planet.index === link.planetId ? link.linkedPlanetId! : link.planetId!
      );

      if (!planetData) return false;

      if (planetData.currentOwner === Factions.HUMANS) return true;
    }

    return false;
  }
}
