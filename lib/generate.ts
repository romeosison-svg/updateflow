import { buildGenerationPrompt } from "./prompts";
import type { Audience, OutputType } from "./output";

const OPENAI_API_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = "gpt-4.1";
const NO_DELIVERY_CONTENT_MESSAGE = "No delivery content identified from this input.";
const NO_DELIVERY_ACTIONS_MESSAGE = "No delivery actions identified from this input.";

export const ADMIN_INDICATORS = [
  "create a folder",
  "create a new folder",
  "folder structure",
  "directory structure",
  "naming convention",
  "file organisation",
  "file organization",
  "update the report",
  "update the spreadsheet",
  "update the sheet",
  "reporting setup",
  "reporting process",
  "reporting template",
  "send an email to notify",
  "send an email about",
  "email the team about",
  "archive the",
  "housekeeping",
  "missing from the sheet",
  "missing from the spreadsheet",
  "add to the sheet",
  "add to the spreadsheet",
  "compare the sheet",
  "compare the spreadsheet",
  "missing content from",
  "older stories",
  "march and april",
  "revisit and update status"
] as const;

type GenerateTextParams = {
  transcript: string;
  outputType: OutputType;
  audience?: Audience;
};

type OpenAIResponse = {
  error?: {
    message?: string;
  };
  incomplete_details?: {
    reason?: string;
  };
  output?: Array<{
    content?: Array<{
      text?: string;
      type?: string;
    }>;
  }>;
  output_text?: string;
};

function containsAdminIndicator(content: string): boolean {
  const normalisedContent = content.toLowerCase();

  return ADMIN_INDICATORS.some((indicator) => normalisedContent.includes(indicator));
}

export function filterActionListOutput(rawOutput: string): string {
  const trimmedOutput = rawOutput.trim();

  if (trimmedOutput === NO_DELIVERY_ACTIONS_MESSAGE) {
    return trimmedOutput;
  }

  const actionBlocks = trimmedOutput
    .split(/(?=^\d+\.)/m)
    .map((block) => block.trim())
    .filter(Boolean);

  if (actionBlocks.length === 0) {
    return trimmedOutput;
  }

  const validBlocks = actionBlocks.filter((block) => !containsAdminIndicator(block));

  if (validBlocks.length === 0) {
    return NO_DELIVERY_ACTIONS_MESSAGE;
  }

  return validBlocks
    .map((block, index) => block.replace(/^\d+\./, `${index + 1}.`).trim())
    .join("\n\n");
}

export function filterSectionedOutput(rawOutput: string): string {
  const trimmedOutput = rawOutput.trim();

  if (trimmedOutput === NO_DELIVERY_CONTENT_MESSAGE) {
    return trimmedOutput;
  }

  const lines = trimmedOutput.split(/\r?\n/);
  const sections: Array<{ heading: string; bullets: string[] }> = [];
  let currentSection: { heading: string; bullets: string[] } | null = null;

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (!trimmedLine) {
      continue;
    }

    if (trimmedLine.startsWith("-")) {
      if (currentSection) {
        currentSection.bullets.push(trimmedLine);
      }

      continue;
    }

    currentSection = {
      heading: trimmedLine,
      bullets: []
    };
    sections.push(currentSection);
  }

  if (sections.length === 0) {
    const filteredLines = lines.filter((line) => {
      const trimmedLine = line.trim();

      return trimmedLine && !containsAdminIndicator(trimmedLine);
    });

    return filteredLines.length > 0
      ? filteredLines.join("\n")
      : NO_DELIVERY_CONTENT_MESSAGE;
  }

  const filteredSections = sections
    .map((section) => ({
      heading: section.heading,
      bullets: section.bullets.filter((bullet) => !containsAdminIndicator(bullet))
    }))
    .filter((section) => section.bullets.length > 0);

  if (filteredSections.length === 0) {
    return NO_DELIVERY_CONTENT_MESSAGE;
  }

  return filteredSections
    .map((section) => [section.heading, "", ...section.bullets].join("\n"))
    .join("\n\n");
}

export function filterShortStatusOutput(rawOutput: string): string {
  const trimmedOutput = rawOutput.trim();

  if (trimmedOutput === NO_DELIVERY_CONTENT_MESSAGE) {
    return trimmedOutput;
  }

  const sentences =
    trimmedOutput.match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g)?.map((sentence) => sentence.trim()) ??
    [];

  if (sentences.length === 0) {
    return trimmedOutput;
  }

  const filteredSentences = sentences.filter((sentence) => !containsAdminIndicator(sentence));

  if (filteredSentences.length === 0) {
    return NO_DELIVERY_CONTENT_MESSAGE;
  }

  return filteredSentences.join(" ").trim();
}

function filterGeneratedOutput(output: string, outputType: OutputType): string {
  switch (outputType) {
    case "action-list":
      return filterActionListOutput(output);
    case "stakeholder-update":
      return filterSectionedOutput(output);
    case "short-status-update":
      return filterShortStatusOutput(output);
  }
}

export async function generateText({
  transcript,
  outputType,
  audience
}: GenerateTextParams): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY. Add it to .env.local before generating output.");
  }

  const prompt = buildGenerationPrompt({
    transcript,
    outputType,
    audience
  });

  let response: Response;

  try {
    response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? DEFAULT_MODEL,
        input: prompt
      })
    });
  } catch {
    throw new Error("Unable to reach the model provider. Check your network connection and try again.");
  }

  let data: OpenAIResponse;

  try {
    data = (await response.json()) as OpenAIResponse;
  } catch {
    throw new Error("The model provider returned an unreadable response.");
  }

  if (!response.ok) {
    throw new Error(data.error?.message ?? "The model request failed.");
  }

  const outputText = data.output_text?.trim();

  if (outputText) {
    return filterGeneratedOutput(outputText, outputType);
  }

  const fallbackOutput = data.output
    ?.flatMap((item) => item.content ?? [])
    .filter((contentItem) => contentItem.type === "output_text")
    .map((contentItem) => contentItem.text?.trim() ?? "")
    .filter(Boolean)
    .join("\n\n");

  if (fallbackOutput) {
    return filterGeneratedOutput(fallbackOutput, outputType);
  }

  if (data.error?.message) {
    throw new Error(data.error.message);
  }

  if (data.incomplete_details?.reason) {
    throw new Error(`The model response was incomplete: ${data.incomplete_details.reason}`);
  }

  throw new Error("No usable text was found in the model response.");
}
