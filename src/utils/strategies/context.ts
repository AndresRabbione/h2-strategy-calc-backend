import {
  FullParsedAssignment,
  Planet,
  PlanetSnapshotFull,
  StrategyStepFull,
} from "@/lib/typeDefinitions";
import { DBLinks } from "./routing";
import { createPlanetMap } from "../parsing/mapping";

export class ContextObject {
  public readonly totalPlayerCount: number;
  public readonly adjacencyMap: Map<number, DBLinks[]>;
  public readonly sectors: { id: number; sector: number }[];
  public readonly estimatedPerPlayerImpact: number;
  public readonly now: string;
  public readonly dbAssignments: FullParsedAssignment[];
  public readonly currentSteps: StrategyStepFull[];
  public readonly latestSnapshots: PlanetSnapshotFull[];
  public readonly planetMap: Map<number, Planet>;
  public readonly allPlanets: Planet[];

  private targetMap: Map<number, Set<number>>;

  constructor(
    totalPlayerCount: number,
    allPlanets: Planet[],
    adjacencyMap: Map<number, DBLinks[]>,
    sectors: { id: number; sector: number }[],
    estimatedPerPlayerImpact: number,
    dbAssignments: FullParsedAssignment[],
    currentSteps: StrategyStepFull[],
    latestSnapshots: PlanetSnapshotFull[],
    now: string
  ) {
    this.totalPlayerCount = totalPlayerCount;
    this.adjacencyMap = adjacencyMap;
    this.sectors = sectors;
    this.targetMap = new Map<number, Set<number>>();
    this.estimatedPerPlayerImpact = estimatedPerPlayerImpact;
    this.dbAssignments = dbAssignments;
    this.now = now;
    this.currentSteps = currentSteps;
    this.latestSnapshots = latestSnapshots;
    this.planetMap = createPlanetMap(allPlanets);
    this.allPlanets = allPlanets;
  }

  public addTarget(targetId: number, objectiveId: number): void {
    if (this.targetMap.has(targetId)) {
      this.targetMap.get(targetId)?.add(objectiveId);
    } else {
      this.targetMap.set(targetId, new Set<number>().add(objectiveId));
    }
  }

  public getTargets(): Map<number, Set<number>> {
    return this.targetMap;
  }

  public getTargetById(planetId: number): Set<number> | undefined {
    return this.targetMap.get(planetId);
  }
}
