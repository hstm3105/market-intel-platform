export type ChatChannel = "general" | "risk";

export type StoredChatMessage = {
  role: "user" | "assistant";
  content: string;
  channel: ChatChannel;
};

export function channelForQuestionMode(mode: "general" | "risk"): ChatChannel {
  return mode === "risk" ? "risk" : "general";
}

export function selectConversationHistory(messages: StoredChatMessage[], channel: ChatChannel, limit = 8) {
  return messages
    .filter(message => message.channel === channel)
    .slice(-limit)
    .map(message => ({ role: message.role, content: message.content }));
}

export function createChatTurnRecords(input: { userId: number; scanId: string; question: string; answer: string; channel: ChatChannel; createId: () => string }) {
  return [
    { id: input.createId(), userId: input.userId, scanId: input.scanId, channel: input.channel, role: "user" as const, content: input.question },
    { id: input.createId(), userId: input.userId, scanId: input.scanId, channel: input.channel, role: "assistant" as const, content: input.answer },
  ];
}
