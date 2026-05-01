import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  classifyContent,
  filterActionListOutput,
  filterSectionedOutput,
  filterShortStatusOutput,
  generateText,
  MORE_DETAIL_EXISTING_OUTPUT_INSTRUCTION,
  SHORTER_EXISTING_OUTPUT_INSTRUCTION
} from "../lib/generate";

type FetchMock = ReturnType<typeof vi.fn>;

function createAnthropicResponse(text: string) {
  return {
    ok: true,
    json: async () => ({
      content: [
        {
          type: "text",
          text
        }
      ]
    })
  } as Response;
}

function createOpenAiResponse(payload: unknown) {
  return {
    ok: true,
    json: async () => payload
  } as Response;
}

function queueClassifierResponses(responses: Array<"DELIVERY" | "ADMIN">) {
  const fetchMock = global.fetch as unknown as FetchMock;

  for (const response of responses) {
    fetchMock.mockResolvedValueOnce(createAnthropicResponse(response));
  }
}

describe("classifyContent", () => {
  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = "test-anthropic-key";
    vi.stubGlobal("fetch", vi.fn());
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_MODEL;
  });

  it("returns true when the classifier responds DELIVERY", async () => {
    queueClassifierResponses(["DELIVERY"]);

    await expect(classifyContent("Confirm revised vendor delivery date")).resolves.toBe(true);
  });

  it("returns false when the classifier responds ADMIN", async () => {
    queueClassifierResponses(["ADMIN"]);

    await expect(classifyContent("Update the spreadsheet before Friday")).resolves.toBe(false);
  });

  it("retains content if classification fails", async () => {
    const fetchMock = global.fetch as unknown as FetchMock;
    fetchMock.mockRejectedValueOnce(new Error("network failure"));

    await expect(classifyContent("Update the spreadsheet before Friday")).resolves.toBe(true);
    expect(console.error).toHaveBeenCalled();
  });
});

describe("filterActionListOutput", () => {
  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = "test-anthropic-key";
    vi.stubGlobal("fetch", vi.fn());
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_MODEL;
  });

  it("removes admin actions and renumbers remaining delivery actions starting from 1", async () => {
    const output = [
      "1. Confirm revised vendor delivery date",
      "   Owner: PM",
      "   Priority: High",
      "",
      "2. Create a new folder for weekly reporting artefacts",
      "   Owner: PMO",
      "   Priority: Low",
      "",
      "3. Validate UAT readiness with QA lead",
      "   Owner: QA Lead",
      "   Priority: High"
    ].join("\n");

    queueClassifierResponses(["DELIVERY", "ADMIN", "DELIVERY"]);

    await expect(filterActionListOutput(output)).resolves.toBe(
      [
        "1. Confirm revised vendor delivery date",
        "   Owner: PM",
        "   Priority: High",
        "",
        "2. Validate UAT readiness with QA lead",
        "   Owner: QA Lead",
        "   Priority: High"
      ].join("\n")
    );
  });

  it("returns the exact empty state when only admin actions remain", async () => {
    const output = [
      "1. Update the spreadsheet with latest status",
      "   Owner: PMO",
      "   Priority: Medium",
      "",
      "2. Revisit and update status for older stories",
      "   Owner: Analyst",
      "   Priority: Low"
    ].join("\n");

    queueClassifierResponses(["ADMIN", "ADMIN"]);

    await expect(filterActionListOutput(output)).resolves.toBe(
      "No delivery actions identified from this input."
    );
  });

  it("keeps valid delivery actions unchanged apart from sequential numbering", async () => {
    const output = [
      "3. Confirm revised supplier date",
      "   Owner: PM",
      "   Priority: High",
      "",
      "9. Finalise cutover communications",
      "   Owner: Delivery Lead",
      "   Priority: Medium"
    ].join("\n");

    queueClassifierResponses(["DELIVERY", "DELIVERY"]);

    await expect(filterActionListOutput(output)).resolves.toBe(
      [
        "1. Confirm revised supplier date",
        "   Owner: PM",
        "   Priority: High",
        "",
        "2. Finalise cutover communications",
        "   Owner: Delivery Lead",
        "   Priority: Medium"
      ].join("\n")
    );
  });

  it("passes through the existing empty state string unchanged", async () => {
    await expect(filterActionListOutput("No delivery actions identified from this input.")).resolves.toBe(
      "No delivery actions identified from this input."
    );
  });

  it("does not remove valid delivery actions that mention reporting in a delivery context", async () => {
    const output = [
      "1. Confirm reporting date for UAT entry readiness",
      "   Owner: PM",
      "   Priority: Medium"
    ].join("\n");

    queueClassifierResponses(["DELIVERY"]);

    await expect(filterActionListOutput(output)).resolves.toBe(output);
  });

  it("always numbers the first retained action as 1 regardless of removed items", async () => {
    const output = [
      "4. Archive the old reporting pack",
      "   Owner: PMO",
      "   Priority: Low",
      "",
      "5. Confirm revised vendor delivery date",
      "   Owner: PM",
      "   Priority: High"
    ].join("\n");

    queueClassifierResponses(["ADMIN", "DELIVERY"]);

    const result = await filterActionListOutput(output);

    expect(result.startsWith("1.")).toBe(true);
    expect(result).not.toContain("2.");
  });

  it("retains content rather than removing it when classification throws", async () => {
    const output = [
      "1. Update the spreadsheet with latest status",
      "   Owner: PMO",
      "   Priority: Medium"
    ].join("\n");

    const fetchMock = global.fetch as unknown as FetchMock;
    fetchMock.mockRejectedValueOnce(new Error("classifier down"));

    await expect(filterActionListOutput(output)).resolves.toBe(output);
    expect(console.error).toHaveBeenCalled();
  });

  it("runs classification calls in parallel using Promise.all", async () => {
    const output = [
      "1. Confirm revised vendor delivery date",
      "   Owner: PM",
      "   Priority: High",
      "",
      "2. Create a new folder for weekly reporting artefacts",
      "   Owner: PMO",
      "   Priority: Low",
      "",
      "3. Validate UAT readiness with QA lead",
      "   Owner: QA Lead",
      "   Priority: High"
    ].join("\n");

    const deferredResponses: Array<{
      resolve: (value: Response) => void;
      promise: Promise<Response>;
    }> = [];
    const fetchMock = global.fetch as unknown as FetchMock;

    for (let index = 0; index < 3; index += 1) {
      let resolve!: (value: Response) => void;
      const promise = new Promise<Response>((innerResolve) => {
        resolve = innerResolve;
      });

      deferredResponses.push({ resolve, promise });
    }

    let callIndex = 0;
    fetchMock.mockImplementation(() => {
      const deferred = deferredResponses[callIndex];
      callIndex += 1;
      return deferred.promise;
    });

    const pendingResult = filterActionListOutput(output);

    expect(fetchMock).toHaveBeenCalledTimes(3);

    [
      createAnthropicResponse("DELIVERY"),
      createAnthropicResponse("ADMIN"),
      createAnthropicResponse("DELIVERY")
    ].forEach((response, index) => {
      deferredResponses[index]?.resolve(response);
    });

    await expect(pendingResult).resolves.toContain("1. Confirm revised vendor delivery date");
  });
});

describe("filterSectionedOutput", () => {
  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = "test-anthropic-key";
    vi.stubGlobal("fetch", vi.fn());
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_MODEL;
  });

  it("removes admin bullets and drops sections left empty after filtering", async () => {
    const output = [
      "Progress / Achievements",
      "",
      "- UAT entry criteria approved and cutover plan confirmed",
      "- Folder structure reviewed for the weekly reporting pack",
      "",
      "Upcoming Work",
      "",
      "- Confirm revised vendor delivery date",
      "",
      "Admin Notes",
      "",
      "- Update the spreadsheet before the PMO review"
    ].join("\n");

    queueClassifierResponses(["DELIVERY", "ADMIN", "DELIVERY", "ADMIN"]);

    await expect(filterSectionedOutput(output)).resolves.toBe(
      [
        "Progress / Achievements",
        "",
        "- UAT entry criteria approved and cutover plan confirmed",
        "",
        "Upcoming Work",
        "",
        "- Confirm revised vendor delivery date"
      ].join("\n")
    );
  });

  it("returns the exact empty state when only admin content remains", async () => {
    const output = [
      "Progress / Achievements",
      "",
      "- Folder structure reviewed for the new reporting pack",
      "",
      "Upcoming Work",
      "",
      "- Update the spreadsheet and revisit and update status"
    ].join("\n");

    queueClassifierResponses(["ADMIN", "ADMIN"]);

    await expect(filterSectionedOutput(output)).resolves.toBe(
      "No delivery content identified from this input."
    );
  });

  it("keeps valid delivery sectioned content unchanged", async () => {
    const output = [
      "Progress / Achievements",
      "",
      "- UAT entry criteria approved",
      "",
      "Upcoming Work",
      "",
      "- Confirm revised vendor delivery date"
    ].join("\n");

    queueClassifierResponses(["DELIVERY", "DELIVERY"]);

    await expect(filterSectionedOutput(output)).resolves.toBe(output);
  });

  it("passes through the existing empty state string unchanged", async () => {
    await expect(filterSectionedOutput("No delivery content identified from this input.")).resolves.toBe(
      "No delivery content identified from this input."
    );
  });

  it("does not remove valid delivery bullets that mention report in a delivery context", async () => {
    const output = [
      "Progress / Achievements",
      "",
      "- Progress report issued to steering committee with confirmed UAT milestone"
    ].join("\n");

    queueClassifierResponses(["DELIVERY"]);

    await expect(filterSectionedOutput(output)).resolves.toBe(output);
  });

  it("retains content when classification throws", async () => {
    const output = [
      "Progress / Achievements",
      "",
      "- Folder structure reviewed for the new reporting pack"
    ].join("\n");

    const fetchMock = global.fetch as unknown as FetchMock;
    fetchMock.mockRejectedValueOnce(new Error("classifier down"));

    await expect(filterSectionedOutput(output)).resolves.toBe(output);
    expect(console.error).toHaveBeenCalled();
  });
});

describe("filterShortStatusOutput", () => {
  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = "test-anthropic-key";
    vi.stubGlobal("fetch", vi.fn());
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_MODEL;
  });

  it("removes admin sentences and rejoins the remaining delivery status coherently", async () => {
    const output = [
      "UAT entry criteria were approved and the cutover plan remains on track.",
      "Folder structure updates are still needed for the weekly reporting pack.",
      "Focus this week is on confirming the revised vendor delivery date."
    ].join(" ");

    queueClassifierResponses(["DELIVERY", "ADMIN", "DELIVERY"]);

    await expect(filterShortStatusOutput(output)).resolves.toBe(
      "UAT entry criteria were approved and the cutover plan remains on track. Focus this week is on confirming the revised vendor delivery date."
    );
  });

  it("returns the exact empty state when only admin sentences remain", async () => {
    const output =
      "Folder structure updates are still needed for the weekly reporting pack. The team will update the spreadsheet before the PMO review.";

    queueClassifierResponses(["ADMIN", "ADMIN"]);

    await expect(filterShortStatusOutput(output)).resolves.toBe(
      "No delivery content identified from this input."
    );
  });

  it("keeps valid delivery short status output unchanged", async () => {
    const output =
      "UAT entry criteria were approved and the cutover plan remains on track. Focus this week is on confirming the revised vendor delivery date.";

    queueClassifierResponses(["DELIVERY", "DELIVERY"]);

    await expect(filterShortStatusOutput(output)).resolves.toBe(output);
  });

  it("passes through the existing empty state string unchanged", async () => {
    await expect(filterShortStatusOutput("No delivery content identified from this input.")).resolves.toBe(
      "No delivery content identified from this input."
    );
  });

  it("retains content when classification throws", async () => {
    const output =
      "Folder structure updates are still needed for the weekly reporting pack. The team will update the spreadsheet before the PMO review.";

    const fetchMock = global.fetch as unknown as FetchMock;
    fetchMock.mockRejectedValueOnce(new Error("classifier down"));

    await expect(filterShortStatusOutput(output)).resolves.toBe(output);
    expect(console.error).toHaveBeenCalled();
  });
});

describe("generateText length adjustment source", () => {
  beforeEach(() => {
    process.env.OPENAI_API_KEY = "test-openai-key";
    process.env.ANTHROPIC_API_KEY = "test-anthropic-key";
    vi.stubGlobal("fetch", vi.fn());
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_MODEL;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_MODEL;
  });

  it("uses current output as the source when shortening existing output", async () => {
    const fetchMock = global.fetch as unknown as FetchMock;
    fetchMock.mockResolvedValueOnce(
      createOpenAiResponse({
        output_text: "Shortened weekly update."
      })
    );
    fetchMock.mockResolvedValueOnce(createAnthropicResponse("DELIVERY"));

    await generateText({
      transcript: "Original transcript content that should not be reused directly.",
      currentOutput: "Current displayed output with three sentences.",
      lengthInstruction: SHORTER_EXISTING_OUTPUT_INSTRUCTION,
      outputType: "short-status-update"
    });

    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const requestBody = JSON.parse(requestInit.body as string) as { input: string };

    expect(requestBody.input).toContain("Current displayed output with three sentences.");
    expect(requestBody.input).not.toContain(
      "Original transcript content that should not be reused directly."
    );
    expect(requestBody.input).toContain(SHORTER_EXISTING_OUTPUT_INSTRUCTION);
  });

  it("uses current output as the source when expanding an already shortened output", async () => {
    const fetchMock = global.fetch as unknown as FetchMock;
    fetchMock.mockResolvedValueOnce(
      createOpenAiResponse({
        output_text: "Expanded weekly update with more detail."
      })
    );
    fetchMock.mockResolvedValueOnce(createAnthropicResponse("DELIVERY"));

    await generateText({
      transcript: "Original transcript content that should remain unused for this adjustment.",
      currentOutput: "Shortened output.",
      lengthInstruction: MORE_DETAIL_EXISTING_OUTPUT_INSTRUCTION,
      outputType: "short-status-update"
    });

    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const requestBody = JSON.parse(requestInit.body as string) as { input: string };

    expect(requestBody.input).toContain("Shortened output.");
    expect(requestBody.input).not.toContain(
      "Original transcript content that should remain unused for this adjustment."
    );
    expect(requestBody.input).toContain(MORE_DETAIL_EXISTING_OUTPUT_INSTRUCTION);
  });
});
