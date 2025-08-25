import { JSX } from "react";
import {
  Enemies,
  Factions,
  Items,
  ObjectiveTypes,
  Planet,
  Sector,
} from "@/lib/typeDefinitions";
import { calcPlanetProgressPercentage } from "@/utils/heldiversAPI/formulas";
import ObjectiveProgressBar from "../../../components/objectiveProgressBar";
import DualObjectiveProgressBar from "../../../components/dualObjProgressBar";

export abstract class Objective {
  completed: boolean;
  type: ObjectiveTypes;

  constructor(complete: boolean, type: ObjectiveTypes) {
    this.completed = complete;
    this.type = type;
  }

  public abstract getObjectiveVisual(keyValue: number): JSX.Element;

  public hasSpecificPlanet(): boolean {
    return false;
  }
  public getTargetedFaction(): Factions | null {
    return null;
  }

  public getTargetPlanet(): Planet | null {
    return null;
  }

  public abstract getAmount(): number;
}

export class PlanetObjective extends Objective {
  target: Planet;

  constructor(
    complete: boolean,
    type: ObjectiveTypes.HOLD | ObjectiveTypes.LIBERATE | ObjectiveTypes.DEFEND,
    target: Planet
  ) {
    super(complete, type);
    this.target = target;
  }

  public hasSpecificPlanet(): boolean {
    return true;
  }

  public getTargetPlanet(): Planet | null {
    return this.target;
  }

  public getTargetedFaction(): Factions | null {
    return this.target.currentOwner;
  }

  public getAmount(): number {
    return 1;
  }

  public getObjectiveVisual(keyValue: number): JSX.Element {
    const percentComplete: number = calcPlanetProgressPercentage(
      this.target.health,
      this.target.maxHealth
    );

    const factionColor: string =
      this.target.currentOwner === Factions.TERMINIDS
        ? "terminid"
        : this.target.currentOwner === Factions.AUTOMATONS
        ? "automaton"
        : this.target.currentOwner === Factions.ILLUMINATE
        ? "illuminate"
        : "helldiver-yellow";
    return (
      <div className="flex flex-col gap-3" key={keyValue}>
        <div className="flex flex-row">
          <div
            className={`${
              this.completed ? "bg-success" : "bg-[#44464a]"
            } h-1 w-1 p-0.5 m-1 border-1 border-[#61605f] shadow-inner`}
          ></div>
          <span>
            {this.type == ObjectiveTypes.HOLD
              ? "Hold "
              : this.type === ObjectiveTypes.LIBERATE
              ? "Liberate "
              : "Defend "}
            <span className={`text-${factionColor}`}>
              {this.target.name + "."}
            </span>
          </span>
        </div>
        {!this.completed && (
          <ObjectiveProgressBar
            innerText={`(${percentComplete.toFixed(1)}%)`}
            factionColor={factionColor}
            percentage={percentComplete}
          />
        )}
      </div>
    );
  }
}

export class KillObjective extends Objective {
  faction: Factions | null;
  enemy: Enemies | null;
  planet: Planet | null;
  sector: Sector | null;
  progress: number;
  totalAmount: number;

  constructor(
    faction: Factions | null = null,
    enemy: Enemies | null = null,
    planet: Planet | null = null,
    progress: number,
    total: number,
    complete: boolean,
    sector: Sector | null = null
  ) {
    super(complete, ObjectiveTypes.KILL);
    this.faction = faction;
    this.enemy = enemy;
    this.totalAmount = total;
    this.planet = planet;
    this.progress = progress;
    this.sector = sector;
  }

  public getAmount(): number {
    return this.totalAmount;
  }

  public hasSpecificPlanet(): boolean {
    return this.planet === null;
  }

  public getTargetedFaction(): Factions | null {
    return this.faction;
  }

  public getTargetPlanet(): Planet | null {
    return this.planet;
  }

  public getObjectiveVisual(keyValue: number): JSX.Element {
    const percentComplete: number = (this.progress / this.totalAmount) * 100;

    const factionColor: string =
      this.faction === Factions.TERMINIDS
        ? "terminid"
        : this.faction === Factions.AUTOMATONS
        ? "automaton"
        : this.faction === Factions.ILLUMINATE
        ? "illuminate"
        : "helldiver-yellow";

    return (
      <div className="flex flex-col gap-3" key={keyValue}>
        <div className="flex flex-row">
          <div
            className={`${
              this.completed ? "bg-success" : "bg-[#44464a]"
            } h-1 w-1 p-0.5 m-1 border-1 border-[#61605f] shadow-inner`}
          ></div>
          <span>
            Kill
            <span className={`text-helldiver-yellow`}>{this.totalAmount}</span>
            <span className={`text-[${factionColor}]`}>
              {this.faction && !this.enemy
                ? this.faction + "."
                : this.enemy
                ? this.enemy + "s."
                : "enemies."}
            </span>
          </span>
        </div>
        {!this.completed && (
          <ObjectiveProgressBar
            innerText={`${this.progress} / ${
              this.totalAmount
            } (${percentComplete.toFixed(1)}%)`}
            factionColor={factionColor}
            percentage={percentComplete}
          />
        )}
      </div>
    );
  }
}

export class CollectionObjective extends Objective {
  faction: Factions | null;
  planet: Planet | null;
  item: Items;
  progress: number;
  totalAmount: number;
  sectorId: number | null;

  constructor(
    completed: boolean,
    faction: Factions | null = null,
    planet: Planet | null = null,
    item: Items,
    progress: number,
    total: number,
    sectorId: number | null = null
  ) {
    super(completed, ObjectiveTypes.COLLECT);
    this.faction = faction;
    this.item = item;
    this.progress = progress;
    this.planet = planet;
    this.totalAmount = total;
    this.sectorId = sectorId;
  }

  public getAmount(): number {
    return this.totalAmount;
  }

  public hasSpecificPlanet(): boolean {
    return this.planet === null;
  }

  public getTargetedFaction(): Factions | null {
    return this.faction;
  }

  public getTargetPlanet(): Planet | null {
    return this.planet;
  }

  public getObjectiveVisual(keyValue: number): JSX.Element {
    const percentComplete: number = (this.progress / this.totalAmount) * 100;

    const factionColor: string =
      this.faction === Factions.TERMINIDS
        ? "#fdc300"
        : this.faction === Factions.AUTOMATONS
        ? "#fe6d6a"
        : this.faction === Factions.ILLUMINATE
        ? "#ce64f8"
        : "#ffe711";

    return (
      <div className="flex flex-col gap-3" key={keyValue}>
        <div className="flex flex-row">
          <div
            className={`${
              this.completed ? "bg-[--success]" : "bg-[#44464a]"
            } h-1 w-1 p-0.5 m-1 border-1 border-[#61605f] shadow-inner`}
          ></div>
          <span>
            Collect
            <span className={`text-[--helldiver-yellow]`}>
              {this.totalAmount}
            </span>
            <span className={`text-[--helldiver-yellow]`}>
              {this.item + "s" + this.faction && this.planet ? "" : "."}
            </span>
            {this.faction && (
              <span className={`text-[${factionColor}]`}>
                against the {this.faction + !this.planet ? "." : ""}
              </span>
            )}
            {this.planet && (
              <span className={`text-[${factionColor}]`}>
                on {this.planet.name + "."}
              </span>
            )}
          </span>
        </div>
        {!this.completed && (
          <ObjectiveProgressBar
            innerText={`${this.progress} / ${
              this.totalAmount
            } (${percentComplete.toFixed(1)}%)`}
            factionColor={factionColor}
            percentage={percentComplete}
          />
        )}
      </div>
    );
  }
}

export class DefendAmountObjective extends Objective {
  faction: Factions | null;
  totalAmount: number;
  progress: number;

  constructor(
    complete: boolean,
    faction: Factions | null = null,
    total: number,
    progress: number
  ) {
    super(complete, ObjectiveTypes.DEFEND_AMOUNT);
    this.faction = faction;
    this.totalAmount = total;
    this.progress = progress;
  }

  public getAmount(): number {
    return this.totalAmount;
  }

  public getTargetedFaction(): Factions | null {
    return this.faction;
  }

  public getObjectiveVisual(keyValue: number): JSX.Element {
    const percentComplete: number = (this.progress / this.totalAmount) * 100;

    const factionColor: string =
      this.faction === Factions.TERMINIDS
        ? "#fdc300"
        : this.faction === Factions.AUTOMATONS
        ? "#fe6d6a"
        : this.faction === Factions.ILLUMINATE
        ? "#ce64f8"
        : "#ffe711";

    return (
      <div className="flex flex-col gap-3" key={keyValue}>
        <div className="flex flex-row">
          <div
            className={`${
              this.completed ? "bg-[--success]" : "bg-[#44464a]"
            } h-1 w-1 p-0.5 m-1 border-1 border-[#61605f] shadow-inner`}
          ></div>
          <span>
            Successfully defend
            <span className={`text-[--helldiver-yellow]`}>
              {this.totalAmount}
            </span>
            <span>planets.</span>
          </span>
        </div>
        {!this.completed && (
          <ObjectiveProgressBar
            innerText={`${this.progress} / ${
              this.totalAmount
            } (${percentComplete.toFixed(1)}%)`}
            factionColor={factionColor}
            percentage={percentComplete}
          />
        )}
      </div>
    );
  }
}

export class OperationObjective extends Objective {
  difficulty: number | null;
  totalAmount: number;
  progress: number;
  faction: Factions | null;
  planet: Planet | null;
  difficultyTable: string[];

  constructor(
    completed: boolean,
    difficulty: number | null,
    total: number,
    progress: number,
    faction: Factions | null = null,
    planet: Planet | null = null
  ) {
    super(completed, ObjectiveTypes.OPERATIONS);
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

  public getAmount(): number {
    return this.totalAmount;
  }

  public hasSpecificPlanet(): boolean {
    return this.planet === null;
  }

  public getTargetedFaction(): Factions | null {
    return this.faction;
  }

  public getTargetPlanet(): Planet | null {
    return this.planet;
  }

  public getObjectiveVisual(keyValue: number): JSX.Element {
    const percentComplete: number = (this.progress / this.totalAmount) * 100;

    const factionColor: string =
      this.faction === Factions.TERMINIDS
        ? "#fdc300"
        : this.faction === Factions.AUTOMATONS
        ? "#fe6d6a"
        : this.faction === Factions.ILLUMINATE
        ? "#ce64f8"
        : "#ffe711";

    return (
      <div className="flex flex-col gap-3" key={keyValue}>
        <div className="flex flex-row">
          <div
            className={`${
              this.completed ? "bg-[--success]" : "bg-[#44464a]"
            } h-1 w-1 p-0.5 m-1 border-1 border-[#61605f] shadow-inner`}
          ></div>
          <span>
            Complete
            <span className="text-[--helldiver-yellow]">
              {this.totalAmount}
            </span>
            <span>of Operations</span>
            {this.difficulty && (
              <span>
                on difficulty{" "}
                <span className="text-[--helldiver-yellow]">
                  {this.difficultyTable[this.difficulty] +
                    " or higher" +
                    !this.faction && !this.planet
                    ? "."
                    : ""}
                </span>
              </span>
            )}
            {this.faction && (
              <span className={`text-[${factionColor}]`}>
                against the {this.faction + !this.planet ? "." : ""}
              </span>
            )}
            {this.planet && (
              <span className={`text-[${factionColor}]`}>
                on {this.planet.name + "."}
              </span>
            )}
          </span>
        </div>
        {!this.completed && (
          <ObjectiveProgressBar
            innerText={`${this.progress} / ${
              this.totalAmount
            } (${percentComplete.toFixed(1)}%)`}
            factionColor={factionColor}
            percentage={percentComplete}
          />
        )}
      </div>
    );
  }
}

export class LiberateMoreObjective extends Objective {
  faction: Factions | null;
  liberatedPlanetCount: number;
  lostPlanetCount: number;

  constructor(
    completed: boolean,
    faction: Factions | null = null,
    liberatedCount: number,
    lostCount: number
  ) {
    super(completed, ObjectiveTypes.LIBERATE_MORE);
    this.faction = faction;
    this.liberatedPlanetCount = liberatedCount;
    this.lostPlanetCount = lostCount;
  }

  public getAmount(): number {
    return 0;
  }

  public getTargetedFaction(): Factions | null {
    return this.faction;
  }

  public getObjectiveVisual(keyValue: number): JSX.Element {
    const factionColor: string =
      this.faction === Factions.TERMINIDS
        ? "#fdc300"
        : this.faction === Factions.AUTOMATONS
        ? "#fe6d6a"
        : this.faction === Factions.ILLUMINATE
        ? "#ce64f8"
        : "#ffe711";

    return (
      <div className="flex flex-col gap-3" key={keyValue}>
        <div className="flex flex-row">
          <div
            className={`${
              this.completed ? "bg-[--success]" : "bg-[#44464a]"
            } h-1 w-1 p-0.5 m-1 border-1 border-[#61605f] shadow-inner`}
          ></div>
          <span>
            Liberate more planets
            {this.faction && (
              <span className={`text-[${factionColor}]`}>
                from the {this.faction}
              </span>
            )}
            than are lost.
          </span>
        </div>
        {!this.completed && (
          <DualObjectiveProgressBar
            factionColor={factionColor}
            friendlyCount={this.liberatedPlanetCount}
            enemyCount={this.lostPlanetCount}
          />
        )}
      </div>
    );
  }
}
