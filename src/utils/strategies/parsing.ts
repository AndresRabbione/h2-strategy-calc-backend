import {
  Assignment,
  Enemies,
  EnemyIds,
  FactionIDs,
  Factions,
  ItemIds,
  Items,
  ObjectiveTypes,
  ParsedAssignment,
  Planet,
  Task,
  ValueTypes,
} from "@/lib/typeDefinitions";
import {
  CollectionObjective,
  KillObjective,
  Objective,
  OperationObjective,
  PlanetObjective,
} from "../objectives/classes";
import { findPlanetById } from "../heldiversAPI/planets";
import { isUnderAttack } from "../heldiversAPI/gambits";
import { createClient } from "../supabase/server";

export class MOParser {
  public async hasSpecifiedPlanets(
    assignments: ParsedAssignment[]
  ): Promise<boolean> {
    const supabase = await createClient();
    for (const assignment of assignments) {
      const { data: objectives } = await supabase
        .from("objective")
        .select("*")
        .eq("assignmentId", assignment.id);
      if (!objectives || objectives.length === 0) return false;
      for (const objective of objectives) {
        if (objective.planetId || objective.sectorId) return true;
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
        case ValueTypes.TARGET_ID:
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
    // eslint-disable-next-line prefer-const
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
        case ValueTypes.TARGET_ID:
          planet = await findPlanetById(objective.values[i]);
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
