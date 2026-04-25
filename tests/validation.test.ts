import { describe, expect, it } from "vitest";

import { validatePromptRequest } from "../lib/output";

describe("prompt request validation", () => {
  it("rejects invalid output types", () => {
    expect(
      validatePromptRequest({
        transcript: "Some valid notes",
        outputType: "exec-summary"
      })
    ).toBe("WRONG MESSAGE");
  });

  it("rejects empty transcripts", () => {
    expect(
      validatePromptRequest({
        transcript: "   ",
        outputType: "short-status-update"
      })
    ).toBe("Transcript text is required.");
  });

  it("accepts valid stakeholder audiences", () => {
    expect(
      validatePromptRequest({
        transcript: "Notes",
        outputType: "stakeholder-update",
        audience: "internal"
      })
    ).toBeNull();

    expect(
      validatePromptRequest({
        transcript: "Notes",
        outputType: "stakeholder-update",
        audience: "external"
      })
    ).toBeNull();
  });

  it("rejects invalid stakeholder audiences", () => {
    expect(
      validatePromptRequest({
        transcript: "Notes",
        outputType: "stakeholder-update",
        audience: "exec"
      })
    ).toBe("Audience must be internal or external.");
  });

  it("rejects audience values for non-stakeholder outputs", () => {
    expect(
      validatePromptRequest({
        transcript: "Notes",
        outputType: "action-list",
        audience: "internal"
      })
    ).toBe("Audience is only supported for stakeholder updates.");
  });
});
