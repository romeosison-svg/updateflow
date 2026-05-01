import { describe, expect, it } from "vitest";

import {
  ADMIN_INDICATORS,
  filterActionListOutput,
  filterSectionedOutput,
  filterShortStatusOutput
} from "../lib/generate";

describe("ADMIN_INDICATORS", () => {
  it("exports the shared admin indicator phrases for future extension", () => {
    expect(ADMIN_INDICATORS).toContain("folder structure");
    expect(ADMIN_INDICATORS).toContain("reporting process");
    expect(ADMIN_INDICATORS).toContain("revisit and update status");
  });
});

describe("filterActionListOutput", () => {
  it("removes admin actions and renumbers remaining delivery actions", () => {
    const output = [
      "1. Confirm revised vendor delivery date",
      "   Owner: PM",
      "   Priority: High",
      "",
      "2. Create a new folder for weekly reporting artefacts",
      "   Owner: PMO",
      "   Priority: Low",
      "",
      "3. Validate UAT readiness with QA lead",
      "   Owner: QA Lead",
      "   Priority: High"
    ].join("\n");

    expect(filterActionListOutput(output)).toBe(
      [
        "1. Confirm revised vendor delivery date",
        "   Owner: PM",
        "   Priority: High",
        "",
        "2. Validate UAT readiness with QA lead",
        "   Owner: QA Lead",
        "   Priority: High"
      ].join("\n")
    );
  });

  it("returns the exact empty state when only admin actions remain", () => {
    const output = [
      "1. Update the spreadsheet with latest status",
      "   Owner: PMO",
      "   Priority: Medium",
      "",
      "2. Revisit and update status for older stories",
      "   Owner: Analyst",
      "   Priority: Low"
    ].join("\n");

    expect(filterActionListOutput(output)).toBe(
      "No delivery actions identified from this input."
    );
  });

  it("keeps valid delivery actions unchanged apart from sequential numbering", () => {
    const output = [
      "3. Confirm revised supplier date",
      "   Owner: PM",
      "   Priority: High",
      "",
      "9. Finalise cutover communications",
      "   Owner: Delivery Lead",
      "   Priority: Medium"
    ].join("\n");

    expect(filterActionListOutput(output)).toBe(
      [
        "1. Confirm revised supplier date",
        "   Owner: PM",
        "   Priority: High",
        "",
        "2. Finalise cutover communications",
        "   Owner: Delivery Lead",
        "   Priority: Medium"
      ].join("\n")
    );
  });

  it("passes through the existing empty state string unchanged", () => {
    expect(filterActionListOutput("No delivery actions identified from this input.")).toBe(
      "No delivery actions identified from this input."
    );
  });

  it("does not remove valid delivery actions that mention reporting in a delivery context", () => {
    const output = [
      "1. Confirm reporting date for UAT entry readiness",
      "   Owner: PM",
      "   Priority: Medium"
    ].join("\n");

    expect(filterActionListOutput(output)).toBe(output);
  });
});

describe("filterSectionedOutput", () => {
  it("removes admin bullets and drops sections left empty after filtering", () => {
    const output = [
      "Progress / Achievements",
      "",
      "- UAT entry criteria approved and cutover plan confirmed",
      "- Folder structure reviewed for the weekly reporting pack",
      "",
      "Upcoming Work",
      "",
      "- Confirm revised vendor delivery date",
      "",
      "Admin Notes",
      "",
      "- Update the spreadsheet before the PMO review"
    ].join("\n");

    expect(filterSectionedOutput(output)).toBe(
      [
        "Progress / Achievements",
        "",
        "- UAT entry criteria approved and cutover plan confirmed",
        "",
        "Upcoming Work",
        "",
        "- Confirm revised vendor delivery date"
      ].join("\n")
    );
  });

  it("returns the exact empty state when only admin content remains", () => {
    const output = [
      "Progress / Achievements",
      "",
      "- Folder structure reviewed for the new reporting pack",
      "",
      "Upcoming Work",
      "",
      "- Update the spreadsheet and revisit and update status"
    ].join("\n");

    expect(filterSectionedOutput(output)).toBe("No delivery content identified from this input.");
  });

  it("keeps valid delivery sectioned content unchanged", () => {
    const output = [
      "Progress / Achievements",
      "",
      "- UAT entry criteria approved",
      "",
      "Upcoming Work",
      "",
      "- Confirm revised vendor delivery date"
    ].join("\n");

    expect(filterSectionedOutput(output)).toBe(output);
  });

  it("passes through the existing empty state string unchanged", () => {
    expect(filterSectionedOutput("No delivery content identified from this input.")).toBe(
      "No delivery content identified from this input."
    );
  });

  it("does not remove valid delivery bullets that mention report in a delivery context", () => {
    const output = [
      "Progress / Achievements",
      "",
      "- Progress report issued to steering committee with confirmed UAT milestone"
    ].join("\n");

    expect(filterSectionedOutput(output)).toBe(output);
  });
});

describe("filterShortStatusOutput", () => {
  it("removes admin sentences and rejoins the remaining delivery status coherently", () => {
    const output = [
      "UAT entry criteria were approved and the cutover plan remains on track.",
      "Folder structure updates are still needed for the weekly reporting pack.",
      "Focus this week is on confirming the revised vendor delivery date."
    ].join(" ");

    expect(filterShortStatusOutput(output)).toBe(
      "UAT entry criteria were approved and the cutover plan remains on track. Focus this week is on confirming the revised vendor delivery date."
    );
  });

  it("returns the exact empty state when only admin sentences remain", () => {
    const output =
      "Folder structure updates are still needed for the weekly reporting pack. The team will update the spreadsheet before the PMO review.";

    expect(filterShortStatusOutput(output)).toBe("No delivery content identified from this input.");
  });

  it("keeps valid delivery short status output unchanged", () => {
    const output =
      "UAT entry criteria were approved and the cutover plan remains on track. Focus this week is on confirming the revised vendor delivery date.";

    expect(filterShortStatusOutput(output)).toBe(output);
  });

  it("passes through the existing empty state string unchanged", () => {
    expect(filterShortStatusOutput("No delivery content identified from this input.")).toBe(
      "No delivery content identified from this input."
    );
  });
});
