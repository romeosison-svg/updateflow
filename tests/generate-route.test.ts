import { beforeEach, describe, expect, it, vi } from "vitest";

const { generateText } = vi.hoisted(() => ({
  generateText: vi.fn()
}));

vi.mock("../lib/generate", async () => {
  const actual = await vi.importActual<typeof import("../lib/generate")>("../lib/generate");

  return {
    ...actual,
    generateText
  };
});

import { POST } from "../app/api/generate/route";
import {
  MORE_DETAIL_EXISTING_OUTPUT_INSTRUCTION,
  SHORTER_EXISTING_OUTPUT_INSTRUCTION
} from "../lib/generate";

describe("generate route length adjustment flow", () => {
  beforeEach(() => {
    generateText.mockReset();
    generateText.mockResolvedValue("Generated weekly update");
  });

  it("passes shorter adjustments through to generateText using current output", async () => {
    const response = await POST(
      new Request("http://localhost/api/generate", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          transcript: "Original transcript text",
          currentOutput: "Shortened weekly update",
          adjustmentDirection: "shorter"
        })
      })
    );

    expect(response.status).toBe(200);
    expect(generateText).toHaveBeenCalledWith({
      deliveryOnly: false,
      transcript: "Original transcript text",
      currentOutput: "Shortened weekly update",
      lengthInstruction: SHORTER_EXISTING_OUTPUT_INSTRUCTION,
      outputType: "short-status-update"
    });
  });

  it("passes more-detail adjustments through to generateText using current output", async () => {
    const response = await POST(
      new Request("http://localhost/api/generate", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          transcript: "Original transcript text",
          currentOutput: "Expanded weekly update",
          adjustmentDirection: "more_detail"
        })
      })
    );

    expect(response.status).toBe(200);
    expect(generateText).toHaveBeenCalledWith({
      deliveryOnly: false,
      transcript: "Original transcript text",
      currentOutput: "Expanded weekly update",
      lengthInstruction: MORE_DETAIL_EXISTING_OUTPUT_INSTRUCTION,
      outputType: "short-status-update"
    });
  });

  it("regenerates from the original transcript when current output is absent", async () => {
    const response = await POST(
      new Request("http://localhost/api/generate", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          transcript: "Original transcript text"
        })
      })
    );

    expect(response.status).toBe(200);
    expect(generateText).toHaveBeenCalledWith({
      deliveryOnly: false,
      transcript: "Original transcript text",
      currentOutput: undefined,
      lengthInstruction: undefined,
      outputType: "short-status-update"
    });
  });

  it("returns the generated weekly update in outputs", async () => {
    generateText.mockResolvedValueOnce("Tight weekly update");

    const response = await POST(
      new Request("http://localhost/api/generate", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          transcript: "Original transcript text"
        })
      })
    );

    await expect(response.json()).resolves.toEqual({
      outputs: {
        shortStatus: "Tight weekly update"
      }
    });
  });

  it("normalises deliveryOnly true and forwards it for action list generation", async () => {
    const response = await POST(
      new Request("http://localhost/api/generate", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          transcript: "Original transcript text",
          outputType: "action-list",
          deliveryOnly: true
        })
      })
    );

    expect(response.status).toBe(200);
    expect(generateText).toHaveBeenCalledWith({
      deliveryOnly: true,
      transcript: "Original transcript text",
      outputType: "action-list"
    });
  });

  it("defaults missing deliveryOnly to false when forwarding short status generation", async () => {
    const response = await POST(
      new Request("http://localhost/api/generate", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          transcript: "Original transcript text"
        })
      })
    );

    expect(response.status).toBe(200);
    expect(generateText).toHaveBeenCalledWith({
      deliveryOnly: false,
      transcript: "Original transcript text",
      currentOutput: undefined,
      lengthInstruction: undefined,
      outputType: "short-status-update"
    });
  });

  it("uses strict body.deliveryOnly === true normalisation", async () => {
    const response = await POST(
      new Request("http://localhost/api/generate", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          transcript: "Original transcript text",
          includeInternal: true,
          deliveryOnly: "true"
        })
      })
    );

    expect(response.status).toBe(200);
    expect(generateText).toHaveBeenCalledWith({
      deliveryOnly: false,
      transcript: "Original transcript text",
      outputType: "stakeholder-update",
      audience: "internal"
    });
  });
});
