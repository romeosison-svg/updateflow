import { buildGenerationPrompt } from "./prompts";
import type { Audience, OutputType } from "./output";

const OPENAI_API_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = "gpt-4.1";
const NO_DELIVERY_CONTENT_MESSAGE = "No delivery content identified from this input.";
const NO_DELIVERY_ACTIONS_MESSAGE = "No delivery actions identified from this input.";

export const SHORTER_EXISTING_OUTPUT_INSTRUCTION = `The following is an existing output. Produce a shorter version of it. Preserve all key delivery points, risks, and decisions. Remove padding, secondary detail, and any content that is lower priority. Do not introduce new content. Do not reference the original transcript.`;

export const MORE_DETAIL_EXISTING_OUTPUT_INSTRUCTION = `The following is an existing output. Produce a more detailed version of it. Expand on key points where additional context would add value. Do not introduce content that is not grounded in the existing output. Do not reference the original transcript.`;

const CLASSIFIER_SYSTEM_PROMPT = `You are a classifier for a project delivery tool used by IT Project Managers. Your job is to determine whether an action item is directly related to project delivery outcomes.

Classify as DELIVERY if the action involves:
- Confirming, validating, or closing out delivery milestones or defects
- Progressing, unblocking, or advancing work toward a delivery outcome
- Managing risks, issues, or blockers that affect delivery timelines
- Decisions required to keep delivery on track
- Dependencies that affect delivery progress
- Handing over delivery work or responsibilities to another team member or team
- Actions related to testing, UAT, go-live, or release readiness
- Vendor or third party delivery commitments
- Any action a senior PM would record as a delivery commitment in formal meeting minutes

Classify as ADMIN if the action involves:
- Creating, reorganising, or maintaining folder or file structures
- Updating, reconciling, or maintaining spreadsheets or reporting templates for administrative purposes
- Sending notifications or emails about administrative changes
- Scheduling or attendance logistics unrelated to delivery
- Housekeeping tasks that do not affect delivery outcomes

Important nuance:
- The word catalogue, register, or log in an action does not make it ADMIN — consider whether the action advances delivery outcomes
- Handing over work to a team member is DELIVERY if it relates to progressing a workstream or resolving a defect
- When in doubt, prefer DELIVERY over ADMIN — it is better to include a borderline action than to incorrectly suppress a real delivery commitment

Respond with a single word only: DELIVERY or ADMIN.
Do not explain your answer.`;

export type LengthAdjustmentDirection = "shorter" | "more_detail";

type GenerateTextParams = {
  deliveryOnly?: boolean;
  transcript: string;
  currentOutput?: string;
  lengthInstruction?: string;
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

export async function classifyContent(content: string): Promise<boolean> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.error("Missing OPENAI_API_KEY. Retaining content item during post-filtering.");
    return true;
  }

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
        max_output_tokens: 16,
        input: [
          {
            role: "system",
            content: [
              {
                type: "input_text",
                text: CLASSIFIER_SYSTEM_PROMPT
              }
            ]
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: content
              }
            ]
          }
        ]
      })
    });
  } catch (error) {
    console.error("OpenAI classification request failed. Retaining content item.", error);
    return true;
  }

  let data: OpenAIResponse;

  try {
    data = (await response.json()) as OpenAIResponse;
  } catch (error) {
    console.error("OpenAI classification response was unreadable. Retaining content item.", error);
    return true;
  }

  if (!response.ok) {
    console.error(
      "OpenAI classification request returned a non-OK response. Retaining content item.",
      data.error?.message ?? response.statusText
    );
    return true;
  }

  const classification = (
    data.output_text?.trim() ||
    data.output
      ?.flatMap((item) => item.content ?? [])
      .filter(
        (contentItem) => contentItem.type === "output_text" || contentItem.type === "text"
      )
      .map((contentItem) => contentItem.text?.trim() ?? "")
      .find(Boolean) ||
    ""
  )
    ?.toUpperCase();

  if (classification === "DELIVERY") {
    return true;
  }

  if (classification === "ADMIN") {
    return false;
  }

  console.error(
    "OpenAI classification returned an unexpected response. Retaining content item.",
    classification
  );
  return true;
}

async function classifyItemsInParallel(items: string[]): Promise<boolean[]> {
  return Promise.all(items.map((item) => classifyContent(item)));
}

export async function filterActionListOutput(rawOutput: string): Promise<string> {
  const trimmedOutput = rawOutput.trim();

  if (trimmedOutput === NO_DELIVERY_ACTIONS_MESSAGE) {
    return trimmedOutput;
  }

  const actionBlocks = trimmedOutput
    .split(/\n(?=\d+\.)/m)
    .map((block) => block.trim())
    .filter((block) => /^\d+\./.test(block));

  if (actionBlocks.length === 0) {
    return trimmedOutput;
  }

  const isDeliveryRelevant = await classifyItemsInParallel(actionBlocks);
  const validBlocks = actionBlocks.filter((_, index) => isDeliveryRelevant[index]);

  if (validBlocks.length === 0) {
    return NO_DELIVERY_ACTIONS_MESSAGE;
  }

  return validBlocks
    .map((block, index) => {
      const actionNumber = index + 1;

      return block.replace(/^\d+\./, `${actionNumber}.`).trim();
    })
    .join("\n\n");
}

export async function filterSectionedOutput(rawOutput: string): Promise<string> {
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
    const nonEmptyLines = lines.map((line) => line.trim()).filter(Boolean);
    const isDeliveryRelevant = await classifyItemsInParallel(nonEmptyLines);
    const filteredLines = nonEmptyLines.filter((_, index) => isDeliveryRelevant[index]);

    return filteredLines.length > 0
      ? filteredLines.join("\n")
      : NO_DELIVERY_CONTENT_MESSAGE;
  }

  const allBullets = sections.flatMap((section) => section.bullets);
  const isDeliveryRelevant = await classifyItemsInParallel(allBullets);
  let bulletIndex = 0;
  const filteredSections = sections
    .map((section) => ({
      heading: section.heading,
      bullets: section.bullets.filter(() => {
        const keep = isDeliveryRelevant[bulletIndex];
        bulletIndex += 1;
        return keep;
      })
    }))
    .filter((section) => section.bullets.length > 0);

  if (filteredSections.length === 0) {
    return NO_DELIVERY_CONTENT_MESSAGE;
  }

  return filteredSections
    .map((section) => [section.heading, "", ...section.bullets].join("\n"))
    .join("\n\n");
}

export async function filterShortStatusOutput(rawOutput: string): Promise<string> {
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

  const isDeliveryRelevant = await classifyItemsInParallel(sentences);
  const filteredSentences = sentences.filter((_, index) => isDeliveryRelevant[index]);

  if (filteredSentences.length === 0) {
    return NO_DELIVERY_CONTENT_MESSAGE;
  }

  return filteredSentences.join(" ").trim();
}

// Default mode returns unfiltered model output, but the prompts remain delivery-biased.
// "Default" therefore does not mean literally all transcript content.
// "Delivery only" adds classifier filtering on top of the already delivery-biased prompt output.
// The backend supports deliveryOnly for short-status-update, but no UI control exposes it.
export async function filterGeneratedOutput(
  output: string,
  outputType: OutputType,
  deliveryOnly?: boolean
): Promise<string> {
  if (deliveryOnly !== true) {
    return output;
  }

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
  deliveryOnly,
  transcript,
  currentOutput,
  lengthInstruction,
  outputType,
  audience
}: GenerateTextParams): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY. Add it to .env.local before generating output.");
  }

  const prompt = buildGenerationPrompt({
    transcript: (currentOutput?.trim() || transcript).trim(),
    outputType,
    audience,
    lengthInstruction
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
    return filterGeneratedOutput(outputText, outputType, deliveryOnly);
  }

  const fallbackOutput = data.output
    ?.flatMap((item) => item.content ?? [])
    .filter((contentItem) => contentItem.type === "output_text")
    .map((contentItem) => contentItem.text?.trim() ?? "")
    .filter(Boolean)
    .join("\n\n");

  if (fallbackOutput) {
    return filterGeneratedOutput(fallbackOutput, outputType, deliveryOnly);
  }

  if (data.error?.message) {
    throw new Error(data.error.message);
  }

  if (data.incomplete_details?.reason) {
    throw new Error(`The model response was incomplete: ${data.incomplete_details.reason}`);
  }

  throw new Error("No usable text was found in the model response.");
}
