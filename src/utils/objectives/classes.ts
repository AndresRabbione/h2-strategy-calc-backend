import {
  EnemyIds,
  FactionIDs,
  Factions,
  ObjectiveTypes,
  Planet,
} from "@/lib/typeDefinitions";
import { calcPlanetProgressPercentage } from "@/utils/helldiversAPI/formulas";

export abstract class Objective {
  completed: boolean;
  type: ObjectiveTypes;
  id: number;

  constructor(complete: boolean, type: ObjectiveTypes, id: number) {
    this.completed = complete;
    this.type = type;
    this.id = id;
  }

  public getTargetedSector(): number | null {
    return null;
  }

  public getDifficulty(): number | null {
    return null;
  }

  public getEnemyProgress(): number | null {
    return null;
  }

  public getItemId(): number | null {
    return null;
  }

  public getPlayerProgress(): number {
    return 0;
  }

  public hasSpecificPlanet(): boolean {
    return false;
  }
  public getTargetedFaction(): FactionIDs | null {
    return null;
  }

  public getTargetPlanet(): Planet | null {
    return null;
  }

  public getAmount(): number | null {
    return null;
  }

  public getTargetedEnemy(): EnemyIds | null {
    return null;
  }

  public getObjectiveType(): number {
    return this.type;
  }

  public getTotalAmount(): number | null {
    return null;
  }
}

export class PlanetObjective extends Objective {
  target: Planet;

  constructor(
    complete: boolean,
    type: ObjectiveTypes.HOLD | ObjectiveTypes.LIBERATE | ObjectiveTypes.DEFEND,
    target: Planet,
    id: number = -1
  ) {
    super(complete, type, id);
    this.target = target;
  }

  public getPlayerProgress(): number {
    if (this.target.currentOwner === Factions.HUMANS && !this.target.event) {
      return 100;
    }
    return calcPlanetProgressPercentage(
      this.target.health,
      this.target.maxHealth,
      this.target.event
    );
  }

  public hasSpecificPlanet(): boolean {
    return true;
  }

  public getTargetPlanet(): Planet | null {
    return this.target;
  }

  public getTargetedFaction(): FactionIDs | null {
    return null;
  }

  public getAmount(): number {
    return 1;
  }
}

export class KillObjective extends Objective {
  faction: FactionIDs | null;
  enemy: EnemyIds | null;
  planet: Planet | null;
  sector: number | null;
  progress: number;
  totalAmount: number;
  item: number | null;

  constructor(
    faction: FactionIDs | null = null,
    enemy: EnemyIds | null = null,
    planet: Planet | null = null,
    progress: number,
    total: number,
    complete: boolean,
    sector: number | null = null,
    id: number,
    item: number | null = null
  ) {
    super(complete, ObjectiveTypes.KILL, id);
    this.faction = faction;
    this.enemy = enemy;
    this.totalAmount = total;
    this.planet = planet;
    this.progress = progress;
    this.sector = sector;
    this.id = id;
    this.item = item;
  }

  public getTotalAmount(): number | null {
    return this.totalAmount;
  }

  public getPlayerProgress(): number {
    return this.progress;
  }

  public getTargetedEnemy(): EnemyIds | null {
    return this.enemy;
  }

  public getAmount(): number {
    return this.totalAmount;
  }

  public hasSpecificPlanet(): boolean {
    return this.planet === null;
  }

  public getTargetedFaction(): FactionIDs | null {
    return this.faction;
  }

  public getTargetPlanet(): Planet | null {
    return this.planet;
  }

  public getItemId(): number | null {
    return this.item;
  }
}

export class CollectionObjective extends Objective {
  faction: FactionIDs | null;
  planet: Planet | null;
  item: number;
  progress: number;
  totalAmount: number;
  sectorId: number | null;

  constructor(
    completed: boolean,
    faction: FactionIDs | null = null,
    planet: Planet | null = null,
    item: number,
    progress: number,
    total: number,
    sectorId: number | null = null,
    id: number
  ) {
    super(completed, ObjectiveTypes.COLLECT, id);
    this.faction = faction;
    this.item = item;
    this.progress = progress;
    this.planet = planet;
    this.totalAmount = total;
    this.sectorId = sectorId;
  }

  public getItemId(): number | null {
    return this.item;
  }

  public getTotalAmount(): number | null {
    return this.totalAmount;
  }

  public getPlayerProgress(): number {
    return this.progress;
  }

  public getAmount(): number {
    return this.totalAmount;
  }

  public hasSpecificPlanet(): boolean {
    return this.planet === null;
  }

  public getTargetedFaction(): FactionIDs | null {
    return this.faction;
  }

  public getTargetPlanet(): Planet | null {
    return this.planet;
  }
}

export class DefendAmountObjective extends Objective {
  faction: FactionIDs | null;
  totalAmount: number;
  progress: number;

  constructor(
    complete: boolean,
    faction: FactionIDs | null = null,
    total: number,
    progress: number,
    id: number
  ) {
    super(complete, ObjectiveTypes.DEFEND, id);
    this.faction = faction;
    this.totalAmount = total;
    this.progress = progress;
  }

  public getTotalAmount(): number | null {
    return this.totalAmount;
  }

  public getPlayerProgress(): number {
    return this.progress;
  }

  public getAmount(): number {
    return this.totalAmount;
  }

  public getTargetedFaction(): FactionIDs | null {
    return this.faction;
  }
}

export class OperationObjective extends Objective {
  difficulty: number | null;
  totalAmount: number;
  progress: number;
  faction: FactionIDs | null;
  planet: Planet | null;
  difficultyTable: string[];

  constructor(
    completed: boolean,
    difficulty: number | null,
    total: number,
    progress: number,
    faction: FactionIDs | null = null,
    planet: Planet | null = null,
    id: number
  ) {
    super(completed, ObjectiveTypes.OPERATIONS, id);
    this.difficulty = difficulty;
    this.totalAmount = total;
    this.faction = faction;
    this.planet = planet;
    this.progress = progress;
    this.difficultyTable = [
      "Trivial",
      "Easy",
      "Medium",
      "Challenging",
      "Hard",
      "Extreme",
      "Suicide Mission",
      "Impossible",
      "Helldive",
      "Super Helldive",
    ];
  }

  public getDifficulty(): number | null {
    return this.difficulty;
  }

  public getTotalAmount(): number | null {
    return this.totalAmount;
  }

  public getPlayerProgress(): number {
    return this.progress;
  }

  public getAmount(): number {
    return this.totalAmount;
  }

  public hasSpecificPlanet(): boolean {
    return this.planet === null;
  }

  public getTargetedFaction(): FactionIDs | null {
    return this.faction;
  }

  public getTargetPlanet(): Planet | null {
    return this.planet;
  }
}

export class LiberateMoreObjective extends Objective {
  faction: FactionIDs | null;
  liberatedPlanetCount: number;
  lostPlanetCount: number;

  constructor(
    completed: boolean,
    faction: FactionIDs | null = null,
    liberatedCount: number,
    lostCount: number,
    id: number
  ) {
    super(completed, ObjectiveTypes.LIBERATE_MORE, id);
    this.faction = faction;
    this.liberatedPlanetCount = liberatedCount;
    this.lostPlanetCount = lostCount;
  }

  public getEnemyProgress(): number | null {
    return this.lostPlanetCount;
  }

  public getPlayerProgress(): number {
    return this.liberatedPlanetCount;
  }

  public getAmount(): number {
    return 0;
  }

  public getTargetedFaction(): FactionIDs | null {
    return this.faction;
  }
}
