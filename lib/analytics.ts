import type { OutputCardKey } from "@/lib/output";

export const SHORTER_LENGTH_INSTRUCTION =
  "Make the output shorter. Aim for 1-2 tight sentences maximum.";

export const MORE_DETAIL_LENGTH_INSTRUCTION =
  "Expand the output slightly. Aim for 3-4 sentences. Add more specific delivery context where it is clearly supported by the input.";

export function getPostHogInitOptions(apiHost?: string) {
  return {
    api_host: apiHost,
    person_profiles: "identified_only" as const,
    capture_pageview: false,
    capture_pageleave: true
  };
}

export function capturePostHogPageView(
  pathname: string | null,
  posthog: { capture: (event: string) => void } | null
) {
  if (!pathname || !posthog) {
    return;
  }

  posthog.capture("$pageview");
}

export function getAddToPackAnalyticsType(
  key: Extract<OutputCardKey, "actionList" | "externalUpdate" | "internalUpdate" | "raid">
) {
  switch (key) {
    case "actionList":
      return "action_list";
    case "internalUpdate":
      return "internal_update";
    case "externalUpdate":
      return "external_update";
    case "raid":
      return "raid_log";
  }
}

export function getCopiedOutputAnalyticsType(key: OutputCardKey) {
  switch (key) {
    case "shortStatus":
      return "weekly_update";
    case "actionList":
      return "action_list";
    case "internalUpdate":
      return "internal_update";
    case "externalUpdate":
      return "external_update";
    case "raid":
      return "raid_log";
  }
}
