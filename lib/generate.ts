import { buildGenerationPrompt } from "@/lib/prompts";
import type { Audience, OutputType } from "@/lib/output";

const OPENAI_API_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = "gpt-4.1";

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
    return outputText;
  }

  const fallbackOutput = data.output
    ?.flatMap((item) => item.content ?? [])
    .filter((contentItem) => contentItem.type === "output_text")
    .map((contentItem) => contentItem.text?.trim() ?? "")
    .filter(Boolean)
    .join("\n\n");

  if (fallbackOutput) {
    return fallbackOutput;
  }

  if (data.error?.message) {
    throw new Error(data.error.message);
  }

  if (data.incomplete_details?.reason) {
    throw new Error(`The model response was incomplete: ${data.incomplete_details.reason}`);
  }

  throw new Error("No usable text was found in the model response.");
}
