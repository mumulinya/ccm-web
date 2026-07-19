"use strict";
// Behavior-freeze split from collaboration-memory-gates-part-02.ts (part 2/2).
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
exports.typedMemoryPressureRecallDocRefs = typedMemoryPressureRecallDocRefs;
exports.collectReceiptMemoryProvenanceUsageRows = collectReceiptMemoryProvenanceUsageRows;
exports.pressureRecallUsageStateFromReceipt = pressureRecallUsageStateFromReceipt;
exports.collectTaskTypedMemoryPressureRecallUsageRows = collectTaskTypedMemoryPressureRecallUsageRows;
exports.normalizeGlobalMemoryUsageState = normalizeGlobalMemoryUsageState;
exports.globalMemoryUsageSnippet = globalMemoryUsageSnippet;
exports.collectReceiptGlobalMemoryUsageRows = collectReceiptGlobalMemoryUsageRows;
exports.evaluateReceiptGlobalMemoryUsageGate = evaluateReceiptGlobalMemoryUsageGate;
exports.evaluateReceiptGlobalMemoryHealthGate = evaluateReceiptGlobalMemoryHealthGate;
exports.buildMemoryGateVisibleSummary = buildMemoryGateVisibleSummary;
exports.buildGlobalMemoryReceiptVisibleSummary = buildGlobalMemoryReceiptVisibleSummary;
exports.buildGlobalMemoryHealthGateVisibleSummary = buildGlobalMemoryHealthGateVisibleSummary;
exports.buildReadPlanRevalidationGateVisibleSummary = buildReadPlanRevalidationGateVisibleSummary;
// Behavior-freeze split from collaboration-memory-gates.ts (part 2/3).
/** Task memory gate collection, receipt evaluation, and visible summaries. Behavior-preserving extraction from the collaboration facade. */
const collaboration_1 = require("./collaboration");
const path = __importStar(require("path"));
const memory_1 = require("./memory");
const collaboration_memory_gates_part_01_1 = require("./collaboration-memory-gates-part-01");
const collaboration_memory_gates_part_02_part_01_1 = require("./collaboration-memory-gates-part-02-part-01");
function typedMemoryPressureRecallDocRefs(doc = {}) {
    return (0, collaboration_1.uniqueStrings)([
        doc.rel_path,
        doc.relPath,
        doc.name,
        doc.rel_path ? path.basename(String(doc.rel_path)) : "",
    ].filter(Boolean)).slice(0, 8);
}
function collectReceiptMemoryProvenanceUsageRows(receipt = {}) {
    const rows = Array.isArray(receipt.memoryProvenanceUsage || receipt.memory_provenance_usage)
        ? (receipt.memoryProvenanceUsage || receipt.memory_provenance_usage)
        : [];
    return rows.map((row) => ({
        rel_path: String(row.relPath || row.rel_path || row.memoryRelPath || row.memory_rel_path || row.path || "").trim(),
        name: String(row.name || row.memoryName || row.memory_name || row.title || "").trim(),
        usage_state: (0, collaboration_memory_gates_part_02_part_01_1.normalizeTypedMemoryPressureUsageState)(row.usageState || row.usage_state || row.status || row.state || ""),
        provenance_status: String(row.provenanceStatus || row.provenance_status || row.trustState || row.trust_state || "").trim().toLowerCase(),
        repair_work_item_id: String(row.repairWorkItemId || row.repair_work_item_id || row.workItemId || row.work_item_id || "").trim(),
        repair_status: String(row.repairStatus || row.repair_status || "").trim().toLowerCase(),
        repair_gap_type: String(row.repairGapType || row.repair_gap_type || row.gapType || row.gap_type || "").trim(),
        current_source_verified: row.currentSourceVerified === true || row.current_source_verified === true || row.verified === true,
        reason: (0, memory_1.compactMemoryText)(row.reason || row.note || row.evidence || "", 500),
    })).filter((row) => row.rel_path || row.name || row.usage_state || row.provenance_status || row.repair_work_item_id || row.reason).slice(0, 80);
}
function pressureRecallUsageStateFromReceipt(doc = {}, receipt = {}) {
    const structuredRows = collectReceiptMemoryProvenanceUsageRows(receipt);
    const usedText = (Array.isArray(receipt.memoryUsed || receipt.memory_used) ? (receipt.memoryUsed || receipt.memory_used) : []).map((item) => String(item || "")).join("\n");
    const ignoredText = (Array.isArray(receipt.memoryIgnored || receipt.memory_ignored) ? (receipt.memoryIgnored || receipt.memory_ignored) : []).map((item) => String(item || "")).join("\n");
    const allText = [usedText, ignoredText, receipt.summary, ...(Array.isArray(receipt.verification) ? receipt.verification : [])].map((item) => String(item || "")).join("\n");
    const refs = typedMemoryPressureRecallDocRefs(doc);
    const hasRef = (source) => refs.some(ref => source.toLowerCase().includes(String(ref || "").toLowerCase()));
    const structured = structuredRows.find((row) => {
        const rowRefs = typedMemoryPressureRecallDocRefs(row);
        return rowRefs.some(rowRef => refs.some(ref => String(ref || "").toLowerCase() === String(rowRef || "").toLowerCase()));
    });
    if (structured?.usage_state) {
        const usageState = structured.current_source_verified && structured.usage_state === "used" ? "verified" : structured.usage_state;
        return {
            usage_state: ["used", "verified", "ignored", "mentioned"].includes(usageState) ? usageState : "mentioned",
            referenced: true,
            direct_reference: !!(structured.rel_path || structured.name),
            provenance_status: structured.provenance_status || "",
            repair_status: structured.repair_status || "",
            repair_work_item_id: structured.repair_work_item_id || "",
            repair_gap_type: structured.repair_gap_type || "",
            current_source_verified: structured.current_source_verified === true,
            reason: structured.reason || "memoryProvenanceUsage cites pressure typed memory",
        };
    }
    const usedRef = hasRef(usedText);
    const ignoredRef = hasRef(ignoredText);
    const allPressureUsed = /pressure recall|上下文压力召回|typed memory.*pressure|压力.*typed/i.test(usedText);
    const allPressureIgnored = /pressure recall|上下文压力召回|typed memory.*pressure|压力.*typed/i.test(ignoredText);
    if (ignoredRef || allPressureIgnored) {
        return {
            usage_state: "ignored",
            referenced: ignoredRef || allPressureIgnored,
            direct_reference: ignoredRef,
            reason: ignoredRef ? "memoryIgnored cites pressure typed memory" : "memoryIgnored cites pressure recall generically",
        };
    }
    if (usedRef || allPressureUsed) {
        const localText = usedRef ? usedText : allText;
        const verified = /verified|validated|checked|current source|re-read|当前源|当前文件|最新源|重读|核验|验证|检查/.test(localText);
        return {
            usage_state: verified ? "verified" : "used",
            referenced: usedRef || allPressureUsed,
            direct_reference: usedRef,
            reason: usedRef ? "memoryUsed cites pressure typed memory" : "memoryUsed cites pressure recall generically",
        };
    }
    return {
        usage_state: "mentioned",
        referenced: false,
        direct_reference: false,
        reason: "pressure typed memory surfaced but receipt did not cite relPath/name",
    };
}
function collectTaskTypedMemoryPressureRecallUsageRows(task = {}, receipts = [], context = {}) {
    const docs = (0, collaboration_memory_gates_part_01_1.collectTaskTypedMemoryPressureRecallDocs)(task, context);
    if (!docs.length || !Array.isArray(receipts) || !receipts.length)
        return [];
    return receipts.flatMap((receipt) => {
        const agent = (0, collaboration_memory_gates_part_01_1.normalizeMemoryGateAgent)(receipt.agent || receipt.project || task?.target_project);
        const matchingDocs = docs.filter((doc) => {
            const target = (0, collaboration_memory_gates_part_01_1.normalizeMemoryGateAgent)(doc.target_project);
            return !target || !agent || target === agent;
        });
        return matchingDocs.map((doc) => {
            const usage = pressureRecallUsageStateFromReceipt(doc, receipt);
            return {
                ...doc,
                agent: receipt.agent || receipt.project || doc.target_project || "",
                task_id: task?.id || "",
                execution_id: receipt.execution_id || receipt.executionId || context.execution?.id || context.execution?.execution_id || "",
                worker_context_packet_id: receipt.worker_context_packet_id || receipt.workerContextPacketId || "",
                memory_context_snapshot_id: receipt.memory_context_snapshot_id || receipt.memoryContextSnapshotId || "",
                receipt_status: receipt.status || "",
                usage_state: usage.usage_state,
                referenced: usage.referenced,
                direct_reference: usage.direct_reference,
                provenance_status: usage.provenance_status || "",
                repair_status: usage.repair_status || "",
                repair_work_item_id: usage.repair_work_item_id || "",
                repair_gap_type: usage.repair_gap_type || "",
                current_source_verified: usage.current_source_verified === true,
                reason: usage.reason,
            };
        });
    }).slice(0, 160);
}
function normalizeGlobalMemoryUsageState(value) {
    const text = String(value || "").trim().toLowerCase();
    if (/background|background_only|背景|仅作背景/.test(text))
        return "background";
    if (/ignored|ignore|skip|unused|not_used|未使用|不使用|忽略|跳过/.test(text))
        return "ignored";
    if (/verified|validated|checked|current_source_verified|核验|验证|已检查|当前源/.test(text))
        return "verified";
    if (/advisory|advice|参考|提示/.test(text))
        return "advisory";
    if (/used|use|applied|referenced|consumed|使用|采用|应用|引用|参考/.test(text))
        return "used";
    return text;
}
function globalMemoryUsageSnippet(text, id) {
    const source = String(text || "");
    const index = source.toLowerCase().indexOf(String(id || "").toLowerCase());
    if (index < 0)
        return "";
    return source.slice(Math.max(0, index - 90), Math.min(source.length, index + String(id || "").length + 150));
}
function collectReceiptGlobalMemoryUsageRows(receipt = {}) {
    const rows = Array.isArray(receipt.globalMemoryUsage || receipt.global_memory_usage)
        ? (receipt.globalMemoryUsage || receipt.global_memory_usage)
        : [];
    return rows.map((row) => ({
        global_memory_id: String(row.globalMemoryId || row.global_memory_id || row.memoryId || row.memory_id || row.id || "").trim(),
        usage_state: normalizeGlobalMemoryUsageState(row.usageState || row.usage_state || row.status || row.state || ""),
        current_source_verified: row.currentSourceVerified === true || row.current_source_verified === true || row.verified === true,
        semantic_risk_acknowledged: row.semanticRiskAcknowledged === true || row.semantic_risk_acknowledged === true || row.semanticRisk === true || row.semantic_risk === true,
        cross_group_suppression: String(row.crossGroupSuppression || row.cross_group_suppression || row.suppression || "").trim().toLowerCase(),
        reason: (0, memory_1.compactMemoryText)(row.reason || row.note || row.evidence || "", 400),
    })).filter((row) => row.global_memory_id || row.usage_state || row.reason).slice(0, 80);
}
function evaluateReceiptGlobalMemoryUsageGate(task, receipt = {}, context = {}) {
    const allGates = Array.isArray(context.globalMemoryReceiptGates || context.global_memory_receipt_gates)
        ? (context.globalMemoryReceiptGates || context.global_memory_receipt_gates)
        : (0, collaboration_memory_gates_part_01_1.collectTaskGlobalMemoryReceiptGates)(task, context);
    const agent = (0, collaboration_memory_gates_part_01_1.normalizeMemoryGateAgent)(receipt.agent || receipt.project || task?.target_project);
    const matching = allGates.filter((gate) => {
        const target = (0, collaboration_memory_gates_part_01_1.normalizeMemoryGateAgent)(gate.target_project);
        return !target || !agent || target === agent;
    });
    const used = Array.isArray(receipt.memoryUsed || receipt.memory_used) ? (receipt.memoryUsed || receipt.memory_used) : [];
    const ignored = Array.isArray(receipt.memoryIgnored || receipt.memory_ignored) ? (receipt.memoryIgnored || receipt.memory_ignored) : [];
    const structuredRows = collectReceiptGlobalMemoryUsageRows(receipt);
    const structuredText = structuredRows.map((row) => [
        row.global_memory_id ? `global_memory_id=${row.global_memory_id}` : "",
        row.usage_state ? `usage_state=${row.usage_state}` : "",
        row.current_source_verified ? "current_source_verified=true" : "",
        row.semantic_risk_acknowledged ? "semantic_risk_acknowledged=true" : "",
        row.cross_group_suppression ? `cross_group_suppression=${row.cross_group_suppression}` : "",
        row.reason || "",
    ].filter(Boolean).join("; ")).join("\n");
    const declarationText = [...used, ...ignored, structuredText, receipt.summary, ...(Array.isArray(receipt.verification) ? receipt.verification : [])]
        .map((item) => String(item || ""))
        .join("\n");
    const ignoredText = ignored.map((item) => String(item || "")).join("\n");
    const rows = matching.flatMap((gate) => (Array.isArray(gate.items) ? gate.items : []).map((item) => {
        const id = String(item.global_memory_id || "").trim();
        const structured = structuredRows.find((row) => String(row.global_memory_id || "").trim() === id);
        const snippet = globalMemoryUsageSnippet(declarationText, id);
        const ignoredSnippet = globalMemoryUsageSnippet(ignoredText, id);
        const mentioned = !!structured || !!snippet;
        const rawState = structured?.usage_state || normalizeGlobalMemoryUsageState(ignoredSnippet || snippet);
        const usageState = rawState || (mentioned ? "mentioned" : "missing");
        const structuredEvidenceText = [structured?.reason, structured?.cross_group_suppression, structured?.usage_state].filter(Boolean).join("\n");
        const currentSourceVerified = structured
            ? structured.current_source_verified === true || /(current source verified|verified current source|current source|source verified|current file|latest source|re-read|reread|当前源|当前文件|最新源|重读|重新读取|已核验|已验证|核验当前)/i.test(structuredEvidenceText)
            : /(current source verified|verified current source|current source|source verified|current file|latest source|re-read|reread|当前源|当前文件|最新源|重读|重新读取|已核验|已验证|核验当前)/i.test(snippet);
        const semanticAcknowledged = structured
            ? structured.semantic_risk_acknowledged === true || /semantic[_\s-]?risk|语义风险|semantic|仲裁|conflict|demoted|降权|冲突/i.test(structuredEvidenceText)
            : /semantic[_\s-]?risk|语义风险|semantic|仲裁|conflict|demoted|降权|冲突/i.test(snippet);
        const crossAcknowledged = structured
            ? !!structured.cross_group_suppression || /cross_group_suppression|跨群聊|background_only|advisory|background|仅作背景|背景/i.test(structuredEvidenceText)
            : /cross_group_suppression|跨群聊|background_only|advisory|background|仅作背景|背景/i.test(snippet);
        const risky = item.requires_current_source_verification === true;
        const backgroundOnly = item.requires_background_only === true || item.cross_group_suppression === "background_only";
        const passState = mentioned && ["used", "ignored", "verified", "background", "advisory"].includes(usageState);
        const unsafeUse = backgroundOnly && usageState === "used" && !currentSourceVerified;
        const missingCurrentVerification = risky && usageState === "used" && !currentSourceVerified;
        const missingSemanticAck = Number(item.semantic_risk_score || 0) >= 60 && !semanticAcknowledged;
        const missingCrossAck = !!item.cross_group_suppression && !crossAcknowledged;
        return {
            gate_id: gate.gate_id,
            target_project: gate.target_project || "",
            global_memory_id: id,
            status: item.status || "",
            usage_state: usageState,
            mentioned,
            pass_state: passState,
            current_source_verified: currentSourceVerified,
            semantic_risk_acknowledged: semanticAcknowledged,
            cross_group_acknowledged: crossAcknowledged,
            semantic_risk_score: Number(item.semantic_risk_score || 0),
            cross_group_suppression: item.cross_group_suppression || "",
            requires_current_source_verification: risky,
            requires_background_only: backgroundOnly,
            unsafe_use: unsafeUse,
            missing_current_verification: missingCurrentVerification,
            missing_semantic_acknowledgement: missingSemanticAck,
            missing_cross_group_acknowledgement: missingCrossAck,
            pass: passState && !unsafeUse && !missingCurrentVerification && !missingSemanticAck && !missingCrossAck,
        };
    }));
    const missingRows = rows.filter((row) => !row.mentioned);
    const missingUsageStateRows = rows.filter((row) => row.mentioned && !row.pass_state);
    const unsafeUseRows = rows.filter((row) => row.unsafe_use);
    const missingCurrentVerificationRows = rows.filter((row) => row.missing_current_verification);
    const missingSemanticRows = rows.filter((row) => row.missing_semantic_acknowledgement);
    const missingCrossRows = rows.filter((row) => row.missing_cross_group_acknowledgement);
    return {
        schema: "ccm-child-agent-global-memory-receipt-validation-v1",
        required: matching.length > 0,
        pass: matching.length === 0 || rows.every((row) => row.pass),
        gate_ids: matching.map((gate) => gate.gate_id),
        global_memory_ids: (0, collaboration_1.uniqueStrings)(...matching.map((gate) => gate.required_global_memory_ids || [])).slice(0, 40),
        missing_global_memory_ids: (0, collaboration_1.uniqueStrings)(missingRows.map((row) => row.global_memory_id)).slice(0, 40),
        missing_usage_state_ids: (0, collaboration_1.uniqueStrings)(missingUsageStateRows.map((row) => row.global_memory_id)).slice(0, 40),
        unsafe_used_global_memory_ids: (0, collaboration_1.uniqueStrings)(unsafeUseRows.map((row) => row.global_memory_id)).slice(0, 40),
        missing_current_verification_ids: (0, collaboration_1.uniqueStrings)(missingCurrentVerificationRows.map((row) => row.global_memory_id)).slice(0, 40),
        missing_semantic_acknowledgement_ids: (0, collaboration_1.uniqueStrings)(missingSemanticRows.map((row) => row.global_memory_id)).slice(0, 40),
        missing_cross_group_acknowledgement_ids: (0, collaboration_1.uniqueStrings)(missingCrossRows.map((row) => row.global_memory_id)).slice(0, 40),
        used_global_memory_ids: (0, collaboration_1.uniqueStrings)(rows.filter((row) => row.usage_state === "used").map((row) => row.global_memory_id)).slice(0, 40),
        ignored_global_memory_ids: (0, collaboration_1.uniqueStrings)(rows.filter((row) => row.usage_state === "ignored").map((row) => row.global_memory_id)).slice(0, 40),
        verified_global_memory_ids: (0, collaboration_1.uniqueStrings)(rows.filter((row) => row.usage_state === "verified" || row.current_source_verified).map((row) => row.global_memory_id)).slice(0, 40),
        background_global_memory_ids: (0, collaboration_1.uniqueStrings)(rows.filter((row) => row.usage_state === "background" || row.cross_group_suppression === "background_only").map((row) => row.global_memory_id)).slice(0, 40),
        advisory_global_memory_ids: (0, collaboration_1.uniqueStrings)(rows.filter((row) => row.usage_state === "advisory" || row.cross_group_suppression === "advisory").map((row) => row.global_memory_id)).slice(0, 40),
        rows,
        structured_usage_rows: structuredRows,
        declared: used.length > 0 || ignored.length > 0 || structuredRows.length > 0,
        used,
        ignored,
    };
}
function evaluateReceiptGlobalMemoryHealthGate(task, receipt = {}, context = {}) {
    const allGates = Array.isArray(context.globalMemoryHealthGates || context.global_memory_health_gates)
        ? (context.globalMemoryHealthGates || context.global_memory_health_gates)
        : (0, collaboration_memory_gates_part_01_1.collectTaskGlobalMemoryHealthGates)(task, context);
    const agent = (0, collaboration_memory_gates_part_01_1.normalizeMemoryGateAgent)(receipt.agent || receipt.project || task?.target_project);
    const matching = allGates.filter((gate) => {
        const target = (0, collaboration_memory_gates_part_01_1.normalizeMemoryGateAgent)(gate.target_project);
        return !target || !agent || target === agent;
    });
    const used = Array.isArray(receipt.memoryUsed || receipt.memory_used) ? (receipt.memoryUsed || receipt.memory_used) : [];
    const ignored = Array.isArray(receipt.memoryIgnored || receipt.memory_ignored) ? (receipt.memoryIgnored || receipt.memory_ignored) : [];
    const structuredRows = collectReceiptGlobalMemoryUsageRows(receipt);
    const structuredText = structuredRows.map((row) => [
        row.global_memory_id ? `global_memory_id=${row.global_memory_id}` : "",
        row.usage_state ? `usage_state=${row.usage_state}` : "",
        row.current_source_verified ? "current_source_verified=true" : "",
        row.reason || "",
    ].filter(Boolean).join("; ")).join("\n");
    const usedText = used.map((item) => String(item || "")).join("\n");
    const ignoredText = ignored.map((item) => String(item || "")).join("\n");
    const declarationText = [usedText, ignoredText, structuredText, receipt.summary, ...(Array.isArray(receipt.verification) ? receipt.verification : [])]
        .map((item) => String(item || ""))
        .join("\n");
    const hasIgnoredSignal = /(memoryignored|memory ignored|ignored|ignore|skip|not used|not needed|unused|blocked|do not use|must not use|不使用|未使用|忽略|跳过|阻断|禁止使用|不能使用|未采用)/i.test(ignoredText || declarationText);
    const hasCurrentSourceVerified = /(current source verified|verified current source|current source|source verified|current file|latest source|re-read|reread|当前源|当前文件|最新源|重读|重新读取|已核验|已验证|核验当前)/i.test(declarationText);
    const rows = matching.map((gate) => {
        const gateId = String(gate.gate_id || "").trim();
        const gateMentioned = !!gateId && declarationText.includes(gateId);
        const fail = gate.status === "fail" || gate.action === "block_global_agent_memory_recall";
        const warn = gate.status === "warn";
        const unsafeStructuredUse = structuredRows.some((row) => row.usage_state && !["ignored"].includes(row.usage_state));
        const unsafeUsedText = /global[_\s-]?memory|global agent memory|全局记忆|全局 Agent 记忆/i.test(usedText);
        const blockedGlobalMemoryUsed = fail && (unsafeStructuredUse || unsafeUsedText);
        const ignoredWithReason = gateMentioned && hasIgnoredSignal;
        const warningAcknowledged = gateMentioned && (hasCurrentSourceVerified || hasIgnoredSignal || /residue|残留|warning|warn|active memory clean|active.*clean/i.test(declarationText));
        const acknowledged = fail ? ignoredWithReason : warn ? warningAcknowledged : gateMentioned;
        return {
            gate_id: gateId,
            target_project: gate.target_project || "",
            status: gate.status || "",
            action: gate.action || "",
            active_contamination_count: Number(gate.active_contamination_count || 0),
            residue_contamination_count: Number(gate.residue_contamination_count || 0),
            gate_mentioned: gateMentioned,
            ignored_with_reason: ignoredWithReason,
            warning_acknowledged: warningAcknowledged,
            current_source_verified: hasCurrentSourceVerified,
            blocked_global_memory_used: blockedGlobalMemoryUsed,
            required_action: gate.required_action || "",
            pass: acknowledged && !blockedGlobalMemoryUsed,
        };
    });
    const missingRows = rows.filter((row) => !row.gate_mentioned);
    const missingIgnoredRows = rows.filter((row) => row.status === "fail" && !row.ignored_with_reason);
    const missingWarnRows = rows.filter((row) => row.status === "warn" && !row.warning_acknowledged);
    const unsafeRows = rows.filter((row) => row.blocked_global_memory_used);
    return {
        schema: "ccm-child-agent-global-memory-health-gate-receipt-validation-v1",
        required: matching.length > 0,
        pass: matching.length === 0 || rows.every((row) => row.pass),
        gate_ids: matching.map((gate) => gate.gate_id),
        missing_gate_ids: missingRows.map((row) => row.gate_id),
        fail_gate_ids: rows.filter((row) => row.status === "fail").map((row) => row.gate_id),
        warn_gate_ids: rows.filter((row) => row.status === "warn").map((row) => row.gate_id),
        missing_ignore_gate_ids: missingIgnoredRows.map((row) => row.gate_id),
        missing_warning_ack_gate_ids: missingWarnRows.map((row) => row.gate_id),
        blocked_global_memory_used_gate_ids: unsafeRows.map((row) => row.gate_id),
        rows,
        declared: used.length > 0 || ignored.length > 0 || structuredRows.length > 0,
        used,
        ignored,
    };
}
function buildMemoryGateVisibleSummary(summary = {}) {
    const gates = Array.isArray(summary.memory_dispatch_gates || summary.memoryDispatchGates)
        ? (summary.memory_dispatch_gates || summary.memoryDispatchGates)
        : [];
    const rows = Array.isArray(summary.memory_gate_receipt_rows || summary.memoryGateReceiptRows)
        ? (summary.memory_gate_receipt_rows || summary.memoryGateReceiptRows)
        : [];
    const gateIds = (0, collaboration_1.uniqueStrings)(...gates.map((gate) => gate.gate_id || gate.dispatch_gate_id || gate.dispatchGateId || gate.id || ""));
    const visibleRows = rows.map((row) => {
        const memoryGate = row.memory_gate || row.memoryGate || row;
        const missingGateIds = (0, collaboration_1.uniqueStrings)(...(0, collaboration_1.normalizeStringArray)(memoryGate.missing_gate_ids || memoryGate.missingGateIds || row.missing_gate_ids || row.missingGateIds));
        const rowGateIds = (0, collaboration_1.uniqueStrings)(...(0, collaboration_1.normalizeStringArray)(memoryGate.gate_ids || memoryGate.gateIds || row.gate_ids || row.gateIds), ...missingGateIds);
        const pass = memoryGate.pass === true || row.pass === true || (missingGateIds.length === 0 && memoryGate.required === true);
        const required = memoryGate.required === true || row.required === true || rowGateIds.length > 0 || missingGateIds.length > 0;
        const status = !required ? "not_required" : pass ? "passed" : "missing_receipt_reference";
        return {
            agent: row.agent || row.project || row.target || "",
            status,
            status_label: status === "passed" ? "已声明" : status === "missing_receipt_reference" ? "缺记忆声明" : "未触发",
            gate_ids: rowGateIds.slice(0, 12),
            missing_gate_ids: missingGateIds.slice(0, 12),
            declared: memoryGate.declared === true,
            used_count: (0, collaboration_1.normalizeStringArray)(memoryGate.used || row.memoryUsed || row.memory_used).length,
            ignored_count: (0, collaboration_1.normalizeStringArray)(memoryGate.ignored || row.memoryIgnored || row.memory_ignored).length,
            reason: status === "missing_receipt_reference"
                ? `结果说明缺少记忆 gate 引用：${missingGateIds.join("、") || rowGateIds.join("、") || "本轮派发 gate"}`
                : status === "passed"
                    ? "结果说明已声明本轮群聊记忆使用"
                    : "本轮未触发记忆派发 gate",
        };
    });
    const missingGateIds = (0, collaboration_1.uniqueStrings)(...visibleRows.map((row) => row.missing_gate_ids || []));
    const required = gates.length > 0 || visibleRows.some((row) => row.status !== "not_required") || Number(summary.memory_dispatch_gate_count || summary.memoryDispatchGateCount || 0) > 0;
    const pass = !required || summary.memory_gate_receipt_passed === true || summary.memoryGateReceiptPassed === true || (visibleRows.length > 0 && visibleRows.every((row) => row.status !== "missing_receipt_reference"));
    const status = !required
        ? "not_required"
        : pass
            ? "passed"
            : "missing_receipt_reference";
    return {
        schema: "ccm-memory-gate-visible-summary-v1",
        required,
        pass,
        status,
        status_label: status === "passed" ? "已通过" : status === "missing_receipt_reference" ? "缺记忆声明" : "未触发",
        summary: !required
            ? "本轮未触发记忆派发校验"
            : pass
                ? `子 Agent 已声明本轮群聊记忆 gate（${gateIds.length || Number(summary.memory_dispatch_gate_count || 0)} 个）`
                : `还有 ${missingGateIds.length || visibleRows.filter((row) => row.status === "missing_receipt_reference").length} 个记忆 gate 未被结果说明引用`,
        gate_count: gateIds.length || Number(summary.memory_dispatch_gate_count || summary.memoryDispatchGateCount || 0),
        gate_ids: gateIds.slice(0, 20),
        missing_gate_ids: missingGateIds.slice(0, 20),
        missing_count: missingGateIds.length,
        rows: visibleRows.slice(0, 20),
    };
}
function buildGlobalMemoryReceiptVisibleSummary(summary = {}) {
    const gates = Array.isArray(summary.global_memory_receipt_gates || summary.globalMemoryReceiptGates)
        ? (summary.global_memory_receipt_gates || summary.globalMemoryReceiptGates)
        : [];
    const rows = Array.isArray(summary.global_memory_receipt_rows || summary.globalMemoryReceiptRows)
        ? (summary.global_memory_receipt_rows || summary.globalMemoryReceiptRows)
        : [];
    const gateIds = (0, collaboration_1.uniqueStrings)(...gates.map((gate) => gate.gate_id || gate.id || ""));
    const globalMemoryIds = (0, collaboration_1.uniqueStrings)(...gates.map((gate) => gate.required_global_memory_ids || gate.global_memory_ids || []));
    const visibleRows = rows.map((row) => {
        const gate = row.global_memory_gate || row.globalMemoryGate || row.global_memory_receipt || row.globalMemoryReceipt || row;
        const missingIds = (0, collaboration_1.uniqueStrings)(gate.missing_global_memory_ids || row.missing_global_memory_ids || []);
        const missingUsageIds = (0, collaboration_1.uniqueStrings)(gate.missing_usage_state_ids || row.missing_usage_state_ids || []);
        const unsafeIds = (0, collaboration_1.uniqueStrings)(gate.unsafe_used_global_memory_ids || row.unsafe_used_global_memory_ids || []);
        const missingCurrentIds = (0, collaboration_1.uniqueStrings)(gate.missing_current_verification_ids || row.missing_current_verification_ids || []);
        const missingSemanticIds = (0, collaboration_1.uniqueStrings)(gate.missing_semantic_acknowledgement_ids || row.missing_semantic_acknowledgement_ids || []);
        const missingCrossIds = (0, collaboration_1.uniqueStrings)(gate.missing_cross_group_acknowledgement_ids || row.missing_cross_group_acknowledgement_ids || []);
        const rowIds = (0, collaboration_1.uniqueStrings)(gate.global_memory_ids || row.global_memory_ids || [], missingIds, missingUsageIds, unsafeIds, missingCurrentIds, missingSemanticIds, missingCrossIds);
        const pass = gate.pass === true || row.pass === true || (gate.required === true && !missingIds.length && !missingUsageIds.length && !unsafeIds.length && !missingCurrentIds.length && !missingSemanticIds.length && !missingCrossIds.length);
        const required = gate.required === true || row.required === true || rowIds.length > 0 || missingIds.length > 0;
        const status = !required
            ? "not_required"
            : pass
                ? "passed"
                : unsafeIds.length
                    ? "unsafe_global_memory_use"
                    : missingIds.length
                        ? "missing_global_memory_reference"
                        : missingCurrentIds.length
                            ? "missing_current_source_verification"
                            : missingSemanticIds.length
                                ? "missing_semantic_acknowledgement"
                                : missingCrossIds.length
                                    ? "missing_cross_group_acknowledgement"
                                    : missingUsageIds.length
                                        ? "missing_usage_state"
                                        : "missing_global_memory_reference";
        return {
            agent: row.agent || row.project || row.target || "",
            status,
            status_label: status === "passed" ? "已声明"
                : status === "unsafe_global_memory_use" ? "全局记忆误用"
                    : status === "missing_current_source_verification" ? "缺当前源核验"
                        : status === "missing_semantic_acknowledgement" ? "缺语义风险声明"
                            : status === "missing_cross_group_acknowledgement" ? "缺跨群聊声明"
                                : status === "missing_usage_state" ? "缺使用状态"
                                    : status === "missing_global_memory_reference" ? "缺全局记忆声明" : "未触发",
            gate_ids: (0, collaboration_1.uniqueStrings)(gate.gate_ids || row.gate_ids || [], gateIds).slice(0, 12),
            global_memory_ids: rowIds.slice(0, 20),
            missing_global_memory_ids: missingIds.slice(0, 20),
            missing_usage_state_ids: missingUsageIds.slice(0, 20),
            unsafe_used_global_memory_ids: unsafeIds.slice(0, 20),
            missing_current_verification_ids: missingCurrentIds.slice(0, 20),
            missing_semantic_acknowledgement_ids: missingSemanticIds.slice(0, 20),
            missing_cross_group_acknowledgement_ids: missingCrossIds.slice(0, 20),
            used_count: (0, collaboration_1.normalizeStringArray)(gate.used_global_memory_ids || row.used_global_memory_ids).length,
            ignored_count: (0, collaboration_1.normalizeStringArray)(gate.ignored_global_memory_ids || row.ignored_global_memory_ids).length,
            verified_count: (0, collaboration_1.normalizeStringArray)(gate.verified_global_memory_ids || row.verified_global_memory_ids).length,
            reason: status === "passed"
                ? "结果说明已按 global_memory_id 声明全局记忆使用状态"
                : status === "unsafe_global_memory_use"
                    ? `background-only 全局记忆不能直接使用：${unsafeIds.join("、")}`
                    : status === "missing_current_source_verification"
                        ? `风险全局记忆缺少 current source verified：${missingCurrentIds.join("、")}`
                        : status === "missing_semantic_acknowledgement"
                            ? `语义仲裁全局记忆缺少 semantic_risk 声明：${missingSemanticIds.join("、")}`
                            : status === "missing_cross_group_acknowledgement"
                                ? `跨群聊全局记忆缺少 suppression/advisory 声明：${missingCrossIds.join("、")}`
                                : status === "missing_usage_state"
                                    ? `全局记忆缺少 used/ignored/verified/background/advisory 状态：${missingUsageIds.join("、")}`
                                    : `结果说明缺少 global_memory_id 声明：${missingIds.join("、") || rowIds.join("、") || "本轮全局记忆"}`,
        };
    });
    const failingRows = visibleRows.filter((row) => !["not_required", "passed"].includes(row.status));
    const required = gates.length > 0 || visibleRows.some((row) => row.status !== "not_required") || Number(summary.global_memory_receipt_gate_count || summary.globalMemoryReceiptGateCount || 0) > 0;
    const pass = !required || summary.global_memory_receipt_passed === true || summary.globalMemoryReceiptPassed === true || (visibleRows.length > 0 && failingRows.length === 0);
    const status = !required ? "not_required" : pass ? "passed" : failingRows[0]?.status || "missing_global_memory_reference";
    return {
        schema: "ccm-global-memory-receipt-visible-summary-v1",
        required,
        pass,
        status,
        status_label: status === "passed" ? "已通过" : status === "not_required" ? "未触发" : "需补声明",
        summary: !required
            ? "本轮未触发全局记忆回执校验"
            : pass
                ? `子 Agent 已声明全局记忆使用状态（${globalMemoryIds.length || Number(summary.global_memory_receipt_gate_count || 0)} 条）`
                : failingRows[0]?.reason || "结果说明缺少全局记忆使用状态声明",
        gate_count: gateIds.length || Number(summary.global_memory_receipt_gate_count || summary.globalMemoryReceiptGateCount || 0),
        global_memory_count: globalMemoryIds.length,
        gate_ids: gateIds.slice(0, 20),
        global_memory_ids: globalMemoryIds.slice(0, 40),
        missing_global_memory_ids: (0, collaboration_1.uniqueStrings)(...visibleRows.map((row) => row.missing_global_memory_ids || [])).slice(0, 40),
        unsafe_used_global_memory_ids: (0, collaboration_1.uniqueStrings)(...visibleRows.map((row) => row.unsafe_used_global_memory_ids || [])).slice(0, 40),
        missing_current_verification_ids: (0, collaboration_1.uniqueStrings)(...visibleRows.map((row) => row.missing_current_verification_ids || [])).slice(0, 40),
        missing_semantic_acknowledgement_ids: (0, collaboration_1.uniqueStrings)(...visibleRows.map((row) => row.missing_semantic_acknowledgement_ids || [])).slice(0, 40),
        missing_cross_group_acknowledgement_ids: (0, collaboration_1.uniqueStrings)(...visibleRows.map((row) => row.missing_cross_group_acknowledgement_ids || [])).slice(0, 40),
        missing_count: failingRows.length,
        rows: visibleRows.slice(0, 20),
    };
}
function buildGlobalMemoryHealthGateVisibleSummary(summary = {}) {
    const gates = Array.isArray(summary.global_memory_health_gates || summary.globalMemoryHealthGates)
        ? (summary.global_memory_health_gates || summary.globalMemoryHealthGates)
        : [];
    const rows = Array.isArray(summary.global_memory_health_gate_receipt_rows || summary.globalMemoryHealthGateReceiptRows)
        ? (summary.global_memory_health_gate_receipt_rows || summary.globalMemoryHealthGateReceiptRows)
        : [];
    const gateIds = (0, collaboration_1.uniqueStrings)(...gates.map((gate) => gate.gate_id || gate.id || ""));
    const visibleRows = rows.map((row) => {
        const gate = row.global_memory_health_gate || row.globalMemoryHealthGate || row.global_memory_health || row.globalMemoryHealth || row;
        const missingIds = (0, collaboration_1.uniqueStrings)(gate.missing_gate_ids || row.missing_gate_ids || []);
        const missingIgnoreIds = (0, collaboration_1.uniqueStrings)(gate.missing_ignore_gate_ids || row.missing_ignore_gate_ids || []);
        const missingWarnIds = (0, collaboration_1.uniqueStrings)(gate.missing_warning_ack_gate_ids || row.missing_warning_ack_gate_ids || []);
        const unsafeIds = (0, collaboration_1.uniqueStrings)(gate.blocked_global_memory_used_gate_ids || row.blocked_global_memory_used_gate_ids || []);
        const rowGateIds = (0, collaboration_1.uniqueStrings)(gate.gate_ids || row.gate_ids || [], missingIds, missingIgnoreIds, missingWarnIds, unsafeIds);
        const pass = gate.pass === true || row.pass === true || (gate.required === true && !missingIds.length && !missingIgnoreIds.length && !missingWarnIds.length && !unsafeIds.length);
        const required = gate.required === true || row.required === true || rowGateIds.length > 0;
        const status = !required
            ? "not_required"
            : pass
                ? "passed"
                : unsafeIds.length
                    ? "blocked_global_memory_used"
                    : missingIgnoreIds.length
                        ? "missing_blocked_memory_ignored"
                        : missingWarnIds.length
                            ? "missing_residue_warning_ack"
                            : missingIds.length
                                ? "missing_health_gate_reference"
                                : "missing_health_gate_reference";
        return {
            agent: row.agent || row.project || row.target || "",
            status,
            status_label: status === "passed" ? "已声明"
                : status === "blocked_global_memory_used" ? "阻断后误用"
                    : status === "missing_blocked_memory_ignored" ? "缺阻断说明"
                        : status === "missing_residue_warning_ack" ? "缺残留警告声明"
                            : status === "missing_health_gate_reference" ? "缺健康门禁声明" : "未触发",
            gate_ids: rowGateIds.slice(0, 20),
            missing_gate_ids: missingIds.slice(0, 20),
            missing_ignore_gate_ids: missingIgnoreIds.slice(0, 20),
            missing_warning_ack_gate_ids: missingWarnIds.slice(0, 20),
            blocked_global_memory_used_gate_ids: unsafeIds.slice(0, 20),
            fail_gate_ids: (0, collaboration_1.uniqueStrings)(gate.fail_gate_ids || row.fail_gate_ids || []).slice(0, 20),
            warn_gate_ids: (0, collaboration_1.uniqueStrings)(gate.warn_gate_ids || row.warn_gate_ids || []).slice(0, 20),
            reason: status === "passed"
                ? "结果说明已声明 Global Agent memory health gate 的处理情况"
                : status === "blocked_global_memory_used"
                    ? `健康门禁阻断后仍声明使用全局记忆：${unsafeIds.join("、")}`
                    : status === "missing_blocked_memory_ignored"
                        ? `健康门禁失败时 memoryIgnored 必须引用 gate 并说明不使用全局记忆：${missingIgnoreIds.join("、")}`
                        : status === "missing_residue_warning_ack"
                            ? `健康门禁 warn 时必须声明残留警告或当前源核验：${missingWarnIds.join("、")}`
                            : `结果说明缺少 Global Agent memory health gate 引用：${missingIds.join("、") || rowGateIds.join("、") || "本轮健康门禁"}`,
        };
    });
    const failingRows = visibleRows.filter((row) => !["not_required", "passed"].includes(row.status));
    const required = gates.length > 0 || visibleRows.some((row) => row.status !== "not_required") || Number(summary.global_memory_health_gate_count || summary.globalMemoryHealthGateCount || 0) > 0;
    const pass = !required || summary.global_memory_health_gate_receipt_passed === true || summary.globalMemoryHealthGateReceiptPassed === true || (visibleRows.length > 0 && failingRows.length === 0);
    const status = !required ? "not_required" : pass ? "passed" : failingRows[0]?.status || "missing_health_gate_reference";
    return {
        schema: "ccm-global-memory-health-gate-visible-summary-v1",
        required,
        pass,
        status,
        status_label: status === "passed" ? "已通过" : status === "not_required" ? "未触发" : "需补声明",
        summary: !required
            ? "本轮未触发 Global Agent memory health gate 回执校验"
            : pass
                ? `子 Agent 已声明 Global Agent memory health gate（${gateIds.length || Number(summary.global_memory_health_gate_count || 0)} 个）`
                : failingRows[0]?.reason || "结果说明缺少 Global Agent memory health gate 使用/忽略声明",
        gate_count: gateIds.length || Number(summary.global_memory_health_gate_count || summary.globalMemoryHealthGateCount || 0),
        gate_ids: gateIds.slice(0, 20),
        missing_gate_ids: (0, collaboration_1.uniqueStrings)(...visibleRows.map((row) => row.missing_gate_ids || [])).slice(0, 40),
        missing_ignore_gate_ids: (0, collaboration_1.uniqueStrings)(...visibleRows.map((row) => row.missing_ignore_gate_ids || [])).slice(0, 40),
        missing_warning_ack_gate_ids: (0, collaboration_1.uniqueStrings)(...visibleRows.map((row) => row.missing_warning_ack_gate_ids || [])).slice(0, 40),
        blocked_global_memory_used_gate_ids: (0, collaboration_1.uniqueStrings)(...visibleRows.map((row) => row.blocked_global_memory_used_gate_ids || [])).slice(0, 40),
        missing_count: failingRows.length,
        rows: visibleRows.slice(0, 20),
    };
}
function buildReadPlanRevalidationGateVisibleSummary(summary = {}) {
    const gates = Array.isArray(summary.read_plan_revalidation_gates || summary.readPlanRevalidationGates)
        ? (summary.read_plan_revalidation_gates || summary.readPlanRevalidationGates)
        : [];
    const rows = Array.isArray(summary.read_plan_revalidation_gate_receipt_rows || summary.readPlanRevalidationGateReceiptRows)
        ? (summary.read_plan_revalidation_gate_receipt_rows || summary.readPlanRevalidationGateReceiptRows)
        : [];
    const gateIds = (0, collaboration_1.uniqueStrings)(...gates.map((gate) => gate.gate_id || gate.revalidation_gate_id || gate.revalidationGateId || gate.id || ""));
    const visibleRows = rows.map((row) => {
        const gate = row.read_plan_revalidation_gate || row.readPlanRevalidationGate || row;
        const gateRows = Array.isArray(gate.rows || gate.gate_rows || gate.gateRows) ? (gate.rows || gate.gate_rows || gate.gateRows) : [];
        const missingGateIds = (0, collaboration_1.uniqueStrings)(...(0, collaboration_1.normalizeStringArray)(gate.missing_gate_ids || gate.missingGateIds || row.missing_gate_ids || row.missingGateIds));
        const missingReadPlanIds = (0, collaboration_1.uniqueStrings)(...(0, collaboration_1.normalizeStringArray)(gate.missing_read_plan_ids || gate.missingReadPlanIds || row.missing_read_plan_ids || row.missingReadPlanIds));
        const sessionMismatchGateIds = (0, collaboration_1.uniqueStrings)(...(0, collaboration_1.normalizeStringArray)(gate.session_mismatch_gate_ids || gate.sessionMismatchGateIds || row.session_mismatch_gate_ids || row.sessionMismatchGateIds));
        const rowGateIds = (0, collaboration_1.uniqueStrings)(...(0, collaboration_1.normalizeStringArray)(gate.gate_ids || gate.gateIds || row.gate_ids || row.gateIds), ...missingGateIds, ...sessionMismatchGateIds);
        const sessionRequired = gate.session_required === true || row.session_required === true || gateRows.some((item) => item.session_required === true);
        const sessionMatched = !sessionRequired || (gate.session_matched !== false && row.session_matched !== false && !sessionMismatchGateIds.length);
        const currentSourceVerified = gate.current_source_verified === true || row.current_source_verified === true || gateRows.some((item) => item.current_source_verified === true);
        const ignoredWithReason = gate.ignored_with_reason === true || row.ignored_with_reason === true || gateRows.some((item) => item.ignored_with_reason === true);
        const pass = gate.pass === true || row.pass === true || (gate.required === true && !missingGateIds.length && !missingReadPlanIds.length && sessionMatched && (currentSourceVerified || ignoredWithReason));
        const required = gate.required === true || row.required === true || rowGateIds.length > 0 || missingGateIds.length > 0 || missingReadPlanIds.length > 0 || sessionMismatchGateIds.length > 0;
        const status = !required
            ? "not_required"
            : missingGateIds.length
                ? "missing_receipt_reference"
                : !sessionMatched
                    ? "session_mismatch"
                    : missingReadPlanIds.length
                        ? "missing_read_plan_reference"
                        : !(currentSourceVerified || ignoredWithReason)
                            ? "missing_current_source_verification"
                            : pass ? "passed" : "missing_current_source_verification";
        const expectedTaskSessionIds = (0, collaboration_1.uniqueStrings)(...gateRows.map((item) => item.expected_task_agent_session_id || item.expectedTaskAgentSessionId || ""));
        const receiptTaskSessionIds = (0, collaboration_1.uniqueStrings)(gate.receipt_task_agent_session_id || gate.receiptTaskAgentSessionId || row.task_agent_session_id || row.taskAgentSessionId || "", ...gateRows.map((item) => item.receipt_task_agent_session_id || item.receiptTaskAgentSessionId || ""));
        const expectedNativeSessionIds = (0, collaboration_1.uniqueStrings)(...gateRows.map((item) => item.expected_native_session_id || item.expectedNativeSessionId || ""));
        const receiptNativeSessionIds = (0, collaboration_1.uniqueStrings)(gate.receipt_native_session_id || gate.receiptNativeSessionId || row.native_session_id || row.nativeSessionId || "", ...gateRows.map((item) => item.receipt_native_session_id || item.receiptNativeSessionId || ""));
        return {
            agent: row.agent || row.project || row.target || "",
            status,
            status_label: status === "passed" ? "已重读" : status === "session_mismatch" ? "会话不匹配" : status === "missing_read_plan_reference" ? "缺 read_plan_id" : status === "missing_current_source_verification" ? "缺当前源核验" : status === "missing_receipt_reference" ? "缺重读 gate" : "未触发",
            gate_ids: rowGateIds.slice(0, 12),
            missing_gate_ids: missingGateIds.slice(0, 12),
            missing_read_plan_ids: missingReadPlanIds.slice(0, 24),
            session_mismatch_gate_ids: sessionMismatchGateIds.slice(0, 12),
            session_required: sessionRequired,
            session_matched: sessionMatched,
            expected_task_agent_session_ids: expectedTaskSessionIds.slice(0, 8),
            receipt_task_agent_session_ids: receiptTaskSessionIds.slice(0, 8),
            expected_native_session_ids: expectedNativeSessionIds.slice(0, 8),
            receipt_native_session_ids: receiptNativeSessionIds.slice(0, 8),
            current_source_verified: currentSourceVerified,
            ignored_with_reason: ignoredWithReason,
            declared: gate.declared === true,
            rows: gateRows.slice(0, 12),
            reason: status === "session_mismatch"
                ? `结果说明来自错误子 Agent 会话：expected=${expectedTaskSessionIds.join("、") || expectedNativeSessionIds.join("、") || "bound-session"}；receipt=${receiptTaskSessionIds.join("、") || receiptNativeSessionIds.join("、") || "missing"}`
                : status === "missing_read_plan_reference"
                    ? `结果说明缺少 stale read_plan_id：${missingReadPlanIds.join("、") || rowGateIds.join("、") || "本轮读取计划"}`
                    : status === "missing_current_source_verification"
                        ? `结果说明需要声明已重读当前源或在 memoryIgnored 说明不使用：${rowGateIds.join("、") || "本轮读取计划重读 gate"}`
                        : status === "missing_receipt_reference"
                            ? `结果说明缺少读取计划重读 gate 引用：${missingGateIds.join("、") || rowGateIds.join("、") || "本轮重读 gate"}`
                            : status === "passed"
                                ? "结果说明已在绑定子 Agent 会话中声明 stale read plan 已重读当前源"
                                : "本轮未触发读取计划重读 gate",
        };
    });
    const missingGateIds = (0, collaboration_1.uniqueStrings)(...visibleRows.map((row) => row.missing_gate_ids || []));
    const missingReadPlanIds = (0, collaboration_1.uniqueStrings)(...visibleRows.map((row) => row.missing_read_plan_ids || []));
    const sessionMismatchGateIds = (0, collaboration_1.uniqueStrings)(...visibleRows.map((row) => row.session_mismatch_gate_ids || []));
    const required = gates.length > 0 || visibleRows.some((row) => row.status !== "not_required") || Number(summary.read_plan_revalidation_gate_count || summary.readPlanRevalidationGateCount || 0) > 0;
    const pass = !required
        || summary.read_plan_revalidation_gate_receipt_passed === true
        || summary.readPlanRevalidationGateReceiptPassed === true
        || (visibleRows.length > 0 && visibleRows.every((row) => row.status === "passed"));
    const status = !required
        ? "not_required"
        : pass
            ? "passed"
            : missingGateIds.length
                ? "missing_receipt_reference"
                : sessionMismatchGateIds.length
                    ? "session_mismatch"
                    : missingReadPlanIds.length
                        ? "missing_read_plan_reference"
                        : "missing_current_source_verification";
    return {
        schema: "ccm-read-plan-revalidation-gate-visible-summary-v1",
        required,
        pass,
        status,
        status_label: status === "passed" ? "已通过" : status === "session_mismatch" ? "会话不匹配" : status === "missing_read_plan_reference" ? "缺 read_plan_id" : status === "missing_current_source_verification" ? "缺当前源核验" : status === "missing_receipt_reference" ? "缺重读声明" : "未触发",
        summary: !required
            ? "本轮未触发 stale read plan 重读校验"
            : pass
                ? `子 Agent 已在绑定会话中声明 stale read plan 重读（${gateIds.length || Number(summary.read_plan_revalidation_gate_count || 0)} 个 gate）`
                : status === "session_mismatch"
                    ? `还有 ${sessionMismatchGateIds.length} 个读取计划重读 gate 的回执来自错误会话`
                    : status === "missing_read_plan_reference"
                        ? `还有 ${missingReadPlanIds.length} 个 stale read_plan_id 未被结果说明引用`
                        : status === "missing_receipt_reference"
                            ? `还有 ${missingGateIds.length || visibleRows.filter((row) => row.status === "missing_receipt_reference").length} 个读取计划重读 gate 未被结果说明引用`
                            : "还有读取计划重读 gate 缺少 current source verified 或 memoryIgnored 不使用说明",
        gate_count: gateIds.length || Number(summary.read_plan_revalidation_gate_count || summary.readPlanRevalidationGateCount || 0),
        gate_ids: gateIds.slice(0, 20),
        missing_gate_ids: missingGateIds.slice(0, 20),
        missing_read_plan_ids: missingReadPlanIds.slice(0, 40),
        session_mismatch_gate_ids: sessionMismatchGateIds.slice(0, 20),
        session_mismatch_count: sessionMismatchGateIds.length,
        session_required: visibleRows.some((row) => row.session_required),
        session_matched: visibleRows.every((row) => !row.session_required || row.session_matched),
        missing_count: missingGateIds.length + missingReadPlanIds.length + sessionMismatchGateIds.length + visibleRows.filter((row) => row.status === "missing_current_source_verification").length,
        rows: visibleRows.slice(0, 20),
    };
}
//# sourceMappingURL=collaboration-memory-gates-part-02-part-02.js.map