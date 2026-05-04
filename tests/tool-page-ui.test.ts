import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const pageSource = readFileSync(
  join(process.cwd(), "app", "app", "page.tsx"),
  "utf8"
);

describe("tool page split editor redesign wiring", () => {
  it("adds local activeTab state for weekly, actions, and stakeholder", () => {
    expect(pageSource).toContain('const [activeTab, setActiveTab] = useState<ActiveTab>("weekly")');
    expect(pageSource).toContain('type ActiveTab = "weekly" | "actions" | "stakeholder"');
    expect(pageSource).toMatch(
      /const \[stakeholderAudience, setStakeholderAudience\] =\s+useState<StakeholderAudience>\("internal"\);/
    );
  });

  it("renders three document tabs with the Stakeholder tab consolidated from Internal and External", () => {
    expect(pageSource).toContain("Weekly update");
    expect(pageSource).toContain("Action list");
    expect(pageSource).toContain("Stakeholder");
    expect(pageSource).toContain('(["weekly", "actions", "stakeholder"] as const).map((tab)');
    expect(pageSource).not.toContain('setActiveTab("internal")');
    expect(pageSource).not.toContain('setActiveTab("external")');
  });

  it("applies accent border classes to the active tab and transparent borders to inactive tabs", () => {
    expect(pageSource).toContain('activeTab === "weekly"');
    expect(pageSource).toContain('activeTab === "actions"');
    expect(pageSource).toContain('activeTab === "stakeholder"');
    expect(pageSource).toContain('? "border-b-bg-accent text-text-ink"');
    expect(pageSource).toContain(': "border-b-transparent text-text-muted"');
  });

  it("derives stakeholder output state from the selected audience", () => {
    expect(pageSource).toContain("getStakeholderOutputKey(audience: StakeholderAudience)");
    expect(pageSource).toContain("const stakeholderOutputKey = getStakeholderOutputKey(stakeholderAudience)");
    expect(pageSource).toMatch(
      /stakeholderAudience === "internal"\s+\? isInternalLoading : isExternalLoading/
    );
    expect(pageSource).toMatch(
      /stakeholderAudience === "internal"\s+\? "Your internal team update will appear here\."\s+: "Your stakeholder-facing update will appear here\."/
    );
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
    expect(pageSource).toContain('handleSetOptionalOutputMode(stakeholderOutputKey, "default")');
    expect(pageSource).toContain('handleSetOptionalOutputMode(stakeholderOutputKey, "delivery")');
    expect(pageSource).toContain('"delivery_filter_applied"');
    expect(pageSource).toContain('"delivery_filter_removed"');
    expect(pageSource).toContain('"action_list"');
    expect(pageSource).toContain('"internal_update"');
    expect(pageSource).toContain('"external_update"');
  });

  it("includes per-tab empty state placeholders", () => {
    expect(pageSource).toContain("Your weekly update will appear here.");
    expect(pageSource).toContain("Your action list will appear here.");
    expect(pageSource).toContain("Your internal team update will appear here.");
    expect(pageSource).toContain("Your stakeholder-facing update will appear here.");
  });

  it("routes stakeholder generation through the unified tab and audience state", () => {
    expect(pageSource).toContain("const handleStakeholderAudienceChange = (audience: StakeholderAudience) => {");
    expect(pageSource).toContain("if (!nextCardState.defaultOutput && !isNextAudienceLoading) {");
    expect(pageSource).toContain('setActiveTab("stakeholder")');
    expect(pageSource).toContain(
      'setStakeholderAudience(key === "internalUpdate" ? "internal" : "external")'
    );
    expect(pageSource).toContain("Generate Stakeholder Update");
    expect(pageSource).toContain("Stakeholder Update");
  });

  it("keeps the action output section heading as 'Actions'", () => {
    expect(pageSource).toContain("Actions");
  });

  it("uses one shared structured action-list parser and renderer for the active action output", () => {
    expect(pageSource).toContain("function parseActionListOutput(output: string): ParsedActionRow[] | null");
    expect(pageSource).toContain(
      "const actionListOutput = getOptionalOutputValue(optionalOutputCache.actionList);"
    );
    expect(pageSource).toContain(
      "const parsedActionRows = useMemo(() => parseActionListOutput(actionListOutput), [actionListOutput]);"
    );
    expect(pageSource).toContain('className="grid grid-cols-[20px_1fr_auto] items-start gap-3 border-b border-border-line-soft py-[10px] mobile:block"');
    expect(pageSource).toContain('{" · "}');
  });

  it("adds a discoverability label above the sample chips without changing chip wiring", () => {
    expect(pageSource).toContain("Try an example");
    expect(pageSource).toContain('className="mb-2 font-mono text-[11px] uppercase tracking-[0.08em] text-text-muted"');
    expect(pageSource).toContain("handleSampleClick(sample.transcript)");
  });

  it("keeps the generate button outside the textarea scroll area in the left pane", () => {
    expect(pageSource).toContain('className="flex min-h-0 flex-col overflow-hidden border-r border-border-line bg-bg-paper mobile:border-r-0"');
    expect(pageSource).toContain('className="flex min-h-0 flex-1 flex-col overflow-hidden"');
    expect(pageSource).toContain('className="min-h-[240px] flex-1 resize-none overflow-y-auto whitespace-pre-wrap rounded border border-border-line bg-bg-surface p-[18px] font-mono text-mono-input leading-[1.65] text-text-ink-soft mobile:max-h-[180px] mobile:text-mono-caption"');
    expect(pageSource).toContain('className="border-t border-border-line px-7 py-4 mobile:px-4"');
    expect(pageSource).toContain("onSubmit={handleSubmit}");
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
    expect(pageSource).toContain("handleOpenActionListTab()");
    expect(pageSource).toContain('handleOpenStakeholderTab("internal")');
  });

  it("removes the dead History button from the app header", () => {
    expect(pageSource).not.toContain(">History<");
  });
});
