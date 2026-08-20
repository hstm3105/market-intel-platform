import { describe, expect, it } from "vitest";
import { researchQuestionSystemPrompt } from "./research";

describe("risk-focused research question prompt", () => {
  it("grounds risk questions in the ranked emerging-risk synthesis", () => {
    const prompt = researchQuestionSystemPrompt("emerging_risks");

    expect(prompt).toContain("three ranked risks");
    expect(prompt).toContain("severity");
    expect(prompt).toContain("source labels");
  });

  it("keeps general market questions free from the risk-specific instruction", () => {
    expect(researchQuestionSystemPrompt("market")).not.toContain("three ranked risks");
  });

  it("sets comparison instructions for cross-scan emerging-risk analysis", () => {
    const prompt = researchQuestionSystemPrompt("risk_comparison");

    expect(prompt).toContain("multiple private market scans");
    expect(prompt).toContain("contagion paths");
    expect(prompt).toContain("relevant scan industry");
  });

  it("sets explicit evidence and inference boundaries for advanced portfolio synthesis", () => {
    const prompt = researchQuestionSystemPrompt("enterprise_portfolio");
    expect(prompt).toContain("selected private scans");
    expect(prompt).toContain("cross-scan patterns as inference");
    expect(prompt).toContain("Do not invent evidence");
  });
});
