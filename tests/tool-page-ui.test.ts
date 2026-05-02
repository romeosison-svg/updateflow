import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const pageSource = readFileSync(
  join(process.cwd(), "app", "app", "page.tsx"),
  "utf8"
);

describe("tool page split editor redesign wiring", () => {
  it("adds local activeTab state for weekly, actions, internal, and external tabs", () => {
    expect(pageSource).toContain('const [activeTab, setActiveTab] = useState<ActiveTab>("weekly")');
    expect(pageSource).toContain('type ActiveTab = "weekly" | "actions" | "internal" | "external"');
  });

  it("renders the four document tabs and wires tab switching locally", () => {
    expect(pageSource).toContain("Weekly update");
    expect(pageSource).toContain("Action list");
    expect(pageSource).toContain("Internal");
    expect(pageSource).toContain("External");
    expect(pageSource).toContain('onClick={() => setActiveTab("weekly")}');
    expect(pageSource).toContain('onClick={() => setActiveTab("actions")}');
    expect(pageSource).toContain('onClick={() => setActiveTab("internal")}');
    expect(pageSource).toContain('onClick={() => setActiveTab("external")}');
  });

  it("keeps weekly update handlers and events reachable from the redesigned toolbar", () => {
    expect(pageSource).toContain("handleSubmit");
    expect(pageSource).toContain('handleAdjustWeeklyUpdateLength(mode)');
    expect(pageSource).toContain("handleResetToDefault()");
    expect(pageSource).toContain("generate_weekly_update");
    expect(pageSource).toContain("LENGTH_ADJUSTED_EVENT");
    expect(pageSource).toContain("RESET_TO_DEFAULT_EVENT");
  });

  it("keeps delivery filter toggles and PostHog wiring for optional outputs", () => {
    expect(pageSource).toContain('handleSetOptionalOutputMode("actionList", "default")');
    expect(pageSource).toContain('handleSetOptionalOutputMode("actionList", "delivery")');
    expect(pageSource).toContain('"delivery_filter_applied"');
    expect(pageSource).toContain('"delivery_filter_removed"');
    expect(pageSource).toContain('"action_list"');
    expect(pageSource).toContain('"internal_update"');
    expect(pageSource).toContain('"external_update"');
  });

  it("includes per-tab empty state placeholders", () => {
    expect(pageSource).toContain("Your weekly update will appear here.");
    expect(pageSource).toContain("Your action list will appear here.");
    expect(pageSource).toContain("Your internal update will appear here.");
    expect(pageSource).toContain("Your external update will appear here.");
  });

  it("keeps the action output card title as Actions while preserving the Action List trigger label", () => {
    expect(pageSource).toContain('buttonLabel: "Action List"');
    expect(pageSource).toContain('cardTitle: "Actions"');
  });

  it("adds the mobile single-column split layout and horizontally scrollable tab strip", () => {
    expect(pageSource).toContain("mobile:flex mobile:flex-col");
    expect(pageSource).toContain("overflow-x-auto");
    expect(pageSource).toContain("mobile:whitespace-nowrap");
    expect(pageSource).toContain("[&::-webkit-scrollbar]:hidden");
  });

  it("adds the mobile-only add-to-your-pack controls so optional-output handlers stay reachable", () => {
    expect(pageSource).toContain("Add to your pack");
    expect(pageSource).toContain("hidden border-t border-border-line px-4 py-5 mobile:block");
    expect(pageSource).toContain("handleGenerateActionList()");
    expect(pageSource).toContain('handleGenerateOptionalOutput("internalUpdate", "the internal update")');
    expect(pageSource).toContain('handleGenerateOptionalOutput("externalUpdate", "the external update")');
  });
});
