import { describe, expect, it, vi } from "vitest";

import {
  capturePostHogPageView,
  getAddToPackAnalyticsType,
  getCopiedOutputAnalyticsType,
  getPostHogInitOptions,
  MORE_DETAIL_LENGTH_INSTRUCTION,
  SHORTER_LENGTH_INSTRUCTION
} from "../lib/analytics";

describe("PostHog provider configuration", () => {
  it("uses the intended App Router PostHog options", () => {
    expect(getPostHogInitOptions("https://eu.posthog.com")).toEqual({
      api_host: "https://eu.posthog.com",
      person_profiles: "identified_only",
      capture_pageview: false,
      capture_pageleave: true
    });
  });
});

describe("analytics event payload contracts", () => {
  it("keeps add-to-pack payload types stable", () => {
    expect(getAddToPackAnalyticsType("actionList")).toBe("action_list");
    expect(getAddToPackAnalyticsType("internalUpdate")).toBe("internal_update");
    expect(getAddToPackAnalyticsType("externalUpdate")).toBe("external_update");
  });

  it("keeps copied-output payload types stable", () => {
    expect(getCopiedOutputAnalyticsType("shortStatus")).toBe("weekly_update");
    expect(getCopiedOutputAnalyticsType("actionList")).toBe("action_list");
    expect(getCopiedOutputAnalyticsType("internalUpdate")).toBe("internal_update");
    expect(getCopiedOutputAnalyticsType("externalUpdate")).toBe("external_update");
  });

  it("keeps weekly update length-adjustment instructions stable", () => {
    expect(SHORTER_LENGTH_INSTRUCTION).toBe(
      "Make the output shorter. Aim for 1-2 tight sentences maximum."
    );
    expect(MORE_DETAIL_LENGTH_INSTRUCTION).toBe(
      "Expand the output slightly. Aim for 3-4 sentences. Add more specific delivery context where it is clearly supported by the input."
    );
  });
});

describe("manual pageview capture", () => {
  it("captures a pageview when pathname and PostHog client are present", () => {
    const capture = vi.fn();

    capturePostHogPageView("/app", { capture });

    expect(capture).toHaveBeenCalledWith("$pageview");
  });

  it("does not capture a pageview without pathname or client", () => {
    const capture = vi.fn();

    capturePostHogPageView(null, { capture });
    capturePostHogPageView("/app", null);

    expect(capture).not.toHaveBeenCalled();
  });
});
