import {
  Assignment,
  FactionIDs,
  ObjectiveTypes,
  ParsedAssignment,
  Planet,
  Task,
  ValueTypes,
} from "@/lib/typeDefinitions";
import {
  CollectionObjective,
  DefendAmountObjective,
  KillObjective,
  LiberateMoreObjective,
  Objective,
  OperationObjective,
  PlanetObjective,
} from "../objectives/classes";
import { createClient } from "../supabase/server";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../../../database.types";

export class MOParser {
  supabase: SupabaseClient<Database>;
  constructor(supabaseClient: SupabaseClient<Database>) {
    this.supabase = supabaseClient;
  }

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

  private parsePlanetObj(
    objective: Task,
    progress: number,
    allPlanets: Planet[]
  ): Objective {
    let target: Planet | null;

    for (let i = 0; i < objective.values.length; i++) {
      if (objective.valueTypes[i] === ValueTypes.TARGET_ID) {
        target = allPlanets[objective.values[i]];
      }
    }

    return new PlanetObjective(
      progress === 1 && !target!.event,
      objective.type,
      target!
    );
  }

  private parseOperationObj(
    objective: Task,
    progress: number,
    allPlanets: Planet[]
  ): Objective {
    let complete: boolean = false;
    let difficulty: number | null = null;
    let faction: FactionIDs | null = null;
    let planet: Planet | null = null;
    let total: number = 0;

    for (let i = 0; i < objective.values.length; i++) {
      switch (objective.valueTypes[i]) {
        case ValueTypes.AMOUNT:
          total = objective.values[i];
          complete = progress >= total;
          break;
        case ValueTypes.DIFFICULTY:
          difficulty = objective.values[i];
          break;
        case ValueTypes.TARGET_ID:
          planet = allPlanets[objective.values[i]];
          break;
        case ValueTypes.TARGET_FACTION:
          faction = objective.values[i];
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
      planet,
      -1
    );
  }

  private async parseKillObj(
    objective: Task,
    progress: number,
    allPlanets: Planet[]
  ): Promise<Objective> {
    let complete: boolean = false;
    let faction: FactionIDs | null = null;
    let enemy: number | null = null;
    let planet: Planet | null = null;
    let sector: number | null = null;
    let total: number = 0;
    let item: number | null = null;

    for (let i = 0; i < objective.values.length; i++) {
      switch (objective.valueTypes[i]) {
        case ValueTypes.AMOUNT:
          total = objective.values[i];
          complete = progress >= objective.values[i];
          break;
        case ValueTypes.TARGET_FACTION:
          faction = objective.values[i];
          break;
        case ValueTypes.ENEMY:
          enemy = objective.values[i];
          break;
        case ValueTypes.ITEM:
          item = objective.values[i];
          break;
        case ValueTypes.TARGET_ID:
          let auxValue = 0;
          for (const type of objective.valueTypes) {
            if (type === ValueTypes.TARGET_TYPE) auxValue = type;
          }
          planet = auxValue === 1 ? allPlanets[objective.values[i]] : null;
          sector = auxValue === 2 ? objective.values[i] : null;
          break;
      }
    }

    if (item) {
      const { data: DBItem } = await this.supabase
        .from("item")
        .select("*")
        .eq("id", item)
        .single();

      if (!DBItem) {
        const { data, error } = await this.supabase
          .from("item")
          .insert({ id: item, name: "Unknown" })
          .select();

        if (!data || error) {
          item = -1;
        }
      }
    }

    if (enemy && enemy !== 0) {
      const { data: DBItem } = await this.supabase
        .from("enemy")
        .select("*")
        .eq("id", enemy)
        .single();

      if (!DBItem) {
        const { data, error } = await this.supabase
          .from("enemy")
          .insert({ id: enemy, name: "Unknown" })
          .select();

        if (!data || error) {
          enemy = -1;
        }
      }
    }

    return new KillObjective(
      faction,
      enemy,
      planet,
      progress,
      total,
      complete,
      sector,
      -1,
      item
    );
  }

  private async parseCollectionObj(
    objective: Task,
    progress: number,
    allPlanets: Planet[]
  ): Promise<Objective> {
    let complete: boolean = false;
    let faction: FactionIDs | null = null;
    let item: number = -1;
    let planet: Planet | null = null;
    let total: number = 0;
    let sector: number | null = null;

    for (let i = 0; i < objective.values.length; i++) {
      switch (objective.valueTypes[i]) {
        case ValueTypes.AMOUNT:
          total = objective.values[i];
          complete = progress >= total;
          break;
        case ValueTypes.TARGET_FACTION:
          faction = objective.values[i];
          break;
        case ValueTypes.ITEM:
          item = objective.values[i];
          break;
        case ValueTypes.TARGET_ID:
          let auxValue = 0;
          for (
            let currType = 0;
            currType < objective.valueTypes.length;
            currType++
          ) {
            if (objective.valueTypes[currType] === ValueTypes.TARGET_TYPE)
              auxValue = objective.values[currType];
          }
          planet = auxValue === 1 ? allPlanets[objective.values[i]] : null;
          sector = auxValue === 2 ? objective.values[i] : null;
          break;
      }
    }

    const { data: DBItem } = await this.supabase
      .from("item")
      .select("*")
      .eq("id", item)
      .single();

    if (!DBItem) {
      const { error, data } = await this.supabase
        .from("item")
        .insert({ id: item, name: "Unknown" })
        .select();

      if (error || !data) {
        item = -1;
      }
    }

    return new CollectionObjective(
      complete,
      faction,
      planet,
      item,
      progress,
      total,
      sector,
      -1
    );
  }

  private parsedLiberateMoreObj(objective: Task, progress: number): Objective {
    let faction: FactionIDs | null = null;
    let planetsLost: number = 0;

    for (let i = 0; i < objective.values.length; i++) {
      switch (objective.valueTypes[i]) {
        case ValueTypes.AMOUNT:
          planetsLost = objective.values[i];
          break;
        case ValueTypes.TARGET_FACTION:
          faction = objective.values[i];
          break;
      }
    }

    return new LiberateMoreObjective(false, faction, progress, planetsLost, -1);
  }

  private parsedDefendAmountObj(objective: Task, progress: number): Objective {
    let complete: boolean = false;
    let faction: FactionIDs | null = null;
    let total: number = 0;

    for (let i = 0; i < objective.values.length; i++) {
      switch (objective.valueTypes[i]) {
        case ValueTypes.AMOUNT:
          total = objective.values[i];
          complete = progress >= total;
          break;
        case ValueTypes.TARGET_FACTION:
          faction = objective.values[i];
          break;
      }
    }

    return new DefendAmountObjective(complete, faction, total, progress, -1);
  }

  public async getParsedObjective(
    objective: Task,
    progress: number,
    allPlanets: Planet[]
  ): Promise<Objective | null> {
    switch (objective.type) {
      case ObjectiveTypes.HOLD:
        return this.parsePlanetObj(objective, progress, allPlanets);
        break;
      case ObjectiveTypes.OPERATIONS:
        return this.parseOperationObj(objective, progress, allPlanets);
        break;
      case ObjectiveTypes.COLLECT:
        return await this.parseCollectionObj(objective, progress, allPlanets);
        break;
      case ObjectiveTypes.KILL:
        return await this.parseKillObj(objective, progress, allPlanets);
        break;
      case ObjectiveTypes.LIBERATE:
        return this.parsePlanetObj(objective, progress, allPlanets);
        break;
      case ObjectiveTypes.DEFEND:
        if (this.isDefendAmount(objective)) {
          return this.parsedDefendAmountObj(objective, progress);
        }
        return this.parsePlanetObj(objective, progress, allPlanets);
        break;
      case ObjectiveTypes.LIBERATE_MORE:
        return this.parsedLiberateMoreObj(objective, progress);
        break;
    }

    return null;
  }

  public isValidAssignment(assignment: Assignment): boolean {
    return assignment.id32 !== -1;
  }

  public isDefendAmount(objective: Task): boolean {
    let targetAuxValue = 0;

    for (let i = 0; i < objective.values.length; i++) {
      if (objective.valueTypes[i] === ValueTypes.TARGET_TYPE) {
        targetAuxValue = objective.values[i];
        break;
      }
    }

    return objective.type === ObjectiveTypes.DEFEND && targetAuxValue === 0;
  }
}
