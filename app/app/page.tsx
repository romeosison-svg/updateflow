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

const visuallyHiddenStyles = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: 0,
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0
} as const;

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
    <main className="page-shell">
      <section className="hero">
        <Link className="eyebrow eyebrow-link" href="/">
          For project managers
        </Link>
        <h1>Paste your notes. Get your update pack.</h1>
        <p>
          Paste rough notes, generate the full update pack, then refine what needs your
          judgement.
        </p>
      </section>

      <div className="tool-stack">
        <section className="card">
          <form className="generator-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>Meeting notes or transcript</span>
              <small className="helper-text">
                Works best with sanitised notes — or paste freely and let the output
                handle it.
              </small>
              <textarea
                value={transcript}
                onChange={(event) => setTranscript(event.target.value)}
                placeholder="Rough notes, bullet points, a transcript — whatever came out of the meeting."
                rows={14}
              />
            </label>

            <p className={`char-count${transcript.length > 22500 ? " char-count--warning" : ""}`}>
              {transcript.length.toLocaleString()} / 25,000
            </p>

            <p className="examples-label">Examples</p>
            <div className="sample-row" aria-label="Sample transcript buttons">
              {sampleTranscripts.map((sample) => (
                <button
                  key={sample.id}
                  type="button"
                  className="sample-button"
                  onClick={() => handleSampleClick(sample.transcript)}
                >
                  {sample.label}
                </button>
              ))}
            </div>

            <p className="input-note">
              Sensitive names and details will be anonymised in the output.
            </p>

            <div className="actions-row">
              <button className="primary-button" type="submit" disabled={isLoading}>
                {isLoading ? "Turning notes into updates..." : "Generate update pack"}
              </button>
              {error && <p className="error-message">{error}</p>}
            </div>
          </form>
        </section>

        <section className="output-stack">
          {outputCards.map((card) => {
            const value = outputs?.[card.key] ?? "";
            const copyState = copyLabels[card.key] ?? "Copy";

            return (
              <section key={card.key} className="card output-card">
                <div className="output-header">
                  <div>
                    <h2>{card.title}</h2>
                  </div>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => handleCopy(card.key, value)}
                    disabled={!value}
                  >
                    {copyState}
                    <span aria-live="polite" style={visuallyHiddenStyles}>
                      {copyState === "Copied" ? "Copied to clipboard" : ""}
                    </span>
                  </button>
                </div>

                <div className={`output-panel${isLoading ? " output-panel--loading" : ""}${!value ? " empty" : ""}`}>
                  {isLoading ? (
                    <p>Turning notes into updates...</p>
                  ) : value ? (
                    <pre>{value}</pre>
                  ) : (
                    <p>
                      {card.key === "shortStatus"
                        ? "Your 2-3 sentence delivery summary will appear here."
                        : "Actions with owners and priorities will appear here."}
                    </p>
                  )}
                </div>
              </section>
            );
          })}

          <section className="optional-outputs-group">
            <p className="optional-outputs-label">Add to your pack</p>
            <div className="raid-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => handleGenerateOptionalOutput("internalUpdate", "the internal update")}
                disabled={isLoading || isInternalLoading}
              >
                {isInternalLoading ? "Generating Internal Update..." : "Internal Update"}
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => handleGenerateOptionalOutput("externalUpdate", "the external update")}
                disabled={isLoading || isExternalLoading}
              >
                {isExternalLoading ? "Generating External Update..." : "External Update"}
              </button>
              <button
                type="button"
                className="secondary-button"
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
              <section key={card.key} className="card output-card">
                <div className="output-header">
                  <div>
                    <h2>{card.title}</h2>
                  </div>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => handleCopy(card.key, value)}
                    disabled={!value}
                  >
                    {copyState}
                    <span aria-live="polite" style={visuallyHiddenStyles}>
                      {copyState === "Copied" ? "Copied to clipboard" : ""}
                    </span>
                  </button>
                </div>

                <div className={`output-panel${isCardLoading ? " output-panel--loading" : ""}${!value ? " empty" : ""}`}>
                  {isCardLoading ? (
                    <p>
                      {card.key === "internalUpdate"
                        ? "Generating Internal Update..."
                        : "Generating External Update..."}
                    </p>
                  ) : value ? (
                    <pre>{value}</pre>
                  ) : (
                    <p>
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
            <section className="card output-card">
              <div className="output-header">
                <div>
                  <h2>RAID</h2>
                </div>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => handleCopy("raid", raidOutput)}
                  disabled={!raidOutput}
                >
                  {raidCopyState}
                  <span aria-live="polite" style={visuallyHiddenStyles}>
                    {raidCopyState === "Copied" ? "Copied to clipboard" : ""}
                  </span>
                </button>
              </div>

              <div className={`output-panel${isRaidLoading ? " output-panel--loading" : ""}${!raidOutput ? " empty" : ""}`}>
                {isRaidLoading ? (
                  <p>Generating RAID...</p>
                ) : raidOutput ? (
                  <pre>{raidOutput}</pre>
                ) : (
                  <p>Risks, assumptions, issues, and dependencies will appear here.</p>
                )}
              </div>
            </section>
          )}
        </section>
      </div>
    </main>
  );
}
