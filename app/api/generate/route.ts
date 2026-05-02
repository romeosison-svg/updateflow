import { NextResponse } from "next/server";
import {
  generateText,
  MORE_DETAIL_EXISTING_OUTPUT_INSTRUCTION,
  SHORTER_EXISTING_OUTPUT_INSTRUCTION,
  type LengthAdjustmentDirection
} from "../../../lib/generate";
import type { GeneratedOutputs } from "../../../lib/output";

const MAX_TRANSCRIPT_LENGTH = 25000;

type GenerateRouteBody = {
  adjustmentDirection?: LengthAdjustmentDirection;
  currentOutput?: string;
  deliveryOnly?: boolean;
  includeActionList?: boolean;
  includeExternal?: boolean;
  includeInternal?: boolean;
  outputType?: string;
  transcript?: string;
};

function getLengthInstructionForAdjustmentDirection(
  adjustmentDirection?: LengthAdjustmentDirection
) {
  switch (adjustmentDirection) {
    case "shorter":
      return SHORTER_EXISTING_OUTPUT_INSTRUCTION;
    case "more_detail":
      return MORE_DETAIL_EXISTING_OUTPUT_INSTRUCTION;
    default:
      return undefined;
  }
}

function getShortStatusGenerationParams(body: GenerateRouteBody) {
  return {
    deliveryOnly: body.deliveryOnly === true,
    transcript: body.transcript?.trim() ?? "",
    currentOutput: body.currentOutput?.trim() || undefined,
    lengthInstruction: getLengthInstructionForAdjustmentDirection(body.adjustmentDirection),
    outputType: "short-status-update" as const
  };
}

export async function POST(request: Request) {
  let body: GenerateRouteBody;

  try {
    const contentType = request.headers.get("content-type") ?? "";

    if (!contentType.includes("application/json")) {
      return NextResponse.json(
        { error: "Content-Type must be application/json." },
        {
          status: 415
        }
      );
    }

    try {
      body = (await request.json()) as GenerateRouteBody;
    } catch {
      return NextResponse.json(
        { error: "Request body must be valid JSON." },
        {
          status: 400
        }
      );
    }

    const transcript = body.transcript?.trim() ?? "";
    const includeActionList = body.includeActionList === true;
    const deliveryOnly = body.deliveryOnly === true;
    const includeExternal = body.includeExternal === true;
    const includeInternal = body.includeInternal === true;
    const outputType = body.outputType?.trim();

    if (!transcript) {
      return NextResponse.json(
        { error: "Transcript text is required." },
        {
          status: 400
        }
      );
    }

    if (transcript.length > MAX_TRANSCRIPT_LENGTH) {
      return NextResponse.json(
        { error: `Transcript must be ${MAX_TRANSCRIPT_LENGTH} characters or fewer.` },
        {
          status: 400
        }
      );
    }

    if (includeActionList || outputType === "action-list") {
      const actionList = await generateText({
        deliveryOnly,
        transcript,
        outputType: "action-list"
      });

      const outputs: GeneratedOutputs = {
        actionList
      };

      return NextResponse.json({
        outputs
      });
    }

    if (includeInternal) {
      const internalUpdate = await generateText({
        deliveryOnly,
        transcript,
        outputType: "stakeholder-update",
        audience: "internal"
      });

      const outputs: GeneratedOutputs = {
        internalUpdate
      };

      return NextResponse.json({
        outputs
      });
    }

    if (includeExternal) {
      const externalUpdate = await generateText({
        deliveryOnly,
        transcript,
        outputType: "stakeholder-update",
        audience: "external"
      });

      const outputs: GeneratedOutputs = {
        externalUpdate
      };

      return NextResponse.json({
        outputs
      });
    }

    const shortStatus = await generateText(getShortStatusGenerationParams(body));

    const outputs: GeneratedOutputs = {
      shortStatus
    };

    return NextResponse.json({
      outputs
    });
  } catch (error) {
    console.error("Generation route failed:", error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        {
          status: 500
        }
      );
    }

    return NextResponse.json(
      { error: "Unable to generate output right now." },
      {
        status: 500
      }
    );
  }
}
