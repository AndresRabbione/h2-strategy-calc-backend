import { Factions, Planet } from "@/lib/typeDefinitions";
import { createClient } from "../supabase/server";
import { fetchAllPlanets } from "../helldiversAPI/planets";

export type DBLinks = {
  bidirectional: boolean | null;
  destination_disabled: boolean | null;
  destination_planet_name: string | null;
  linkedPlanetId: number | null;
  origin_disabled: boolean | null;
  origin_planet_name: string | null;
  planetId: number | null;
  supply_line_id: number | null;
}[];

export class PlanetRouter {
  private calcRouteResistance(planets: Planet[]): number {
    return planets.reduce(
      (accumulator, currentPlanet) =>
        accumulator + currentPlanet.regenPerSecond,
      0
    );
  }

  public async buildAdjacencyMap(): Promise<Map<number, DBLinks>> {
    const supabase = await createClient();
    const { data: links } = await supabase.from("supplyLineFull").select("*");

    const adjacency = new Map<number, DBLinks>();
    if (!links) return adjacency;

    for (const link of links) {
      if (link.planetId && link.linkedPlanetId) {
        if (!adjacency.has(link.planetId!)) adjacency.set(link.planetId!, []);
      }

      if (!adjacency.has(link.linkedPlanetId!)) {
        adjacency.set(link.linkedPlanetId!, []);
      }

      adjacency.get(link.planetId!)!.push(link);
      adjacency.get(link.linkedPlanetId!)!.push(link);
    }

    return adjacency;
  }

  private getAllRoutesDFS(
    startingPlanet: Planet,
    adjacency: Map<number, DBLinks>,
    allPlanets: Planet[],
    visited: Set<number> = new Set(),
    currentRoute: Planet[] = [],
    maxDepth = 5
  ): Planet[][] {
    const links = adjacency.get(startingPlanet.index) ?? [];

    // Avoid circling back, disabled planets, or excessive depth
    const isDisabled = links.some(
      (l) =>
        (l.planetId === startingPlanet.index && l.origin_disabled) ||
        (l.linkedPlanetId === startingPlanet.index && l.destination_disabled)
    );

    if (
      visited.has(startingPlanet.index) ||
      currentRoute.length > maxDepth ||
      isDisabled
    ) {
      return [];
    }

    const newRoute = [...currentRoute, startingPlanet];
    visited.add(startingPlanet.index);

    // This route is complete, we found a friedly planet
    if (startingPlanet.currentOwner === Factions.HUMANS) {
      return [newRoute];
    }

    const allRoutes: Planet[][] = [];
    for (const link of links) {
      const nextId =
        startingPlanet.index === link.planetId
          ? link.linkedPlanetId
          : link.planetId;
      const nextPlanet = allPlanets[nextId!];
      if (!nextPlanet) continue;

      const routes = this.getAllRoutesDFS(
        nextPlanet,
        adjacency,
        allPlanets,
        new Set(visited),
        newRoute,
        maxDepth
      );
      allRoutes.push(...routes);
    }

    return allRoutes;
  }

  public async findShortestRoute(planet: Planet): Promise<Planet[]> {
    const [adjacency, allPlanets] = await Promise.all([
      this.buildAdjacencyMap(),
      fetchAllPlanets(),
    ]);

    const links = adjacency.get(planet.index) ?? [];

    // Check direct connection first
    for (const link of links) {
      const neighborId =
        link.planetId === planet.index ? link.linkedPlanetId : link.planetId;
      const neighbor = allPlanets[neighborId!];
      if (neighbor && neighbor.currentOwner === Factions.HUMANS) {
        return [planet, neighbor];
      }
    }

    // Explore all routes
    const routes = this.getAllRoutesDFS(planet, adjacency, allPlanets);
    if (routes.length === 0) return [];

    // Pick route with minimum resistance
    const scoredRoutes = routes.map((route) => ({
      route,
      score: this.calcRouteResistance(route),
    }));

    scoredRoutes.sort((a, b) => a.score - b.score);
    return scoredRoutes[0].route;
  }
}
