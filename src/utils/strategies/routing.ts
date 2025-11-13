import { Factions, Planet } from "@/lib/typeDefinitions";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../../../database.types";

export type DBLinks = {
  bidirectional: boolean | null;
  destination_disabled: boolean | null;
  destination_planet_name: string | null;
  linkedPlanetId: number | null;
  origin_disabled: boolean | null;
  origin_planet_name: string | null;
  planetId: number | null;
  supply_line_id: number | null;
};

export class PlanetRouter {
  /**
   * A private helper function for calculating the resistance of a route
   * @param route
   * The route to get the resistance for
   * @returns
   * The sum of the regen per second of the route's planets
   */
  public calcRouteResistance(route: Planet[]): number {
    return route.reduce(
      (accumulator, currentPlanet) =>
        accumulator + currentPlanet.regenPerSecond,
      0
    );
  }

  /**
   * Creates a map for fast lookup of supply lines, used for gambits
   * and routing
   * @returns
   * The format is a Map with each planet ID as a key and all of its connections in the
   * supplyLineView format from the DB
   */
  public async buildAdjacencyMap(
    supabase: SupabaseClient<Database>
  ): Promise<Map<number, DBLinks[]>> {
    const { data: links } = await supabase.from("supplyLineFull").select("*");

    const adjacency = new Map<number, DBLinks[]>();
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

  /**
   * A depth-first approach to finding all routes to a planet, recursion depth
   * is capped at 8
   * @param startingPlanet
   * The current planet in the route
   * @param adjacency
   * The Map used for fast lookup of connections and planet status
   * @param visited
   * A set of already visited planets for this route
   * @returns
   * Each route starts with the target planet and ends with the friendly planet
   */
  private getAllRoutesDFS(
    startingPlanet: Planet,
    adjacency: Map<number, DBLinks[]>,
    allPlanets: Planet[],
    visited: Set<number> = new Set(),
    currentRoute: Planet[] = [],
    maxDepth: number = 8
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

  /**
   * The exposed API for finding a shortest route, makes use of other private funcitons
   * @returns
   * The route starts with the target planet and ends with the friendly planet
   */
  //TODO: Needs to find other target collisions which is considerably more difficult
  public findShortestRoute(
    planet: Planet,
    allPlanets: Planet[],
    adjacency: Map<number, DBLinks[]>
  ): Planet[] {
    if (planet.currentOwner === Factions.HUMANS) {
      return [];
    }

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
