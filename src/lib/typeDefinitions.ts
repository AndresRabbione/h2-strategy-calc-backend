import { Objective } from "@/utils/objectives/classes";
import { Database } from "../../database.types";

export type Cost = {
  id: string;
  itemMixId: number;
  targetValue: number;
  currentValue: number;
  deltaPerSecond: number;
  maxDonationAmount: number;
  maxDonationPeriodSeconds: number;
};

export type TacticalAction = {
  id32: number;
  mediaId32: number;
  name: string;
  description: string;
  strategicDescription: string;
  status: number;
  statusExpireAtWarTimeSeconds: number;
  cost: Cost[];
  effectIds: number[];
  activeEffectIds: number[];
};

export type SpaceStation = {
  id32: number;
  planetIndex: number;
  lastElectionId: string;
  currentElectionId: string;
  currentElectionEndWarTime: number;
  flags: 1;
  tacticalActions: TacticalAction[];
};

export type Reward = {
  type: number;
  id32: number;
  amount: number;
};

export type Task = {
  type: number;
  values: number[];
  valueTypes: number[];
};

export type AssignmentSetting = {
  type: number;
  overrideTitle: string;
  overrideBrief: string;
  tasks: Task[];
  rewards: Reward[];
  reward: Reward;
  flags: number;
};

export type Assignment = {
  id32: number;
  startTime: number;
  progress: number[];
  expiresIn: number;
  setting: AssignmentSetting;
};

export enum Factions {
  // Confirmed, used for planet data as the v1 endpoints use the names instead of ids
  HUMANS = "Humans",
  TERMINIDS = "Terminids",
  AUTOMATONS = "Automaton",
  ILLUMINATE = "Illuminate",
}

export enum FactionIDs {
  //Confirmed, used for MO parsing as the /raw endpoints use ids, not names
  HUMANS = 1,
  TERMINIDS = 2,
  AUTOMATONS = 3,
  ILLUMINATE = 4,
}

export enum RegionSizes {
  SETTLEMENT = "Settlement",
  TOWN = "Town",
  CITY = "City",
  MEGACITY = "MegaCity",
}

export type SupplyLines = {
  [planetName: string]: {
    index: number;
    links: { name: string; index: number }[];
    disabled: boolean;
  };
};

export type Biome = {
  name: string;
  description: string;
};

export type Hazard = {
  name: string;
  description: string;
};

export type GameEvent = {
  id: number;
  eventType: number;
  faction: string;
  health: number;
  maxHealth: number;
  startTime: string;
  endTime: string;
  campaignId: number;
  jointOperationIds: number[];
};

export type Statistics = {
  missionsWon: number;
  missionsLost: number;
  missionTime: number;
  terminidKills: number;
  automatonKills: number;
  illuminateKills: number;
  bulletsFired: number;
  bulletsHit: number;
  timePlayed: number;
  deaths: number;
  revives: number;
  friendlies: number;
  missionSuccessRate: number;
  accuracy: number;
  playerCount: number;
};

export type Region = {
  id: number;
  hash: number;
  name: string;
  description: number;
  health: number;
  maxHealth: number;
  size: RegionSizes;
  regenPerSecond: number;
  availabilityFactor: number | null;
  isAvailable: boolean;
  players: number;
};

export type Planet = {
  index: number;
  name: string;
  sector: string;
  biome: Biome;
  hazards: Hazard[];
  hash: number;
  position: { x: number; y: number };
  waypoints: number[];
  maxHealth: number;
  health: number;
  disabled: boolean;
  initialOwner: Factions;
  currentOwner: Factions;
  regenPerSecond: number;
  event: GameEvent | null;
  statistics: Statistics;
  attacking: number[];
  regions: Region[];
};

export interface Attack {
  targets: Planet[];
  source: Planet;
}

export enum ObjectiveTypes {
  //TODO: FIND THE IDS
  HOLD = 13,
  LIBERATE = 11, //Not sure about this one
  OPERATIONS = 9,
  KILL = 3,
  COLLECT,
  DEFEND_AMOUNT,
  LIBERATE_MORE,
  DEFEND = 12, //Not sure about this one
}

export enum ValueTypes {
  TARGET_FACTION = 1,
  AMOUNT = 3,
  TARGET_TYPE = 11, //Not sure about this one
  TARGET_ID = 12,
  DIFFICULTY = 9,
  ENEMY = 4,
  ITEM = 5,
  ITEM_TYPE = 6,
}

export enum Enemies {
  CHARGER = "Charger",
  BILE_TITAN = "Bile Titan",
  HULK = "Hulk",
  SHRIEKER = "Shrieker",
  IMPALER = "Impaler",
  FACTORY_STRIDER = "Factory Strider",
  FLESHMOB = "Fleshmob",
  LEVIATHAN = "Leviathan",
  UNKNOWN = "Unknown",
}

export enum EnemyIds {
  CHARGER,
  BILE_TITAN,
  HULK,
  SHRIEKER = 793026793,
  IMPALER = 1046000873,
  FACTORY_STRIDER = 1153658728,
  FLESHMOB = 2880434041,
  LEVIATHAN = 3097344451,
  UNKNOWN = -1,
}

export enum Items {
  COMMON = "Common Sample",
  RARE = "Rare Sample",
  SUPER_RARE = "Super Sample",
  UNKNOWN = "Unknown",
}

export enum ItemIds {
  COMMON,
  RARE = 2985106497,
  SUPER_RARE,
  MEDAL = 897894480,
  UNKNOWN,
}

export type ParsedAssignment = {
  id: number;
  endDate: string;
  title: string | null;
  brief: string | null;
  isMajorOrder: boolean;
};

export type DSSStep = {
  movementTarget: number;
  currentActiveAction: TacticalAction | null;
  actionToActivate: TacticalAction | null;
};

export type StrategyStep = {
  objective: Objective | null;
  targetPlanet: Planet | null;
  assignedPlayerPercentage: number;
  priority: number;
};

export type Sector = {
  id: number;
  name: string;
};

export type TableNames = keyof Database["public"]["Tables"];
