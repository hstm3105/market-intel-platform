import { describe, expect, it } from "vitest";
import { channelForQuestionMode, createChatTurnRecords, selectConversationHistory } from "./chat";

describe("Risk Q&A chat channels", () => {
  it("keeps risk-mode history separate from general scan chat", () => {
    const history = selectConversationHistory([
      { channel: "general", role: "user", content: "Compare challengers" },
      { channel: "risk", role: "user", content: "What would worsen the funding risk?" },
      { channel: "general", role: "assistant", content: "General answer" },
      { channel: "risk", role: "assistant", content: "Risk answer" },
    ], "risk");

    expect(channelForQuestionMode("risk")).toBe("risk");
    expect(history).toEqual([
      { role: "user", content: "What would worsen the funding risk?" },
      { role: "assistant", content: "Risk answer" },
    ]);
  });

  it("persists both sides of a risk conversation with the risk channel", () => {
    let index = 0;
    const records = createChatTurnRecords({ userId: 1, scanId: "scan-1", question: "Which signal matters?", answer: "Watch loss ratios.", channel: "risk", createId: () => `m${++index}` });

    expect(records).toEqual([
      { id: "m1", userId: 1, scanId: "scan-1", channel: "risk", role: "user", content: "Which signal matters?" },
      { id: "m2", userId: 1, scanId: "scan-1", channel: "risk", role: "assistant", content: "Watch loss ratios." },
    ]);
  });
});
