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
function normalizeIndependentReviewEntries(value) {
    const rawItems = Array.isArray(value) ? value : (value ? [value] : []);
    return rawItems.map((raw) => {
        const item = typeof raw === "string" ? { summary: raw } : raw;
        if (!item || typeof item !== "object")
            return null;
        return {
            reviewer: String(item.reviewer || item.agent || item.by || item.reviewedBy || item.reviewed_by || "").trim(),
            verdict: String(item.verdict || item.status || item.result || "").trim().toLowerCase(),
            reviewSubject: String(item.reviewSubject || item.review_subject || item.subject || "").trim(),
            summary: (0, memory_1.compactMemoryText)(item.summary || item.note || item.comment || item.message || "", 800),
            evidence: normalizeReceiptStringArray(item.evidence || item.checks || item.findings || item.filesReviewed || item.files_reviewed),
        };
    }).filter((item) => item && (item.reviewer || item.verdict || item.summary || item.evidence.length)).slice(0, 8);
}
function normalizePostCompactCandidateUsageEntries(value) {
    const rawItems = Array.isArray(value) ? value : (value ? [value] : []);
    return rawItems.map((raw) => {
        const item = typeof raw === "string" ? { value: raw } : raw;
        if (!item || typeof item !== "object")
            return null;
        return {
            gateId: String(item.gateId || item.gate_id || item.reinjectionGateId || item.reinjection_gate_id || "").trim(),
            candidateId: String(item.candidateId || item.candidate_id || item.id || "").trim(),
            kind: String(item.kind || item.type || "").trim(),
            value: (0, memory_1.compactMemoryText)(item.value || item.text || item.summary || "", 600),
            usageState: String(item.usageState || item.usage_state || item.status || item.state || "").trim().toLowerCase(),
            reason: (0, memory_1.compactMemoryText)(item.reason || item.note || item.evidence || "", 500),
        };
    }).filter((item) => item && (item.gateId || item.candidateId || item.value || item.usageState)).slice(0, 80);
}
function normalizeGlobalMemoryUsageEntries(value) {
    const rawItems = Array.isArray(value) ? value : (value ? [value] : []);
    return rawItems.map((raw) => {
        const item = typeof raw === "string" ? { value: raw } : raw;
        if (!item || typeof item !== "object")
            return null;
        return {
            globalMemoryId: String(item.globalMemoryId || item.global_memory_id || item.memoryId || item.memory_id || item.id || "").trim(),
            usageState: String(item.usageState || item.usage_state || item.status || item.state || "").trim().toLowerCase(),
            currentSourceVerified: item.currentSourceVerified === true || item.current_source_verified === true || item.verified === true,
            semanticRiskAcknowledged: item.semanticRiskAcknowledged === true || item.semantic_risk_acknowledged === true || item.semanticRisk === true || item.semantic_risk === true,
            crossGroupSuppression: String(item.crossGroupSuppression || item.cross_group_suppression || item.suppression || "").trim().toLowerCase(),
            reason: (0, memory_1.compactMemoryText)(item.reason || item.note || item.evidence || item.value || item.text || "", 600),
        };
    }).filter((item) => item && (item.globalMemoryId || item.usageState || item.reason)).slice(0, 80);
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
    const postCompactCandidateUsage = normalizePostCompactCandidateUsageEntries(raw.postCompactCandidateUsage
        || raw.post_compact_candidate_usage
        || raw.postCompactCandidateUsageRows
        || raw.post_compact_candidate_usage_rows
        || raw.candidateUsage
        || raw.candidate_usage);
    const globalMemoryUsage = normalizeGlobalMemoryUsageEntries(raw.globalMemoryUsage
        || raw.global_memory_usage
        || raw.globalAgentMemoryUsage
        || raw.global_agent_memory_usage
        || raw.globalMemoryReceipt
        || raw.global_memory_receipt);
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
    const independentReview = normalizeIndependentReviewEntries(raw.independentReview
        || raw.independent_review
        || raw.codeReview
        || raw.code_review
        || raw.adversarialReview
        || raw.adversarial_review
        || raw.verifierReview
        || raw.verifier_review);
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
        independentReview,
        reviewer: String(raw.reviewer || raw.reviewed_by || raw.reviewedBy || raw.verifier || "").trim(),
        role: String(raw.role || raw.agent_role || raw.type || "").trim(),
        consumedInjectionIds: normalizeReceiptStringArray(raw.consumedInjectionIds || raw.consumed_injection_ids || raw.contractInjectionConsumed || raw.contract_injection_consumed),
        contractConsumption: Array.isArray(raw.contractConsumption || raw.contract_consumption) ? (raw.contractConsumption || raw.contract_consumption).filter((item) => item && typeof item === "object").slice(0, 20) : [],
        memoryUsed,
        memoryIgnored,
        postCompactCandidateUsage,
        globalMemoryUsage,
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
    const independentReview = normalizeIndependentReviewEntries(receipt.independentReview || receipt.independent_review || receipt.codeReview || receipt.code_review);
    const independentReviewLine = independentReview.length
        ? independentReview.map((item) => [
            item.reviewer || "reviewer",
            item.verdict || "reviewed",
            item.reviewSubject ? `复核对象=${item.reviewSubject}` : "",
            item.summary || item.evidence.join("；"),
        ].filter(Boolean).join(" - ")).join("；")
        : "无";
    return [
        "结构化回执：",
        `- 状态：${receipt.status}`,
        `- 摘要：${receipt.summary || "未填写"}`,
        `- 动作：${receipt.actions.length ? receipt.actions.join("；") : "未填写"}`,
        `- 文件：${receipt.filesChanged.length ? receipt.filesChanged.join("；") : "无"}`,
        `- 验证：${receipt.verification.length ? receipt.verification.join("；") : "未提供"}`,
        `- 独立复核：${independentReviewLine}`,
        `- 使用记忆：${receipt.memoryUsed?.length ? receipt.memoryUsed.join("；") : "未声明"}`,
        `- 未用记忆：${receipt.memoryIgnored?.length ? receipt.memoryIgnored.join("；") : "无"}`,
        `- 全局记忆：${receipt.globalMemoryUsage?.length ? receipt.globalMemoryUsage.map((item) => `${item.globalMemoryId || "global"}=${item.usageState || "declared"}${item.currentSourceVerified ? "/verified" : ""}`).join("；") : "未声明"}`,
        `- 压缩候选：${receipt.postCompactCandidateUsage?.length ? receipt.postCompactCandidateUsage.map((item) => `${item.candidateId || item.value || "candidate"}=${item.usageState || "unknown"}`).join("；") : "未声明"}`,
        `- 阻塞：${receipt.blockers.length ? receipt.blockers.join("；") : "无"}`,
        `- 需要补充：${receipt.needs.length ? receipt.needs.join("；") : "无"}`,
    ].join("\n");
}
//# sourceMappingURL=agent-receipts.js.map