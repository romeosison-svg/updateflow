"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import type { GeneratedOutputs, OutputCardKey } from "@/lib/output";

const sampleTranscripts = [
  {
    id: "delivery-risk",
    label: "delivery risk",
    transcript:
      "Migration testing is behind plan after the vendor environment was delivered late. The Project Manager flagged a risk that UAT could slip by one week unless test data is approved by Friday. The client stakeholder agreed to review the blocker and the engineering lead will confirm the revised cutover approach tomorrow."
  },
  {
    id: "stakeholder-update",
    label: "stakeholder update",
    transcript:
      "This week the team completed the reporting dashboard build and finished finance sign-off on the new workflow. A dependency remains on the client security team to approve SSO changes. No current delivery issue was raised, but there is a risk to timeline if approval moves past next Wednesday. Next week the team will begin pilot onboarding and prepare the go-live checklist."
  },
  {
    id: "action-heavy",
    label: "action-heavy meeting",
    transcript:
      "Sarah will send the RAID log update by end of day. Tom to confirm resource availability for the integration workstream. Client to provide final API documentation before Tuesday. The team agreed to review open defects on Thursday and decide whether to defer two lower-priority items from release scope."
  },
  {
    id: "sanitised-client-notes",
    label: "sanitised client notes",
    transcript:
      "Client stakeholder raised concern about readiness of reporting dashboard ahead of UAT. API integration remains dependent on external vendor delivery. Project Manager to confirm revised timeline and communicate impact."
  }
] as const;

const outputCards: Array<{ key: Extract<OutputCardKey, "shortStatus">; title: string }> = [
  { key: "shortStatus", title: "Weekly Update" }
];

const optionalOutputCards: Array<{
  errorLabel: string;
  key: Extract<OutputCardKey, "actionList" | "externalUpdate" | "internalUpdate" | "raid">;
  title: string;
}> = [
  { key: "actionList", title: "Action List", errorLabel: "the action list" },
  { key: "internalUpdate", title: "Internal Update", errorLabel: "the internal update" },
  { key: "externalUpdate", title: "External Update", errorLabel: "the external update" },
  { key: "raid", title: "RAID Log", errorLabel: "the RAID log" }
];

export default function ToolPage() {
  const [transcript, setTranscript] = useState("");
  const [outputs, setOutputs] = useState<GeneratedOutputs | null>(null);
  const [error, setError] = useState("");
  const [isActionListLoading, setIsActionListLoading] = useState(false);
  const [isExternalLoading, setIsExternalLoading] = useState(false);
  const [isInternalLoading, setIsInternalLoading] = useState(false);
  const [isRaidLoading, setIsRaidLoading] = useState(false);
  const [isWeeklyUpdateLoading, setIsWeeklyUpdateLoading] = useState(false);
  const [copyLabels, setCopyLabels] = useState<
    Partial<Record<OutputCardKey, string>>
  >({});

  const primaryBtn =
    "inline-flex items-center justify-center py-3 px-6 bg-gradient-to-b from-[#0f8080] to-[#0a5f63] text-white text-[0.9rem] font-medium tracking-[0.01em] border-0 rounded-input font-sans cursor-pointer transition-colors transition-shadow duration-200 shadow-[0_2px_6px_rgba(13,115,119,0.35)] enabled:hover:bg-accent-hover enabled:hover:shadow-[0_4px_12px_rgba(13,115,119,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d7377] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

  const secondaryBtn =
    "inline-flex items-center justify-center py-3 px-5 bg-transparent text-accent text-[0.9rem] font-medium tracking-[0.01em] border-[1.5px] border-accent rounded-input font-sans cursor-pointer transition-colors duration-150 enabled:hover:bg-accent-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d7377] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

  const copyBtn =
    "inline-flex items-center justify-center py-[0.35rem] px-3 text-[0.8rem] font-medium text-muted bg-transparent border border-border rounded-input font-sans cursor-pointer transition-colors duration-150 hover:text-accent hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d7377] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

  const cardClasses =
    "bg-card border border-border rounded-control p-6 mobile:p-4 mobile:rounded-card shadow-[0_2px_8px_rgba(0,0,0,0.06)]";

  const outputHeaderClasses =
    "flex items-center justify-between gap-4 pb-3 border-b border-border mb-4 mobile:grid mobile:grid-cols-1";

  const outputPanelBase =
    "min-h-[260px] p-4 border border-border rounded-control bg-card";

  const generateWeeklyUpdate = async (
    options?: {
      lengthInstruction?: string;
      resetSupplementaryOutputs?: boolean;
    }
  ) => {
    if (!transcript.trim()) {
      if (options?.resetSupplementaryOutputs) {
        setOutputs(null);
        setCopyLabels({});
      }
      setError("Paste some meeting notes or a transcript before generating.");
      return;
    }

    setError("");
    setIsWeeklyUpdateLoading(true);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          transcript,
          lengthInstruction: options?.lengthInstruction
        })
      });

      const data = (await response.json()) as { outputs?: GeneratedOutputs; error?: string };

      if (!response.ok || !data.outputs) {
        throw new Error(data.error ?? "Something went wrong while generating the outputs.");
      }

      setOutputs((current) => {
        const nextOutputs = options?.resetSupplementaryOutputs
          ? {}
          : (current ?? {});

        return {
          ...nextOutputs,
          shortStatus: data.outputs?.shortStatus ?? ""
        };
      });
      setCopyLabels((current) => ({
        ...(options?.resetSupplementaryOutputs ? {} : current),
        shortStatus: "Copy"
      }));
    } catch (generationError) {
      if (options?.resetSupplementaryOutputs) {
        setOutputs(null);
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
      resetSupplementaryOutputs: true
    });
  };

  const handleGenerateActionList = async () => {
    if (!transcript.trim()) {
      setError("Paste some meeting notes or a transcript before generating the action list.");
      return;
    }

    setError("");
    setIsActionListLoading(true);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          transcript,
          outputType: "action-list"
        })
      });

      const data = (await response.json()) as { outputs?: GeneratedOutputs; error?: string };
      const value = data.outputs?.actionList;

      if (!response.ok || !value) {
        throw new Error(data.error ?? "Something went wrong while generating the action list.");
      }

      setOutputs((current) => ({
        ...(current ?? {}),
        actionList: value
      }));
      setCopyLabels((current) => ({
        ...current,
        actionList: "Copy"
      }));
    } catch (actionListError) {
      setError(
        actionListError instanceof Error
          ? actionListError.message
          : "Something went wrong while generating the action list."
      );
    } finally {
      setIsActionListLoading(false);
    }
  };

  const handleGenerateOptionalOutput = async (
    key: Extract<OutputCardKey, "externalUpdate" | "internalUpdate" | "raid">,
    errorLabel: string
  ) => {
    if (!transcript.trim()) {
      setError(`Paste some meeting notes or a transcript before generating ${errorLabel}.`);
      return;
    }

    setError("");

    switch (key) {
      case "internalUpdate":
        setIsInternalLoading(true);
        break;
      case "externalUpdate":
        setIsExternalLoading(true);
        break;
      case "raid":
        setIsRaidLoading(true);
        break;
    }

    try {
      const requestBody: {
        transcript: string;
        includeExternal?: boolean;
        includeInternal?: boolean;
        includeRaid?: boolean;
      } = {
        transcript
      };

      if (key === "internalUpdate") {
        requestBody.includeInternal = true;
      } else if (key === "externalUpdate") {
        requestBody.includeExternal = true;
      } else {
        requestBody.includeRaid = true;
      }

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
      });

      const data = (await response.json()) as { outputs?: GeneratedOutputs; error?: string };
      const value = data.outputs?.[key];

      if (!response.ok || !value) {
        throw new Error(data.error ?? `Something went wrong while generating ${errorLabel}.`);
      }

      setOutputs((current) => ({
        ...(current ?? {}),
        [key]: value
      }));
      setCopyLabels((current) => ({
        ...current,
        [key]: "Copy"
      }));
    } catch (optionalError) {
      setError(
        optionalError instanceof Error
          ? optionalError.message
          : `Something went wrong while generating ${errorLabel}.`
      );
    } finally {
      switch (key) {
        case "internalUpdate":
          setIsInternalLoading(false);
          break;
        case "externalUpdate":
          setIsExternalLoading(false);
          break;
        case "raid":
          setIsRaidLoading(false);
          break;
      }
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
                Works best with sanitised notes or paste freely and let the output
                handle it.
              </small>
              <textarea
                className="w-full min-h-[320px] p-4 resize-y leading-base border border-border rounded-input bg-bg text-text font-sans transition-colors duration-150 focus-visible:border-[#0d7377] focus-visible:outline-none"
                value={transcript}
                onChange={(event) => setTranscript(event.target.value)}
                placeholder="Paste your notes from this week — rough bullets, Copilot summaries, or anything from the meeting."
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

            <p className="m-0 text-muted font-sans text-[0.88rem] leading-base">
              Sensitive names and details will be anonymised in the output.
            </p>

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
            const value = outputs?.[card.key] ?? "";
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
                      onClick={() =>
                        generateWeeklyUpdate({
                          lengthInstruction:
                            "Make the output shorter. Aim for 1-2 tight sentences maximum."
                        })
                      }
                      disabled={isWeeklyUpdateLoading}
                    >
                      Shorter
                    </button>
                    <button
                      type="button"
                      className={copyBtn}
                      onClick={() =>
                        generateWeeklyUpdate({
                          lengthInstruction:
                            "Expand the output slightly. Aim for 3-4 sentences. Add more specific delivery context where it is clearly supported by the input."
                        })
                      }
                      disabled={isWeeklyUpdateLoading}
                    >
                      More detail
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
                      : card.key === "externalUpdate"
                        ? isExternalLoading
                        : isRaidLoading;

                const loadingLabel =
                  card.key === "actionList"
                    ? "Generating Action List..."
                    : card.key === "internalUpdate"
                      ? "Generating Internal Update..."
                      : card.key === "externalUpdate"
                        ? "Generating External Update..."
                        : "Generating RAID...";

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
            const value = outputs?.[card.key] ?? "";
            const isCardLoading =
              card.key === "actionList"
                ? isActionListLoading
                : card.key === "internalUpdate"
                  ? isInternalLoading
                  : card.key === "externalUpdate"
                    ? isExternalLoading
                    : isRaidLoading;
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
                          : card.key === "externalUpdate"
                            ? "Generating External Update..."
                            : "Generating RAID..."}
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
                        : card.key === "externalUpdate"
                          ? "Your stakeholder-facing update will appear here."
                          : "Risks, assumptions, issues, and dependencies will appear here."}
                    </p>
                  )}
                </div>
              </section>
            );
          })}
        </section>
      </div>
    </main>
  );
}
