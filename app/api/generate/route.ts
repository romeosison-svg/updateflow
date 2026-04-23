import { NextResponse } from "next/server";
import { generateText } from "@/lib/generate";
import type { GeneratedOutputs, RaidOutput } from "@/lib/output";

const MAX_TRANSCRIPT_LENGTH = 25000;

export async function POST(request: Request) {
  let body: {
    includeExternal?: boolean;
    includeInternal?: boolean;
    includeRaid?: boolean;
    transcript?: string;
  };

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
      body = (await request.json()) as {
        includeExternal?: boolean;
        includeInternal?: boolean;
        includeRaid?: boolean;
        transcript?: string;
      };
    } catch {
      return NextResponse.json(
        { error: "Request body must be valid JSON." },
        {
          status: 400
        }
      );
    }

    const transcript = body.transcript?.trim() ?? "";
    const includeExternal = body.includeExternal === true;
    const includeInternal = body.includeInternal === true;
    const includeRaid = body.includeRaid === true;

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

    if (includeRaid) {
      const raid = await generateText({
        transcript,
        outputType: "raid-log"
      });

      const outputs: RaidOutput = {
        raid
      };

      return NextResponse.json({
        outputs
      });
    }

    if (includeInternal) {
      const internalUpdate = await generateText({
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

    const [shortStatus, actionList] = await Promise.all([
      generateText({
        transcript,
        outputType: "short-status-update"
      }),
      generateText({
        transcript,
        outputType: "action-list"
      })
    ]);

    const outputs: GeneratedOutputs = {
      shortStatus,
      actionList
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
