"use strict";
// Behavior-freeze split from collaboration-agent-probes.ts (part 1/2).
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasFreshSuccessfulAgentProbe = hasFreshSuccessfulAgentProbe;
exports.taskMatchesAgentProbeTarget = taskMatchesAgentProbeTarget;
exports.getAgentProbeTargetStatusKey = getAgentProbeTargetStatusKey;
exports.readAgentProbeStatus = readAgentProbeStatus;
exports.getAgentProbeHealth = getAgentProbeHealth;
exports.getAgentProbeOutputFailure = getAgentProbeOutputFailure;
exports.getAgentExecutionReadiness = getAgentExecutionReadiness;
exports.enforceAgentProbeExecutionReadiness = enforceAgentProbeExecutionReadiness;
const memory_1 = require("./memory");
const agent_receipts_1 = require("./agent-receipts");
const collaboration_1 = require("./collaboration");
function hasFreshSuccessfulAgentProbe(readiness) {
    return readiness?.probe?.success === true
        && Number(readiness?.probe?.age_ms || Infinity) < collaboration_1.AGENT_PROBE_SUCCESS_FRESH_MS;
}
function taskMatchesAgentProbeTarget(task, target = null) {
    return require("./collaboration-task-runtime").taskMatchesAgentProbeTarget(task, target);
}
function getAgentProbeTargetStatusKey(target) {
    const normalized = (0, collaboration_1.normalizeAgentProbeTarget)(target);
    if (!normalized.groupId && !normalized.project && !normalized.agentType)
        return "";
    const clean = (value, fallback) => String(value || fallback)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/gi, "_")
        .replace(/^_+|_+$/g, "") || fallback;
    return [
        clean(normalized.groupId, "any-group"),
        clean(normalized.project, "any-project"),
        clean(normalized.agentType, "any-agent"),
    ].join("__");
}
function readAgentProbeStatus(requiredTarget = null) {
    const required = (0, collaboration_1.normalizeAgentProbeTarget)(requiredTarget || {});
    const hasRequired = !!(required.groupId || required.project || required.agentType);
    if (hasRequired) {
        const exactFile = (0, collaboration_1.getAgentProbeTargetStatusFile)(required);
        const exact = (0, collaboration_1.readAgentProbeStatusFile)(exactFile);
        if (exact)
            return exact;
        const matched = (0, collaboration_1.listAgentProbeTargetStatuses)(required)[0];
        if (matched)
            return matched;
    }
    const latest = (0, collaboration_1.readAgentProbeStatusFile)(collaboration_1.AGENT_PROBE_STATUS_FILE);
    if (!hasRequired)
        return latest;
    return latest && (0, collaboration_1.doesProbeTargetMatchRequired)(latest?.target, required) ? latest : null;
}
function getAgentProbeHealth(probe) {
    if (!probe) {
        return {
            status: "missing",
            successFresh: false,
            failureRecent: false,
            message: "尚未运行 Agent CLI 探针",
        };
    }
    const age = Number(probe.age_ms ?? Infinity);
    if (probe.success === true && age < collaboration_1.AGENT_PROBE_SUCCESS_FRESH_MS) {
        return {
            status: "ok",
            successFresh: true,
            failureRecent: false,
            message: "Agent CLI 探针最近通过",
        };
    }
    if (probe.success === false && age < collaboration_1.AGENT_PROBE_FAILURE_BLOCK_MS) {
        return {
            status: "failed",
            successFresh: false,
            failureRecent: true,
            message: probe.message || probe.error || "Agent CLI 探针最近失败",
        };
    }
    return {
        status: probe.success === true ? "stale_ok" : "stale_failed",
        successFresh: false,
        failureRecent: false,
        message: probe.success === true ? "Agent CLI 探针已过期，建议复检" : "Agent CLI 失败探针已过期，建议复检",
    };
}
function getAgentProbeOutputFailure(output) {
    const text = String(output || "").trim();
    if (!text) {
        return {
            message: "Agent CLI 已返回空输出，未包含预期探针标记",
            error: "empty_output",
        };
    }
    if ((0, agent_receipts_1.checkTaskFailure)(text) || /Agent Runner 错误|Agent 错误|响应超时|ConnectionRefused|Unable to connect to API|ECONNREFUSED/i.test(text)) {
        return {
            message: `Agent CLI 探针失败：${(0, memory_1.compactMemoryText)(text, 500)}`,
            error: (0, memory_1.compactMemoryText)(text, 1000),
        };
    }
    return {
        message: "Agent CLI 已返回，但未包含预期探针标记",
        error: (0, memory_1.compactMemoryText)(text, 1000),
    };
}
function getAgentExecutionReadiness(probeTarget = null) {
    const childProcess = (0, collaboration_1.getChildProcessCapability)();
    const probe = readAgentProbeStatus(probeTarget);
    const probeHealth = getAgentProbeHealth(probe);
    if (probeHealth.failureRecent) {
        const externalRunner = (0, collaboration_1.getExternalAgentRunnerStatus)();
        const message = `Agent CLI 探针最近失败：${probeHealth.message}`;
        return {
            ready: false,
            mode: "agent-cli-probe-failed",
            message,
            fix_actions: (0, collaboration_1.buildAgentExecutionFixActions)({
                error: message,
                childProcess,
                externalRunner,
                probe,
            }),
            childProcess,
            externalRunner,
            probe,
            probeHealth,
        };
    }
    if (childProcess.ok) {
        return {
            ready: true,
            mode: "node-child-process",
            message: probeHealth.successFresh
                ? `Node 可启动子进程，且 Agent CLI 探针最近通过：${childProcess.stdout || "ok"}`
                : `Node 可启动子进程，Agent CLI 调用底座可用但模型 CLI 连通性未复检：${childProcess.stdout || "ok"}`,
            fix_actions: [],
            childProcess,
            probe,
            probeHealth,
        };
    }
    const externalRunner = (0, collaboration_1.getExternalAgentRunnerStatus)();
    const lastResult = externalRunner.last_result || null;
    const lastFailure = lastResult?.success === false;
    const recentFailure = lastFailure && Number(lastResult?.age_ms || 0) < 15 * 60 * 1000;
    if (externalRunner.active && (!recentFailure || probeHealth.successFresh)) {
        return {
            ready: true,
            mode: "external-runner",
            message: recentFailure && probeHealth.successFresh
                ? "Node 直接启动子进程受限，外部 Agent Runner 最近有失败记录，但 Agent CLI 探针已新鲜通过，允许继续通过 Runner 执行"
                : "Node 直接启动子进程受限，但外部 Agent Runner 在线，子 Agent CLI 将通过 Runner 执行",
            fix_actions: [],
            childProcess,
            externalRunner,
            probe,
            probeHealth,
        };
    }
    const message = lastFailure
        ? `外部 Agent Runner 最近执行 ${lastResult.command || "Agent CLI"} 失败：${lastResult.error || lastResult.output || "未知错误"}；${lastResult.hint || "请检查子 Agent CLI"}`
        : `Node 无法启动子进程，项目 Agent 无法调用 CLI：${childProcess.error || childProcess.stderr || "未知错误"}；可运行 npm run agent-runner:ps 启用外部执行通道`;
    return {
        ready: false,
        mode: externalRunner.active ? "external-runner-blocked" : "blocked",
        message,
        fix_actions: (0, collaboration_1.buildAgentExecutionFixActions)({
            error: message,
            childProcess,
            externalRunner,
            probe,
        }),
        childProcess,
        externalRunner,
        probe,
        probeHealth,
    };
}
function enforceAgentProbeExecutionReadiness(capability = {}) {
    const childProcess = capability.childProcess || { ok: false };
    const externalRunner = capability.externalRunner || { active: false };
    const probe = capability.probe || null;
    const probeHealth = capability.probeHealth || getAgentProbeHealth(probe);
    const claudeGateway = (0, collaboration_1.getClaudeLocalGatewayReadiness)(capability.probeTarget || probe?.target || null);
    if (claudeGateway) {
        return {
            ...claudeGateway,
            childProcess,
            externalRunner,
            probe,
            probeHealth,
        };
    }
    if (childProcess.ok) {
        return {
            ready: true,
            mode: "node-child-process-probe",
            message: `Node 可启动子进程，可重新运行 Agent CLI 探针：${childProcess.stdout || "ok"}`,
            fix_actions: [],
            childProcess,
            externalRunner,
            probe,
            probeHealth,
        };
    }
    if (externalRunner.active) {
        return {
            ready: true,
            mode: "external-runner-probe",
            message: "Node 直接启动子进程受限，但外部 Agent Runner 在线，可重新运行 Agent CLI 探针",
            fix_actions: [],
            childProcess,
            externalRunner,
            probe,
            probeHealth,
        };
    }
    const message = `无法运行 Agent CLI 探针：Node 无法启动子进程，且外部 Agent Runner 未在线；${childProcess.error || childProcess.stderr || "请启用执行通道"}`;
    return {
        ready: false,
        mode: "probe-runner-blocked",
        message,
        fix_actions: (0, collaboration_1.buildAgentExecutionFixActions)({
            error: message,
            childProcess,
            externalRunner,
            probe,
        }),
        childProcess,
        externalRunner,
        probe,
        probeHealth,
    };
}
//# sourceMappingURL=collaboration-agent-probes-part-01.js.map