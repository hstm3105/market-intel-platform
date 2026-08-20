import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getDb: vi.fn(), insert: vi.fn(), values: vi.fn(), select: vi.fn(), from: vi.fn(), invokeLLM: vi.fn(), listLLMModels: vi.fn() }));
vi.mock("../db", () => ({ getDb: mocks.getDb }));
vi.mock("../_core/llm", () => ({ invokeLLM: mocks.invokeLLM, listLLMModels: mocks.listLLMModels }));

import { listAgentRuns, runEvidenceOrchestration } from "./orchestration";

const scan = { id: "scan-a", industryName: "FinTech", scope: "Evidence scope", sources: [{ id: "S1", title: "Source", publisher: "Publisher", publishedAt: "2026-08-20", url: "https://example.com/source", excerpt: "Evidence" }], analysis: { trends: [], risks: [] } as any };
const agentRun = { id: "run-a", organizationId: "org-a", requestedByUserId: 1, scanIdsJson: "[\"scan-a\"]", question: "What is evidenced?", model: "gpt-5", status: "completed", synthesis: "Private synthesis", createdAt: new Date() };
const claim = { id: "claim-a", organizationId: "org-a", agentRunId: "run-a", scanId: "scan-a", claim: "Private claim", assessment: "supported", confidence: 84, sourceIdsJson: "[\"scan-a:S1\"]", counterSourceIdsJson: "[]", rationale: "Private evidence", createdAt: new Date() };

describe("orchestration persistence", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.values.mockResolvedValue(undefined); mocks.insert.mockReturnValue({ values: mocks.values }); mocks.getDb.mockResolvedValue({ insert: mocks.insert, select: mocks.select }); mocks.listLLMModels.mockResolvedValue({ data: [{ id: "gpt-5" }] }); });

  it("persists successful private runs and claim records with validated evidence attributes", async () => {
    mocks.invokeLLM.mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify({ claims: [{ scanId: "scan-a", claim: "Validated claim", assessment: "supported", confidence: 84, sourceIds: ["scan-a:S1"], counterSourceIds: [], rationale: "Source supports the claim." }] }) } }] }).mockResolvedValueOnce({ choices: [{ message: { content: "Executive synthesis" } }] });
    const result = await runEvidenceOrchestration({ organizationId: "org-a", requestedByUserId: 1, question: "What is evidenced?", scans: [scan] });
    expect(result).toMatchObject({ model: "gpt-5", synthesis: "Executive synthesis", claims: [expect.objectContaining({ scanId: "scan-a", confidence: 84, assessment: "supported" })] });
    expect(mocks.values).toHaveBeenNthCalledWith(1, expect.objectContaining({ organizationId: "org-a", requestedByUserId: 1, scanIdsJson: "[\"scan-a\"]", status: "completed" }));
    expect(mocks.values).toHaveBeenNthCalledWith(2, [expect.objectContaining({ organizationId: "org-a", scanId: "scan-a", assessment: "supported", confidence: 84, sourceIdsJson: "[\"scan-a:S1\"]" })]);
  });

  it("returns only active-organization runs with claims grouped beneath their owning run", async () => {
    const foreignRun = { ...agentRun, id: "run-b", organizationId: "org-b" };
    const foreignClaim = { ...claim, id: "claim-b", organizationId: "org-b", agentRunId: "run-b" };
    mocks.select.mockReturnValue({ from: mocks.from });
    mocks.from.mockReturnValueOnce({ where: () => ({ orderBy: () => ({ limit: () => Promise.resolve([agentRun, foreignRun]) }) }) }).mockReturnValueOnce({ where: () => ({ orderBy: () => Promise.resolve([claim, foreignClaim, { ...claim, id: "claim-cross", agentRunId: "run-b" }]) }) });
    await expect(listAgentRuns("org-a")).resolves.toEqual([expect.objectContaining({ id: "run-a", organizationId: "org-a", scanIds: ["scan-a"], claims: [expect.objectContaining({ id: "claim-a", sourceIds: ["scan-a:S1"] })] })]);
  });
});
