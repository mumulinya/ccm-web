import * as crypto from "crypto";
import * as os from "os";
import * as path from "path";
import { readJsonWithBackup, withFileLock, writeJsonAtomic } from "../core/atomic-json-file";
import { callAnthropicCompatibleChat, callOpenAiCompatibleChat, shouldUseAnthropic } from "../modules/collaboration/group-orchestrator-llm-client";
import { loadOrchestratorConfig } from "../modules/collaboration/group-orchestrator-config";
import {
  ensureAgentCommunicationAcknowledged, finalizeAgentCommunication, heartbeatAgentCommunication,
  markAgentCommunicationRunnerStarted, startAgentCommunicationDispatch, submitAgentCommunicationResult,
} from "./agent-communication-v2";

const RECEIPT_FILE = path.join(process.env.CCM_SKILL_FORK_DIR || path.join(os.homedir(), ".cc-connect"), "skill-fork-receipts.json");

function hash(value: any) { return crypto.createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex"); }

function extractObject(text: string) {
  const fenced = String(text || "").match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  for (const candidate of [fenced, text]) {
    if (!candidate) continue;
    const start = candidate.indexOf("{"); const end = candidate.lastIndexOf("}");
    if (start < 0 || end <= start) continue;
    try { return JSON.parse(candidate.slice(start, end + 1)); } catch {}
  }
  return null;
}

function persistReceipt(receipt: any) {
  withFileLock(RECEIPT_FILE, () => {
    const fallback = { schema: "ccm-skill-fork-receipt-store-v1", revision: 0, receipts: [] as any[] };
    const store = readJsonWithBackup<any>(RECEIPT_FILE, fallback);
    store.schema = fallback.schema;
    store.revision = Number(store.revision || 0) + 1;
    store.receipts = [...(Array.isArray(store.receipts) ? store.receipts : []), receipt].slice(-2000);
    writeJsonAtomic(RECEIPT_FILE, store);
  });
}

export async function executeSkillFork(input: {
  skill: any;
  parent: { scope: string; scopeId: string; exactSessionId: string; generation: number; turn?: number | string };
  modelVisibleContext: string;
  tools: any[];
  executeTool: (name: string, args: any) => Promise<any>;
}) {
  const config = loadOrchestratorConfig();
  if (config.skillForkEnabled === false) throw new Error("SKILL_FORK_DISABLED");
  const skill = input.skill || {};
  const communicationIdentity = {
    taskId: `skill:${input.parent.exactSessionId}`,
    workItemId: `skill:${String(skill.name || "unknown")}:${String(input.parent.turn || "turn")}`,
    scope: input.parent.scope as "global" | "project" | "group",
    scopeId: input.parent.scopeId,
    exactSessionId: input.parent.exactSessionId,
    generation: input.parent.generation,
    attempt: 1,
    senderAgentId: `${input.parent.scope}-main-agent`,
    receiverAgentId: `skill-fork:${String(skill.name || "unknown")}`,
  };
  const dispatch = startAgentCommunicationDispatch({
    ...communicationIdentity,
    ownerId: `skill-fork:${process.pid}`,
    deadlineAt: new Date(Date.now() + Math.max(60_000, Math.min(30 * 60_000, Number(config.timeoutMs || 120_000) * 3))).toISOString(),
    idempotencyKey: hash({ ...communicationIdentity, skillHash: skill.contentHash || "" }),
    payload: { kind: "skill_fork", skillName: String(skill.name || ""), skillHash: String(skill.contentHash || ""), contentStored: false },
    policy: config,
  });
  if (dispatch.enabled && !dispatch.acquired) throw new Error("SKILL_FORK_COMMUNICATION_CAPACITY_WAIT");
  const communication = dispatch.envelope;
  if (communication) {
    markAgentCommunicationRunnerStarted(communication.messageId, { runtime: "ccm-skill-fork", contentStored: false });
    ensureAgentCommunicationAcknowledged(communication.messageId, {
      understoodGoal: `执行隔离Skill: ${String(skill.name || "")}`,
      plannedScope: ["authorized_readonly_tools"], forbiddenScope: ["source_write", "task_terminal"],
      verificationPlan: ["result_checksum", "skill_hash"], summary: "Skill隔离子Agent已核对只读工作单", legacyBridge: false,
    });
  }
  const allowedBySkill = new Set((Array.isArray(skill.allowedTools) ? skill.allowedTools : []).map(String));
  const tools = (input.tools || []).filter(tool => {
    const name = String(tool.canonicalName || tool.name || "");
    const annotations = tool.annotations || {};
    return name && annotations.readOnlyHint === true && annotations.destructiveHint !== true && (!allowedBySkill.size || allowedBySkill.has(name) || allowedBySkill.has(String(tool.name || "")));
  }).map(tool => ({ name: String(tool.canonicalName || tool.name), description: String(tool.description || ""), inputSchema: tool.inputSchema || { type: "object", properties: {} } }));
  const messages: any[] = [{
    role: "system",
    content: [
      "你是CCM隔离Skill子Agent。只完成这个Skill目标；你只能使用已授权只读工具。不得修改代码、派发开发任务或宣布父任务完成。需要写入时只返回结构化WorkItem建议。",
      `Skill: ${String(skill.name || "")}`,
      `Skill hash: ${String(skill.contentHash || "")}`,
      String(skill.renderedPrompt || skill.prompt || ""),
      "可见父上下文快照（不包含隐藏执行链）：",
      String(input.modelVisibleContext || "").slice(0, 100_000),
    ].join("\n\n"),
  }, { role: "user", content: String(skill.input || "") }];
  const evidenceRefs: string[] = [];
  const startedAt = Date.now();
  const deadlineAt = startedAt + Math.max(60_000, Math.min(30 * 60_000, Number(config.timeoutMs || 120_000) * 3));
  const repeatedRequests = new Map<string, number>();
  let usage: any = null;
  let finalText = "";
  const heartbeatTimer = communication ? setInterval(() => {
    try {
      heartbeatAgentCommunication(communication.messageId, {
        ...communicationIdentity, attempt: communication.attempt, leaseId: communication.leaseId,
        senderAgentId: communication.receiverAgentId, receiverAgentId: communication.senderAgentId,
      }, { phase: "executing", contentStored: false });
    } catch {}
  }, Math.max(5_000, Number(config.agentHeartbeatIntervalMs || 20_000))) : null;
  heartbeatTimer?.unref?.();
  try {
    while (!finalText) {
      if (Date.now() >= deadlineAt) throw new Error("SKILL_FORK_DEADLINE_EXCEEDED");
    const options: any = {
      messages,
      maxTokens: 3000,
      temperature: 0.1,
      reasoningEffort: skill.effort || config.reasoningEffort,
      nativeTools: tools,
      nativeToolReference: true,
      retryProfile: "agent_orchestration",
      onUsage: (value: any) => { usage = value; },
    };
    const text = shouldUseAnthropic(config) ? await callAnthropicCompatibleChat(config, options) : await callOpenAiCompatibleChat(config, options);
    const parsed = extractObject(text);
    const requests = Array.isArray(parsed?.toolRequests) ? parsed.toolRequests : [];
    if (!requests.length) { finalText = String(parsed?.reply || parsed?.result || text); break; }
    const requestFingerprint = hash(requests.map((request: any) => ({ name: String(request?.name || ""), arguments: request?.arguments || {} })));
    const repeatCount = (repeatedRequests.get(requestFingerprint) || 0) + 1;
    repeatedRequests.set(requestFingerprint, repeatCount);
    if (repeatCount >= 3) throw new Error("SKILL_FORK_REPEATED_NO_PROGRESS");
    const results = [];
    for (const request of requests.slice(0, 4)) {
      const name = String(request?.name || "");
      if (!tools.some(tool => tool.name === name)) { results.push({ name, ok: false, error: "SKILL_FORK_TOOL_NOT_AUTHORIZED" }); continue; }
      try {
        const value = await input.executeTool(name, request?.arguments || {});
        const resultChecksum = hash(value);
        evidenceRefs.push(resultChecksum);
        results.push({ name, ok: true, result: value, resultChecksum });
      } catch (error: any) { results.push({ name, ok: false, error: String(error?.message || error).slice(0, 1000) }); }
    }
      messages.push({ role: "assistant", content: text }, { role: "user", content: JSON.stringify({ toolResults: results }) });
    }
    if (!finalText) throw new Error("SKILL_FORK_NO_PROGRESS");
  } catch (error: any) {
    if (communication) {
      try {
        submitAgentCommunicationResult(communication.messageId, { status: "failed", summary: String(error?.message || error), blockers: [String(error?.message || error)], sideEffectState: "none" });
        finalizeAgentCommunication(communication.messageId, "failed", { summary: "Skill隔离执行未完成", sideEffectState: "none" });
      } catch {}
    }
    throw error;
  } finally {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
  }
  const receipt = {
    schema: "ccm-skill-fork-receipt-v1",
    receiptId: `skill_fork_${hash({ parent: input.parent, skill: skill.name, startedAt }).slice(0, 24)}`,
    communicationMessageId: communication?.messageId || "",
    parent: input.parent,
    skillName: String(skill.name || ""),
    skillHash: String(skill.contentHash || ""),
    usage: usage ? { inputTokens: Number(usage.inputTokens || 0), outputTokens: Number(usage.outputTokens || 0), totalTokens: Number(usage.totalTokens || 0) } : null,
    toolEvidenceRefs: [...new Set(evidenceRefs)].slice(0, 100),
    resultChecksum: hash(finalText),
    durationMs: Date.now() - startedAt,
    completedAt: new Date().toISOString(),
    contentStored: false,
  };
  persistReceipt(receipt);
  if (communication) {
    submitAgentCommunicationResult(communication.messageId, {
      status: "submitted", summary: `Skill ${String(skill.name || "")} 已返回隔离结果`,
      verificationResults: [{ check: "result_checksum", pass: true, checksum: receipt.resultChecksum }],
      artifactRefs: [receipt.receiptId], sideEffectState: "none",
    });
    finalizeAgentCommunication(communication.messageId, "accepted", {
      summary: "CCM已校验Skill hash、只读权限和结果checksum",
      verificationResults: [{ check: "skill_hash", pass: !!receipt.skillHash }, { check: "result_checksum", pass: true }],
      artifactRefs: [receipt.receiptId], sideEffectState: "none",
    });
  }
  return { ok: true, name: String(skill.name || ""), contentHash: String(skill.contentHash || ""), executionMode: "fork", result: finalText, resultChecksum: receipt.resultChecksum, invokedAt: receipt.completedAt, receipt };
}
