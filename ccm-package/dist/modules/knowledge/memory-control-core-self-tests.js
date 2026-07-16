"use strict";
// Category-specific TestAgent self-tests. The compatibility facade remains in self-test.ts.
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
exports.runGlobalMemoryControlSelfTest = runGlobalMemoryControlSelfTest;
exports.runMemoryCenterPostCompactUsageDiagnosticsSelfTest = runMemoryCenterPostCompactUsageDiagnosticsSelfTest;
exports.runMemoryCenterPostCompactCandidateDisciplineSelfTest = runMemoryCenterPostCompactCandidateDisciplineSelfTest;
exports.runMemoryCenterPostCompactCandidateDisciplineTrendSelfTest = runMemoryCenterPostCompactCandidateDisciplineTrendSelfTest;
exports.runMemoryCenterPostCompactDispatchMarkerTrendSelfTest = runMemoryCenterPostCompactDispatchMarkerTrendSelfTest;
exports.runMemoryCenterChildAgentMemoryReliabilitySelfTest = runMemoryCenterChildAgentMemoryReliabilitySelfTest;
exports.runMemoryCenterChildGlobalAgentMemoryBridgeSelfTest = runMemoryCenterChildGlobalAgentMemoryBridgeSelfTest;
exports.runMemoryCenterChildGlobalAgentMemoryArbitrationSelfTest = runMemoryCenterChildGlobalAgentMemoryArbitrationSelfTest;
exports.runMemoryCenterChildGlobalAgentMemoryCrossGroupSuppressionSelfTest = runMemoryCenterChildGlobalAgentMemoryCrossGroupSuppressionSelfTest;
exports.runMemoryCenterChildGlobalAgentMemoryCrossGroupFreshnessSelfTest = runMemoryCenterChildGlobalAgentMemoryCrossGroupFreshnessSelfTest;
exports.runMemoryCenterQualityTargetedRefreshSelfTest = runMemoryCenterQualityTargetedRefreshSelfTest;
exports.runMemoryCenterCompactBoundaryTimelineSelfTest = runMemoryCenterCompactBoundaryTimelineSelfTest;
exports.runMemoryCenterCompactStrategyDecisionSelfTest = runMemoryCenterCompactStrategyDecisionSelfTest;
exports.runMemoryCenterPostCompactCleanupAuditSelfTest = runMemoryCenterPostCompactCleanupAuditSelfTest;
exports.runMemoryCenterApiMicroCompactEditPlanSelfTest = runMemoryCenterApiMicroCompactEditPlanSelfTest;
exports.runMemoryCenterApiMicrocompactReceiptDisciplineSelfTest = runMemoryCenterApiMicrocompactReceiptDisciplineSelfTest;
exports.runMemoryCenterApiMicrocompactNativeApplyReadinessSelfTest = runMemoryCenterApiMicrocompactNativeApplyReadinessSelfTest;
exports.runMemoryCenterApiMicrocompactNativeApplyProofSelfTest = runMemoryCenterApiMicrocompactNativeApplyProofSelfTest;
exports.runMemoryCenterApiMicrocompactNativeApplyProofAgingSelfTest = runMemoryCenterApiMicrocompactNativeApplyProofAgingSelfTest;
exports.runMemoryCenterApiMicrocompactNativeApplyDispatchBindingSelfTest = runMemoryCenterApiMicrocompactNativeApplyDispatchBindingSelfTest;
exports.runMemoryCenterApiMicrocompactNativeApplyProofRepairWorkItemSelfTest = runMemoryCenterApiMicrocompactNativeApplyProofRepairWorkItemSelfTest;
exports.runMemoryCenterApiMicrocompactNativeApplyProofRepairDispatchCandidateSelfTest = runMemoryCenterApiMicrocompactNativeApplyProofRepairDispatchCandidateSelfTest;
exports.runMemoryCenterApiMicrocompactNativeApplyProofRepairDispatchBriefSelfTest = runMemoryCenterApiMicrocompactNativeApplyProofRepairDispatchBriefSelfTest;
exports.runMemoryCenterApiMicrocompactNativeApplyProofRepairAssignmentBindingSelfTest = runMemoryCenterApiMicrocompactNativeApplyProofRepairAssignmentBindingSelfTest;
exports.runMemoryCenterWorkerContextPacketContextUsageSelfTest = runMemoryCenterWorkerContextPacketContextUsageSelfTest;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("../../core/utils");
const db_1 = require("../../core/db");
const memory_control_center_1 = require("./memory-control-center");
function runGlobalMemoryControlSelfTest() {
    const before = JSON.parse(JSON.stringify((0, memory_control_center_1.getControlsState)()));
    const item = { id: `control-selftest-${process.pid}`, text: "全局 Agent 必须验证当前状态后再使用历史记忆", importance: 90 };
    const itemId = (0, memory_control_center_1.getMemoryItemId)("feedback", item);
    try {
        (0, memory_control_center_1.updateMemoryControl)({ scope: "global", scopeId: "global-agent", itemType: "feedback", itemId, action: "lock", actor: "self-test" });
        const pinned = (0, memory_control_center_1.applyMemoryControls)("global", "global-agent", { feedback: [item] }).feedback[0];
        (0, memory_control_center_1.updateMemoryControl)({ scope: "global", scopeId: "global-agent", itemType: "feedback", itemId, action: "edit", text: "使用历史记忆前必须核验当前真实状态", reason: "验证可编辑能力", actor: "self-test" });
        const edited = (0, memory_control_center_1.applyMemoryControls)("global", "global-agent", { feedback: [item] }).feedback[0];
        (0, memory_control_center_1.updateMemoryControl)({ scope: "global", scopeId: "global-agent", itemType: "feedback", itemId, action: "delete", reason: "验证软删除与审计", actor: "self-test" });
        const deleted = (0, memory_control_center_1.applyMemoryControls)("global", "global-agent", { feedback: [item] }).feedback;
        (0, memory_control_center_1.updateMemoryControl)({ scope: "global", scopeId: "global-agent", itemType: "feedback", itemId, action: "restore", reason: "验证恢复", actor: "self-test" });
        const restored = (0, memory_control_center_1.applyMemoryControls)("global", "global-agent", { feedback: [item] }).feedback[0];
        const checks = {
            globalScopePins: pinned?.memoryControl?.pinned === true,
            globalScopeEdits: edited?.text === "使用历史记忆前必须核验当前真实状态",
            globalScopeDeletes: deleted.length === 0,
            globalScopeRestores: restored?.text === item.text && restored?.memoryControl?.deprecated === false,
            operationsAreAudited: (0, memory_control_center_1.listMemoryAudit)(20, { scope: "global", scopeId: "global-agent" }).some(event => event.itemId === itemId),
        };
        return { pass: Object.values(checks).every(Boolean), checks };
    }
    finally {
        (0, memory_control_center_1.writeJsonAtomic)(memory_control_center_1.CONTROL_FILE, before);
    }
}
function runMemoryCenterPostCompactUsageDiagnosticsSelfTest() {
    const groupId = `memory-center-pccu-selftest-${process.pid}-${Date.now()}`;
    const groupFile = path.join(memory_control_center_1.GROUP_MEMORY_DIR, `${groupId}.json`);
    const memory = {
        groupId,
        goal: "把群聊记忆压缩后稳定注入项目子 Agent 会话",
        persistentRequirements: [{ id: "req-1", text: "项目子 Agent 每次新会话都必须收到群聊记忆上下文" }],
        decisions: [{ id: "decision-1", decision: "Memory Center 必须暴露压缩重注入候选的使用情况" }],
        compaction: { postCompactTokenCount: 1200, preCompactTokenCount: 5200, lastCompactedAt: (0, memory_control_center_1.now)() },
    };
    let usageFile = "";
    let typedDir = "";
    try {
        fs.mkdirSync(memory_control_center_1.GROUP_MEMORY_DIR, { recursive: true });
        fs.writeFileSync(groupFile, JSON.stringify(memory, null, 2), "utf-8");
        const { getGroupPostCompactCandidateUsageLedgerFile, recordGroupPostCompactCandidateUsageLedger, buildGroupPostCompactCandidateUsageSummary, } = require("../collaboration/memory");
        const { distillGroupMessagesToTypedMemory, getGroupTypedMemoryDir, upsertGroupTypedMemoryDocument, } = require("../collaboration/group-memory-index");
        usageFile = getGroupPostCompactCandidateUsageLedgerFile(groupId);
        typedDir = getGroupTypedMemoryDir(groupId);
        recordGroupPostCompactCandidateUsageLedger(groupId, {
            taskId: "task-memory-center-selftest",
            executionId: "exec-memory-center-selftest",
            targetProject: "ccm",
            rows: [
                { candidate_id: "pccu_active_context", kind: "requirement", value: "project child agents must receive group memory bundle", usage_state: "used", gate_id: "gate-used" },
                { candidate_id: "pccu_stale_context", kind: "decision", value: "old compact summary should stay archived", usage_state: "ignored", gate_id: "gate-ignored-a" },
                { candidate_id: "pccu_stale_context", kind: "decision", value: "old compact summary should stay archived", usage_state: "ignored", gate_id: "gate-ignored-b" },
                { candidate_id: "pccu_missing_receipt", kind: "fact", value: "candidate usage receipt must be explicit", usage_state: "mentioned", gate_id: "gate-mentioned" },
            ],
            generatedAt: (0, memory_control_center_1.now)(),
        });
        upsertGroupTypedMemoryDocument(groupId, {
            type: "project",
            slug: "active-context-selftest",
            name: "Active context selftest",
            description: "Used post-compact candidate should stay visible.",
            body: "project child agents must receive group memory bundle",
            updatedAt: (0, memory_control_center_1.now)(),
        });
        upsertGroupTypedMemoryDocument(groupId, {
            type: "feedback",
            slug: "stale-context-selftest",
            name: "Stale context selftest",
            description: "Ignored post-compact candidate should be deprioritized.",
            body: "old compact summary should stay archived",
            updatedAt: (0, memory_control_center_1.now)(),
        });
        const usageSummary = buildGroupPostCompactCandidateUsageSummary(groupId, {});
        distillGroupMessagesToTypedMemory(groupId, [
            { id: "m1", role: "user", agent: "user", content: "必须把群聊记忆作为子 Agent 的稳定上下文。", timestamp: (0, memory_control_center_1.now)() },
            { id: "m2", role: "assistant", agent: "main", content: "采用 Memory Center 诊断 post-compact usage。", timestamp: (0, memory_control_center_1.now)(), delivery_summary: { status: "completed", headline: "完成诊断" } },
        ], memory, { postCompactCandidateUsage: usageSummary, reason: "memory-center-post-compact-selftest" });
        const detail = (0, memory_control_center_1.getMemoryCenterScope)("group", groupId);
        const diagnostics = detail.postCompactUsage || {};
        const checks = {
            scopeExposesDiagnostics: diagnostics.schema === "ccm-memory-center-post-compact-usage-diagnostics-v1",
            ledgerTotalsVisible: Number(diagnostics.ledger?.totals?.used || 0) >= 1 && Number(diagnostics.ledger?.totals?.ignored || 0) >= 2,
            summaryBucketsVisible: (diagnostics.summary?.usefulCandidates || []).length >= 1 && (diagnostics.summary?.ignoredCandidates || []).length >= 1,
            archiveRowsVisible: Number(diagnostics.archive?.archivedCount || 0) >= 1,
            recallScoringVisible: Number(diagnostics.typedMemory?.recallScoring?.hint_count || 0) >= 3,
            boostAndDeprioritizeVisible: (diagnostics.typedMemory?.boostedDocs || []).length >= 1 && (diagnostics.typedMemory?.deprioritizedDocs || []).length >= 1,
            disciplineTrendVisible: diagnostics.discipline?.schema === "ccm-post-compact-candidate-discipline-group-trend-v1"
                && diagnostics.discipline?.ledger?.strictClassificationRate !== null,
            boundaryTimelineVisible: diagnostics.boundaryTimeline?.schema === "ccm-group-compact-boundary-timeline-v1"
                && Array.isArray(diagnostics.boundaryTimeline?.components),
            overviewCarriesLightStats: Number(detail.summary?.postCompactUsage?.candidateCount || 0) >= 3,
        };
        return { pass: Object.values(checks).every(Boolean), checks, diagnostics };
    }
    finally {
        try {
            if (fs.existsSync(groupFile))
                fs.unlinkSync(groupFile);
        }
        catch { }
        try {
            if (usageFile && fs.existsSync(usageFile))
                fs.unlinkSync(usageFile);
        }
        catch { }
        try {
            if (typedDir && fs.existsSync(typedDir))
                fs.rmSync(typedDir, { recursive: true, force: true });
        }
        catch { }
    }
}
function runMemoryCenterPostCompactCandidateDisciplineSelfTest() {
    const groupId = `memory-center-pccd-selftest-${process.pid}-${Date.now()}`;
    let usageFile = "";
    try {
        const { getGroupPostCompactCandidateUsageLedgerFile, recordGroupPostCompactCandidateUsageLedger, } = require("../collaboration/memory");
        usageFile = getGroupPostCompactCandidateUsageLedgerFile(groupId);
        recordGroupPostCompactCandidateUsageLedger(groupId, {
            taskId: "task-memory-center-candidate-discipline-ledger",
            executionId: "exec-memory-center-candidate-discipline-ledger",
            targetProject: "ccm",
            rows: [
                { candidate_id: "pccd_stale_context", kind: "decision", value: "old stale recovered context", usage_state: "ignored", gate_id: "gate-stale-a" },
                { candidate_id: "pccd_stale_context", kind: "decision", value: "old stale recovered context", usage_state: "ignored", gate_id: "gate-stale-b" },
                { candidate_id: "pccd_missing_receipt", kind: "fact", value: "candidate usage receipt must classify every row", usage_state: "mentioned", gate_id: "gate-missing" },
            ],
            generatedAt: (0, memory_control_center_1.now)(),
        });
        const tasks = [
            {
                id: "task-memory-center-candidate-discipline-good",
                title: "候选纪律通过样例",
                group_id: groupId,
                delivery_summary: {
                    post_compact_reinjection_gate_summary: { required: true, candidate_count: 2 },
                    post_compact_reinjection_gate_receipt_rows: [{
                            agent: "ccm",
                            post_compact_reinjection_gate: {
                                required: true,
                                pass: true,
                                gate_ids: ["pcrg_discipline_good"],
                                candidate_usage_rows: [
                                    { gate_id: "pcrg_discipline_good", candidate_id: "pccd_active_context", value: "active recovered context", usage_state: "used" },
                                    { gate_id: "pcrg_discipline_good", candidate_id: "pccd_stale_context", value: "old stale recovered context", usage_state: "verified" },
                                ],
                            },
                        }],
                },
            },
            {
                id: "task-memory-center-candidate-discipline-bad",
                title: "候选纪律失败样例",
                group_id: groupId,
                delivery_summary: {
                    post_compact_reinjection_gate_summary: { required: true, candidate_count: 2 },
                    post_compact_reinjection_gate_receipt_rows: [{
                            agent: "ccm",
                            post_compact_reinjection_gate: {
                                required: true,
                                pass: false,
                                gate_ids: ["pcrg_discipline_bad"],
                                candidate_usage_rows: [
                                    { gate_id: "pcrg_discipline_bad", candidate_id: "pccd_stale_context", value: "old stale recovered context", usage_state: "used" },
                                    { gate_id: "pcrg_discipline_bad", candidate_id: "pccd_missing_receipt", value: "candidate usage receipt must classify every row", usage_state: "mentioned" },
                                ],
                            },
                        }],
                },
            },
        ];
        const check = (0, memory_control_center_1.evaluatePostCompactCandidateDiscipline)({ tasks, groupIds: [groupId], taskLimit: 10 });
        const gapText = JSON.stringify(check.gaps || []);
        const evidenceText = JSON.stringify(check.evidence || []);
        const checks = {
            qualityCheckHasSchema: check.id === "post_compact_candidate_discipline" && check.label === "压缩候选纪律",
            strictClassificationCountsRows: Number(check.checked || 0) >= 5 && Number(check.passed || 0) >= 2,
            staleUsedIsGap: gapText.includes("历史忽略或归档候选被直接 used") && gapText.includes("pccd_stale_context"),
            mentionedCandidateIsGap: gapText.includes("候选缺少 used / ignored / verified 分类") && gapText.includes("pccd_missing_receipt"),
            ledgerMentionedIsGap: gapText.includes("历史账本中该候选只有 mentioned"),
            verifiedStaleCanPass: evidenceText.includes("pccd_stale_context") && evidenceText.includes("\"stale\":true"),
        };
        return { pass: Object.values(checks).every(Boolean), checks, quality: check };
    }
    finally {
        try {
            if (usageFile && fs.existsSync(usageFile))
                fs.unlinkSync(usageFile);
        }
        catch { }
    }
}
function runMemoryCenterPostCompactCandidateDisciplineTrendSelfTest() {
    const groupId = `memory-center-pccd-trend-selftest-${process.pid}-${Date.now()}`;
    let usageFile = "";
    try {
        const { getGroupPostCompactCandidateUsageLedgerFile, recordGroupPostCompactCandidateUsageLedger, } = require("../collaboration/memory");
        usageFile = getGroupPostCompactCandidateUsageLedgerFile(groupId);
        recordGroupPostCompactCandidateUsageLedger(groupId, {
            taskId: "task-memory-center-candidate-trend-ledger",
            executionId: "exec-memory-center-candidate-trend-ledger",
            targetProject: "ccm",
            rows: [
                { candidate_id: "pccd_trend_stale", kind: "decision", value: "stale trend recovered context", usage_state: "ignored", gate_id: "gate-trend-stale" },
                { candidate_id: "pccd_trend_missing", kind: "fact", value: "trend candidate must be classified", usage_state: "mentioned", gate_id: "gate-trend-mentioned" },
            ],
            generatedAt: "2026-07-01T00:00:00.000Z",
        });
        const tasks = [
            {
                id: "task-memory-center-candidate-trend-good",
                title: "趋势通过样例",
                group_id: groupId,
                updated_at: "2026-07-02T10:00:00.000Z",
                delivery_summary: {
                    post_compact_reinjection_gate_summary: { required: true, candidate_count: 2 },
                    post_compact_reinjection_gate_receipt_rows: [{
                            agent: "ccm",
                            post_compact_reinjection_gate: {
                                required: true,
                                gate_ids: ["pcrg_trend_good"],
                                candidate_usage_rows: [
                                    { gate_id: "pcrg_trend_good", candidate_id: "pccd_trend_active", value: "active trend context", usage_state: "used" },
                                    { gate_id: "pcrg_trend_good", candidate_id: "pccd_trend_stale", value: "stale trend recovered context", usage_state: "verified" },
                                ],
                            },
                        }],
                },
            },
            {
                id: "task-memory-center-candidate-trend-bad",
                title: "趋势失败样例",
                group_id: groupId,
                updated_at: "2026-07-03T10:00:00.000Z",
                delivery_summary: {
                    post_compact_reinjection_gate_summary: { required: true, candidate_count: 2 },
                    post_compact_reinjection_gate_receipt_rows: [{
                            agent: "ccm",
                            post_compact_reinjection_gate: {
                                required: true,
                                gate_ids: ["pcrg_trend_bad"],
                                candidate_usage_rows: [
                                    { gate_id: "pcrg_trend_bad", candidate_id: "pccd_trend_stale", value: "stale trend recovered context", usage_state: "used" },
                                    { gate_id: "pcrg_trend_bad", candidate_id: "pccd_trend_missing", value: "trend candidate must be classified", usage_state: "mentioned" },
                                ],
                            },
                        }],
                },
            },
            {
                id: "task-memory-center-candidate-trend-empty",
                title: "趋势缺候选行样例",
                group_id: groupId,
                updated_at: "2026-07-04T10:00:00.000Z",
                delivery_summary: {
                    post_compact_reinjection_gate_summary: { required: true, candidate_count: 1 },
                    post_compact_reinjection_gate_receipt_rows: [],
                },
            },
        ];
        const trend = (0, memory_control_center_1.buildPostCompactCandidateDisciplineTrend)({ tasks, groupIds: [groupId], taskLimit: 10, threshold: 90, minSample: 1 });
        const group = trend.groups.find((item) => item.groupId === groupId) || {};
        const gapText = JSON.stringify(group.recentRows || []);
        const checks = {
            trendHasSchema: trend.schema === "ccm-post-compact-candidate-discipline-trend-v1",
            groupTrendHasSchema: group.schema === "ccm-post-compact-candidate-discipline-group-trend-v1",
            countsStrictRows: Number(group.checked || 0) === 5 && Number(group.strictClassified || 0) === 2,
            stalePromotionCounted: Number(group.stalePromoted || 0) === 1 && (group.stalePromotions || []).length === 1,
            missingRowsCounted: Number(group.missing || 0) >= 2 && gapText.includes("候选缺少 used / ignored / verified 分类"),
            noRowsCandidateCounted: gapText.includes("结果说明没有候选使用行"),
            bucketTrendBuilt: (group.buckets || []).length >= 3 && (group.buckets || []).some((bucket) => bucket.key === "2026-07-03" && bucket.stalePromoted === 1),
            lowRateRaisesAlert: group.alert === true && trend.alertGroups.some((item) => item.groupId === groupId),
            ledgerRateVisible: Number(group.ledger?.total || 0) === 2 && Number(group.ledger?.openMentionedCount || 0) === 1,
            overallAggregatesGroup: trend.overall?.checked === group.checked && trend.overall?.stalePromoted === group.stalePromoted,
        };
        return { pass: Object.values(checks).every(Boolean), checks, trend };
    }
    finally {
        try {
            if (usageFile && fs.existsSync(usageFile))
                fs.unlinkSync(usageFile);
        }
        catch { }
    }
}
function runMemoryCenterPostCompactDispatchMarkerTrendSelfTest() {
    const groupId = `memory-center-pcfd-trend-selftest-${process.pid}-${Date.now()}`;
    const groupFile = path.join(memory_control_center_1.GROUP_MEMORY_DIR, `${groupId}.json`);
    const messageFile = path.join(utils_1.GROUP_MESSAGES_DIR, `${groupId}.json`);
    const reloadFile = path.join(utils_1.CCM_DIR, "group-memory-reload", `${(0, memory_control_center_1.cleanId)(groupId)}.json`);
    let dispatchFile = "";
    let typedDir = "";
    try {
        const { buildAgentMemoryContextBundle, getGroupPostCompactDispatchLedgerFile, saveGroupMemory, } = require("../collaboration/memory");
        const { saveGroupMessages } = require("../collaboration/storage");
        const { getGroupTypedMemoryDir } = require("../collaboration/group-memory-index");
        dispatchFile = getGroupPostCompactDispatchLedgerFile(groupId);
        typedDir = getGroupTypedMemoryDir(groupId);
        saveGroupMessages(groupId, Array.from({ length: 14 }, (_, index) => ({
            id: `pcfd-trend-${index}`,
            role: index % 2 ? "assistant" : "user",
            agent: index % 2 ? "api" : undefined,
            target: index % 2 ? undefined : "coordinator",
            content: index === 0
                ? "必须保留 MEMORY_CENTER_PCFD_TREND_SENTINEL，压缩后首派发 marker 要进入 Memory Center。"
                : `首派发趋势自测 ${index}，涉及 src/post-compact-dispatch-trend.ts。`,
            timestamp: "2026-07-07T00:00:00.000Z",
        })));
        saveGroupMemory(groupId, {
            groupId,
            goal: "压缩后首派发 marker 趋势自测",
            persistentRequirements: [{ messageId: "pcfd-trend-0", text: "必须保留 MEMORY_CENTER_PCFD_TREND_SENTINEL。" }],
            compaction: {
                version: 1,
                compactedMessageCount: 10,
                preservedRecentMessages: 4,
                preCompactTokenCount: 8200,
                postCompactTokenCount: 2100,
                lastCompactedAt: "2026-07-07T00:00:00.000Z",
                summaryChecksum: "pcfd-trend-summary",
                postCompactReinject: {
                    schema: "ccm-post-compact-reinjection-v1",
                    hasCandidates: true,
                    files: [{ value: "src/post-compact-dispatch-trend.ts", sourceMessageId: "pcfd-trend-2" }],
                    verification: [{ value: "npm run check", sourceMessageId: "pcfd-trend-3" }],
                },
                postCompactRecoveryAudit: {
                    schema: "ccm-post-compact-recovery-audit-v1",
                    status: "pass",
                    pass: true,
                    summary_checksum: "pcfd-trend-summary",
                    checkCount: 3,
                    passedChecks: 3,
                    failedChecks: [],
                },
            },
            compactBoundary: {
                summarizedThroughMessageId: "pcfd-trend-9",
                summarizedMessageCount: 10,
                summaryChecksum: "pcfd-trend-summary",
            },
        });
        const first = buildAgentMemoryContextBundle(groupId, "api", "继续 MEMORY_CENTER_PCFD_TREND_SENTINEL", {
            includeGlobalClaudeMemory: false,
            minKeepTokens: 1,
        });
        const second = buildAgentMemoryContextBundle(groupId, "api", "继续 MEMORY_CENTER_PCFD_TREND_SENTINEL", {
            includeGlobalClaudeMemory: false,
            minKeepTokens: 1,
        });
        const other = buildAgentMemoryContextBundle(groupId, "web", "继续 MEMORY_CENTER_PCFD_TREND_SENTINEL", {
            includeGlobalClaudeMemory: false,
            minKeepTokens: 1,
        });
        const trend = (0, memory_control_center_1.buildPostCompactDispatchMarkerTrend)({ groupIds: [groupId] });
        const group = trend.groups.find((item) => item.groupId === groupId) || {};
        const detail = (0, memory_control_center_1.getMemoryCenterScope)("group", groupId);
        const dispatch = detail.postCompactUsage?.dispatch || {};
        const firstMarker = first.post_compact_dispatch_marker || {};
        const secondMarker = second.post_compact_dispatch_marker || {};
        const otherMarker = other.post_compact_dispatch_marker || {};
        const checks = {
            firstMarkerIsFirst: firstMarker.schema === "ccm-post-compact-first-dispatch-marker-v1"
                && firstMarker.first_dispatch_after_compact === true
                && firstMarker.dispatch_sequence === 1,
            secondMarkerIsFollowup: secondMarker.schema === "ccm-post-compact-first-dispatch-marker-v1"
                && secondMarker.boundary_id === firstMarker.boundary_id
                && secondMarker.first_dispatch_after_compact === false
                && secondMarker.dispatch_sequence === 2,
            otherTargetGetsOwnFirst: otherMarker.schema === "ccm-post-compact-first-dispatch-marker-v1"
                && otherMarker.boundary_id === firstMarker.boundary_id
                && otherMarker.target_project === "web"
                && otherMarker.first_dispatch_after_compact === true,
            trendAggregatesMarkers: group.schema === "ccm-post-compact-dispatch-marker-group-trend-v1"
                && group.status === "ok"
                && Number(group.entryCount || 0) === 3
                && Number(group.firstDispatchCount || 0) === 2
                && Number(group.followupDispatchCount || 0) === 1
                && Number(group.targetCount || 0) === 2,
            latestBoundaryCoverageVisible: Number(group.latestBoundaryTargetCoverageRate || 0) === 100
                && Number(group.latestBoundaryTargetCount || 0) === 2,
            detailExposesDispatchTrend: dispatch.schema === "ccm-post-compact-dispatch-marker-group-trend-v1"
                && dispatch.ledger?.file === dispatchFile
                && Number(dispatch.firstDispatchCount || 0) === 2,
            overviewTrendAggregates: trend.overall?.status === "ok"
                && Number(trend.overall.firstDispatches || 0) === 2
                && Number(trend.overall.followups || 0) === 1,
        };
        return { pass: Object.values(checks).every(Boolean), checks, trend: group };
    }
    finally {
        for (const file of [groupFile, `${groupFile}.bak`, messageFile, `${messageFile}.bak`, reloadFile, `${reloadFile}.bak`, dispatchFile]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
        try {
            if (typedDir && fs.existsSync(typedDir))
                fs.rmSync(typedDir, { recursive: true, force: true });
        }
        catch { }
    }
}
function runMemoryCenterChildAgentMemoryReliabilitySelfTest() {
    const groupId = `memory-center-agent-reliability-selftest-${process.pid}-${Date.now()}`;
    const groupFile = path.join(memory_control_center_1.GROUP_MEMORY_DIR, `${groupId}.json`);
    const messageFile = path.join(utils_1.GROUP_MESSAGES_DIR, `${groupId}.json`);
    const reloadFile = path.join(utils_1.CCM_DIR, "group-memory-reload", `${(0, memory_control_center_1.cleanId)(groupId)}.json`);
    let dispatchFile = "";
    let usageFile = "";
    let typedDir = "";
    try {
        const { buildAgentMemoryContextBundle, getGroupPostCompactCandidateUsageLedgerFile, getGroupPostCompactDispatchLedgerFile, recordGroupPostCompactCandidateUsageLedger, saveGroupMemory, } = require("../collaboration/memory");
        const { saveGroupMessages } = require("../collaboration/storage");
        const { getGroupTypedMemoryDir } = require("../collaboration/group-memory-index");
        dispatchFile = getGroupPostCompactDispatchLedgerFile(groupId);
        usageFile = getGroupPostCompactCandidateUsageLedgerFile(groupId);
        typedDir = getGroupTypedMemoryDir(groupId);
        saveGroupMessages(groupId, Array.from({ length: 12 }, (_, index) => ({
            id: `car-${index}`,
            role: index % 2 ? "assistant" : "user",
            agent: index % 2 ? "api" : undefined,
            target: index % 2 ? undefined : "coordinator",
            content: index === 0
                ? "必须保留 CHILD_AGENT_MEMORY_RELIABILITY_SENTINEL。"
                : `子 Agent 记忆可靠性自测 ${index}，涉及 src/reliability.ts。`,
            timestamp: "2026-07-07T01:00:00.000Z",
        })));
        saveGroupMemory(groupId, {
            groupId,
            goal: "子 Agent 记忆可靠性自测",
            persistentRequirements: [{ messageId: "car-0", text: "必须保留 CHILD_AGENT_MEMORY_RELIABILITY_SENTINEL。" }],
            compaction: {
                version: 1,
                compactedMessageCount: 8,
                preservedRecentMessages: 4,
                preCompactTokenCount: 7200,
                postCompactTokenCount: 1900,
                lastCompactedAt: "2026-07-07T01:00:00.000Z",
                summaryChecksum: "car-summary",
                postCompactReinject: {
                    schema: "ccm-post-compact-reinjection-v1",
                    hasCandidates: true,
                    files: [{ value: "src/reliability.ts", sourceMessageId: "car-2" }],
                    verification: [{ value: "npm run check", sourceMessageId: "car-3" }],
                },
            },
            compactBoundary: {
                summarizedThroughMessageId: "car-8",
                summarizedMessageCount: 8,
                summaryChecksum: "car-summary",
            },
        });
        recordGroupPostCompactCandidateUsageLedger(groupId, {
            taskId: "task-car-ledger",
            targetProject: "web",
            rows: [
                { candidate_id: "car_web_stale", value: "legacy stale web context", usage_state: "ignored", gate_id: "gate-car-stale" },
            ],
            generatedAt: "2026-07-07T01:02:00.000Z",
        });
        buildAgentMemoryContextBundle(groupId, "api", "继续 CHILD_AGENT_MEMORY_RELIABILITY_SENTINEL", {
            includeGlobalClaudeMemory: false,
            minKeepTokens: 1,
        });
        const tasks = [
            {
                id: "task-car-api-good",
                title: "可靠 api 子 Agent",
                group_id: groupId,
                updated_at: "2026-07-07T01:10:00.000Z",
                delivery_summary: {
                    receipt_statuses: [{
                            agent: "api",
                            status: "done",
                            memoryUsed: ["使用平台群聊记忆 CHILD_AGENT_MEMORY_RELIABILITY_SENTINEL"],
                            memoryIgnored: [],
                        }],
                    post_compact_reinjection_gate_summary: { required: true, candidate_count: 2 },
                    post_compact_reinjection_gate_receipt_rows: [{
                            agent: "api",
                            post_compact_reinjection_gate: {
                                required: true,
                                gate_ids: ["gate-car-api"],
                                candidate_usage_rows: [
                                    { gate_id: "gate-car-api", candidate_id: "car_api_file", value: "src/reliability.ts", usage_state: "used" },
                                    { gate_id: "gate-car-api", candidate_id: "car_api_check", value: "npm run check", usage_state: "verified" },
                                ],
                            },
                        }],
                },
            },
            {
                id: "task-car-web-bad",
                title: "不可靠 web 子 Agent",
                group_id: groupId,
                updated_at: "2026-07-07T01:12:00.000Z",
                delivery_summary: {
                    receipt_statuses: [{
                            agent: "web",
                            status: "done",
                            memoryUsed: [],
                            memoryIgnored: [],
                        }],
                    post_compact_reinjection_gate_summary: { required: true, candidate_count: 2 },
                    post_compact_reinjection_gate_receipt_rows: [{
                            agent: "web",
                            post_compact_reinjection_gate: {
                                required: true,
                                gate_ids: ["gate-car-web"],
                                candidate_usage_rows: [
                                    { gate_id: "gate-car-web", candidate_id: "car_web_stale", value: "legacy stale web context", usage_state: "used" },
                                    { gate_id: "gate-car-web", candidate_id: "car_web_missing", value: "missing classification", usage_state: "mentioned" },
                                ],
                            },
                        }],
                },
            },
        ];
        const report = (0, memory_control_center_1.buildChildAgentMemoryReliabilityReport)({ tasks, groupIds: [groupId], taskLimit: 10 });
        const group = (report.groups.find((item) => item.groupId === groupId) || {});
        const agents = Array.isArray(group.agents) ? group.agents : [];
        const api = agents.find((item) => item.agent === "api") || {};
        const web = agents.find((item) => item.agent === "web") || {};
        const check = (0, memory_control_center_1.evaluateChildAgentMemoryReliability)({ tasks, groupIds: [groupId], taskLimit: 10 });
        const detail = (0, memory_control_center_1.getMemoryCenterScope)("group", groupId);
        const detailReliability = detail.postCompactUsage?.agentReliability || {};
        const gapText = JSON.stringify(web.gaps || []);
        const checks = {
            reportHasSchema: report.schema === "ccm-child-agent-memory-reliability-report-v1",
            groupHasTwoAgents: group.schema === "ccm-group-child-agent-memory-reliability-v1" && Number(group.agentCount || 0) >= 2,
            apiScoresOk: api.status === "ok" && Number(api.score || 0) >= 90 && Number(api.firstDispatches || 0) >= 1,
            webScoresFail: web.status === "fail" && Number(web.score || 100) < 70,
            webGapsIncludeCandidateAndDispatch: gapText.includes("历史 ignored/归档候选被直接 used")
                && gapText.includes("没有压缩后首派发 marker"),
            qualityCheckFlagsWeakAgent: check.id === "child_agent_memory_reliability"
                && check.gaps?.some((gap) => gap.agent === "web"),
            detailExposesReliability: detailReliability.schema === "ccm-group-child-agent-memory-reliability-v1"
                && detailReliability.agents?.some((agent) => agent.agent === "api")
                && Number(detailReliability.agentCount || 0) >= 1,
        };
        return { pass: Object.values(checks).every(Boolean), checks, report: group };
    }
    finally {
        for (const file of [groupFile, `${groupFile}.bak`, messageFile, `${messageFile}.bak`, reloadFile, `${reloadFile}.bak`, dispatchFile, usageFile]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
        try {
            if (typedDir && fs.existsSync(typedDir))
                fs.rmSync(typedDir, { recursive: true, force: true });
        }
        catch { }
    }
}
function runMemoryCenterChildGlobalAgentMemoryBridgeSelfTest() {
    const groupId = `memory-center-child-global-agent-memory-bridge-selftest-${process.pid}-${Date.now()}`;
    const groupFile = path.join(memory_control_center_1.GROUP_MEMORY_DIR, `${groupId}.json`);
    const messageFile = path.join(utils_1.GROUP_MESSAGES_DIR, `${groupId}.json`);
    const reloadFile = path.join(utils_1.CCM_DIR, "group-memory-reload", `${(0, memory_control_center_1.cleanId)(groupId)}.json`);
    const typedDir = path.join(utils_1.CCM_DIR, "group-memory-md", (0, memory_control_center_1.sidecarFileId)(groupId));
    const sessionDir = path.join(memory_control_center_1.GROUP_SESSION_MEMORY_DIR, (0, memory_control_center_1.sidecarFileId)(groupId));
    const toolDir = path.join(memory_control_center_1.GROUP_TOOL_CONTINUITY_DIR, (0, memory_control_center_1.sidecarFileId)(groupId));
    const compactReferenceFile = (0, memory_control_center_1.getGroupCompactFileReferenceLedgerFile)(groupId);
    const releaseGlobalMemorySelftest = (0, memory_control_center_1.acquireGlobalMemorySelfTestLock)("memory-center-global-agent-memory-bridge");
    const previousGlobalMemory = fs.existsSync(memory_control_center_1.GLOBAL_MEMORY_FILE) ? fs.readFileSync(memory_control_center_1.GLOBAL_MEMORY_FILE, "utf-8") : null;
    const previousGlobalMemoryBak = fs.existsSync(`${memory_control_center_1.GLOBAL_MEMORY_FILE}.bak`) ? fs.readFileSync(`${memory_control_center_1.GLOBAL_MEMORY_FILE}.bak`, "utf-8") : null;
    try {
        const { saveGroupMessages } = require("../collaboration/storage");
        const { saveGroupMemory } = require("../collaboration/memory");
        const at = (0, memory_control_center_1.now)();
        (0, memory_control_center_1.writeJsonAtomic)(memory_control_center_1.GLOBAL_MEMORY_FILE, {
            version: 1,
            scope: "global",
            id: "global-agent",
            user: [{
                    id: "gmi_memory_center_global_bridge",
                    text: "MEMORY_CENTER_GLOBAL_BRIDGE_SENTINEL: src/global-bridge.ts 子 Agent 必须继承相关全局 Agent 长期记忆。",
                    why: "验证 Memory Center 能检查全局 Agent 记忆桥接。",
                    howToApply: "只在 global bridge 相关任务中作为上下文，执行前核验当前仓库状态。",
                    importance: 99,
                    confidence: 0.99,
                    createdAt: at,
                    updatedAt: at,
                    source: {
                        sessionId: "memory-center-global-bridge-session",
                        messageIds: ["memory-center-global-bridge-message"],
                        source: "selftest",
                        timestamp: at,
                    },
                }],
            feedback: [],
            authorization: [],
            decisions: [],
            missions: [],
            unresolved: [],
            references: [],
            sessions: [],
            archives: [],
            compaction: { boundaryVersion: 1, totalCompactions: 0, consecutiveFailures: 0, health: "healthy", boundaries: [] },
            privacy: { rejectedCandidates: 0, encryptedTranscripts: true, lastScanAt: at },
            integrity: { pass: true, corruptedArchives: [] },
            updatedAt: at,
        });
        saveGroupMessages(groupId, [
            { id: "mcggb-1", role: "user", target: "coordinator", timestamp: at, content: "继续 MEMORY_CENTER_GLOBAL_BRIDGE_SENTINEL src/global-bridge.ts。" },
        ]);
        saveGroupMemory(groupId, {
            groupId,
            goal: "验证 MEMORY_CENTER_GLOBAL_BRIDGE_SENTINEL 能进入子 Agent 记忆包",
            currentPhase: "global-agent-memory-bridge",
            persistentRequirements: [{ messageId: "mcggb-1", text: "必须继承相关全局 Agent 长期记忆。" }],
            completed: [{ project: "api", summary: "准备检查 src/global-bridge.ts" }],
        });
        const report = (0, memory_control_center_1.buildChildGlobalAgentMemoryBridgeReport)({
            groupIds: [groupId],
            query: "MEMORY_CENTER_GLOBAL_BRIDGE_SENTINEL src/global-bridge.ts",
            targetProject: "api",
            allowSelftestGlobalMemoryForSelfTest: true,
        });
        const check = (0, memory_control_center_1.evaluateChildGlobalAgentMemoryBridge)({
            groupIds: [groupId],
            query: "MEMORY_CENTER_GLOBAL_BRIDGE_SENTINEL src/global-bridge.ts",
            targetProject: "api",
            allowSelftestGlobalMemoryForSelfTest: true,
        });
        const row = report.groups?.[0] || {};
        const checks = {
            reportCoversBridge: report.schema === "ccm-child-global-agent-memory-bridge-report-v1"
                && report.overall?.status === "ok"
                && Number(row.itemCount || 0) >= 1,
            rowHasRenderedBridge: row.renderedHasBridge === true,
            rowHasSourceManifest: row.sourceManifestHasGlobalMemory === true,
            rowHasCompactReference: row.compactReferencesHasGlobalMemory === true,
            qualityCheckCoversBridge: check.id === "child_global_agent_memory_bridge"
                && Number(check.checked || 0) === 1
                && Number(check.passed || 0) === 1,
        };
        return { pass: Object.values(checks).every(Boolean), checks, row };
    }
    finally {
        for (const file of [groupFile, `${groupFile}.bak`, messageFile, `${messageFile}.bak`, reloadFile, `${reloadFile}.bak`, compactReferenceFile, `${compactReferenceFile}.bak`]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
        for (const dir of [typedDir, sessionDir, toolDir]) {
            try {
                if (dir && fs.existsSync(dir))
                    fs.rmSync(dir, { recursive: true, force: true });
            }
            catch { }
        }
        try {
            fs.mkdirSync(path.dirname(memory_control_center_1.GLOBAL_MEMORY_FILE), { recursive: true });
            if (previousGlobalMemory === null)
                fs.rmSync(memory_control_center_1.GLOBAL_MEMORY_FILE, { force: true });
            else
                fs.writeFileSync(memory_control_center_1.GLOBAL_MEMORY_FILE, previousGlobalMemory, "utf-8");
            if (previousGlobalMemoryBak === null)
                fs.rmSync(`${memory_control_center_1.GLOBAL_MEMORY_FILE}.bak`, { force: true });
            else
                fs.writeFileSync(`${memory_control_center_1.GLOBAL_MEMORY_FILE}.bak`, previousGlobalMemoryBak, "utf-8");
        }
        catch { }
        releaseGlobalMemorySelftest();
    }
}
function runMemoryCenterChildGlobalAgentMemoryArbitrationSelfTest() {
    const groupId = `memory-center-child-global-agent-memory-arbitration-selftest-${process.pid}-${Date.now()}`;
    const groupFile = path.join(memory_control_center_1.GROUP_MEMORY_DIR, `${groupId}.json`);
    const messageFile = path.join(utils_1.GROUP_MESSAGES_DIR, `${groupId}.json`);
    const reloadFile = path.join(utils_1.CCM_DIR, "group-memory-reload", `${(0, memory_control_center_1.cleanId)(groupId)}.json`);
    const typedDir = path.join(utils_1.CCM_DIR, "group-memory-md", (0, memory_control_center_1.sidecarFileId)(groupId));
    const sessionDir = path.join(memory_control_center_1.GROUP_SESSION_MEMORY_DIR, (0, memory_control_center_1.sidecarFileId)(groupId));
    const toolDir = path.join(memory_control_center_1.GROUP_TOOL_CONTINUITY_DIR, (0, memory_control_center_1.sidecarFileId)(groupId));
    const compactReferenceFile = (0, memory_control_center_1.getGroupCompactFileReferenceLedgerFile)(groupId);
    const arbitrationLedgerFile = (0, memory_control_center_1.getGroupGlobalMemoryArbitrationLedgerFile)(groupId);
    const releaseGlobalMemorySelftest = (0, memory_control_center_1.acquireGlobalMemorySelfTestLock)("memory-center-global-agent-memory-arbitration");
    const previousGlobalMemory = fs.existsSync(memory_control_center_1.GLOBAL_MEMORY_FILE) ? fs.readFileSync(memory_control_center_1.GLOBAL_MEMORY_FILE, "utf-8") : null;
    const previousGlobalMemoryBak = fs.existsSync(`${memory_control_center_1.GLOBAL_MEMORY_FILE}.bak`) ? fs.readFileSync(`${memory_control_center_1.GLOBAL_MEMORY_FILE}.bak`, "utf-8") : null;
    try {
        const { saveGroupMessages } = require("../collaboration/storage");
        const { saveGroupMemory } = require("../collaboration/memory");
        const globalAt = "2026-07-07T03:00:00.000Z";
        const groupAt = "2026-07-07T04:00:00.000Z";
        (0, memory_control_center_1.writeJsonAtomic)(memory_control_center_1.GLOBAL_MEMORY_FILE, {
            version: 1,
            scope: "global",
            id: "global-agent",
            user: [{
                    id: "gmi_memory_center_global_arbitration",
                    text: "MEMORY_CENTER_GLOBAL_ARBITRATION_SENTINEL: src/global-arbitration.ts 必须使用 stale-global-rule。",
                    why: "验证 Memory Center 能统计全局记忆被群聊新证据降权。",
                    howToApply: "旧规则：使用 stale-global-rule。",
                    importance: 99,
                    confidence: 0.99,
                    createdAt: globalAt,
                    updatedAt: globalAt,
                    source: {
                        sessionId: "memory-center-global-arbitration-session",
                        messageIds: ["memory-center-global-arbitration-message"],
                        source: "selftest",
                        timestamp: globalAt,
                    },
                }],
            feedback: [],
            authorization: [],
            decisions: [],
            missions: [],
            unresolved: [],
            references: [],
            sessions: [],
            archives: [],
            compaction: { boundaryVersion: 1, totalCompactions: 0, consecutiveFailures: 0, health: "healthy", boundaries: [] },
            privacy: { rejectedCandidates: 0, encryptedTranscripts: true, lastScanAt: globalAt },
            integrity: { pass: true, corruptedArchives: [] },
            updatedAt: globalAt,
        });
        saveGroupMessages(groupId, [
            { id: "mcgga-1", role: "user", target: "coordinator", timestamp: groupAt, content: "MEMORY_CENTER_GLOBAL_ARBITRATION_SENTINEL: src/global-arbitration.ts 不再使用 stale-global-rule，改为 fresh-group-rule。" },
        ]);
        saveGroupMemory(groupId, {
            groupId,
            goal: "验证 MEMORY_CENTER_GLOBAL_ARBITRATION_SENTINEL 全局记忆仲裁",
            currentPhase: "global-agent-memory-arbitration",
            persistentRequirements: [{ messageId: "mcgga-1", text: "src/global-arbitration.ts 不再使用 stale-global-rule，改为 fresh-group-rule。" }],
            completed: [{ project: "api", summary: "准备检查 src/global-arbitration.ts" }],
        });
        const report = (0, memory_control_center_1.buildChildGlobalAgentMemoryBridgeReport)({
            groupIds: [groupId],
            query: "MEMORY_CENTER_GLOBAL_ARBITRATION_SENTINEL src/global-arbitration.ts",
            targetProject: "api",
            allowSelftestGlobalMemoryForSelfTest: true,
        });
        const arbitrationLedgerCheck = (0, memory_control_center_1.evaluateGlobalMemoryArbitrationLedger)({
            groupIds: [groupId],
            query: "MEMORY_CENTER_GLOBAL_ARBITRATION_SENTINEL src/global-arbitration.ts",
            targetProject: "api",
            allowSelftestGlobalMemoryForSelfTest: true,
        });
        const arbitrationDistillationCheck = (0, memory_control_center_1.evaluateGlobalMemoryArbitrationDistillation)({
            groupIds: [groupId],
            query: "MEMORY_CENTER_GLOBAL_ARBITRATION_SENTINEL src/global-arbitration.ts",
            targetProject: "api",
            allowSelftestGlobalMemoryForSelfTest: true,
        });
        const row = report.groups?.[0] || {};
        const checks = {
            reportStillPassesWithArbitration: report.schema === "ccm-child-global-agent-memory-bridge-report-v1"
                && report.overall?.status === "ok"
                && row.status === "ok",
            reportCountsDemotion: Number(row.demotedCount || 0) >= 1
                && Number(row.conflictCount || 0) >= 1
                && Number(report.overall?.demotedCount || 0) >= 1
                && Number(report.overall?.conflictCount || 0) >= 1,
            renderedArbitrationVerified: row.renderedHasArbitration === true,
            bridgeStillHasSources: row.sourceManifestHasGlobalMemory === true
                && row.compactReferencesHasGlobalMemory === true,
            arbitrationLedgerRecorded: row.arbitrationLedgerRequired === true
                && row.arbitrationLedgerRecorded === true
                && row.sourceManifestHasArbitrationLedger === true
                && row.compactReferencesHasArbitrationLedger === true
                && row.arbitrationLedgerFile === arbitrationLedgerFile,
            arbitrationLedgerQualityCheckPasses: arbitrationLedgerCheck.id === "global_memory_arbitration_ledger"
                && Number(arbitrationLedgerCheck.checked || 0) === 1
                && Number(arbitrationLedgerCheck.passed || 0) === 1,
            arbitrationDistillationQualityCheckPasses: arbitrationDistillationCheck.id === "global_memory_arbitration_distillation"
                && Number(arbitrationDistillationCheck.checked || 0) === 1
                && Number(arbitrationDistillationCheck.passed || 0) === 1,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            row,
            arbitrationLedgerQuality: arbitrationLedgerCheck.report?.overall || {},
            arbitrationDistillationQuality: arbitrationDistillationCheck.report?.overall || {},
        };
    }
    finally {
        for (const file of [groupFile, `${groupFile}.bak`, messageFile, `${messageFile}.bak`, reloadFile, `${reloadFile}.bak`, compactReferenceFile, `${compactReferenceFile}.bak`, arbitrationLedgerFile, `${arbitrationLedgerFile}.bak`]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
        for (const dir of [typedDir, sessionDir, toolDir]) {
            try {
                if (dir && fs.existsSync(dir))
                    fs.rmSync(dir, { recursive: true, force: true });
            }
            catch { }
        }
        try {
            fs.mkdirSync(path.dirname(memory_control_center_1.GLOBAL_MEMORY_FILE), { recursive: true });
            if (previousGlobalMemory === null)
                fs.rmSync(memory_control_center_1.GLOBAL_MEMORY_FILE, { force: true });
            else
                fs.writeFileSync(memory_control_center_1.GLOBAL_MEMORY_FILE, previousGlobalMemory, "utf-8");
            if (previousGlobalMemoryBak === null)
                fs.rmSync(`${memory_control_center_1.GLOBAL_MEMORY_FILE}.bak`, { force: true });
            else
                fs.writeFileSync(`${memory_control_center_1.GLOBAL_MEMORY_FILE}.bak`, previousGlobalMemoryBak, "utf-8");
        }
        catch { }
        releaseGlobalMemorySelftest();
    }
}
function runMemoryCenterChildGlobalAgentMemoryCrossGroupSuppressionSelfTest() {
    const suffix = `${process.pid}-${Date.now()}`;
    const sourceGroupId = `memory-center-global-cross-group-source-${suffix}`;
    const targetGroupId = `memory-center-global-cross-group-target-${suffix}`;
    const groupFiles = [sourceGroupId, targetGroupId].flatMap(groupId => [
        path.join(memory_control_center_1.GROUP_MEMORY_DIR, `${groupId}.json`),
        path.join(memory_control_center_1.GROUP_MEMORY_DIR, `${groupId}.json.bak`),
        path.join(utils_1.GROUP_MESSAGES_DIR, `${groupId}.json`),
        path.join(utils_1.GROUP_MESSAGES_DIR, `${groupId}.json.bak`),
        path.join(utils_1.CCM_DIR, "group-memory-reload", `${(0, memory_control_center_1.cleanId)(groupId)}.json`),
        path.join(utils_1.CCM_DIR, "group-memory-reload", `${(0, memory_control_center_1.cleanId)(groupId)}.json.bak`),
        (0, memory_control_center_1.getGroupCompactFileReferenceLedgerFile)(groupId),
        `${(0, memory_control_center_1.getGroupCompactFileReferenceLedgerFile)(groupId)}.bak`,
        (0, memory_control_center_1.getGroupGlobalMemoryArbitrationLedgerFile)(groupId),
        `${(0, memory_control_center_1.getGroupGlobalMemoryArbitrationLedgerFile)(groupId)}.bak`,
    ]);
    const cleanupDirs = [sourceGroupId, targetGroupId].flatMap(groupId => [
        path.join(utils_1.CCM_DIR, "group-memory-md", (0, memory_control_center_1.sidecarFileId)(groupId)),
        path.join(memory_control_center_1.GROUP_SESSION_MEMORY_DIR, (0, memory_control_center_1.sidecarFileId)(groupId)),
        path.join(memory_control_center_1.GROUP_TOOL_CONTINUITY_DIR, (0, memory_control_center_1.sidecarFileId)(groupId)),
    ]);
    const releaseGlobalMemorySelftest = (0, memory_control_center_1.acquireGlobalMemorySelfTestLock)("memory-center-global-cross-group-suppression");
    const previousGlobalMemory = fs.existsSync(memory_control_center_1.GLOBAL_MEMORY_FILE) ? fs.readFileSync(memory_control_center_1.GLOBAL_MEMORY_FILE, "utf-8") : null;
    const previousGlobalMemoryBak = fs.existsSync(`${memory_control_center_1.GLOBAL_MEMORY_FILE}.bak`) ? fs.readFileSync(`${memory_control_center_1.GLOBAL_MEMORY_FILE}.bak`, "utf-8") : null;
    try {
        const { saveGroupMessages } = require("../collaboration/storage");
        const { buildAgentMemoryContextBundle, saveGroupMemory } = require("../collaboration/memory");
        const globalAt = "2026-07-07T08:00:00.000Z";
        const sourceAt = "2026-07-07T09:00:00.000Z";
        const targetAt = "2026-07-07T10:00:00.000Z";
        (0, memory_control_center_1.writeJsonAtomic)(memory_control_center_1.GLOBAL_MEMORY_FILE, {
            version: 1,
            scope: "global",
            id: "global-agent",
            user: [{
                    id: "gmi_memory_center_cross_group_suppression",
                    text: "MEMORY_CENTER_CROSS_GROUP_SUPPRESSION_SENTINEL: src/cross-center.ts 必须使用 stale-center-rule。",
                    why: "验证 Memory Center 可以检查跨群聊全局记忆抑制。",
                    howToApply: "旧规则：直接使用 stale-center-rule。",
                    importance: 99,
                    confidence: 0.99,
                    createdAt: globalAt,
                    updatedAt: globalAt,
                    source: {
                        sessionId: "memory-center-cross-group-session",
                        messageIds: ["memory-center-cross-group-message"],
                        source: "selftest",
                        timestamp: globalAt,
                    },
                }],
            feedback: [],
            authorization: [],
            decisions: [],
            missions: [],
            unresolved: [],
            references: [],
            sessions: [],
            archives: [],
            compaction: { boundaryVersion: 1, totalCompactions: 0, consecutiveFailures: 0, health: "healthy", boundaries: [] },
            privacy: { rejectedCandidates: 0, encryptedTranscripts: true, lastScanAt: globalAt },
            integrity: { pass: true, corruptedArchives: [] },
            updatedAt: globalAt,
        });
        saveGroupMessages(sourceGroupId, [
            { id: "mccgs-a-1", role: "user", target: "coordinator", timestamp: sourceAt, content: "MEMORY_CENTER_CROSS_GROUP_SUPPRESSION_SENTINEL: src/cross-center.ts 不再使用 stale-center-rule，改为 fresh-center-rule。" },
        ]);
        saveGroupMemory(sourceGroupId, {
            groupId: sourceGroupId,
            goal: "验证 Memory Center 跨群聊全局记忆抑制来源群聊",
            currentPhase: "memory-center-cross-group-source",
            persistentRequirements: [{ messageId: "mccgs-a-1", text: "src/cross-center.ts 不再使用 stale-center-rule，改为 fresh-center-rule。" }],
            completed: [{ project: "api", summary: "已记录 fresh-center-rule。" }],
        });
        buildAgentMemoryContextBundle(sourceGroupId, "api", "继续 MEMORY_CENTER_CROSS_GROUP_SUPPRESSION_SENTINEL src/cross-center.ts", {
            minKeepTokens: 1,
            maxGlobalAgentMemory: 4,
            allowSelftestGlobalMemoryForSelfTest: true,
        });
        saveGroupMessages(targetGroupId, [
            { id: "mccgs-b-1", role: "user", target: "coordinator", timestamp: targetAt, content: "继续 src/cross-center.ts，先按当前仓库状态核验。" },
        ]);
        saveGroupMemory(targetGroupId, {
            groupId: targetGroupId,
            goal: "验证 Memory Center 跨群聊全局记忆抑制目标群聊",
            currentPhase: "memory-center-cross-group-target",
            completed: [{ project: "api", summary: "准备检查 src/cross-center.ts 当前状态。" }],
        });
        const report = (0, memory_control_center_1.buildChildGlobalAgentMemoryBridgeReport)({
            groupIds: [targetGroupId],
            query: "MEMORY_CENTER_CROSS_GROUP_SUPPRESSION_SENTINEL src/cross-center.ts",
            targetProject: "api",
            allowSelftestGlobalMemoryForSelfTest: true,
        });
        const check = (0, memory_control_center_1.evaluateGlobalMemoryCrossGroupSuppression)({
            groupIds: [targetGroupId],
            query: "MEMORY_CENTER_CROSS_GROUP_SUPPRESSION_SENTINEL src/cross-center.ts",
            targetProject: "api",
            allowSelftestGlobalMemoryForSelfTest: true,
        });
        const row = report.groups?.[0] || {};
        const checks = {
            reportCoversCrossGroupSuppression: report.schema === "ccm-child-global-agent-memory-bridge-report-v1"
                && report.overall?.status === "ok"
                && Number(row.crossGroupSuppressedCount || 0) >= 1,
            rowHasRenderedCrossGroupSuppression: row.renderedHasCrossGroupSuppression === true,
            rowHasCrossGroupSources: row.sourceManifestHasCrossGroupArbitration === true
                && row.compactReferencesHasCrossGroupArbitration === true,
            qualityCheckPasses: check.id === "global_memory_cross_group_suppression"
                && Number(check.checked || 0) === 1
                && Number(check.passed || 0) === 1,
            reportOverallCountsSuppression: Number(check.report?.overall?.suppressedCount || 0) >= 1,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            row,
            quality: check.report?.overall || {},
        };
    }
    finally {
        for (const file of groupFiles) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
        for (const dir of cleanupDirs) {
            try {
                if (dir && fs.existsSync(dir))
                    fs.rmSync(dir, { recursive: true, force: true });
            }
            catch { }
        }
        try {
            fs.mkdirSync(path.dirname(memory_control_center_1.GLOBAL_MEMORY_FILE), { recursive: true });
            if (previousGlobalMemory === null)
                fs.rmSync(memory_control_center_1.GLOBAL_MEMORY_FILE, { force: true });
            else
                fs.writeFileSync(memory_control_center_1.GLOBAL_MEMORY_FILE, previousGlobalMemory, "utf-8");
            if (previousGlobalMemoryBak === null)
                fs.rmSync(`${memory_control_center_1.GLOBAL_MEMORY_FILE}.bak`, { force: true });
            else
                fs.writeFileSync(`${memory_control_center_1.GLOBAL_MEMORY_FILE}.bak`, previousGlobalMemoryBak, "utf-8");
        }
        catch { }
        releaseGlobalMemorySelftest();
    }
}
function runMemoryCenterChildGlobalAgentMemoryCrossGroupFreshnessSelfTest() {
    const suffix = `${process.pid}-${Date.now()}`;
    const sourceGroupId = `memory-center-global-freshness-source-${suffix}`;
    const targetGroupId = `memory-center-global-freshness-target-${suffix}`;
    const groupFiles = [sourceGroupId, targetGroupId].flatMap(groupId => [
        path.join(memory_control_center_1.GROUP_MEMORY_DIR, `${groupId}.json`),
        path.join(memory_control_center_1.GROUP_MEMORY_DIR, `${groupId}.json.bak`),
        path.join(utils_1.GROUP_MESSAGES_DIR, `${groupId}.json`),
        path.join(utils_1.GROUP_MESSAGES_DIR, `${groupId}.json.bak`),
        path.join(utils_1.CCM_DIR, "group-memory-reload", `${(0, memory_control_center_1.cleanId)(groupId)}.json`),
        path.join(utils_1.CCM_DIR, "group-memory-reload", `${(0, memory_control_center_1.cleanId)(groupId)}.json.bak`),
        (0, memory_control_center_1.getGroupCompactFileReferenceLedgerFile)(groupId),
        `${(0, memory_control_center_1.getGroupCompactFileReferenceLedgerFile)(groupId)}.bak`,
        (0, memory_control_center_1.getGroupGlobalMemoryArbitrationLedgerFile)(groupId),
        `${(0, memory_control_center_1.getGroupGlobalMemoryArbitrationLedgerFile)(groupId)}.bak`,
    ]);
    const cleanupDirs = [sourceGroupId, targetGroupId].flatMap(groupId => [
        path.join(utils_1.CCM_DIR, "group-memory-md", (0, memory_control_center_1.sidecarFileId)(groupId)),
        path.join(memory_control_center_1.GROUP_SESSION_MEMORY_DIR, (0, memory_control_center_1.sidecarFileId)(groupId)),
        path.join(memory_control_center_1.GROUP_TOOL_CONTINUITY_DIR, (0, memory_control_center_1.sidecarFileId)(groupId)),
    ]);
    const releaseGlobalMemorySelftest = (0, memory_control_center_1.acquireGlobalMemorySelfTestLock)("memory-center-global-cross-group-freshness");
    const previousGlobalMemory = fs.existsSync(memory_control_center_1.GLOBAL_MEMORY_FILE) ? fs.readFileSync(memory_control_center_1.GLOBAL_MEMORY_FILE, "utf-8") : null;
    const previousGlobalMemoryBak = fs.existsSync(`${memory_control_center_1.GLOBAL_MEMORY_FILE}.bak`) ? fs.readFileSync(`${memory_control_center_1.GLOBAL_MEMORY_FILE}.bak`, "utf-8") : null;
    try {
        const { saveGroupMessages } = require("../collaboration/storage");
        const { buildAgentMemoryContextBundle, saveGroupMemory } = require("../collaboration/memory");
        const oldGlobalAt = "2026-07-07T11:00:00.000Z";
        const sourceAt = "2026-07-07T12:00:00.000Z";
        const newerGlobalAt = new Date(Date.now() + 60_000).toISOString();
        (0, memory_control_center_1.writeJsonAtomic)(memory_control_center_1.GLOBAL_MEMORY_FILE, {
            version: 1,
            scope: "global",
            id: "global-agent",
            user: [{
                    id: "gmi_memory_center_cross_group_freshness",
                    text: "MEMORY_CENTER_CROSS_GROUP_FRESHNESS_SENTINEL: src/cross-freshness.ts 必须使用 stale-center-freshness-rule。",
                    why: "验证 Memory Center 能识别旧跨群聊抑制。",
                    howToApply: "旧规则：直接使用 stale-center-freshness-rule。",
                    importance: 99,
                    confidence: 0.99,
                    createdAt: oldGlobalAt,
                    updatedAt: oldGlobalAt,
                    source: {
                        sessionId: "memory-center-freshness-old-session",
                        messageIds: ["memory-center-freshness-old-message"],
                        source: "selftest",
                        timestamp: oldGlobalAt,
                    },
                }],
            feedback: [],
            authorization: [],
            decisions: [],
            missions: [],
            unresolved: [],
            references: [],
            sessions: [],
            archives: [],
            compaction: { boundaryVersion: 1, totalCompactions: 0, consecutiveFailures: 0, health: "healthy", boundaries: [] },
            privacy: { rejectedCandidates: 0, encryptedTranscripts: true, lastScanAt: oldGlobalAt },
            integrity: { pass: true, corruptedArchives: [] },
            updatedAt: oldGlobalAt,
        });
        saveGroupMessages(sourceGroupId, [
            { id: "mccgf-a-1", role: "user", target: "coordinator", timestamp: sourceAt, content: "MEMORY_CENTER_CROSS_GROUP_FRESHNESS_SENTINEL: src/cross-freshness.ts 不再使用 stale-center-freshness-rule，改为 source-center-freshness-rule。" },
        ]);
        saveGroupMemory(sourceGroupId, {
            groupId: sourceGroupId,
            goal: "验证 Memory Center 跨群聊抑制 freshness 来源群聊",
            currentPhase: "memory-center-cross-group-freshness-source",
            persistentRequirements: [{ messageId: "mccgf-a-1", text: "src/cross-freshness.ts 不再使用 stale-center-freshness-rule，改为 source-center-freshness-rule。" }],
        });
        buildAgentMemoryContextBundle(sourceGroupId, "api", "继续 MEMORY_CENTER_CROSS_GROUP_FRESHNESS_SENTINEL src/cross-freshness.ts", {
            minKeepTokens: 1,
            maxGlobalAgentMemory: 4,
            allowSelftestGlobalMemoryForSelfTest: true,
        });
        (0, memory_control_center_1.writeJsonAtomic)(memory_control_center_1.GLOBAL_MEMORY_FILE, {
            version: 1,
            scope: "global",
            id: "global-agent",
            user: [{
                    id: "gmi_memory_center_cross_group_freshness",
                    text: "MEMORY_CENTER_CROSS_GROUP_FRESHNESS_SENTINEL: src/cross-freshness.ts 已更新为 verified-center-freshness-rule。",
                    why: "新全局记忆覆盖旧跨群聊抑制。",
                    howToApply: "使用 verified-center-freshness-rule 前仍核验当前来源。",
                    importance: 99,
                    confidence: 0.99,
                    createdAt: oldGlobalAt,
                    updatedAt: newerGlobalAt,
                    source: {
                        sessionId: "memory-center-freshness-new-session",
                        messageIds: ["memory-center-freshness-new-message"],
                        source: "selftest",
                        timestamp: newerGlobalAt,
                    },
                }],
            feedback: [],
            authorization: [],
            decisions: [],
            missions: [],
            unresolved: [],
            references: [],
            sessions: [],
            archives: [],
            compaction: { boundaryVersion: 1, totalCompactions: 0, consecutiveFailures: 0, health: "healthy", boundaries: [] },
            privacy: { rejectedCandidates: 0, encryptedTranscripts: true, lastScanAt: newerGlobalAt },
            integrity: { pass: true, corruptedArchives: [] },
            updatedAt: newerGlobalAt,
        });
        saveGroupMessages(targetGroupId, [
            { id: "mccgf-b-1", role: "user", target: "coordinator", timestamp: newerGlobalAt, content: "继续 freshness target，按当前来源核验。" },
        ]);
        saveGroupMemory(targetGroupId, {
            groupId: targetGroupId,
            goal: "验证 Memory Center freshness target",
            currentPhase: "memory-center-cross-group-freshness-target",
        });
        const report = (0, memory_control_center_1.buildChildGlobalAgentMemoryBridgeReport)({
            groupIds: [targetGroupId],
            query: "MEMORY_CENTER_CROSS_GROUP_FRESHNESS_SENTINEL src/cross-freshness.ts",
            targetProject: "api",
            allowSelftestGlobalMemoryForSelfTest: true,
        });
        const check = (0, memory_control_center_1.evaluateGlobalMemoryCrossGroupSuppressionFreshness)({
            groupIds: [targetGroupId],
            query: "MEMORY_CENTER_CROSS_GROUP_FRESHNESS_SENTINEL src/cross-freshness.ts",
            targetProject: "api",
            allowSelftestGlobalMemoryForSelfTest: true,
        });
        const row = report.groups?.[0] || {};
        const checks = {
            reportCoversFreshness: report.schema === "ccm-child-global-agent-memory-bridge-report-v1"
                && report.overall?.status === "ok"
                && Number(row.crossGroupAdvisoryCount || 0) >= 1
                && Number(row.crossGroupSupersededCount || 0) >= 1
                && Number(row.crossGroupSuppressedCount || 0) === 0,
            rowHasRenderedFreshness: row.renderedHasCrossGroupFreshness === true,
            rowHasCrossGroupSources: row.sourceManifestHasCrossGroupArbitration === true
                && row.compactReferencesHasCrossGroupArbitration === true,
            qualityCheckPasses: check.id === "global_memory_cross_group_suppression_freshness"
                && Number(check.checked || 0) === 1
                && Number(check.passed || 0) === 1,
            reportOverallCountsFreshness: Number(check.report?.overall?.advisoryCount || 0) >= 1
                && Number(check.report?.overall?.supersededCount || 0) >= 1,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            row,
            quality: check.report?.overall || {},
        };
    }
    finally {
        for (const file of groupFiles) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
        for (const dir of cleanupDirs) {
            try {
                if (dir && fs.existsSync(dir))
                    fs.rmSync(dir, { recursive: true, force: true });
            }
            catch { }
        }
        try {
            fs.mkdirSync(path.dirname(memory_control_center_1.GLOBAL_MEMORY_FILE), { recursive: true });
            if (previousGlobalMemory === null)
                fs.rmSync(memory_control_center_1.GLOBAL_MEMORY_FILE, { force: true });
            else
                fs.writeFileSync(memory_control_center_1.GLOBAL_MEMORY_FILE, previousGlobalMemory, "utf-8");
            if (previousGlobalMemoryBak === null)
                fs.rmSync(`${memory_control_center_1.GLOBAL_MEMORY_FILE}.bak`, { force: true });
            else
                fs.writeFileSync(`${memory_control_center_1.GLOBAL_MEMORY_FILE}.bak`, previousGlobalMemoryBak, "utf-8");
        }
        catch { }
        releaseGlobalMemorySelftest();
    }
}
function runMemoryCenterQualityTargetedRefreshSelfTest() {
    const previousQuality = fs.existsSync(memory_control_center_1.QUALITY_FILE) ? fs.readFileSync(memory_control_center_1.QUALITY_FILE, "utf-8") : null;
    try {
        const sentinel = {
            id: "quality-cache-sentinel",
            generatedAt: (0, memory_control_center_1.now)(),
            overallScore: 77,
            status: "warn",
            checks: [],
            cached: false,
        };
        (0, memory_control_center_1.writeJsonAtomic)(memory_control_center_1.QUALITY_FILE, sentinel);
        const targeted = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["child_global_agent_memory_bridge"],
            cacheMaxAgeMs: 0,
        });
        const cachedAfterTargeted = (0, memory_control_center_1.readJson)(memory_control_center_1.QUALITY_FILE, {});
        const unknown = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["child_global_agent_memory_bridge", "missing_quality_check_id"],
            cacheMaxAgeMs: 0,
        });
        const checks = {
            targetedReportOnlyRunsRequestedCheck: targeted.targeted === true
                && targeted.checks?.length === 1
                && targeted.checks?.[0]?.id === "child_global_agent_memory_bridge",
            targetedReportDoesNotOverwriteMainCache: cachedAfterTargeted.id === "quality-cache-sentinel"
                && cachedAfterTargeted.overallScore === 77,
            targetedReportCarriesAvailableIds: Array.isArray(targeted.availableCheckIds)
                && targeted.availableCheckIds.includes("child_global_agent_memory_bridge")
                && targeted.availableCheckIds.includes("global_memory_cross_group_suppression")
                && targeted.availableCheckIds.includes("global_memory_cross_group_suppression_freshness")
                && targeted.availableCheckIds.includes("global_memory_selftest_contamination")
                && targeted.availableCheckIds.includes("rag_recall"),
            unknownIdsAreReported: unknown.targeted === true
                && unknown.checks?.length === 1
                && Array.isArray(unknown.unknownCheckIds)
                && unknown.unknownCheckIds.includes("missing_quality_check_id"),
            targetedDurationRecorded: Number(targeted.durationMs || 0) >= 0,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            targeted: {
                id: targeted.id,
                status: targeted.status,
                checkIds: targeted.checks?.map((check) => check.id) || [],
                unknownCheckIds: targeted.unknownCheckIds || [],
            },
        };
    }
    finally {
        try {
            if (previousQuality === null)
                fs.rmSync(memory_control_center_1.QUALITY_FILE, { force: true });
            else
                fs.writeFileSync(memory_control_center_1.QUALITY_FILE, previousQuality, "utf-8");
        }
        catch { }
    }
}
function runMemoryCenterCompactBoundaryTimelineSelfTest() {
    const groupId = `memory-center-boundary-timeline-selftest-${process.pid}-${Date.now()}`;
    const groupFile = path.join(memory_control_center_1.GROUP_MEMORY_DIR, `${groupId}.json`);
    const messageFile = path.join(utils_1.GROUP_MESSAGES_DIR, `${groupId}.json`);
    const reloadFile = path.join(utils_1.CCM_DIR, "group-memory-reload", `${(0, memory_control_center_1.cleanId)(groupId)}.json`);
    let dispatchFile = "";
    let usageFile = "";
    let typedDir = "";
    try {
        const { buildAgentMemoryContextBundle, getGroupPostCompactCandidateUsageLedgerFile, getGroupPostCompactDispatchLedgerFile, recordGroupPostCompactCandidateUsageLedger, saveGroupMemory, } = require("../collaboration/memory");
        const { saveGroupMessages } = require("../collaboration/storage");
        const { getGroupTypedMemoryDir } = require("../collaboration/group-memory-index");
        dispatchFile = getGroupPostCompactDispatchLedgerFile(groupId);
        usageFile = getGroupPostCompactCandidateUsageLedgerFile(groupId);
        typedDir = getGroupTypedMemoryDir(groupId);
        const longCompactPayload = [
            "压缩边界时间线需要保留 src/timeline.ts、npm run check、COMPACT_BOUNDARY_TIMELINE_SENTINEL。",
            "这是一段较长的群聊历史，用来验证真实刷新后的 compact boundary token 会下降。",
            "每个子 Agent 会话都是第三方新会话，必须从群聊记忆包恢复约束、文件、验证命令和压缩后派发 marker。",
            "memoryUsed/memoryIgnored、candidate usage ledger、typed memory recall scoring 都需要在时间线上能被串起来。",
        ].join(" ");
        saveGroupMessages(groupId, Array.from({ length: 16 }, (_, index) => ({
            id: `cbt-${index}`,
            role: index % 2 ? "assistant" : "user",
            agent: index % 2 ? "api" : undefined,
            target: index % 2 ? undefined : "coordinator",
            content: index === 0
                ? `必须保留 COMPACT_BOUNDARY_TIMELINE_SENTINEL。${longCompactPayload.repeat(8)}`
                : `压缩边界时间线自测 ${index}，涉及 src/timeline.ts 和 npm run check。${longCompactPayload.repeat(8)}`,
            timestamp: "2026-07-07T02:00:00.000Z",
        })));
        saveGroupMemory(groupId, {
            groupId,
            goal: "压缩边界时间线自测",
            persistentRequirements: [{ messageId: "cbt-0", text: "必须保留 COMPACT_BOUNDARY_TIMELINE_SENTINEL。" }],
            compaction: {
                version: 1,
                compactedMessageCount: 12,
                preservedRecentMessages: 4,
                preCompactTokenCount: 9000,
                postCompactTokenCount: 1800,
                lastCompactedAt: "2026-07-07T02:00:00.000Z",
                summaryChecksum: "cbt-summary",
                quality: { score: 98, status: "pass", pass: true },
                postCompactReinject: {
                    schema: "ccm-post-compact-reinjection-v1",
                    hasCandidates: true,
                    files: [{ value: "src/timeline.ts", sourceMessageId: "cbt-2" }],
                    verification: [{ value: "npm run check", sourceMessageId: "cbt-3" }],
                },
                postCompactRecoveryAudit: {
                    schema: "ccm-post-compact-recovery-audit-v1",
                    status: "pass",
                    pass: true,
                    summaryChecksum: "cbt-summary",
                    checkCount: 4,
                    passedChecks: 4,
                    failedChecks: [],
                },
            },
            compactBoundary: {
                summarizedThroughMessageId: "cbt-11",
                summarizedMessageCount: 12,
                summaryChecksum: "cbt-summary",
            },
        });
        recordGroupPostCompactCandidateUsageLedger(groupId, {
            taskId: "task-cbt-ledger",
            targetProject: "api",
            rows: [
                { candidate_id: "cbt_file", value: "src/timeline.ts", usage_state: "used", gate_id: "gate-cbt" },
                { candidate_id: "cbt_check", value: "npm run check", usage_state: "verified", gate_id: "gate-cbt" },
            ],
            generatedAt: "2026-07-07T02:05:00.000Z",
        });
        buildAgentMemoryContextBundle(groupId, "api", "继续 COMPACT_BOUNDARY_TIMELINE_SENTINEL src/timeline.ts", {
            includeGlobalClaudeMemory: false,
            recentLimit: 4,
            minKeepTokens: 1,
        });
        const detail = (0, memory_control_center_1.getMemoryCenterScope)("group", groupId);
        const timeline = detail.postCompactUsage?.boundaryTimeline || {};
        const report = (0, memory_control_center_1.buildCompactBoundaryTimelineReport)({ groupIds: [groupId] });
        const check = (0, memory_control_center_1.evaluateCompactBoundaryTimeline)({ groupIds: [groupId] });
        const eventKinds = (timeline.events || []).map((event) => event.kind);
        const componentKeys = (timeline.components || []).map((component) => component.key);
        const checks = {
            timelineHasSchema: timeline.schema === "ccm-group-compact-boundary-timeline-v1",
            boundaryCapturesTokens: timeline.boundary?.compacted === true
                && Number(timeline.boundary?.preCompactTokenCount || 0) > 0
                && Number(timeline.boundary?.postCompactTokenCount || 0) > 0
                && Number(timeline.boundary?.postCompactTokenCount || 0) < Number(timeline.boundary?.preCompactTokenCount || 0)
                && Number(timeline.boundary?.reductionRate || 0) >= 20,
            componentsCoverCompactLifecycle: ["compression", "recovery", "dispatch", "candidate_usage", "agent_reliability"].every(key => componentKeys.includes(key)),
            eventsCoverCompactLifecycle: ["compact_boundary", "recovery_audit", "first_dispatch", "candidate_usage", "agent_reliability"].every(kind => eventKinds.includes(kind)),
            timelineScoresHealthy: timeline.status === "ok" && Number(timeline.score || 0) >= 90,
            reportAggregatesTimeline: report.schema === "ccm-compact-boundary-timeline-report-v1"
                && report.overall?.status === "ok"
                && report.groups?.some((row) => row.groupId === groupId),
            qualityCheckPassesTimeline: check.id === "compact_boundary_timeline"
                && Number(check.checked || 0) === 1
                && Number(check.passed || 0) === 1,
        };
        return { pass: Object.values(checks).every(Boolean), checks, timeline };
    }
    finally {
        for (const file of [groupFile, `${groupFile}.bak`, messageFile, `${messageFile}.bak`, reloadFile, `${reloadFile}.bak`, dispatchFile, usageFile]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
        try {
            if (typedDir && fs.existsSync(typedDir))
                fs.rmSync(typedDir, { recursive: true, force: true });
        }
        catch { }
    }
}
function runMemoryCenterCompactStrategyDecisionSelfTest() {
    const groupId = `memory-center-compact-strategy-selftest-${process.pid}-${Date.now()}`;
    const groupFile = path.join(memory_control_center_1.GROUP_MEMORY_DIR, `${groupId}.json`);
    const messageFile = path.join(utils_1.GROUP_MESSAGES_DIR, `${groupId}.json`);
    const reloadFile = path.join(utils_1.CCM_DIR, "group-memory-reload", `${(0, memory_control_center_1.cleanId)(groupId)}.json`);
    try {
        const { saveGroupMemory, renderGroupMemoryContextBundle } = require("../collaboration/memory");
        const { saveGroupMessages } = require("../collaboration/storage");
        const { buildGroupCompactStrategyDecision, buildGroupPreservedSegment, buildGroupMicroCompactPlan } = require("../collaboration/group-memory-compaction");
        const messages = Array.from({ length: 14 }, (_, index) => ({
            id: `csd-center-${index}`,
            role: index % 2 ? "assistant" : "user",
            agent: index % 2 ? "api" : undefined,
            target: index % 2 ? undefined : "coordinator",
            task_id: `csd-center-task-${Math.floor(index / 2)}`,
            timestamp: "2026-07-08T01:00:00.000Z",
            content: index === 0
                ? "必须保留 MEMORY_CENTER_COMPACT_STRATEGY_SENTINEL，Memory Center 要能治理压缩策略决策。"
                : `压缩策略 Memory Center 自测 ${index}，涉及 src/compact-strategy.ts 和 npm run check。${"证据".repeat(30)}`,
        }));
        saveGroupMessages(groupId, messages);
        const keepIndex = 10;
        const microCompact = buildGroupMicroCompactPlan(messages.slice(0, keepIndex), { maxChars: 900 });
        const preservedSegment = buildGroupPreservedSegment(messages, keepIndex, {
            minMessages: 2,
            minTokens: 1,
            maxTokens: 1500,
            summaryChecksum: "memory-center-compact-strategy-summary",
            transcriptPath: messageFile,
            now: "2026-07-08T01:00:00.000Z",
        });
        const decision = buildGroupCompactStrategyDecision({
            groupId,
            messages,
            messagesToCompact: messages.slice(0, keepIndex),
            keptMessages: messages.slice(keepIndex),
            keepIndex,
            compacted: true,
            primaryCompact: true,
            microCompact,
            preservedSegment,
            preCompactTokenCount: 7200,
            postCompactTokenCount: 1800,
            summaryChecksum: "memory-center-compact-strategy-summary",
            transcriptPath: messageFile,
            reason: "memory center compact strategy decision selftest",
            now: "2026-07-08T01:00:00.000Z",
        });
        const memory = {
            groupId,
            goal: "验证 compact strategy decision 能进入 Memory Center 治理和子 Agent 上下文",
            messageDigest: "MEMORY_CENTER_COMPACT_STRATEGY_SENTINEL：压缩策略决策必须可见。",
            persistentRequirements: [{ messageId: "csd-center-0", text: "必须保留 MEMORY_CENTER_COMPACT_STRATEGY_SENTINEL。" }],
            compaction: {
                version: 1,
                compactedMessageCount: keepIndex,
                preservedRecentMessages: messages.length - keepIndex,
                lastCompactedMessageId: "csd-center-9",
                lastCompactedAt: "2026-07-08T01:00:00.000Z",
                summaryChecksum: "memory-center-compact-strategy-summary",
                preCompactTokenCount: 7200,
                postCompactTokenCount: 1800,
                microCompact,
                preservedSegment,
                compactStrategyDecision: decision,
                boundaries: [{
                        id: "memory-center-compact-strategy-boundary",
                        summarizedThroughMessageId: "csd-center-9",
                        summarizedMessageCount: keepIndex,
                        summaryChecksum: "memory-center-compact-strategy-summary",
                        compactStrategyDecision: decision,
                    }],
            },
            compactBoundary: {
                id: "memory-center-compact-strategy-boundary",
                summarizedFromMessageId: "csd-center-0",
                summarizedThroughMessageId: "csd-center-9",
                summarizedMessageCount: keepIndex,
                summaryChecksum: "memory-center-compact-strategy-summary",
                preCompactTokenCount: 7200,
                postCompactTokenCount: 1800,
                preservedSegment,
                compactStrategyDecision: decision,
                post_compact_restore: {
                    strategy: "conversation_summary_recent_reinject",
                    transcriptPath: messageFile,
                    preservedSegment,
                    strategyDecision: decision,
                    microCompact,
                },
            },
        };
        saveGroupMemory(groupId, memory);
        const overview = (0, memory_control_center_1.buildGroupCompactStrategyDecisionOverview)(groupId, memory);
        const report = (0, memory_control_center_1.buildCompactStrategyDecisionReport)({ groupIds: [groupId] });
        const check = (0, memory_control_center_1.evaluateCompactStrategyDecision)({ groupIds: [groupId] });
        const detail = (0, memory_control_center_1.getMemoryCenterScope)("group", groupId);
        const detailDecision = detail.postCompactUsage?.compactStrategyDecision || {};
        const rendered = renderGroupMemoryContextBundle({
            schema: "ccm-group-memory-context-v1",
            target_project: "api",
            memory_policy: { use: "must_consider" },
            group_state: { goal: memory.goal, currentPhase: "test" },
            compaction: {
                compactStrategyDecision: decision,
            },
        });
        const checks = {
            overviewPassesDecision: overview.schema === "ccm-group-compact-strategy-decision-overview-v1"
                && overview.status === "ok"
                && overview.mode === decision.mode
                && overview.invariantPass === true,
            reportAggregatesDecision: report.schema === "ccm-compact-strategy-decision-report-v1"
                && report.overall?.status === "ok"
                && report.overall?.checkedGroupCount === 1
                && report.overall?.passedGroupCount === 1,
            qualityCheckCoversDecision: check.id === "compact_strategy_decision"
                && Number(check.checked || 0) === 1
                && Number(check.passed || 0) === 1,
            detailExposesDecision: detailDecision.schema === "ccm-group-compact-strategy-decision-overview-v1"
                && detailDecision.decisionChecksum === decision.decisionChecksum
                && detailDecision.transcriptPath === messageFile,
            childAgentRendererMentionsDecision: rendered.includes("压缩策略决策")
                && rendered.includes(decision.mode)
                && rendered.includes("raw transcript"),
        };
        return { pass: Object.values(checks).every(Boolean), checks, decision: detailDecision };
    }
    finally {
        for (const file of [groupFile, `${groupFile}.bak`, messageFile, `${messageFile}.bak`, reloadFile, `${reloadFile}.bak`]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
    }
}
function runMemoryCenterPostCompactCleanupAuditSelfTest() {
    const groupId = `memory-center-post-compact-cleanup-selftest-${process.pid}-${Date.now()}`;
    const groupFile = path.join(memory_control_center_1.GROUP_MEMORY_DIR, `${groupId}.json`);
    const messageFile = path.join(utils_1.GROUP_MESSAGES_DIR, `${groupId}.json`);
    const reloadFile = path.join(utils_1.CCM_DIR, "group-memory-reload", `${(0, memory_control_center_1.cleanId)(groupId)}.json`);
    try {
        const { saveGroupMemory, renderGroupMemoryContextBundle } = require("../collaboration/memory");
        const { saveGroupMessages } = require("../collaboration/storage");
        const { buildGroupCompactStrategyDecision, buildGroupPostCompactCleanupAudit, buildGroupPreservedSegment, buildGroupMicroCompactPlan, buildPostCompactReinjectionPlan, } = require("../collaboration/group-memory-compaction");
        const messages = Array.from({ length: 12 }, (_, index) => ({
            id: `pcca-center-${index}`,
            role: index % 2 ? "assistant" : "user",
            agent: index % 2 ? "api" : undefined,
            target: index % 2 ? undefined : "coordinator",
            timestamp: "2026-07-08T02:00:00.000Z",
            content: index === 0
                ? "必须保留 MEMORY_CENTER_POST_COMPACT_CLEANUP_SENTINEL，cleanup 后 skill/tool continuity 仍要作为上下文。"
                : `Memory Center cleanup audit 自测 ${index}，Skill:typescript-audit#cleanup，src/post-cleanup.ts，npm run check。${"证据".repeat(30)}`,
            invokedSkills: index % 2 ? [{ name: "typescript-audit", contentHash: "cleanup" }] : [],
        }));
        saveGroupMessages(groupId, messages);
        const keepIndex = 8;
        const microCompact = buildGroupMicroCompactPlan(messages.slice(0, keepIndex), { maxChars: 800 });
        const postCompactReinject = buildPostCompactReinjectionPlan(messages.slice(0, keepIndex), microCompact);
        const preservedSegment = buildGroupPreservedSegment(messages, keepIndex, {
            minMessages: 2,
            minTokens: 1,
            maxTokens: 1400,
            summaryChecksum: "memory-center-post-cleanup-summary",
            transcriptPath: messageFile,
            now: "2026-07-08T02:00:00.000Z",
        });
        const decision = buildGroupCompactStrategyDecision({
            groupId,
            messages,
            messagesToCompact: messages.slice(0, keepIndex),
            keptMessages: messages.slice(keepIndex),
            keepIndex,
            compacted: true,
            primaryCompact: true,
            microCompact,
            preservedSegment,
            preCompactTokenCount: 6800,
            postCompactTokenCount: 1700,
            summaryChecksum: "memory-center-post-cleanup-summary",
            transcriptPath: messageFile,
            reason: "memory center post compact cleanup audit selftest",
            now: "2026-07-08T02:00:00.000Z",
        });
        const recoveryAudit = {
            schema: "ccm-post-compact-recovery-audit-v1",
            status: "pass",
            pass: true,
            action: "safe_to_inject_child_agent_memory_packet",
            summaryChecksum: "memory-center-post-cleanup-summary",
            transcriptPath: messageFile,
            passedChecks: 3,
            checkCount: 3,
            failedChecks: [],
        };
        const boundary = {
            id: "memory-center-post-cleanup-boundary",
            summarizedFromMessageId: "pcca-center-0",
            summarizedThroughMessageId: "pcca-center-7",
            summarizedMessageCount: keepIndex,
            summaryChecksum: "memory-center-post-cleanup-summary",
            preCompactTokenCount: 6800,
            postCompactTokenCount: 1700,
            preservedSegment,
            compactStrategyDecision: decision,
            post_compact_restore: {
                strategy: "conversation_summary_recent_reinject",
                transcriptPath: messageFile,
                preservedSegment,
                strategyDecision: decision,
                recoveryAudit,
                microCompact,
                reinjectionPlan: postCompactReinject,
            },
        };
        const cleanupAudit = buildGroupPostCompactCleanupAudit({
            groupId,
            boundary,
            compactStrategyDecision: decision,
            postCompactRecoveryAudit: recoveryAudit,
            microCompact,
            postCompactReinject,
            preservedSegment,
            transcriptPath: messageFile,
            summaryChecksum: "memory-center-post-cleanup-summary",
            now: "2026-07-08T02:00:00.000Z",
        });
        boundary.post_compact_restore.cleanupAudit = cleanupAudit;
        const memory = {
            groupId,
            goal: "验证 post compact cleanup audit 能进入 Memory Center 治理和子 Agent 上下文",
            messageDigest: "MEMORY_CENTER_POST_COMPACT_CLEANUP_SENTINEL：cleanup audit 必须可见。",
            persistentRequirements: [{ messageId: "pcca-center-0", text: "必须保留 MEMORY_CENTER_POST_COMPACT_CLEANUP_SENTINEL。" }],
            compaction: {
                version: 1,
                compactedMessageCount: keepIndex,
                preservedRecentMessages: messages.length - keepIndex,
                lastCompactedMessageId: "pcca-center-7",
                lastCompactedAt: "2026-07-08T02:00:00.000Z",
                summaryChecksum: "memory-center-post-cleanup-summary",
                preCompactTokenCount: 6800,
                postCompactTokenCount: 1700,
                microCompact,
                postCompactReinject,
                preservedSegment,
                compactStrategyDecision: decision,
                postCompactRecoveryAudit: recoveryAudit,
                postCompactCleanupAudit: cleanupAudit,
            },
            compactBoundary: boundary,
            messageCompression: {
                enabled: true,
                compressedMessages: keepIndex,
                recentMessages: messages.length - keepIndex,
                postCompactCleanupAudit: cleanupAudit,
            },
        };
        saveGroupMemory(groupId, memory);
        const overview = (0, memory_control_center_1.buildGroupPostCompactCleanupAuditOverview)(groupId, memory);
        const report = (0, memory_control_center_1.buildPostCompactCleanupAuditReport)({ groupIds: [groupId] });
        const check = (0, memory_control_center_1.evaluatePostCompactCleanupAudit)({ groupIds: [groupId] });
        const detail = (0, memory_control_center_1.getMemoryCenterScope)("group", groupId);
        const detailCleanup = detail.postCompactUsage?.postCompactCleanupAudit || {};
        const rendered = renderGroupMemoryContextBundle({
            schema: "ccm-group-memory-context-v1",
            target_project: "api",
            memory_policy: { use: "must_consider" },
            group_state: { goal: memory.goal, currentPhase: "test" },
            compaction: {
                postCompactCleanupAudit: cleanupAudit,
            },
        });
        const checks = {
            overviewPassesCleanupAudit: overview.schema === "ccm-group-post-compact-cleanup-audit-overview-v1"
                && overview.status === "ok"
                && overview.preserveInvokedSkills === true
                && overview.preserveToolContinuity === true,
            reportAggregatesCleanupAudit: report.schema === "ccm-post-compact-cleanup-audit-report-v1"
                && report.overall?.status === "ok"
                && report.overall?.checkedGroupCount === 1
                && report.overall?.passedGroupCount === 1,
            qualityCheckCoversCleanupAudit: check.id === "post_compact_cleanup_audit"
                && Number(check.checked || 0) === 1
                && Number(check.passed || 0) === 1,
            detailExposesCleanupAudit: detailCleanup.schema === "ccm-group-post-compact-cleanup-audit-overview-v1"
                && detailCleanup.summaryChecksum === cleanupAudit.summaryChecksum
                && detailCleanup.transcriptPath === messageFile,
            childAgentRendererMentionsCleanup: rendered.includes("压缩后清理审计")
                && rendered.includes("invoked skills/tool continuity")
                && rendered.includes("raw="),
        };
        return { pass: Object.values(checks).every(Boolean), checks, cleanup: detailCleanup };
    }
    finally {
        for (const file of [groupFile, `${groupFile}.bak`, messageFile, `${messageFile}.bak`, reloadFile, `${reloadFile}.bak`]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
    }
}
function runMemoryCenterApiMicroCompactEditPlanSelfTest() {
    const groupId = `memory-center-api-microcompact-selftest-${process.pid}-${Date.now()}`;
    const groupFile = path.join(memory_control_center_1.GROUP_MEMORY_DIR, `${groupId}.json`);
    const messageFile = path.join(utils_1.GROUP_MESSAGES_DIR, `${groupId}.json`);
    const reloadFile = path.join(utils_1.CCM_DIR, "group-memory-reload", `${(0, memory_control_center_1.cleanId)(groupId)}.json`);
    try {
        const { saveGroupMemory, renderGroupMemoryContextBundle } = require("../collaboration/memory");
        const { saveGroupMessages } = require("../collaboration/storage");
        const { buildGroupApiMicroCompactEditPlan } = require("../collaboration/group-memory-compaction");
        const messages = [
            {
                id: "api-microcompact-center-thinking",
                role: "assistant",
                agent: "api",
                timestamp: "2026-07-08T05:00:00.000Z",
                content: [
                    { type: "thinking", thinking: "MEMORY_CENTER_API_MICROCOMPACT_THINKING_SENTINEL" },
                    { type: "tool_use", id: "tool-read-api-plan", name: "Read", input: { file_path: "src/api-microcompact-plan.ts" } },
                ],
            },
            {
                id: "api-microcompact-center-result",
                role: "user",
                timestamp: "2026-07-08T05:01:00.000Z",
                content: [
                    { type: "tool_result", tool_use_id: "tool-read-api-plan", content: "MEMORY_CENTER_API_MICROCOMPACT_TOOL_RESULT_SENTINEL\nsrc/api-microcompact-plan.ts" },
                ],
            },
            ...Array.from({ length: 10 }, (_, index) => ({
                id: `api-microcompact-center-${index}`,
                role: index % 2 ? "assistant" : "user",
                agent: index % 2 ? "api" : undefined,
                target: index % 2 ? undefined : "coordinator",
                timestamp: "2026-07-08T05:02:00.000Z",
                content: `API microcompact Memory Center 自测 ${index}，third-party executor context pressure ${"证据".repeat(30)}`,
            })),
        ];
        saveGroupMessages(groupId, messages);
        const plan = buildGroupApiMicroCompactEditPlan(messages, {
            groupId,
            activeTokens: 220000,
            maxInputTokens: 1000,
            targetInputTokens: 400,
            force: true,
            now: "2026-07-08T05:05:00.000Z",
        });
        const memory = {
            groupId,
            goal: "验证 API microcompact edit plan 能进入 Memory Center 治理和子 Agent 上下文",
            messageDigest: "MEMORY_CENTER_API_MICROCOMPACT_SENTINEL：API edit plan 必须可见。",
            persistentRequirements: [{ messageId: "api-microcompact-center-thinking", text: "必须保留 MEMORY_CENTER_API_MICROCOMPACT_SENTINEL。" }],
            compaction: {
                version: 1,
                compactedMessageCount: 8,
                preservedRecentMessages: 4,
                lastCompactedMessageId: "api-microcompact-center-5",
                lastCompactedAt: "2026-07-08T05:05:00.000Z",
                summaryChecksum: "memory-center-api-microcompact-summary",
                preCompactTokenCount: 220000,
                postCompactTokenCount: 40000,
                apiMicroCompactEditPlan: plan,
            },
            compactBoundary: {
                id: "memory-center-api-microcompact-boundary",
                summarizedFromMessageId: "api-microcompact-center-thinking",
                summarizedThroughMessageId: "api-microcompact-center-5",
                summarizedMessageCount: 8,
                summaryChecksum: "memory-center-api-microcompact-summary",
                preCompactTokenCount: 220000,
                postCompactTokenCount: 40000,
                apiMicroCompactEditPlan: plan,
                post_compact_restore: {
                    strategy: "conversation_summary_recent_reinject",
                    transcriptPath: messageFile,
                    apiMicroCompactEditPlan: plan,
                },
            },
            messageCompression: {
                enabled: true,
                compressedMessages: 8,
                recentMessages: 4,
                apiMicroCompactEditPlan: plan,
            },
        };
        saveGroupMemory(groupId, memory);
        const overview = (0, memory_control_center_1.buildGroupApiMicroCompactEditPlanOverview)(groupId, memory);
        const report = (0, memory_control_center_1.buildApiMicroCompactEditPlanReport)({ groupIds: [groupId] });
        const check = (0, memory_control_center_1.evaluateApiMicroCompactEditPlan)({ groupIds: [groupId] });
        const detail = (0, memory_control_center_1.getMemoryCenterScope)("group", groupId);
        const detailPlan = detail.postCompactUsage?.apiMicroCompactEditPlan || {};
        const rendered = renderGroupMemoryContextBundle({
            schema: "ccm-group-memory-context-v1",
            target_project: "api",
            memory_policy: { use: "must_consider" },
            group_state: { goal: memory.goal, currentPhase: "test" },
            compaction: {
                apiMicroCompactEditPlan: plan,
            },
        });
        const checks = {
            overviewPassesApiMicrocompactPlan: overview.schema === "ccm-group-api-microcompact-edit-plan-overview-v1"
                && overview.status === "ok"
                && overview.editCount === plan.editCount
                && overview.planChecksum === plan.planChecksum,
            reportAggregatesApiMicrocompactPlan: report.schema === "ccm-api-microcompact-edit-plan-report-v1"
                && report.overall?.status === "ok"
                && report.overall?.checkedGroupCount === 1
                && report.overall?.passedGroupCount === 1,
            qualityCheckCoversApiMicrocompactPlan: check.id === "api_microcompact_edit_plan"
                && Number(check.checked || 0) === 1
                && Number(check.passed || 0) === 1,
            detailExposesApiMicrocompactPlan: detailPlan.schema === "ccm-group-api-microcompact-edit-plan-overview-v1"
                && detailPlan.planChecksum === plan.planChecksum
                && detailPlan.editCount === plan.editCount,
            childAgentRendererMentionsApiMicrocompactPlan: rendered.includes("API microcompact edit plan")
                && rendered.includes("edits=")
                && rendered.includes("thinking=")
                && rendered.includes("tool_result="),
            planKeepsThirdPartyCliAdvisoryBoundary: plan.advisoryOnly === true
                && plan.canApplyNatively === false
                && plan.contextManagement?.edits?.length === plan.editCount,
        };
        return { pass: Object.values(checks).every(Boolean), checks, plan: detailPlan };
    }
    finally {
        for (const file of [groupFile, `${groupFile}.bak`, messageFile, `${messageFile}.bak`, reloadFile, `${reloadFile}.bak`]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
    }
}
function runMemoryCenterApiMicrocompactReceiptDisciplineSelfTest() {
    const groupId = `memory-center-api-microcompact-receipt-selftest-${process.pid}-${Date.now()}`;
    const groupFile = path.join(memory_control_center_1.GROUP_MEMORY_DIR, `${groupId}.json`);
    const messageFile = path.join(utils_1.GROUP_MESSAGES_DIR, `${groupId}.json`);
    const reloadFile = path.join(utils_1.CCM_DIR, "group-memory-reload", `${(0, memory_control_center_1.cleanId)(groupId)}.json`);
    const originalTasks = (0, db_1.loadTasks)();
    try {
        const { saveGroupMemory } = require("../collaboration/memory");
        const { saveGroupMessages } = require("../collaboration/storage");
        const { buildGroupApiMicroCompactEditPlan } = require("../collaboration/group-memory-compaction");
        const messages = [
            {
                id: "api-microcompact-receipt-thinking",
                role: "assistant",
                agent: "api",
                timestamp: "2026-07-08T06:00:00.000Z",
                content: [
                    { type: "thinking", thinking: "MEMORY_CENTER_API_MICROCOMPACT_RECEIPT_THINKING" },
                    { type: "tool_use", id: "tool-api-receipt", name: "Read", input: { file_path: "src/api-microcompact-receipt.ts" } },
                ],
            },
            {
                id: "api-microcompact-receipt-result",
                role: "user",
                timestamp: "2026-07-08T06:01:00.000Z",
                content: [{ type: "tool_result", tool_use_id: "tool-api-receipt", content: "API microcompact receipt result" }],
            },
        ];
        saveGroupMessages(groupId, messages);
        const plan = buildGroupApiMicroCompactEditPlan(messages, {
            groupId,
            activeTokens: 220000,
            maxInputTokens: 1000,
            targetInputTokens: 400,
            force: true,
            now: "2026-07-08T06:05:00.000Z",
        });
        saveGroupMemory(groupId, {
            groupId,
            goal: "验证 API microcompact 使用回执纪律",
            compaction: {
                compactedMessageCount: 2,
                lastCompactedMessageId: "api-microcompact-receipt-result",
                summaryChecksum: "memory-center-api-microcompact-receipt-summary",
                apiMicroCompactEditPlan: plan,
            },
            compactBoundary: {
                summarizedThroughMessageId: "api-microcompact-receipt-result",
                summaryChecksum: "memory-center-api-microcompact-receipt-summary",
                apiMicroCompactEditPlan: plan,
                post_compact_restore: { apiMicroCompactEditPlan: plan },
            },
        });
        const task = {
            id: `task-${groupId}`,
            title: "API microcompact receipt selftest",
            group_id: groupId,
            target_project: "api",
            workflow_type: "daily_dev",
            delivery_summary: {
                status: "done",
                api_microcompact_edit_plans: [{
                        plan_checksum: plan.planChecksum,
                        edit_count: plan.editCount,
                        advisory_only: true,
                        can_apply_natively: false,
                    }],
                api_microcompact_edit_plan_count: 1,
                api_microcompact_receipt_passed: true,
                api_microcompact_receipt_rows: [{
                        agent: "api",
                        api_microcompact: {
                            schema: "ccm-child-agent-api-microcompact-receipt-validation-v1",
                            required: true,
                            pass: true,
                            plan_checksums: [plan.planChecksum],
                            missing_plan_checksums: [],
                            unsafe_native_applied_plan_checksums: [],
                            native_applied_count: 0,
                            advisory_count: 1,
                            ignored_count: 0,
                            rows: [{ plan_checksum: plan.planChecksum, usage_state: "advisory", pass: true }],
                        },
                    }],
                receipt_quality: [{
                        agent: "api",
                        status: "done",
                        grade: "good",
                        api_microcompact: {
                            required: true,
                            pass: true,
                            plan_checksums: [plan.planChecksum],
                            missing_plan_checksums: [],
                            unsafe_native_applied_plan_checksums: [],
                            advisory_count: 1,
                        },
                    }],
                receipts: [{
                        agent: "api",
                        status: "done",
                        summary: "已按 advisory 使用 API microcompact edit plan。",
                        memoryUsed: [`api_microcompact_edit_plan planChecksum=${plan.planChecksum} advisory`],
                        apiMicrocompactUsage: [{
                                planChecksum: plan.planChecksum,
                                usageState: "advisory",
                                nativeApplied: false,
                                advisoryOnly: true,
                                reason: "third-party CLI advisory context pressure only",
                            }],
                    }],
            },
        };
        (0, db_1.saveTasks)([...originalTasks.filter((item) => item.id !== task.id), task]);
        const report = (0, memory_control_center_1.buildApiMicrocompactReceiptDisciplineReport)({ groupIds: [groupId], tasks: [task] });
        const check = (0, memory_control_center_1.evaluateApiMicrocompactReceiptDiscipline)({ groupIds: [groupId], tasks: [task] });
        const detail = (0, memory_control_center_1.getMemoryCenterScope)("group", groupId);
        const discipline = detail.postCompactUsage?.apiMicrocompactReceiptDiscipline || {};
        const checks = {
            reportAggregatesReceiptDiscipline: report.schema === "ccm-api-microcompact-receipt-discipline-report-v1"
                && report.overall?.status === "ok"
                && report.overall?.checked === 1
                && report.overall?.passed === 1,
            qualityCheckCoversReceiptDiscipline: check.id === "api_microcompact_receipt_discipline"
                && Number(check.checked || 0) === 1
                && Number(check.passed || 0) === 1,
            detailExposesReceiptDiscipline: discipline.schema === "ccm-api-microcompact-receipt-discipline-group-v1"
                && discipline.status === "ok"
                && discipline.planChecksum === plan.planChecksum,
        };
        return { pass: Object.values(checks).every(Boolean), checks, discipline };
    }
    finally {
        (0, db_1.saveTasks)(originalTasks);
        for (const file of [groupFile, `${groupFile}.bak`, messageFile, `${messageFile}.bak`, reloadFile, `${reloadFile}.bak`]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
    }
}
function runMemoryCenterApiMicrocompactNativeApplyReadinessSelfTest() {
    const groupId = `memory-center-api-microcompact-native-apply-selftest-${process.pid}-${Date.now()}`;
    const groupFile = path.join(memory_control_center_1.GROUP_MEMORY_DIR, `${groupId}.json`);
    const messageFile = path.join(utils_1.GROUP_MESSAGES_DIR, `${groupId}.json`);
    const reloadFile = path.join(utils_1.CCM_DIR, "group-memory-reload", `${(0, memory_control_center_1.cleanId)(groupId)}.json`);
    const originalTasks = (0, db_1.loadTasks)();
    try {
        const { saveGroupMemory } = require("../collaboration/memory");
        const { buildGroupApiMicroCompactEditPlan, buildGroupApiMicrocompactNativeApplyPlan } = require("../collaboration/group-memory-compaction");
        const messages = [{
                id: "api-microcompact-native-thinking",
                role: "assistant",
                agent: "api",
                timestamp: "2026-07-08T07:00:00.000Z",
                content: [
                    { type: "thinking", thinking: "MEMORY_CENTER_API_MICROCOMPACT_NATIVE_THINKING" },
                    { type: "tool_use", id: "tool-api-native", name: "Read", input: { file_path: "src/native.ts" } },
                    { type: "tool_result", tool_use_id: "tool-api-native", content: "native API result" },
                ],
            }];
        const plan = buildGroupApiMicroCompactEditPlan(messages, {
            groupId,
            targetProject: "api",
            activeTokens: 220000,
            maxInputTokens: 1000,
            targetInputTokens: 400,
            force: true,
            now: "2026-07-08T07:01:00.000Z",
        });
        const nativePlan = buildGroupApiMicrocompactNativeApplyPlan(plan, {
            groupId,
            targetProject: "api",
            agentType: "anthropic-api",
            transport: "anthropic_api",
            provider: "anthropic",
            supportsApiContextManagement: true,
            nativeApiRequestLayer: true,
            betaHeaders: ["context-management-2025-06-27"],
            sessionBinding: {
                schema: "ccm-child-agent-memory-session-binding-v1",
                binding_id: "csm-api-microcompact-native-readiness",
                task_agent_session_id: "tas-api-microcompact-native-readiness",
                native_session_id: "native-api-microcompact-native-readiness",
            },
            now: "2026-07-08T07:02:00.000Z",
        });
        saveGroupMemory(groupId, {
            groupId,
            goal: "验证 API microcompact native apply readiness",
            compaction: { apiMicroCompactEditPlan: plan },
        });
        const task = {
            id: `task-${groupId}`,
            title: "API microcompact native apply readiness selftest",
            group_id: groupId,
            target_project: "api",
            delivery_summary: {
                status: "done",
                api_microcompact_edit_plans: [{
                        plan_checksum: plan.planChecksum,
                        edit_count: plan.editCount,
                        recommended: true,
                        native_apply_ready: true,
                        can_apply_natively: true,
                        native_apply_plan: nativePlan,
                        apply_plan_checksum: nativePlan.applyPlanChecksum,
                        request_patch_checksum: nativePlan.requestPatchChecksum,
                        task_agent_session_id: nativePlan.task_agent_session_id,
                        native_session_id: nativePlan.native_session_id,
                    }],
            },
        };
        (0, db_1.saveTasks)([...originalTasks.filter((item) => item.id !== task.id), task]);
        const report = (0, memory_control_center_1.buildApiMicrocompactNativeApplyReadinessReport)({ groupIds: [groupId], tasks: [task] });
        const check = (0, memory_control_center_1.evaluateApiMicrocompactNativeApplyReadiness)({ groupIds: [groupId], tasks: [task] });
        const detail = (0, memory_control_center_1.getMemoryCenterScope)("group", groupId);
        const readiness = detail.postCompactUsage?.apiMicrocompactNativeApplyReadiness || {};
        const checks = {
            reportAggregatesNativeReadiness: report.schema === "ccm-api-microcompact-native-apply-readiness-report-v1"
                && report.overall?.status === "ok"
                && report.overall?.nativeReadyCount === 1,
            qualityCheckCoversNativeReadiness: check.id === "api_microcompact_native_apply_readiness"
                && Number(check.checked || 0) === 1
                && Number(check.passed || 0) === 1,
            detailExposesNativeReadiness: readiness.schema === "ccm-api-microcompact-native-apply-readiness-group-v1"
                && readiness.status === "ok"
                && readiness.rows?.[0]?.requestPatchChecksum === nativePlan.requestPatchChecksum,
            readinessTracksSessionBinding: readiness.rows?.[0]?.taskAgentSessionId === "tas-api-microcompact-native-readiness"
                && Number(readiness.sessionBound || 0) === 1,
        };
        return { pass: Object.values(checks).every(Boolean), checks, readiness };
    }
    finally {
        (0, db_1.saveTasks)(originalTasks);
        for (const file of [groupFile, `${groupFile}.bak`, messageFile, `${messageFile}.bak`, reloadFile, `${reloadFile}.bak`]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
    }
}
function runMemoryCenterApiMicrocompactNativeApplyProofSelfTest() {
    const groupId = `memory-center-api-microcompact-native-proof-selftest-${process.pid}-${Date.now()}`;
    const taskId = `task-${groupId}`;
    const executionId = `execution-${groupId}`;
    const runnerRequestId = `runner-${groupId}`;
    const nativeSessionId = `native-${groupId}`;
    const groupFile = path.join(memory_control_center_1.GROUP_MEMORY_DIR, `${groupId}.json`);
    const messageFile = path.join(utils_1.GROUP_MESSAGES_DIR, `${groupId}.json`);
    const reloadFile = path.join(utils_1.CCM_DIR, "group-memory-reload", `${(0, memory_control_center_1.cleanId)(groupId)}.json`);
    const proofFile = (0, memory_control_center_1.getGroupApiMicrocompactNativeApplyProofLedgerFile)(groupId);
    const telemetryFile = (0, memory_control_center_1.getGroupApiMicrocompactNativeApplyRequestTelemetryLedgerFile)(groupId);
    const workItemsFile = (0, memory_control_center_1.getGroupCompactBoundaryReplayRepairWorkItemsFile)(groupId);
    const executionFile = (0, memory_control_center_1.getExecutionKernelRecordFileForCenter)(executionId);
    const originalTasks = (0, db_1.loadTasks)();
    try {
        const { recordGroupApiMicrocompactNativeApplyProofLedger, recordGroupApiMicrocompactNativeApplyAdapterTelemetry, saveGroupMemory, renderGroupMemoryContextBundle, } = require("../collaboration/memory");
        const { buildGroupApiMicroCompactEditPlan, buildGroupApiMicrocompactNativeApplyPlan } = require("../collaboration/group-memory-compaction");
        const { openTaskAgentSession, recordTaskAgentSessionTurn, bindTaskAgentMemoryContextSnapshot, } = require("../../tasks/agent-sessions");
        const { ensureExecution, registerExternalRunnerRequest } = require("../../agents/execution-kernel");
        const taskAgentSession = openTaskAgentSession({
            scopeId: taskId,
            taskId,
            groupId,
            project: "api",
            agentType: "claudecode",
        });
        recordTaskAgentSessionTurn(taskAgentSession.id, { nativeSessionId, success: true });
        const snapshotBinding = bindTaskAgentMemoryContextSnapshot(taskAgentSession.id, {
            taskId,
            groupId,
            project: "api",
            agentType: "claudecode",
            nativeSessionId,
            turn: 1,
            executionId,
            workerContextPacket: {
                packet_id: `wcp-${groupId}`,
                memory: {
                    schema: "ccm-group-memory-context-v1",
                    target_project: "api",
                    memory_policy: { use: "must_consider" },
                },
            },
            renderedPrompt: "selftest prompt includes group memory context",
        });
        ensureExecution({
            task: { id: taskId, title: "API microcompact native apply proof selftest", target_project: "api" },
            project: "api",
            agent: "api",
            workDir: process.cwd(),
            executionId,
        });
        registerExternalRunnerRequest(executionId, runnerRequestId);
        const memoryContextSnapshotId = snapshotBinding?.snapshot?.snapshot_id || snapshotBinding?.session?.memoryContextSnapshotId || "";
        const memoryContextSnapshotChecksum = snapshotBinding?.snapshot?.checksum || snapshotBinding?.session?.memoryContextSnapshotChecksum || "";
        const messages = [{
                id: "api-microcompact-native-proof-thinking",
                role: "assistant",
                agent: "api",
                timestamp: "2026-07-08T08:00:00.000Z",
                content: [
                    { type: "thinking", thinking: "MEMORY_CENTER_API_MICROCOMPACT_NATIVE_PROOF_THINKING" },
                    { type: "tool_use", id: "tool-api-native-proof", name: "Read", input: { file_path: "src/native-proof.ts" } },
                    { type: "tool_result", tool_use_id: "tool-api-native-proof", content: "native proof result" },
                ],
            }];
        const plan = buildGroupApiMicroCompactEditPlan(messages, {
            groupId,
            targetProject: "api",
            activeTokens: 220000,
            maxInputTokens: 1000,
            targetInputTokens: 400,
            force: true,
            now: "2026-07-08T08:01:00.000Z",
        });
        const nativePlan = buildGroupApiMicrocompactNativeApplyPlan(plan, {
            groupId,
            targetProject: "api",
            agentType: "anthropic-api",
            transport: "anthropic_api",
            provider: "anthropic",
            supportsApiContextManagement: true,
            nativeApiRequestLayer: true,
            betaHeaders: ["context-management-2025-06-27"],
            sessionBinding: {
                schema: "ccm-child-agent-memory-session-binding-v1",
                binding_id: "csm-api-microcompact-native-proof",
                task_agent_session_id: taskAgentSession.id,
                native_session_id: nativeSessionId,
            },
            memoryContextSnapshotId: memoryContextSnapshotId,
            memoryContextSnapshotChecksum: memoryContextSnapshotChecksum,
            now: "2026-07-08T08:02:00.000Z",
        });
        saveGroupMemory(groupId, {
            groupId,
            goal: "验证 API microcompact native apply proof ledger",
            compaction: {
                compactedMessageCount: 1,
                summaryChecksum: "memory-center-api-microcompact-native-proof-summary",
                apiMicroCompactEditPlan: plan,
                apiMicrocompactNativeApplyPlan: nativePlan,
            },
        });
        const task = {
            id: taskId,
            title: "API microcompact native apply proof selftest",
            group_id: groupId,
            target_project: "api",
            delivery_summary: {
                status: "done",
                api_microcompact_edit_plans: [{
                        plan_checksum: plan.planChecksum,
                        edit_count: plan.editCount,
                        recommended: true,
                        native_apply_ready: true,
                        can_apply_natively: true,
                        native_apply_plan: nativePlan,
                        apply_plan_checksum: nativePlan.applyPlanChecksum,
                        request_patch_checksum: nativePlan.requestPatchChecksum,
                        task_agent_session_id: nativePlan.task_agent_session_id,
                        native_session_id: nativePlan.native_session_id,
                        memory_context_snapshot_id: nativePlan.memory_context_snapshot_id,
                        memory_context_snapshot_checksum: nativePlan.memory_context_snapshot_checksum,
                    }],
                api_microcompact_receipt_passed: true,
                api_microcompact_receipt_rows: [{
                        agent: "api",
                        status: "done",
                        api_microcompact: {
                            schema: "ccm-child-agent-api-microcompact-receipt-validation-v1",
                            required: true,
                            pass: true,
                            plan_checksums: [plan.planChecksum],
                            native_applied_count: 1,
                            advisory_count: 0,
                            ignored_count: 0,
                            rows: [{
                                    plan_checksum: plan.planChecksum,
                                    usage_state: "native_applied",
                                    native_applied: true,
                                    native_apply_ready: true,
                                    apply_plan_checksum: nativePlan.applyPlanChecksum,
                                    request_patch_checksum: nativePlan.requestPatchChecksum,
                                    receipt_apply_plan_checksum: nativePlan.applyPlanChecksum,
                                    receipt_request_patch_checksum: nativePlan.requestPatchChecksum,
                                    apply_plan_checksum_matched: true,
                                    request_patch_checksum_matched: true,
                                    session_binding_required: true,
                                    session_matched: true,
                                    expected_task_agent_session_id: nativePlan.task_agent_session_id,
                                    receipt_task_agent_session_id: nativePlan.task_agent_session_id,
                                    expected_native_session_id: nativePlan.native_session_id,
                                    receipt_native_session_id: nativePlan.native_session_id,
                                    expected_memory_context_snapshot_id: nativePlan.memory_context_snapshot_id,
                                    receipt_memory_context_snapshot_id: nativePlan.memory_context_snapshot_id,
                                    expected_memory_context_snapshot_checksum: nativePlan.memory_context_snapshot_checksum,
                                    receipt_memory_context_snapshot_checksum: nativePlan.memory_context_snapshot_checksum,
                                    unsafe_native_applied: false,
                                    pass: true,
                                    reason: "provider request merged context_management with requestPatchChecksum",
                                }],
                        },
                    }],
                receipts: [{
                        agent: "api",
                        status: "done",
                        apiMicrocompactNativeApplyRequestTelemetry: [{
                                planChecksum: plan.planChecksum,
                                applyPlanChecksum: nativePlan.applyPlanChecksum,
                                requestPatchChecksum: nativePlan.requestPatchChecksum,
                                requestBodyChecksum: "request-body-checksum-api-microcompact-native-proof",
                                hasContextManagement: true,
                                betaHeaders: ["context-management-2025-06-27"],
                                provider: "anthropic",
                                model: "claude-selftest",
                                endpoint: "https://api.anthropic.com/v1/messages",
                                method: "POST",
                                responseStatus: 200,
                                requestId: "req-api-microcompact-native-proof",
                                runnerRequestId,
                                externalRunnerRequestId: runnerRequestId,
                                taskAgentSessionId: nativePlan.task_agent_session_id,
                                nativeSessionId: nativePlan.native_session_id,
                                memoryContextSnapshotId: nativePlan.memory_context_snapshot_id,
                                memoryContextSnapshotChecksum: nativePlan.memory_context_snapshot_checksum,
                                sentAt: "2026-07-08T08:02:30.000Z",
                                telemetrySource: "native_request_adapter",
                            }],
                    }],
            },
        };
        recordGroupApiMicrocompactNativeApplyAdapterTelemetry({
            groupId,
            targetProject: "api",
            taskId: task.id,
            executionId,
            runnerRequestId,
            externalRunnerRequestId: runnerRequestId,
            apiMicrocompactNativeApplyPlan: nativePlan,
            requestPatch: nativePlan.requestPatch,
            requestBody: {
                model: "claude-selftest",
                messages: [{ role: "user", content: "memory center native proof adapter telemetry selftest" }],
                context_management: nativePlan.requestPatch?.body?.context_management,
            },
            headers: { "anthropic-beta": "context-management-2025-06-27" },
            provider: "anthropic",
            model: "claude-selftest",
            endpoint: "https://api.anthropic.com/v1/messages",
            method: "POST",
            responseStatus: 200,
            requestId: "req-api-microcompact-native-proof",
            sentAt: "2026-07-08T08:02:30.000Z",
        });
        recordGroupApiMicrocompactNativeApplyProofLedger(groupId, {
            targetProject: "api",
            taskId: task.id,
            executionId,
            runnerRequestId,
            externalRunnerRequestId: runnerRequestId,
            finalStatus: "done",
            receiptRows: task.delivery_summary.api_microcompact_receipt_rows,
            generatedAt: "2026-07-08T08:03:00.000Z",
        });
        (0, db_1.saveTasks)([...originalTasks.filter((item) => item.id !== task.id), task]);
        const report = (0, memory_control_center_1.buildApiMicrocompactNativeApplyProofReport)({ groupIds: [groupId], tasks: [task], nowMs: Date.parse("2026-07-08T08:10:00.000Z") });
        const check = (0, memory_control_center_1.evaluateApiMicrocompactNativeApplyProof)({ groupIds: [groupId], tasks: [task], nowMs: Date.parse("2026-07-08T08:10:00.000Z") });
        const detail = (0, memory_control_center_1.getMemoryCenterScope)("group", groupId);
        const proof = detail.postCompactUsage?.apiMicrocompactNativeApplyProof || {};
        const rendered = renderGroupMemoryContextBundle({
            schema: "ccm-group-memory-context-v1",
            target_project: "api",
            memory_policy: { use: "must_consider" },
            group_state: { goal: "proof ledger render", currentPhase: "test" },
            compaction: {
                apiMicroCompactEditPlan: plan,
                apiMicrocompactNativeApplyPlan: nativePlan,
                apiMicrocompactNativeApplyProofLedger: {
                    schema: "ccm-group-api-microcompact-native-apply-proof-summary-v1",
                    has_history: true,
                    status: "ok",
                    proof_coverage_rate: 100,
                    ledger_file: proofFile,
                    request_telemetry: {
                        schema: "ccm-group-api-microcompact-native-apply-request-telemetry-summary-v1",
                        ledger_file: telemetryFile,
                        matched_verified_count: 1,
                        adapter_matched_verified_count: 1,
                        receipt_matched_verified_count: 0,
                        strong_verified_count: 1,
                        receipt_only_verified_count: 0,
                        missing_verified_count: 0,
                        stale_verified_count: 0,
                    },
                    totals: { verified: 1, failed: 0, advisory: 0, not_supported: 0, native_claims: 1 },
                    verified_entries: [{ plan_checksum: plan.planChecksum, request_patch_checksum: nativePlan.requestPatchChecksum, task_agent_session_id: nativePlan.task_agent_session_id, memory_context_snapshot_id: nativePlan.memory_context_snapshot_id, request_telemetry_status: "matched" }],
                    failed_entries: [],
                },
            },
        });
        const checks = {
            reportAggregatesNativeProof: report.schema === "ccm-api-microcompact-native-apply-proof-report-v1"
                && report.overall?.status === "ok"
                && report.overall?.verifiedProofCount === 1
                && report.overall?.requestTelemetryMatchedCount === 1
                && report.overall?.requestTelemetryAdapterMatchedCount === 1
                && report.overall?.requestTelemetryStrongCount === 1
                && report.overall?.requestTelemetrySessionBoundCount === 1
                && report.overall?.requestTelemetryDispatchBoundCount === 1
                && report.overall?.requestTelemetryRunnerBoundCount === 1
                && report.overall?.missingProofCount === 0,
            qualityCheckCoversNativeProof: check.id === "api_microcompact_native_apply_proof"
                && Number(check.checked || 0) === 1
                && Number(check.passed || 0) === 1,
            detailExposesNativeProof: proof.schema === "ccm-api-microcompact-native-apply-proof-group-v1"
                && proof.status === "ok"
                && proof.rows?.[0]?.requestPatchChecksum === nativePlan.requestPatchChecksum,
            detailExposesAdapterTelemetrySource: proof.requestTelemetryAdapterMatchedCount === 1
                && proof.requestTelemetryStrongCount === 1
                && proof.requestTelemetrySessionBoundCount === 1
                && proof.requestTelemetryDispatchBoundCount === 1
                && proof.requestTelemetryRunnerBoundCount === 1
                && proof.rows?.[0]?.nativeApplyStrongProof === true
                && proof.rows?.[0]?.requestTelemetrySource === "native_request_adapter",
            childAgentRendererMentionsNativeProof: rendered.includes("API microcompact native apply proof ledger")
                && rendered.includes("verified=1")
                && rendered.includes("strong=1")
                && rendered.includes("adapter=1")
                && rendered.includes(nativePlan.requestPatchChecksum),
        };
        return { pass: Object.values(checks).every(Boolean), checks, proof };
    }
    finally {
        (0, db_1.saveTasks)(originalTasks);
        try {
            const { purgeTaskAgentSessions } = require("../../tasks/agent-sessions");
            purgeTaskAgentSessions(taskId);
        }
        catch { }
        for (const file of [groupFile, `${groupFile}.bak`, messageFile, `${messageFile}.bak`, reloadFile, `${reloadFile}.bak`, proofFile, `${proofFile}.bak`, telemetryFile, `${telemetryFile}.bak`, workItemsFile, `${workItemsFile}.bak`]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
        try {
            if (fs.existsSync(executionFile))
                fs.unlinkSync(executionFile);
        }
        catch { }
    }
}
function runMemoryCenterApiMicrocompactNativeApplyProofAgingSelfTest() {
    const baseId = `memory-center-api-microcompact-native-proof-aging-selftest-${process.pid}-${Date.now()}`;
    const receiptOnlyGroupId = `${baseId}-receipt-only`;
    const staleGroupId = `${baseId}-stale`;
    const groupIds = [receiptOnlyGroupId, staleGroupId];
    const files = groupIds.flatMap(groupId => {
        const proofFile = (0, memory_control_center_1.getGroupApiMicrocompactNativeApplyProofLedgerFile)(groupId);
        const telemetryFile = (0, memory_control_center_1.getGroupApiMicrocompactNativeApplyRequestTelemetryLedgerFile)(groupId);
        return [proofFile, `${proofFile}.bak`, telemetryFile, `${telemetryFile}.bak`];
    });
    const makeNative = (groupId, suffix) => ({
        schema: "ccm-api-microcompact-native-apply-plan-v1",
        groupId,
        group_id: groupId,
        targetProject: "api",
        target_project: "api",
        apiEditPlanChecksum: `plan-${suffix}`,
        applyPlanChecksum: `apply-${suffix}`,
        requestPatchChecksum: `request-${suffix}`,
        taskAgentSessionId: `tas-${suffix}`,
        task_agent_session_id: `tas-${suffix}`,
        nativeSessionId: `native-${suffix}`,
        native_session_id: `native-${suffix}`,
        memoryContextSnapshotId: `snapshot-${suffix}`,
        memory_context_snapshot_id: `snapshot-${suffix}`,
        memoryContextSnapshotChecksum: `snapshot-checksum-${suffix}`,
        memory_context_snapshot_checksum: `snapshot-checksum-${suffix}`,
        nativeApplyReady: true,
        mode: "native_api_context_management",
        requestPatch: {
            body: { context_management: { edits: [{ type: "clear_tool_uses_20250919", keep: { type: "tool_use_id", value: `tool-${suffix}` } }] } },
            beta_headers: ["context-management-2025-06-27"],
        },
    });
    const makeReceiptRows = (nativePlan) => [{
            agent: "api",
            status: "done",
            api_microcompact: {
                required: true,
                pass: true,
                rows: [{
                        plan_checksum: nativePlan.apiEditPlanChecksum,
                        usage_state: "native_applied",
                        native_applied: true,
                        native_apply_ready: true,
                        apply_plan_checksum: nativePlan.applyPlanChecksum,
                        request_patch_checksum: nativePlan.requestPatchChecksum,
                        receipt_apply_plan_checksum: nativePlan.applyPlanChecksum,
                        receipt_request_patch_checksum: nativePlan.requestPatchChecksum,
                        apply_plan_checksum_matched: true,
                        request_patch_checksum_matched: true,
                        session_binding_required: true,
                        session_matched: true,
                        expected_task_agent_session_id: nativePlan.task_agent_session_id,
                        receipt_task_agent_session_id: nativePlan.task_agent_session_id,
                        expected_native_session_id: nativePlan.native_session_id,
                        receipt_native_session_id: nativePlan.native_session_id,
                        expected_memory_context_snapshot_id: nativePlan.memory_context_snapshot_id,
                        receipt_memory_context_snapshot_id: nativePlan.memory_context_snapshot_id,
                        expected_memory_context_snapshot_checksum: nativePlan.memory_context_snapshot_checksum,
                        receipt_memory_context_snapshot_checksum: nativePlan.memory_context_snapshot_checksum,
                        unsafe_native_applied: false,
                        pass: true,
                        reason: "provider request telemetry downgrade selftest",
                    }],
            },
        }];
    const makeTask = (groupId, nativePlan) => ({
        id: `task-${groupId}`,
        title: "API microcompact native proof aging selftest",
        group_id: groupId,
        target_project: "api",
        delivery_summary: {
            status: "done",
            api_microcompact_receipt_passed: true,
            api_microcompact_receipt_rows: makeReceiptRows(nativePlan),
        },
    });
    try {
        const { recordGroupApiMicrocompactNativeApplyProofLedger, recordGroupApiMicrocompactNativeApplyRequestTelemetryLedger, recordGroupApiMicrocompactNativeApplyAdapterTelemetry, } = require("../collaboration/memory");
        const receiptOnlyPlan = makeNative(receiptOnlyGroupId, "receipt-only");
        const stalePlan = makeNative(staleGroupId, "stale");
        const receiptOnlyTask = makeTask(receiptOnlyGroupId, receiptOnlyPlan);
        const staleTask = makeTask(staleGroupId, stalePlan);
        const receiptOnlyRows = receiptOnlyTask.delivery_summary.api_microcompact_receipt_rows;
        const staleRows = staleTask.delivery_summary.api_microcompact_receipt_rows;
        recordGroupApiMicrocompactNativeApplyRequestTelemetryLedger(receiptOnlyGroupId, {
            targetProject: "api",
            taskId: receiptOnlyTask.id,
            executionId: "execution-receipt-only",
            receipts: [{
                    agent: "api",
                    apiMicrocompactNativeApplyRequestTelemetry: [{
                            planChecksum: receiptOnlyPlan.apiEditPlanChecksum,
                            applyPlanChecksum: receiptOnlyPlan.applyPlanChecksum,
                            requestPatchChecksum: receiptOnlyPlan.requestPatchChecksum,
                            requestBodyChecksum: "request-body-receipt-only",
                            hasContextManagement: true,
                            betaHeaders: ["context-management-2025-06-27"],
                            provider: "anthropic",
                            model: "claude-selftest",
                            endpoint: "https://api.anthropic.com/v1/messages",
                            method: "POST",
                            responseStatus: 200,
                            requestId: "req-receipt-only",
                            taskAgentSessionId: receiptOnlyPlan.task_agent_session_id,
                            nativeSessionId: receiptOnlyPlan.native_session_id,
                            memoryContextSnapshotId: receiptOnlyPlan.memory_context_snapshot_id,
                            memoryContextSnapshotChecksum: receiptOnlyPlan.memory_context_snapshot_checksum,
                            sentAt: "2026-07-08T08:00:00.000Z",
                            telemetrySource: "agent_receipt",
                        }],
                }],
            generatedAt: "2026-07-08T08:00:05.000Z",
        });
        recordGroupApiMicrocompactNativeApplyAdapterTelemetry({
            groupId: staleGroupId,
            targetProject: "api",
            taskId: staleTask.id,
            executionId: "execution-stale",
            apiMicrocompactNativeApplyPlan: stalePlan,
            requestPatch: stalePlan.requestPatch,
            requestBody: {
                model: "claude-selftest",
                messages: [{ role: "user", content: "stale adapter telemetry selftest" }],
                context_management: stalePlan.requestPatch.body.context_management,
            },
            headers: { "anthropic-beta": "context-management-2025-06-27" },
            provider: "anthropic",
            model: "claude-selftest",
            endpoint: "https://api.anthropic.com/v1/messages",
            method: "POST",
            responseStatus: 200,
            requestId: "req-stale-adapter",
            sentAt: "2026-07-01T08:00:00.000Z",
        });
        recordGroupApiMicrocompactNativeApplyProofLedger(receiptOnlyGroupId, {
            targetProject: "api",
            taskId: receiptOnlyTask.id,
            executionId: "execution-receipt-only",
            finalStatus: "done",
            receiptRows: receiptOnlyRows,
            generatedAt: "2026-07-08T08:01:00.000Z",
        });
        recordGroupApiMicrocompactNativeApplyProofLedger(staleGroupId, {
            targetProject: "api",
            taskId: staleTask.id,
            executionId: "execution-stale",
            finalStatus: "done",
            receiptRows: staleRows,
            generatedAt: "2026-07-08T08:01:00.000Z",
        });
        const report = (0, memory_control_center_1.buildApiMicrocompactNativeApplyProofReport)({
            groupIds,
            tasks: [receiptOnlyTask, staleTask],
            nowMs: Date.parse("2026-07-08T08:10:00.000Z"),
            telemetryMaxAgeMs: 60 * 60 * 1000,
        });
        const receiptOnly = (report.groups || []).find((row) => row.groupId === receiptOnlyGroupId) || {};
        const stale = (report.groups || []).find((row) => row.groupId === staleGroupId) || {};
        const gapText = JSON.stringify([...(receiptOnly.gaps || []), ...(stale.gaps || [])]);
        const checks = {
            receiptOnlyDoesNotPass: receiptOnly.status === "fail"
                && Number(receiptOnly.passed || 0) === 0
                && Number(receiptOnly.requestTelemetryReceiptOnlyCount || 0) === 1
                && Number(receiptOnly.requestTelemetryStrongCount || 0) === 0,
            staleAdapterDoesNotPass: stale.status === "fail"
                && Number(stale.passed || 0) === 0
                && Number(stale.requestTelemetryStaleCount || 0) === 1
                && Number(stale.requestTelemetryStrongCount || 0) === 0,
            overallCountsWeakProofs: Number(report.overall?.requestTelemetryReceiptOnlyCount || 0) === 1
                && Number(report.overall?.requestTelemetryStaleCount || 0) === 1
                && Number(report.overall?.requestTelemetryStrongCount || 0) === 0,
            gapsExplainDowngrade: gapText.includes("只有 Agent 回执来源 telemetry")
                && gapText.includes("provider request telemetry 已过期"),
        };
        return { pass: Object.values(checks).every(Boolean), checks, report: { overall: report.overall, receiptOnly, stale } };
    }
    finally {
        for (const file of files) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
    }
}
function runMemoryCenterApiMicrocompactNativeApplyDispatchBindingSelfTest() {
    const baseId = `memory-center-api-microcompact-native-dispatch-binding-selftest-${process.pid}-${Date.now()}`;
    const groupIds = ["good", "missing-session", "runner-mismatch"].map(suffix => `${baseId}-${suffix}`);
    const files = groupIds.flatMap(groupId => {
        const proofFile = (0, memory_control_center_1.getGroupApiMicrocompactNativeApplyProofLedgerFile)(groupId);
        const telemetryFile = (0, memory_control_center_1.getGroupApiMicrocompactNativeApplyRequestTelemetryLedgerFile)(groupId);
        return [proofFile, `${proofFile}.bak`, telemetryFile, `${telemetryFile}.bak`];
    });
    const executionFiles = [];
    const taskIds = [];
    const makeNativePlan = (groupId, suffix, binding = {}) => ({
        schema: "ccm-api-microcompact-native-apply-plan-v1",
        groupId,
        group_id: groupId,
        targetProject: "api",
        target_project: "api",
        apiEditPlanChecksum: `plan-${suffix}`,
        api_edit_plan_checksum: `plan-${suffix}`,
        applyPlanChecksum: `apply-${suffix}`,
        apply_plan_checksum: `apply-${suffix}`,
        requestPatchChecksum: `request-${suffix}`,
        request_patch_checksum: `request-${suffix}`,
        taskAgentSessionId: binding.taskAgentSessionId || `tas-${suffix}`,
        task_agent_session_id: binding.taskAgentSessionId || `tas-${suffix}`,
        nativeSessionId: binding.nativeSessionId || `native-${suffix}`,
        native_session_id: binding.nativeSessionId || `native-${suffix}`,
        memoryContextSnapshotId: binding.memoryContextSnapshotId || `snapshot-${suffix}`,
        memory_context_snapshot_id: binding.memoryContextSnapshotId || `snapshot-${suffix}`,
        memoryContextSnapshotChecksum: binding.memoryContextSnapshotChecksum || `snapshot-checksum-${suffix}`,
        memory_context_snapshot_checksum: binding.memoryContextSnapshotChecksum || `snapshot-checksum-${suffix}`,
        nativeApplyReady: true,
        mode: "native_api_context_management",
        requestPatch: {
            body: { context_management: { edits: [{ type: "clear_tool_uses_20250919", keep: { type: "tool_use_id", value: `tool-${suffix}` } }] } },
            beta_headers: ["context-management-2025-06-27"],
        },
    });
    const makeReceiptRows = (nativePlan, runnerRequestId = "") => [{
            agent: "api",
            status: "done",
            runner_request_id: runnerRequestId,
            external_runner_request_id: runnerRequestId,
            api_microcompact: {
                required: true,
                pass: true,
                rows: [{
                        plan_checksum: nativePlan.apiEditPlanChecksum,
                        usage_state: "native_applied",
                        native_applied: true,
                        native_apply_ready: true,
                        apply_plan_checksum: nativePlan.applyPlanChecksum,
                        request_patch_checksum: nativePlan.requestPatchChecksum,
                        receipt_apply_plan_checksum: nativePlan.applyPlanChecksum,
                        receipt_request_patch_checksum: nativePlan.requestPatchChecksum,
                        apply_plan_checksum_matched: true,
                        request_patch_checksum_matched: true,
                        session_binding_required: true,
                        session_matched: true,
                        expected_task_agent_session_id: nativePlan.task_agent_session_id,
                        receipt_task_agent_session_id: nativePlan.task_agent_session_id,
                        expected_native_session_id: nativePlan.native_session_id,
                        receipt_native_session_id: nativePlan.native_session_id,
                        expected_memory_context_snapshot_id: nativePlan.memory_context_snapshot_id,
                        receipt_memory_context_snapshot_id: nativePlan.memory_context_snapshot_id,
                        expected_memory_context_snapshot_checksum: nativePlan.memory_context_snapshot_checksum,
                        receipt_memory_context_snapshot_checksum: nativePlan.memory_context_snapshot_checksum,
                        runner_request_id: runnerRequestId,
                        external_runner_request_id: runnerRequestId,
                        unsafe_native_applied: false,
                        pass: true,
                        reason: "dispatch/session binding selftest",
                    }],
            },
        }];
    const makeTask = (groupId, suffix) => {
        const taskId = `task-${groupId}`;
        taskIds.push(taskId);
        return {
            id: taskId,
            title: `API microcompact dispatch binding ${suffix}`,
            group_id: groupId,
            target_project: "api",
            delivery_summary: { status: "done", api_microcompact_receipt_passed: true },
        };
    };
    const createBoundSession = (task, groupId, suffix, executionId) => {
        const { openTaskAgentSession, recordTaskAgentSessionTurn, bindTaskAgentMemoryContextSnapshot, } = require("../../tasks/agent-sessions");
        const session = openTaskAgentSession({
            scopeId: task.id,
            taskId: task.id,
            groupId,
            project: "api",
            agentType: "claudecode",
        });
        const nativeSessionId = `native-${suffix}`;
        recordTaskAgentSessionTurn(session.id, { nativeSessionId, success: true });
        const bound = bindTaskAgentMemoryContextSnapshot(session.id, {
            taskId: task.id,
            groupId,
            project: "api",
            agentType: "claudecode",
            nativeSessionId,
            executionId,
            turn: 1,
            workerContextPacket: {
                packet_id: `wcp-${suffix}`,
                memory: { schema: "ccm-group-memory-context-v1", target_project: "api" },
            },
            renderedPrompt: `dispatch binding prompt ${suffix}`,
        });
        return {
            taskAgentSessionId: session.id,
            nativeSessionId,
            memoryContextSnapshotId: bound?.snapshot?.snapshot_id || "",
            memoryContextSnapshotChecksum: bound?.snapshot?.checksum || "",
        };
    };
    const createExecution = (task, executionId, runnerToRegister = "") => {
        const { ensureExecution, registerExternalRunnerRequest } = require("../../agents/execution-kernel");
        ensureExecution({
            task,
            project: "api",
            agent: "api",
            workDir: process.cwd(),
            executionId,
        });
        executionFiles.push((0, memory_control_center_1.getExecutionKernelRecordFileForCenter)(executionId));
        if (runnerToRegister)
            registerExternalRunnerRequest(executionId, runnerToRegister);
    };
    const recordPlan = (nativePlan, task, executionId, runnerRequestId) => {
        const { recordGroupApiMicrocompactNativeApplyProofLedger, recordGroupApiMicrocompactNativeApplyAdapterTelemetry, } = require("../collaboration/memory");
        recordGroupApiMicrocompactNativeApplyAdapterTelemetry({
            groupId: nativePlan.group_id,
            targetProject: "api",
            taskId: task.id,
            executionId,
            runnerRequestId,
            externalRunnerRequestId: runnerRequestId,
            apiMicrocompactNativeApplyPlan: nativePlan,
            requestPatch: nativePlan.requestPatch,
            requestBody: {
                model: "claude-selftest",
                messages: [{ role: "user", content: "dispatch binding selftest" }],
                context_management: nativePlan.requestPatch.body.context_management,
            },
            headers: { "anthropic-beta": "context-management-2025-06-27" },
            provider: "anthropic",
            model: "claude-selftest",
            endpoint: "https://api.anthropic.com/v1/messages",
            method: "POST",
            responseStatus: 200,
            requestId: `req-${runnerRequestId}`,
            sentAt: "2026-07-08T08:02:30.000Z",
        });
        recordGroupApiMicrocompactNativeApplyProofLedger(nativePlan.group_id, {
            targetProject: "api",
            taskId: task.id,
            executionId,
            runnerRequestId,
            externalRunnerRequestId: runnerRequestId,
            finalStatus: "done",
            receiptRows: makeReceiptRows(nativePlan, runnerRequestId),
            generatedAt: "2026-07-08T08:03:00.000Z",
        });
    };
    try {
        const [goodGroupId, missingSessionGroupId, runnerMismatchGroupId] = groupIds;
        const goodTask = makeTask(goodGroupId, "good");
        const missingSessionTask = makeTask(missingSessionGroupId, "missing-session");
        const runnerMismatchTask = makeTask(runnerMismatchGroupId, "runner-mismatch");
        const goodExecutionId = `execution-${goodGroupId}`;
        const missingExecutionId = `execution-${missingSessionGroupId}`;
        const runnerMismatchExecutionId = `execution-${runnerMismatchGroupId}`;
        const goodRunnerId = `runner-${goodGroupId}`;
        const missingRunnerId = `runner-${missingSessionGroupId}`;
        const runnerTelemetryId = `runner-${runnerMismatchGroupId}`;
        const goodPlan = makeNativePlan(goodGroupId, "good", createBoundSession(goodTask, goodGroupId, "good", goodExecutionId));
        createExecution(goodTask, goodExecutionId, goodRunnerId);
        recordPlan(goodPlan, goodTask, goodExecutionId, goodRunnerId);
        const missingSessionPlan = makeNativePlan(missingSessionGroupId, "missing-session");
        createExecution(missingSessionTask, missingExecutionId, missingRunnerId);
        recordPlan(missingSessionPlan, missingSessionTask, missingExecutionId, missingRunnerId);
        const runnerMismatchPlan = makeNativePlan(runnerMismatchGroupId, "runner-mismatch", createBoundSession(runnerMismatchTask, runnerMismatchGroupId, "runner-mismatch", runnerMismatchExecutionId));
        createExecution(runnerMismatchTask, runnerMismatchExecutionId, `different-${runnerTelemetryId}`);
        recordPlan(runnerMismatchPlan, runnerMismatchTask, runnerMismatchExecutionId, runnerTelemetryId);
        const report = (0, memory_control_center_1.buildApiMicrocompactNativeApplyProofReport)({
            groupIds,
            tasks: [goodTask, missingSessionTask, runnerMismatchTask],
            nowMs: Date.parse("2026-07-08T08:10:00.000Z"),
        });
        const good = (report.groups || []).find((row) => row.groupId === goodGroupId) || {};
        const missingSession = (report.groups || []).find((row) => row.groupId === missingSessionGroupId) || {};
        const runnerMismatch = (report.groups || []).find((row) => row.groupId === runnerMismatchGroupId) || {};
        const gapText = JSON.stringify([...(missingSession.gaps || []), ...(runnerMismatch.gaps || [])]);
        const checks = {
            boundDispatchPasses: good.status === "ok"
                && Number(good.passed || 0) === 1
                && Number(good.requestTelemetryStrongCount || 0) === 1
                && Number(good.requestTelemetrySessionBoundCount || 0) === 1
                && Number(good.requestTelemetryDispatchBoundCount || 0) === 1
                && Number(good.requestTelemetryRunnerBoundCount || 0) === 1,
            missingSessionDowngrades: missingSession.status === "fail"
                && Number(missingSession.passed || 0) === 0
                && Number(missingSession.requestTelemetrySessionMismatchCount || 0) === 1
                && Number(missingSession.requestTelemetryDispatchBoundCount || 0) === 1,
            runnerMismatchDowngrades: runnerMismatch.status === "fail"
                && Number(runnerMismatch.passed || 0) === 0
                && Number(runnerMismatch.requestTelemetrySessionBoundCount || 0) === 1
                && Number(runnerMismatch.requestTelemetryDispatchUnboundCount || 0) === 1
                && Number(runnerMismatch.requestTelemetryRunnerMismatchCount || 0) === 1,
            gapsNameBindingFailures: gapText.includes("task-agent session/snapshot")
                && gapText.includes("execution/runner dispatch"),
            overallCountsBinding: Number(report.overall?.requestTelemetryStrongCount || 0) === 1
                && Number(report.overall?.requestTelemetrySessionMismatchCount || 0) === 1
                && Number(report.overall?.requestTelemetryDispatchUnboundCount || 0) === 1,
        };
        return { pass: Object.values(checks).every(Boolean), checks, report: { overall: report.overall, good, missingSession, runnerMismatch } };
    }
    finally {
        for (const taskId of taskIds) {
            try {
                const { purgeTaskAgentSessions } = require("../../tasks/agent-sessions");
                purgeTaskAgentSessions(taskId);
            }
            catch { }
        }
        for (const file of [...files, ...executionFiles]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
    }
}
function runMemoryCenterApiMicrocompactNativeApplyProofRepairWorkItemSelfTest() {
    const groupId = `memory-center-api-microcompact-native-proof-repair-work-selftest-${process.pid}-${Date.now()}`;
    const proofFile = (0, memory_control_center_1.getGroupApiMicrocompactNativeApplyProofLedgerFile)(groupId);
    const telemetryFile = (0, memory_control_center_1.getGroupApiMicrocompactNativeApplyRequestTelemetryLedgerFile)(groupId);
    const workItemsFile = (0, memory_control_center_1.getGroupCompactBoundaryReplayRepairWorkItemsFile)(groupId);
    const taskId = `task-${groupId}`;
    const nativePlan = {
        schema: "ccm-api-microcompact-native-apply-plan-v1",
        groupId,
        group_id: groupId,
        targetProject: "api",
        target_project: "api",
        apiEditPlanChecksum: "plan-repair-work",
        api_edit_plan_checksum: "plan-repair-work",
        applyPlanChecksum: "apply-repair-work",
        apply_plan_checksum: "apply-repair-work",
        requestPatchChecksum: "request-repair-work",
        request_patch_checksum: "request-repair-work",
        taskAgentSessionId: "tas-repair-work-missing",
        task_agent_session_id: "tas-repair-work-missing",
        nativeSessionId: "native-repair-work-missing",
        native_session_id: "native-repair-work-missing",
        memoryContextSnapshotId: "snapshot-repair-work-missing",
        memory_context_snapshot_id: "snapshot-repair-work-missing",
        memoryContextSnapshotChecksum: "snapshot-checksum-repair-work-missing",
        memory_context_snapshot_checksum: "snapshot-checksum-repair-work-missing",
        nativeApplyReady: true,
        mode: "native_api_context_management",
        requestPatch: {
            body: { context_management: { edits: [{ type: "clear_tool_uses_20250919", keep: { type: "tool_use_id", value: "tool-repair-work" } }] } },
            beta_headers: ["context-management-2025-06-27"],
        },
    };
    const receiptRows = [{
            agent: "api",
            status: "done",
            api_microcompact: {
                required: true,
                pass: true,
                rows: [{
                        plan_checksum: nativePlan.apiEditPlanChecksum,
                        usage_state: "native_applied",
                        native_applied: true,
                        native_apply_ready: true,
                        apply_plan_checksum: nativePlan.applyPlanChecksum,
                        request_patch_checksum: nativePlan.requestPatchChecksum,
                        receipt_apply_plan_checksum: nativePlan.applyPlanChecksum,
                        receipt_request_patch_checksum: nativePlan.requestPatchChecksum,
                        apply_plan_checksum_matched: true,
                        request_patch_checksum_matched: true,
                        session_binding_required: true,
                        session_matched: true,
                        expected_task_agent_session_id: nativePlan.task_agent_session_id,
                        receipt_task_agent_session_id: nativePlan.task_agent_session_id,
                        expected_native_session_id: nativePlan.native_session_id,
                        receipt_native_session_id: nativePlan.native_session_id,
                        expected_memory_context_snapshot_id: nativePlan.memory_context_snapshot_id,
                        receipt_memory_context_snapshot_id: nativePlan.memory_context_snapshot_id,
                        expected_memory_context_snapshot_checksum: nativePlan.memory_context_snapshot_checksum,
                        receipt_memory_context_snapshot_checksum: nativePlan.memory_context_snapshot_checksum,
                        unsafe_native_applied: false,
                        pass: true,
                        reason: "native proof repair work item selftest",
                    }],
            },
        }];
    try {
        const { recordGroupApiMicrocompactNativeApplyProofLedger, recordGroupApiMicrocompactNativeApplyAdapterTelemetry, } = require("../collaboration/memory");
        recordGroupApiMicrocompactNativeApplyAdapterTelemetry({
            groupId,
            targetProject: "api",
            taskId,
            executionId: "execution-repair-work-missing",
            runnerRequestId: "runner-repair-work-missing",
            apiMicrocompactNativeApplyPlan: nativePlan,
            requestPatch: nativePlan.requestPatch,
            requestBody: {
                model: "claude-selftest",
                messages: [{ role: "user", content: "native proof repair work item selftest" }],
                context_management: nativePlan.requestPatch.body.context_management,
            },
            headers: { "anthropic-beta": "context-management-2025-06-27" },
            provider: "anthropic",
            model: "claude-selftest",
            endpoint: "https://api.anthropic.com/v1/messages",
            method: "POST",
            responseStatus: 200,
            requestId: "req-repair-work-missing",
            sentAt: "2026-07-08T08:02:30.000Z",
        });
        recordGroupApiMicrocompactNativeApplyProofLedger(groupId, {
            targetProject: "api",
            taskId,
            executionId: "execution-repair-work-missing",
            runnerRequestId: "runner-repair-work-missing",
            finalStatus: "done",
            receiptRows,
            generatedAt: "2026-07-08T08:03:00.000Z",
        });
        const proofReport = (0, memory_control_center_1.buildApiMicrocompactNativeApplyProofReport)({
            groupIds: [groupId],
            tasks: [],
            nowMs: Date.parse("2026-07-08T08:10:00.000Z"),
        });
        const proof = (proofReport.groups || [])[0] || {};
        const first = (0, memory_control_center_1.syncApiMicrocompactNativeApplyProofRepairWorkItems)(groupId, proof, { at: "2026-07-08T08:11:00.000Z" });
        const duplicate = (0, memory_control_center_1.syncApiMicrocompactNativeApplyProofRepairWorkItems)(groupId, proof, { at: "2026-07-08T08:12:00.000Z" });
        const workItemReport = (0, memory_control_center_1.buildApiMicrocompactNativeApplyProofRepairWorkItemReport)({
            groupIds: [groupId],
            tasks: [],
            nowMs: Date.parse("2026-07-08T08:10:00.000Z"),
            generatedAt: "2026-07-08T08:13:00.000Z",
        });
        const quality = (0, memory_control_center_1.evaluateApiMicrocompactNativeApplyProofRepairWorkItems)({
            groupIds: [groupId],
            tasks: [],
            nowMs: Date.parse("2026-07-08T08:10:00.000Z"),
            generatedAt: "2026-07-08T08:14:00.000Z",
        });
        const rendered = (() => {
            try {
                const { renderGroupMemoryContextBundle } = require("../collaboration/memory");
                return renderGroupMemoryContextBundle({
                    schema: "ccm-group-memory-context-v1",
                    target_project: "api",
                    memory_policy: { use: "must_consider" },
                    group_state: { goal: "native proof repair work item selftest", currentPhase: "test" },
                    compaction: { replayRepairWorkItems: first },
                });
            }
            catch (error) {
                return String(error?.message || error);
            }
        })();
        const resolved = (0, memory_control_center_1.syncApiMicrocompactNativeApplyProofRepairWorkItems)(groupId, {
            ...proof,
            status: "ok",
            score: 100,
            checked: 1,
            passed: 1,
            gaps: [],
            requestTelemetryStrongCount: 1,
        }, { at: "2026-07-08T08:15:00.000Z" });
        const ledger = (0, memory_control_center_1.readGroupCompactBoundaryReplayRepairWorkItems)(groupId);
        const nativeItems = (ledger.items || []).filter((item) => item.source === "api_microcompact_native_apply_binding_repair");
        const checks = {
            proofProducesBindingGaps: proof.status === "fail"
                && Number(proof.requestTelemetrySessionMismatchCount || 0) === 1
                && Number(proof.requestTelemetryDispatchUnboundCount || 0) === 1,
            firstMaterializesNativeProofRepairItems: first.openItemCount >= 2
                && first.items?.some((item) => item.source === "api_microcompact_native_apply_binding_repair" && item.component === "api_microcompact_native_session_binding")
                && first.items?.some((item) => item.source === "api_microcompact_native_apply_binding_repair" && item.component === "api_microcompact_native_dispatch_binding"),
            duplicateDoesNotAppend: duplicate.total === first.total,
            qualityCoversRepairItems: workItemReport.overall?.status === "ok"
                && Number(workItemReport.overall?.requiredActionCount || 0) >= 2
                && quality.id === "api_microcompact_native_apply_proof_repair_work_items"
                && Number(quality.passed || 0) === 1,
            childAgentRendererMentionsRepairItems: rendered.includes("Replay Repair pending work")
                && rendered.includes("api_microcompact_native")
                && rendered.includes("runner-repair-work-missing"),
            resolvedProofClosesOpenNativeItems: resolved.openItemCount === 0
                && nativeItems.length >= 2
                && nativeItems.every((item) => (0, memory_control_center_1.replayRepairWorkItemStatus)(item.status) === "completed"),
        };
        return { pass: Object.values(checks).every(Boolean), checks, first, resolved, report: workItemReport.overall };
    }
    finally {
        for (const file of [proofFile, `${proofFile}.bak`, telemetryFile, `${telemetryFile}.bak`, workItemsFile, `${workItemsFile}.bak`]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
    }
}
function runMemoryCenterApiMicrocompactNativeApplyProofRepairDispatchCandidateSelfTest() {
    const groupId = `memory-center-api-microcompact-native-proof-repair-dispatch-selftest-${process.pid}-${Date.now()}`;
    const proofFile = (0, memory_control_center_1.getGroupApiMicrocompactNativeApplyProofLedgerFile)(groupId);
    const telemetryFile = (0, memory_control_center_1.getGroupApiMicrocompactNativeApplyRequestTelemetryLedgerFile)(groupId);
    const workItemsFile = (0, memory_control_center_1.getGroupCompactBoundaryReplayRepairWorkItemsFile)(groupId);
    const taskId = `task-${groupId}`;
    const nativePlan = {
        schema: "ccm-api-microcompact-native-apply-plan-v1",
        groupId,
        group_id: groupId,
        targetProject: "api",
        target_project: "api",
        apiEditPlanChecksum: "plan-repair-dispatch",
        api_edit_plan_checksum: "plan-repair-dispatch",
        applyPlanChecksum: "apply-repair-dispatch",
        apply_plan_checksum: "apply-repair-dispatch",
        requestPatchChecksum: "request-repair-dispatch",
        request_patch_checksum: "request-repair-dispatch",
        taskAgentSessionId: "tas-repair-dispatch-missing",
        task_agent_session_id: "tas-repair-dispatch-missing",
        nativeSessionId: "native-repair-dispatch-missing",
        native_session_id: "native-repair-dispatch-missing",
        memoryContextSnapshotId: "snapshot-repair-dispatch-missing",
        memory_context_snapshot_id: "snapshot-repair-dispatch-missing",
        memoryContextSnapshotChecksum: "snapshot-checksum-repair-dispatch-missing",
        memory_context_snapshot_checksum: "snapshot-checksum-repair-dispatch-missing",
        nativeApplyReady: true,
        mode: "native_api_context_management",
        requestPatch: {
            body: { context_management: { edits: [{ type: "clear_tool_uses_20250919", keep: { type: "tool_use_id", value: "tool-repair-dispatch" } }] } },
            beta_headers: ["context-management-2025-06-27"],
        },
    };
    const receiptRows = [{
            agent: "api",
            status: "done",
            api_microcompact: {
                required: true,
                pass: true,
                rows: [{
                        plan_checksum: nativePlan.apiEditPlanChecksum,
                        usage_state: "native_applied",
                        native_applied: true,
                        native_apply_ready: true,
                        apply_plan_checksum: nativePlan.applyPlanChecksum,
                        request_patch_checksum: nativePlan.requestPatchChecksum,
                        receipt_apply_plan_checksum: nativePlan.applyPlanChecksum,
                        receipt_request_patch_checksum: nativePlan.requestPatchChecksum,
                        apply_plan_checksum_matched: true,
                        request_patch_checksum_matched: true,
                        session_binding_required: true,
                        session_matched: true,
                        expected_task_agent_session_id: nativePlan.task_agent_session_id,
                        receipt_task_agent_session_id: nativePlan.task_agent_session_id,
                        expected_native_session_id: nativePlan.native_session_id,
                        receipt_native_session_id: nativePlan.native_session_id,
                        expected_memory_context_snapshot_id: nativePlan.memory_context_snapshot_id,
                        receipt_memory_context_snapshot_id: nativePlan.memory_context_snapshot_id,
                        expected_memory_context_snapshot_checksum: nativePlan.memory_context_snapshot_checksum,
                        receipt_memory_context_snapshot_checksum: nativePlan.memory_context_snapshot_checksum,
                        unsafe_native_applied: false,
                        pass: true,
                        reason: "native proof repair dispatch candidate selftest",
                    }],
            },
        }];
    try {
        const { recordGroupApiMicrocompactNativeApplyProofLedger, recordGroupApiMicrocompactNativeApplyAdapterTelemetry, } = require("../collaboration/memory");
        recordGroupApiMicrocompactNativeApplyAdapterTelemetry({
            groupId,
            targetProject: "api",
            taskId,
            executionId: "execution-repair-dispatch-missing",
            runnerRequestId: "runner-repair-dispatch-missing",
            apiMicrocompactNativeApplyPlan: nativePlan,
            requestPatch: nativePlan.requestPatch,
            requestBody: {
                model: "claude-selftest",
                messages: [{ role: "user", content: "native proof repair dispatch candidate selftest" }],
                context_management: nativePlan.requestPatch.body.context_management,
            },
            headers: { "anthropic-beta": "context-management-2025-06-27" },
            provider: "anthropic",
            model: "claude-selftest",
            endpoint: "https://api.anthropic.com/v1/messages",
            method: "POST",
            responseStatus: 200,
            requestId: "req-repair-dispatch-missing",
            sentAt: "2026-07-08T08:22:30.000Z",
        });
        recordGroupApiMicrocompactNativeApplyProofLedger(groupId, {
            targetProject: "api",
            taskId,
            executionId: "execution-repair-dispatch-missing",
            runnerRequestId: "runner-repair-dispatch-missing",
            finalStatus: "done",
            receiptRows,
            generatedAt: "2026-07-08T08:23:00.000Z",
        });
        const proofReport = (0, memory_control_center_1.buildApiMicrocompactNativeApplyProofReport)({
            groupIds: [groupId],
            tasks: [],
            nowMs: Date.parse("2026-07-08T08:30:00.000Z"),
        });
        const proof = (proofReport.groups || [])[0] || {};
        const repairSummary = (0, memory_control_center_1.syncApiMicrocompactNativeApplyProofRepairWorkItems)(groupId, proof, { at: "2026-07-08T08:31:00.000Z" });
        const candidates = (0, memory_control_center_1.buildReplayRepairMainAgentDispatchCandidates)(groupId, { limit: 20 });
        const nativeCandidates = (candidates.candidates || []).filter((candidate) => candidate.source === "api_microcompact_native_apply_binding_repair");
        const firstCandidate = nativeCandidates[0] || {};
        const candidateReport = (0, memory_control_center_1.buildApiMicrocompactNativeApplyProofRepairDispatchCandidateReport)({
            groupIds: [groupId],
            tasks: [],
            nowMs: Date.parse("2026-07-08T08:30:00.000Z"),
            generatedAt: "2026-07-08T08:32:00.000Z",
        });
        const quality = (0, memory_control_center_1.evaluateApiMicrocompactNativeApplyProofRepairDispatchCandidates)({
            groupIds: [groupId],
            tasks: [],
            nowMs: Date.parse("2026-07-08T08:30:00.000Z"),
            generatedAt: "2026-07-08T08:33:00.000Z",
        });
        const rendered = (() => {
            try {
                const { renderGroupMemoryContextBundle } = require("../collaboration/memory");
                return renderGroupMemoryContextBundle({
                    schema: "ccm-group-memory-context-v1",
                    target_project: "api",
                    memory_policy: { use: "must_consider" },
                    group_state: { goal: "native proof repair dispatch candidate selftest", currentPhase: "test" },
                    compaction: {
                        replayRepairWorkItems: repairSummary,
                        replayRepairDispatchCandidates: candidates,
                    },
                });
            }
            catch (error) {
                return String(error?.message || error);
            }
        })();
        const resolved = (0, memory_control_center_1.syncApiMicrocompactNativeApplyProofRepairWorkItems)(groupId, {
            ...proof,
            status: "ok",
            score: 100,
            checked: 1,
            passed: 1,
            gaps: [],
            requestTelemetryStrongCount: 1,
        }, { at: "2026-07-08T08:34:00.000Z" });
        const resolvedCandidates = (0, memory_control_center_1.buildReplayRepairMainAgentDispatchCandidates)(groupId, { limit: 20 });
        const checks = {
            proofProducesNativeRepairItems: proof.status === "fail"
                && repairSummary.openItemCount >= 2
                && repairSummary.items?.some((item) => item.source === "api_microcompact_native_apply_binding_repair" && item.component === "api_microcompact_native_session_binding")
                && repairSummary.items?.some((item) => item.source === "api_microcompact_native_apply_binding_repair" && item.component === "api_microcompact_native_dispatch_binding"),
            nativeRepairItemsBecomeDispatchCandidates: candidates.schema === "ccm-replay-repair-main-agent-dispatch-candidates-v1"
                && nativeCandidates.length >= 2
                && nativeCandidates.every((candidate) => candidate.shouldCreateRealTask === false)
                && nativeCandidates.some((candidate) => candidate.request_patch_checksum === nativePlan.requestPatchChecksum)
                && nativeCandidates.some((candidate) => candidate.runner_request_id === "runner-repair-dispatch-missing"),
            nativeCandidateCarriesProofTelemetry: !!firstCandidate.proof_entry_id
                && firstCandidate.request_patch_checksum === nativePlan.requestPatchChecksum
                && firstCandidate.request_telemetry_source === "native_request_adapter"
                && !!firstCandidate.request_telemetry_session_status
                && !!firstCandidate.request_telemetry_dispatch_status
                && firstCandidate.runner_request_id === "runner-repair-dispatch-missing",
            nativeDispatchCandidateQualityPasses: candidateReport.overall?.status === "ok"
                && Number(candidateReport.overall?.expectedCandidateCount || 0) >= 2
                && Number(candidateReport.overall?.metadataGapCount || 0) === 0
                && quality.id === "api_microcompact_native_apply_proof_repair_dispatch_candidates"
                && Number(quality.passed || 0) === 1,
            childAgentRendererMentionsNativeCandidateTelemetry: rendered.includes("Main Agent replay repair dispatch candidates")
                && rendered.includes("request-repair-dispatch")
                && rendered.includes("session=")
                && rendered.includes("dispatch=")
                && rendered.includes("runner-repair-dispatch-missing"),
            resolvedProofRemovesNativeCandidates: resolved.openItemCount === 0
                && !((resolvedCandidates.candidates || []).some((candidate) => candidate.source === "api_microcompact_native_apply_binding_repair")),
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            report: candidateReport.overall,
            candidate: {
                work_item_id: firstCandidate.work_item_id || "",
                proof_entry_id: firstCandidate.proof_entry_id || "",
                request_patch_checksum: firstCandidate.request_patch_checksum || "",
                request_telemetry_session_status: firstCandidate.request_telemetry_session_status || "",
                request_telemetry_dispatch_status: firstCandidate.request_telemetry_dispatch_status || "",
                runner_request_id: firstCandidate.runner_request_id || "",
            },
        };
    }
    finally {
        for (const file of [proofFile, `${proofFile}.bak`, telemetryFile, `${telemetryFile}.bak`, workItemsFile, `${workItemsFile}.bak`]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
    }
}
function runMemoryCenterApiMicrocompactNativeApplyProofRepairDispatchBriefSelfTest() {
    const groupId = `memory-center-api-microcompact-native-proof-repair-brief-selftest-${process.pid}-${Date.now()}`;
    const proofFile = (0, memory_control_center_1.getGroupApiMicrocompactNativeApplyProofLedgerFile)(groupId);
    const telemetryFile = (0, memory_control_center_1.getGroupApiMicrocompactNativeApplyRequestTelemetryLedgerFile)(groupId);
    const workItemsFile = (0, memory_control_center_1.getGroupCompactBoundaryReplayRepairWorkItemsFile)(groupId);
    const dispatchPlanFile = (0, memory_control_center_1.getGroupReplayRepairDispatchPlanLedgerFile)(groupId);
    const typedDir = path.join(memory_control_center_1.GROUP_TYPED_MEMORY_MD_DIR, (0, memory_control_center_1.sidecarFileId)(groupId));
    const taskId = `task-${groupId}`;
    const nativePlan = {
        schema: "ccm-api-microcompact-native-apply-plan-v1",
        groupId,
        group_id: groupId,
        targetProject: "api",
        target_project: "api",
        apiEditPlanChecksum: "plan-repair-brief",
        api_edit_plan_checksum: "plan-repair-brief",
        applyPlanChecksum: "apply-repair-brief",
        apply_plan_checksum: "apply-repair-brief",
        requestPatchChecksum: "request-repair-brief",
        request_patch_checksum: "request-repair-brief",
        taskAgentSessionId: "tas-repair-brief-missing",
        task_agent_session_id: "tas-repair-brief-missing",
        nativeSessionId: "native-repair-brief-missing",
        native_session_id: "native-repair-brief-missing",
        memoryContextSnapshotId: "snapshot-repair-brief-missing",
        memory_context_snapshot_id: "snapshot-repair-brief-missing",
        memoryContextSnapshotChecksum: "snapshot-checksum-repair-brief-missing",
        memory_context_snapshot_checksum: "snapshot-checksum-repair-brief-missing",
        nativeApplyReady: true,
        mode: "native_api_context_management",
        requestPatch: {
            body: { context_management: { edits: [{ type: "clear_tool_uses_20250919", keep: { type: "tool_use_id", value: "tool-repair-brief" } }] } },
            beta_headers: ["context-management-2025-06-27"],
        },
    };
    const receiptRows = [{
            agent: "api",
            status: "done",
            api_microcompact: {
                required: true,
                pass: true,
                rows: [{
                        plan_checksum: nativePlan.apiEditPlanChecksum,
                        usage_state: "native_applied",
                        native_applied: true,
                        native_apply_ready: true,
                        apply_plan_checksum: nativePlan.applyPlanChecksum,
                        request_patch_checksum: nativePlan.requestPatchChecksum,
                        receipt_apply_plan_checksum: nativePlan.applyPlanChecksum,
                        receipt_request_patch_checksum: nativePlan.requestPatchChecksum,
                        apply_plan_checksum_matched: true,
                        request_patch_checksum_matched: true,
                        session_binding_required: true,
                        session_matched: true,
                        expected_task_agent_session_id: nativePlan.task_agent_session_id,
                        receipt_task_agent_session_id: nativePlan.task_agent_session_id,
                        expected_native_session_id: nativePlan.native_session_id,
                        receipt_native_session_id: nativePlan.native_session_id,
                        expected_memory_context_snapshot_id: nativePlan.memory_context_snapshot_id,
                        receipt_memory_context_snapshot_id: nativePlan.memory_context_snapshot_id,
                        expected_memory_context_snapshot_checksum: nativePlan.memory_context_snapshot_checksum,
                        receipt_memory_context_snapshot_checksum: nativePlan.memory_context_snapshot_checksum,
                        unsafe_native_applied: false,
                        pass: true,
                        reason: "native proof repair dispatch brief selftest",
                    }],
            },
        }];
    try {
        const { recordGroupApiMicrocompactNativeApplyProofLedger, recordGroupApiMicrocompactNativeApplyAdapterTelemetry, } = require("../collaboration/memory");
        recordGroupApiMicrocompactNativeApplyAdapterTelemetry({
            groupId,
            targetProject: "api",
            taskId,
            executionId: "execution-repair-brief-missing",
            runnerRequestId: "runner-repair-brief-missing",
            apiMicrocompactNativeApplyPlan: nativePlan,
            requestPatch: nativePlan.requestPatch,
            requestBody: {
                model: "claude-selftest",
                messages: [{ role: "user", content: "native proof repair dispatch brief selftest" }],
                context_management: nativePlan.requestPatch.body.context_management,
            },
            headers: { "anthropic-beta": "context-management-2025-06-27" },
            provider: "anthropic",
            model: "claude-selftest",
            endpoint: "https://api.anthropic.com/v1/messages",
            method: "POST",
            responseStatus: 200,
            requestId: "req-repair-brief-missing",
            sentAt: "2026-07-08T08:42:30.000Z",
        });
        recordGroupApiMicrocompactNativeApplyProofLedger(groupId, {
            targetProject: "api",
            taskId,
            executionId: "execution-repair-brief-missing",
            runnerRequestId: "runner-repair-brief-missing",
            finalStatus: "done",
            receiptRows,
            generatedAt: "2026-07-08T08:43:00.000Z",
        });
        const proofReport = (0, memory_control_center_1.buildApiMicrocompactNativeApplyProofReport)({
            groupIds: [groupId],
            tasks: [],
            nowMs: Date.parse("2026-07-08T08:50:00.000Z"),
        });
        const proof = (proofReport.groups || [])[0] || {};
        (0, memory_control_center_1.syncApiMicrocompactNativeApplyProofRepairWorkItems)(groupId, proof, { at: "2026-07-08T08:51:00.000Z" });
        const candidateReport = (0, memory_control_center_1.buildApiMicrocompactNativeApplyProofRepairDispatchCandidateReport)({
            groupIds: [groupId],
            tasks: [],
            nowMs: Date.parse("2026-07-08T08:50:00.000Z"),
            generatedAt: "2026-07-08T08:52:00.000Z",
        });
        const briefReport = (0, memory_control_center_1.buildApiMicrocompactNativeApplyProofRepairDispatchBriefReport)({
            groupIds: [groupId],
            tasks: [],
            nowMs: Date.parse("2026-07-08T08:50:00.000Z"),
            generatedAt: "2026-07-08T08:53:00.000Z",
            candidateReport,
        });
        const quality = (0, memory_control_center_1.evaluateApiMicrocompactNativeApplyProofRepairDispatchBriefs)({
            groupIds: [groupId],
            tasks: [],
            nowMs: Date.parse("2026-07-08T08:50:00.000Z"),
            generatedAt: "2026-07-08T08:54:00.000Z",
            candidateReport,
        });
        const ledger = (0, memory_control_center_1.readGroupReplayRepairDispatchPlanLedger)(groupId);
        const readyBriefs = (ledger.briefs || []).filter((brief) => brief.status === "ready" && brief.source === "api_microcompact_native_apply_binding_repair");
        const firstBrief = readyBriefs[0] || {};
        const coordinatorPrompt = (() => {
            try {
                const { buildCoordinatorPrompt } = require("../collaboration/group-orchestrator");
                return buildCoordinatorPrompt({
                    group: {
                        id: groupId,
                        members: [
                            { project: "coordinator", role: "coordinator", agent: "coded-orchestrator" },
                            { project: "api", agent: "claude-code" },
                        ],
                    },
                    context: "用户要求继续修复记忆 native proof 缺口",
                    message: "继续处理记忆 native proof 修复候选",
                });
            }
            catch (error) {
                return String(error?.message || error);
            }
        })();
        const resolved = (0, memory_control_center_1.syncApiMicrocompactNativeApplyProofRepairWorkItems)(groupId, {
            ...proof,
            status: "ok",
            score: 100,
            checked: 1,
            passed: 1,
            gaps: [],
            requestTelemetryStrongCount: 1,
        }, { at: "2026-07-08T08:55:00.000Z" });
        const resolvedCandidateReport = (0, memory_control_center_1.buildApiMicrocompactNativeApplyProofRepairDispatchCandidateReport)({
            groupIds: [groupId],
            tasks: [],
            nowMs: Date.parse("2026-07-08T08:56:00.000Z"),
            generatedAt: "2026-07-08T08:56:00.000Z",
        });
        (0, memory_control_center_1.buildApiMicrocompactNativeApplyProofRepairDispatchBriefReport)({
            groupIds: [groupId],
            tasks: [],
            nowMs: Date.parse("2026-07-08T08:56:00.000Z"),
            generatedAt: "2026-07-08T08:57:00.000Z",
            candidateReport: resolvedCandidateReport,
        });
        const resolvedLedger = (0, memory_control_center_1.readGroupReplayRepairDispatchPlanLedger)(groupId);
        const resolvedReadyBriefs = (resolvedLedger.briefs || []).filter((brief) => brief.status === "ready" && brief.source === "api_microcompact_native_apply_binding_repair");
        const checks = {
            nativeCandidatesCoveredBeforeBriefs: candidateReport.overall?.status === "ok"
                && Number(candidateReport.overall?.expectedCandidateCount || 0) >= 2
                && Number(candidateReport.overall?.metadataGapCount || 0) === 0,
            dispatchBriefReportPasses: briefReport.overall?.status === "ok"
                && Number(briefReport.overall?.expectedBriefCount || 0) >= 2
                && Number(briefReport.overall?.metadataGapCount || 0) === 0
                && quality.id === "api_microcompact_native_apply_proof_repair_dispatch_briefs"
                && Number(quality.passed || 0) === 1,
            dispatchBriefLedgerPersistsNativeProof: readyBriefs.length >= 2
                && readyBriefs.every((brief) => brief.should_create_real_task === false)
                && firstBrief.request_patch_checksum === nativePlan.requestPatchChecksum
                && firstBrief.runner_request_id === "runner-repair-brief-missing"
                && !!firstBrief.proof_entry_id,
            dispatchBriefWorkerTaskIsSelfContained: String(firstBrief.worker_task || "").includes("request-repair-brief")
                && String(firstBrief.worker_task || "").includes("runner-repair-brief-missing")
                && String(firstBrief.worker_task || "").includes("CCM_AGENT_RECEIPT")
                && String(firstBrief.worker_task || "").includes("只有当前用户消息或主 Agent 明确把本简报派发给你时"),
            coordinatorPromptReceivesDispatchBrief: coordinatorPrompt.includes("群聊记忆 Replay 修复派发简报")
                && coordinatorPrompt.includes("request-repair-brief")
                && coordinatorPrompt.includes("runner-repair-brief-missing")
                && coordinatorPrompt.includes("shouldCreateRealTask=false"),
            resolvedProofSupersedesReadyBriefs: resolved.openItemCount === 0
                && resolvedReadyBriefs.length === 0
                && (resolvedLedger.briefs || []).some((brief) => brief.status === "superseded" && brief.source === "api_microcompact_native_apply_binding_repair"),
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            report: briefReport.overall,
            brief: {
                brief_id: firstBrief.brief_id || "",
                work_item_id: firstBrief.work_item_id || "",
                proof_entry_id: firstBrief.proof_entry_id || "",
                request_patch_checksum: firstBrief.request_patch_checksum || "",
                runner_request_id: firstBrief.runner_request_id || "",
            },
        };
    }
    finally {
        for (const file of [
            proofFile,
            `${proofFile}.bak`,
            telemetryFile,
            `${telemetryFile}.bak`,
            workItemsFile,
            `${workItemsFile}.bak`,
            dispatchPlanFile,
            `${dispatchPlanFile}.bak`,
        ]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
        try {
            if (fs.existsSync(typedDir))
                fs.rmSync(typedDir, { recursive: true, force: true });
        }
        catch { }
    }
}
function runMemoryCenterApiMicrocompactNativeApplyProofRepairAssignmentBindingSelfTest() {
    const groupId = `memory-center-api-microcompact-native-proof-repair-assignment-selftest-${process.pid}-${Date.now()}`;
    const dispatchPlanFile = (0, memory_control_center_1.getGroupReplayRepairDispatchPlanLedgerFile)(groupId);
    const bindingFile = (0, memory_control_center_1.getGroupReplayRepairDispatchBindingLedgerFile)(groupId);
    try {
        const { syncReplayRepairDispatchPlansForCoordinator, runCodedGroupOrchestrator, readReplayRepairDispatchBindingLedgerForCoordinator, } = require("../collaboration/group-orchestrator");
        const candidateSummary = {
            schema: "ccm-replay-repair-main-agent-dispatch-candidates-v1",
            groupId,
            file: "selftest-native-proof-repair-assignment",
            candidateCount: 1,
            openItemCount: 1,
            readyCount: 1,
            dispatchMarkedCount: 1,
            shouldCreateRealTask: false,
            candidates: [{
                    schema: "ccm-replay-repair-main-agent-dispatch-candidate-v1",
                    candidate_id: "replay-repair-dispatch:selftest-native-assignment",
                    work_item_id: "api-native-proof-repair:assignment-binding",
                    groupId,
                    status: "pending",
                    owner: "group-main-agent",
                    priority: "critical",
                    component: "api_microcompact_native_dispatch_binding",
                    source: "api_microcompact_native_apply_binding_repair",
                    subject: "修复 native apply assignment binding",
                    targetProject: "api",
                    dispatch_target: "api",
                    repair_target: "request-assignment-binding",
                    instruction: "修复 API microcompact native_applied 强证明链，并保持 request/session/dispatch/runner 绑定。",
                    expected: "nativeApplyStrongProof=true; requestTelemetrySessionBound=true; requestTelemetryDispatchBound=true; runnerRequestId=runner-assignment-binding",
                    proof_entry_id: "api_microcompact_native_apply_proof_assignment_binding",
                    plan_checksum: "plan-assignment-binding",
                    request_patch_checksum: "request-assignment-binding",
                    request_telemetry_status: "weak",
                    request_telemetry_source: "native_request_adapter",
                    request_telemetry_session_status: "missing_session",
                    request_telemetry_dispatch_status: "missing_execution",
                    runner_request_id: "runner-assignment-binding",
                    execution_id: "execution-assignment-binding",
                    recommendedAction: "main_agent_review_and_dispatch_to_child_agent",
                    shouldCreateRealTask: false,
                }],
        };
        const planLedger = syncReplayRepairDispatchPlansForCoordinator(groupId, candidateSummary, { at: "2026-07-08T09:01:00.000Z" });
        const readyBrief = (planLedger.briefs || []).find((brief) => brief.status === "ready" && brief.source === "api_microcompact_native_apply_binding_repair") || {};
        const group = {
            id: groupId,
            members: [
                { project: "coordinator", role: "coordinator", agent: "coded-orchestrator" },
                { project: "api", agent: "claude-code" },
            ],
        };
        const result = runCodedGroupOrchestrator({
            group,
            message: [
                "请让 api 项目执行 native proof replay repair。",
                `必须使用 brief ${readyBrief.brief_id}，work item ${readyBrief.work_item_id}。`,
                "修复 request-assignment-binding 和 runner-assignment-binding 的 session/dispatch 绑定，并回写 CCM_AGENT_RECEIPT。",
            ].join("\n"),
            context: "Phase 93 selftest：验证 dispatch brief 到 assignment 的绑定。",
        });
        const assignment = (result.assignments || []).find((item) => item.project === "api") || {};
        const bindingLedger = readReplayRepairDispatchBindingLedgerForCoordinator(groupId);
        const binding = (bindingLedger.entries || []).find((entry) => entry.brief_id === readyBrief.brief_id) || {};
        const report = (0, memory_control_center_1.buildApiMicrocompactNativeApplyProofRepairAssignmentBindingReport)({ groupIds: [groupId] });
        const quality = (0, memory_control_center_1.evaluateApiMicrocompactNativeApplyProofRepairAssignmentBindings)({ groupIds: [groupId] });
        const packetBrief = assignment.worker_context_packet?.replay_repair_dispatch_briefs?.[0] || {};
        const checks = {
            dispatchBriefReady: planLedger.readyCount === 1
                && readyBrief.request_patch_checksum === "request-assignment-binding"
                && readyBrief.runner_request_id === "runner-assignment-binding",
            assignmentCarriesBriefBinding: assignment.replay_repair_dispatch_brief?.brief_id === readyBrief.brief_id
                && assignment.replay_repair_dispatch_brief?.request_patch_checksum === "request-assignment-binding"
                && assignment.replay_repair_dispatch_brief?.runner_request_id === "runner-assignment-binding"
                && assignment.replay_repair_dispatch_brief?.should_create_real_task === false,
            workerContextPacketCarriesBrief: !!assignment.worker_context_packet?.packet_id
                && packetBrief.brief_id === readyBrief.brief_id
                && packetBrief.request_patch_checksum === "request-assignment-binding"
                && packetBrief.runner_request_id === "runner-assignment-binding",
            bindingLedgerPersistsAssignmentProof: binding.brief_id === readyBrief.brief_id
                && binding.assignment_id
                && binding.dispatch_key
                && binding.worker_context_packet_id === assignment.worker_context_packet?.packet_id
                && binding.proof_entry_id === "api_microcompact_native_apply_proof_assignment_binding"
                && binding.should_create_real_task === false,
            qualityCoversAssignmentBinding: report.overall?.status === "ok"
                && Number(report.overall?.bindingCount || 0) === 1
                && Number(report.overall?.metadataGapCount || 0) === 0
                && quality.id === "api_microcompact_native_apply_proof_repair_assignment_bindings"
                && Number(quality.passed || 0) === 1,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            report: report.overall,
            binding: {
                binding_id: binding.binding_id || "",
                brief_id: binding.brief_id || "",
                assignment_id: binding.assignment_id || "",
                dispatch_key: binding.dispatch_key || "",
                worker_context_packet_id: binding.worker_context_packet_id || "",
            },
        };
    }
    finally {
        for (const file of [dispatchPlanFile, `${dispatchPlanFile}.bak`, bindingFile, `${bindingFile}.bak`]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
    }
}
function runMemoryCenterWorkerContextPacketContextUsageSelfTest() {
    const groupId = `memory-center-worker-context-usage-selftest-${process.pid}-${Date.now()}`;
    const dispatchPlanFile = (0, memory_control_center_1.getGroupReplayRepairDispatchPlanLedgerFile)(groupId);
    const bindingFile = (0, memory_control_center_1.getGroupReplayRepairDispatchBindingLedgerFile)(groupId);
    try {
        const { syncReplayRepairDispatchPlansForCoordinator, runCodedGroupOrchestrator, readReplayRepairDispatchBindingLedgerForCoordinator, } = require("../collaboration/group-orchestrator");
        const candidateSummary = {
            schema: "ccm-replay-repair-main-agent-dispatch-candidates-v1",
            groupId,
            file: "selftest-worker-context-usage",
            candidateCount: 1,
            openItemCount: 1,
            readyCount: 1,
            dispatchMarkedCount: 1,
            shouldCreateRealTask: false,
            candidates: [{
                    schema: "ccm-replay-repair-main-agent-dispatch-candidate-v1",
                    candidate_id: "replay-repair-dispatch:selftest-worker-context-usage",
                    work_item_id: "api-native-proof-repair:worker-context-usage",
                    groupId,
                    status: "pending",
                    owner: "group-main-agent",
                    priority: "critical",
                    component: "worker_context_usage_budget",
                    source: "api_microcompact_native_apply_provider_reproof",
                    subject: "记录 WorkerContextPacket context usage",
                    targetProject: "api",
                    dispatch_target: "api",
                    repair_target: "request-worker-context-usage",
                    instruction: "验证 provider re-proof brief 派发时 WorkerContextPacket 携带 CC-style context usage budget。",
                    expected: "context_usage categories include replay_repair_dispatch_briefs and autocompact_buffer",
                    proof_entry_id: "api_microcompact_native_apply_proof_worker_context_usage",
                    plan_checksum: "plan-worker-context-usage",
                    request_patch_checksum: "request-worker-context-usage",
                    provider_reproof_status: "needed",
                    provider_reproof_reason: "missing_native_request_adapter_telemetry",
                    reproof_candidate_id: "candidate-worker-context-usage",
                    original_work_item_id: "original-worker-context-usage",
                    request_telemetry_status: "weak",
                    request_telemetry_source: "native_request_adapter",
                    request_telemetry_session_status: "missing_session",
                    request_telemetry_dispatch_status: "missing_execution",
                    runner_request_id: "runner-worker-context-usage",
                    execution_id: "execution-worker-context-usage",
                    recommendedAction: "main_agent_review_and_dispatch_to_child_agent",
                    shouldCreateRealTask: false,
                }],
        };
        const planLedger = syncReplayRepairDispatchPlansForCoordinator(groupId, candidateSummary, { at: "2026-07-08T12:40:00.000Z" });
        const readyBrief = (planLedger.briefs || []).find((brief) => brief.status === "ready" && brief.source === "api_microcompact_native_apply_provider_reproof") || {};
        const group = {
            id: groupId,
            members: [
                { project: "coordinator", role: "coordinator", agent: "coded-orchestrator" },
                { project: "api", agent: "claude-code" },
            ],
        };
        const result = runCodedGroupOrchestrator({
            group,
            message: [
                "请让 api 项目执行 worker context usage budget repair。",
                `必须使用 brief ${readyBrief.brief_id}，work item ${readyBrief.work_item_id}。`,
                "工作包必须带 Context usage budget，并在回执中说明使用情况。",
            ].join("\n"),
            context: "Phase 102 selftest：验证 WorkerContextPacket context usage budget ledger。",
        });
        const assignment = (result.assignments || []).find((item) => item.project === "api") || {};
        const bindingLedger = readReplayRepairDispatchBindingLedgerForCoordinator(groupId);
        const binding = (bindingLedger.entries || []).find((entry) => entry.brief_id === readyBrief.brief_id) || {};
        const usage = assignment.worker_context_packet?.context_usage || {};
        const bindingUsage = binding.worker_context_packet_context_usage || {};
        const categoryIds = new Set((usage.categories || []).map((item) => item.id));
        const report = (0, memory_control_center_1.buildWorkerContextPacketContextUsageReport)({ groupIds: [groupId] });
        const quality = (0, memory_control_center_1.evaluateWorkerContextPacketContextUsage)({ groupIds: [groupId] });
        const qualityReport = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["worker_context_packet_context_usage"],
            groupIds: [groupId],
            refresh: true,
        });
        const qualityCheck = (qualityReport.checks || []).find((item) => item.id === "worker_context_packet_context_usage") || {};
        const checks = {
            assignmentPacketCarriesUsage: usage.schema === "ccm-worker-context-usage-v1"
                && usage.packet_id === assignment.worker_context_packet?.packet_id
                && Number(usage.total_tokens || 0) > 0
                && categoryIds.has("task_goal")
                && categoryIds.has("replay_repair_dispatch_briefs")
                && categoryIds.has("autocompact_buffer")
                && categoryIds.has("free_space"),
            renderedWorkerTaskShowsBudget: String(assignment.task || "").includes("Context usage budget")
                && String(assignment.task || "").includes("Autocompact buffer"),
            bindingPersistsUsageBudget: binding.worker_context_packet_id === assignment.worker_context_packet?.packet_id
                && bindingUsage.schema === "ccm-worker-context-usage-v1"
                && binding.worker_context_packet_render_probe?.rendered_flags?.has_context_usage_budget === true,
            reportCoversUsageBudget: report.overall?.status === "ok"
                && Number(report.overall?.packetBindingCount || 0) >= 1
                && Number(report.overall?.validUsageCount || 0) >= 1
                && Number(report.overall?.metadataGapCount || 0) === 0
                && Number(report.overall?.renderedBudgetCount || 0) >= 1,
            qualityCheckExposesUsageBudget: quality.id === "worker_context_packet_context_usage"
                && quality.status === "ok"
                && qualityCheck.status === "ok"
                && Number(qualityCheck.checked || 0) === 1
                && Number(qualityCheck.passed || 0) === 1,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            report: report.overall,
            qualityCheck: {
                id: qualityCheck.id || "",
                status: qualityCheck.status || "",
                checked: qualityCheck.checked || 0,
                passed: qualityCheck.passed || 0,
            },
            usage: {
                status: usage.status || "",
                total_tokens: usage.total_tokens || 0,
                free_tokens: usage.free_tokens || 0,
                top_categories: usage.top_categories || [],
            },
            binding: {
                binding_id: binding.binding_id || "",
                packet_id: binding.worker_context_packet_id || "",
                rendered_context_usage_budget: binding.worker_context_packet_render_probe?.rendered_flags?.has_context_usage_budget === true,
            },
        };
    }
    finally {
        for (const file of [dispatchPlanFile, `${dispatchPlanFile}.bak`, bindingFile, `${bindingFile}.bak`]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
    }
}
//# sourceMappingURL=memory-control-core-self-tests.js.map