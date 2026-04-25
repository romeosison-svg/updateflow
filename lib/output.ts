export const AVAILABLE_OUTPUT_TYPES = [
  "raid-log",
  "stakeholder-update",
  "action-list",
  "short-status-update"
] as const;

export type OutputType = (typeof AVAILABLE_OUTPUT_TYPES)[number];

export const AVAILABLE_AUDIENCES = ["internal", "external"] as const;

export type Audience = (typeof AVAILABLE_AUDIENCES)[number];

export const DEFAULT_OUTPUT_CONFIG = [
  {
    key: "shortStatus",
    outputType: "short-status-update",
    title: "Status Update"
  },
  {
    key: "actionList",
    outputType: "action-list",
    title: "Action List"
  }
] as const;

export const OPTIONAL_OUTPUT_CONFIG = [
  {
    key: "internalUpdate",
    outputType: "stakeholder-update",
    audience: "internal",
    title: "Internal Stakeholder Update"
  },
  {
    key: "externalUpdate",
    outputType: "stakeholder-update",
    audience: "external",
    title: "External Stakeholder Update"
  },
  {
    key: "raid",
    outputType: "raid-log",
    title: "RAID"
  }
] as const;

export type OutputCardKey =
  | "internalUpdate"
  | "externalUpdate"
  | "shortStatus"
  | "actionList"
  | "raid";

export type GeneratedOutputs = Partial<Record<OutputCardKey, string>>;

export type RaidOutput = {
  raid: string;
};

type PromptValidationInput = {
  audience?: string;
  outputType: string;
  transcript: string;
};

export function isOutputType(value: string): value is OutputType {
  return AVAILABLE_OUTPUT_TYPES.includes(value as OutputType);
}

export function isAudience(value: string): value is Audience {
  return AVAILABLE_AUDIENCES.includes(value as Audience);
}

export function validatePromptRequest({
  transcript,
  outputType,
  audience
}: PromptValidationInput): string | null {
  if (!transcript.trim()) {
    return "Transcript text is required.";
  }

  if (!isOutputType(outputType)) {
    return "Output type is invalid.";
  }

  if (outputType === "stakeholder-update") {
    if (!audience) {
      return "Audience is required for stakeholder updates.";
    }

    if (!isAudience(audience)) {
      return "Audience must be internal or external.";
    }

    return null;
  }

  if (audience) {
    return "Audience is only supported for stakeholder updates.";
  }

  return null;
}
