import { describe, expect, it } from "vitest";

import { buildGenerationPrompt } from "../lib/prompts";

describe("Status Update prompt behaviour", () => {
  const prompt = buildGenerationPrompt({
    transcript: "Vendor delivery remains outstanding. Focus this week is on confirming dates.",
    outputType: "short-status-update"
  });

  it("requires a concise 2-3 sentence output", () => {
    expect(prompt).toContain("Produce a 2-3 sentence update");
    expect(prompt).toContain("Keep it sharp and concise (max 3 sentences)");
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
    expect(prompt).toContain("If the source input is already concise and structured, do not expand it");
    expect(prompt).toContain("The output should usually be equal length or shorter than the source unless extra clarity is genuinely needed");
  });

  it("appends any length instruction after the transcript block", () => {
    const promptWithLengthInstruction = buildGenerationPrompt({
      transcript: "Vendor sign-off remains outstanding.",
      outputType: "short-status-update",
      lengthInstruction: "Make the output shorter. Aim for 1-2 tight sentences maximum."
    });

    const meetingTranscriptIndex = promptWithLengthInstruction.indexOf("Meeting transcript:");
    const transcriptIndex = promptWithLengthInstruction.indexOf(
      "Vendor sign-off remains outstanding."
    );
    const additionalInstructionIndex =
      promptWithLengthInstruction.indexOf("Additional instruction:");
    const lengthInstructionIndex = promptWithLengthInstruction.indexOf(
      "Make the output shorter. Aim for 1-2 tight sentences maximum."
    );

    expect(transcriptIndex).toBeGreaterThan(meetingTranscriptIndex);
    expect(additionalInstructionIndex).toBeGreaterThan(transcriptIndex);
    expect(lengthInstructionIndex).toBeGreaterThan(additionalInstructionIndex);
  });
});

describe("Action List prompt behaviour", () => {
  const prompt = buildGenerationPrompt({
    transcript: "Project Manager to confirm revised vendor date. Unassigned owner to validate UAT readiness.",
    outputType: "action-list"
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
});
