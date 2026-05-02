"use client";

import React, { FormEvent, useState } from "react";
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
      "Monday: Confirmed cutover window with infrastructure team for Saturday night. Vendor yet to provide final environment sign-off.\n\nTuesday: Sign-off still outstanding. Escalated to vendor account manager. Parallel workstream leads asked to review dependencies ahead of cutover.\n\nWednesday: Vendor confirmed environment ready. UAT entry criteria reviewed with QA lead â€” two outstanding defects flagged as potential blockers. Decision to defer lower-priority defect and proceed with UAT.\n\nThursday: UAT started. First round of test cases passed. One defect raised against the reporting module â€” under investigation. Client stakeholder briefed on status.\n\nFriday: UAT progressing. Reporting defect confirmed as low severity and deferred to post-go-live. Cutover plan confirmed for Saturday. Communications drafted and ready to send."
  },
  {
    id: "programme-update",
    label: "programme update",
    transcript:
      "Monday: Kick-off for new workstream completed. Three work packages assigned to stream leads. Resource gap identified in data migration track â€” flagged to PMO.\n\nTuesday: Data migration resource confirmed for two days per week. Dependencies mapped across all three workstreams. Risk log updated.\n\nWednesday: Steering group prep completed. Deck reviewed with sponsor. Two decisions required from steering: budget approval for additional QA resource and sign-off on revised go-live date.\n\nThursday: Steering group held. Budget approved. Go-live date moved to end of next month â€” agreed by all parties. Stream leads notified and plans being updated.\n\nFriday: Updated programme plan circulated. One stream lead flagged a risk around third-party API readiness. Added to RAID. Next week focus is confirming integration test schedule."
  },
  {
    id: "delivery-risk",
    label: "delivery risk",
    transcript:
      "- API integration delayed â€” vendor missed agreed delivery date\n- QA resource stretched across two workstreams this sprint\n- UAT entry criteria not yet signed off by client\n- Risk to UAT start date if API not delivered by Wednesday\n- PM to confirm revised timeline with vendor tomorrow"
  },
  {
    id: "action-heavy-week",
    label: "action-heavy week",
    transcript:
      "- Sarah to send updated RAID log by end of day Friday\n- Tom to confirm resource availability for integration workstream next week\n- Client to provide final sign-off on UAT test cases before Thursday\n- Team agreed to defer two lower-priority defects from release scope\n- Go-live readiness review scheduled for next Monday at 10am\n- Dependency on client security team for SSO approval still outstanding"
  }
] as const;

const outputCards: Array<{ key: Extract<OutputCardKey, "shortStatus">; title: string }> = [
  { key: "shortStatus", title: "Weekly Update" }
];

const optionalOutputCards: Array<{
  errorLabel: string;
  key: Extract<OutputCardKey, "actionList" | "externalUpdate" | "internalUpdate">;
  title: string;
}> = [
  { key: "actionList", title: "Action List", errorLabel: "the action list" },
  { key: "internalUpdate", title: "Internal Update", errorLabel: "the internal update" },
  { key: "externalUpdate", title: "External Update", errorLabel: "the external update" }
];

type OptionalOutputKey = (typeof optionalOutputCards)[number]["key"];
type OptionalFilterMode = "default" | "delivery";

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

  const primaryBtn =
    "inline-flex items-center justify-center py-3 px-6 bg-gradient-to-b from-[#0f8080] to-[#0a5f63] text-white text-[0.9rem] font-medium tracking-[0.01em] border-0 rounded-input font-sans cursor-pointer transition-colors transition-shadow duration-200 shadow-[0_2px_6px_rgba(13,115,119,0.35)] enabled:hover:bg-accent-hover enabled:hover:shadow-[0_4px_12px_rgba(13,115,119,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d7377] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

  const secondaryBtn =
    "inline-flex items-center justify-center py-3 px-5 bg-transparent text-accent text-[0.9rem] font-medium tracking-[0.01em] border-[1.5px] border-accent rounded-input font-sans cursor-pointer transition-colors duration-150 enabled:hover:bg-accent-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d7377] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

  const copyBtn =
    "inline-flex items-center justify-center py-[0.35rem] px-3 text-[0.8rem] font-medium text-muted bg-transparent border border-border rounded-input font-sans cursor-pointer transition-colors duration-150 hover:text-accent hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d7377] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

  const activeToggleBtn = `${copyBtn} border-accent text-accent bg-accent-light`;

  const cardClasses =
    "bg-card border border-border rounded-control p-6 mobile:p-4 mobile:rounded-card shadow-[0_2px_8px_rgba(0,0,0,0.06)]";

  const outputHeaderClasses =
    "flex items-center justify-between gap-4 pb-3 border-b border-border mb-4 mobile:grid mobile:grid-cols-1";

  const outputPanelBase =
    "min-h-[260px] p-4 border border-border rounded-control bg-card";

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
    } catch {
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
    await handleGenerateFilterableOutput("actionList", "the action list", {
      transcript,
      outputType: "action-list"
    });
  };

  const handleGenerateOptionalOutput = async (
    key: Extract<OutputCardKey, "externalUpdate" | "internalUpdate">,
    errorLabel: string
  ) => {
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
    }
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

  return (
    <main className="w-[min(960px,calc(100%_-_2rem))] mobile:w-[min(calc(100%_-_1rem),960px)] mx-auto pt-16 pb-20 mobile:pt-5 mobile:pb-8">
      <section className="hero mb-6">
        <Link
          className="inline-block mb-4 p-0 rounded-none bg-transparent border-0 text-accent text-[0.75rem] font-semibold tracking-[0.08em] uppercase font-sans no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d7377] focus-visible:ring-offset-2"
          href="/"
        >
          For project managers
        </Link>
        <h1 className="m-0 max-w-[12ch] mobile:max-w-none text-[clamp(2.5rem,6vw,4.5rem)] leading-tight text-text font-bold">
          Paste your notes. Get your weekly update.
        </h1>
        <p className="mt-4 text-muted font-sans text-[1.05rem] leading-relaxed">
          Paste rough notes, get your weekly update in seconds, then add what you need.
        </p>
      </section>

      <div className="grid gap-5">
        <section className={`${cardClasses} hover:shadow-[0_4px_16px_rgba(0,0,0,0.09)] transition-shadow duration-200`}>
          <form className="grid gap-3" onSubmit={handleSubmit}>
            <label className="grid gap-[0.55rem]">
              <span className="font-sans text-[0.95rem] font-semibold">
                Meeting notes or transcript
              </span>
              <small className="text-muted font-sans text-[0.88rem] leading-base">
                Works best with sanitised notes, or paste freely and let the output
                handle it.
              </small>
              <textarea
                className="w-full min-h-[320px] p-4 resize-y leading-base border border-border rounded-input bg-bg text-text font-sans transition-colors duration-150 focus-visible:border-[#0d7377] focus-visible:outline-none"
                value={transcript}
                onChange={(event) => setTranscript(event.target.value)}
                placeholder="Paste your notes from this week: rough bullets, Copilot or Zoom summaries, Teams notes, or anything from the meeting."
                rows={14}
              />
            </label>

            <p className={`text-right font-sans text-[0.82rem] ${transcript.length > 22500 ? "text-error" : "text-muted"}`}>
              {transcript.length.toLocaleString()} / 25,000
            </p>

            <p className="m-0 text-muted font-sans text-[0.82rem] font-semibold tracking-[0.02em]">
              Examples
            </p>
            <div className="flex flex-wrap gap-3 mobile:grid mobile:grid-cols-1" aria-label="Sample transcript buttons">
              {sampleTranscripts.map((sample) => (
                <button
                  key={sample.id}
                  type="button"
                  className="inline-flex items-center py-[0.55rem] px-4 bg-card text-muted text-[0.8rem] font-medium border border-border rounded-input font-sans cursor-pointer transition-colors duration-150 hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d7377] focus-visible:ring-offset-2"
                  onClick={() => handleSampleClick(sample.transcript)}
                >
                  {sample.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-y-3 gap-x-4">
              <button className={primaryBtn} type="submit" disabled={isWeeklyUpdateLoading}>
                {isWeeklyUpdateLoading ? "Generating weekly update..." : "Generate weekly update"}
              </button>
              {error && <p className="m-0 text-error text-[0.88rem] font-sans">{error}</p>}
            </div>
          </form>
        </section>

        <section className="grid gap-5">
          {outputCards.map((card) => {
            const value = displayedWeeklyUpdate;
            const copyState = copyLabels[card.key] ?? "Copy";

            return (
              <section key={card.key} className={`${cardClasses} grid gap-4`}>
                <div className={outputHeaderClasses}>
                  <div>
                    <h2 className="m-0 text-2xl font-semibold">{card.title}</h2>
                  </div>
                  <button
                    type="button"
                    className={copyBtn}
                    onClick={() => handleCopy(card.key, value)}
                    disabled={!value}
                  >
                    {copyState}
                    <span aria-live="polite" className="sr-only">
                      {copyState === "Copied" ? "Copied to clipboard" : ""}
                    </span>
                  </button>
                </div>

                <div className={`${outputPanelBase}${!value ? " grid place-items-center" : ""}`}>
                  {isWeeklyUpdateLoading ? (
                    <p className="m-0 text-muted text-base font-sans animate-pulse-opacity">
                      Generating weekly update...
                    </p>
                  ) : value ? (
                    <pre className="m-0 whitespace-pre-wrap break-words text-base font-sans leading-base">
                      {value}
                    </pre>
                  ) : (
                    <p className="m-0 text-muted text-base font-sans">
                      Your 2-3 sentence weekly update will appear here.
                    </p>
                  )}
                </div>

                {value && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={copyBtn}
                      onClick={() => handleAdjustWeeklyUpdateLength("shorter")}
                      disabled={isWeeklyUpdateLoading}
                    >
                      Shorter
                    </button>
                    <button
                      type="button"
                      className={copyBtn}
                      onClick={() => handleAdjustWeeklyUpdateLength("more_detail")}
                      disabled={isWeeklyUpdateLoading}
                    >
                      More detail
                    </button>
                    <button
                      type="button"
                      className={copyBtn}
                      onClick={handleResetToDefault}
                      disabled={isWeeklyUpdateLoading || !defaultWeeklyUpdate}
                    >
                      Reset to default
                    </button>
                  </div>
                )}
              </section>
            );
          })}

          <section className="grid gap-3">
            <p className="m-0 text-muted font-sans text-[0.82rem] font-semibold tracking-[0.02em]">
              Add to your pack
            </p>
            <div className="flex justify-start flex-wrap gap-3">
              {optionalOutputCards.map((card) => {
                const isLoading =
                  card.key === "actionList"
                    ? isActionListLoading
                    : card.key === "internalUpdate"
                      ? isInternalLoading
                      : isExternalLoading;

                const loadingLabel =
                  card.key === "actionList"
                    ? "Generating Action List..."
                    : card.key === "internalUpdate"
                      ? "Generating Internal Update..."
                      : "Generating External Update...";

                return (
                  <button
                    key={card.key}
                    type="button"
                    className={`${secondaryBtn} mobile:w-full`}
                    onClick={() =>
                      card.key === "actionList"
                        ? handleGenerateActionList()
                        : handleGenerateOptionalOutput(card.key, card.errorLabel)
                    }
                    disabled={isWeeklyUpdateLoading || isLoading}
                  >
                    {isLoading ? loadingLabel : card.title}
                  </button>
                );
              })}
            </div>
          </section>

          {optionalOutputCards.map((card) => {
            const cardState = optionalOutputCache[card.key];
            const value =
              cardState.activeMode === "delivery" && cardState.deliveryOutput
                ? cardState.deliveryOutput
                : cardState.defaultOutput;
            const isCardLoading =
              card.key === "actionList"
                ? isActionListLoading
                : card.key === "internalUpdate"
                  ? isInternalLoading
                  : isExternalLoading;
            const copyState = copyLabels[card.key] ?? "Copy";

            if (!isCardLoading && !value) {
              return null;
            }

            return (
              <section key={card.key} className={`${cardClasses} grid gap-4`}>
                <div className={outputHeaderClasses}>
                  <div>
                    <h2 className="m-0 text-2xl font-semibold">{card.title}</h2>
                  </div>
                  <button
                    type="button"
                    className={copyBtn}
                    onClick={() => handleCopy(card.key, value)}
                    disabled={!value}
                  >
                    {copyState}
                    <span aria-live="polite" className="sr-only">
                      {copyState === "Copied" ? "Copied to clipboard" : ""}
                    </span>
                  </button>
                </div>

                <div className={`${outputPanelBase}${!value ? " grid place-items-center" : ""}`}>
                  {isCardLoading ? (
                    <p className="m-0 text-muted text-base font-sans animate-pulse-opacity">
                      {card.key === "actionList"
                        ? "Generating Action List..."
                        : card.key === "internalUpdate"
                          ? "Generating Internal Update..."
                          : "Generating External Update..."}
                    </p>
                  ) : value ? (
                    <pre className="m-0 whitespace-pre-wrap break-words text-base font-sans leading-base">
                      {value}
                    </pre>
                  ) : (
                    <p className="m-0 text-muted text-base font-sans">
                      {card.key === "actionList"
                        ? "Actions with owners and priorities will appear here."
                        : card.key === "internalUpdate"
                          ? "Your internal team update will appear here."
                          : "Your stakeholder-facing update will appear here."}
                    </p>
                  )}
                </div>

                {value && (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className={cardState.activeMode === "default" ? activeToggleBtn : copyBtn}
                      onClick={() => handleSetOptionalOutputMode(card.key, "default")}
                      disabled={cardState.activeMode === "default"}
                    >
                      Default
                    </button>
                    <button
                      type="button"
                      className={cardState.activeMode === "delivery" ? activeToggleBtn : copyBtn}
                      onClick={() => handleSetOptionalOutputMode(card.key, "delivery")}
                      disabled={
                        cardState.activeMode === "delivery" ||
                        (cardState.deliveryOutputLoading && cardState.pendingMode === "delivery")
                      }
                    >
                      Delivery only
                    </button>
                    {cardState.deliveryOutputLoading && cardState.pendingMode === "delivery" && (
                      <span className="text-muted text-[0.8rem] font-sans">
                        Preparing Delivery only...
                      </span>
                    )}
                    {cardState.showDeliveryError && (
                      <span className="text-error text-[0.8rem] font-sans">
                        Delivery only is unavailable right now.
                      </span>
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </section>
      </div>
    </main>
  );
}
