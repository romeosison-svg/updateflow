import { describe, expect, it } from "vitest";

import {
  buildWeeklyUpdateRequestBody,
  getLengthAdjustedEventPayload,
  LENGTH_ADJUSTED_EVENT,
  RESET_TO_DEFAULT_EVENT
} from "../app/app/page";

describe("tool page weekly update helpers", () => {
  it("builds a shorter adjustment request using the current displayed output", () => {
    expect(
      buildWeeklyUpdateRequestBody({
        transcript: "Original transcript content",
        currentOutput: "Current displayed weekly update",
        adjustmentDirection: "shorter"
      })
    ).toEqual({
      transcript: "Original transcript content",
      currentOutput: "Current displayed weekly update",
      adjustmentDirection: "shorter"
    });
  });

  it("builds a more-detail request from the shortened current output rather than the original transcript", () => {
    expect(
      buildWeeklyUpdateRequestBody({
        transcript: "Long original transcript",
        currentOutput: "Shortened output",
        adjustmentDirection: "more_detail"
      })
    ).toEqual({
      transcript: "Long original transcript",
      currentOutput: "Shortened output",
      adjustmentDirection: "more_detail"
    });
  });

  it("builds a reset-to-default request from the original transcript only", () => {
    expect(
      buildWeeklyUpdateRequestBody({
        transcript: "Original transcript content"
      })
    ).toEqual({
      transcript: "Original transcript content"
    });
  });

  it("keeps the length_adjusted event payload direction stable", () => {
    expect(LENGTH_ADJUSTED_EVENT).toBe("length_adjusted");
    expect(getLengthAdjustedEventPayload("shorter")).toEqual({
      direction: "shorter"
    });
    expect(getLengthAdjustedEventPayload("more_detail")).toEqual({
      direction: "more_detail"
    });
  });

  it("keeps the reset_to_default event name stable", () => {
    expect(RESET_TO_DEFAULT_EVENT).toBe("reset_to_default");
  });
});
