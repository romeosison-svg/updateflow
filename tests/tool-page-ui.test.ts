import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const pageSource = readFileSync(
  join(process.cwd(), "app", "app", "page.tsx"),
  "utf8"
);

describe("tool page delivery filter toggle wiring", () => {
  it("renders Default and Delivery only toggle labels in the optional output card section", () => {
    expect(pageSource).toContain("handleSetOptionalOutputMode(card.key, \"default\")");
    expect(pageSource).toContain("handleSetOptionalOutputMode(card.key, \"delivery\")");
    expect(pageSource).toContain("Default");
    expect(pageSource).toContain("Delivery only");
  });

  it("wires delivery filter analytics events with product-facing output_type values", () => {
    expect(pageSource).toContain('"delivery_filter_applied"');
    expect(pageSource).toContain('"delivery_filter_removed"');
    expect(pageSource).toContain('"action_list"');
    expect(pageSource).toContain('"internal_update"');
    expect(pageSource).toContain('"external_update"');
  });

  it("keeps weekly update controls separate from the delivery filter toggles", () => {
    expect(pageSource).toContain('handleAdjustWeeklyUpdateLength("shorter")');
    expect(pageSource).toContain('handleAdjustWeeklyUpdateLength("more_detail")');
    expect(pageSource).toContain("handleResetToDefault");
    expect(pageSource).not.toContain('handleSetOptionalOutputMode(card.key, "delivery")}\n                      disabled={isWeeklyUpdateLoading');
  });

  it("uses per-card cached default and delivery outputs with explicit activeMode state", () => {
    expect(pageSource).toContain('activeMode: "default"');
    expect(pageSource).toContain("defaultOutput: string");
    expect(pageSource).toContain("deliveryOutput: string | null");
    expect(pageSource).toContain('cardState.activeMode === "delivery" && cardState.deliveryOutput');
  });

  it("shows loading and error messaging in the toggle area only for delivery mode preparation", () => {
    expect(pageSource).toContain("Preparing Delivery only...");
    expect(pageSource).toContain("Delivery only is unavailable right now.");
    expect(pageSource).toContain("pendingMode: \"delivery\"");
    expect(pageSource).toContain("showDeliveryError");
  });

  it("treats pressing the already-active button as a no-op", () => {
    expect(pageSource).toContain("if (cardState.activeMode === mode) {");
    expect(pageSource).toContain("return;");
  });
});
