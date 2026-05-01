import { describe, expect, it } from "vitest";

import {
  getLengthInstructionForAdjustmentDirection,
  getShortStatusGenerationParams
} from "../app/api/generate/route";
import {
  MORE_DETAIL_EXISTING_OUTPUT_INSTRUCTION,
  SHORTER_EXISTING_OUTPUT_INSTRUCTION
} from "../lib/generate";

describe("generate route length adjustment helpers", () => {
  it("maps shorter adjustments to the shorter existing-output instruction", () => {
    expect(getLengthInstructionForAdjustmentDirection("shorter")).toBe(
      SHORTER_EXISTING_OUTPUT_INSTRUCTION
    );
  });

  it("maps more detail adjustments to the more-detail existing-output instruction", () => {
    expect(getLengthInstructionForAdjustmentDirection("more_detail")).toBe(
      MORE_DETAIL_EXISTING_OUTPUT_INSTRUCTION
    );
  });

  it("builds short status params using current output when provided", () => {
    expect(
      getShortStatusGenerationParams({
        transcript: "Original transcript text",
        currentOutput: "Shortened weekly update",
        adjustmentDirection: "shorter"
      })
    ).toEqual({
      transcript: "Original transcript text",
      currentOutput: "Shortened weekly update",
      lengthInstruction: SHORTER_EXISTING_OUTPUT_INSTRUCTION,
      outputType: "short-status-update"
    });
  });

  it("builds reset params from the original transcript when current output is absent", () => {
    expect(
      getShortStatusGenerationParams({
        transcript: "Original transcript text"
      })
    ).toEqual({
      transcript: "Original transcript text",
      currentOutput: undefined,
      lengthInstruction: undefined,
      outputType: "short-status-update"
    });
  });
});
