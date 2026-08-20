"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeSkillFork = executeSkillFork;
const crypto = __importStar(require("crypto"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const atomic_json_file_1 = require("../core/atomic-json-file");
const group_orchestrator_llm_client_1 = require("../modules/collaboration/group-orchestrator-llm-client");
const group_orchestrator_config_1 = require("../modules/collaboration/group-orchestrator-config");
const agent_communication_v2_1 = require("./agent-communication-v2");
const RECEIPT_FILE = path.join(process.env.CCM_SKILL_FORK_DIR || path.join(os.homedir(), ".cc-connect"), "skill-fork-receipts.json");
function hash(value) { return crypto.createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex"); }
function extractObject(text) {
    const fenced = String(text || "").match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
    for (const candidate of [fenced, text]) {
        if (!candidate)
            continue;
        const start = candidate.indexOf("{");
        const end = candidate.lastIndexOf("}");
        if (start < 0 || end <= start)
            continue;
        try {
            return JSON.parse(candidate.slice(start, end + 1));
        }
        catch { }
    }
    return null;
}
function persistReceipt(receipt) {
    (0, atomic_json_file_1.withFileLock)(RECEIPT_FILE, () => {
        const fallback = { schema: "ccm-skill-fork-receipt-store-v1", revision: 0, receipts: [] };
        const store = (0, atomic_json_file_1.readJsonWithBackup)(RECEIPT_FILE, fallback);
        store.schema = fallback.schema;
        store.revision = Number(store.revision || 0) + 1;
        store.receipts = [...(Array.isArray(store.receipts) ? store.receipts : []), receipt].slice(-2000);
        (0, atomic_json_file_1.writeJsonAtomic)(RECEIPT_FILE, store);
    });
}
async function executeSkillFork(input) {
    const config = (0, group_orchestrator_config_1.loadOrchestratorConfig)();
    if (config.skillForkEnabled === false)
        throw new Error("SKILL_FORK_DISABLED");
    const skill = input.skill || {};
    const communicationIdentity = {
        taskId: `skill:${input.parent.exactSessionId}`,
        workItemId: `skill:${String(skill.name || "unknown")}:${String(input.parent.turn || "turn")}`,
        scope: input.parent.scope,
        scopeId: input.parent.scopeId,
        exactSessionId: input.parent.exactSessionId,
        generation: input.parent.generation,
        attempt: 1,
        senderAgentId: `${input.parent.scope}-main-agent`,
        receiverAgentId: `skill-fork:${String(skill.name || "unknown")}`,
    };
    const dispatch = (0, agent_communication_v2_1.startAgentCommunicationDispatch)({
        ...communicationIdentity,
        ownerId: `skill-fork:${process.pid}`,
        deadlineAt: new Date(Date.now() + Math.max(60_000, Math.min(30 * 60_000, Number(config.timeoutMs || 120_000) * 3))).toISOString(),
        idempotencyKey: hash({ ...communicationIdentity, skillHash: skill.contentHash || "" }),
        payload: { kind: "skill_fork", skillName: String(skill.name || ""), skillHash: String(skill.contentHash || ""), contentStored: false },
        policy: config,
    });
    if (dispatch.enabled && !dispatch.acquired)
        throw new Error("SKILL_FORK_COMMUNICATION_CAPACITY_WAIT");
    const communication = dispatch.envelope;
    if (communication) {
        (0, agent_communication_v2_1.markAgentCommunicationRunnerStarted)(communication.messageId, { runtime: "ccm-skill-fork", contentStored: false });
        (0, agent_communication_v2_1.ensureAgentCommunicationAcknowledged)(communication.messageId, {
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
    const messages = [{
            role: "system",
            content: [
                "You are an isolated CCM Skill child Agent. Complete only this Skill's objective. Use only authorized read-only tools. Do not edit code, dispatch development work, or declare the parent task complete. If a write would be needed, return only a structured WorkItem proposal.",
                `Skill: ${String(skill.name || "")}`,
                `Skill hash: ${String(skill.contentHash || "")}`,
                String(skill.renderedPrompt || skill.prompt || ""),
                "Visible parent context snapshot (no hidden execution chain):",
                String(input.modelVisibleContext || "").slice(0, 100_000),
            ].join("\n\n"),
        }, { role: "user", content: String(skill.input || "") }];
    const evidenceRefs = [];
    const startedAt = Date.now();
    const deadlineAt = startedAt + Math.max(60_000, Math.min(30 * 60_000, Number(config.timeoutMs || 120_000) * 3));
    const repeatedRequests = new Map();
    let usage = null;
    let finalText = "";
    const heartbeatTimer = communication ? setInterval(() => {
        try {
            (0, agent_communication_v2_1.heartbeatAgentCommunication)(communication.messageId, {
                ...communicationIdentity, attempt: communication.attempt, leaseId: communication.leaseId,
                senderAgentId: communication.receiverAgentId, receiverAgentId: communication.senderAgentId,
            }, { phase: "executing", contentStored: false });
        }
        catch { }
    }, Math.max(5_000, Number(config.agentHeartbeatIntervalMs || 20_000))) : null;
    heartbeatTimer?.unref?.();
    try {
        while (!finalText) {
            if (Date.now() >= deadlineAt)
                throw new Error("SKILL_FORK_DEADLINE_EXCEEDED");
            const options = {
                messages,
                maxTokens: 3000,
                temperature: 0.1,
                reasoningEffort: skill.effort || config.reasoningEffort,
                nativeTools: tools,
                nativeToolReference: true,
                retryProfile: "agent_orchestration",
                onUsage: (value) => { usage = value; },
            };
            const text = (0, group_orchestrator_llm_client_1.shouldUseAnthropic)(config) ? await (0, group_orchestrator_llm_client_1.callAnthropicCompatibleChat)(config, options) : await (0, group_orchestrator_llm_client_1.callOpenAiCompatibleChat)(config, options);
            const parsed = extractObject(text);
            const requests = Array.isArray(parsed?.toolRequests) ? parsed.toolRequests : [];
            if (!requests.length) {
                finalText = String(parsed?.reply || parsed?.result || text);
                break;
            }
            const requestFingerprint = hash(requests.map((request) => ({ name: String(request?.name || ""), arguments: request?.arguments || {} })));
            const repeatCount = (repeatedRequests.get(requestFingerprint) || 0) + 1;
            repeatedRequests.set(requestFingerprint, repeatCount);
            if (repeatCount >= 3)
                throw new Error("SKILL_FORK_REPEATED_NO_PROGRESS");
            const results = [];
            for (const request of requests.slice(0, 4)) {
                const name = String(request?.name || "");
                if (!tools.some(tool => tool.name === name)) {
                    results.push({ name, ok: false, error: "SKILL_FORK_TOOL_NOT_AUTHORIZED" });
                    continue;
                }
                try {
                    const value = await input.executeTool(name, request?.arguments || {});
                    const resultChecksum = hash(value);
                    evidenceRefs.push(resultChecksum);
                    results.push({ name, ok: true, result: value, resultChecksum });
                }
                catch (error) {
                    results.push({ name, ok: false, error: String(error?.message || error).slice(0, 1000) });
                }
            }
            messages.push({ role: "assistant", content: text }, { role: "user", content: JSON.stringify({ toolResults: results }) });
        }
        if (!finalText)
            throw new Error("SKILL_FORK_NO_PROGRESS");
    }
    catch (error) {
        if (communication) {
            try {
                (0, agent_communication_v2_1.submitAgentCommunicationResult)(communication.messageId, { status: "failed", summary: String(error?.message || error), blockers: [String(error?.message || error)], sideEffectState: "none" });
                (0, agent_communication_v2_1.finalizeAgentCommunication)(communication.messageId, "failed", { summary: "Skill隔离执行未完成", sideEffectState: "none" });
            }
            catch { }
        }
        throw error;
    }
    finally {
        if (heartbeatTimer)
            clearInterval(heartbeatTimer);
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
        (0, agent_communication_v2_1.submitAgentCommunicationResult)(communication.messageId, {
            status: "submitted", summary: `Skill ${String(skill.name || "")} 已返回隔离结果`,
            verificationResults: [{ check: "result_checksum", pass: true, checksum: receipt.resultChecksum }],
            artifactRefs: [receipt.receiptId], sideEffectState: "none",
        });
        (0, agent_communication_v2_1.finalizeAgentCommunication)(communication.messageId, "accepted", {
            summary: "CCM已校验Skill hash、只读权限和结果checksum",
            verificationResults: [{ check: "skill_hash", pass: !!receipt.skillHash }, { check: "result_checksum", pass: true }],
            artifactRefs: [receipt.receiptId], sideEffectState: "none",
        });
    }
    return { ok: true, name: String(skill.name || ""), contentHash: String(skill.contentHash || ""), executionMode: "fork", result: finalText, resultChecksum: receipt.resultChecksum, invokedAt: receipt.completedAt, receipt };
}
//# sourceMappingURL=skill-fork-runtime.js.map