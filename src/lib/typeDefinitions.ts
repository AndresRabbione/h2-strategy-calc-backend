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
