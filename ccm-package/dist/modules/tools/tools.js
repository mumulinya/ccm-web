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
exports.runToolChainVerificationSelfTest = runToolChainVerificationSelfTest;
exports.handleToolsAndMetricsApi = handleToolsAndMetricsApi;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const perf_hooks_1 = require("perf_hooks");
const child_process_1 = require("child_process");
const utils_1 = require("../../core/utils");
const db_1 = require("../../core/db");
const storage_1 = require("../collaboration/storage");
const runtime_tool_sync_1 = require("../../tools/runtime-tool-sync");
const tool_authorization_1 = require("../../tools/tool-authorization");
const runtime_tool_real_cli_matrix_1 = require("../../tools/runtime-tool-real-cli-matrix");
const { toolManager } = require("../../tools/tool-manager");
const TOOL_CATALOG_AUDIT_FILE = path.join(os.homedir(), ".cc-connect", "tools", "catalog-operations.jsonl");
const TOOL_INVOCATION_AUDIT_FILES = {
    toolLoop: path.join(os.homedir(), ".cc-connect", "agent-runner", "tool-call-loop.jsonl"),
    skillInvocations: path.join(os.homedir(), ".cc-connect", "agent-runner", "skill-invocations.jsonl"),
    permissionViolations: path.join(os.homedir(), ".cc-connect", "agent-runner", "tool-permission-violations.jsonl"),
};
const MARKETPLACE_OPERATIONS_AUDIT_FILE = path.join(os.homedir(), ".cc-connect", "marketplace", "operations.jsonl");
const AGENT_RUNNER_DIR = path.join(os.homedir(), ".cc-connect", "agent-runner");
const AGENT_PROBE_STATUS_FILE = path.join(AGENT_RUNNER_DIR, "probe-status.json");
const AGENT_PROBE_TARGET_STATUS_DIR = path.join(AGENT_RUNNER_DIR, "probe-targets");
const REAL_CLI_PROBE_SUCCESS_FRESH_MS = 24 * 60 * 60 * 1000;
let previousMetricsCpuUsage = process.cpuUsage();
let previousMetricsCpuAt = process.hrtime.bigint();
let previousEventLoopUtilization = perf_hooks_1.performance.eventLoopUtilization();
function buildLivePerformanceSnapshot() {
    const now = process.hrtime.bigint();
    const cpuUsage = process.cpuUsage(previousMetricsCpuUsage);
    const elapsedMicros = Math.max(1, Number(now - previousMetricsCpuAt) / 1000);
    const cpuPercent = Math.max(0, Math.min(100, (((cpuUsage.user + cpuUsage.system) / elapsedMicros) * 100) / Math.max(1, os.cpus().length)));
    const eventLoop = perf_hooks_1.performance.eventLoopUtilization(previousEventLoopUtilization);
    previousMetricsCpuUsage = process.cpuUsage();
    previousMetricsCpuAt = now;
    previousEventLoopUtilization = perf_hooks_1.performance.eventLoopUtilization();
    const memory = process.memoryUsage();
    return {
        collectedAt: new Date().toISOString(),
        process: {
            pid: process.pid,
            uptimeSeconds: Math.round(process.uptime()),
            cpuPercent: Number(cpuPercent.toFixed(1)),
            rssBytes: memory.rss,
            heapUsedBytes: memory.heapUsed,
            heapTotalBytes: memory.heapTotal,
            externalBytes: memory.external,
        },
        eventLoop: {
            utilization: Number((Math.max(0, Math.min(1, eventLoop.utilization || 0)) * 100).toFixed(1)),
            activeMs: Number((eventLoop.active || 0).toFixed(1)),
            idleMs: Number((eventLoop.idle || 0).toFixed(1)),
        },
    };
}
function appendJsonlBounded(file, entry) {
    try {
        fs.mkdirSync(path.dirname(file), { recursive: true });
        if (fs.existsSync(file) && fs.statSync(file).size > 2 * 1024 * 1024) {
            const content = fs.readFileSync(file, "utf-8");
            const tail = content.slice(-1024 * 1024);
            fs.writeFileSync(file, tail.slice(Math.max(0, tail.indexOf("\n") + 1)), "utf-8");
        }
        fs.appendFileSync(file, `${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`, "utf-8");
    }
    catch { }
}
async function reloadToolManagerAfterCatalogMutation(entry) {
    await toolManager.loadTools();
    const toolList = toolManager.getToolList();
    const audit = {
        schema: "ccm-tool-catalog-operation-v1",
        action: entry.action,
        type: entry.type,
        name: entry.name,
        source: entry.source || "manual-api",
        changed: entry.changed !== false,
        reloaded: true,
        status: {
            mcpServers: Array.isArray(toolList.servers) ? toolList.servers.length : 0,
            mcpTools: Array.isArray(toolList.mcp) ? toolList.mcp.length : 0,
            skills: Array.isArray(toolList.skillTools) ? toolList.skillTools.length : 0,
        },
    };
    appendJsonlBounded(TOOL_CATALOG_AUDIT_FILE, audit);
    return audit;
}
function cleanAuditText(value, max = 240) {
    return String(value || "").replace(/[\0\r\n\t]+/g, " ").trim().slice(0, max);
}
function safeAuditNumber(value) {
    const number = Number(value || 0);
    return Number.isFinite(number) && number > 0 ? number : 0;
}
function readRecentJsonl(file, limit = 80) {
    try {
        if (!fs.existsSync(file))
            return [];
        const content = fs.readFileSync(file, "utf-8").slice(-1024 * 1024);
        return content
            .split(/\r?\n/)
            .filter(Boolean)
            .slice(-Math.max(1, Math.min(500, limit * 4)))
            .map(line => {
            try {
                return JSON.parse(line);
            }
            catch {
                return null;
            }
        })
            .filter(Boolean);
    }
    catch {
        return [];
    }
}
function readJsonFileSafe(file) {
    try {
        if (!file || !fs.existsSync(file))
            return null;
        return JSON.parse(fs.readFileSync(file, "utf-8"));
    }
    catch {
        return null;
    }
}
function runtimeAuditTargetKey(audit) {
    const project = cleanAuditText(audit?.projectName || "", 180).toLowerCase();
    const group = cleanAuditText(audit?.groupId || "", 180).toLowerCase();
    if (group && project)
        return `group:${group}:${project}`;
    if (project)
        return `project:${project}`;
    return `snapshot:${cleanAuditText(audit?.runtime || "", 80)}:${cleanAuditText(audit?.snapshotId || audit?.mcpConfigPath || "", 180)}`;
}
function selectLatestRuntimeToolAudits(audits) {
    const seen = new Set();
    return audits
        .slice()
        .sort((left, right) => String(right?.timestamp || right?.generatedAt || "").localeCompare(String(left?.timestamp || left?.generatedAt || "")))
        .filter((audit) => {
        const key = runtimeAuditTargetKey(audit);
        if (!key || seen.has(key))
            return false;
        seen.add(key);
        return true;
    });
}
function scopeSummary(scope = {}) {
    return {
        mcp: Array.isArray(scope?.mcp) ? scope.mcp.length : 0,
        skill: Array.isArray(scope?.skill) ? scope.skill.length : 0,
    };
}
function auditContextFromEntry(entry = {}) {
    const scopeContext = entry?.scope?.auditContext || entry?.auditContext || {};
    return {
        runtime: entry?.runtime || scopeContext.runtime || "",
        project: entry?.project || scopeContext.project || "",
        groupId: entry?.groupId || entry?.group_id || scopeContext.groupId || scopeContext.group_id || "",
        taskId: entry?.taskId || entry?.task_id || scopeContext.taskId || scopeContext.task_id || "",
        executionId: entry?.executionId || entry?.execution_id || scopeContext.executionId || scopeContext.execution_id || "",
        invocationSource: entry?.source || scopeContext.source || "",
    };
}
function sanitizeToolInvocationAuditEntry(entry, source) {
    const context = auditContextFromEntry(entry);
    const common = {
        at: cleanAuditText(entry?.at || entry?.invokedAt || "", 80),
        source,
        type: cleanAuditText(entry?.type || "", 80),
        runtime: cleanAuditText(context.runtime, 80),
        project: cleanAuditText(context.project, 180),
        groupId: cleanAuditText(context.groupId, 180),
        taskId: cleanAuditText(context.taskId, 180),
        executionId: cleanAuditText(context.executionId, 180),
        invocationSource: cleanAuditText(context.invocationSource, 120),
    };
    if (source === "skill_invocation") {
        const invoked = entry?.type === "skill_invoked";
        return {
            ...common,
            category: entry?.type === "skill_unauthorized" ? "unauthorized" : "skill",
            skill: cleanAuditText(entry?.skill || "", 180),
            contentHash: cleanAuditText(entry?.contentHash || "", 80),
            ok: invoked && entry?.ok !== false,
            inputBytes: safeAuditNumber(entry?.inputBytes),
            scope: scopeSummary(entry?.scope || {}),
        };
    }
    if (source === "permission_violation") {
        return {
            ...common,
            category: "unauthorized",
            tool: cleanAuditText(entry?.tool || "", 180),
            server: cleanAuditText(entry?.server || "", 180),
            rule: cleanAuditText(entry?.rule || "", 180),
            ok: false,
            scope: scopeSummary(entry?.scope || {}),
        };
    }
    return {
        ...common,
        category: entry?.type === "tool_call" ? "tool" : "loop",
        tool: cleanAuditText(entry?.tool || "", 180),
        round: safeAuditNumber(entry?.round),
        ok: entry?.ok === true,
        argumentsHash: cleanAuditText(entry?.argumentsHash || "", 120),
        termination: cleanAuditText(entry?.termination || "", 80),
        toolCalls: safeAuditNumber(entry?.toolCalls),
        durationMs: safeAuditNumber(entry?.durationMs),
        nativeSession: entry?.nativeSession === true,
        error: cleanAuditText(entry?.error || "", 500),
    };
}
function toolInvocationAuditMatchesFilter(item, input = {}) {
    const projectFilters = [
        input.project,
        input.projectName,
        input.project_name,
        input.projectAlias,
        input.project_alias,
        ...((Array.isArray(input.projects) ? input.projects : [])),
        ...((Array.isArray(input.projectAliases) ? input.projectAliases : [])),
        ...String(input.projectAliases || input.project_aliases || "")
            .split(",")
            .map(value => value.trim())
            .filter(Boolean),
    ]
        .map(value => cleanAuditText(value || "", 180).toLowerCase())
        .filter(Boolean);
    const filters = {
        runtime: cleanAuditText(input.runtime || "", 80).toLowerCase(),
        groupId: cleanAuditText(input.groupId || input.group_id || "", 180).toLowerCase(),
        taskId: cleanAuditText(input.taskId || input.task_id || "", 180).toLowerCase(),
        category: cleanAuditText(input.category || "", 80).toLowerCase(),
        source: cleanAuditText(input.source || "", 80).toLowerCase(),
    };
    if (filters.runtime && String(item.runtime || "").toLowerCase() !== filters.runtime)
        return false;
    if (projectFilters.length && !projectFilters.includes(String(item.project || "").toLowerCase()))
        return false;
    if (filters.groupId && String(item.groupId || "").toLowerCase() !== filters.groupId)
        return false;
    if (filters.taskId && String(item.taskId || "").toLowerCase() !== filters.taskId)
        return false;
    if (filters.category && String(item.category || "").toLowerCase() !== filters.category)
        return false;
    if (filters.source
        && String(item.source || "").toLowerCase() !== filters.source
        && String(item.invocationSource || "").toLowerCase() !== filters.source)
        return false;
    return true;
}
function buildToolInvocationAudit(input = {}) {
    const requestedLimit = Number(input.limit || 80);
    const limit = Math.max(1, Math.min(200, Number.isFinite(requestedLimit) ? requestedLimit : 80));
    const rawItems = [
        ...readRecentJsonl(TOOL_INVOCATION_AUDIT_FILES.toolLoop, limit).map(entry => sanitizeToolInvocationAuditEntry(entry, "tool_loop")),
        ...readRecentJsonl(TOOL_INVOCATION_AUDIT_FILES.skillInvocations, limit).map(entry => sanitizeToolInvocationAuditEntry(entry, "skill_invocation")),
        ...readRecentJsonl(TOOL_INVOCATION_AUDIT_FILES.permissionViolations, limit).map(entry => sanitizeToolInvocationAuditEntry(entry, "permission_violation")),
    ]
        .filter(entry => entry.at || entry.type)
        .sort((a, b) => String(b.at || "").localeCompare(String(a.at || "")));
    const items = rawItems
        .filter(item => toolInvocationAuditMatchesFilter(item, input))
        .slice(0, limit);
    return {
        schema: "ccm-tool-invocation-audit-v1",
        success: true,
        limit,
        filters: {
            runtime: cleanAuditText(input.runtime || "", 80),
            project: cleanAuditText(input.project || input.projectName || input.project_name || "", 180),
            projectAliases: String(input.projectAliases || input.project_aliases || "")
                .split(",")
                .map(value => cleanAuditText(value, 180))
                .filter(Boolean),
            groupId: cleanAuditText(input.groupId || input.group_id || "", 180),
            taskId: cleanAuditText(input.taskId || input.task_id || "", 180),
            category: cleanAuditText(input.category || "", 80),
            source: cleanAuditText(input.source || "", 80),
        },
        files: TOOL_INVOCATION_AUDIT_FILES,
        summary: {
            totalReturned: items.length,
            toolCalls: items.filter((item) => item.category === "tool").length,
            successfulToolCalls: items.filter((item) => item.category === "tool" && item.ok === true).length,
            failedToolCalls: items.filter((item) => item.category === "tool" && item.ok === false).length,
            skillInvocations: items.filter((item) => item.category === "skill").length,
            unauthorized: items.filter((item) => item.category === "unauthorized").length,
            loopsFinished: items.filter((item) => item.type === "tool_loop_finished").length,
        },
        items,
    };
}
function chainVerificationStatus(row, invocationSummary) {
    const configured = Number(row?.counts?.mcp || 0) + Number(row?.counts?.skill || 0) > 0;
    const runtimeSummary = row?.runtime?.summary || {};
    if (!configured)
        return "not_configured";
    if (row?.authorization_readiness?.dispatchReady === false)
        return "authorization_blocked";
    if (Number(runtimeSummary.total || 0) === 0)
        return "runtime_missing";
    if (Number(runtimeSummary.needsResync || 0) > 0)
        return "runtime_needs_resync";
    if (Number(invocationSummary.unauthorized || 0) > 0)
        return "unauthorized_attempts";
    if (Number(invocationSummary.totalObserved || 0) === 0)
        return "ready_not_observed";
    if (invocationSummary.evidenceComplete !== true)
        return "verification_incomplete";
    return "verified";
}
function chainVerificationStatusLabel(status) {
    const labels = {
        not_configured: "未配置工具",
        authorization_blocked: "授权阻断",
        runtime_missing: "缺少运行时快照",
        runtime_needs_resync: "运行时需重同步",
        unauthorized_attempts: "存在越权尝试",
        ready_not_observed: "就绪但未观察到调用",
        verification_incomplete: "调用验证未通过",
        verified: "已验证可用",
    };
    return labels[status] || status || "unknown";
}
function auditItemMatchesInventoryScope(item, row) {
    const id = cleanAuditText(row?.id || "", 240).toLowerCase();
    const name = cleanAuditText(row?.name || "", 240).toLowerCase();
    if (!id && !name)
        return false;
    if (row?.scope === "group")
        return cleanAuditText(item?.groupId || "", 240).toLowerCase() === id;
    const project = cleanAuditText(item?.project || "", 240).toLowerCase();
    return project === id || (!!name && project === name);
}
function buildScopeInvocationEvidence(row, auditItems) {
    const items = auditItems.filter(item => auditItemMatchesInventoryScope(item, row));
    const grantedSkills = new Set((Array.isArray(row?.tools?.skill) ? row.tools.skill : []).map((item) => cleanAuditText(item).toLowerCase()).filter(Boolean));
    const skillItems = items.filter(item => item.category === "skill");
    const authorizedSkillItems = skillItems.filter(item => grantedSkills.has(cleanAuditText(item.skill).toLowerCase()));
    const toolItems = items.filter(item => item.category === "tool");
    const successfulToolItems = toolItems.filter(item => item.ok === true);
    const successfulSkillItems = authorizedSkillItems.filter(item => item.ok === true);
    const unauthorizedItems = items.filter(item => item.category === "unauthorized");
    const loopItems = items.filter(item => item.type === "tool_loop_finished");
    const requiresMcp = Number(row?.counts?.mcp || 0) > 0;
    const requiresSkill = Number(row?.counts?.skill || 0) > 0;
    const mcpVerified = !requiresMcp || successfulToolItems.length > 0;
    const skillVerified = !requiresSkill || successfulSkillItems.length > 0;
    return {
        summary: {
            totalObserved: toolItems.length + skillItems.length,
            toolCalls: toolItems.length,
            successfulToolCalls: successfulToolItems.length,
            failedToolCalls: toolItems.filter(item => item.ok === false).length,
            skillInvocations: skillItems.length,
            authorizedSkillInvocations: authorizedSkillItems.length,
            successfulSkillInvocations: successfulSkillItems.length,
            unauthorized: unauthorizedItems.length,
            loopsFinished: loopItems.length,
            lastObservedAt: items[0]?.at || "",
            requiresMcp,
            requiresSkill,
            mcpVerified,
            skillVerified,
            evidenceComplete: mcpVerified && skillVerified,
            missingEvidence: [
                ...(!mcpVerified ? ["mcp_success"] : []),
                ...(!skillVerified ? ["skill_success"] : []),
            ],
        },
        recent: items.slice(0, 8),
    };
}
function buildChainVerificationAuditFilter(row, category = "") {
    const filter = {};
    if (row?.scope === "group")
        filter.groupId = cleanAuditText(row.id || "", 240);
    if (row?.scope === "project") {
        filter.project = cleanAuditText(row.id || "", 240);
        const name = cleanAuditText(row.name || "", 240);
        if (name && name !== filter.project)
            filter.projectAliases = [name];
    }
    if (category)
        filter.category = category;
    return filter;
}
function buildChainVerificationResyncPayload(row) {
    const payload = { staleOnly: false, limit: 20 };
    const staleSnapshots = (Array.isArray(row?.runtime?.snapshots) ? row.runtime.snapshots : [])
        .filter((snapshot) => snapshot?.catalogStale || snapshot?.dispatchReady === false || snapshot?.deliveryReady === false)
        .map((snapshot) => cleanAuditText(snapshot?.snapshotId || "", 120))
        .filter(Boolean);
    if (staleSnapshots.length) {
        payload.snapshotIds = staleSnapshots.slice(0, 20);
        return payload;
    }
    if (row?.scope === "group")
        payload.groupId = cleanAuditText(row.id || "", 240);
    if (row?.scope === "project")
        payload.projectName = cleanAuditText(row.id || "", 240);
    return payload;
}
function buildChainVerificationNextActions(row, status) {
    const base = {
        scope: row?.scope || "",
        scopeId: cleanAuditText(row?.id || "", 240),
        scopeName: cleanAuditText(row?.name || row?.id || "", 240),
    };
    const actions = [];
    if (status === "not_configured") {
        actions.push({ ...base, kind: "open_authorization", label: "配置授权" });
        return actions;
    }
    if (status === "authorization_blocked") {
        actions.push({ ...base, kind: "open_authorization", label: "检查授权" });
        actions.push({ ...base, kind: "open_invocation_audit", label: "查看审计", filters: buildChainVerificationAuditFilter(row) });
        return actions;
    }
    if (status === "runtime_missing") {
        actions.push({ ...base, kind: "open_runtime", label: "查看运行时" });
        actions.push({ ...base, kind: "open_authorization", label: "检查授权" });
        return actions;
    }
    if (status === "runtime_needs_resync") {
        actions.push({ ...base, kind: "runtime_resync", label: "重同步此范围", resyncPayload: buildChainVerificationResyncPayload(row) });
        actions.push({ ...base, kind: "open_runtime", label: "查看运行时" });
        return actions;
    }
    if (status === "unauthorized_attempts") {
        actions.push({ ...base, kind: "open_invocation_audit", label: "查看越权", filters: buildChainVerificationAuditFilter(row, "unauthorized") });
        actions.push({ ...base, kind: "open_authorization", label: "复核授权" });
        return actions;
    }
    if (status === "ready_not_observed") {
        actions.push({ ...base, kind: "open_invocation_audit", label: "查看审计", filters: buildChainVerificationAuditFilter(row) });
        actions.push({ ...base, kind: "open_runtime", label: "查看运行时" });
        return actions;
    }
    if (status === "verification_incomplete") {
        actions.push({
            ...base,
            kind: "open_scope_real_task",
            label: row?.scope === "group" ? "前往群聊执行真实任务" : "前往项目执行真实任务",
        });
        actions.push({ ...base, kind: "open_invocation_audit", label: "查看失败记录", filters: buildChainVerificationAuditFilter(row) });
        return actions;
    }
    actions.push({ ...base, kind: "open_invocation_audit", label: "查看审计", filters: buildChainVerificationAuditFilter(row) });
    return actions;
}
const CHAIN_VERIFICATION_BLOCKING_STATUSES = new Set([
    "authorization_blocked",
    "runtime_missing",
    "runtime_needs_resync",
    "unauthorized_attempts",
]);
function chainVerificationRowIsConfigured(row) {
    return Number(row?.counts?.mcp || 0) + Number(row?.counts?.skill || 0) > 0;
}
function compactChainVerificationScope(row) {
    return {
        scope: cleanAuditText(row?.scope || "", 40),
        id: cleanAuditText(row?.id || "", 240),
        name: cleanAuditText(row?.name || row?.id || "", 240),
        status: cleanAuditText(row?.status || "", 80),
        statusLabel: cleanAuditText(row?.statusLabel || row?.status || "", 120),
        counts: {
            mcp: Number(row?.counts?.mcp || 0),
            skill: Number(row?.counts?.skill || 0),
        },
        nextActionKinds: (Array.isArray(row?.nextActions) ? row.nextActions : [])
            .map((action) => cleanAuditText(action?.kind || "", 80))
            .filter(Boolean)
            .slice(0, 8),
    };
}
function buildChainVerificationGate(rows) {
    const configuredRows = rows.filter(chainVerificationRowIsConfigured);
    const blockingRows = configuredRows.filter(row => CHAIN_VERIFICATION_BLOCKING_STATUSES.has(row.status));
    const pendingObservationRows = configuredRows.filter(row => ["ready_not_observed", "verification_incomplete"].includes(row.status));
    const verifiedRows = configuredRows.filter(row => row.status === "verified");
    const status = configuredRows.length === 0
        ? "not_configured"
        : blockingRows.length > 0
            ? "blocked"
            : pendingObservationRows.length > 0
                ? "ready_unverified"
                : "verified";
    const actionSeen = new Set();
    const nextActions = [...blockingRows, ...pendingObservationRows]
        .flatMap(row => (Array.isArray(row.nextActions) ? row.nextActions : []).map((action) => ({
        ...action,
        status: row.status,
        statusLabel: row.statusLabel,
    })))
        .filter((action) => {
        const key = [
            cleanAuditText(action?.scope || "", 40),
            cleanAuditText(action?.scopeId || "", 240),
            cleanAuditText(action?.kind || "", 80),
        ].join(":");
        if (!key || actionSeen.has(key))
            return false;
        actionSeen.add(key);
        return true;
    })
        .slice(0, 20);
    return {
        schema: "ccm-tool-chain-verification-gate-v1",
        status,
        dispatchReady: configuredRows.length > 0 && blockingRows.length === 0,
        verified: configuredRows.length > 0 && blockingRows.length === 0 && pendingObservationRows.length === 0,
        requiresObservation: configuredRows.length > 0 && blockingRows.length === 0 && pendingObservationRows.length > 0,
        counts: {
            configuredScopes: configuredRows.length,
            blockingScopes: blockingRows.length,
            pendingObservationScopes: pendingObservationRows.length,
            verifiedScopes: verifiedRows.length,
            unconfiguredScopes: rows.filter((row) => !chainVerificationRowIsConfigured(row)).length,
        },
        blockingStatuses: Array.from(new Set(blockingRows.map(row => row.status))).sort(),
        blockingScopes: blockingRows.map(compactChainVerificationScope).slice(0, 20),
        pendingObservationScopes: pendingObservationRows.map(compactChainVerificationScope).slice(0, 20),
        verifiedScopes: verifiedRows.map(compactChainVerificationScope).slice(0, 20),
        nextActions,
    };
}
function buildToolChainVerification(input = {}) {
    const runtimeReadiness = Array.isArray(input.runtimeReadiness)
        ? input.runtimeReadiness
        : (0, runtime_tool_sync_1.listRecentRuntimeToolAudits)(80).map(audit => (0, runtime_tool_sync_1.probeRuntimeToolReadiness)(audit, { record: false }));
    const inventory = input.inventory || (0, tool_authorization_1.buildToolAuthorizationInventory)({
        projects: input.projects || (0, db_1.loadProjectConfigs)(),
        groups: input.groups || (0, storage_1.loadGroups)(),
        runtimeReadiness,
    });
    const audit = input.invocationAudit || buildToolInvocationAudit({ limit: input.auditLimit || 200 });
    const scopeFilter = cleanAuditText(input.scope || "", 40).toLowerCase();
    const scopeIdFilter = cleanAuditText(input.scopeId || input.scope_id || "", 240).toLowerCase();
    const groupIdFilter = cleanAuditText(input.groupId || input.group_id || "", 240).toLowerCase();
    const projectFilter = cleanAuditText(input.project || input.projectName || input.project_name || "", 240).toLowerCase();
    const statusFilter = cleanAuditText(input.status || "", 80).toLowerCase();
    const rows = (inventory.scopes || [])
        .map((row) => {
        const invocation = buildScopeInvocationEvidence(row, audit.items || []);
        const status = chainVerificationStatus(row, invocation.summary);
        return {
            schema: "ccm-tool-chain-verification-scope-v1",
            scope: row.scope,
            id: row.id,
            name: row.name,
            status,
            statusLabel: chainVerificationStatusLabel(status),
            tools: row.tools,
            counts: row.counts,
            authorization: {
                dispatchReady: row.authorization_readiness?.dispatchReady !== false,
                status: row.authorization_readiness?.status || "",
                missing: row.audit_summary || {},
            },
            runtime: row.runtime,
            invocation,
            nextActions: buildChainVerificationNextActions(row, status),
            evidence: {
                authorizationReady: row.authorization_readiness?.dispatchReady !== false,
                runtimeSnapshots: Number(row.runtime?.summary?.total || 0),
                runtimeNeedsResync: Number(row.runtime?.summary?.needsResync || 0),
                invocationObserved: Number(invocation.summary.totalObserved || 0) > 0,
                unauthorizedAttempts: Number(invocation.summary.unauthorized || 0),
            },
        };
    })
        .filter((row) => !scopeFilter || row.scope === scopeFilter)
        .filter((row) => !scopeIdFilter || cleanAuditText(row.id, 240).toLowerCase() === scopeIdFilter)
        .filter((row) => !groupIdFilter || (row.scope === "group" && cleanAuditText(row.id, 240).toLowerCase() === groupIdFilter))
        .filter((row) => !projectFilter || (row.scope === "project" && (cleanAuditText(row.id, 240).toLowerCase() === projectFilter || cleanAuditText(row.name, 240).toLowerCase() === projectFilter)))
        .filter((row) => !statusFilter || row.status === statusFilter);
    const statusCounts = rows.reduce((acc, row) => {
        acc[row.status] = Number(acc[row.status] || 0) + 1;
        return acc;
    }, {});
    const gate = buildChainVerificationGate(rows);
    return {
        schema: "ccm-tool-chain-verification-v1",
        success: true,
        generatedAt: new Date().toISOString(),
        filters: {
            scope: scopeFilter,
            scopeId: scopeIdFilter,
            groupId: groupIdFilter,
            project: projectFilter,
            status: statusFilter,
        },
        summary: {
            totalScopes: rows.length,
            configuredScopes: rows.filter((row) => Number(row.counts?.mcp || 0) + Number(row.counts?.skill || 0) > 0).length,
            verified: Number(statusCounts.verified || 0),
            readyNotObserved: Number(statusCounts.ready_not_observed || 0),
            verificationIncomplete: Number(statusCounts.verification_incomplete || 0),
            needsAttention: rows.filter((row) => ["authorization_blocked", "runtime_missing", "runtime_needs_resync", "unauthorized_attempts"].includes(row.status)).length,
            authorizationBlocked: Number(statusCounts.authorization_blocked || 0),
            runtimeMissing: Number(statusCounts.runtime_missing || 0),
            runtimeNeedsResync: Number(statusCounts.runtime_needs_resync || 0),
            unauthorizedAttempts: rows.reduce((sum, row) => sum + Number(row.invocation?.summary?.unauthorized || 0), 0),
            observedInvocations: rows.reduce((sum, row) => sum + Number(row.invocation?.summary?.totalObserved || 0), 0),
            statusCounts,
        },
        gate,
        rows,
    };
}
function goalRequirement(id, label, status, evidence = {}, blockers = [], nextActions = []) {
    return {
        id,
        label,
        status,
        proven: status === "proven",
        evidence,
        blockers,
        nextActions,
    };
}
function buildMarketplaceGoalEvidence(input = {}) {
    const entries = Array.isArray(input.marketplaceOperations?.items)
        ? input.marketplaceOperations.items
        : readRecentJsonl(MARKETPLACE_OPERATIONS_AUDIT_FILE, 120);
    const installOrUpdate = entries.filter((entry) => ["install", "update"].includes(String(entry?.action || "")));
    const uninstall = entries.filter((entry) => String(entry?.action || "") === "uninstall");
    const sourceProof = entries.filter((entry) => entry?.sourceProof?.schema === "ccm-marketplace-source-proof-v1");
    const runtimeBridge = entries.filter((entry) => entry?.runtimeImpact?.schema === "ccm-marketplace-runtime-impact-v1"
        && entry?.runtimeResync?.schema === "ccm-marketplace-runtime-resync-v1");
    return {
        operations: entries.length,
        installOrUpdate: installOrUpdate.length,
        uninstall: uninstall.length,
        sourceProof: sourceProof.length,
        runtimeBridge: runtimeBridge.length,
        hasLifecycleEvidence: installOrUpdate.length > 0 && sourceProof.length > 0,
        hasRuntimeBridgeEvidence: runtimeBridge.length > 0,
    };
}
function buildRuntimeGoalEvidence(chain = {}) {
    const summary = chain.summary || {};
    const gate = chain.gate || {};
    return {
        configuredScopes: Number(summary.configuredScopes || 0),
        verifiedScopes: Number(summary.verified || 0),
        readyNotObserved: Number(summary.readyNotObserved || 0),
        verificationIncomplete: Number(summary.verificationIncomplete || 0),
        needsAttention: Number(summary.needsAttention || 0),
        authorizationBlocked: Number(summary.authorizationBlocked || 0),
        runtimeMissing: Number(summary.runtimeMissing || 0),
        runtimeNeedsResync: Number(summary.runtimeNeedsResync || 0),
        unauthorizedAttempts: Number(summary.unauthorizedAttempts || 0),
        observedInvocations: Number(summary.observedInvocations || 0),
        gateStatus: String(gate.status || "not_configured"),
        dispatchReady: gate.dispatchReady === true,
        verified: gate.verified === true,
    };
}
function hasOwnKey(value, key) {
    return !!value && Object.prototype.hasOwnProperty.call(value, key);
}
function normalizeTruthFlag(value) {
    return value === true || value === 1 || String(value || "").toLowerCase() === "true" || String(value || "") === "1";
}
function normalizeRealCliRuntime(value) {
    const compact = String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
    if (["claudecode", "claudecodecli", "claude"].includes(compact))
        return "claudecode";
    if (compact === "cursor")
        return "cursor";
    if (compact === "codex")
        return "codex";
    return "";
}
function normalizeRealCliProbeTarget(target = {}) {
    return {
        groupId: cleanAuditText(target.group_id || target.groupId || "", 80),
        project: cleanAuditText(target.project || target.projectName || target.project_id || target.projectId || "", 120),
        agentType: normalizeRealCliRuntime(target.agent_type || target.agentType || target.runtime),
    };
}
function normalizeRealCliProbeFilter(input = {}) {
    const target = input.probeTarget || input.probe_target || input.target || input;
    return {
        groupId: cleanAuditText(target.group_id || target.groupId || "", 80),
        project: cleanAuditText(target.project || target.projectName || target.project_id || target.projectId || "", 120),
    };
}
function realCliProbeMatchesFilter(probe, filter) {
    const target = normalizeRealCliProbeTarget(probe?.target || {});
    return (!filter.groupId || target.groupId === filter.groupId)
        && (!filter.project || target.project.toLowerCase() === filter.project.toLowerCase());
}
function listRealCliProbeStatusInputs(input = {}) {
    const provided = input.realCliProbeStatuses || input.real_cli_probe_statuses;
    if (Array.isArray(provided))
        return provided.map((probe) => ({ probe, sourceFile: "", source: "input" }));
    const single = input.realCliProbeStatus || input.real_cli_probe_status;
    if (single)
        return [{ probe: single, sourceFile: "", source: "input" }];
    const entries = [];
    const matrix = (0, runtime_tool_real_cli_matrix_1.getRuntimeToolRealCliMatrixStatus)();
    if (matrix?.schema === "ccm-runtime-tool-real-cli-matrix-v1" && Array.isArray(matrix.results)) {
        for (const probe of matrix.results)
            entries.push({ probe, sourceFile: "runtime-tool-real-cli-matrix.json", source: "runtime_tool_real_cli_matrix" });
    }
    const latest = readJsonFileSafe(AGENT_PROBE_STATUS_FILE);
    if (latest)
        entries.push({ probe: latest, sourceFile: path.basename(AGENT_PROBE_STATUS_FILE), source: "persisted_agent_probe" });
    try {
        if (fs.existsSync(AGENT_PROBE_TARGET_STATUS_DIR)) {
            for (const file of fs.readdirSync(AGENT_PROBE_TARGET_STATUS_DIR)) {
                if (!file.endsWith(".json"))
                    continue;
                const fullPath = path.join(AGENT_PROBE_TARGET_STATUS_DIR, file);
                const probe = readJsonFileSafe(fullPath);
                if (probe)
                    entries.push({ probe, sourceFile: file, source: "persisted_agent_probe" });
            }
        }
    }
    catch { }
    return entries;
}
function normalizeRealCliProbeStatus(entry) {
    const probe = entry?.probe || entry || {};
    const target = normalizeRealCliProbeTarget(probe.target || {});
    const runtime = target.agentType || normalizeRealCliRuntime(probe.agent_type || probe.agentType || probe.runtime);
    if (!["claudecode", "cursor", "codex"].includes(runtime))
        return null;
    const checkedAt = cleanAuditText(probe.checked_at || probe.checkedAt || probe.at || "", 80);
    const checkedAtMs = checkedAt ? Date.parse(checkedAt) : NaN;
    const ageMs = Number.isFinite(checkedAtMs) ? Math.max(0, Date.now() - checkedAtMs) : null;
    const nativeToolEvidence = probe.schema === "ccm-runtime-tool-real-cli-e2e-v1"
        && probe.mcpInvocationObserved === true
        && probe.skillInvocationObserved === true
        && probe.snapshotValidated === true
        && probe.versionMatches !== false;
    const success = probe.success === true && nativeToolEvidence;
    const fresh = success && ageMs !== null && ageMs <= REAL_CLI_PROBE_SUCCESS_FRESH_MS;
    const expectedMarker = cleanAuditText(probe.expected_marker || probe.expectedMarker || "", 120);
    return {
        runtime,
        success,
        fresh,
        status: fresh ? "fresh_ok" : (success ? "stale_ok" : "failed"),
        checkedAt,
        ageMs,
        target,
        source: entry?.source || "input",
        sourceFile: cleanAuditText(entry?.sourceFile || "", 160),
        executionPath: cleanAuditText(probe.execution_path || probe.executionPath || "", 120),
        expectedMarker,
        markerObserved: expectedMarker ? String(probe.output_preview || probe.outputPreview || "").includes(expectedMarker) : null,
        nativeToolEvidence,
        mcpInvocationObserved: probe.mcpInvocationObserved === true,
        skillInvocationObserved: probe.skillInvocationObserved === true,
        snapshotValidated: probe.snapshotValidated === true,
        durationMs: safeAuditNumber(probe.duration_ms || probe.durationMs),
    };
}
function buildPersistedRealCliProbeEvidence(input = {}) {
    const filter = normalizeRealCliProbeFilter(input);
    const seen = new Set();
    const probes = listRealCliProbeStatusInputs(input)
        .filter((entry) => realCliProbeMatchesFilter(entry?.probe, filter))
        .map((entry) => normalizeRealCliProbeStatus(entry))
        .filter(Boolean)
        .filter((probe) => {
        const key = [
            probe.runtime,
            probe.target?.groupId,
            probe.target?.project,
            probe.checkedAt,
            probe.success ? "1" : "0",
            probe.expectedMarker,
        ].join("|");
        if (seen.has(key))
            return false;
        seen.add(key);
        return true;
    })
        .sort((a, b) => Date.parse(b.checkedAt || "") - Date.parse(a.checkedAt || ""));
    const runtimes = {
        claudecode: { required: true, freshSuccesses: 0, successes: 0, failures: 0, latest: null },
        cursor: { required: true, freshSuccesses: 0, successes: 0, failures: 0, latest: null },
        codex: { required: true, freshSuccesses: 0, successes: 0, failures: 0, latest: null },
    };
    for (const probe of probes) {
        const runtime = runtimes[probe.runtime];
        if (!runtime)
            continue;
        if (!runtime.latest)
            runtime.latest = probe;
        if (probe.success)
            runtime.successes += 1;
        else
            runtime.failures += 1;
        if (probe.fresh)
            runtime.freshSuccesses += 1;
    }
    return {
        source: probes.some((probe) => probe.source === "input") ? "input_probe_status" : "persisted_agent_probe",
        freshWindowMs: REAL_CLI_PROBE_SUCCESS_FRESH_MS,
        filter,
        probesFound: probes.length,
        runtimes,
    };
}
function hasExplicitRealCliEvidence(input = {}) {
    return hasOwnKey(input, "realCliE2E") || hasOwnKey(input, "real_cli_e2e");
}
function normalizeRealCliEvidence(value = {}, input = {}) {
    if (!hasExplicitRealCliEvidence(input)) {
        const probes = buildPersistedRealCliProbeEvidence(input);
        return {
            claudecode: probes.runtimes.claudecode.freshSuccesses > 0,
            cursor: probes.runtimes.cursor.freshSuccesses > 0,
            codex: probes.runtimes.codex.freshSuccesses > 0,
            source: probes.source,
            probes,
        };
    }
    const explicit = value || {};
    return {
        claudecode: normalizeTruthFlag(explicit.claudecode) || normalizeTruthFlag(explicit.claudeCode) || normalizeTruthFlag(explicit.claude_code),
        cursor: normalizeTruthFlag(explicit.cursor),
        codex: normalizeTruthFlag(explicit.codex),
        source: "input",
        probes: null,
    };
}
function buildMcpSkillGoalCompletionAudit(input = {}) {
    const chain = input.chainVerification || buildToolChainVerification(input);
    const runtime = buildRuntimeGoalEvidence(chain);
    const marketplace = buildMarketplaceGoalEvidence(input);
    const realCli = normalizeRealCliEvidence(input.realCliE2E || input.real_cli_e2e || {}, input);
    const realCliReady = realCli.claudecode && realCli.cursor && realCli.codex;
    const requirements = [
        goalRequirement("central_authorization_catalog", "CCM central MCP/Skill catalog is connected to project/group authorization", runtime.configuredScopes > 0 ? "proven" : "missing", { configuredScopes: runtime.configuredScopes, gateStatus: runtime.gateStatus }, runtime.configuredScopes > 0 ? [] : [{ id: "no_configured_scope", detail: "No configured project/group MCP/Skill authorization scope was found" }], runtime.configuredScopes > 0 ? [] : [{ kind: "configure_scope_tools", label: "Configure MCP/Skill for a project or group" }]),
        goalRequirement("dispatch_gate_ready", "Runtime dispatch gate blocks unsafe scopes and allows ready scopes", runtime.dispatchReady ? (runtime.verified ? "proven" : "partial") : "missing", { gateStatus: runtime.gateStatus, dispatchReady: runtime.dispatchReady, verified: runtime.verified, needsAttention: runtime.needsAttention }, runtime.dispatchReady ? [] : [{ id: "dispatch_gate_blocked", detail: `Gate status: ${runtime.gateStatus}` }], runtime.dispatchReady ? [] : [{ kind: "open_chain_verification", label: "Open chain verification blockers" }]),
        goalRequirement("runtime_artifact_delivery", "Authorized MCP/Skill runtime artifacts are ready for configured child-agent scopes", runtime.runtimeMissing === 0 && runtime.runtimeNeedsResync === 0 && runtime.configuredScopes > 0 ? "proven" : "missing", { runtimeMissing: runtime.runtimeMissing, runtimeNeedsResync: runtime.runtimeNeedsResync, configuredScopes: runtime.configuredScopes }, [
            ...(runtime.runtimeMissing ? [{ id: "runtime_missing", detail: `${runtime.runtimeMissing} configured scopes have no runtime snapshot` }] : []),
            ...(runtime.runtimeNeedsResync ? [{ id: "runtime_needs_resync", detail: `${runtime.runtimeNeedsResync} runtime snapshots need resync` }] : []),
        ], runtime.runtimeMissing || runtime.runtimeNeedsResync ? [{ kind: "runtime_resync", label: "Resync affected runtime snapshots" }] : []),
        goalRequirement("observed_child_agent_invocation", "Authorized MCP/Skill use has been observed through child-agent execution audit", runtime.verifiedScopes > 0 && runtime.verifiedScopes === runtime.configuredScopes ? "proven" : (runtime.observedInvocations > 0 ? "partial" : "missing"), { verifiedScopes: runtime.verifiedScopes, configuredScopes: runtime.configuredScopes, observedInvocations: runtime.observedInvocations, readyNotObserved: runtime.readyNotObserved }, runtime.verifiedScopes === runtime.configuredScopes && runtime.configuredScopes > 0 ? [] : [{ id: "observation_gap", detail: "Not every configured scope has observed authorized MCP/Skill invocation evidence" }], [{ kind: "run_scope_real_tasks", label: "Run real tool-using tasks in each pending project or group" }]),
        goalRequirement("unauthorized_use_blocked", "Unauthorized MCP/Skill attempts are blocked and visible", runtime.unauthorizedAttempts === 0 ? "proven" : "missing", { unauthorizedAttempts: runtime.unauthorizedAttempts }, runtime.unauthorizedAttempts ? [{ id: "unauthorized_attempts", detail: `${runtime.unauthorizedAttempts} unauthorized attempts found in audit` }] : [], runtime.unauthorizedAttempts ? [{ kind: "open_invocation_audit", label: "Inspect unauthorized invocation audit" }] : []),
        goalRequirement("marketplace_lifecycle_bridge", "Marketplace external source lifecycle reaches authorization and runtime resync", marketplace.hasLifecycleEvidence && marketplace.hasRuntimeBridgeEvidence ? "proven" : (marketplace.operations > 0 ? "partial" : "missing"), marketplace, marketplace.hasLifecycleEvidence && marketplace.hasRuntimeBridgeEvidence ? [] : [{ id: "marketplace_evidence_gap", detail: "Need source proof plus install/update/uninstall runtime bridge evidence" }], [{ kind: "marketplace_install_e2e", label: "Install or update a marketplace MCP/Skill with auto runtime resync" }]),
        goalRequirement("real_cli_e2e", "Real Claude Code, Cursor, and Codex CLI E2E has proven native discovery and invocation", realCliReady ? "proven" : "missing", realCli, realCliReady ? [] : [{ id: "real_cli_e2e_missing", detail: "Artifact/self-test evidence exists, but real CLI invocation proof is not complete for all target runtimes" }], realCliReady ? [] : [{ kind: "run_real_cli_matrix", label: "Run real Claude Code/Cursor/Codex E2E matrix" }]),
    ];
    const counts = requirements.reduce((acc, item) => {
        acc[item.status] = Number(acc[item.status] || 0) + 1;
        return acc;
    }, { proven: 0, partial: 0, missing: 0 });
    const complete = requirements.every((item) => item.status === "proven");
    return {
        schema: "ccm-mcp-skill-goal-completion-audit-v1",
        success: true,
        generatedAt: new Date().toISOString(),
        status: complete ? "complete" : (counts.missing ? "incomplete" : "partial"),
        complete,
        summary: {
            requirements: requirements.length,
            proven: counts.proven,
            partial: counts.partial,
            missing: counts.missing,
        },
        requirements,
        chainGate: chain.gate || null,
    };
}
function buildToolChainVerificationSelfTestRow(input = {}) {
    const configured = input.configured !== false;
    const counts = configured ? (input.counts || { mcp: 1, skill: 1 }) : { mcp: 0, skill: 0 };
    return {
        schema: "ccm-tool-authorization-inventory-scope-v1",
        scope: input.scope || "project",
        id: input.id || "project-alpha",
        name: input.name || input.id || "Project Alpha",
        tools: configured ? (input.tools || { mcp: ["payments"], skill: ["release-notes"] }) : { mcp: [], skill: [] },
        counts,
        audit_summary: input.audit_summary || {},
        authorization_readiness: input.authorization_readiness || {
            dispatchReady: true,
            status: "ready",
            requested: counts,
            available: counts,
            missing: {},
            invalid_mcp_grants: 0,
        },
        runtime: input.runtime || {
            schema: "ccm-tool-authorization-runtime-coverage-v1",
            summary: { total: configured ? 1 : 0, overallReady: configured ? 1 : 0, deliveryReady: configured ? 1 : 0, runtimeReady: configured ? 1 : 0, needsResync: 0 },
            snapshots: configured ? [{
                    runtime: "codex",
                    snapshotId: `${input.id || "project-alpha"}-snapshot`,
                    projectName: input.id || "project-alpha",
                    groupId: "",
                    deliveryReady: true,
                    runtimeReady: true,
                    overallReady: true,
                    catalogStale: false,
                    dispatchReady: true,
                }] : [],
        },
    };
}
function runToolChainVerificationSelfTest() {
    const verifiedReport = buildToolChainVerification({
        inventory: {
            scopes: [buildToolChainVerificationSelfTestRow({ id: "project-alpha", name: "Alpha App" })],
        },
        invocationAudit: {
            items: [{
                    at: "2026-07-07T00:00:00.000Z",
                    category: "tool",
                    type: "tool_call",
                    project: "Alpha App",
                    tool: "payments/createInvoice",
                    ok: true,
                }, {
                    at: "2026-07-07T00:00:01.000Z",
                    category: "skill",
                    type: "skill_invoked",
                    project: "Alpha App",
                    skill: "release-notes",
                    ok: true,
                }],
        },
    });
    const failedInvocationReport = buildToolChainVerification({
        inventory: {
            scopes: [buildToolChainVerificationSelfTestRow({ id: "project-failed", name: "Failed App" })],
        },
        invocationAudit: {
            items: [{
                    at: "2026-07-07T00:00:00.000Z",
                    category: "tool",
                    type: "tool_call",
                    project: "Failed App",
                    tool: "payments/createInvoice",
                    ok: false,
                }, {
                    at: "2026-07-07T00:00:01.000Z",
                    category: "skill",
                    type: "skill_missing",
                    project: "Failed App",
                    skill: "release-notes",
                    ok: false,
                }],
        },
    });
    const readyUnverifiedReport = buildToolChainVerification({
        inventory: {
            scopes: [buildToolChainVerificationSelfTestRow({ id: "project-ready", name: "Ready App" })],
        },
        invocationAudit: { items: [] },
    });
    const authorizationBlockedRow = buildToolChainVerificationSelfTestRow({
        id: "project-auth-blocked",
        authorization_readiness: {
            dispatchReady: false,
            status: "needs_attention",
            requested: { mcp: 1, skill: 1 },
            available: { mcp: 0, skill: 0 },
            missing: { missing_mcp_servers: 1, missing_mcp_tools: 0, missing_skills: 1 },
            invalid_mcp_grants: 0,
        },
    });
    const runtimeMissingRow = buildToolChainVerificationSelfTestRow({
        id: "project-runtime-missing",
        runtime: {
            schema: "ccm-tool-authorization-runtime-coverage-v1",
            summary: { total: 0, overallReady: 0, deliveryReady: 0, runtimeReady: 0, needsResync: 0 },
            snapshots: [],
        },
    });
    const runtimeNeedsResyncRow = buildToolChainVerificationSelfTestRow({
        id: "project-runtime-stale",
        runtime: {
            schema: "ccm-tool-authorization-runtime-coverage-v1",
            summary: { total: 1, overallReady: 0, deliveryReady: 0, runtimeReady: 1, needsResync: 1 },
            snapshots: [{
                    runtime: "cursor",
                    snapshotId: "stale-snapshot",
                    projectName: "project-runtime-stale",
                    groupId: "",
                    deliveryReady: false,
                    runtimeReady: true,
                    overallReady: false,
                    catalogStale: true,
                    dispatchReady: true,
                }],
        },
    });
    const unauthorizedRow = buildToolChainVerificationSelfTestRow({ scope: "group", id: "group-1", name: "Group One" });
    const emptyRow = buildToolChainVerificationSelfTestRow({ id: "project-empty", configured: false });
    const unauthorizedAudit = {
        items: [{
                at: "2026-07-07T00:02:00.000Z",
                category: "unauthorized",
                type: "tool_unauthorized",
                groupId: "group-1",
                tool: "payments/deleteInvoice",
                ok: false,
            }],
    };
    const blockedReport = buildToolChainVerification({
        inventory: {
            scopes: [authorizationBlockedRow, runtimeMissingRow, runtimeNeedsResyncRow, unauthorizedRow, emptyRow],
        },
        invocationAudit: unauthorizedAudit,
    });
    const staleRow = blockedReport.rows.find((row) => row.id === "project-runtime-stale");
    const staleResyncAction = staleRow?.nextActions?.find((action) => action.kind === "runtime_resync");
    const filteredGroupReport = buildToolChainVerification({
        groupId: "group-1",
        inventory: { scopes: [authorizationBlockedRow, unauthorizedRow] },
        invocationAudit: unauthorizedAudit,
    });
    const marketplaceLifecycleEvidence = {
        action: "install",
        sourceProof: { schema: "ccm-marketplace-source-proof-v1" },
        runtimeImpact: { schema: "ccm-marketplace-runtime-impact-v1" },
        runtimeResync: { schema: "ccm-marketplace-runtime-resync-v1" },
    };
    const freshProbeCheckedAt = new Date().toISOString();
    const staleProbeCheckedAt = new Date(Date.now() - REAL_CLI_PROBE_SUCCESS_FRESH_MS - 1000).toISOString();
    const buildRealCliProbe = (runtime, checkedAt, success = true) => ({
        schema: "ccm-runtime-tool-real-cli-e2e-v1",
        success,
        checked_at: checkedAt,
        target: {
            group_id: "group-1",
            project: `probe-${runtime}`,
            agent_type: runtime,
        },
        execution_path: "selftest-native-cli",
        expected_marker: "CCM_AGENT_PROBE_OK",
        output_preview: success ? "CCM_AGENT_PROBE_OK" : "probe failed",
        duration_ms: 123,
        mcpInvocationObserved: success,
        skillInvocationObserved: success,
        snapshotValidated: success,
    });
    const completionReadyAudit = buildMcpSkillGoalCompletionAudit({
        chainVerification: verifiedReport,
        marketplaceOperations: {
            items: [marketplaceLifecycleEvidence],
        },
        realCliE2E: { claudecode: true, cursor: true, codex: true },
    });
    const completionPersistedProbeAudit = buildMcpSkillGoalCompletionAudit({
        chainVerification: verifiedReport,
        marketplaceOperations: { items: [marketplaceLifecycleEvidence] },
        realCliProbeStatuses: [
            buildRealCliProbe("claudecode", freshProbeCheckedAt),
            buildRealCliProbe("cursor", freshProbeCheckedAt),
            buildRealCliProbe("codex", freshProbeCheckedAt),
        ],
    });
    const completionStaleProbeAudit = buildMcpSkillGoalCompletionAudit({
        chainVerification: verifiedReport,
        marketplaceOperations: { items: [marketplaceLifecycleEvidence] },
        realCliProbeStatuses: [
            buildRealCliProbe("claudecode", staleProbeCheckedAt),
            buildRealCliProbe("cursor", staleProbeCheckedAt),
            buildRealCliProbe("codex", staleProbeCheckedAt),
        ],
    });
    const completionMissingAudit = buildMcpSkillGoalCompletionAudit({
        chainVerification: readyUnverifiedReport,
        marketplaceOperations: { items: [] },
        realCliE2E: { claudecode: false, cursor: false, codex: false },
    });
    const persistedProbeRequirement = completionPersistedProbeAudit.requirements.find((item) => item.id === "real_cli_e2e");
    const staleProbeRequirement = completionStaleProbeAudit.requirements.find((item) => item.id === "real_cli_e2e");
    const checks = {
        verifiedGatePassesObservedScope: verifiedReport.gate?.schema === "ccm-tool-chain-verification-gate-v1"
            && verifiedReport.gate.status === "verified"
            && verifiedReport.gate.dispatchReady === true
            && verifiedReport.gate.verified === true
            && verifiedReport.gate.counts.verifiedScopes === 1,
        readyUnverifiedRequiresObservation: readyUnverifiedReport.gate.status === "ready_unverified"
            && readyUnverifiedReport.gate.dispatchReady === true
            && readyUnverifiedReport.gate.verified === false
            && readyUnverifiedReport.gate.requiresObservation === true
            && readyUnverifiedReport.gate.counts.pendingObservationScopes === 1,
        failedInvocationDoesNotVerifyScope: failedInvocationReport.gate.status === "ready_unverified"
            && failedInvocationReport.gate.verified === false
            && failedInvocationReport.rows[0]?.status === "verification_incomplete"
            && failedInvocationReport.rows[0]?.invocation?.summary?.evidenceComplete === false
            && failedInvocationReport.rows[0]?.invocation?.summary?.missingEvidence?.includes("mcp_success")
            && failedInvocationReport.rows[0]?.invocation?.summary?.missingEvidence?.includes("skill_success"),
        incompleteScopeRoutesToRealBusinessTask: failedInvocationReport.rows[0]?.nextActions?.some((action) => (action.kind === "open_scope_real_task"
            && action.scope === "project"
            && action.scopeId === "project-failed"
            && action.label === "前往项目执行真实任务")) === true
            && failedInvocationReport.rows[0]?.nextActions?.every((action) => action.kind !== "run_child_agent_e2e") === true,
        blockedGateBlocksDispatch: blockedReport.gate.status === "blocked"
            && blockedReport.gate.dispatchReady === false
            && blockedReport.gate.counts.blockingScopes === 4
            && blockedReport.gate.blockingStatuses.includes("authorization_blocked")
            && blockedReport.gate.blockingStatuses.includes("runtime_missing")
            && blockedReport.gate.blockingStatuses.includes("runtime_needs_resync")
            && blockedReport.gate.blockingStatuses.includes("unauthorized_attempts"),
        unconfiguredScopeExcludedFromConfiguredGate: blockedReport.gate.counts.unconfiguredScopes === 1
            && !blockedReport.gate.blockingScopes.some((row) => row.id === "project-empty"),
        runtimeResyncActionTargetsSnapshot: staleResyncAction?.resyncPayload?.staleOnly === false
            && staleResyncAction?.resyncPayload?.snapshotIds?.[0] === "stale-snapshot",
        gateAggregatesNextActions: blockedReport.gate.nextActions.length >= 4
            && blockedReport.gate.nextActions.some((action) => action.kind === "open_invocation_audit" && action.scopeId === "group-1"),
        groupFilterGatesOnlyGroupScope: filteredGroupReport.rows.length === 1
            && filteredGroupReport.rows[0]?.id === "group-1"
            && filteredGroupReport.gate.counts.configuredScopes === 1
            && filteredGroupReport.gate.status === "blocked",
        projectAliasInvocationEvidence: verifiedReport.rows[0]?.invocation?.summary?.totalObserved === 2
            && verifiedReport.rows[0]?.invocation?.summary?.evidenceComplete === true,
        completionAuditCanReachCompleteWithFullEvidence: completionReadyAudit.schema === "ccm-mcp-skill-goal-completion-audit-v1"
            && completionReadyAudit.complete === true
            && completionReadyAudit.status === "complete"
            && completionReadyAudit.summary.missing === 0,
        completionAuditUsesFreshPersistedCliProbeEvidence: completionPersistedProbeAudit.complete === true
            && persistedProbeRequirement?.status === "proven"
            && persistedProbeRequirement?.evidence?.source === "input_probe_status"
            && persistedProbeRequirement?.evidence?.probes?.runtimes?.codex?.freshSuccesses === 1,
        completionAuditRejectsStaleCliProbeEvidence: completionStaleProbeAudit.complete === false
            && staleProbeRequirement?.status === "missing"
            && staleProbeRequirement?.evidence?.codex === false
            && staleProbeRequirement?.evidence?.probes?.runtimes?.codex?.latest?.status === "stale_ok",
        completionAuditKeepsGoalIncompleteWithoutRealCliAndMarketplaceEvidence: completionMissingAudit.complete === false
            && completionMissingAudit.status === "incomplete"
            && completionMissingAudit.requirements.some((item) => item.id === "real_cli_e2e" && item.status === "missing")
            && completionMissingAudit.requirements.some((item) => item.id === "marketplace_lifecycle_bridge" && item.status === "missing"),
    };
    return {
        pass: Object.values(checks).every(Boolean),
        checks,
        reports: {
            verified: verifiedReport.gate,
            readyUnverified: readyUnverifiedReport.gate,
            blocked: blockedReport.gate,
            filteredGroup: filteredGroupReport.gate,
            completionReady: completionReadyAudit,
            completionPersistedProbe: completionPersistedProbeAudit,
            completionStaleProbe: completionStaleProbeAudit,
            completionMissing: completionMissingAudit,
        },
    };
}
// === 终端模拟器辅助函数 ===
function normalizeTerminalCwd(cwd) {
    const candidate = cwd && typeof cwd === "string" ? cwd : os.homedir();
    try {
        const stat = fs.statSync(candidate);
        if (stat.isDirectory())
            return candidate;
    }
    catch { }
    return os.homedir();
}
function splitTerminalCwd(output, marker) {
    const text = output || "";
    const markerIndex = text.lastIndexOf(marker);
    if (markerIndex < 0)
        return { output: text, cwd: null };
    const before = text.slice(0, markerIndex).replace(/(?:\r?\n)+$/, "");
    const after = text.slice(markerIndex + marker.length).trim();
    const firstLine = after.split(/\r?\n/)[0]?.trim() || null;
    return { output: before ? before + os.EOL : "", cwd: firstLine };
}
function runTerminalCommand(command, cwd) {
    const workDir = normalizeTerminalCwd(cwd);
    const marker = `__CCM_TERMINAL_CWD_${Date.now()}_${Math.random().toString(36).slice(2)}__`;
    const commonOptions = {
        encoding: "utf-8",
        cwd: workDir,
        timeout: 30000,
        maxBuffer: 5 * 1024 * 1024,
        windowsHide: true
    };
    const parseResult = (stdout, stderr = "", status = 0, error = null) => {
        const parsed = splitTerminalCwd(stdout, marker);
        const stderrText = String(stderr || "").trim();
        return {
            output: parsed.output,
            cwd: parsed.cwd && fs.existsSync(parsed.cwd) ? parsed.cwd : workDir,
            error: error?.message || (status ? `Exit code: ${status}` : "") || (stderrText ? stderrText : "")
        };
    };
    if (process.platform === "win32") {
        const script = [
            "[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new();",
            "$OutputEncoding = [System.Text.UTF8Encoding]::new();",
            command,
            `Write-Output "${marker}$((Get-Location).ProviderPath)"`
        ].join("\n");
        const result = (0, child_process_1.spawnSync)("powershell.exe", [
            "-NoLogo",
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-Command",
            script
        ], commonOptions);
        return parseResult(result.stdout, result.stderr, result.status, result.error);
    }
    const script = `${command}\nprintf '\\n${marker}%s\\n' "$PWD"`;
    const result = (0, child_process_1.spawnSync)("bash", ["-lc", script], commonOptions);
    return parseResult(result.stdout, result.stderr, result.status, result.error);
}
// === 共享文件系统辅助函数 ===
function listSharedFiles() {
    (0, utils_1.ensureSharedDir)();
    return fs.readdirSync(utils_1.SHARED_DIR)
        .filter(f => !f.startsWith("."))
        .map(f => {
        const stat = fs.statSync(path.join(utils_1.SHARED_DIR, f));
        const ext = path.extname(f).toLowerCase();
        const type = (0, utils_1.isTextFileName)(f) ? "text" : (0, utils_1.isImageFileName)(f) ? "image" : (0, utils_1.isOoxmlFileName)(f) ? ext.slice(1) : "file";
        return { name: f, size: stat.size, modified: stat.mtime.toISOString(), type, path: path.join(utils_1.SHARED_DIR, f) };
    })
        .sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());
}
function readSharedFile(name) {
    const filePath = (0, utils_1.getSharedFilePath)(name);
    if (!filePath)
        return null;
    if (!fs.existsSync(filePath))
        return null;
    return (0, utils_1.describeFileFromPath)(filePath, path.basename(String(name)));
}
// 写入/创建共享文件
function writeSharedFile(name, content) {
    (0, utils_1.ensureSharedDir)();
    const filePath = (0, utils_1.getSharedFilePath)(name);
    if (filePath) {
        fs.writeFileSync(filePath, content);
    }
}
function saveSharedUpload(filename, buffer) {
    (0, utils_1.ensureSharedDir)();
    const safeName = filename.replace(/[<>:"/\\|?*]/g, "_");
    const filePath = path.join(utils_1.SHARED_DIR, safeName);
    fs.writeFileSync(filePath, buffer);
    return safeName;
}
function deleteSharedFile(name) {
    const filePath = path.join(utils_1.SHARED_DIR, name);
    if (fs.existsSync(filePath))
        fs.unlinkSync(filePath);
}
// 物理 Customizations Skills 路径
const customSkillRoots = [
    { root: db_1.SKILL_PACKAGES_DIR, source: "ccm" },
    { root: path.join(os.homedir(), ".gemini", "config", "skills"), source: "gemini" },
];
function loadCustomSkills() {
    const result = [];
    const seen = new Set();
    for (const source of customSkillRoots) {
        if (!fs.existsSync(source.root))
            continue;
        try {
            const folders = fs.readdirSync(source.root, { withFileTypes: true })
                .filter(dirent => dirent.isDirectory() && !dirent.name.startsWith("."));
            for (const folder of folders) {
                const folderPath = path.join(source.root, folder.name);
                const skillMdPath = path.join(folderPath, "SKILL.md");
                if (!fs.existsSync(skillMdPath))
                    continue;
                const mdContent = fs.readFileSync(skillMdPath, "utf-8");
                let name = folder.name;
                let description = "";
                const fmMatch = mdContent.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---/);
                const yamlText = fmMatch ? fmMatch[1] : mdContent.substring(0, 500);
                const nameMatch = yamlText.match(/^name:\s*(.*)$/mi);
                const descMatch = yamlText.match(/^description:\s*(.*)$/mi);
                if (nameMatch)
                    name = nameMatch[1].replace(/^['"]|['"]$/g, "").trim();
                if (descMatch)
                    description = descMatch[1].replace(/^['"]|['"]$/g, "").trim();
                if (seen.has(name))
                    continue;
                seen.add(name);
                result.push({
                    id: folder.name,
                    name,
                    description,
                    source: source.source,
                    packagePath: folderPath,
                    mdPath: skillMdPath,
                    content: mdContent
                });
            }
        }
        catch (e) {
            console.error(`加载 ${source.source} Skill 包失败:`, e);
        }
    }
    return result;
}
function handleToolsAndMetricsApi(pathname, req, res, parsed) {
    // === MCP/Skills API ===
    if (pathname === "/api/tools/status" && req.method === "GET") {
        (0, utils_1.sendJson)(res, { success: true, ...toolManager.getToolList() });
        return true;
    }
    if (pathname === "/api/tools/authorization-options" && req.method === "GET") {
        (0, utils_1.sendJson)(res, (0, tool_authorization_1.buildToolAuthorizationOptions)({
            mcpTools: (0, db_1.loadMcpTools)(),
            skills: (0, db_1.loadSkills)(),
            status: toolManager.getToolList(),
        }));
        return true;
    }
    if (pathname === "/api/tools/authorization-inventory" && req.method === "GET") {
        try {
            const includeRuntime = !["0", "false", "no"].includes(String(parsed?.query?.runtime || "1").toLowerCase());
            const runtimeReadiness = includeRuntime
                ? (0, runtime_tool_sync_1.listRecentRuntimeToolAudits)(80).map(audit => (0, runtime_tool_sync_1.probeRuntimeToolReadiness)(audit, { record: false }))
                : [];
            const inventory = (0, tool_authorization_1.buildToolAuthorizationInventory)({
                projects: (0, db_1.loadProjectConfigs)(),
                groups: (0, storage_1.loadGroups)(),
                runtimeReadiness,
            });
            (0, utils_1.sendJson)(res, { success: true, ...inventory });
        }
        catch (e) {
            (0, utils_1.sendJson)(res, { success: false, error: e.message }, 500);
        }
        return true;
    }
    if (pathname === "/api/tools/invocation-audit" && req.method === "GET") {
        (0, utils_1.sendJson)(res, buildToolInvocationAudit(parsed?.query || { limit: 80 }));
        return true;
    }
    if (pathname === "/api/tools/chain-verification" && req.method === "GET") {
        try {
            (0, utils_1.sendJson)(res, buildToolChainVerification(parsed?.query || {}));
        }
        catch (e) {
            (0, utils_1.sendJson)(res, { success: false, error: e.message }, 500);
        }
        return true;
    }
    if (pathname === "/api/tools/mcp-skill-goal-audit" && req.method === "GET") {
        try {
            (0, utils_1.sendJson)(res, buildMcpSkillGoalCompletionAudit(parsed?.query || {}));
        }
        catch (e) {
            (0, utils_1.sendJson)(res, { success: false, error: e.message }, 500);
        }
        return true;
    }
    if (pathname === "/api/tools/runtime-readiness" && req.method === "GET") {
        const deep = ["1", "true", "yes"].includes(String(parsed?.query?.deep || "").toLowerCase());
        const includeHistory = ["1", "true", "yes"].includes(String(parsed?.query?.history || "").toLowerCase());
        const historicalAudits = (0, runtime_tool_sync_1.listRecentRuntimeToolAudits)(80);
        const audits = includeHistory ? historicalAudits : selectLatestRuntimeToolAudits(historicalAudits);
        const readiness = audits.map(audit => (0, runtime_tool_sync_1.probeRuntimeToolReadiness)(audit, { deep }));
        (0, utils_1.sendJson)(res, {
            success: true,
            deep,
            includeHistory,
            historicalTotal: historicalAudits.length,
            readiness,
            summary: {
                total: readiness.length,
                ready: readiness.filter(item => item.overallReady).length,
                deliveryReady: readiness.filter(item => item.deliveryReady).length,
                runtimeReady: readiness.filter(item => item.runtimeReady).length,
            },
        });
        return true;
    }
    if (pathname === "/api/tools/runtime-real-cli-matrix" && req.method === "GET") {
        (0, utils_1.sendJson)(res, { success: true, ...(0, runtime_tool_real_cli_matrix_1.getRuntimeToolRealCliMatrixStatus)() });
        return true;
    }
    if (pathname === "/api/tools/runtime-real-cli-matrix" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const started = (0, runtime_tool_real_cli_matrix_1.startRuntimeToolRealCliMatrix)(payload);
                (0, utils_1.sendJson)(res, { success: true, ...started }, started.accepted ? 202 : 200);
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/tools/runtime-resync" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const resync = (0, runtime_tool_sync_1.resyncRecentRuntimeToolSnapshots)(payload);
                const includeMissing = normalizeTruthFlag(payload.includeMissing ?? payload.include_missing);
                const missing = includeMissing ? (0, runtime_tool_sync_1.resyncMissingRuntimeToolSnapshots)(payload) : null;
                (0, utils_1.sendJson)(res, { success: true, ...resync, missing });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/tools/test" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { command, args, env } = JSON.parse(body);
                toolManager.testConnection(command, env || "", args || []).then((result) => (0, utils_1.sendJson)(res, result));
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/tools/reload" && req.method === "POST") {
        toolManager.disconnect();
        toolManager.loadTools().then(() => (0, utils_1.sendJson)(res, { success: true, ...toolManager.getToolList() }));
        return true;
    }
    if (pathname === "/api/tools/skills/discover" && req.method === "GET") {
        (0, utils_1.sendJson)(res, { success: true, skills: toolManager.discoverSkills() });
        return true;
    }
    if (pathname === "/api/tools/skills/invoke" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = JSON.parse(body || "{}");
                const result = toolManager.invokeSkill(payload.name || payload.skill, payload.input || payload.context || "", payload.scope);
                (0, utils_1.sendJson)(res, { success: !!result.ok, result });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400);
            }
        });
        return true;
    }
    // === MCP 工具管理 API ===
    if (pathname === "/api/mcp" && req.method === "GET") {
        (0, utils_1.sendJson)(res, { tools: (0, db_1.loadMcpTools)() });
        return true;
    }
    if (pathname === "/api/mcp" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", async () => {
            try {
                const tool = JSON.parse(body);
                if (!tool.name)
                    return (0, utils_1.sendJson)(res, { error: "名称不能为空" }, 400);
                const previous = (0, db_1.loadMcpTools)().some(item => String(item.name) === String(tool.name));
                tool.type = "mcp";
                tool.created_at = tool.created_at || new Date().toISOString();
                (0, db_1.saveMcpTool)(tool);
                const reload = await reloadToolManagerAfterCatalogMutation({
                    action: previous ? "update" : "create",
                    type: "mcp",
                    name: tool.name,
                });
                (0, utils_1.sendJson)(res, { success: true, tool, reload });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/mcp/delete" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", async () => {
            try {
                const { name } = JSON.parse(body);
                const previous = (0, db_1.loadMcpTools)().some(item => String(item.name) === String(name));
                (0, db_1.deleteMcpTool)(name);
                const reload = await reloadToolManagerAfterCatalogMutation({
                    action: "delete",
                    type: "mcp",
                    name,
                    changed: previous,
                });
                (0, utils_1.sendJson)(res, { success: true, removed: previous, reload });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    // === Skills API ===
    if (pathname === "/api/skills/customizations" && req.method === "GET") {
        (0, utils_1.sendJson)(res, { success: true, skills: loadCustomSkills() });
        return true;
    }
    if (pathname === "/api/skills" && req.method === "GET") {
        (0, utils_1.sendJson)(res, { skills: (0, db_1.loadSkills)() });
        return true;
    }
    if (pathname === "/api/skills" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", async () => {
            try {
                const skill = JSON.parse(body);
                if (!skill.name)
                    return (0, utils_1.sendJson)(res, { error: "名称不能为空" }, 400);
                const previous = (0, db_1.loadSkills)().some(item => String(item.name) === String(skill.name));
                skill.type = "skill";
                skill.created_at = skill.created_at || new Date().toISOString();
                (0, db_1.saveSkill)(skill);
                const reload = await reloadToolManagerAfterCatalogMutation({
                    action: previous ? "update" : "create",
                    type: "skill",
                    name: skill.name,
                });
                (0, utils_1.sendJson)(res, { success: true, skill, reload });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/skills/delete" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", async () => {
            try {
                const { name } = JSON.parse(body);
                const previous = (0, db_1.loadSkills)().some(item => String(item.name) === String(name));
                (0, db_1.deleteSkill)(name);
                const reload = await reloadToolManagerAfterCatalogMutation({
                    action: "delete",
                    type: "skill",
                    name,
                    changed: previous,
                });
                (0, utils_1.sendJson)(res, { success: true, removed: previous, reload });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    // === 性能监控指标 ===
    if (pathname === "/api/metrics" && req.method === "GET") {
        const metrics = (0, db_1.loadMetrics)();
        const groups = (0, storage_1.loadGroups)().map((group) => {
            const members = Array.isArray(group.members) ? group.members : [];
            const coordinator = members.find((member) => member.role === "coordinator") || members[0] || {};
            return {
                id: String(group.id || ""),
                name: String(group.name || group.id || "未命名群聊"),
                coordinator: String(coordinator.project || "coordinator"),
                members: members.map((member) => ({
                    project: String(member.project || ""),
                    role: String(member.role || (member.project === coordinator.project ? "coordinator" : "member")),
                })).filter((member) => member.project),
            };
        });
        (0, utils_1.sendJson)(res, {
            metrics,
            catalog: {
                groups,
                legacyUnscoped: {
                    agentCount: Object.keys(metrics.agents || {}).length,
                    latestAt: Object.values(metrics.agents || {}).reduce((latest, item) => {
                        const at = String(item?.lastCall || "");
                        return at > latest ? at : latest;
                    }, ""),
                },
            },
            system: buildLivePerformanceSnapshot(),
        });
        return true;
    }
    if (pathname === "/api/metrics/reset" && req.method === "POST") {
        (0, db_1.saveMetrics)({ version: 2, agents: {}, daily: {}, scopes: {}, events: [], updatedAt: null });
        (0, utils_1.sendJson)(res, { success: true });
        return true;
    }
    // === 共享上下文 API ===
    if (pathname === "/api/shared" && req.method === "GET") {
        (0, utils_1.sendJson)(res, { files: listSharedFiles() });
        return true;
    }
    if (pathname === "/api/shared/read" && req.method === "GET") {
        const name = parsed.query.name;
        const data = readSharedFile(name);
        if (!data) {
            (0, utils_1.sendJson)(res, { error: "文件不存在" }, 404);
            return true;
        }
        (0, utils_1.sendJson)(res, { name, ...data });
        return true;
    }
    // 下载文件
    if (pathname === "/api/shared/download" && req.method === "GET") {
        const name = parsed.query.name;
        const filePath = (0, utils_1.getSharedFilePath)(name);
        if (!filePath || !fs.existsSync(filePath)) {
            res.writeHead(404);
            res.end("Not Found");
            return true;
        }
        const ext = path.extname(name).toLowerCase();
        const types = {
            ".pdf": "application/pdf",
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".gif": "image/gif",
            ".webp": "image/webp",
            ".svg": "image/svg+xml"
        };
        res.writeHead(200, {
            "Content-Type": types[ext] || "application/octet-stream",
            "Content-Disposition": `inline; filename="${encodeURIComponent(name)}"`,
        });
        fs.createReadStream(filePath).pipe(res);
        return true;
    }
    // 上传文件（multipart）
    if (pathname === "/api/shared/upload" && req.method === "POST") {
        const ct = req.headers["content-type"] || "";
        if (ct.includes("multipart/form-data")) {
            const chunks = [];
            req.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
            req.on("end", () => {
                try {
                    const buffer = Buffer.concat(chunks);
                    const boundary = (0, utils_1.getMultipartBoundary)(ct);
                    if (!boundary)
                        return (0, utils_1.sendJson)(res, { error: "无效请求" }, 400);
                    const { files } = (0, utils_1.parseMultipart)(buffer, boundary);
                    const uploaded = files.map(f => saveSharedUpload(f.filename, fs.readFileSync(f.savedPath)));
                    try {
                        files.forEach(f => fs.unlinkSync(f.savedPath));
                    }
                    catch { }
                    (0, utils_1.sendJson)(res, { success: true, files: uploaded });
                }
                catch (e) {
                    (0, utils_1.sendJson)(res, { error: e.message }, 400);
                }
            });
            return true;
        }
        (0, utils_1.sendJson)(res, { error: "需要 multipart/form-data" }, 400);
        return true;
    }
    if (pathname === "/api/shared/write" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { name, content } = JSON.parse(body);
                writeSharedFile(name, content);
                (0, utils_1.sendJson)(res, { success: true });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/shared/delete" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { name } = JSON.parse(body);
                deleteSharedFile(name);
                (0, utils_1.sendJson)(res, { success: true });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    // === 原生文件夹选择 API ===
    if (pathname === "/api/filesystem/native-browse" && req.method === "GET") {
        try {
            const psCommand = `
        Add-Type -AssemblyName System.Windows.Forms
        $d = New-Object System.Windows.Forms.FolderBrowserDialog
        $d.Description = 'Select Project Directory'
        $d.ShowNewFolderButton = $true
        if ($d.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
          Write-Output $d.SelectedPath
        }
      `.replace(/\n/g, '; ');
            const out = (0, child_process_1.execSync)(`powershell -WindowStyle Normal -Sta -NoProfile -Command "${psCommand}"`, { encoding: 'utf-8' }).trim();
            if (out && require('fs').existsSync(out)) {
                (0, utils_1.sendJson)(res, { success: true, path: out });
            }
            else {
                (0, utils_1.sendJson)(res, { success: false, error: 'No directory selected' });
            }
        }
        catch (e) {
            (0, utils_1.sendJson)(res, { success: false, error: e.message }, 500);
        }
        return true;
    }
    // === 文件浏览器 API ===
    if (pathname === "/api/filesystem/browse" && req.method === "GET") {
        const dir = parsed.query.dir || os.homedir();
        try {
            const items = fs.readdirSync(dir, { withFileTypes: true })
                .filter(item => !item.name.startsWith('.'))
                .map(item => ({
                name: item.name,
                path: path.join(dir, item.name),
                isDirectory: item.isDirectory(),
                isFile: item.isFile()
            }))
                .sort((a, b) => {
                if (a.isDirectory && !b.isDirectory)
                    return -1;
                if (!a.isDirectory && b.isDirectory)
                    return 1;
                return a.name.localeCompare(b.name);
            })
                .slice(0, 100);
            (0, utils_1.sendJson)(res, { success: true, path: dir, items });
        }
        catch (e) {
            (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400);
        }
        return true;
    }
    // 获取系统磁盘列表
    if (pathname === "/api/filesystem/drives" && req.method === "GET") {
        try {
            let drives = [];
            if (process.platform === 'win32') {
                for (let i = 65; i <= 90; i++) {
                    const letter = String.fromCharCode(i);
                    const drivePath = `${letter}:\\`;
                    try {
                        fs.accessSync(drivePath);
                        drives.push({ name: letter, path: drivePath });
                    }
                    catch { }
                }
            }
            else {
                drives.push({ name: '/', path: '/' });
            }
            (0, utils_1.sendJson)(res, { success: true, drives, home: os.homedir() });
        }
        catch (e) {
            (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400);
        }
        return true;
    }
    // === 终端 API ===
    if (pathname === "/api/terminal/exec" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { command, cwd } = JSON.parse(body);
                if (!command)
                    return (0, utils_1.sendJson)(res, { error: "命令不能为空" }, 400);
                const workDir = cwd || os.homedir();
                console.log(`[终端] 执行命令: ${command} (目录: ${workDir})`);
                try {
                    const result = runTerminalCommand(command, workDir);
                    (0, utils_1.sendJson)(res, { success: true, output: result.output, cwd: result.cwd, error: result.error || undefined });
                }
                catch (e) {
                    const text = (e.stdout || "") + (e.stderr || e.message);
                    (0, utils_1.sendJson)(res, {
                        success: true,
                        output: text,
                        cwd: workDir,
                        error: e.status ? `Exit code: ${e.status}` : e.message
                    });
                }
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    // 获取当前系统信息
    if (pathname === "/api/terminal/info" && req.method === "GET") {
        (0, utils_1.sendJson)(res, {
            success: true,
            platform: process.platform,
            home: os.homedir(),
            cwd: process.cwd(),
            user: os.userInfo().username,
            shell: process.platform === 'win32' ? 'powershell' : 'bash'
        });
        return true;
    }
    return false;
}
//# sourceMappingURL=tools.js.map