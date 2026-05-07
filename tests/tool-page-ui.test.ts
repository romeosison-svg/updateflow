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

  it("starts all optional outputs in the background on the main generate press", () => {
    expect(pageSource).toContain("const weeklyUpdatePromise = generateWeeklyUpdate({");
    expect(pageSource).toContain("void Promise.allSettled([");
    expect(pageSource).toContain('handleGenerateFilterableOutput(');
    expect(pageSource).toContain('"actionList"');
    expect(pageSource).toContain('"internalUpdate"');
    expect(pageSource).toContain('"externalUpdate"');
    expect(pageSource).toContain("captureAddToPackEvent: false");
    expect(pageSource).toContain("suppressGlobalError: true");
    expect(pageSource).toContain("await weeklyUpdatePromise;");
  });

  it("keeps the main generate button disabled while any output is still loading", () => {
    expect(pageSource).toContain("const isAnyGenerationInProgress =");
    expect(pageSource).toContain("isWeeklyUpdateLoading ||");
    expect(pageSource).toContain("isActionListLoading ||");
    expect(pageSource).toContain("isInternalLoading ||");
    expect(pageSource).toContain("isExternalLoading;");
    expect(pageSource).toContain("disabled={isAnyGenerationInProgress}");
    expect(pageSource).toContain('? "Generating..."');
    expect(pageSource).not.toContain("Generating weekly update...");
  });

  it("validates transcript before clearing outputs on submit and removes the old reset option", () => {
    const handleSubmitBlock =
      pageSource.match(/const handleSubmit = async[\s\S]*?await weeklyUpdatePromise;\s*\};/)?.[0] ??
      "";
    const transcriptGuardIndex = handleSubmitBlock.indexOf('if (!transcript.trim()) {');
    const resetIndex = handleSubmitBlock.indexOf("resetSupplementaryOutputs();");

    expect(transcriptGuardIndex).toBeGreaterThan(-1);
    expect(resetIndex).toBeGreaterThan(-1);
    expect(transcriptGuardIndex).toBeLessThan(resetIndex);
    expect(handleSubmitBlock).toContain(
      'setError("Paste some meeting notes or a transcript before generating.");'
    );
    expect(pageSource).not.toContain("resetSupplementaryOutputs?: boolean");
    expect(pageSource).not.toContain("options?.resetSupplementaryOutputs");
  });

  it("surfaces optional output failures from the weekly tab and flags affected tabs", () => {
    expect(pageSource).toContain("const optionalOutputFailureKeys =");
    expect(pageSource).toContain("const hasOptionalOutputFailures =");
    expect(pageSource).toContain("const hasStakeholderGenerationError =");
    expect(pageSource).toContain("Some additional outputs could not be generated.");
    expect(pageSource).toMatch(/Open the affected tabs or\s+press Generate to retry\./);
    expect(pageSource).toContain("optionalOutputCache.actionList.generationError");
    expect(pageSource).toContain("optionalOutputCache.internalUpdate.generationError");
    expect(pageSource).toContain("optionalOutputCache.externalUpdate.generationError");
    expect(pageSource).toContain('className="ml-2 text-error"');
  });

  it("shows loading and empty states for optional tabs without generate prompts or add-to-pack UI", () => {
    expect(pageSource).toContain("Generating Action List...");
    expect(pageSource).toContain("Generating Internal Update...");
    expect(pageSource).toContain("Generating External Update...");
    expect(pageSource).toContain("Your action list will appear here.");
    expect(pageSource).toContain("Your internal team update will appear here.");
    expect(pageSource).toContain("Your stakeholder-facing update will appear here.");
    expect(pageSource).not.toContain("Generate Action List");
    expect(pageSource).not.toContain("Generate Stakeholder Update");
    expect(pageSource).not.toContain("renderOptionalPlaceholder");
    expect(pageSource).not.toContain("Add to your pack");
    expect(pageSource).not.toContain("+ ADD");
  });

  it("keeps stakeholder audience switching local and does not trigger additional generation on tab switch", () => {
    expect(pageSource).toContain("const handleStakeholderAudienceChange = (audience: StakeholderAudience) => {");
    expect(pageSource).toContain("setStakeholderAudience(audience);");
    expect(pageSource).not.toContain("if (!nextCardState.defaultOutput && !isNextAudienceLoading)");
    expect(pageSource).not.toContain("handleGenerateOptionalOutput(");
  });

  it("keeps weekly update handlers, length controls, and copy wiring reachable", () => {
    expect(pageSource).toContain("handleSubmit");
    expect(pageSource).toContain('handleAdjustWeeklyUpdateLength(mode)');
    expect(pageSource).toContain("handleResetToDefault()");
    expect(pageSource).toContain("generate_weekly_update");
    expect(pageSource).toContain("LENGTH_ADJUSTED_EVENT");
    expect(pageSource).toContain("RESET_TO_DEFAULT_EVENT");
    expect(pageSource).toContain('handleCopy("shortStatus", displayedWeeklyUpdate)');
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

  it("preserves the structured action-list renderer and the Actions heading", () => {
    expect(pageSource).toContain("function parseActionListOutput(output: string): ParsedActionRow[] | null");
    expect(pageSource).toContain(
      "const actionListOutput = getOptionalOutputValue(optionalOutputCache.actionList);"
    );
    expect(pageSource).toContain(
      "const parsedActionRows = useMemo(() => parseActionListOutput(actionListOutput), [actionListOutput]);"
    );
    expect(pageSource).toContain("Actions");
  });

  it("keeps the sample-chip discoverability label and fixed input-pane layout improvements", () => {
    expect(pageSource).toContain("Try an example");
    expect(pageSource).toContain(
      'className="grid h-[calc(100vh-57px)] grid-cols-[1fr_1.1fr] border-t border-border-line mobile:h-auto mobile:flex mobile:flex-col"'
    );
    expect(pageSource).toContain(
      'className="flex h-full min-h-0 flex-col overflow-hidden border-r border-border-line bg-bg-paper mobile:border-r-0"'
    );
    expect(pageSource).toContain('className="h-full overflow-y-auto bg-bg-surface"');
  });

  it("wraps only the wordmark in a link back to the landing page and keeps the real generation timer", () => {
    expect(pageSource).toContain('<Link href="/" className="flex items-center">');
    expect(pageSource).toContain('<span className="font-sans font-bold text-text-ink">Updateflow</span>');
    expect(pageSource).toContain('<span className="text-text-muted">.ai</span>');
    expect(pageSource).toContain('const [lastGenerationTime, setLastGenerationTime] = useState<number | null>(null);');
    expect(pageSource).toContain("function formatGenerationTime(seconds: number): string");
    expect(pageSource).toContain("setLastGenerationTime(elapsedSeconds);");
    expect(pageSource).toContain("setLastGenerationTime(null);");
    expect(pageSource).not.toContain("generated 0:21");
  });

  it("keeps add_to_pack analytics unreachable from the current UI while preserving the legacy capture path", () => {
    expect(pageSource).toContain('"add_to_pack_clicked"');
    expect(pageSource).toContain("captureAddToPackEvent?: boolean");
    expect(pageSource).toContain("if (options?.captureAddToPackEvent ?? true)");
  });

  it("removes the dead History button from the app header", () => {
    expect(pageSource).not.toContain(">History<");
  });
});
