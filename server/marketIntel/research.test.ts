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
});
