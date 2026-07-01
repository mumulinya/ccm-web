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
exports.AGENT_COLLABORATION_LIMITS = void 0;
exports.collaborationQuestionFingerprint = collaborationQuestionFingerprint;
exports.selectCollaborationTarget = selectCollaborationTarget;
exports.buildCollaborationQuestionContract = buildCollaborationQuestionContract;
exports.evaluateCollaborationQuestionAdmission = evaluateCollaborationQuestionAdmission;
exports.evaluateCollaborationAnswer = evaluateCollaborationAnswer;
exports.evaluateAdvisoryPermissionBoundary = evaluateAdvisoryPermissionBoundary;
exports.evaluateCollaborationTimeout = evaluateCollaborationTimeout;
exports.runAgentCollaborationProtocolSelfTest = runAgentCollaborationProtocolSelfTest;
const crypto = __importStar(require("crypto"));
exports.AGENT_COLLABORATION_LIMITS = {
    maxQuestionsPerTask: 8,
    maxPairRepeats: 2,
    maxDepth: 2,
    maxAnswerChars: 6000,
    defaultDeadlineMs: 5 * 60 * 1000,
};
function text(value, max = 4000) {
    return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}
function list(value) {
    if (Array.isArray(value))
        return value.map(item => text(item, 500)).filter(Boolean);
    const normalized = text(value, 2000);
    return normalized ? normalized.split(/[；;、,，\n]/).map(item => item.trim()).filter(Boolean) : [];
}
function collaborationQuestionFingerprint(input) {
    const normalized = [input?.task_id, input?.from_agent, input?.to_agent, text(input?.question).toLowerCase()]
        .map(item => text(item, 1800))
        .join("|");
    return crypto.createHash("sha256").update(normalized).digest("hex").slice(0, 20);
}
function selectCollaborationTarget(input) {
    const members = (input.group?.members || [])
        .map((member) => String(member?.project || "").trim())
        .filter((name) => name && name !== input.sourceProject);
    const explicit = text(input.request?.targetName || input.request?.target || "", 200);
    if (explicit && explicit.toLowerCase() !== "auto" && members.includes(explicit)) {
        return { targetName: explicit, strategy: "explicit", candidates: [{ project: explicit, score: 100, load: 0 }] };
    }
    const required = list(input.request?.required_capabilities || input.request?.requiredCapabilities);
    const query = `${text(input.request?.question)} ${text(input.request?.reason)} ${required.join(" ")}`.toLowerCase();
    const candidates = members.map((project) => {
        const profile = input.profiles?.[project] || {};
        const terms = [...list(profile.capabilities), text(profile.responsibility, 1000), project].filter(Boolean);
        let score = 0;
        for (const term of terms) {
            const normalized = term.toLowerCase();
            if (normalized && query.includes(normalized))
                score += normalized === project.toLowerCase() ? 3 : 12;
            for (const token of normalized.split(/[\s/\\:_\-]+/).filter((item) => item.length >= 2)) {
                if (query.includes(token))
                    score += 2;
            }
        }
        for (const capability of required) {
            if (terms.some(term => term.toLowerCase().includes(capability.toLowerCase())))
                score += 20;
        }
        const load = (input.openItems || []).filter((item) => item?.to_agent === project && ["waiting", "asking", "queued"].includes(String(item?.status || ""))).length;
        score -= load * 5;
        return { project, score, load, capabilities: list(profile.capabilities).slice(0, 12) };
    }).sort((a, b) => b.score - a.score || a.load - b.load || a.project.localeCompare(b.project));
    return {
        targetName: candidates[0]?.project || "",
        strategy: "capability_and_load",
        candidates: candidates.slice(0, 8),
    };
}
function buildCollaborationQuestionContract(input) {
    const now = new Date();
    const deadlineMs = Math.max(30_000, Math.min(30 * 60 * 1000, Number(input?.deadline_ms || input?.deadlineMs || exports.AGENT_COLLABORATION_LIMITS.defaultDeadlineMs)));
    const parentPath = Array.isArray(input?.hop_path) ? input.hop_path.map((item) => text(item, 120)).filter(Boolean) : [];
    const contract = {
        question_id: text(input?.question_id || input?.id, 160) || `qa_${Date.now().toString(36)}_${crypto.randomBytes(3).toString("hex")}`,
        task_id: text(input?.task_id, 200) || `conversation:${text(input?.group_id, 160) || "unknown"}`,
        execution_id: text(input?.execution_id, 200),
        group_id: text(input?.group_id, 200),
        from_agent: text(input?.from_agent, 200),
        to_agent: text(input?.to_agent, 200),
        type: input?.type === "request_review" ? "request_review" : "ask_agent",
        question: text(input?.question, 2000),
        reason: text(input?.reason, 800),
        evidence: list(input?.evidence).slice(0, 20),
        required_capabilities: list(input?.required_capabilities || input?.requiredCapabilities).slice(0, 20),
        blocking: input?.blocking !== false,
        parent_question_id: text(input?.parent_question_id, 200),
        depth: Math.max(0, Number(input?.depth || 0)),
        hop_path: [...parentPath, text(input?.from_agent, 120)].filter(Boolean).slice(-8),
        created_at: now.toISOString(),
        deadline_at: new Date(now.getTime() + deadlineMs).toISOString(),
        permission_contract: {
            mode: "advisory_read_only",
            inherited_from: text(input?.from_agent, 200),
            target_project: text(input?.to_agent, 200),
            write_scope_expanded: false,
            mcp_scope_expanded: false,
            tool_scope_expanded: false,
            rule: "回答 Agent 只能提供结论和证据；不能借询问扩大项目、文件、工具或 MCP 写权限。",
        },
        limits: { ...exports.AGENT_COLLABORATION_LIMITS },
    };
    contract.fingerprint = collaborationQuestionFingerprint(contract);
    return contract;
}
function evaluateCollaborationQuestionAdmission(contract, existingItems = []) {
    if (!contract?.question || contract.question.length < 4)
        return { allowed: false, code: "invalid_question", reason: "问题过短或为空" };
    if (!contract?.from_agent || !contract?.to_agent || contract.from_agent === contract.to_agent)
        return { allowed: false, code: "invalid_route", reason: "询问双方无效或形成自问" };
    if (Number(contract.depth || 0) > exports.AGENT_COLLABORATION_LIMITS.maxDepth)
        return { allowed: false, code: "depth_limit", reason: "Agent 询问深度已达到上限" };
    if ((contract.hop_path || []).filter((item) => item === contract.to_agent).length > 0)
        return { allowed: false, code: "loop_detected", reason: "询问路径将形成 Agent 环路" };
    const taskItems = existingItems.filter(item => String(item?.task_id || "") === contract.task_id);
    if (taskItems.length >= exports.AGENT_COLLABORATION_LIMITS.maxQuestionsPerTask)
        return { allowed: false, code: "task_budget", reason: "本任务 Agent 问答预算已耗尽" };
    const pairItems = taskItems.filter(item => item?.from_agent === contract.from_agent && item?.to_agent === contract.to_agent);
    if (pairItems.length >= exports.AGENT_COLLABORATION_LIMITS.maxPairRepeats)
        return { allowed: false, code: "pair_budget", reason: "同一 Agent 对之间的询问次数已达到上限" };
    const duplicate = taskItems.find(item => item?.fingerprint === contract.fingerprint && !["failed", "timeout", "rejected", "manual"].includes(String(item?.status || "")));
    if (duplicate)
        return { allowed: false, code: "duplicate", reason: "相同问题已经存在，复用已有问答", existing_id: duplicate.id || duplicate.question_id };
    return { allowed: true, code: "accepted", reason: "问答协议门禁通过" };
}
function evaluateCollaborationAnswer(answer, contract, siblingAnswers = []) {
    const answerText = text(answer?.answer ?? answer, exports.AGENT_COLLABORATION_LIMITS.maxAnswerChars);
    const evidence = list(answer?.evidence || contract?.answer_evidence).slice(0, 30);
    const inlineEvidence = answerText.match(/(?:[A-Za-z]:)?[\\/][\w.\-\\/]+|\b[\w./-]+\.(?:ts|js|vue|py|go|rs|java|md|json)\b|https?:\/\/\S+|\b(?:npm|pnpm|yarn|pytest|go test|cargo test|mvn)\b[^\n]*/gi) || [];
    const combinedEvidence = Array.from(new Set([...evidence, ...inlineEvidence.map(item => text(item, 500))])).slice(0, 30);
    const lowInformation = answerText.length < 12 || /不知道|不确定|无法确认|没有上下文|仅供参考/.test(answerText);
    const polarity = /(?:不应|不能|否|false|不支持|不存在)/i.test(answerText) ? "negative" : /(?:应该|可以|是|true|支持|存在)/i.test(answerText) ? "positive" : "neutral";
    const conflicts = siblingAnswers.filter(item => {
        const other = String(item?.acceptance?.polarity || "neutral");
        return other !== "neutral" && polarity !== "neutral" && other !== polarity;
    }).map(item => item.id || item.question_id).filter(Boolean);
    const accepted = !!answerText && !lowInformation && conflicts.length === 0;
    return {
        status: conflicts.length ? "conflict" : accepted ? "accepted" : "needs_evidence",
        accepted,
        score: Math.max(0, Math.min(100, (answerText.length >= 40 ? 45 : 25) + (combinedEvidence.length ? 35 : 0) + (!lowInformation ? 20 : 0))),
        evidence: combinedEvidence,
        polarity,
        conflicts_with: conflicts,
        reason: conflicts.length ? "同任务回答存在相反结论，需要主 Agent 仲裁" : accepted ? "回答内容可用，已由主 Agent 协议门禁采纳" : "回答信息不足或缺少可引用证据",
        arbitrated_by: "group_coordinator",
        arbitrated_at: new Date().toISOString(),
    };
}
function evaluateAdvisoryPermissionBoundary(fileChanges = [], beforeTools = {}, afterTools = {}) {
    const before = JSON.stringify(beforeTools || {});
    const after = JSON.stringify(afterTools || {});
    const violations = [
        ...(fileChanges || []).map(change => ({ type: "file_write", path: String(change?.path || change || "") })),
        ...(before !== after ? [{ type: "tool_scope_change", detail: "问答期间工具/MCP 范围发生变化" }] : []),
    ];
    return {
        pass: violations.length === 0,
        mode: "advisory_read_only",
        violations,
        reason: violations.length ? "回答 Agent 发生了协议外副作用，回答不可直接采纳" : "未发现文件写入或工具权限扩张",
    };
}
function evaluateCollaborationTimeout(contract, now = new Date()) {
    const deadlineMs = Date.parse(String(contract?.deadline_at || ""));
    const nowMs = now instanceof Date ? now.getTime() : typeof now === "number" ? now : Date.parse(String(now));
    const timedOut = Number.isFinite(deadlineMs) && Number.isFinite(nowMs) && nowMs >= deadlineMs;
    return {
        timed_out: timedOut,
        status: timedOut ? "timeout" : "waiting",
        deadline_at: String(contract?.deadline_at || ""),
        checked_at: Number.isFinite(nowMs) ? new Date(nowMs).toISOString() : "",
        recovery: timedOut ? "return_to_coordinator_for_replan" : "keep_waiting",
        reason: timedOut ? "Agent QA 已超过截止时间，交回主 Agent 重规划，不能假装已获得答案" : "仍在 Agent QA 等待窗口内",
    };
}
function runAgentCollaborationProtocolSelfTest() {
    const group = { members: [{ project: "frontend" }, { project: "backend" }, { project: "tester" }] };
    const route = selectCollaborationTarget({
        request: { targetName: "auto", question: "请确认 API 接口字段", required_capabilities: ["api"] },
        group,
        sourceProject: "frontend",
        profiles: { backend: { capabilities: ["api", "database"], responsibility: "后端接口" }, tester: { capabilities: ["test"] } },
        openItems: [{ to_agent: "tester", status: "waiting" }],
    });
    const contract = buildCollaborationQuestionContract({ group_id: "g1", task_id: "t1", execution_id: "e1", from_agent: "frontend", to_agent: route.targetName, question: "请确认 API 接口字段", evidence: ["docs/api.md"], required_capabilities: ["api"] });
    const admission = evaluateCollaborationQuestionAdmission(contract, []);
    const duplicate = evaluateCollaborationQuestionAdmission(contract, [{ ...contract, id: contract.question_id, status: "asking" }]);
    const answer = evaluateCollaborationAnswer({ answer: "接口支持 approved:boolean，定义见 docs/api.md。", evidence: ["docs/api.md"] }, contract, []);
    const permissionOk = evaluateAdvisoryPermissionBoundary([], { mcp: [], skill: [] }, { mcp: [], skill: [] });
    const permissionDenied = evaluateAdvisoryPermissionBoundary([{ path: "src/api.ts" }], {}, {});
    const opposing = evaluateCollaborationAnswer({ answer: "该接口不能返回 approved 字段，证据见 docs/legacy.md。", evidence: ["docs/legacy.md"] }, contract, [{ id: "qa-positive", acceptance: answer }]);
    const timeout = evaluateCollaborationTimeout({ ...contract, deadline_at: "2026-01-01T00:00:00.000Z" }, "2026-01-01T00:00:01.000Z");
    const checks = {
        capabilityRouting: route.targetName === "backend" && route.strategy === "capability_and_load",
        taskAndExecutionBound: contract.task_id === "t1" && contract.execution_id === "e1" && !!contract.question_id,
        permissionDoesNotExpand: contract.permission_contract.write_scope_expanded === false && contract.permission_contract.mcp_scope_expanded === false,
        admissionPasses: admission.allowed === true,
        duplicateStops: duplicate.allowed === false && duplicate.code === "duplicate",
        evidenceAccepted: answer.accepted === true && answer.evidence.includes("docs/api.md"),
        conflictingAnswerStops: opposing.accepted === false && opposing.status === "conflict" && opposing.conflicts_with.includes("qa-positive"),
        timeoutReturnsToCoordinator: timeout.timed_out === true && timeout.recovery === "return_to_coordinator_for_replan",
        sideEffectDetected: permissionOk.pass === true && permissionDenied.pass === false,
    };
    return { pass: Object.values(checks).every(Boolean), checks, route, contract, admission, duplicate, answer, opposing, timeout, permissionOk, permissionDenied };
}
//# sourceMappingURL=agent-collaboration-protocol.js.map