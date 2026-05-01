export type WeeklyUpdateAdjustmentDirection = "shorter" | "more_detail";

export const LENGTH_ADJUSTED_EVENT = "length_adjusted";
export const RESET_TO_DEFAULT_EVENT = "reset_to_default";

type WeeklyUpdateRequestBody = {
  adjustmentDirection?: WeeklyUpdateAdjustmentDirection;
  currentOutput?: string;
  transcript: string;
};

export function buildWeeklyUpdateRequestBody({
  transcript,
  currentOutput,
  adjustmentDirection
}: WeeklyUpdateRequestBody): WeeklyUpdateRequestBody {
  const body: WeeklyUpdateRequestBody = {
    transcript
  };

  if (adjustmentDirection) {
    body.adjustmentDirection = adjustmentDirection;
  }

  if (currentOutput?.trim()) {
    body.currentOutput = currentOutput;
  }

  return body;
}

export function getLengthAdjustedEventPayload(direction: WeeklyUpdateAdjustmentDirection) {
  return {
    direction
  };
}
