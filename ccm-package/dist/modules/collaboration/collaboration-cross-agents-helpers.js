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
exports.getMentionTargetName = getMentionTargetName;
exports.rememberMentionOutputs = rememberMentionOutputs;
exports.getBlockingDependency = getBlockingDependency;
exports.skipMentionDueToDependency = skipMentionDueToDependency;
exports.buildDependencyOutputPacket = buildDependencyOutputPacket;
// Behavior-freeze helpers — mechanically extracted from collaboration-cross-agents.ts
const crypto = __importStar(require("crypto"));
function getMentionTargetName(mention) {
    const mentionStr = typeof mention === "string" ? String(mention) : mention.mention;
    return typeof mention === "string"
        ? (mentionStr.startsWith("@") ? mentionStr.slice(1) : mentionStr)
        : mention.targetName;
}
function rememberMentionOutputs(mention, outputs, completedOutputsByAgent, dependencyStates, getAgentDependencyStateFromOutputs) {
    const agent = getMentionTargetName(mention);
    if (!agent || !outputs?.length)
        return;
    completedOutputsByAgent.set(agent, [...(completedOutputsByAgent.get(agent) || []), ...outputs.filter(Boolean)]);
    dependencyStates.set(agent, getAgentDependencyStateFromOutputs(agent, completedOutputsByAgent.get(agent) || []));
}
function getBlockingDependency(mention, uniqueMentions, dependencyStates) {
    if (typeof mention === "string")
        return null;
    const dependsOn = String(mention.dependsOn || "").trim();
    if (!dependsOn)
        return null;
    const dependencyInBatch = uniqueMentions.some((item) => getMentionTargetName(item) === dependsOn);
    if (!dependencyInBatch)
        return null;
    const state = dependencyStates.get(dependsOn);
    if (!state || state.ok)
        return null;
    return { dependsOn, state };
}
function skipMentionDueToDependency(mention, dependency, ctx) {
    const { groupId, planMessageId, taskId, streamRes, formatCollectedAgentOutput, updateTaskWorkItemFromReceipt, emitAssignmentStatus, addTaskLog, updateGroupMemory, appendGroupMessage, writeSse, } = ctx;
    const targetName = getMentionTargetName(mention);
    const dependsOn = dependency?.dependsOn || "前置 Agent";
    const reason = dependency?.state?.reason || `${dependsOn} 前置依赖未满足`;
    const summary = `依赖未满足，暂不执行 ${targetName}：${reason}`;
    const receipt = {
        agent: targetName,
        status: "blocked",
        summary,
        actions: [],
        filesChanged: [],
        verification: [],
        blockers: [summary],
        needs: [`等待 ${dependsOn} 返回 done 结果说明和可采信验证证据`],
    };
    const outputs = [formatCollectedAgentOutput(targetName, summary, receipt)];
    if (taskId)
        updateTaskWorkItemFromReceipt(taskId, targetName, receipt, null, summary);
    emitAssignmentStatus(streamRes, groupId, planMessageId, targetName, "blocked", `依赖未满足：${dependsOn}`);
    if (taskId)
        addTaskLog(taskId, "warning", `跳过子 Agent：${targetName}；依赖 ${dependsOn} 未满足；${reason}`);
    updateGroupMemory(groupId, {
        currentPhase: "needs_rework",
        blocked: {
            project: targetName,
            reason: summary,
            needs: receipt.needs,
        },
        workerLedger: {
            taskId,
            project: targetName,
            status: "blocked",
            receiptStatus: "blocked",
            summary,
            blockers: receipt.blockers,
            needs: receipt.needs,
        },
        nextAction: `主 Agent 先返工 ${dependsOn}，再继续 ${targetName}`,
    });
    appendGroupMessage(groupId, {
        id: "m" + Date.now().toString(36) + "dep" + crypto.randomBytes(2).toString("hex"),
        role: "assistant",
        agent: "system",
        content: `⏸️ @${targetName} 暂不执行\n${summary}`,
        timestamp: new Date().toISOString(),
        task_id: taskId || undefined,
    });
    writeSse(streamRes, { type: "status", text: summary, agent: targetName });
    return outputs;
}
function buildDependencyOutputPacket(mention, targetName, executionOrder, completedOutputsByAgent, compactMemoryText) {
    const dependencyNames = new Set();
    const explicit = typeof mention !== "string" ? String(mention.dependsOn || "").trim() : "";
    if (explicit)
        dependencyNames.add(explicit);
    if (!explicit && executionOrder === "backend_first" && /app|web|front|frontend|前端/i.test(targetName)) {
        for (const [agent] of completedOutputsByAgent.entries()) {
            if (/cloud|api|server|backend|service|后端/i.test(agent))
                dependencyNames.add(agent);
        }
    }
    const sections = [];
    for (const agent of dependencyNames) {
        const outputs = completedOutputsByAgent.get(agent) || [];
        if (!outputs.length)
            continue;
        sections.push(`【${agent} 前置输出】\n${compactMemoryText(outputs.join("\n\n---\n\n"), 1800)}`);
    }
    if (!sections.length)
        return "";
    return [
        "前置 Agent 输出（主 Agent 注入；你必须吸收这些结论，不能重新猜测依赖方契约）：",
        ...sections,
    ].join("\n\n");
}
//# sourceMappingURL=collaboration-cross-agents-helpers.js.map