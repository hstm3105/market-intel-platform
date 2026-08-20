export function riskAnswerToNote(industryName: string, answer: string) {
  return {
    title: `Risk Q&A — ${industryName}`,
    content: answer,
  };
}
