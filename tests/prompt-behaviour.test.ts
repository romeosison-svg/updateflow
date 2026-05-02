import { describe, expect, it } from "vitest";

import { buildGenerationPrompt } from "../lib/prompts";

describe("Status Update prompt behaviour", () => {
  const prompt = buildGenerationPrompt({
    transcript: "Vendor delivery remains outstanding. Focus this week is on confirming dates.",
    outputType: "short-status-update"
  });

  it("requires a concise 2-3 sentence output", () => {
    expect(prompt).toContain("Produce a 2-3 sentence update");
    expect(prompt).toContain("Output must be exactly 2 to 3 sentences. No exceptions.");
    expect(prompt).toContain("Never exceed 3 sentences regardless of the volume or complexity of the input");
  });

  it("blocks speculative impact and over-inference", () => {
    expect(prompt).toContain("Do not introduce impact, risk, or consequences unless they are explicitly stated or clearly unavoidable");
    expect(prompt).toContain("Do not infer timeline impact, delivery risk, or causal relationships unless they are directly supported by the input");
  });

  it("preserves the strength and intent of the source language", () => {
    expect(prompt).toContain("Preserve the original level of certainty and obligation from the input");
    expect(prompt).toContain("Keep wording aligned with the original intent of the source");
  });

  it("biases toward compression when the source is already concise", () => {
    expect(prompt).toContain("If the input is already concise, match or reduce its length");
    expect(prompt).toContain("A 2 sentence output is acceptable and often preferable to a padded 3 sentence output");
  });

  it("prepends the relevance filter before the rest of the prompt wrapper", () => {
    expect(prompt).toContain("RELEVANCE FILTER:");
    expect(prompt).toContain("Step 1: Filter the input before doing anything else.");
    expect(prompt).toContain("SANITISATION LAYER:");
    expect(prompt).toContain("Step 2: Lightly sanitise the filtered content:");
    expect(prompt).toContain("Silently discard anything in these categories:");
    expect(prompt).toContain("- Team changes: departures, new starters, personal news, wellbeing");
    expect(prompt).toContain("- Admin and process: folder structures, naming conventions, reporting setup, tool configuration, process improvements");
    expect(prompt).toContain("- Meeting housekeeping: scheduling, attendance, logistics, introductions");
  });

  it("keeps the prompt wrapper sections in the expected order", () => {
    const relevanceFilterIndex = prompt.indexOf("RELEVANCE FILTER:");
    const sanitisationLayerIndex = prompt.indexOf("SANITISATION LAYER:");
    const styleLayerIndex = prompt.indexOf("STYLE LAYER:");
    const meetingTranscriptIndex = prompt.indexOf("Meeting transcript:");

    expect(sanitisationLayerIndex).toBeGreaterThan(relevanceFilterIndex);
    expect(styleLayerIndex).toBeGreaterThan(sanitisationLayerIndex);
    expect(meetingTranscriptIndex).toBeGreaterThan(styleLayerIndex);
  });

  it("appends any length instruction after the transcript block", () => {
    const promptWithLengthInstruction = buildGenerationPrompt({
      transcript: "Vendor sign-off remains outstanding.",
      outputType: "short-status-update",
      lengthInstruction: "Make the output shorter. Aim for 1-2 tight sentences maximum."
    });

    const relevanceFilterIndex = promptWithLengthInstruction.indexOf("RELEVANCE FILTER:");
    const sanitisationLayerIndex = promptWithLengthInstruction.indexOf("SANITISATION LAYER:");
    const styleLayerIndex = promptWithLengthInstruction.indexOf("STYLE LAYER:");
    const meetingTranscriptIndex = promptWithLengthInstruction.indexOf("Meeting transcript:");
    const transcriptIndex = promptWithLengthInstruction.indexOf(
      "Vendor sign-off remains outstanding."
    );
    const additionalInstructionIndex =
      promptWithLengthInstruction.indexOf("Additional instruction:");
    const lengthInstructionIndex = promptWithLengthInstruction.indexOf(
      "Make the output shorter. Aim for 1-2 tight sentences maximum."
    );

    expect(sanitisationLayerIndex).toBeGreaterThan(relevanceFilterIndex);
    expect(styleLayerIndex).toBeGreaterThan(sanitisationLayerIndex);
    expect(meetingTranscriptIndex).toBeGreaterThan(styleLayerIndex);
    expect(transcriptIndex).toBeGreaterThan(meetingTranscriptIndex);
    expect(additionalInstructionIndex).toBeGreaterThan(transcriptIndex);
    expect(lengthInstructionIndex).toBeGreaterThan(additionalInstructionIndex);
  });

  it("reinforces the delivery-only exclusions in the short status prompt body", () => {
    expect(prompt).toContain("Do not include content related to reporting admin, folder management, file organisation, or process housekeeping");
    expect(prompt).toContain("Do not include content that exists solely to support internal reporting or administrative processes rather than project delivery");
    expect(prompt).toContain("Focus only on content that directly reflects delivery progress, risks, or next steps");
  });

  it("includes the UK English spelling instruction in the style layer", () => {
    expect(prompt).toContain(
      'Use UK English spelling throughout (e.g. "catalogue" not "catalog", "organisation" not "organization")'
    );
  });
});

describe("Action List prompt behaviour", () => {
  const prompt = buildGenerationPrompt({
    transcript: "Project Manager to confirm revised vendor date. Unassigned owner to validate UAT readiness.",
    outputType: "action-list"
  });

  it("uses PM-specific framing that instructs selective extraction", () => {
    expect(prompt).toContain(
      "You are extracting a delivery action list for an IT Project Manager."
    );
    expect(prompt).toContain("Your job is not to capture everything discussed.");
    expect(prompt).toContain("If in doubt, leave it out.");
  });

  it("only includes real follow-up actions and not status updates", () => {
    expect(prompt).toContain("Only include actions that are explicitly stated or clearly follow-up tasks");
    expect(prompt).toContain("Do not treat updates on work already in progress, known issues being worked on, ongoing tracked tasks, or status descriptions as actions");
  });

  it("does not invent owners and uses Unassigned when ownership is unclear", () => {
    expect(prompt).toContain('Owner (if mentioned, otherwise "Unassigned")');
    expect(prompt).toContain('Use "Unassigned" if no owner is evident');
    expect(prompt).toContain("Do not invent roles or responsibilities");
  });

  it("keeps numbered action list formatting", () => {
    expect(prompt).toContain("1. Action description");
    expect(prompt).toContain("Number each action sequentially as 1., 2., 3.");
  });

  it("excludes admin and reporting-process tasks from action outputs", () => {
    expect(prompt).toContain("Do not include actions related to reporting admin, folder management, file organisation, or process housekeeping");
    expect(prompt).toContain("Do not include actions that exist solely to support internal reporting or administrative processes rather than project delivery");
    expect(prompt).toContain("Focus only on actions that directly advance or protect delivery outcomes");
  });

  it("inherits the relevance filter and UK English guidance", () => {
    expect(prompt).toContain("RELEVANCE FILTER:");
    expect(prompt).toContain("Step 1: Filter the input before doing anything else.");
    expect(prompt).toContain(
      'Use UK English spelling throughout (e.g. "catalogue" not "catalog", "organisation" not "organization")'
    );
  });
});

describe("Stakeholder Update prompt behaviour", () => {
  const internalPrompt = buildGenerationPrompt({
    transcript: "Folder structure updated for reporting. Delivery milestone confirmed for Friday.",
    outputType: "stakeholder-update",
    audience: "internal"
  });

  const externalPrompt = buildGenerationPrompt({
    transcript: "Meeting moved by 15 minutes. Vendor delivery remains outstanding.",
    outputType: "stakeholder-update",
    audience: "external"
  });

  it("reinforces delivery-only exclusions for internal stakeholder updates", () => {
    expect(internalPrompt).toContain("Do not include content related to reporting admin, folder management, file organisation, or process housekeeping");
    expect(internalPrompt).toContain("Do not include content that exists solely to support internal reporting or administrative processes rather than project delivery");
    expect(internalPrompt).toContain("Focus only on content that directly reflects delivery progress, risks, decisions, or outcomes");
  });

  it("reinforces delivery-only exclusions for external stakeholder updates", () => {
    expect(externalPrompt).toContain("Do not include content related to reporting admin, folder management, file organisation, or process housekeeping");
    expect(externalPrompt).toContain("Do not include content that exists solely to support internal reporting or administrative processes rather than project delivery");
    expect(externalPrompt).toContain("Focus only on content that directly reflects delivery progress, risks, decisions, or outcomes");
  });

  it("applies the shared relevance filter and UK English guidance to stakeholder prompts", () => {
    expect(internalPrompt).toContain("RELEVANCE FILTER:");
    expect(externalPrompt).toContain("RELEVANCE FILTER:");
    expect(internalPrompt).toContain(
      'Use UK English spelling throughout (e.g. "catalogue" not "catalog", "organisation" not "organization")'
    );
    expect(externalPrompt).toContain(
      'Use UK English spelling throughout (e.g. "catalogue" not "catalog", "organisation" not "organization")'
    );
  });
});
