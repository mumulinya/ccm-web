"use strict";
// Extracted functional module. The original entry remains a compatibility facade.
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
exports.runGroupClaudeMemoryExternalIncludeApprovalSelfTest = runGroupClaudeMemoryExternalIncludeApprovalSelfTest;
exports.runGroupClaudeMemorySettingSourcePolicySelfTest = runGroupClaudeMemorySettingSourcePolicySelfTest;
exports.runGroupInstructionsLoadedHookPipelineSelfTest = runGroupInstructionsLoadedHookPipelineSelfTest;
exports.runGroupTypedMemoryLogDistillationSelfTest = runGroupTypedMemoryLogDistillationSelfTest;
exports.runGroupTypedMemoryPostCompactUsageDistillationSelfTest = runGroupTypedMemoryPostCompactUsageDistillationSelfTest;
exports.runGroupTypedMemoryProviderReproofReceiptConsumptionDistillationSelfTest = runGroupTypedMemoryProviderReproofReceiptConsumptionDistillationSelfTest;
exports.runGroupTypedMemoryProviderRankingProvenanceCompactRepairReceiptConsumptionDistillationSelfTest = runGroupTypedMemoryProviderRankingProvenanceCompactRepairReceiptConsumptionDistillationSelfTest;
exports.runGroupTypedMemoryPostCompactReinjectionRepairReceiptConsumptionDistillationSelfTest = runGroupTypedMemoryPostCompactReinjectionRepairReceiptConsumptionDistillationSelfTest;
exports.runGroupTypedMemoryPostCompactCompletionMemoryPreservationRepairClosureDistillationSelfTest = runGroupTypedMemoryPostCompactCompletionMemoryPreservationRepairClosureDistillationSelfTest;
exports.runGroupTypedMemoryDistillationQualitySelfTest = runGroupTypedMemoryDistillationQualitySelfTest;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("../../core/utils");
const group_memory_index_1 = require("./group-memory-index");
function runGroupClaudeMemoryExternalIncludeApprovalSelfTest() {
    const groupId = `claude-external-include-approval-selftest-${process.pid}-${Date.now().toString(36)}`;
    const typedDir = (0, group_memory_index_1.getGroupTypedMemoryDir)(groupId);
    const root = path.join(utils_1.CCM_DIR, "tmp-claude-external-include-approval-selftest", groupId);
    const projectRoot = path.join(root, "project");
    const externalFile = path.join(root, "approved-external.md");
    try {
        fs.mkdirSync(projectRoot, { recursive: true });
        fs.writeFileSync(path.join(projectRoot, "CLAUDE.md"), [
            "# Project With External Include",
            "@../approved-external.md",
            "EXTERNAL_INCLUDE_APPROVAL_ROOT_SENTINEL: root project memory stays imported.",
        ].join("\n"), "utf-8");
        fs.writeFileSync(externalFile, [
            "# Approved External Include",
            "EXTERNAL_INCLUDE_APPROVAL_SENTINEL: approved external include reaches typed memory.",
        ].join("\n"), "utf-8");
        const first = (0, group_memory_index_1.importProjectMemoryFilesToGroupTypedMemory)(groupId, projectRoot, { project: "api" });
        const firstDocs = (0, group_memory_index_1.scanGroupTypedMemoryDocuments)(groupId);
        const firstApproval = first.includeAudit?.externalIncludeApproval || {};
        const marked = (0, group_memory_index_1.markGroupClaudeMemoryExternalIncludeWarningShown)(groupId, {
            includes: firstApproval.pendingExternalIncludes || [],
            actor: "selftest",
        });
        const afterWarning = (0, group_memory_index_1.importProjectMemoryFilesToGroupTypedMemory)(groupId, projectRoot, { project: "api" });
        const afterWarningApproval = afterWarning.includeAudit?.externalIncludeApproval || {};
        const approved = (0, group_memory_index_1.approveGroupClaudeMemoryExternalInclude)(groupId, {
            includes: firstApproval.pendingExternalIncludes || [{ path: externalFile, parent: path.join(projectRoot, "CLAUDE.md"), scope: "project", kind: "project" }],
            approvedBy: "selftest",
        });
        const second = (0, group_memory_index_1.importProjectMemoryFilesToGroupTypedMemory)(groupId, projectRoot, { project: "api" });
        const recall = (0, group_memory_index_1.buildGroupTypedMemoryRecall)(groupId, "继续 EXTERNAL_INCLUDE_APPROVAL_SENTINEL", { max: 10 });
        const secondDocs = (0, group_memory_index_1.scanGroupTypedMemoryDocuments)(groupId);
        const secondApproval = second.includeAudit?.externalIncludeApproval || {};
        const checks = {
            firstWarnsAndSkips: firstApproval.schema === "ccm-claude-memory-external-include-approval-v1"
                && firstApproval.pendingCount === 1
                && firstApproval.shouldShowWarning === true
                && (first.issues || []).some((item) => item.type === "external_include_skipped" && item.approvalRequired === true)
                && !JSON.stringify(firstDocs).includes("EXTERNAL_INCLUDE_APPROVAL_SENTINEL"),
            warningShownSuppressesRepeatPrompt: marked.hasExternalIncludesWarningShown === true
                && afterWarningApproval.pendingCount === 1
                && afterWarningApproval.shouldShowWarning === false,
            approvalLedgerPersists: approved.approved.some((item) => item.path === (0, group_memory_index_1.normalizeExternalIncludeApprovalPath)(externalFile))
                && fs.existsSync((0, group_memory_index_1.getGroupClaudeMemoryExternalIncludeApprovalLedgerFile)(groupId)),
            approvedExternalImports: secondApproval.pendingCount === 0
                && secondApproval.approvedCount === 1
                && Number(second.includeAudit?.importedIncludeCount || 0) === 1
                && JSON.stringify(secondDocs).includes("EXTERNAL_INCLUDE_APPROVAL_SENTINEL"),
            recallFindsApprovedExternalInclude: JSON.stringify(recall.recalled || []).includes("EXTERNAL_INCLUDE_APPROVAL_SENTINEL"),
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            first: { importedCount: first.importedCount, approval: firstApproval },
            second: { importedCount: second.importedCount, approval: secondApproval },
            recalled: recall.surfaced,
        };
    }
    finally {
        try {
            fs.rmSync(typedDir, { recursive: true, force: true });
        }
        catch { }
        try {
            fs.rmSync(root, { recursive: true, force: true });
        }
        catch { }
    }
}
function runGroupClaudeMemorySettingSourcePolicySelfTest() {
    const groupId = `claude-setting-source-policy-selftest-${process.pid}-${Date.now().toString(36)}`;
    const typedDir = (0, group_memory_index_1.getGroupTypedMemoryDir)(groupId);
    const root = path.join(utils_1.CCM_DIR, "tmp-claude-setting-source-policy-selftest", groupId);
    const projectRoot = path.join(root, "project");
    const userRoot = path.join(root, "user-claude");
    const managedRoot = path.join(root, "managed-claude");
    try {
        fs.mkdirSync(path.join(projectRoot, ".claude", "rules"), { recursive: true });
        fs.mkdirSync(userRoot, { recursive: true });
        fs.mkdirSync(managedRoot, { recursive: true });
        fs.writeFileSync(path.join(projectRoot, "CLAUDE.md"), "SETTING_SOURCE_PROJECT_SENTINEL: project source enabled.\n", "utf-8");
        fs.writeFileSync(path.join(projectRoot, ".claude", "rules", "rule.md"), "SETTING_SOURCE_PROJECT_RULE_SENTINEL: project rule enabled.\n", "utf-8");
        fs.writeFileSync(path.join(projectRoot, "CLAUDE.local.md"), "SETTING_SOURCE_LOCAL_SENTINEL: local source enabled.\n", "utf-8");
        fs.writeFileSync(path.join(userRoot, "CLAUDE.md"), "SETTING_SOURCE_USER_SENTINEL: user source enabled.\n", "utf-8");
        fs.writeFileSync(path.join(managedRoot, "CLAUDE.md"), "SETTING_SOURCE_MANAGED_SENTINEL: managed policy source always enabled.\n", "utf-8");
        const defaultPolicy = (0, group_memory_index_1.buildClaudeMemorySettingSourcePolicy)({});
        const isolatedPolicy = (0, group_memory_index_1.buildClaudeMemorySettingSourcePolicy)({ settingSources: "" });
        const projectDiscovery = (0, group_memory_index_1.discoverProjectMemoryFiles)(projectRoot, { settingSources: "project" });
        const localDiscovery = (0, group_memory_index_1.discoverProjectMemoryFiles)(projectRoot, { settingSources: "local" });
        const isolatedProjectDiscovery = (0, group_memory_index_1.discoverProjectMemoryFiles)(projectRoot, { settingSources: "" });
        const isolatedGlobal = (0, group_memory_index_1.importGlobalClaudeMemoryToGroupTypedMemory)(groupId, { userRoot, managedRoot, settingSources: "" });
        const isolatedRecall = (0, group_memory_index_1.buildGroupTypedMemoryRecall)(groupId, "SETTING_SOURCE_MANAGED_SENTINEL SETTING_SOURCE_USER_SENTINEL", { max: 10 });
        const docs = (0, group_memory_index_1.scanGroupTypedMemoryDocuments)(groupId);
        const checks = {
            defaultEnablesEditableAndAlwaysOn: defaultPolicy.includeUser === true
                && defaultPolicy.includeProject === true
                && defaultPolicy.includeLocal === true
                && defaultPolicy.includeManaged === true
                && defaultPolicy.includeFlagSettings === true,
            emptySettingSourcesEnterIsolationButKeepManaged: isolatedPolicy.isolationMode === true
                && isolatedPolicy.includeUser === false
                && isolatedPolicy.includeProject === false
                && isolatedPolicy.includeLocal === false
                && isolatedPolicy.includeManaged === true,
            projectOnlySkipsLocal: projectDiscovery.settingSourcePolicy?.enabled?.includes("projectSettings")
                && projectDiscovery.discoveredCount === 2
                && projectDiscovery.files.some((item) => item.relPath === "CLAUDE.md")
                && projectDiscovery.files.some((item) => item.relPath === ".claude/rules/rule.md")
                && !projectDiscovery.files.some((item) => item.relPath === "CLAUDE.local.md"),
            localOnlySkipsProject: localDiscovery.discoveredCount === 1
                && localDiscovery.files.some((item) => item.relPath === "CLAUDE.local.md")
                && !localDiscovery.files.some((item) => item.relPath === "CLAUDE.md"),
            isolatedProjectSkipsProjectAndLocal: isolatedProjectDiscovery.discoveredCount === 0
                && isolatedProjectDiscovery.settingSourcePolicy?.isolationMode === true,
            isolatedGlobalImportsManagedOnly: isolatedGlobal.settingSourcePolicy?.isolationMode === true
                && isolatedGlobal.includeUser === false
                && isolatedGlobal.includeManaged === true
                && isolatedGlobal.importedCount === 1
                && JSON.stringify(docs).includes("SETTING_SOURCE_MANAGED_SENTINEL")
                && !JSON.stringify(docs).includes("SETTING_SOURCE_USER_SENTINEL"),
            recallFindsManagedButNotUser: JSON.stringify(isolatedRecall.recalled || []).includes("SETTING_SOURCE_MANAGED_SENTINEL")
                && !JSON.stringify(isolatedRecall.recalled || []).includes("SETTING_SOURCE_USER_SENTINEL"),
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            defaultPolicy,
            isolatedPolicy,
            projectDiscovery: { discoveredCount: projectDiscovery.discoveredCount, files: projectDiscovery.files.map((item) => item.relPath) },
            isolatedGlobal: { importedCount: isolatedGlobal.importedCount, includeUser: isolatedGlobal.includeUser, includeManaged: isolatedGlobal.includeManaged },
        };
    }
    finally {
        try {
            fs.rmSync(typedDir, { recursive: true, force: true });
        }
        catch { }
        try {
            fs.rmSync(root, { recursive: true, force: true });
        }
        catch { }
    }
}
function runGroupInstructionsLoadedHookPipelineSelfTest() {
    const groupId = `instructions-loaded-hook-selftest-${process.pid}-${Date.now().toString(36)}`;
    const typedDir = (0, group_memory_index_1.getGroupTypedMemoryDir)(groupId);
    const projectRoot = path.join(utils_1.CCM_DIR, "tmp-instructions-loaded-hook-selftest", groupId);
    const seen = [];
    const unregisterGood = (0, group_memory_index_1.registerGroupMemoryInstructionsLoadedHook)((input) => {
        seen.push({ ...input });
        return { observed: input.file_path, reason: input.load_reason };
    });
    const unregisterFailing = (0, group_memory_index_1.registerGroupMemoryInstructionsLoadedHook)(() => {
        throw new Error("INSTRUCTIONS_LOADED_HOOK_FAILURE_SENTINEL");
    });
    try {
        fs.mkdirSync(path.join(projectRoot, "docs"), { recursive: true });
        fs.writeFileSync(path.join(projectRoot, "CLAUDE.md"), [
            "# Hook Project Memory",
            "@./docs/hook-include.md",
            "INSTRUCTIONS_LOADED_HOOK_ROOT_SENTINEL: root memory imported.",
        ].join("\n"), "utf-8");
        fs.writeFileSync(path.join(projectRoot, "docs", "hook-include.md"), [
            "# Hook Include",
            "INSTRUCTIONS_LOADED_HOOK_INCLUDE_SENTINEL: include memory imported.",
        ].join("\n"), "utf-8");
        const imported = (0, group_memory_index_1.importProjectMemoryFilesToGroupTypedMemory)(groupId, projectRoot, {
            project: "api",
            instructionsLoadReason: "session_start",
        });
        const hookSummary = imported.instructionsLoadedHooks || {};
        const ledger = (0, group_memory_index_1.loadGroupClaudeInstructionsLoadedHookLedger)(groupId);
        const recall = (0, group_memory_index_1.buildGroupTypedMemoryRecall)(groupId, "INSTRUCTIONS_LOADED_HOOK_INCLUDE_SENTINEL", { max: 10 });
        const renderedPlan = (0, group_memory_index_1.renderGroupTypedMemoryLoadPlan)((0, group_memory_index_1.buildGroupTypedMemoryLoadPlan)(groupId, {}));
        const checks = {
            hooksRegistered: (0, group_memory_index_1.hasGroupMemoryInstructionsLoadedHook)() === true,
            hookSummaryRecordsEvents: hookSummary.schema === "ccm-claude-instructions-loaded-hook-import-summary-v1"
                && hookSummary.eventCount === 2
                && hookSummary.firedCount === 4
                && hookSummary.failureCount === 2
                && fs.existsSync(hookSummary.ledgerFile),
            goodHookSawTopLevelAndInclude: seen.length === 2
                && seen.some(item => item.memory_type === "Project" && item.load_reason === "session_start" && String(item.file_path || "").endsWith("CLAUDE.md"))
                && seen.some(item => item.memory_type === "Project" && item.load_reason === "include" && String(item.parent_file_path || "").endsWith("CLAUDE.md")),
            ledgerPersistsRows: Array.isArray(ledger.entries)
                && ledger.entries.length >= 2
                && ledger.entries.every((entry) => Array.isArray(entry.rows) && entry.rows.length === 2)
                && JSON.stringify(ledger.entries).includes("INSTRUCTIONS_LOADED_HOOK_FAILURE_SENTINEL"),
            importContinuesAfterHookFailure: imported.importedCount === 2
                && JSON.stringify(recall.recalled || []).includes("INSTRUCTIONS_LOADED_HOOK_INCLUDE_SENTINEL"),
            typedLoadPlanStillWorks: renderedPlan.includes("类型化 MEMORY.md 加载计划"),
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            hookSummary: { eventCount: hookSummary.eventCount, firedCount: hookSummary.firedCount, failureCount: hookSummary.failureCount },
            seen: seen.map(item => ({ memory_type: item.memory_type, load_reason: item.load_reason, parent_file_path: item.parent_file_path })),
        };
    }
    finally {
        unregisterGood();
        unregisterFailing();
        try {
            fs.rmSync(typedDir, { recursive: true, force: true });
        }
        catch { }
        try {
            fs.rmSync(projectRoot, { recursive: true, force: true });
        }
        catch { }
    }
}
function runGroupTypedMemoryLogDistillationSelfTest() {
    const groupId = `typed-memory-distill-selftest-${process.pid}-${Date.now().toString(36)}`;
    const dir = (0, group_memory_index_1.getGroupTypedMemoryDir)(groupId);
    const messages = [
        {
            id: "ld-u0",
            role: "user",
            target: "coordinator",
            content: "必须长期记住 LOG_DISTILL_SENTINEL_20260707，支付回调不能跳过验签。",
        },
        {
            id: "ld-a1",
            role: "assistant",
            agent: "coordinator",
            dispatchPolicy: { action: "delegate", reason: "使用 api-agent 修改 src/pay.ts 并运行 npm run check" },
            assignments: [{ project: "api", task: "实现支付回调验签" }],
            content: "未来所有支付任务采用反直觉的 webhook idempotency key 策略，因为历史重复回调事故曾导致重复入账。",
            memoryAdmission: {
                nonObvious: true,
                futureApplicable: true,
                why: "历史重复回调事故曾导致重复入账。",
                howToApply: "未来支付回调设计先检查稳定幂等键，再核验当前实现。",
            },
        },
        {
            id: "ld-a2",
            role: "assistant",
            agent: "api-agent",
            task_id: "ld-task",
            content: "以后必须防止这个反复失败：npm run check failed 的根因是签名测试误用了生产时钟，因为固定时钟在多次回归中才暴露。Skill:typescript-audit",
            receipt: { status: "failed", taskId: "ld-task", verification: ["npm run check failed"] },
            memoryAdmission: {
                nonObvious: true,
                futureApplicable: true,
                why: "固定时钟在多次回归中才暴露签名边界。",
                howToApply: "未来签名测试先使用可控时钟并核验当前实现。",
            },
        },
        {
            id: "ld-a3",
            role: "assistant",
            agent: "api-agent",
            task_id: "ld-task",
            content: "修复 src/pay.ts 后 npm run check passed。",
            receipt: { status: "done", taskId: "ld-task", summary: "支付回调验签修复", verification: ["npm run check passed"] },
        },
        {
            id: "ld-a4",
            role: "assistant",
            agent: "coordinator",
            content: "Grafana https://grafana.internal/d/payments 用于查看支付回调延迟，排查请求链路时从这个仪表盘进入。",
        },
    ];
    const originalMessages = JSON.stringify(messages);
    try {
        const first = (0, group_memory_index_1.distillGroupMessagesToTypedMemory)(groupId, messages, { goal: "日志蒸馏自测" }, { reason: "selftest" });
        const second = (0, group_memory_index_1.distillGroupMessagesToTypedMemory)(groupId, messages, { goal: "日志蒸馏自测" }, { reason: "selftest-repeat" });
        const recall = (0, group_memory_index_1.buildGroupTypedMemoryRecall)(groupId, "LOG_DISTILL_SENTINEL_20260707 重复回调 固定时钟 Grafana", { disableLedger: true, max: 8 });
        const ledger = (0, group_memory_index_1.readGroupTypedMemoryDistillationLedger)(groupId);
        const indexText = fs.readFileSync((0, group_memory_index_1.getGroupTypedMemoryIndexFile)(groupId), "utf-8");
        const docs = (0, group_memory_index_1.scanGroupTypedMemoryDocuments)(groupId);
        const rendered = (0, group_memory_index_1.renderGroupTypedMemoryRecall)(recall);
        const checks = {
            distillationCreatedFacts: first.newFactCount >= 4 && first.writeCount >= 4,
            repeatDoesNotAddDuplicates: second.skipped === true
                && second.reason === "no_new_messages_after_committed_cursor"
                && second.newFactCount === 0
                && second.updatedFactCount === 0,
            qualityReportRecorded: first.quality?.schema === "ccm-group-typed-memory-distillation-quality-v1"
                && typeof first.quality.score === "number",
            ledgerPersistsFacts: Object.values(ledger.facts || {}).some((bucket) => Object.keys(bucket || {}).length > 0),
            fourTypedDocsCreated: docs.some(item => item.relPath === "distilled-log-user-requirements.md")
                && docs.some(item => item.relPath === "distilled-log-project-context.md")
                && docs.some(item => item.relPath === "distilled-log-feedback-failures.md")
                && docs.some(item => item.relPath === "distilled-log-reference-artifacts.md"),
            indexLinksDistilledDocs: indexText.includes("distilled-log-user-requirements.md") && indexText.includes("distilled-log-reference-artifacts.md"),
            recallFindsDurableAndNonObviousFacts: JSON.stringify(recall.recalled).includes("LOG_DISTILL_SENTINEL_20260707")
                && JSON.stringify(recall.recalled).includes("重复回调")
                && JSON.stringify(recall.recalled).includes("Grafana"),
            activityNoiseRejected: !JSON.stringify(ledger.facts || {}).includes("completed_work")
                && !JSON.stringify(ledger.facts || {}).includes("assignment")
                && !JSON.stringify(ledger.facts || {}).includes("npm run check passed")
                && Number(ledger.admission?.rejectedThisRun || 0) > 0,
            renderedMentionsDistilledMemory: rendered.includes("类型化长期记忆") && rendered.includes("Distilled"),
            rawTranscriptUntouched: JSON.stringify(messages) === originalMessages,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            first: { newFactCount: first.newFactCount, writeCount: first.writeCount },
            second: { newFactCount: second.newFactCount, updatedFactCount: second.updatedFactCount },
            recalled: recall.recalled.map((item) => item.relPath),
        };
    }
    finally {
        try {
            fs.rmSync(dir, { recursive: true, force: true });
        }
        catch { }
    }
}
function runGroupTypedMemoryPostCompactUsageDistillationSelfTest() {
    const groupId = `typed-memory-post-compact-usage-distill-selftest-${process.pid}-${Date.now().toString(36)}`;
    const dir = (0, group_memory_index_1.getGroupTypedMemoryDir)(groupId);
    const usage = {
        ignored_candidates: [{
                candidate_id: "pcrc_stale_recovered",
                value: "src/stale-recovered.ts",
                recommendation: "deprioritize_or_distill",
                ignored_count: 4,
                used_count: 0,
                verified_count: 0,
            }],
        missing_usage_candidates: [{
                candidate_id: "pcrc_missing_usage",
                value: "npm run stale-check",
                recommendation: "require_usage_receipt",
                mentioned_count: 2,
            }],
    };
    const messages = [{
            id: "pcud-u0",
            role: "user",
            target: "coordinator",
            content: "必须长期保留 USAGE_DISTILLATION_SENTINEL，但旧恢复候选 src/stale-recovered.ts 已经被多次忽略。",
        }];
    try {
        const distillation = (0, group_memory_index_1.distillGroupMessagesToTypedMemory)(groupId, messages, { goal: "usage distillation selftest" }, {
            reason: "post-compact-usage-distillation-selftest",
            postCompactCandidateUsage: usage,
        });
        const ledger = (0, group_memory_index_1.readGroupTypedMemoryDistillationLedger)(groupId);
        const docs = (0, group_memory_index_1.scanGroupTypedMemoryDocuments)(groupId);
        const archive = docs.find(item => item.relPath === "post-compact-candidate-usage-archive.md");
        const archiveText = archive ? fs.readFileSync(archive.file, "utf-8") : "";
        const recall = (0, group_memory_index_1.buildGroupTypedMemoryRecall)(groupId, "src/stale-recovered.ts stale recovered candidate", {
            max: 8,
            postCompactCandidateUsage: usage,
        });
        const checks = {
            archiveDocWritten: !!archive
                && archiveText.includes("Post-Compact Candidate Usage Archive")
                && archiveText.includes("src/stale-recovered.ts")
                && archiveText.includes("npm run stale-check"),
            distillationReportsArchive: distillation.postCompactUsageArchive?.archived_count === 2
                && distillation.writes?.some((item) => item.slug === "post-compact-candidate-usage-archive"),
            ledgerPersistsArchive: ledger.postCompactUsageArchive?.archived_count === 2
                && JSON.stringify(ledger.postCompactUsageArchive?.rows || []).includes("pcrc_stale_recovered"),
            recallDeprioritizesArchive: recall.diagnostics?.some((item) => item.relPath === "post-compact-candidate-usage-archive.md"
                && Number(item.postCompactUsage?.adjustment || 0) < 0),
            recallScoringCountsArchive: recall.postCompactUsageScoring?.hint_count === 2
                && recall.postCompactUsageScoring?.deprioritized_count >= 1,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            archive: distillation.postCompactUsageArchive,
            recalled: recall.recalled.map((item) => ({ relPath: item.relPath, score: item.score, postCompactUsage: item.postCompactUsage })),
        };
    }
    finally {
        try {
            fs.rmSync(dir, { recursive: true, force: true });
        }
        catch { }
    }
}
function runGroupTypedMemoryProviderReproofReceiptConsumptionDistillationSelfTest() {
    const groupId = `typed-memory-provider-reproof-receipt-consumption-selftest-${process.pid}-${Date.now().toString(36)}`;
    const dir = (0, group_memory_index_1.getGroupTypedMemoryDir)(groupId);
    const rows = [
        {
            groupId,
            timeline_binding_id: "timeline-provider-reproof-consumption-used",
            brief_id: "brief-provider-reproof-consumption-used",
            work_item_id: "work-provider-reproof-consumption-used",
            source: "api_microcompact_native_apply_provider_reproof",
            project: "api",
            task_id: "task-provider-reproof-consumption-used",
            receipt_status: "done",
            replay_repair_consumption_status: "used",
            replay_repair_consumption_source: "receipt.replayRepairDispatchBriefUsage",
            replay_repair_consumption_reason: "PROVIDER_REPROOF_CONSUMPTION_USED_SENTINEL 使用 WorkerContextPacket provider re-proof brief 定位 request-provider-reproof-consumption-used。",
            provider_reproof_status: "needed",
            provider_reproof_reason: "missing_native_request_adapter_telemetry",
            request_patch_checksum: "request-provider-reproof-consumption-used",
            runner_request_id: "runner-provider-reproof-consumption-used",
            task_agent_session_id: "tas-provider-reproof-consumption-used",
            memory_context_snapshot_id: "snapshot-provider-reproof-consumption-used",
            execution_id: "execution-provider-reproof-consumption-used",
        },
        {
            groupId,
            timeline_binding_id: "timeline-provider-reproof-consumption-strong",
            brief_id: "brief-provider-reproof-consumption-strong",
            work_item_id: "work-provider-reproof-consumption-strong",
            source: "api_microcompact_native_apply_provider_reproof",
            project: "api",
            task_id: "task-provider-reproof-consumption-strong",
            receipt_status: "done",
            replay_repair_consumption_status: "strong",
            replay_repair_consumption_source: "receipt.replayRepairDispatchBriefUsage",
            replay_repair_consumption_reason: "PROVIDER_REPROOF_CONSUMPTION_STRONG_CLAIM_SENTINEL 子 Agent 声称 strong，但仍需 native provider proof ledger。",
            provider_reproof_status: "needed",
            provider_reproof_reason: "missing_native_request_adapter_telemetry",
            request_patch_checksum: "request-provider-reproof-consumption-strong",
            runner_request_id: "runner-provider-reproof-consumption-strong",
        },
        {
            groupId,
            timeline_binding_id: "timeline-provider-reproof-consumption-ignored",
            brief_id: "brief-provider-reproof-consumption-ignored",
            work_item_id: "work-provider-reproof-consumption-ignored",
            source: "api_microcompact_native_apply_provider_reproof",
            project: "api",
            task_id: "task-provider-reproof-consumption-ignored",
            receipt_status: "done",
            replay_repair_consumption_status: "ignored",
            replay_repair_consumption_source: "receipt.replayRepairDispatchBriefUsage",
            replay_repair_consumption_reason: "PROVIDER_REPROOF_CONSUMPTION_IGNORED_SENTINEL stale provider re-proof brief 被子 Agent 忽略。",
            provider_reproof_status: "needed",
            provider_reproof_reason: "superseded_candidate",
            request_patch_checksum: "request-provider-reproof-consumption-ignored",
            runner_request_id: "runner-provider-reproof-consumption-ignored",
        },
    ];
    try {
        const first = (0, group_memory_index_1.distillProviderReproofReceiptConsumptionToTypedMemory)(groupId, { rows }, {
            reason: "provider-reproof-receipt-consumption-selftest",
            updatedAt: "2026-07-08T12:00:00.000Z",
        });
        const second = (0, group_memory_index_1.distillProviderReproofReceiptConsumptionToTypedMemory)(groupId, { rows }, {
            reason: "provider-reproof-receipt-consumption-selftest-repeat",
            updatedAt: "2026-07-08T12:01:00.000Z",
        });
        const ledger = (0, group_memory_index_1.readGroupTypedMemoryDistillationLedger)(groupId);
        const docs = (0, group_memory_index_1.scanGroupTypedMemoryDocuments)(groupId);
        const indexText = fs.readFileSync((0, group_memory_index_1.getGroupTypedMemoryIndexFile)(groupId), "utf-8");
        const recall = (0, group_memory_index_1.buildGroupTypedMemoryRecall)(groupId, "PROVIDER_REPROOF_CONSUMPTION_USED_SENTINEL request-provider-reproof-consumption-used", { disableLedger: true, forceMemory: true, max: 8 });
        const cautionRecall = (0, group_memory_index_1.buildGroupTypedMemoryRecall)(groupId, "PROVIDER_REPROOF_CONSUMPTION_IGNORED_SENTINEL request-provider-reproof-consumption-ignored", { disableLedger: true, forceMemory: true, max: 8 });
        const recallText = JSON.stringify(recall.recalled || []);
        const cautionText = JSON.stringify(cautionRecall.recalled || []);
        const archiveRows = ledger.providerReproofReceiptConsumptionArchive?.rows || [];
        const checks = {
            archiveCountsRows: first.archivedCount === 3
                && first.promotedCount === 2
                && first.cautionCount === 1
                && first.strongReceiptClaimCount === 1,
            repeatDoesNotDuplicateRows: second.archivedCount === 3 && second.newRowCount === 0,
            ledgerPersistsArchive: ledger.providerReproofReceiptConsumptionArchive?.archived_count === 3
                && archiveRows.some((row) => row.strong_receipt_claim_only === true),
            typedDocsWritten: docs.some(item => item.relPath === "provider-reproof-receipt-consumption-recall.md" && item.type === "reference")
                && docs.some(item => item.relPath === "provider-reproof-receipt-consumption-cautions.md" && item.type === "feedback"),
            indexLinksProviderDocs: indexText.includes("provider-reproof-receipt-consumption-recall.md")
                && indexText.includes("provider-reproof-receipt-consumption-cautions.md"),
            promotedRecallFindsUsedRow: recallText.includes("PROVIDER_REPROOF_CONSUMPTION_USED_SENTINEL")
                && recallText.includes("request-provider-reproof-consumption-used"),
            cautionRecallIsFeedbackMemory: cautionRecall.recalled.some((item) => item.relPath === "provider-reproof-receipt-consumption-cautions.md" && item.type === "feedback")
                && cautionText.includes("PROVIDER_REPROOF_CONSUMPTION_IGNORED_SENTINEL"),
            strongClaimWarnsNotNativeProof: fs.readFileSync(path.join(dir, "provider-reproof-receipt-consumption-recall.md"), "utf-8")
                .includes("receipt strong is a consumption claim only"),
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            first: {
                archivedCount: first.archivedCount,
                promotedCount: first.promotedCount,
                cautionCount: first.cautionCount,
                strongReceiptClaimCount: first.strongReceiptClaimCount,
            },
            second: { archivedCount: second.archivedCount, newRowCount: second.newRowCount, updatedRowCount: second.updatedRowCount },
            recalled: recall.recalled.map((item) => item.relPath),
            cautionRecalled: cautionRecall.recalled.map((item) => `${item.type}:${item.relPath}`),
        };
    }
    finally {
        try {
            fs.rmSync(dir, { recursive: true, force: true });
        }
        catch { }
    }
}
function runGroupTypedMemoryProviderRankingProvenanceCompactRepairReceiptConsumptionDistillationSelfTest() {
    const groupId = `typed-memory-provider-ranking-compact-repair-receipt-selftest-${process.pid}-${Date.now().toString(36)}`;
    const dir = (0, group_memory_index_1.getGroupTypedMemoryDir)(groupId);
    const row = {
        groupId,
        timeline_binding_id: "timeline-provider-ranking-compact-repair-receipt",
        brief_id: "brief-provider-ranking-compact-repair-receipt",
        work_item_id: "work-provider-ranking-compact-repair-receipt",
        source: "worker_context_provider_ranking_provenance_compact_repair",
        project: "api",
        task_id: "task-provider-ranking-compact-repair-receipt",
        receipt_status: "completed",
        replay_repair_consumption_status: "verified",
        replay_repair_consumption_source: "receipt.replayRepairDispatchBriefUsage",
        replay_repair_consumption_reason: "PROVIDER_RANKING_COMPACT_REPAIR_RECEIPT_SENTINEL verified provider ranking compact repair consumed typed MEMORY.md row provider-switch-execution:phase165-typed-memory.",
        provider_switch_decision_receipt_id: "provider-switch-decision:phase165-typed-memory",
        provider_switch_decision_receipt_checksum: "provider-switch-receipt-checksum-phase165",
        provider_ranking_provenance_rel_paths: ["provider-switch-execution-memory.md"],
        provider_ranking_provenance_row_ids: ["provider-switch-execution:phase165-typed-memory"],
        provider_ranking_provenance_preserved: true,
        provider_ranking_provenance_receipt_consumption_verified: true,
        provider_ranking_provenance_repair_status: "completed",
        provider_ranking_provenance_repair_gap_type: "provider_ranking_provenance_compact",
        worker_context_packet_id: "wcp-provider-ranking-compact-repair-receipt",
        task_agent_session_id: "tas-provider-ranking-compact-repair-receipt",
        memory_context_snapshot_id: "snapshot-provider-ranking-compact-repair-receipt",
        execution_id: "execution-provider-ranking-compact-repair-receipt",
    };
    try {
        const first = (0, group_memory_index_1.distillProviderRankingProvenanceCompactRepairReceiptConsumptionToTypedMemory)(groupId, { rows: [row] }, {
            reason: "provider-ranking-compact-repair-receipt-consumption-selftest",
            updatedAt: "2026-07-10T17:40:00.000Z",
        });
        const second = (0, group_memory_index_1.distillProviderRankingProvenanceCompactRepairReceiptConsumptionToTypedMemory)(groupId, { rows: [row] }, {
            reason: "provider-ranking-compact-repair-receipt-consumption-selftest-repeat",
            updatedAt: "2026-07-10T17:41:00.000Z",
        });
        const ledger = (0, group_memory_index_1.readGroupTypedMemoryDistillationLedger)(groupId);
        const docs = (0, group_memory_index_1.scanGroupTypedMemoryDocuments)(groupId);
        const docFile = path.join(dir, "provider-ranking-provenance-compact-repair-receipt-memory.md");
        const docText = fs.readFileSync(docFile, "utf-8");
        const indexText = fs.readFileSync((0, group_memory_index_1.getGroupTypedMemoryIndexFile)(groupId), "utf-8");
        const recall = (0, group_memory_index_1.buildGroupTypedMemoryRecall)(groupId, "PROVIDER_RANKING_COMPACT_REPAIR_RECEIPT_SENTINEL provider-switch-execution:phase165-typed-memory provider-switch-decision:phase165-typed-memory", {
            disableLedger: true,
            forceMemory: true,
            max: 8,
        });
        const recallText = JSON.stringify(recall.recalled || []);
        const archiveRows = ledger.providerRankingProvenanceCompactRepairReceiptConsumptionArchive?.rows || [];
        const checks = {
            archiveCountsVerifiedReceipt: first.archivedCount === 1
                && first.verifiedCount === 1
                && first.preservedCount === 1
                && first.relPathCount === 1
                && first.rowIdCount === 1,
            repeatDoesNotDuplicateRows: second.archivedCount === 1 && second.newRowCount === 0,
            ledgerPersistsArchive: ledger.providerRankingProvenanceCompactRepairReceiptConsumptionArchive?.archived_count === 1
                && archiveRows.some((item) => item.provider_switch_decision_receipt_id === "provider-switch-decision:phase165-typed-memory"),
            typedDocWritten: docs.some(item => item.relPath === "provider-ranking-provenance-compact-repair-receipt-memory.md" && item.type === "reference")
                && docText.includes("PROVIDER_RANKING_COMPACT_REPAIR_RECEIPT_SENTINEL")
                && docText.includes("provider-switch-execution:phase165-typed-memory"),
            indexLinksTypedDoc: indexText.includes("provider-ranking-provenance-compact-repair-receipt-memory.md"),
            recallFindsVerifiedRepair: recallText.includes("provider-ranking-provenance-compact-repair-receipt-memory.md")
                && recallText.includes("PROVIDER_RANKING_COMPACT_REPAIR_RECEIPT_SENTINEL"),
            authorizationBoundaryPreserved: /ranking evidence only, not authorization/i.test(docText)
                && /do not authorize provider switches|Never use this memory as provider-switch authority/i.test(docText),
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            first: {
                archivedCount: first.archivedCount,
                verifiedCount: first.verifiedCount,
                preservedCount: first.preservedCount,
                relPathCount: first.relPathCount,
                rowIdCount: first.rowIdCount,
            },
            second: { archivedCount: second.archivedCount, newRowCount: second.newRowCount, updatedRowCount: second.updatedRowCount },
            recalled: recall.recalled.map((item) => item.relPath),
        };
    }
    finally {
        try {
            fs.rmSync(dir, { recursive: true, force: true });
        }
        catch { }
    }
}
function runGroupTypedMemoryPostCompactReinjectionRepairReceiptConsumptionDistillationSelfTest() {
    const groupId = `typed-memory-post-compact-reinjection-repair-receipt-selftest-${process.pid}-${Date.now().toString(36)}`;
    const dir = (0, group_memory_index_1.getGroupTypedMemoryDir)(groupId);
    const row = {
        groupId,
        timeline_binding_id: "replay-repair-brief-timeline:phase179-distillation",
        brief_id: "replay-repair-dispatch-brief:phase179-distillation",
        work_item_id: "post-compact-reinjection-repair:phase179-distillation",
        source: "compact_boundary_replay_repair",
        component: "post_compact_reinject",
        project: "api",
        task_id: "task-phase179-distillation",
        assignment_id: "assignment-phase179-distillation",
        dispatch_key: "dispatch-phase179-distillation",
        reinjection_gate_id: "pcrg-phase179-distillation",
        post_compact_candidate_id: "pcrc-phase179-distillation",
        post_compact_candidate_kind: "file",
        post_compact_candidate_value: "src/phase179-distillation-memory.ts",
        post_compact_candidate_source_message_id: "message-phase179-distillation",
        post_compact_reinjection_receipt_usage_state: "verified",
        post_compact_reinjection_receipt_reason: "PHASE179_POST_COMPACT_REINJECTION_TYPED_MEMORY_SENTINEL re-read current source before accepting the recovered candidate.",
        post_compact_reinjection_current_source_verified: true,
        post_compact_reinjection_memory_receipt_matched: true,
        post_compact_reinjection_task_session_matched: true,
        post_compact_reinjection_native_session_matched: true,
        post_compact_reinjection_receipt_verified: true,
        receipt_status: "done",
        replay_repair_consumption_status: "verified",
        replay_repair_consumption_source: "receipt.replayRepairDispatchBriefUsage",
        worker_context_packet_id: "wcp-phase179-distillation",
        worker_handoff_id: "handoff-phase179-distillation",
        memory_context_snapshot_id: "snapshot-phase179-distillation",
        memory_context_snapshot_checksum: "snapshot-checksum-phase179-distillation",
        task_agent_session_id: "task-agent-session-phase179-distillation",
        native_session_id: "native-session-phase179-distillation",
        execution_id: "execution-phase179-distillation",
        event_types: ["dispatch", "child_agent_start", "worker_handoff_ready", "task_agent_memory_context_snapshot", "child_agent_receipt"],
        completion_source: "post_compact_reinjection_replay_repair_receipt_consumption",
        resolution_reason: "post_compact_reinjection_repair_receipt_verified",
        completed_at: "2026-07-10T23:20:00.000Z",
    };
    const ignoredRow = {
        ...row,
        timeline_binding_id: "replay-repair-brief-timeline:phase179-distillation-ignored",
        brief_id: "replay-repair-dispatch-brief:phase179-distillation-ignored",
        work_item_id: "post-compact-reinjection-repair:phase179-distillation-ignored",
        task_id: "task-phase179-distillation-ignored",
        assignment_id: "assignment-phase179-distillation-ignored",
        dispatch_key: "dispatch-phase179-distillation-ignored",
        reinjection_gate_id: "pcrg-phase179-distillation-ignored",
        post_compact_candidate_id: "pcrc-phase179-distillation-ignored",
        post_compact_candidate_value: "src/phase179-distillation-ignored.ts",
        post_compact_candidate_source_message_id: "message-phase179-distillation-ignored",
        post_compact_reinjection_receipt_usage_state: "ignored",
        post_compact_reinjection_receipt_reason: "PHASE179_POST_COMPACT_REINJECTION_IGNORED_SENTINEL candidate was unrelated to the bound task.",
        post_compact_reinjection_current_source_verified: false,
        worker_context_packet_id: "wcp-phase179-distillation-ignored",
        worker_handoff_id: "handoff-phase179-distillation-ignored",
        memory_context_snapshot_id: "snapshot-phase179-distillation-ignored",
        memory_context_snapshot_checksum: "snapshot-checksum-phase179-distillation-ignored",
        task_agent_session_id: "task-agent-session-phase179-distillation-ignored",
        native_session_id: "native-session-phase179-distillation-ignored",
        execution_id: "execution-phase179-distillation-ignored",
    };
    try {
        const first = (0, group_memory_index_1.distillPostCompactReinjectionRepairReceiptConsumptionToTypedMemory)(groupId, { rows: [row, ignoredRow] }, {
            reason: "post-compact-reinjection-repair-receipt-consumption-selftest",
            updatedAt: "2026-07-10T23:20:00.000Z",
        });
        const second = (0, group_memory_index_1.distillPostCompactReinjectionRepairReceiptConsumptionToTypedMemory)(groupId, { rows: [row, ignoredRow] }, {
            reason: "post-compact-reinjection-repair-receipt-consumption-selftest-repeat",
            updatedAt: "2026-07-10T23:20:00.000Z",
        });
        const ledger = (0, group_memory_index_1.readGroupTypedMemoryDistillationLedger)(groupId);
        const docs = (0, group_memory_index_1.scanGroupTypedMemoryDocuments)(groupId);
        const docFile = path.join(dir, "post-compact-reinjection-repair-receipt-memory.md");
        const docText = fs.readFileSync(docFile, "utf-8");
        const cautionFile = path.join(dir, "post-compact-reinjection-repair-receipt-cautions.md");
        const cautionText = fs.readFileSync(cautionFile, "utf-8");
        const indexText = fs.readFileSync((0, group_memory_index_1.getGroupTypedMemoryIndexFile)(groupId), "utf-8");
        const recall = (0, group_memory_index_1.buildGroupTypedMemoryRecall)(groupId, [
            "PHASE179_POST_COMPACT_REINJECTION_TYPED_MEMORY_SENTINEL",
            "pcrg-phase179-distillation",
            "pcrc-phase179-distillation",
            "native-session-phase179-distillation",
        ].join(" "), {
            disableLedger: true,
            forceMemory: true,
            max: 8,
        });
        const recallText = JSON.stringify(recall.recalled || []);
        const archive = ledger.postCompactReinjectionRepairReceiptConsumptionArchive || {};
        const archiveRows = Array.isArray(archive.rows) ? archive.rows : [];
        const checks = {
            archiveCountsVerifiedCompletion: first.archivedCount === 2
                && first.restoredCount === 1
                && first.cautionCount === 1
                && first.verifiedCount === 1
                && first.ignoredCount === 1
                && first.currentSourceVerifiedCount === 1
                && first.taskSessionCount === 2
                && first.nativeSessionCount === 2,
            repeatIsIdempotent: second.archivedCount === 2
                && second.newRowCount === 0
                && second.updatedRowCount === 2,
            ledgerPersistsExactIdentity: archive.archived_count === 2
                && archiveRows.some((item) => item.reinjection_gate_id === "pcrg-phase179-distillation"
                    && item.post_compact_candidate_id === "pcrc-phase179-distillation"
                    && item.task_agent_session_id === "task-agent-session-phase179-distillation"
                    && item.native_session_id === "native-session-phase179-distillation"),
            typedReferenceWritten: docs.some(item => item.relPath === "post-compact-reinjection-repair-receipt-memory.md" && item.type === "reference")
                && docText.includes("PHASE179_POST_COMPACT_REINJECTION_TYPED_MEMORY_SENTINEL")
                && docText.includes("post_compact_reinjection_replay_repair_receipt_consumption")
                && docText.includes("post_compact_reinjection_repair_receipt_verified"),
            ignoredCompletionStaysFeedback: docs.some(item => item.relPath === "post-compact-reinjection-repair-receipt-cautions.md" && item.type === "feedback")
                && cautionText.includes("PHASE179_POST_COMPACT_REINJECTION_IGNORED_SENTINEL")
                && cautionText.includes("[ignored]")
                && !docText.includes("PHASE179_POST_COMPACT_REINJECTION_IGNORED_SENTINEL"),
            indexLinksTypedMemory: indexText.includes("post-compact-reinjection-repair-receipt-memory.md"),
            recallFindsVerifiedCompletion: recallText.includes("post-compact-reinjection-repair-receipt-memory.md")
                && recallText.includes("PHASE179_POST_COMPACT_REINJECTION_TYPED_MEMORY_SENTINEL"),
            freshnessBoundaryPreserved: /historical repair completion is recovery evidence, not permanent repository truth/i.test(docText)
                && /Future use must reverify the current source/i.test(docText)
                && /historical repair completion is recovery evidence, not permanent repository truth/i.test(cautionText),
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            first: {
                archivedCount: first.archivedCount,
                restoredCount: first.restoredCount,
                cautionCount: first.cautionCount,
                verifiedCount: first.verifiedCount,
                ignoredCount: first.ignoredCount,
                taskSessionCount: first.taskSessionCount,
                nativeSessionCount: first.nativeSessionCount,
            },
            second: {
                archivedCount: second.archivedCount,
                newRowCount: second.newRowCount,
                updatedRowCount: second.updatedRowCount,
            },
            recalled: recall.recalled.map((item) => item.relPath),
        };
    }
    finally {
        try {
            fs.rmSync(dir, { recursive: true, force: true });
        }
        catch { }
    }
}
function runGroupTypedMemoryPostCompactCompletionMemoryPreservationRepairClosureDistillationSelfTest() {
    const suffix = `${process.pid}-${Date.now().toString(36)}`;
    const groupId = `typed-memory-completion-preservation-closure-${suffix}`;
    const otherGroupId = `${groupId}-other`;
    const dir = (0, group_memory_index_1.getGroupTypedMemoryDir)(groupId);
    const otherDir = (0, group_memory_index_1.getGroupTypedMemoryDir)(otherGroupId);
    const item = {
        group_id: groupId,
        source: "post_compact_receipt_memory_usage_repair_completion_compaction_preservation_repair",
        component: "post_compact_receipt_memory_usage_repair_completion_compaction_preservation",
        target_project: "api",
        work_item_id: "post-compact-completion-preservation-repair:PHASE186",
        assignment_id: "phase186-assignment",
        dispatch_key: "phase186-dispatch",
        worker_context_packet_id: "phase186-failed-packet",
        binding_id: "phase186-failed-binding",
        compact_retry_id: "phase186-failed-retry",
        compact_outcome_id: "phase186-failed-outcome",
        compact_hook_run_id: "phase186-failed-hook",
        corrected_compact_retry_id: "phase186-corrected-retry",
        corrected_compact_outcome_id: "phase186-corrected-outcome",
        corrected_compact_hook_run_id: "phase186-corrected-hook",
        completion_preservation_completion_doc_rel_paths: ["post-compact-receipt-memory-usage-repair-completions.md"],
        completion_preservation_required_doc_rel_paths: ["post-compact-reinjection-repair-receipt-memory.md"],
        completion_preservation_work_item_ids: ["post-compact-receipt-memory-usage-repair:PHASE186"],
        completion_preservation_timeline_binding_ids: ["replay-repair-brief-timeline:PHASE186"],
        completion_preservation_historical_task_agent_session_ids: ["phase186-original-task-session"],
        completion_preservation_historical_native_session_ids: ["phase186-original-native-session"],
        completion_preservation_current_session_binding_id: "phase186-closure-binding",
        completion_preservation_current_task_agent_session_id: "phase186-closure-task-session",
        completion_preservation_current_native_session_id: "phase186-closure-native-session",
        completion_preservation_gap_codes: ["completion_work_item_ids_missing_after_compact"],
        status: "completed",
        completion_source: "post_compact_receipt_memory_usage_repair_completion_compaction_preservation_corrected_retry",
        resolutionReason: "completion_memory_compaction_preservation_corrected_retry_verified",
        corrected_retry_proof: {
            schema: "ccm-post-compact-receipt-memory-usage-repair-completion-compaction-preservation-repair-closure-v1",
            failed_retry_id: "phase186-failed-retry",
            failed_outcome_id: "phase186-failed-outcome",
            corrected_retry_id: "phase186-corrected-retry",
            corrected_outcome_id: "phase186-corrected-outcome",
            exact_identity_restored: true,
            current_session_boundary_restored: true,
            historical_sessions_remain_evidence_only: true,
            verified_at: "2026-07-12T06:50:00.000Z",
        },
        completedAt: "2026-07-12T06:50:00.000Z",
    };
    try {
        const first = (0, group_memory_index_1.distillPostCompactCompletionMemoryPreservationRepairClosureToTypedMemory)(groupId, { rows: [item] }, {
            reason: "phase186-distillation-selftest",
            updatedAt: "2026-07-12T06:51:00.000Z",
        });
        const second = (0, group_memory_index_1.distillPostCompactCompletionMemoryPreservationRepairClosureToTypedMemory)(groupId, { rows: [item] }, {
            reason: "phase186-distillation-selftest-repeat",
            updatedAt: "2026-07-12T06:52:00.000Z",
        });
        const crossGroup = (0, group_memory_index_1.distillPostCompactCompletionMemoryPreservationRepairClosureToTypedMemory)(otherGroupId, { rows: [item] }, {
            reason: "phase186-cross-group-isolation-selftest",
            updatedAt: "2026-07-12T06:53:00.000Z",
        });
        const ledger = (0, group_memory_index_1.readGroupTypedMemoryDistillationLedger)(groupId);
        const otherLedger = (0, group_memory_index_1.readGroupTypedMemoryDistillationLedger)(otherGroupId);
        const docFile = path.join(dir, "post-compact-completion-memory-preservation-repair-closures.md");
        const docText = fs.readFileSync(docFile, "utf-8");
        const indexText = fs.readFileSync((0, group_memory_index_1.getGroupTypedMemoryIndexFile)(groupId), "utf-8");
        const recall = (0, group_memory_index_1.buildGroupTypedMemoryRecall)(groupId, "phase186-failed-outcome phase186-corrected-outcome completion memory preservation authority boundary", {
            disableLedger: true,
            forceMemory: true,
            max: 8,
        });
        const recallText = JSON.stringify(recall.recalled || []);
        const rows = ledger.postCompactCompletionMemoryPreservationRepairClosureArchive?.rows || [];
        const otherRows = otherLedger.postCompactCompletionMemoryPreservationRepairClosureArchive?.rows || [];
        const checks = {
            archiveStoresVerifiedClosure: first.archivedCount === 1
                && first.verifiedCount === 1
                && first.failedOutcomeCount === 1
                && first.correctedOutcomeCount === 1,
            repeatIsIdempotent: second.archivedCount === 1 && second.newRowCount === 0 && second.updatedRowCount === 1,
            ledgerKeepsExactIdentity: rows.length === 1
                && rows[0].failed_outcome_id === "phase186-failed-outcome"
                && rows[0].corrected_outcome_id === "phase186-corrected-outcome"
                && rows[0].completion_work_item_ids.includes("post-compact-receipt-memory-usage-repair:PHASE186")
                && rows[0].completion_timeline_binding_ids.includes("replay-repair-brief-timeline:PHASE186"),
            typedDocAndIndexWritten: fs.existsSync(docFile)
                && indexText.includes("post-compact-completion-memory-preservation-repair-closures.md")
                && docText.includes("phase186-failed-outcome")
                && docText.includes("phase186-corrected-outcome"),
            freshnessAndAuthorityBoundaryPersisted: /historical repair completion is recovery evidence, not permanent repository truth/i.test(docText)
                && /never authorize that future session|Never use this history as current repository truth/i.test(docText)
                && /current-source|current source/i.test(docText),
            recallFindsClosure: recallText.includes("post-compact-completion-memory-preservation-repair-closures.md")
                && recallText.includes("phase186-corrected-outcome"),
            crossGroupIsolation: crossGroup.archivedCount === 0 && otherRows.length === 0,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            first: { archivedCount: first.archivedCount, verifiedCount: first.verifiedCount, newRowCount: first.newRowCount },
            second: { archivedCount: second.archivedCount, newRowCount: second.newRowCount, updatedRowCount: second.updatedRowCount },
            crossGroup: { archivedCount: crossGroup.archivedCount },
            recalled: (recall.recalled || []).map((row) => row.relPath),
        };
    }
    finally {
        for (const target of [dir, otherDir]) {
            try {
                fs.rmSync(target, { recursive: true, force: true });
            }
            catch { }
        }
    }
}
function runGroupTypedMemoryDistillationQualitySelfTest() {
    const groupId = `typed-memory-quality-selftest-${process.pid}-${Date.now().toString(36)}`;
    const dir = (0, group_memory_index_1.getGroupTypedMemoryDir)(groupId);
    const missingPath = "src/missing-distillation-quality.ts";
    const messages = [
        {
            id: "dq-u0",
            role: "user",
            target: "coordinator",
            content: "必须长期保留 DISTILL_QUALITY_SENTINEL_20260707，并核验 package.json 与 src/missing-distillation-quality.ts。",
        },
        {
            id: "dq-a1",
            role: "assistant",
            agent: "quality-agent",
            task_id: "quality-task",
            content: "完成 quality-task，已查看 package.json。",
            receipt: { status: "done", taskId: "quality-task", summary: "完成 package.json 检查" },
        },
        {
            id: "dq-a2",
            role: "assistant",
            agent: "quality-agent",
            task_id: "quality-task",
            content: `执行失败：quality-task blocked，${missingPath} 不存在，需要继续修复。`,
            receipt: { status: "failed", taskId: "quality-task", summary: "missing path" },
        },
    ];
    try {
        const distillation = (0, group_memory_index_1.distillGroupMessagesToTypedMemory)(groupId, messages, {}, { reason: "quality-selftest", projectRoot: process.cwd() });
        const ledger = (0, group_memory_index_1.readGroupTypedMemoryDistillationLedger)(groupId);
        const quality = distillation.quality || {};
        const fileCheck = (quality.checks || []).find((check) => check.id === "file_path_claims_checked") || {};
        const contradictionCheck = (quality.checks || []).find((check) => check.id === "no_unresolved_status_contradictions") || {};
        const sourceCheck = (quality.checks || []).find((check) => check.id === "source_message_links_preserved") || {};
        const checks = {
            qualityReportCreated: quality.schema === "ccm-group-typed-memory-distillation-quality-v1",
            qualityStoredInLedger: ledger.quality?.schema === "ccm-group-typed-memory-distillation-quality-v1",
            stalePathDetected: quality.stalePathCount > 0 && fileCheck.pass === false && JSON.stringify(fileCheck.gaps || []).includes(missingPath),
            existingPathNotFlagged: !JSON.stringify(fileCheck.gaps || []).includes("package.json ->"),
            taskActivityRejectedBeforeContradiction: quality.contradictionCount === 0 && contradictionCheck.pass === true
                && Number(ledger.admission?.rejectedThisRun || 0) > 0,
            sourceLinksPreserved: sourceCheck.pass === true,
            writeAdmissionPasses: (quality.checks || []).some((check) => check.id === "long_term_write_admission" && check.pass === true),
            qualityKeepsStalePathAsCurrentSourceWarning: quality.status === "pass" && quality.score < 100 && quality.stalePathCount > 0,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            quality: {
                score: quality.score,
                status: quality.status,
                stalePathCount: quality.stalePathCount,
                contradictionCount: quality.contradictionCount,
            },
        };
    }
    finally {
        try {
            fs.rmSync(dir, { recursive: true, force: true });
        }
        catch { }
    }
}
//# sourceMappingURL=group-memory-distillation-self-tests.js.map