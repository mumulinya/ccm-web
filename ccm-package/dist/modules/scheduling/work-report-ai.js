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
exports.validateWorkReportSummaryV3 = validateWorkReportSummaryV3;
exports.buildWorkReportEvidenceSnapshotV3 = buildWorkReportEvidenceSnapshotV3;
exports.generateWorkReportSummaryV3 = generateWorkReportSummaryV3;
exports.renderWorkReportSummaryMarkdownV3 = renderWorkReportSummaryMarkdownV3;
const crypto = __importStar(require("crypto"));
const group_orchestrator_config_1 = require("../collaboration/group-orchestrator-config");
const group_compaction_strategy_1 = require("../collaboration/group-compaction-strategy");
const context_budget_1 = require("../../system/context-budget");
const semantic_decision_runtime_1 = require("../../system/semantic-decision-runtime");
const COMPLETION_TYPES = new Set(["task_completed", "acceptance_gate", "coordinator_review"]);
const RISK_TYPES = new Set(["task_blocked", "task_failed", "child_agent_failed", "child_agent_rework", "agent_qa_waiting"]);
const QUALITY_TYPES = new Set(["verification", "acceptance_gate", "coordinator_review"]);
function stable(value) {
    if (Array.isArray(value))
        return value.map(stable);
    if (!value || typeof value !== "object")
        return value;
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
}
function checksum(value) {
    return crypto.createHash("sha256").update(JSON.stringify(stable(value))).digest("hex");
}
function emptyWorkReportSummary(snapshot) {
    return {
        schema: "ccm-work-report-summary-v3",
        version: 3,
        headline: snapshot.kind === "weekly" ? "本周暂无可核验工作记录" : "今日暂无可核验工作记录",
        overview: {
            text: snapshot.kind === "weekly"
                ? "本周工作事件账本中没有可核验记录，本报告未推断或补写任何完成事项。"
                : "今日工作事件账本中没有可核验记录，本报告未推断或补写任何完成事项。",
            evidence_event_ids: [],
        },
        completed: [],
        highlights: [],
        quality: [],
        risks: [],
        next_actions: [],
        confidence: 1,
    };
}
function cleanText(value, max) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    if (!text)
        throw new Error("work_report_summary_text_required");
    if (text.length > max)
        throw new Error(`work_report_summary_text_too_long:${max}`);
    return text;
}
function normalizeIds(value, allowedIds) {
    const ids = Array.from(new Set((Array.isArray(value) ? value : []).map(item => String(item || "").trim()).filter(Boolean)));
    if (ids.some(id => !allowedIds.has(id)))
        throw new Error("work_report_summary_unknown_evidence_event");
    return ids;
}
function eventSupportsCompletion(event) {
    return COMPLETION_TYPES.has(event.type) && ["done", "completed", "accepted", "passed", "success"].includes(String(event.state || "").toLowerCase());
}
function eventSupportsRisk(event) {
    return RISK_TYPES.has(event.type) || ["blocked", "failed", "rejected", "needs_user", "waiting"].includes(String(event.state || "").toLowerCase());
}
function eventSupportsQuality(event) {
    return QUALITY_TYPES.has(event.type) || event.actorType === "test_agent";
}
function validateItem(value, allowedIds, maxText = 240) {
    const item = value && typeof value === "object" ? value : {};
    return { text: cleanText(item.text, maxText), evidence_event_ids: normalizeIds(item.evidence_event_ids, allowedIds) };
}
function validateItems(value, allowedIds, maxItems, eventMap, predicate) {
    const rows = (Array.isArray(value) ? value : []).slice(0, maxItems).map(item => validateItem(item, allowedIds));
    for (const row of rows) {
        if (!row.evidence_event_ids.length)
            throw new Error("work_report_summary_item_evidence_required");
        if (predicate && !row.evidence_event_ids.some(id => predicate(eventMap.get(id))))
            throw new Error("work_report_summary_evidence_state_mismatch");
    }
    return rows;
}
function validateWorkReportSummaryV3(value, snapshot) {
    const raw = value?.summary || value?.report || value;
    if (!raw || typeof raw !== "object")
        throw new Error("work_report_summary_invalid");
    const allowedIds = new Set(snapshot.eventIds);
    const eventMap = new Map(snapshot.events.map(event => [event.id, event]));
    const overview = validateItem(raw.overview, allowedIds, 600);
    if (snapshot.eventIds.length && !overview.evidence_event_ids.length)
        throw new Error("work_report_summary_overview_evidence_required");
    const result = {
        schema: "ccm-work-report-summary-v3",
        version: 3,
        headline: cleanText(raw.headline || (snapshot.kind === "weekly" ? "本周工作总结" : "今日工作总结"), 120),
        overview,
        completed: validateItems(raw.completed, allowedIds, 12, eventMap, eventSupportsCompletion),
        highlights: validateItems(raw.highlights, allowedIds, 12, eventMap),
        quality: validateItems(raw.quality, allowedIds, 8, eventMap, eventSupportsQuality),
        risks: validateItems(raw.risks, allowedIds, 10, eventMap, eventSupportsRisk),
        next_actions: validateItems(raw.next_actions, allowedIds, 10, eventMap),
        confidence: Math.max(0, Math.min(1, Number(raw.confidence ?? 0.8))),
    };
    if (!snapshot.eventIds.length) {
        result.overview.evidence_event_ids = [];
        result.completed = [];
        result.highlights = [];
        result.quality = [];
        result.risks = [];
        result.next_actions = [];
    }
    return result;
}
function buildWorkReportEvidenceSnapshotV3(report, allEvents, timezone) {
    const requested = Array.from(new Set((Array.isArray(report?.event_ids) ? report.event_ids : []).map((id) => String(id || "")).filter(Boolean)));
    const sourceMap = new Map(allEvents.map(event => [String(event.id), event]));
    const missing = requested.filter(id => !sourceMap.has(id));
    if (missing.length)
        throw new Error(`work_report_evidence_missing:${missing.slice(0, 5).join(",")}`);
    const events = requested.map(id => sourceMap.get(id)).map(event => ({
        id: event.id,
        at: event.at,
        type: event.type,
        state: event.state,
        actorType: event.actor_type,
        actorLabel: event.actor_label,
        source: event.source,
        title: event.title,
        detail: event.detail,
        taskId: event.task_id,
        project: event.project,
        groupId: event.group_id,
        evidenceLevel: event.evidence_level,
    }));
    const kind = report?.type === "weekly" ? "weekly" : "daily";
    const period = kind === "weekly"
        ? { start: String(report.start_date || ""), end: String(report.end_date || ""), label: `${report.start_date} 至 ${report.end_date}` }
        : { start: String(report.date || ""), end: String(report.date || ""), label: String(report.date || "") };
    const core = {
        schema: "ccm-work-report-evidence-snapshot-v3",
        version: 3,
        kind,
        reportId: String(report.id || period.start),
        timezone,
        period,
        eventIds: requested,
        events,
        summary: report.summary || {},
        ownership: report.ownership || {},
        changedFiles: Array.isArray(report.changed_files) ? report.changed_files.map(String) : [],
        verificationCount: Number(report.summary?.verifications || 0),
    };
    return { ...core, checksum: checksum(core) };
}
function partitionCompleteEvents(snapshot, tokenBudget) {
    const chunks = [];
    let current = [];
    let used = 0;
    for (const event of snapshot.events) {
        const tokens = Math.max(1, (0, context_budget_1.estimateTextTokens)(JSON.stringify(event)));
        if (tokens > tokenBudget)
            throw new Error(`work_report_event_over_capacity:${event.id}`);
        if (current.length && used + tokens > tokenBudget) {
            chunks.push(current);
            current = [];
            used = 0;
        }
        current.push(event);
        used += tokens;
    }
    if (current.length || !chunks.length)
        chunks.push(current);
    return chunks;
}
function snapshotForEvents(snapshot, events) {
    const core = { ...snapshot, events, eventIds: events.map(event => event.id), checksum: "" };
    core.checksum = checksum({ ...core, checksum: undefined });
    return core;
}
function reportSystemPrompt(mode) {
    return [
        "你是CCM工作报告总结器，只能根据输入的不可变工作事件生成中文结构化报告。",
        "禁止猜测任务状态、完成情况、文件变化或验证结果。每一条事实必须填写真实 evidence_event_ids。",
        "completed只能引用完成或验收通过事件；risks只能引用阻塞、失败、返工或等待事件；quality只能引用验证、验收或TestAgent事件。",
        "输出JSON对象，字段为 headline、overview、completed、highlights、quality、risks、next_actions、confidence。",
        "overview为{text,evidence_event_ids}，其他栏目为同结构数组。不要输出Markdown。",
        mode === "merge" ? "输入包含已经校验的分片总结和完整事件目录，请合并去重，保留原始事件ID。" : "优先提炼业务结果、真实验证、当前风险和下一步，不复述技术协议。",
    ].join("\n");
}
async function summarizeSnapshot(snapshot, options) {
    return (0, semantic_decision_runtime_1.runSemanticDecision)({
        kind: "work_report_summary",
        identity: { scope: "global", scopeId: "work-reports", sessionId: `${snapshot.reportId}:${options.suffix}` },
        system: reportSystemPrompt(options.suffix.startsWith("merge") ? "merge" : "chunk"),
        input: { evidence_snapshot: snapshot },
        validate: value => validateWorkReportSummaryV3(value, snapshot),
        confidence: value => value.confidence,
        maxTokens: 3_000,
        modelCall: options.modelCall,
        config: options.config,
    });
}
async function generateWorkReportSummaryV3(snapshot, options = {}) {
    const config = options.config || (0, group_orchestrator_config_1.loadOrchestratorConfig)();
    if (!snapshot.eventIds.length) {
        const summary = emptyWorkReportSummary(snapshot);
        const generatedAt = new Date().toISOString();
        const receiptCore = {
            schema: "ccm-work-report-generation-receipt-v3",
            version: 3,
            report_id: snapshot.reportId,
            report_kind: snapshot.kind,
            evidence_checksum: snapshot.checksum,
            event_count: 0,
            chunk_count: 0,
            covered_event_ids: [],
            semantic_receipts: [],
            provider: "ccm-evidence-ledger",
            model: "no-evidence",
            generated_at: generatedAt,
            summary_checksum: (0, semantic_decision_runtime_1.semanticDecisionChecksum)(summary),
        };
        return {
            summary,
            receipt: { ...receiptCore, checksum: checksum(receiptCore) },
        };
    }
    const capacity = (0, group_compaction_strategy_1.resolveGroupModelContextCapacity)(config);
    const tokenBudget = Math.max(2_000, Math.min(24_000, Number(capacity.contextWindow || 0) - Number(capacity.reservedOutputTokens || 0) - 5_000));
    const chunks = partitionCompleteEvents(snapshot, tokenBudget);
    const chunkResults = [];
    for (let index = 0; index < chunks.length; index += 1) {
        const chunkSnapshot = snapshotForEvents(snapshot, chunks[index]);
        chunkResults.push(await summarizeSnapshot(chunkSnapshot, { modelCall: options.modelCall, config, suffix: `chunk-${index + 1}-${chunkSnapshot.checksum.slice(0, 12)}` }));
    }
    const receipts = chunkResults.map(item => item.receipt);
    let mergeLevel = 0;
    let current = chunkResults;
    while (current.length > 1) {
        mergeLevel += 1;
        const batches = [];
        let batch = [];
        let batchTokens = 0;
        for (const item of current) {
            const tokens = Math.max(1, (0, context_budget_1.estimateTextTokens)(JSON.stringify(item.value)));
            if (batch.length && batchTokens + tokens > tokenBudget) {
                batches.push(batch);
                batch = [];
                batchTokens = 0;
            }
            batch.push(item);
            batchTokens += tokens;
        }
        if (batch.length)
            batches.push(batch);
        if (batches.length === current.length)
            throw new Error("work_report_merge_over_capacity");
        const merged = [];
        for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
            const source = batches[batchIndex];
            const referencedIds = Array.from(new Set(source.flatMap(item => [item.value.overview, ...item.value.completed, ...item.value.highlights, ...item.value.quality, ...item.value.risks, ...item.value.next_actions].flatMap(row => row.evidence_event_ids))));
            const mergeSnapshot = snapshotForEvents(snapshot, snapshot.events.filter(event => referencedIds.includes(event.id)));
            const result = await (0, semantic_decision_runtime_1.runSemanticDecision)({
                kind: "work_report_summary",
                identity: { scope: "global", scopeId: "work-reports", sessionId: `${snapshot.reportId}:merge-${mergeLevel}-${batchIndex + 1}:${mergeSnapshot.checksum.slice(0, 12)}` },
                system: reportSystemPrompt("merge"),
                input: { evidence_directory: mergeSnapshot.events.map(event => ({ id: event.id, type: event.type, state: event.state, title: event.title })), chunk_summaries: source.map(item => item.value) },
                validate: value => validateWorkReportSummaryV3(value, mergeSnapshot),
                confidence: value => value.confidence,
                maxTokens: 3_000,
                modelCall: options.modelCall,
                config,
            });
            receipts.push(result.receipt);
            merged.push(result);
        }
        current = merged;
    }
    const finalResult = current[0];
    const receiptCore = {
        schema: "ccm-work-report-generation-receipt-v3",
        version: 3,
        report_id: snapshot.reportId,
        report_kind: snapshot.kind,
        evidence_checksum: snapshot.checksum,
        event_count: snapshot.eventIds.length,
        chunk_count: chunks.length,
        covered_event_ids: [...snapshot.eventIds],
        semantic_receipts: receipts,
        provider: finalResult.receipt.provider,
        model: finalResult.receipt.model,
        generated_at: new Date().toISOString(),
        summary_checksum: (0, semantic_decision_runtime_1.semanticDecisionChecksum)(finalResult.value),
    };
    return { summary: finalResult.value, receipt: { ...receiptCore, checksum: checksum(receiptCore) } };
}
function renderItems(items, empty) {
    return items.length ? items.map(item => `- ${item.text}`) : [`- ${empty}`];
}
function renderWorkReportSummaryMarkdownV3(summary, snapshot) {
    const title = snapshot.kind === "weekly" ? `工作周报 ${snapshot.period.label}` : `工作日报 ${snapshot.period.label}`;
    const sections = snapshot.kind === "weekly"
        ? [
            ["本周概览", [summary.overview.text]],
            ["本周完成", renderItems(summary.completed, "本周暂无已验收完成事项")],
            ["重点推进", renderItems(summary.highlights, "本周暂无重点推进事项")],
            ["验收与质量", renderItems(summary.quality, "本周暂无新的验收记录")],
            ["风险与未完成", renderItems(summary.risks, "本周暂无明确风险")],
            ["下周继续", renderItems(summary.next_actions, "等待新的业务需求")],
        ]
        : [
            ["今日概览", [summary.overview.text]],
            ["今天完成", renderItems(summary.completed, "今天暂无已验收完成事项")],
            ["重点推进", renderItems(summary.highlights, "今天暂无重点推进事项")],
            ["验收与质量", renderItems(summary.quality, "今天暂无新的验收记录")],
            ["风险与待处理", renderItems(summary.risks, "今天暂无明确风险")],
            ["明天继续", renderItems(summary.next_actions, "等待新的业务需求")],
        ];
    const markdown = [`# ${title}`, "", summary.headline, "", ...sections.flatMap(([heading, rows]) => [`## ${heading}`, ...rows, ""]), "## 数据依据", `- 工作事件：${snapshot.eventIds.length} 条`, `- 时区：${snapshot.timezone}`, `- 证据校验：${snapshot.checksum.slice(0, 16)}`].join("\n").trim();
    if (markdown.length > 10_000)
        throw new Error(`work_report_card_over_capacity:${markdown.length}`);
    return markdown;
}
//# sourceMappingURL=work-report-ai.js.map