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

export type SpaceStationRaw = {
  id32: number;
  planetIndex: number;
  lastElectionId: string;
  currentElectionId: string;
  currentElectionEndWarTime: number;
  flags: 1;
  tacticalActions: TacticalAction[];
};

export type SpaceStationV2 = {
  id32: number;
  planet: Planet;
  electionEnd: string;
  flags: number;
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
  HUMANS = "Humans",
  TERMINIDS = "Terminids",
  AUTOMATONS = "Automaton",
  ILLUMINATE = "Illuminate",
}

export enum FactionIDs {
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
  faction: Factions;
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

export type DispatchV1 = {
  id: number;
  published: string;
  type: number;
  message: string;
};

export enum ObjectiveTypes {
  HOLD = 13,
  LIBERATE = 11, //Not sure about this one
  OPERATIONS = 9,
  KILL = 3,
  COLLECT = 2,
  LIBERATE_MORE = -1,
  DEFEND = 12, //Not sure about this one
}

export enum ValueTypes {
  TARGET_FACTION = 1,
  AMOUNT = 3,
  TARGET_TYPE = 11,
  TARGET_ID = 12,
  DIFFICULTY = 9,
  ENEMY = 4,
  ITEM = 5,
  ITEM_TYPE = 6,
}

export enum EnemyIds {
  CHARGER = 1299714559,
  BILE_TITAN = 2514244534,
  HULK,
  SHRIEKER = 793026793,
  IMPALER = 1046000873,
  FACTORY_STRIDER = 1153658728,
  FLESHMOB = 2880434041,
  LEVIATHAN = 3097344451,
  TROOPER = 4039692928,
  UNKNOWN = -1,
  ANY = 0,
}

export enum ItemIds {
  COMMON = 3992382197,
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
  is_decision: boolean;
  is_active: boolean;
};

export type DSSStep = {
  movementTarget: number;
  currentActiveAction: TacticalAction | null;
  actionToActivate: TacticalAction | null;
};

export type StrategyStepInsert = {
  planetId: number;
  playerPercentage: number;
  strategyId: number;
  created_at: string;
  progress: number;
  limit_date: string;
};

export type StrategyStepFull = {
  id: number;
  planetId: number;
  playerPercentage: number;
  strategyId: number;
  created_at: string;
  progress: number;
  limit_date: string;
};

export type RegionSplitInsert = {
  region_id: number | null;
  step_id: number;
  percentage: number;
  planet_id: number;
  created_at: string;
};

export type RegionSplitFull = {
  id: number;
  region_id: number | null;
  step_id: number;
  percentage: number;
  planet_id: number;
  created_at: string;
};

export type Sector = {
  id: number;
  name: string;
};

export type DBObjectiveInsert = {
  assignmentId: number;
  planetId: number | null;
  factionId: number | null;
  enemyId: number | null;
  playerProgress: number;
  type: number;
  totalAmount: number | null;
  itemId: number | null;
  enemyProgress: number | null;
  stratagemId: number | null;
  difficulty: number | null;
  sectorId: number | null;
  objectiveIndex: number;
  last_updated: string;
  parsed_text: string;
};

export type DBObjective = {
  id: number;
  assignmentId: number;
  planetId: number | null;
  factionId: number | null;
  enemyId: number | null;
  playerProgress: number;
  type: number;
  totalAmount: number | null;
  itemId: number | null;
  enemyProgress: number | null;
  stratagemId: number | null;
  difficulty: number | null;
  sectorId: number | null;
  objectiveIndex: number;
  last_updated: string;
  parsed_text: string;
};

export type FullParsedAssignment = {
  brief: string | null;
  endDate: string;
  id: number;
  isMajorOrder: boolean;
  title: string | null;
  objective: DBObjective[];
  is_decision: boolean;
  is_active: boolean;
};

export type PlanetSnapshotInsert = {
  planetId: number;
  eventId: number | null;
  maxHealth: number;
  health: number;
  createdAt: string;
  regenPerSecond: number;
};

export type PlanetSnapshotFull = {
  id: number;
  planetId: number;
  eventId: number | null;
  maxHealth: number;
  health: number;
  createdAt: string;
  regenPerSecond: number;
};

export type RegionView = {
  region_id: number | null;
  region_name: string | null;
  planet_id: number | null;
  size: "Town" | "Settlement" | "City" | "MegaCity" | null;
  latest_region_regen: number | null;
  current_region_owner: number | null;
  planet_name: string | null;
  latest_planet_regen: number | null;
  current_planet_owner: number | null;
  region_player_count: number | null;
};

export type TableNames = keyof Database["public"]["Tables"];

export type DBPlanet = {
  id: number;
  name: string;
  disabled: boolean;
  sector: number;
  player_count: number;
  current_faction: number;
  latest_enemy: number | null;
  latest_regen: number;
  current_event: number | null;
};
