"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import type { GeneratedOutputs, OutputCardKey, RaidOutput } from "@/lib/output";

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

const outputCards: Array<{ key: OutputCardKey; title: string }> = [
  { key: "shortStatus", title: "Status Update" },
  { key: "actionList", title: "Action List" }
];

const optionalOutputCards: Array<{ key: Extract<OutputCardKey, "externalUpdate" | "internalUpdate">; title: string }> = [
  { key: "internalUpdate", title: "Internal Update" },
  { key: "externalUpdate", title: "External Update" }
];

export default function ToolPage() {
  const [transcript, setTranscript] = useState("");
  const [outputs, setOutputs] = useState<GeneratedOutputs | null>(null);
  const [raidOutput, setRaidOutput] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isExternalLoading, setIsExternalLoading] = useState(false);
  const [isInternalLoading, setIsInternalLoading] = useState(false);
  const [isRaidLoading, setIsRaidLoading] = useState(false);
  const [copyLabels, setCopyLabels] = useState<
    Partial<Record<OutputCardKey | "raid", string>>
  >({});

  const primaryBtn =
    "inline-flex items-center justify-center py-3 px-6 bg-accent text-white text-[0.9rem] font-medium tracking-[0.01em] border-0 rounded-input font-sans cursor-pointer transition-colors duration-150 enabled:hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d7377] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

  const secondaryBtn =
    "inline-flex items-center justify-center py-3 px-5 bg-transparent text-accent text-[0.9rem] font-medium tracking-[0.01em] border-[1.5px] border-accent rounded-input font-sans cursor-pointer transition-colors duration-150 enabled:hover:bg-accent-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d7377] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

  const copyBtn =
    "inline-flex items-center justify-center py-[0.35rem] px-3 text-[0.8rem] font-medium text-muted bg-transparent border border-border rounded-input font-sans cursor-pointer transition-colors duration-150 hover:text-accent hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d7377] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

  const cardClasses =
    "bg-card border border-border rounded-control p-6 mobile:p-4 mobile:rounded-card";

  const outputHeaderClasses =
    "flex items-center justify-between gap-4 pb-3 border-b border-border mb-4 mobile:grid mobile:grid-cols-1";

  const outputPanelBase =
    "min-h-[260px] p-4 border border-border rounded-control bg-card";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!transcript.trim()) {
      setError("Paste some meeting notes or a transcript before generating.");
      setOutputs(null);
      setRaidOutput("");
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          transcript
        })
      });

      const data = (await response.json()) as { outputs?: GeneratedOutputs; error?: string };

      if (!response.ok || !data.outputs) {
        throw new Error(data.error ?? "Something went wrong while generating the outputs.");
      }

      setOutputs(data.outputs);
      setRaidOutput("");
      setCopyLabels({});
    } catch (submitError) {
      setOutputs(null);
      setRaidOutput("");
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Something went wrong while generating the outputs."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateOptionalOutput = async (
    key: "internalUpdate" | "externalUpdate",
    errorLabel: string
  ) => {
    if (!transcript.trim()) {
      setError(`Paste some meeting notes or a transcript before generating ${errorLabel}.`);
      return;
    }

    setError("");

    if (key === "internalUpdate") {
      setIsInternalLoading(true);
    } else {
      setIsExternalLoading(true);
    }

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          transcript,
          includeExternal: key === "externalUpdate",
          includeInternal: key === "internalUpdate"
        })
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
      if (key === "internalUpdate") {
        setIsInternalLoading(false);
      } else {
        setIsExternalLoading(false);
      }
    }
  };

  const handleGenerateRaid = async () => {
    if (!transcript.trim()) {
      setError("Paste some meeting notes or a transcript before generating RAID.");
      return;
    }

    setError("");
    setIsRaidLoading(true);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          transcript,
          includeRaid: true
        })
      });

      const data = (await response.json()) as { outputs?: RaidOutput; error?: string };

      if (!response.ok || !data.outputs?.raid) {
        throw new Error(data.error ?? "Something went wrong while generating the RAID output.");
      }

      setRaidOutput(data.outputs.raid);
      setCopyLabels((current) => ({
        ...current,
        raid: "Copy"
      }));
    } catch (raidError) {
      setError(
        raidError instanceof Error
          ? raidError.message
          : "Something went wrong while generating the RAID output."
      );
    } finally {
      setIsRaidLoading(false);
    }
  };

  const handleSampleClick = (value: string) => {
    setTranscript(value);
    setError("");
  };

  const handleCopy = async (key: OutputCardKey | "raid", value: string) => {
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

  const raidCopyState = copyLabels.raid ?? "Copy";

  return (
    <main className="w-[min(960px,calc(100%_-_2rem))] mobile:w-[min(calc(100%_-_1rem),960px)] mx-auto pt-16 pb-20 mobile:pt-5 mobile:pb-8">
      <section className="mb-8">
        <Link
          className="inline-block mb-4 p-0 rounded-none bg-transparent border-0 text-accent text-[0.75rem] font-semibold tracking-[0.08em] uppercase no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d7377] focus-visible:ring-offset-2"
          href="/"
        >
          For project managers
        </Link>
        <h1 className="m-0 max-w-[12ch] mobile:max-w-none text-[clamp(2.5rem,6vw,4.5rem)] leading-tight text-text">
          Paste your notes. Get your update pack.
        </h1>
        <p className="max-w-[52rem] mt-4 text-muted font-sans text-[1.05rem] leading-relaxed">
          Paste rough notes, generate the full update pack, then refine what needs your
          judgement.
        </p>
      </section>

      <div className="grid gap-5">
        <section className={cardClasses}>
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
                placeholder="Rough notes, bullet points or a transcript. Whatever came out of the meeting."
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
              <button className={primaryBtn} type="submit" disabled={isLoading}>
                {isLoading ? "Turning notes into updates..." : "Generate update pack"}
              </button>
              {error && <p className="m-0 text-error font-sans">{error}</p>}
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
                    <h2 className="m-0 text-[1.5rem]">{card.title}</h2>
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
                  {isLoading ? (
                    <p className="m-0 text-muted font-sans animate-pulse-opacity">
                      Turning notes into updates...
                    </p>
                  ) : value ? (
                    <pre className="m-0 whitespace-pre-wrap break-words font-sans leading-base">
                      {value}
                    </pre>
                  ) : (
                    <p className="m-0 text-muted font-sans">
                      {card.key === "shortStatus"
                        ? "Your 2-3 sentence delivery summary will appear here."
                        : "Actions with owners and priorities will appear here."}
                    </p>
                  )}
                </div>
              </section>
            );
          })}

          <section className="grid gap-3">
            <p className="m-0 text-muted font-sans text-[0.82rem] font-semibold tracking-[0.02em]">
              Add to your pack
            </p>
            <div className="flex justify-start flex-wrap gap-3">
              <button
                type="button"
                className={`${secondaryBtn} mobile:w-full`}
                onClick={() => handleGenerateOptionalOutput("internalUpdate", "the internal update")}
                disabled={isLoading || isInternalLoading}
              >
                {isInternalLoading ? "Generating Internal Update..." : "Internal Update"}
              </button>
              <button
                type="button"
                className={`${secondaryBtn} mobile:w-full`}
                onClick={() => handleGenerateOptionalOutput("externalUpdate", "the external update")}
                disabled={isLoading || isExternalLoading}
              >
                {isExternalLoading ? "Generating External Update..." : "External Update"}
              </button>
              <button
                type="button"
                className={`${secondaryBtn} mobile:w-full`}
                onClick={handleGenerateRaid}
                disabled={isLoading || isRaidLoading}
              >
                {isRaidLoading ? "Generating RAID..." : "RAID Log"}
              </button>
            </div>
          </section>

          {optionalOutputCards.map((card) => {
            const value = outputs?.[card.key] ?? "";
            const isCardLoading =
              card.key === "internalUpdate" ? isInternalLoading : isExternalLoading;
            const copyState = copyLabels[card.key] ?? "Copy";

            if (!isCardLoading && !value) {
              return null;
            }

            return (
              <section key={card.key} className={`${cardClasses} grid gap-4`}>
                <div className={outputHeaderClasses}>
                  <div>
                    <h2 className="m-0 text-[1.5rem]">{card.title}</h2>
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
                    <p className="m-0 text-muted font-sans animate-pulse-opacity">
                      {card.key === "internalUpdate"
                        ? "Generating Internal Update..."
                        : "Generating External Update..."}
                    </p>
                  ) : value ? (
                    <pre className="m-0 whitespace-pre-wrap break-words font-sans leading-base">
                      {value}
                    </pre>
                  ) : (
                    <p className="m-0 text-muted font-sans">
                      {card.key === "internalUpdate"
                        ? "Your internal team update will appear here."
                        : "Your stakeholder-facing update will appear here."}
                    </p>
                  )}
                </div>
              </section>
            );
          })}

          {(isRaidLoading || raidOutput) && (
            <section className={`${cardClasses} grid gap-4`}>
              <div className={outputHeaderClasses}>
                <div>
                  <h2 className="m-0 text-[1.5rem]">RAID</h2>
                </div>
                <button
                  type="button"
                  className={copyBtn}
                  onClick={() => handleCopy("raid", raidOutput)}
                  disabled={!raidOutput}
                >
                  {raidCopyState}
                  <span aria-live="polite" className="sr-only">
                    {raidCopyState === "Copied" ? "Copied to clipboard" : ""}
                  </span>
                </button>
              </div>

              <div className={`${outputPanelBase}${!raidOutput ? " grid place-items-center" : ""}`}>
                {isRaidLoading ? (
                  <p className="m-0 text-muted font-sans animate-pulse-opacity">
                    Generating RAID...
                  </p>
                ) : raidOutput ? (
                  <pre className="m-0 whitespace-pre-wrap break-words font-sans leading-base">
                    {raidOutput}
                  </pre>
                ) : (
                  <p className="m-0 text-muted font-sans">
                    Risks, assumptions, issues, and dependencies will appear here.
                  </p>
                )}
              </div>
            </section>
          )}
        </section>
      </div>
    </main>
  );
}
