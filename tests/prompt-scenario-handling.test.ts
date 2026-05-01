import { describe, expect, it } from "vitest";

import { buildGenerationPrompt } from "../lib/prompts";

type PromptVariant = "internal" | "external" | "action-list" | "short-status-update";

function buildPrompt(variant: PromptVariant, transcript: string): string {
  if (variant === "internal") {
    return buildGenerationPrompt({
      transcript,
      outputType: "stakeholder-update",
      audience: "internal"
    });
  }

  if (variant === "external") {
    return buildGenerationPrompt({
      transcript,
      outputType: "stakeholder-update",
      audience: "external"
    });
  }

  return buildGenerationPrompt({
    transcript,
    outputType: variant
  });
}

const allVariants: PromptVariant[] = [
  "internal",
  "external",
  "action-list",
  "short-status-update"
];

describe("Prompt scenario handling regressions", () => {
  it("Scenario 1 - mixed delivery and non-delivery content retains delivery relevance across all output types", () => {
    const transcript = [
      "Sam is leaving the team next Friday and the team discussed the handover social.",
      "Folder structure changes are still needed for the weekly reporting pack.",
      "UAT entry criteria were approved and the integration test plan remains on track for 12th May."
    ].join("\n");

    for (const variant of allVariants) {
      const prompt = buildPrompt(variant, transcript);

      expect(prompt).toContain("Sam is leaving the team next Friday");
      expect(prompt).toContain("Folder structure changes are still needed");
      expect(prompt).toContain("UAT entry criteria were approved");
      expect(prompt).toContain(
        "- Retain delivery content even when surrounded by non-delivery discussion"
      );
      expect(prompt).toContain(
        "- Do not let the volume of non-delivery content reduce the quality or completeness of delivery content that is present"
      );
      expect(prompt).toContain(
        "- Team changes: departures, new starters, personal news, wellbeing"
      );
      expect(prompt).toContain(
        "- Admin and process: folder structures, naming conventions, reporting setup, tool configuration, process improvements"
      );
    }
  });

  it("Scenario 2 - wall of text unstructured input is handled by meaning rather than formatting across all output types", () => {
    const transcript =
      "monday the vendor still had not delivered the integration package and by tuesday the qa lead said the first smoke tests were passing but reporting still failed once because of a permissions issue we then agreed the focus for this week is confirming the revised date with the supplier and making sure uat can still start on 12th may";

    for (const variant of allVariants) {
      const prompt = buildPrompt(variant, transcript);

      expect(prompt).toContain(transcript);
      expect(prompt).toContain(
        "- If the input is unstructured or lacks clear formatting, identify delivery content by meaning and context rather than structure"
      );
      expect(prompt).toContain(
        "- Do not skip or omit delivery content solely because it is poorly formatted"
      );
      expect(prompt).toContain(
        "- Do not over-extract by treating every sentence as a delivery point"
      );
    }
  });

  it("Scenario 3 - already polished input is protected from degradation across all output types", () => {
    const transcript = [
      "Progress / Achievements",
      "- UAT entry criteria confirmed and cutover planning completed with infrastructure.",
      "",
      "Key Risks / Issues",
      "- Third-party supplier delivery remains outstanding and is a dependency for end-to-end testing.",
      "",
      "Upcoming Work",
      "- Confirm the revised supplier date and finalise the UAT start plan."
    ].join("\n");

    for (const variant of allVariants) {
      const prompt = buildPrompt(variant, transcript);

      expect(prompt).toContain(transcript);
      expect(prompt).toContain(
        "- If the input is already a well-structured and polished update, preserve its meaning and quality"
      );
      expect(prompt).toContain(
        "- Do not reformat or rewrite polished input into something of lesser quality"
      );
      expect(prompt).toContain(
        "- Do not add sections, headings, or content that were not present or implied in the original"
      );
    }
  });

  it("Scenario 4 - mixed projects in one input keeps project content separate across all output types", () => {
    const transcript = [
      "Project Atlas: UAT starts 12th May and defect triage is due Wednesday.",
      "Project Beacon: external vendor delivery remains outstanding and threatens integration testing next week.",
      "Atlas action: QA lead to confirm defect closure.",
      "Beacon action: PM to confirm revised vendor date."
    ].join("\n");

    for (const variant of allVariants) {
      const prompt = buildPrompt(variant, transcript);

      expect(prompt).toContain("Project Atlas:");
      expect(prompt).toContain("Project Beacon:");
      expect(prompt).toContain(
        "- If the input contains content relating to more than one project or workstream, keep content from each project clearly separate"
      );
      expect(prompt).toContain(
        "- Do not blend progress, risks, actions, or decisions across different projects"
      );
      expect(prompt).toContain(
        "- Do not misattribute content from one project to another"
      );
      expect(prompt).toContain(
        "- If separation cannot be maintained reliably, note that the input appears to cover multiple projects and output should be generated per project separately"
      );
    }
  });

  it("Scenario 5 - vendor or third-party names are sanitised without losing accountability across all output types", () => {
    const transcript =
      "Vendor X has not delivered the integration module, which remains a dependency for UAT readiness.";

    for (const variant of allVariants) {
      const prompt = buildPrompt(variant, transcript);

      expect(prompt).toContain("Vendor X has not delivered the integration module");
      expect(prompt).toContain(
        '- When replacing vendor or third party names with generic terms, use "third-party supplier" or "external vendor" rather than internal team references'
      );
      expect(prompt).toContain(
        "- Preserve the accountability and delivery context when sanitising vendor names"
      );
      expect(prompt).toContain(
        "- Do not reassign a vendor delay, dependency, or failure to the internal team when sanitising"
      );
    }
  });

  it("Scenario 6 - explicit dates and deadlines are preserved exactly across all output types", () => {
    const transcript =
      "UAT starts 12th May, dress rehearsal is 24th June, and go-live is 30th June if final sign-off lands on 5th June.";

    for (const variant of allVariants) {
      const prompt = buildPrompt(variant, transcript);

      expect(prompt).toContain("12th May");
      expect(prompt).toContain("24th June");
      expect(prompt).toContain("30th June");
      expect(prompt).toContain("5th June");
      expect(prompt).toContain(
        "- Preserve all specific dates and deadlines exactly as stated in the input"
      );
      expect(prompt).toContain("- Do not generalise, remove, or alter dates");
      expect(prompt).toContain("- Do not infer or fabricate dates that are not explicitly stated");
    }
  });

  it("Scenario 7 - financial and budget context is handled appropriately for stakeholder and short status prompts", () => {
    const transcript =
      "Forecast moved to a £120k overspend because an extra test cycle is now required, and budget risk is affecting the delivery decision on go-live sequencing.";

    const internalPrompt = buildPrompt("internal", transcript);
    const externalPrompt = buildPrompt("external", transcript);
    const statusPrompt = buildPrompt("short-status-update", transcript);

    for (const prompt of [internalPrompt, externalPrompt, statusPrompt]) {
      expect(prompt).toContain("£120k overspend");
      expect(prompt).toContain(
        "- Retain delivery-relevant financial context such as budget risk, forecast changes, or cost impacts where they affect delivery outcomes"
      );
      expect(prompt).toContain(
        '- Sanitise specific figures conservatively — replace exact amounts with directional language such as "forecast overspend" or "budget risk identified" only if figures appear sensitive'
      );
      expect(prompt).toContain(
        "- Do not remove financial context that is directly relevant to delivery decisions or stakeholder awareness"
      );
    }

    expect(externalPrompt).toContain(
      "- For external updates, do not include internal budget figures or organisational financial detail"
    );
  });

  it("Scenario 8 - inconclusive decisions stay unresolved in internal stakeholder and action prompts", () => {
    const transcript =
      "The steering group discussed moving go-live into July, but no conclusion was reached. PM to return with revised options next week.";

    const internalPrompt = buildPrompt("internal", transcript);
    const actionPrompt = buildPrompt("action-list", transcript);

    expect(internalPrompt).toContain(
      "- If a decision was discussed but not concluded, surface it as a decision required rather than a concluded decision"
    );
    expect(internalPrompt).toContain(
      "- Do not fabricate a conclusion that was not reached in the input"
    );
    expect(internalPrompt).toContain(
      '- Frame inconclusive decisions as "Confirm approach to..." or "Agree whether to..." rather than stating an outcome'
    );

    expect(actionPrompt).toContain(
      "- If a decision was discussed but not concluded, surface it as a decision required rather than a concluded decision"
    );
    expect(actionPrompt).toContain(
      "- Do not fabricate a conclusion that was not reached in the input"
    );
    expect(actionPrompt).toContain(
      '- Frame inconclusive decisions as "Confirm approach to..." or "Agree whether to..." rather than stating an outcome'
    );
  });

  it("Scenario 9 - no positive progress to report uses the explicit fallback wording in stakeholder outputs", () => {
    const transcript =
      "External vendor delivery remains outstanding, UAT entry is blocked, and the revised test scope is still awaiting approval.";

    const internalPrompt = buildPrompt("internal", transcript);
    const externalPrompt = buildPrompt("external", transcript);

    for (const prompt of [internalPrompt, externalPrompt]) {
      expect(prompt).toContain(
        "- If no meaningful delivery progress is present in the input, do not fabricate positive content to fill the section"
      );
      expect(prompt).toContain(
        '- Do not use weak filler such as "teams remained engaged" or "work continued as planned"'
      );
      expect(prompt).toContain(
        '- If no genuine progress exists, state: "No significant progress to report this period."'
      );
      expect(prompt).toContain(
        "- Do not omit the section entirely as its absence may cause formatting issues"
      );
    }
  });

  it("Scenario 10 - admin and reporting process only input uses the exact empty-state instructions", () => {
    const transcript = [
      "Folder structure updates were agreed for the weekly reporting pack.",
      "The team reviewed the reporting process and status document naming convention.",
      "Next Tuesday's housekeeping session was confirmed."
    ].join("\n");

    const internalPrompt = buildPrompt("internal", transcript);
    const externalPrompt = buildPrompt("external", transcript);
    const actionPrompt = buildPrompt("action-list", transcript);
    const statusPrompt = buildPrompt("short-status-update", transcript);

    expect(internalPrompt).toContain(
      '- If no delivery-focused content is found in the input, return only the following: "No delivery content identified from this input."'
    );
    expect(externalPrompt).toContain(
      '- If no delivery-focused content is found in the input, return only the following: "No delivery content identified from this input."'
    );
    expect(actionPrompt).toContain(
      '- If no clear delivery-focused actions are found, return only the following: "No delivery actions identified from this input."'
    );
    expect(statusPrompt).toContain(
      '- If no delivery-focused content is found in the input, return only the following: "No delivery content identified from this input."'
    );
  });

  it("Scenario 11 - programme-level complexity preserves cross-project clarity across all output types", () => {
    const transcript = [
      "Programme Alpha: Atlas depends on the shared identity service before UAT can start.",
      "Programme Alpha: Beacon is waiting on the same service and any delay affects both workstreams.",
      "Programme Alpha: Cygnus still needs third-party supplier delivery before the integration rehearsal can start."
    ].join("\n");

    for (const variant of allVariants) {
      const prompt = buildPrompt(variant, transcript);

      expect(prompt).toContain(
        "- If the input reflects a programme-level meeting covering multiple dependent projects, maintain clarity across interdependencies"
      );
      expect(prompt).toContain(
        "- Do not collapse programme-level complexity into vague generalisations"
      );
      expect(prompt).toContain(
        "- Clearly attribute risks, decisions, and actions to the relevant project or workstream where identifiable"
      );
      expect(prompt).toContain(
        "- Do not blend cross-project content into single statements that lose their meaning"
      );
    }
  });

  it("Scenario 12 - confidential HR context is sanitised while preserving neutral delivery impact", () => {
    const transcript =
      "A performance issue with John is affecting the data migration workstream, and the PM needs a mitigation plan before UAT readiness can be confirmed.";

    for (const variant of ["internal", "external", "action-list"] as const) {
      const prompt = buildPrompt(variant, transcript);

      expect(prompt).toContain(
        "- If the input contains HR or performance-related context that also creates a delivery risk, sanitise the personal context completely"
      );
      expect(prompt).toContain(
        "- Retain and surface only the delivery risk or impact"
      );
      expect(prompt).toContain(
        "- Do not reference the underlying HR situation in any form"
      );
      expect(prompt).toContain(
        '- Frame the delivery impact in neutral, professional terms such as "a resource dependency exists on this workstream" or "capacity risk identified"'
      );
    }
  });

  it("Scenario 13 - non-English input is handled with English-only output instructions across all output types", () => {
    const transcript =
      "Le fournisseur n'a pas livré le module d'intégration et le début de la UAT reste prévu pour le 12 mai.";

    for (const variant of allVariants) {
      const prompt = buildPrompt(variant, transcript);

      expect(prompt).toContain(transcript);
      expect(prompt).toContain(
        "- Always generate output in English regardless of the language of the input"
      );
      expect(prompt).toContain(
        "- If the input is in a language other than English, translate delivery content accurately before generating the output"
      );
      expect(prompt).toContain("- Do not mix languages within the output");
    }
  });

  it("Scenario 14 - UK English spelling guidance is present for all output types", () => {
    const transcript =
      "The organisation needs the latest defect catalogue before the steering update is sent.";

    for (const variant of allVariants) {
      const prompt = buildPrompt(variant, transcript);

      expect(prompt).toContain(
        'Use UK English spelling throughout (e.g. "catalogue" not "catalog", "organisation" not "organization")'
      );
      expect(prompt).toContain("organisation");
      expect(prompt).toContain("catalogue");
    }
  });

  it("Scenario 15 - sparse input with minimal delivery content keeps outputs restrained across all output types", () => {
    const transcript =
      "Cutover comms drafted. Folder cleanup discussed. Weekly reporting deck owner confirmed.";

    for (const variant of allVariants) {
      const prompt = buildPrompt(variant, transcript);

      expect(prompt).toContain(
        "- If the input contains only one or two delivery-relevant points, reflect only those points in the output"
      );
      expect(prompt).toContain(
        "- Do not inflate sparse content into a fuller output than the input warrants"
      );
      expect(prompt).toContain(
        "- Do not reach for non-delivery content to compensate for sparse delivery content"
      );
      expect(prompt).toContain(
        "- A short output that accurately reflects sparse input is correct behaviour"
      );
    }
  });
});
