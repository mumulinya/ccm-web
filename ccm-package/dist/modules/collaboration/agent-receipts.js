"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkTaskCompletion = checkTaskCompletion;
exports.checkTaskFailure = checkTaskFailure;
exports.extractRunnerVerificationEvidence = extractRunnerVerificationEvidence;
exports.extractAgentReceipt = extractAgentReceipt;
exports.getReceiptAssignmentStatus = getReceiptAssignmentStatus;
exports.formatAgentReceiptForReview = formatAgentReceiptForReview;
const memory_1 = require("./memory");
function normalizeReceiptStringArray(value) {
    if (!Array.isArray(value))
        return [];
    return value.map((item) => String(item || "").trim()).filter(Boolean);
}
function uniqueReceiptStrings(...lists) {
    const seen = new Set();
    const result = [];
    for (const list of lists) {
        for (const value of normalizeReceiptStringArray(list)) {
            if (seen.has(value))
                continue;
            seen.add(value);
            result.push(value);
        }
    }
    return result;
}
function parseJsonCandidate(text) {
    try {
        return JSON.parse(text);
    }
    catch {
        return null;
    }
}
function checkTaskCompletion(response) {
    if (!response)
        return false;
    const completionMarkers = [
        "✅ 任务完成", "✅ 已完成", "✅ 完成", "任务已完成",
        "已完成任务", "已经完成", "done", "completed", "finished"
    ];
    const lowerResponse = response.toLowerCase();
    return completionMarkers.some(marker => lowerResponse.includes(marker.toLowerCase()));
}
function checkTaskFailure(response) {
    if (!response)
        return false;
    return /\bAgent 错误:|响应超时|^❌\s*错误|转发给 @.+ 失败|转发失败:\s*spawn EPERM|\bspawn\s+EPERM\b|自动返工已达上限/i.test(response);
}
function extractRunnerVerificationEvidence(text) {
    const raw = String(text || "");
    const markerIndex = raw.lastIndexOf("CCM_RUNNER_VERIFICATION");
    if (markerIndex < 0)
        return null;
    const searchArea = raw.slice(markerIndex);
    const fencePattern = new RegExp("```(?:json)?\\s*([\\s\\S]*?)```", "gi");
    const fenced = ([...searchArea.matchAll(fencePattern)]).map(match => parseJsonCandidate(match[1].trim())).filter(Boolean).pop();
    const data = fenced && fenced.ccm_runner_verification ? fenced : null;
    if (!data)
        return null;
    return {
        status: String(data.status || "").trim(),
        verification: normalizeReceiptStringArray(data.verification),
        failed: normalizeReceiptStringArray(data.failed),
    };
}
function mergeRunnerVerificationIntoReceipt(receipt, raw) {
    if (!receipt)
        return receipt;
    const runnerVerification = extractRunnerVerificationEvidence(raw);
    if (!runnerVerification)
        return receipt;
    const passed = runnerVerification.verification || [];
    const failed = runnerVerification.failed || [];
    if (!passed.length && !failed.length)
        return receipt;
    return {
        ...receipt,
        verification: uniqueReceiptStrings(receipt.verification || [], passed, failed),
        blockers: failed.length ? uniqueReceiptStrings(receipt.blockers || [], failed) : (receipt.blockers || []),
    };
}
function normalizeAgentReceipt(raw, agent) {
    if (!raw || typeof raw !== "object")
        return null;
    const status = String(raw.status || "").trim().toLowerCase();
    const allowed = new Set(["done", "partial", "blocked", "failed", "needs_info"]);
    if (!raw.ccm_receipt && !allowed.has(status))
        return null;
    const memoryUsed = normalizeReceiptStringArray(raw.memoryUsed || raw.memory_used || raw.memoryReferences || raw.memory_references);
    const memoryIgnored = normalizeReceiptStringArray(raw.memoryIgnored || raw.memory_ignored);
    const ackRaw = raw.ack || raw.ACK || raw.acknowledgement || raw.acknowledgment || null;
    const ack = ackRaw && typeof ackRaw === "object" ? {
        understoodGoal: String(ackRaw.understoodGoal || ackRaw.goal || ackRaw.summary || "").trim(),
        plannedScope: normalizeReceiptStringArray(ackRaw.plannedScope || ackRaw.scope || ackRaw.allowedScope),
        forbiddenScope: normalizeReceiptStringArray(ackRaw.forbiddenScope || ackRaw.outOfScope || ackRaw.forbidden),
        verificationPlan: normalizeReceiptStringArray(ackRaw.verificationPlan || ackRaw.verification || ackRaw.tests),
        unclear: normalizeReceiptStringArray(ackRaw.unclear || ackRaw.questions || ackRaw.needsInfo),
    } : null;
    const contractChanges = Array.isArray(raw.contractChanges || raw.contract_changes)
        ? (raw.contractChanges || raw.contract_changes).filter((item) => item && typeof item === "object").map((item) => ({
            type: String(item.type || "").trim(),
            endpoint: String(item.endpoint || item.path || "").trim(),
            request: (0, memory_1.compactMemoryText)(item.request || item.requestSchema || "", 400),
            response: (0, memory_1.compactMemoryText)(item.response || item.responseSchema || "", 400),
            fields: normalizeReceiptStringArray(item.fields || item.changedFields),
            producers: normalizeReceiptStringArray(item.producers || item.provider || item.owner),
            consumers: normalizeReceiptStringArray(item.consumers || item.consumer || item.dependents),
            note: (0, memory_1.compactMemoryText)(item.note || item.summary || "", 300),
        })).slice(0, 12)
        : [];
    return {
        agent,
        status: allowed.has(status) ? status : "partial",
        summary: String(raw.summary || "").trim(),
        actions: normalizeReceiptStringArray(raw.actions),
        filesChanged: normalizeReceiptStringArray(raw.filesChanged || raw.files_changed || raw.files),
        verification: normalizeReceiptStringArray(raw.verification || raw.tests),
        blockers: normalizeReceiptStringArray(raw.blockers),
        needs: normalizeReceiptStringArray(raw.needs || raw.followUps || raw.follow_ups),
        ack,
        contractChanges,
        consumedInjectionIds: normalizeReceiptStringArray(raw.consumedInjectionIds || raw.consumed_injection_ids || raw.contractInjectionConsumed || raw.contract_injection_consumed),
        contractConsumption: Array.isArray(raw.contractConsumption || raw.contract_consumption) ? (raw.contractConsumption || raw.contract_consumption).filter((item) => item && typeof item === "object").slice(0, 20) : [],
        memoryUsed,
        memoryIgnored,
    };
}
function extractAgentReceipt(response, agent) {
    const raw = String(response || "");
    const fencedBlocks = [...raw.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)]
        .map(match => parseJsonCandidate(match[1].trim()))
        .filter(Boolean);
    for (let i = fencedBlocks.length - 1; i >= 0; i--) {
        const receipt = normalizeAgentReceipt(fencedBlocks[i], agent);
        if (receipt)
            return mergeRunnerVerificationIntoReceipt(receipt, raw);
    }
    const markerIndex = raw.lastIndexOf("CCM_AGENT_RECEIPT");
    const searchArea = markerIndex >= 0 ? raw.slice(markerIndex) : raw;
    const start = searchArea.indexOf("{");
    const end = searchArea.lastIndexOf("}");
    if (start >= 0 && end > start) {
        const receipt = normalizeAgentReceipt(parseJsonCandidate(searchArea.slice(start, end + 1)), agent);
        if (receipt)
            return mergeRunnerVerificationIntoReceipt(receipt, raw);
    }
    return null;
}
function getReceiptAssignmentStatus(response, receipt) {
    if (receipt?.status === "failed")
        return { status: "failed", text: "失败" };
    if (receipt?.status === "blocked")
        return { status: "blocked", text: "阻塞" };
    if (receipt?.status === "needs_info")
        return { status: "needs_info", text: "需补充信息" };
    if (receipt?.status === "partial")
        return { status: "partial", text: "部分完成" };
    if (checkTaskFailure(response))
        return { status: "failed", text: "执行失败" };
    return { status: "done", text: "已完成" };
}
function formatAgentReceiptForReview(receipt) {
    if (!receipt)
        return "结构化回执：缺失";
    return [
        "结构化回执：",
        `- 状态：${receipt.status}`,
        `- 摘要：${receipt.summary || "未填写"}`,
        `- 动作：${receipt.actions.length ? receipt.actions.join("；") : "未填写"}`,
        `- 文件：${receipt.filesChanged.length ? receipt.filesChanged.join("；") : "无"}`,
        `- 验证：${receipt.verification.length ? receipt.verification.join("；") : "未提供"}`,
        `- 使用记忆：${receipt.memoryUsed?.length ? receipt.memoryUsed.join("；") : "未声明"}`,
        `- 未用记忆：${receipt.memoryIgnored?.length ? receipt.memoryIgnored.join("；") : "无"}`,
        `- 阻塞：${receipt.blockers.length ? receipt.blockers.join("；") : "无"}`,
        `- 需要补充：${receipt.needs.length ? receipt.needs.join("；") : "无"}`,
    ].join("\n");
}
//# sourceMappingURL=agent-receipts.js.map