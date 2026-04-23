export type OutputType =
  | "raid-log"
  | "stakeholder-update"
  | "action-list"
  | "short-status-update";

export type Audience = "internal" | "external";

export type OutputCardKey =
  | "internalUpdate"
  | "externalUpdate"
  | "shortStatus"
  | "actionList";

export type GeneratedOutputs = Record<OutputCardKey, string>;

export type RaidOutput = {
  raid: string;
};
