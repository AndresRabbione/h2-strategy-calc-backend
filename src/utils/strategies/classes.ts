import {
  CollectionObjective,
  KillObjective,
  Objective,
  OperationObjective,
  PlanetObjective,
} from "@/utils/objectives/classes";
import {
  Enemies,
  EnemyIds,
  FactionIDs,
  Factions,
  ItemIds,
  Items,
  Assignment,
  ObjectiveTypes,
  ParsedAssignment,
  Planet,
  SupplyLines,
  Task,
  ValueTypes,
  DSSStep,
  StrategyStep,
} from "@/lib/typeDefinitions";
import { createClient } from "../supabase/server";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../../../database.types";
import { findPlanetById } from "../heldiversAPI/planets";
import { isUnderAttack } from "../heldiversAPI/gambits";

export class PlanetRouter {
  private supabaseClient: SupabaseClient<Database> | null;

  constructor() {
    this.supabaseClient = null;
  }

  public async initialize(): Promise<void> {
    this.supabaseClient = await createClient();
  }

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

export abstract class CalculatorStrategy {
  public impactModifier: number;
  public targetedPlanets: Planet[];
  public majorOrder: ParsedAssignment;
  public opportunities: ParsedAssignment[];
  public targetedFactions: Factions[];
  public DSSScript: DSSStep[];
  public ObjectiveScript: StrategyStep[];
  protected router: PlanetRouter;

  constructor(
    impact: number,
    routes: SupplyLines,
    majorOrder: ParsedAssignment,
    opportunities: ParsedAssignment[],
    targets: Planet[],
    factions: Factions[]
  ) {
    this.impactModifier = impact;
    this.majorOrder = majorOrder;
    this.opportunities = opportunities;
    this.targetedPlanets = targets;
    this.DSSScript = [];
    this.ObjectiveScript = [];
    this.targetedFactions = factions;
    this.router = new PlanetRouter(routes);
  }

  protected calcMinOffense(planet: Planet): number {
    return planet.maxHealth / (this.majorOrder.timeRemaining - 1);
  }

  protected calcMinPercentage(planet: Planet): number {
    const minOffense: number = this.calcMinOffense(planet);
    // TODO: Figure out the formula for the player weight
  }

  public abstract calculateOptimalStrategy(): void;
}

export class PlanetaryStrategy extends CalculatorStrategy {
  public calculateOptimalStrategy(): void {}
}

export class FactionStrategy extends CalculatorStrategy {
  public calculateOptimalStrategy(): void {}
}

export class NoMOStrategy extends CalculatorStrategy {
  constructor(impact: number, routes: SupplyLines) {
    super(impact, routes, {} as ParsedAssignment, [], [], []);
  }

  public calculateOptimalStrategy(): void {
    return;
  }
}

export class MOParser {
  public hasSpecifiedPlanets(assignments: ParsedAssignment[]): boolean {
    for (const assignment of assignments) {
      for (const objective of assignment.objectives) {
        if (objective.hasSpecificPlanet()) {
          return true;
        }
      }
    }

    return false;
  }

  private parseFactionId(factionId: number): Factions {
    switch (factionId) {
      case FactionIDs.HUMANS:
        return Factions.HUMANS;
        break;
      case FactionIDs.TERMINIDS:
        return Factions.TERMINIDS;
        break;
      case FactionIDs.AUTOMATONS:
        return Factions.AUTOMATONS;
        break;
      case FactionIDs.ILLUMINATE:
        return Factions.HUMANS;
        break;
      default:
        return Factions.HUMANS;
        break;
    }
  }

  private parseEnemyId(enemyId: number): Enemies {
    switch (enemyId) {
      case EnemyIds.BILE_TITAN:
        return Enemies.BILE_TITAN;
        break;
      case EnemyIds.CHARGER:
        return Enemies.CHARGER;
        break;
      case EnemyIds.HULK:
        return Enemies.HULK;
        break;
      case EnemyIds.FACTORY_STRIDER:
        return Enemies.FACTORY_STRIDER;
        break;
      case EnemyIds.FLESHMOB:
        return Enemies.FLESHMOB;
        break;
      case EnemyIds.IMPALER:
        return Enemies.IMPALER;
        break;
      case EnemyIds.LEVIATHAN:
        return Enemies.LEVIATHAN;
        break;
      case EnemyIds.SHRIEKER:
        return Enemies.SHRIEKER;
        break;
      default:
        return Enemies.UNKNOWN;
        break;
    }
  }

  private parseItemId(itemId: number): Items {
    switch (itemId) {
      case ItemIds.COMMON:
        return Items.COMMON;
        break;
      case ItemIds.RARE:
        return Items.RARE;
        break;
      case ItemIds.SUPER_RARE:
        return Items.SUPER_RARE;
        break;
      default:
        return Items.UNKNOWN;
        break;
    }
  }

  private async parsePlanetObj(
    objective: Task,
    progress: number
  ): Promise<Objective> {
    let target: Planet | null;

    for (let i = 0; i < objective.values.length; i++) {
      if (objective.valueTypes[i] === ValueTypes.TARGET_ID) {
        target = await findPlanetById(objective.values[i]);
      }
    }

    return new PlanetObjective(
      progress === 1 && !(await isUnderAttack(target!.index)),
      objective.type,
      target!
    );
  }

  private async parseOperationObj(
    objective: Task,
    progress: number
  ): Promise<Objective> {
    let complete: boolean = false;
    let difficulty: number | null = null;
    let faction: Factions | null = null;
    let planet: Planet | null = null;
    let total: number = 0;

    for (let i = 0; i < objective.values.length; i++) {
      switch (objective.valueTypes[i]) {
        case ValueTypes.AMOUNT:
          total = objective.values[i];
          complete = progress >= objective.values[i];
          break;
        case ValueTypes.DIFFICULTY:
          difficulty = objective.values[i];
          break;
        case ValueTypes.TARGET_ID:
          planet = await findPlanetById(objective.values[i]);
          break;
        case ValueTypes.TARGET_FACTION:
          faction = this.parseFactionId(objective.values[i]);
          break;
        default:
          break;
      }
    }

    return new OperationObjective(
      complete,
      difficulty,
      total,
      progress,
      faction,
      planet
    );
  }

  private async parseKillObj(
    objective: Task,
    progress: number
  ): Promise<Objective> {
    let complete: boolean = false;
    let faction: Factions | null = null;
    let enemy: Enemies | null = null;
    let planet: Planet | null = null;
    let total: number = 0;

    for (let i = 0; i < objective.values.length; i++) {
      switch (objective.valueTypes[i]) {
        case ValueTypes.AMOUNT:
          total = objective.values[i];
          complete = progress >= objective.values[i];
          break;
        case ValueTypes.TARGET_FACTION:
          faction = this.parseFactionId(objective.values[i]);
          break;
        case ValueTypes.ENEMY:
          //TODO: This needs to be changed once enemyIDS are known
          enemy = this.parseEnemyId(objective.values[i]);
          break;
        case ValueTypes.PLANET_ID:
          planet = await findPlanetById(objective.values[i]);
          break;
      }
    }

    return new KillObjective(faction, enemy, planet, progress, total, complete);
  }

  private async parseCollectionObj(
    objective: Task,
    progress: number
  ): Promise<Objective> {
    let complete: boolean = false;
    let faction: Factions | null = null;
    let item: Items = Items.COMMON;
    let planet: Planet | null = null;
    let total: number = 0;
    let sector: number | null = null;

    for (let i = 0; i < objective.values.length; i++) {
      switch (objective.valueTypes[i]) {
        case ValueTypes.AMOUNT:
          total = objective.values[i];
          complete = progress >= objective.values[i];
          break;
        case ValueTypes.TARGET_FACTION:
          faction = this.parseFactionId(objective.values[i]);
          break;
        case ValueTypes.ITEM:
          //TODO: This needs to be changed once enemyIDS are known
          item = this.parseItemId(objective.values[i]);
          break;
        case ValueTypes.PLANET_ID:
          planet = await findPlanetById(objective.values[i]);
          break;
        case ValueTypes.SECTOR:
          sector = objective.values[i];
          break;
      }
    }

    return new CollectionObjective(
      complete,
      faction,
      planet,
      item,
      progress,
      total,
      sector
    );
  }

  public async getParsedObjective(
    objective: Task,
    progress: number
  ): Promise<Objective | null> {
    switch (objective.type) {
      case ObjectiveTypes.HOLD:
        return await this.parsePlanetObj(objective, progress);
        break;
      case ObjectiveTypes.OPERATIONS:
        return await this.parseOperationObj(objective, progress);
        break;
      case ObjectiveTypes.COLLECT:
        return await this.parseCollectionObj(objective, progress);
        break;
      case ObjectiveTypes.DEFEND_AMOUNT:
        break;
      case ObjectiveTypes.KILL:
        return this.parseKillObj(objective, progress);
        break;
      case ObjectiveTypes.LIBERATE:
        break;
    }

    return null;
  }

  public isValidAssignment(assignment: Assignment): boolean {
    return assignment.id32 !== -1;
  }
}

export class StrategyFactory {
  private majorOrderParser: MOParser;
  private currentMajorOrder: Assignment;
  private opportunities: Assignment[];

  constructor(currentOrder: Assignment, opportunities: Assignment[]) {
    this.currentMajorOrder = currentOrder;
    this.majorOrderParser = new MOParser();
    this.opportunities = opportunities;
  }

  public async generateNewStrategy(): Promise<CalculatorStrategy> {
    const parsedMO = await this.getParsedMO();
    const impact = await getCurrentImpactMultiplier();

    if (!parsedMO) {
      return new NoMOStrategy(impact, supplyLines);
    }

    const opportunities = await this.getParsedOpportunities();

    const safeOpportunities = opportunities ?? [];

    const targetedFactions = this.getTargetedFactions(
      parsedMO,
      safeOpportunities
    );

    if (
      !this.majorOrderParser.hasSpecifiedPlanets([
        parsedMO,
        ...safeOpportunities,
      ])
    ) {
      return new FactionStrategy(
        impact,
        supplyLines,
        parsedMO,
        safeOpportunities,
        [],
        targetedFactions
      );
    }

    const targets: Planet[] = this.getTargetedPlanets(
      parsedMO,
      safeOpportunities
    );

    return new PlanetaryStrategy(
      impact,
      supplyLines,
      parsedMO,
      safeOpportunities,
      targets,
      targetedFactions
    );
  }

  public getTargetedFactions(
    majorOrder: ParsedAssignment,
    opportunities: ParsedAssignment[]
  ): Factions[] {
    let targetedFactions: Factions[] = [...majorOrder.targetFactions];

    for (const opportunity of opportunities) {
      targetedFactions = [...opportunity.targetFactions, ...targetedFactions];
    }

    return targetedFactions;
  }

  public getTargetedPlanets(
    majorOrder: ParsedAssignment,
    opportunities: ParsedAssignment[]
  ): Planet[] {
    const targets: Planet[] = [];

    for (const objective of majorOrder.objectives) {
      const planet: Planet | null = objective.getTargetPlanet();

      if (planet) targets.push(planet);
    }

    for (const opportunity of opportunities) {
      for (const objective of opportunity.objectives) {
        const planet: Planet | null = objective.getTargetPlanet();

        if (planet) targets.push(planet);
      }
    }

    return targets;
  }

  private async getParsedMO(): Promise<ParsedAssignment | null> {
    if (this.majorOrderParser.isValidAssignment(this.currentMajorOrder)) {
      return null;
    }

    const tasks = this.currentMajorOrder.setting.tasks;
    const progress = this.currentMajorOrder.progress;
    const objectives: Objective[] = [];
    const targetedFactions: Factions[] = [];
    for (let i = 0; i < progress.length; i++) {
      const parsedObj = await this.majorOrderParser.getParsedObjective(
        tasks[i],
        progress[i]
      );

      const currentFaction = parsedObj?.getTargetedFaction();

      if (currentFaction && !targetedFactions.includes(currentFaction)) {
        targetedFactions.push(currentFaction);
      }

      if (parsedObj !== null) {
        objectives.push(parsedObj);
      }
    }

    const endTime = Date.now() + this.currentMajorOrder.expiresIn * 1000;
    const endDate = new Date(endTime);

    return {
      id: this.currentMajorOrder.id32,
      endDate: endDate,
      timeRemaining: this.currentMajorOrder.expiresIn * 1000,
      objectives: objectives,
      isMajorOrder: true,
      title: this.currentMajorOrder.setting.overrideTitle,
      brief: this.currentMajorOrder.setting.overrideBrief,
      targetFactions: targetedFactions,
    };
  }

  private async getParsedOpportunities(): Promise<ParsedAssignment[] | null> {
    const parsedOpportunities: ParsedAssignment[] = [];

    for (const opportunity of this.opportunities) {
      if (this.majorOrderParser.isValidAssignment(opportunity)) {
        const tasks = opportunity.setting.tasks;
        const progress = opportunity.progress;
        const objectives: Objective[] = [];
        const targetedFactions: Factions[] = [];

        for (let i = 0; i < progress.length; i++) {
          const parsedObj = await this.majorOrderParser.getParsedObjective(
            tasks[i],
            progress[i]
          );

          const currentFaction = parsedObj?.getTargetedFaction();

          if (currentFaction && !targetedFactions.includes(currentFaction)) {
            targetedFactions.push(currentFaction);
          }

          if (parsedObj !== null) {
            objectives.push(parsedObj);
          }
        }

        const endTime = Date.now() + opportunity.expiresIn * 1000;
        const endDate = new Date(endTime);

        parsedOpportunities.push({
          id: opportunity.id32,
          endDate: endDate,
          timeRemaining: opportunity.expiresIn * 1000,
          objectives: objectives,
          isMajorOrder: false,
          title: opportunity.setting.overrideTitle,
          brief: opportunity.setting.overrideBrief,
          targetFactions: targetedFactions,
        });
      }
    }

    return parsedOpportunities;
  }
}
