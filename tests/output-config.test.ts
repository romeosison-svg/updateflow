import { describe, expect, it } from "vitest";

import {
  AVAILABLE_OUTPUT_TYPES,
  DEFAULT_OUTPUT_CONFIG,
  OPTIONAL_OUTPUT_CONFIG
} from "../lib/output";

describe("output configuration", () => {
  it("keeps the default outputs limited to Weekly Update", () => {
    expect(DEFAULT_OUTPUT_CONFIG).toEqual([
      {
        key: "shortStatus",
        outputType: "short-status-update",
        title: "Weekly Update"
      }
    ]);
  });

  it("keeps Action List, Internal Stakeholder Update, External Stakeholder Update, and RAID as optional outputs", () => {
    expect(OPTIONAL_OUTPUT_CONFIG).toEqual([
      {
        key: "actionList",
        outputType: "action-list",
        title: "Action List"
      },
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
    ]);
  });

  it("does not expose Exec Summary as an available output type", () => {
    expect(AVAILABLE_OUTPUT_TYPES).not.toContain("exec-summary");
    expect(DEFAULT_OUTPUT_CONFIG.some((output) => output.title.includes("Exec Summary"))).toBe(false);
    expect(OPTIONAL_OUTPUT_CONFIG.some((output) => output.title.includes("Exec Summary"))).toBe(false);
  });
});
