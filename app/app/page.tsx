"use client";

import React, { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { usePostHog } from "posthog-js/react";

import {
  getAddToPackAnalyticsType,
  getCopiedOutputAnalyticsType
} from "../../lib/analytics";
import type { OutputCardKey } from "../../lib/output";
import {
  buildWeeklyUpdateRequestBody,
  getLengthAdjustedEventPayload,
  LENGTH_ADJUSTED_EVENT,
  RESET_TO_DEFAULT_EVENT,
  type WeeklyUpdateAdjustmentDirection
} from "./page-helpers";

const sampleTranscripts = [
  {
    id: "migration-week",
    label: "migration week",
    transcript:
      "Monday: Confirmed cutover window with infrastructure team for Saturday night. Vendor yet to provide final environment sign-off.\n\nTuesday: Sign-off still outstanding. Escalated to vendor account manager. Parallel workstream leads asked to review dependencies ahead of cutover.\n\nWednesday: Vendor confirmed environment ready. UAT entry criteria reviewed with QA lead - two outstanding defects flagged as potential blockers. Decision to defer lower-priority defect and proceed with UAT.\n\nThursday: UAT started. First round of test cases passed. One defect raised against the reporting module - under investigation. Client stakeholder briefed on status.\n\nFriday: UAT progressing. Reporting defect confirmed as low severity and deferred to post-go-live. Cutover plan confirmed for Saturday. Communications drafted and ready to send."
  },
  {
    id: "programme-update",
    label: "programme update",
    transcript:
      "Monday: Kick-off for new workstream completed. Three work packages assigned to stream leads. Resource gap identified in data migration track - flagged to PMO.\n\nTuesday: Data migration resource confirmed for two days per week. Dependencies mapped across all three workstreams. Risk log updated.\n\nWednesday: Steering group prep completed. Deck reviewed with sponsor. Two decisions required from steering: budget approval for additional QA resource and sign-off on revised go-live date.\n\nThursday: Steering group held. Budget approved. Go-live date moved to end of next month - agreed by all parties. Stream leads notified and plans being updated.\n\nFriday: Updated programme plan circulated. One stream lead flagged a risk around third-party API readiness. Added to RAID. Next week focus is confirming integration test schedule."
  },
  {
    id: "delivery-risk",
    label: "delivery risk",
    transcript:
      "- API integration delayed - vendor missed agreed delivery date\n- QA resource stretched across two workstreams this sprint\n- UAT entry criteria not yet signed off by client\n- Risk to UAT start date if API not delivered by Wednesday\n- PM to confirm revised timeline with vendor tomorrow"
  },
  {
    id: "action-heavy-week",
    label: "action-heavy week",
    transcript:
      "- Sarah to send updated RAID log by end of day Friday\n- Tom to confirm resource availability for integration workstream next week\n- Client to provide final sign-off on UAT test cases before Thursday\n- Team agreed to defer two lower-priority defects from release scope\n- Go-live readiness review scheduled for next Monday at 10am\n- Dependency on client security team for SSO approval still outstanding"
  }
] as const;

const optionalOutputCards: Array<{
  buttonLabel: string;
  cardTitle: string;
  errorLabel: string;
  key: Extract<OutputCardKey, "actionList" | "externalUpdate" | "internalUpdate">;
}> = [
  {
    key: "actionList",
    buttonLabel: "Action List",
    cardTitle: "Actions",
    errorLabel: "the action list"
  },
  {
    key: "internalUpdate",
    buttonLabel: "Internal Update",
    cardTitle: "Internal Update",
    errorLabel: "the internal update"
  },
  {
    key: "externalUpdate",
    buttonLabel: "External Update",
    cardTitle: "External Update",
    errorLabel: "the external update"
  }
];

type OptionalOutputKey = (typeof optionalOutputCards)[number]["key"];
type OptionalFilterMode = "default" | "delivery";
type ActiveTab = "weekly" | "actions" | "internal" | "external";
type WeeklyLengthMode = "default" | "shorter" | "more_detail";

type OptionalOutputCacheState = {
  activeMode: OptionalFilterMode;
  defaultOutput: string;
  deliveryOutput: string | null;
  deliveryOutputError: boolean;
  deliveryOutputLoading: boolean;
  pendingMode: OptionalFilterMode | null;
  showDeliveryError: boolean;
};

type OptionalOutputCache = Record<OptionalOutputKey, OptionalOutputCacheState>;

type ParsedActionRow = {
  action: string;
  due: string;
  number: string;
  owner: string;
  priority: string;
};

function createEmptyOptionalOutputCacheState(): OptionalOutputCacheState {
  return {
    activeMode: "default",
    defaultOutput: "",
    deliveryOutput: null,
    deliveryOutputError: false,
    deliveryOutputLoading: false,
    pendingMode: null,
    showDeliveryError: false
  };
}

function createInitialOptionalOutputCache(): OptionalOutputCache {
  return {
    actionList: createEmptyOptionalOutputCacheState(),
    internalUpdate: createEmptyOptionalOutputCacheState(),
    externalUpdate: createEmptyOptionalOutputCacheState()
  };
}

function getDeliveryFilterOutputType(key: OptionalOutputKey) {
  switch (key) {
    case "actionList":
      return "action_list";
    case "internalUpdate":
      return "internal_update";
    case "externalUpdate":
      return "external_update";
  }
}

function parseActionListOutput(output: string): ParsedActionRow[] | null {
  const trimmedOutput = output.trim();

  if (!trimmedOutput) {
    return [];
  }

  const blocks = trimmedOutput
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  if (blocks.length === 0) {
    return null;
  }

  const rows = blocks.map((block) => {
    const lines = block.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const actionMatch = lines[0]?.match(/^(\d+)\.\s*(.+)$/);
    const ownerMatch = lines.find((line) => line.startsWith("Owner:"))?.replace(/^Owner:\s*/, "");
    const priorityMatch = lines
      .find((line) => line.startsWith("Priority:"))
      ?.replace(/^Priority:\s*/, "");

    if (!actionMatch || !ownerMatch || !priorityMatch) {
      return null;
    }

    return {
      number: actionMatch[1],
      action: actionMatch[2],
      owner: ownerMatch,
      priority: priorityMatch,
      // Spec gap: action-list generation does not currently return due dates, so the
      // split-editor table renders a neutral placeholder rather than inventing data.
      due: "—"
    };
  });

  return rows.every(Boolean) ? (rows as ParsedActionRow[]) : null;
}

function getPriorityPillClasses(priority: string) {
  const normalisedPriority = priority.toLowerCase();

  if (normalisedPriority.startsWith("high")) {
    return "bg-bg-accent-soft text-text-accent";
  }

  if (normalisedPriority.startsWith("med")) {
    return "bg-border-line-soft text-text-ink-soft";
  }

  return "border border-border-line bg-transparent text-text-muted";
}

export default function ToolPage() {
  const posthog = usePostHog();
  const [transcript, setTranscript] = useState("");
  const [defaultWeeklyUpdate, setDefaultWeeklyUpdate] = useState("");
  const [displayedWeeklyUpdate, setDisplayedWeeklyUpdate] = useState("");
  const [error, setError] = useState("");
  const [isActionListLoading, setIsActionListLoading] = useState(false);
  const [isExternalLoading, setIsExternalLoading] = useState(false);
  const [isInternalLoading, setIsInternalLoading] = useState(false);
  const [isWeeklyUpdateLoading, setIsWeeklyUpdateLoading] = useState(false);
  const [copyLabels, setCopyLabels] = useState<Partial<Record<OutputCardKey, string>>>({});
  // Spec note: the prompt layer remains delivery-biased in Default mode, so this cache
  // represents "raw model output under current prompts" vs "classifier-filtered output".
  // We also track a pending delivery switch so a user can request Delivery only before the
  // prefetched variant is ready without blanking the current output.
  const [optionalOutputCache, setOptionalOutputCache] = useState<OptionalOutputCache>(
    createInitialOptionalOutputCache()
  );
  const [activeTab, setActiveTab] = useState<ActiveTab>("weekly");
  // Spec gap: the existing weekly-update flow stores current text but not a canonical
  // "shorter vs more detail" mode, so this UI-only state tracks the last selected view.
  const [weeklyLengthMode, setWeeklyLengthMode] = useState<WeeklyLengthMode>("default");

  const actionListOutput = optionalOutputCache.actionList.activeMode === "delivery" &&
    optionalOutputCache.actionList.deliveryOutput
    ? optionalOutputCache.actionList.deliveryOutput
    : optionalOutputCache.actionList.defaultOutput;
  const internalOutput = optionalOutputCache.internalUpdate.activeMode === "delivery" &&
    optionalOutputCache.internalUpdate.deliveryOutput
    ? optionalOutputCache.internalUpdate.deliveryOutput
    : optionalOutputCache.internalUpdate.defaultOutput;
  const externalOutput = optionalOutputCache.externalUpdate.activeMode === "delivery" &&
    optionalOutputCache.externalUpdate.deliveryOutput
    ? optionalOutputCache.externalUpdate.deliveryOutput
    : optionalOutputCache.externalUpdate.defaultOutput;

  const parsedActionRows = useMemo(() => parseActionListOutput(actionListOutput), [actionListOutput]);
  const actionCount = parsedActionRows?.length ?? 0;

  const activeTabOutput =
    activeTab === "weekly"
      ? displayedWeeklyUpdate
      : activeTab === "actions"
        ? actionListOutput
        : activeTab === "internal"
          ? internalOutput
          : externalOutput;

  const showGeneratedIndicator = Boolean(activeTabOutput);

  const resetSupplementaryOutputs = () => {
    setOptionalOutputCache(createInitialOptionalOutputCache());
    setCopyLabels((current) => ({
      ...current,
      actionList: "Copy",
      internalUpdate: "Copy",
      externalUpdate: "Copy"
    }));
  };

  const generateWeeklyUpdate = async (
    options?: {
      captureGenerateEvent?: boolean;
      adjustmentDirection?: WeeklyUpdateAdjustmentDirection;
      currentOutput?: string;
      isResetToDefault?: boolean;
      resetSupplementaryOutputs?: boolean;
    }
  ) => {
    if (!transcript.trim()) {
      if (options?.resetSupplementaryOutputs) {
        resetSupplementaryOutputs();
      }
      if (options?.isResetToDefault) {
        setDefaultWeeklyUpdate("");
        setDisplayedWeeklyUpdate("");
      }
      setError("Paste some meeting notes or a transcript before generating.");
      return;
    }

    setError("");
    setIsWeeklyUpdateLoading(true);

    if (options?.isResetToDefault) {
      setDisplayedWeeklyUpdate("");
    }

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(
          buildWeeklyUpdateRequestBody({
            transcript,
            currentOutput: options?.currentOutput,
            adjustmentDirection: options?.adjustmentDirection
          })
        )
      });

      const data = (await response.json()) as {
        outputs?: Partial<Record<OutputCardKey, string>>;
        error?: string;
      };
      const nextWeeklyUpdate = data.outputs?.shortStatus ?? "";

      if (!response.ok || !nextWeeklyUpdate) {
        throw new Error(data.error ?? "Something went wrong while generating the outputs.");
      }

      if (options?.resetSupplementaryOutputs) {
        resetSupplementaryOutputs();
      }

      if (options?.adjustmentDirection) {
        setDisplayedWeeklyUpdate(nextWeeklyUpdate);
      } else {
        setDefaultWeeklyUpdate(nextWeeklyUpdate);
        setDisplayedWeeklyUpdate(nextWeeklyUpdate);
      }

      setCopyLabels((current) => ({
        ...(options?.resetSupplementaryOutputs ? {} : current),
        shortStatus: "Copy"
      }));

      if (options?.captureGenerateEvent) {
        posthog?.capture("generate_weekly_update");
      }
    } catch (generationError) {
      if (options?.resetSupplementaryOutputs) {
        resetSupplementaryOutputs();
      }
      if (options?.isResetToDefault) {
        setDisplayedWeeklyUpdate(defaultWeeklyUpdate);
      }
      setError(
        generationError instanceof Error
          ? generationError.message
          : "Something went wrong while generating the outputs."
      );
    } finally {
      setIsWeeklyUpdateLoading(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActiveTab("weekly");
    setWeeklyLengthMode("default");

    await generateWeeklyUpdate({
      captureGenerateEvent: true,
      resetSupplementaryOutputs: true
    });
  };

  const handleAdjustWeeklyUpdateLength = async (
    direction: WeeklyUpdateAdjustmentDirection
  ) => {
    if (!displayedWeeklyUpdate.trim()) {
      return;
    }

    posthog?.capture(LENGTH_ADJUSTED_EVENT, getLengthAdjustedEventPayload(direction));

    await generateWeeklyUpdate({
      adjustmentDirection: direction,
      currentOutput: displayedWeeklyUpdate
    });
  };

  const handleResetToDefault = async () => {
    posthog?.capture(RESET_TO_DEFAULT_EVENT);

    await generateWeeklyUpdate({
      isResetToDefault: true
    });
  };

  const prefetchDeliveryOnlyOutput = async (
    key: OptionalOutputKey,
    requestBody: {
      transcript: string;
      includeExternal?: boolean;
      includeInternal?: boolean;
      outputType?: "action-list";
    }
  ) => {
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...requestBody,
          deliveryOnly: true
        })
      });

      const data = (await response.json()) as {
        outputs?: Partial<Record<OutputCardKey, string>>;
        error?: string;
      };
      const value = data.outputs?.[key];

      if (!response.ok || !value) {
        throw new Error(data.error ?? "Delivery-only generation failed.");
      }

      setOptionalOutputCache((current) => {
        const nextCard = current[key];

        return {
          ...current,
          [key]: {
            ...nextCard,
            activeMode: nextCard.pendingMode === "delivery" ? "delivery" : nextCard.activeMode,
            deliveryOutput: value,
            deliveryOutputError: false,
            deliveryOutputLoading: false,
            pendingMode: null,
            showDeliveryError: false
          }
        };
      });
    } catch (prefetchError) {
      console.error("prefetchDeliveryOnlyOutput failed for", key, prefetchError);
      setOptionalOutputCache((current) => {
        const nextCard = current[key];

        return {
          ...current,
          [key]: {
            ...nextCard,
            deliveryOutputError: true,
            deliveryOutputLoading: false,
            pendingMode: null,
            showDeliveryError: nextCard.pendingMode === "delivery"
          }
        };
      });
    }
  };

  const handleGenerateFilterableOutput = async (
    key: OptionalOutputKey,
    errorLabel: string,
    requestBody: {
      transcript: string;
      includeExternal?: boolean;
      includeInternal?: boolean;
      outputType?: "action-list";
    }
  ) => {
    if (!transcript.trim()) {
      setError(`Paste some meeting notes or a transcript before generating ${errorLabel}.`);
      return;
    }

    setError("");
    posthog?.capture("add_to_pack_clicked", {
      type: getAddToPackAnalyticsType(key)
    });

    switch (key) {
      case "actionList":
        setIsActionListLoading(true);
        break;
      case "internalUpdate":
        setIsInternalLoading(true);
        break;
      case "externalUpdate":
        setIsExternalLoading(true);
        break;
    }

    try {
      setOptionalOutputCache((current) => ({
        ...current,
        [key]: createEmptyOptionalOutputCacheState()
      }));

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...requestBody,
          deliveryOnly: false
        })
      });

      const data = (await response.json()) as {
        outputs?: Partial<Record<OutputCardKey, string>>;
        error?: string;
      };
      const value = data.outputs?.[key];

      if (!response.ok || !value) {
        throw new Error(data.error ?? `Something went wrong while generating ${errorLabel}.`);
      }

      setOptionalOutputCache((current) => ({
        ...current,
        [key]: {
          ...createEmptyOptionalOutputCacheState(),
          defaultOutput: value,
          deliveryOutputLoading: true
        }
      }));
      setCopyLabels((current) => ({
        ...current,
        [key]: "Copy"
      }));

      void prefetchDeliveryOnlyOutput(key, requestBody);
    } catch (optionalError) {
      setError(
        optionalError instanceof Error
          ? optionalError.message
          : `Something went wrong while generating ${errorLabel}.`
      );
    } finally {
      switch (key) {
        case "actionList":
          setIsActionListLoading(false);
          break;
        case "internalUpdate":
          setIsInternalLoading(false);
          break;
        case "externalUpdate":
          setIsExternalLoading(false);
          break;
      }
    }
  };

  const handleGenerateActionList = async () => {
    setActiveTab("actions");

    await handleGenerateFilterableOutput("actionList", "the action list", {
      transcript,
      outputType: "action-list"
    });
  };

  const handleGenerateOptionalOutput = async (
    key: Extract<OutputCardKey, "externalUpdate" | "internalUpdate">,
    errorLabel: string
  ) => {
    setActiveTab(key === "internalUpdate" ? "internal" : "external");

    await handleGenerateFilterableOutput(key, errorLabel, {
      transcript,
      ...(key === "internalUpdate" ? { includeInternal: true } : { includeExternal: true })
    });
  };

  const handleSetOptionalOutputMode = (key: OptionalOutputKey, mode: OptionalFilterMode) => {
    const cardState = optionalOutputCache[key];

    if (cardState.activeMode === mode) {
      return;
    }

    if (mode === "default") {
      posthog?.capture("delivery_filter_removed", {
        output_type: getDeliveryFilterOutputType(key)
      });
      setOptionalOutputCache((current) => ({
        ...current,
        [key]: {
          ...current[key],
          activeMode: "default",
          pendingMode: null,
          showDeliveryError: false
        }
      }));
      return;
    }

    posthog?.capture("delivery_filter_applied", {
      output_type: getDeliveryFilterOutputType(key)
    });

    if (cardState.deliveryOutput) {
      setOptionalOutputCache((current) => ({
        ...current,
        [key]: {
          ...current[key],
          activeMode: "delivery",
          showDeliveryError: false
        }
      }));
      return;
    }

    if (cardState.deliveryOutputLoading) {
      setOptionalOutputCache((current) => ({
        ...current,
        [key]: {
          ...current[key],
          pendingMode: "delivery",
          showDeliveryError: false
        }
      }));
      return;
    }

    if (cardState.deliveryOutputError) {
      setOptionalOutputCache((current) => ({
        ...current,
        [key]: {
          ...current[key],
          showDeliveryError: true
        }
      }));
      return;
    }

    console.warn(
      "delivery filter toggle: unexpected state — no output, no loading, no error for key",
      key,
      cardState
    );
  };

  const handleSampleClick = (value: string) => {
    setTranscript(value);
    setError("");
  };

  const handleCopy = async (key: OutputCardKey, value: string) => {
    if (!value) {
      return;
    }

    try {
      await navigator.clipboard.writeText(value);

      posthog?.capture("output_copied", {
        output: getCopiedOutputAnalyticsType(key)
      });

      setCopyLabels((current) => ({
        ...current,
        [key]: "Copied"
      }));
      window.setTimeout(() => {
        setCopyLabels((current) => ({
          ...current,
          [key]: "Copy"
        }));
      }, 3000);
    } catch {
      setCopyLabels((current) => ({
        ...current,
        [key]: "Copy failed"
      }));
      window.setTimeout(() => {
        setCopyLabels((current) => ({
          ...current,
          [key]: "Copy"
        }));
      }, 3000);
    }
  };

  const handleWeeklyLengthClick = async (mode: WeeklyLengthMode) => {
    if (mode === "default") {
      setWeeklyLengthMode("default");
      await handleResetToDefault();
      return;
    }

    setWeeklyLengthMode(mode);
    await handleAdjustWeeklyUpdateLength(mode);
  };

  const renderOptionalPlaceholder = (
    title: string,
    description: string,
    action: () => void,
    label: string,
    isLoading: boolean
  ) => (
    <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 text-center mobile:min-h-[220px]">
      <p className="font-sans text-[16px] text-text-muted">{description}</p>
      <button
        className="rounded border border-border-line bg-bg-surface px-4 py-[10px] font-sans text-[14px] font-medium text-text-ink-soft"
        onClick={action}
        type="button"
      >
        {isLoading ? `Generating ${title}...` : label}
      </button>
    </div>
  );

  return (
    <main className="min-h-screen bg-bg-paper text-text-ink">
      <header className="border-b border-border-line bg-bg-surface px-7 py-4 mobile:px-4 mobile:py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center text-[14px] mobile:text-[15px]">
            <span className="font-sans font-bold text-text-ink">Updateflow</span>
            <span className="text-text-muted">.ai</span>
            <span className="ml-3 rounded-full border border-border-line px-2 py-[3px] font-mono text-mono-caption text-text-muted">
              w/c 28 apr
            </span>
          </div>
          <div className="flex items-center">
            <span className="font-sans text-[13px] text-text-muted mobile:hidden">
              Names anonymised
            </span>
            <span className="mx-3 h-4 w-px bg-line mobile:hidden" />
            <span className="ml-3 flex h-7 w-7 items-center justify-center rounded-full bg-ink font-mono text-mono-caption text-bg-paper">
              JR
            </span>
          </div>
        </div>
      </header>

      <div className="grid min-h-[920px] grid-cols-[1fr_1.1fr] border-t border-border-line mobile:flex mobile:flex-col">
        <section className="border-r border-border-line bg-bg-paper mobile:border-r-0">
          <div className="flex items-center justify-between px-7 pb-4 pt-5 mobile:px-4">
            <span className="font-mono text-mono-caption uppercase tracking-[0.1em] text-text-muted">
              ① Paste notes
            </span>
            <span className="font-mono text-mono-caption text-text-muted">
              {transcript.length.toLocaleString()} / 25,000
            </span>
          </div>

          <div className="flex flex-wrap gap-2 px-7 pb-4 mobile:px-4">
            {sampleTranscripts.map((sample) => {
              const isActive = transcript === sample.transcript;

              return (
                <button
                  key={sample.id}
                  type="button"
                  className={`rounded-full px-[10px] py-[5px] font-mono text-mono-caption ${
                    isActive
                      ? "border border-text-accent bg-bg-accent-soft text-text-accent"
                      : "border border-border-line bg-bg-surface text-text-ink-soft"
                  }`}
                  onClick={() => handleSampleClick(sample.transcript)}
                >
                  {sample.label}
                </button>
              );
            })}
          </div>

          <div className="flex h-full flex-col px-7 pb-7 mobile:px-4 mobile:pb-5">
            <form className="flex h-full flex-col" onSubmit={handleSubmit}>
              <textarea
                className="min-h-[240px] flex-1 resize-none whitespace-pre-wrap rounded border border-border-line bg-bg-surface p-[18px] font-mono text-mono-input leading-[1.65] text-text-ink-soft mobile:max-h-[180px] mobile:text-mono-caption"
                value={transcript}
                onChange={(event) => setTranscript(event.target.value)}
                placeholder="Paste your notes from this week: rough bullets, Copilot or Zoom summaries, Teams notes, or anything from the meeting."
              />
              <div className="mt-4 flex items-center gap-3 mobile:flex-col mobile:items-stretch">
                <button
                  className="rounded bg-bg-accent px-4 py-[10px] font-sans text-[14px] font-medium text-text-accent-ink disabled:cursor-not-allowed disabled:opacity-60 mobile:w-full"
                  type="submit"
                  disabled={isWeeklyUpdateLoading}
                >
                  {isWeeklyUpdateLoading
                    ? "Generating weekly update..."
                    : "Generate weekly update →"}
                </button>
                <span className="font-mono text-mono-caption text-text-muted mobile:hidden">
                  ⌘↵ to run
                </span>
                <span className="ml-auto font-sans text-[12px] text-text-muted mobile:hidden">
                  Names anonymised on output
                </span>
              </div>
              {error && (
                <p className="mt-2 font-sans text-[13px] text-error">{error}</p>
              )}
            </form>
          </div>
        </section>

        <section className="bg-bg-surface">
          <div className="flex items-center justify-between px-7 pb-0 pt-5 mobile:px-4">
            <span className="font-mono text-mono-caption uppercase tracking-[0.1em] text-text-muted">
              ② This week&apos;s documents
            </span>
            {showGeneratedIndicator && (
              <span className="font-mono text-mono-caption text-text-accent">
                ● generated 0:21
              </span>
            )}
          </div>

          <div className="mt-4 flex gap-1 overflow-x-auto border-b border-border-line px-7 mobile:px-4 mobile:whitespace-nowrap [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              className={`border-b-2 px-[14px] py-3 font-sans text-[14px] ${
                activeTab === "weekly"
                  ? "border-b-bg-accent text-text-ink"
                  : "border-b-transparent text-text-muted"
              } mobile:text-[13px]`}
              onClick={() => setActiveTab("weekly")}
            >
              Weekly update
            </button>
            <button
              type="button"
              className={`border-b-2 px-[14px] py-3 font-sans text-[14px] ${
                activeTab === "actions"
                  ? "border-b-bg-accent text-text-ink"
                  : "border-b-transparent text-text-muted"
              } mobile:text-[13px]`}
              onClick={() => setActiveTab("actions")}
            >
              Action list{actionCount > 0 ? ` · ${actionCount}` : ""}
            </button>
            <button
              type="button"
              className={`border-b-2 px-[14px] py-3 font-sans text-[14px] ${
                activeTab === "internal"
                  ? "border-b-bg-accent text-text-ink"
                  : "border-b-transparent text-text-muted"
              } mobile:text-[13px]`}
              onClick={() => setActiveTab("internal")}
            >
              Internal
            </button>
            <button
              type="button"
              className={`border-b-2 px-[14px] py-3 font-sans text-[14px] ${
                activeTab === "external"
                  ? "border-b-bg-accent text-text-ink"
                  : "border-b-transparent text-text-muted"
              } mobile:text-[13px]`}
              onClick={() => setActiveTab("external")}
            >
              External
            </button>
          </div>

          <div className="p-7 mobile:p-5">
            {activeTab === "weekly" && (
              <>
                {!displayedWeeklyUpdate ? (
                  <div className="flex min-h-[320px] items-center justify-center mobile:min-h-[220px]">
                    <p className="font-sans text-[16px] text-text-muted">
                      Your weekly update will appear here.
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="mb-5 font-mono text-mono-caption uppercase tracking-[0.06em] text-text-muted">
                      Weekly update
                    </p>
                    <div className="whitespace-pre-wrap font-sans text-[16px] leading-[1.65] text-text-ink">
                      {displayedWeeklyUpdate}
                    </div>
                    <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-dashed border-border-line pt-4">
                      <button
                        type="button"
                        className={`rounded px-3 py-[6px] font-sans text-[12px] ${
                          weeklyLengthMode === "shorter"
                            ? "border border-text-accent bg-bg-accent-soft text-text-accent"
                            : "border border-border-line bg-bg-surface text-text-ink-soft"
                        }`}
                        onClick={() => void handleWeeklyLengthClick("shorter")}
                        disabled={isWeeklyUpdateLoading}
                      >
                        Shorter
                      </button>
                      <button
                        type="button"
                        className={`rounded px-3 py-[6px] font-sans text-[12px] ${
                          weeklyLengthMode === "default"
                            ? "border border-text-accent bg-bg-accent-soft text-text-accent"
                            : "border border-border-line bg-bg-surface text-text-ink-soft"
                        }`}
                        onClick={() => void handleWeeklyLengthClick("default")}
                        disabled={isWeeklyUpdateLoading}
                      >
                        Default
                      </button>
                      <button
                        type="button"
                        className={`rounded px-3 py-[6px] font-sans text-[12px] ${
                          weeklyLengthMode === "more_detail"
                            ? "border border-text-accent bg-bg-accent-soft text-text-accent"
                            : "border border-border-line bg-bg-surface text-text-ink-soft"
                        }`}
                        onClick={() => void handleWeeklyLengthClick("more_detail")}
                        disabled={isWeeklyUpdateLoading}
                      >
                        More detail
                      </button>
                      <span className="mx-1 h-4 w-px self-center bg-line mobile:hidden" />
                      <button
                        type="button"
                        className="ml-auto rounded bg-bg-accent px-[14px] py-[8px] font-sans text-[13px] text-text-accent-ink mobile:ml-0 mobile:mt-2 mobile:w-full"
                        onClick={() => void handleCopy("shortStatus", displayedWeeklyUpdate)}
                      >
                        {copyLabels.shortStatus === "Copied"
                          ? "Copied ✓"
                          : (copyLabels.shortStatus ?? "Copy")}
                      </button>
                    </div>
                  </>
                )}
              </>
            )}

            {activeTab === "actions" && (
              <>
                {isActionListLoading ? (
                  <div className="flex min-h-[320px] items-center justify-center mobile:min-h-[220px]">
                    <p className="font-sans text-[16px] text-text-muted">
                      Generating Action List...
                    </p>
                  </div>
                ) : !actionListOutput ? (
                  <>
                    {/* Spec gap: the redesign does not define a desktop control for generating
                        optional outputs, so each optional tab exposes its existing handler
                        through a local placeholder action to keep add-to-pack flows reachable. */}
                    {renderOptionalPlaceholder(
                      "Action List",
                      "Your action list will appear here.",
                      () => void handleGenerateActionList(),
                      "Generate Action List →",
                      isActionListLoading
                    )}
                  </>
                ) : (
                  <>
                    <p className="mb-5 font-mono text-mono-caption uppercase tracking-[0.06em] text-text-muted">
                      Actions
                    </p>
                    {parsedActionRows ? (
                      <div className="grid gap-0">
                        {parsedActionRows.map((row) => (
                          <div
                            key={`${row.number}-${row.action}`}
                            className="grid grid-cols-[20px_80px_1fr_90px_70px] items-center gap-[14px] border-b border-border-line-soft py-3 mobile:block"
                          >
                            <div className="font-mono text-[12px] text-text-muted mobile:hidden">
                              {row.number}
                            </div>
                            <div className="font-sans text-[14px] font-semibold text-text-ink mobile:mb-1 mobile:flex mobile:items-center mobile:justify-between">
                              <span>{row.owner}</span>
                              <span className="hidden mobile:flex mobile:items-center mobile:gap-2">
                                <span className="font-mono text-[12px] font-normal text-text-muted">
                                  {row.due}
                                </span>
                                <span
                                  className={`rounded-full px-2 py-[3px] font-mono text-[10px] font-semibold uppercase tracking-[0.06em] ${getPriorityPillClasses(row.priority)}`}
                                >
                                  {row.priority}
                                </span>
                              </span>
                            </div>
                            <div className="font-sans text-[14px] text-text-ink-soft mobile:pl-6 mobile:text-[13px]">
                              {row.action}
                            </div>
                            <div className="font-mono text-[12px] text-text-muted mobile:hidden">
                              {row.due}
                            </div>
                            <div className="mobile:hidden">
                              <span
                                className={`rounded-full px-2 py-[3px] font-mono text-[10px] font-semibold uppercase tracking-[0.06em] ${getPriorityPillClasses(row.priority)}`}
                              >
                                {row.priority}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap font-sans text-[16px] leading-[1.65] text-text-ink">
                        {actionListOutput}
                      </div>
                    )}
                    <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-dashed border-border-line pt-4">
                      <button
                        type="button"
                        className={`rounded px-3 py-[6px] font-sans text-[12px] ${
                          optionalOutputCache.actionList.activeMode === "default"
                            ? "border border-text-accent bg-bg-accent-soft text-text-accent"
                            : "border border-border-line bg-bg-surface text-text-ink-soft"
                        }`}
                        aria-pressed={optionalOutputCache.actionList.activeMode === "default"}
                        onClick={() => handleSetOptionalOutputMode("actionList", "default")}
                      >
                        Default
                      </button>
                      <button
                        type="button"
                        className={`rounded px-3 py-[6px] font-sans text-[12px] ${
                          optionalOutputCache.actionList.activeMode === "delivery"
                            ? "border border-text-accent bg-bg-accent-soft text-text-accent"
                            : "border border-border-line bg-bg-surface text-text-ink-soft"
                        }`}
                        aria-pressed={optionalOutputCache.actionList.activeMode === "delivery"}
                        onClick={() => handleSetOptionalOutputMode("actionList", "delivery")}
                        disabled={
                          optionalOutputCache.actionList.deliveryOutputLoading &&
                          optionalOutputCache.actionList.pendingMode === "delivery"
                        }
                      >
                        Delivery only
                      </button>
                      {optionalOutputCache.actionList.deliveryOutputLoading &&
                        optionalOutputCache.actionList.pendingMode === "delivery" && (
                          <span className="font-sans text-[12px] text-text-muted">
                            Preparing Delivery only...
                          </span>
                        )}
                      {optionalOutputCache.actionList.showDeliveryError && (
                        <span className="font-sans text-[12px] text-error">
                          Delivery only is unavailable right now.
                        </span>
                      )}
                      <button
                        type="button"
                        className="ml-auto rounded bg-bg-accent px-[14px] py-[8px] font-sans text-[13px] text-text-accent-ink mobile:ml-0 mobile:mt-2 mobile:w-full"
                        onClick={() => void handleCopy("actionList", actionListOutput)}
                      >
                        {copyLabels.actionList === "Copied"
                          ? "Copied ✓"
                          : (copyLabels.actionList ?? "Copy")}
                      </button>
                    </div>
                  </>
                )}
              </>
            )}

            {activeTab === "internal" && (
              <>
                {isInternalLoading ? (
                  <div className="flex min-h-[320px] items-center justify-center mobile:min-h-[220px]">
                    <p className="font-sans text-[16px] text-text-muted">
                      Generating Internal Update...
                    </p>
                  </div>
                ) : !internalOutput ? (
                  renderOptionalPlaceholder(
                    "Internal Update",
                    "Your internal update will appear here.",
                    () => void handleGenerateOptionalOutput("internalUpdate", "the internal update"),
                    "Generate Internal Update →",
                    isInternalLoading
                  )
                ) : (
                  <>
                    <p className="mb-5 font-mono text-mono-caption uppercase tracking-[0.06em] text-text-muted">
                      Internal update
                    </p>
                    <div className="whitespace-pre-wrap font-sans text-[16px] leading-[1.65] text-text-ink">
                      {internalOutput}
                    </div>
                    <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-dashed border-border-line pt-4">
                      <button
                        type="button"
                        className={`rounded px-3 py-[6px] font-sans text-[12px] ${
                          optionalOutputCache.internalUpdate.activeMode === "default"
                            ? "border border-text-accent bg-bg-accent-soft text-text-accent"
                            : "border border-border-line bg-bg-surface text-text-ink-soft"
                        }`}
                        aria-pressed={optionalOutputCache.internalUpdate.activeMode === "default"}
                        onClick={() => handleSetOptionalOutputMode("internalUpdate", "default")}
                      >
                        Default
                      </button>
                      <button
                        type="button"
                        className={`rounded px-3 py-[6px] font-sans text-[12px] ${
                          optionalOutputCache.internalUpdate.activeMode === "delivery"
                            ? "border border-text-accent bg-bg-accent-soft text-text-accent"
                            : "border border-border-line bg-bg-surface text-text-ink-soft"
                        }`}
                        aria-pressed={optionalOutputCache.internalUpdate.activeMode === "delivery"}
                        onClick={() => handleSetOptionalOutputMode("internalUpdate", "delivery")}
                        disabled={
                          optionalOutputCache.internalUpdate.deliveryOutputLoading &&
                          optionalOutputCache.internalUpdate.pendingMode === "delivery"
                        }
                      >
                        Delivery only
                      </button>
                      {optionalOutputCache.internalUpdate.deliveryOutputLoading &&
                        optionalOutputCache.internalUpdate.pendingMode === "delivery" && (
                          <span className="font-sans text-[12px] text-text-muted">
                            Preparing Delivery only...
                          </span>
                        )}
                      {optionalOutputCache.internalUpdate.showDeliveryError && (
                        <span className="font-sans text-[12px] text-error">
                          Delivery only is unavailable right now.
                        </span>
                      )}
                      <button
                        type="button"
                        className="ml-auto rounded bg-bg-accent px-[14px] py-[8px] font-sans text-[13px] text-text-accent-ink mobile:ml-0 mobile:mt-2 mobile:w-full"
                        onClick={() => void handleCopy("internalUpdate", internalOutput)}
                      >
                        {copyLabels.internalUpdate === "Copied"
                          ? "Copied ✓"
                          : (copyLabels.internalUpdate ?? "Copy")}
                      </button>
                    </div>
                  </>
                )}
              </>
            )}

            {activeTab === "external" && (
              <>
                {isExternalLoading ? (
                  <div className="flex min-h-[320px] items-center justify-center mobile:min-h-[220px]">
                    <p className="font-sans text-[16px] text-text-muted">
                      Generating External Update...
                    </p>
                  </div>
                ) : !externalOutput ? (
                  renderOptionalPlaceholder(
                    "External Update",
                    "Your external update will appear here.",
                    () => void handleGenerateOptionalOutput("externalUpdate", "the external update"),
                    "Generate External Update →",
                    isExternalLoading
                  )
                ) : (
                  <>
                    <p className="mb-5 font-mono text-mono-caption uppercase tracking-[0.06em] text-text-muted">
                      External update
                    </p>
                    <div className="whitespace-pre-wrap font-sans text-[16px] leading-[1.65] text-text-ink">
                      {externalOutput}
                    </div>
                    <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-dashed border-border-line pt-4">
                      <button
                        type="button"
                        className={`rounded px-3 py-[6px] font-sans text-[12px] ${
                          optionalOutputCache.externalUpdate.activeMode === "default"
                            ? "border border-text-accent bg-bg-accent-soft text-text-accent"
                            : "border border-border-line bg-bg-surface text-text-ink-soft"
                        }`}
                        aria-pressed={optionalOutputCache.externalUpdate.activeMode === "default"}
                        onClick={() => handleSetOptionalOutputMode("externalUpdate", "default")}
                      >
                        Default
                      </button>
                      <button
                        type="button"
                        className={`rounded px-3 py-[6px] font-sans text-[12px] ${
                          optionalOutputCache.externalUpdate.activeMode === "delivery"
                            ? "border border-text-accent bg-bg-accent-soft text-text-accent"
                            : "border border-border-line bg-bg-surface text-text-ink-soft"
                        }`}
                        aria-pressed={optionalOutputCache.externalUpdate.activeMode === "delivery"}
                        onClick={() => handleSetOptionalOutputMode("externalUpdate", "delivery")}
                        disabled={
                          optionalOutputCache.externalUpdate.deliveryOutputLoading &&
                          optionalOutputCache.externalUpdate.pendingMode === "delivery"
                        }
                      >
                        Delivery only
                      </button>
                      {optionalOutputCache.externalUpdate.deliveryOutputLoading &&
                        optionalOutputCache.externalUpdate.pendingMode === "delivery" && (
                          <span className="font-sans text-[12px] text-text-muted">
                            Preparing Delivery only...
                          </span>
                        )}
                      {optionalOutputCache.externalUpdate.showDeliveryError && (
                        <span className="font-sans text-[12px] text-error">
                          Delivery only is unavailable right now.
                        </span>
                      )}
                      <button
                        type="button"
                        className="ml-auto rounded bg-bg-accent px-[14px] py-[8px] font-sans text-[13px] text-text-accent-ink mobile:ml-0 mobile:mt-2 mobile:w-full"
                        onClick={() => void handleCopy("externalUpdate", externalOutput)}
                      >
                        {copyLabels.externalUpdate === "Copied"
                          ? "Copied ✓"
                          : (copyLabels.externalUpdate ?? "Copy")}
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          <section className="hidden border-t border-border-line px-4 py-5 mobile:block">
            <p className="font-mono text-mono-caption uppercase tracking-[0.08em] text-text-muted">
              Add to your pack
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <button
                type="button"
                className="rounded border border-border-line bg-bg-surface p-3 text-left"
                onClick={() => void handleGenerateActionList()}
                disabled={isActionListLoading || isWeeklyUpdateLoading}
              >
                <span className="block font-sans text-[14px] text-text-ink">Action list</span>
                <span className="mt-1 block font-mono text-mono-caption text-text-accent">
                  + ADD
                </span>
              </button>
              <button
                type="button"
                className="rounded border border-border-line bg-bg-surface p-3 text-left"
                onClick={() => void handleGenerateOptionalOutput("internalUpdate", "the internal update")}
                disabled={isInternalLoading || isWeeklyUpdateLoading}
              >
                <span className="block font-sans text-[14px] text-text-ink">
                  Internal update
                </span>
                <span className="mt-1 block font-mono text-mono-caption text-text-accent">
                  + ADD
                </span>
              </button>
              <button
                type="button"
                className="rounded border border-border-line bg-bg-surface p-3 text-left"
                onClick={() => void handleGenerateOptionalOutput("externalUpdate", "the external update")}
                disabled={isExternalLoading || isWeeklyUpdateLoading}
              >
                <span className="block font-sans text-[14px] text-text-ink">
                  External update
                </span>
                <span className="mt-1 block font-mono text-mono-caption text-text-accent">
                  + ADD
                </span>
              </button>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
