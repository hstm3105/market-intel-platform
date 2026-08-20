import { describe, expect, it } from "vitest";
import { riskAnswerToNote } from "./riskInsight";

describe("riskAnswerToNote", () => {
  it("turns a Risk Q&A answer into a private-note payload", () => {
    expect(riskAnswerToNote("FinTech", "**Evidence:** Watch consent enforcement. [S8]")).toEqual({
      title: "Risk Q&A — FinTech",
      content: "**Evidence:** Watch consent enforcement. [S8]",
    });
  });
});
