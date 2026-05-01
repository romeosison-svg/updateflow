import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ADMIN_INDICATORS, generateText } from "../lib/generate";

type PipelineParams = {
  transcript: string;
  outputType: "action-list" | "stakeholder-update" | "short-status-update";
  rawModelOutput: string;
  audience?: "internal" | "external";
};

type FetchMock = ReturnType<typeof vi.fn>;

function createJsonResponse(payload: unknown) {
  return {
    ok: true,
    json: async () => payload
  } as Response;
}

async function runPipeline({
  transcript,
  outputType,
  rawModelOutput,
  audience
}: PipelineParams) {
  const fetchMock = global.fetch as unknown as FetchMock;

  fetchMock.mockResolvedValueOnce(
    createJsonResponse({
      output_text: rawModelOutput
    })
  );

  const result = await generateText({
    transcript,
    outputType,
    audience
  });

  const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
  const requestBody =
    typeof requestInit?.body === "string"
      ? (JSON.parse(requestInit.body) as { input?: string })
      : {};

  return {
    result,
    requestInput: requestBody.input ?? ""
  };
}

describe("generateText post-output filter pipeline", () => {
  beforeEach(() => {
    process.env.OPENAI_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_MODEL;
  });

  it("Scenario 1 - filters admin content from action list output and renumbers remaining actions", async () => {
    const transcript = [
      "PM to confirm revised vendor date.",
      "Create a new folder for the weekly reporting pack.",
      "QA lead to validate UAT readiness.",
      "Update the spreadsheet before Friday."
    ].join(" ");

    const rawModelOutput = [
      "1. Confirm revised vendor delivery date",
      "   Owner: PM",
      "   Priority: High",
      "",
      "2. Create a new folder for the weekly reporting pack",
      "   Owner: PMO",
      "   Priority: Low",
      "",
      "3. Validate UAT readiness with QA lead",
      "   Owner: QA Lead",
      "   Priority: High",
      "",
      "4. Update the spreadsheet before Friday",
      "   Owner: PMO",
      "   Priority: Medium"
    ].join("\n");

    const { result, requestInput } = await runPipeline({
      transcript,
      outputType: "action-list",
      rawModelOutput
    });

    expect(requestInput).toContain("Meeting transcript:");
    expect(requestInput).toContain("PM to confirm revised vendor date.");
    expect(result).toContain("1. Confirm revised vendor delivery date");
    expect(result).toContain("2. Validate UAT readiness with QA lead");
    expect(result).not.toContain("Create a new folder");
    expect(result).not.toContain("Update the spreadsheet");
    expect(result).not.toContain("3.");
    expect(result).not.toContain("4.");
  });

  it("Scenario 2 - filters admin bullets from internal stakeholder update and removes emptied sections", async () => {
    const transcript = [
      "UAT entry criteria approved and cutover plan confirmed.",
      "Reporting process updated for the PMO pack.",
      "Folder structure changes discussed for weekly status storage.",
      "Vendor delivery remains outstanding and threatens integration testing."
    ].join(" ");

    const rawModelOutput = [
      "Progress / Achievements",
      "",
      "- UAT entry criteria approved and cutover plan confirmed",
      "- Reporting process updated for the PMO pack",
      "",
      "Key Risks / Issues",
      "",
      "- Vendor delivery remains outstanding and threatens integration testing",
      "",
      "Upcoming Work",
      "",
      "- Folder structure changes to be agreed for the weekly status pack"
    ].join("\n");

    const { result } = await runPipeline({
      transcript,
      outputType: "stakeholder-update",
      audience: "internal",
      rawModelOutput
    });

    expect(result).toContain("Progress / Achievements");
    expect(result).toContain("- UAT entry criteria approved and cutover plan confirmed");
    expect(result).toContain("Key Risks / Issues");
    expect(result).toContain(
      "- Vendor delivery remains outstanding and threatens integration testing"
    );
    expect(result).not.toContain("Reporting process updated for the PMO pack");
    expect(result).not.toContain("Folder structure changes to be agreed");
    expect(result).not.toContain("Upcoming Work");
  });

  it("Scenario 3 - filters admin bullets from external stakeholder update and removes emptied sections", async () => {
    const transcript = [
      "UAT entry criteria approved and cutover plan confirmed.",
      "Reporting process updated for the PMO pack.",
      "Folder structure changes discussed for weekly status storage.",
      "Vendor delivery remains outstanding and threatens integration testing."
    ].join(" ");

    const rawModelOutput = [
      "Progress / Achievements",
      "",
      "- UAT entry criteria approved and cutover plan confirmed",
      "- Reporting process updated for the PMO pack",
      "",
      "Key Risks",
      "",
      "- Vendor delivery remains outstanding and threatens integration testing",
      "",
      "Upcoming Work",
      "",
      "- Folder structure changes to be agreed for the weekly status pack"
    ].join("\n");

    const { result } = await runPipeline({
      transcript,
      outputType: "stakeholder-update",
      audience: "external",
      rawModelOutput
    });

    expect(result).toContain("Progress / Achievements");
    expect(result).toContain("Key Risks");
    expect(result).toContain("- UAT entry criteria approved and cutover plan confirmed");
    expect(result).toContain(
      "- Vendor delivery remains outstanding and threatens integration testing"
    );
    expect(result).not.toContain("Reporting process updated for the PMO pack");
    expect(result).not.toContain("Folder structure changes to be agreed");
    expect(result).not.toContain("Upcoming Work");
  });

  it("Scenario 4 - filters admin sentences from short status output and keeps a coherent paragraph", async () => {
    const transcript =
      "UAT entry criteria were approved. Update the spreadsheet before the PMO review.";

    const rawModelOutput =
      "UAT entry criteria were approved and the cutover plan remains on track. Update the spreadsheet before the PMO review.";

    const { result } = await runPipeline({
      transcript,
      outputType: "short-status-update",
      rawModelOutput
    });

    expect(result).toBe(
      "UAT entry criteria were approved and the cutover plan remains on track."
    );
    expect(result).not.toContain("Update the spreadsheet");
  });

  it("Scenario 5 - returns the exact empty state for action list when only admin content remains", async () => {
    const transcript =
      "Create a folder for the reporting pack and update the spreadsheet before Friday.";

    const rawModelOutput = [
      "1. Create a folder for the reporting pack",
      "   Owner: PMO",
      "   Priority: Low",
      "",
      "2. Update the spreadsheet before Friday",
      "   Owner: PMO",
      "   Priority: Medium"
    ].join("\n");

    const { result } = await runPipeline({
      transcript,
      outputType: "action-list",
      rawModelOutput
    });

    expect(result).toBe("No delivery actions identified from this input.");
  });

  it("Scenario 6 - returns the exact empty state for internal stakeholder update when only admin content remains", async () => {
    const transcript =
      "Folder structure reviewed and housekeeping for the PMO pack confirmed.";

    const rawModelOutput = [
      "Progress / Achievements",
      "",
      "- Folder structure reviewed for the weekly reporting pack",
      "",
      "Upcoming Work",
      "",
      "- Housekeeping updates to be completed before Tuesday"
    ].join("\n");

    const { result } = await runPipeline({
      transcript,
      outputType: "stakeholder-update",
      audience: "internal",
      rawModelOutput
    });

    expect(result).toBe("No delivery content identified from this input.");
  });

  it("Scenario 7 - returns the exact empty state for external stakeholder update when only admin content remains", async () => {
    const transcript =
      "Folder structure reviewed and housekeeping for the PMO pack confirmed.";

    const rawModelOutput = [
      "Progress / Achievements",
      "",
      "- Folder structure reviewed for the weekly reporting pack",
      "",
      "Upcoming Work",
      "",
      "- Housekeeping updates to be completed before Tuesday"
    ].join("\n");

    const { result } = await runPipeline({
      transcript,
      outputType: "stakeholder-update",
      audience: "external",
      rawModelOutput
    });

    expect(result).toBe("No delivery content identified from this input.");
  });

  it("Scenario 8 - returns the exact empty state for short status update when only admin content remains", async () => {
    const transcript =
      "Housekeeping continues and the team will update the spreadsheet before the PMO review.";

    const rawModelOutput =
      "Housekeeping continues and the team will update the spreadsheet before the PMO review.";

    const { result } = await runPipeline({
      transcript,
      outputType: "short-status-update",
      rawModelOutput
    });

    expect(result).toBe("No delivery content identified from this input.");
  });

  it("Scenario 9 - keeps reporting references that are valid delivery context", async () => {
    const transcript =
      "Confirm reporting date for UAT sign-off and note that the progress report was issued to the steering committee.";

    const actionOutput = [
      "1. Confirm reporting date for UAT sign-off",
      "   Owner: PM",
      "   Priority: High"
    ].join("\n");

    const sectionedOutput = [
      "Progress / Achievements",
      "",
      "- Progress report issued to steering committee with confirmed UAT milestone"
    ].join("\n");

    const actionResult = await runPipeline({
      transcript,
      outputType: "action-list",
      rawModelOutput: actionOutput
    });
    const stakeholderResult = await runPipeline({
      transcript,
      outputType: "stakeholder-update",
      audience: "internal",
      rawModelOutput: sectionedOutput
    });

    expect(actionResult.result).toContain("Confirm reporting date for UAT sign-off");
    expect(stakeholderResult.result).toContain(
      "Progress report issued to steering committee with confirmed UAT milestone"
    );
  });

  it("Scenario 10 - keeps sheet and spreadsheet references that are valid delivery context", async () => {
    const transcript =
      "Project tracker spreadsheet shows the UAT dependency closing on Wednesday and the delivery dashboard sheet confirms cutover readiness.";

    const rawModelOutput = [
      "Progress / Achievements",
      "",
      "- Project tracker spreadsheet shows the UAT dependency closing on Wednesday",
      "- Delivery dashboard sheet confirms cutover readiness"
    ].join("\n");

    const { result } = await runPipeline({
      transcript,
      outputType: "stakeholder-update",
      audience: "internal",
      rawModelOutput
    });

    expect(result).toContain(
      "Project tracker spreadsheet shows the UAT dependency closing on Wednesday"
    );
    expect(result).toContain("Delivery dashboard sheet confirms cutover readiness");
  });

  it("Scenario 11 - ADMIN_INDICATORS is importable and extending it changes filter behaviour without logic edits", async () => {
    const customIndicator = "weekly board refresh";
    const mutableIndicators = ADMIN_INDICATORS as unknown as string[];

    mutableIndicators.push(customIndicator);

    try {
      const transcript = "Weekly board refresh completed and vendor delivery date still needs confirmation.";
      const rawModelOutput = [
        "1. Weekly board refresh completed",
        "   Owner: PMO",
        "   Priority: Low",
        "",
        "2. Confirm revised vendor delivery date",
        "   Owner: PM",
        "   Priority: High"
      ].join("\n");

      const { result } = await runPipeline({
        transcript,
        outputType: "action-list",
        rawModelOutput
      });

      expect(ADMIN_INDICATORS).toContain(customIndicator);
      expect(result).toContain("1. Confirm revised vendor delivery date");
      expect(result).not.toContain("Weekly board refresh completed");
    } finally {
      mutableIndicators.pop();
    }
  });

  it("Scenario 12 - renumbers retained actions sequentially after filtering out admin items", async () => {
    const transcript = [
      "Confirm revised vendor delivery date.",
      "Create a new folder for the reporting pack.",
      "Validate UAT readiness.",
      "Update the spreadsheet.",
      "Finalise cutover communications."
    ].join(" ");

    const rawModelOutput = [
      "1. Confirm revised vendor delivery date",
      "   Owner: PM",
      "   Priority: High",
      "",
      "2. Create a new folder for the reporting pack",
      "   Owner: PMO",
      "   Priority: Low",
      "",
      "3. Validate UAT readiness with QA lead",
      "   Owner: QA Lead",
      "   Priority: High",
      "",
      "4. Update the spreadsheet",
      "   Owner: PMO",
      "   Priority: Medium",
      "",
      "5. Finalise cutover communications",
      "   Owner: Delivery Lead",
      "   Priority: Medium"
    ].join("\n");

    const { result } = await runPipeline({
      transcript,
      outputType: "action-list",
      rawModelOutput
    });

    expect(result).toContain("1. Confirm revised vendor delivery date");
    expect(result).toContain("2. Validate UAT readiness with QA lead");
    expect(result).toContain("3. Finalise cutover communications");
    expect(result).not.toContain("4.");
    expect(result).not.toContain("5.");
  });

  it("Scenario 13 - full pipeline regression works across all four output types", async () => {
    const transcript = [
      "Sam is leaving the team next Friday.",
      "Folder structure changes are still needed for the reporting pack.",
      "UAT entry criteria were approved and cutover remains on track for 12th May.",
      "Vendor delivery remains outstanding and threatens integration testing.",
      "The steering group discussed moving go-live into July but no conclusion was reached.",
      "PM to confirm revised vendor delivery date."
    ].join(" ");

    const actionListOutput = [
      "1. Create a new folder for the reporting pack",
      "   Owner: PMO",
      "   Priority: Low",
      "",
      "2. Confirm revised vendor delivery date",
      "   Owner: PM",
      "   Priority: High"
    ].join("\n");
    const internalOutput = [
      "Progress / Achievements",
      "",
      "- UAT entry criteria were approved and cutover remains on track for 12th May",
      "",
      "Key Risks / Issues",
      "",
      "- Vendor delivery remains outstanding and threatens integration testing",
      "- Folder structure changes are still needed for the reporting pack",
      "",
      "Decisions Required",
      "",
      "- Agree whether to move go-live into July"
    ].join("\n");
    const externalOutput = [
      "Progress / Achievements",
      "",
      "- UAT entry criteria were approved and cutover remains on track for 12th May",
      "",
      "Key Risks",
      "",
      "- Vendor delivery remains outstanding and threatens integration testing",
      "",
      "Upcoming Work",
      "",
      "- Folder structure changes are still needed for the reporting pack"
    ].join("\n");
    const shortStatusOutput =
      "UAT entry criteria were approved and cutover remains on track for 12th May. Folder structure changes are still needed for the reporting pack. Vendor delivery remains outstanding and threatens integration testing.";

    const actionResult = await runPipeline({
      transcript,
      outputType: "action-list",
      rawModelOutput: actionListOutput
    });
    const internalResult = await runPipeline({
      transcript,
      outputType: "stakeholder-update",
      audience: "internal",
      rawModelOutput: internalOutput
    });
    const externalResult = await runPipeline({
      transcript,
      outputType: "stakeholder-update",
      audience: "external",
      rawModelOutput: externalOutput
    });
    const statusResult = await runPipeline({
      transcript,
      outputType: "short-status-update",
      rawModelOutput: shortStatusOutput
    });

    expect(actionResult.requestInput).toContain("RELEVANCE FILTER:");
    expect(actionResult.requestInput).toContain("Sam is leaving the team next Friday.");
    expect(actionResult.result).toBe(
      [
        "1. Confirm revised vendor delivery date",
        "   Owner: PM",
        "   Priority: High"
      ].join("\n")
    );

    expect(internalResult.result).toContain(
      "- UAT entry criteria were approved and cutover remains on track for 12th May"
    );
    expect(internalResult.result).toContain("- Agree whether to move go-live into July");
    expect(internalResult.result).not.toContain("Sam is leaving the team");
    expect(internalResult.result).not.toContain("Folder structure changes");

    expect(externalResult.result).toContain(
      "- UAT entry criteria were approved and cutover remains on track for 12th May"
    );
    expect(externalResult.result).toContain(
      "- Vendor delivery remains outstanding and threatens integration testing"
    );
    expect(externalResult.result).not.toContain("Sam is leaving the team");
    expect(externalResult.result).not.toContain("Folder structure changes");

    expect(statusResult.result).toContain(
      "UAT entry criteria were approved and cutover remains on track for 12th May."
    );
    expect(statusResult.result).toContain(
      "Vendor delivery remains outstanding and threatens integration testing."
    );
    expect(statusResult.result).not.toContain("Folder structure changes");
  });
});
