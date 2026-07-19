// Behavior-freeze helpers — mechanically extracted from collaboration-cross-agents.ts
import * as crypto from "crypto";

export function getMentionTargetName(mention: any) {
  const mentionStr = typeof mention === "string" ? String(mention) : mention.mention;
  return typeof mention === "string"
    ? (mentionStr.startsWith("@") ? mentionStr.slice(1) : mentionStr)
    : mention.targetName;
}

export function rememberMentionOutputs(
  mention: any,
  outputs: string[],
  completedOutputsByAgent: Map<string, string[]>,
  dependencyStates: Map<string, any>,
  getAgentDependencyStateFromOutputs: (agent: string, outputs: string[]) => any,
) {
  const agent = getMentionTargetName(mention);
  if (!agent || !outputs?.length) return;
  completedOutputsByAgent.set(agent, [...(completedOutputsByAgent.get(agent) || []), ...outputs.filter(Boolean)]);
  dependencyStates.set(agent, getAgentDependencyStateFromOutputs(agent, completedOutputsByAgent.get(agent) || []));
}

export function getBlockingDependency(
  mention: any,
  uniqueMentions: any[],
  dependencyStates: Map<string, any>,
) {
  if (typeof mention === "string") return null;
  const dependsOn = String(mention.dependsOn || "").trim();
  if (!dependsOn) return null;
  const dependencyInBatch = uniqueMentions.some((item: any) => getMentionTargetName(item) === dependsOn);
  if (!dependencyInBatch) return null;
  const state = dependencyStates.get(dependsOn);
  if (!state || state.ok) return null;
  return { dependsOn, state };
}

export function skipMentionDueToDependency(mention: any, dependency: any, ctx: any) {
  const {
    groupId, planMessageId, taskId, streamRes,
    formatCollectedAgentOutput, updateTaskWorkItemFromReceipt, emitAssignmentStatus,
    addTaskLog, updateGroupMemory, appendGroupMessage, writeSse,
  } = ctx;
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
  if (taskId) updateTaskWorkItemFromReceipt(taskId, targetName, receipt, null, summary);
  emitAssignmentStatus(streamRes, groupId, planMessageId, targetName, "blocked", `依赖未满足：${dependsOn}`);
  if (taskId) addTaskLog(taskId, "warning", `跳过子 Agent：${targetName}；依赖 ${dependsOn} 未满足；${reason}`);
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

export function buildDependencyOutputPacket(
  mention: any,
  targetName: string,
  executionOrder: string,
  completedOutputsByAgent: Map<string, string[]>,
  compactMemoryText: (text: string, limit: number) => string,
) {
  const dependencyNames = new Set<string>();
  const explicit = typeof mention !== "string" ? String(mention.dependsOn || "").trim() : "";
  if (explicit) dependencyNames.add(explicit);
  if (!explicit && executionOrder === "backend_first" && /app|web|front|frontend|前端/i.test(targetName)) {
    for (const [agent] of completedOutputsByAgent.entries()) {
      if (/cloud|api|server|backend|service|后端/i.test(agent)) dependencyNames.add(agent);
    }
  }
  const sections: string[] = [];
  for (const agent of dependencyNames) {
    const outputs = completedOutputsByAgent.get(agent) || [];
    if (!outputs.length) continue;
    sections.push(`【${agent} 前置输出】\n${compactMemoryText(outputs.join("\n\n---\n\n"), 1800)}`);
  }
  if (!sections.length) return "";
  return [
    "前置 Agent 输出（主 Agent 注入；你必须吸收这些结论，不能重新猜测依赖方契约）：",
    ...sections,
  ].join("\n\n");
}
