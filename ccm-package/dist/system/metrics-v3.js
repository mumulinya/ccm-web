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
exports.metricsTimezone = metricsTimezone;
exports.metricDateKey = metricDateKey;
exports.recordMetricV3 = recordMetricV3;
exports.ensureLegacyMetricsMigrated = ensureLegacyMetricsMigrated;
exports.loadMetricsDashboardV3 = loadMetricsDashboardV3;
exports.queryMetricEventsV3 = queryMetricEventsV3;
exports.pruneMetricEventsV3 = pruneMetricEventsV3;
exports.resetMetricsV3 = resetMetricsV3;
const crypto = __importStar(require("crypto"));
const observability_database_1 = require("./observability-database");
const trace_sanitizer_1 = require("./trace-sanitizer");
const VALID_STATUS = new Set(["completed", "failed", "cancelled", "blocked", "unknown"]);
const EVENT_RETENTION_DAYS = 180;
const DAILY_RETENTION_DAYS = 730;
const SAMPLE_LIMIT = 240;
function finite(value) {
    const number = Number(value || 0);
    return Number.isFinite(number) && number > 0 ? number : 0;
}
function metricsTimezone() {
    const configured = String(process.env.CCM_METRICS_TIMEZONE || (0, observability_database_1.observabilityMeta)("metrics_timezone", "Asia/Shanghai") || "Asia/Shanghai").trim();
    try {
        new Intl.DateTimeFormat("en-CA", { timeZone: configured }).format(new Date());
        return configured;
    }
    catch {
        return "Asia/Shanghai";
    }
}
function metricDateKey(value = new Date(), timezone = metricsTimezone()) {
    const date = value instanceof Date ? value : new Date(value);
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
    const read = (type) => parts.find(part => part.type === type)?.value || "";
    return `${read("year")}-${read("month")}-${read("day")}`;
}
function normalizedStatus(data) {
    const explicit = String(data.status || "").trim().toLowerCase();
    if (VALID_STATUS.has(explicit))
        return explicit;
    if (data.success === true)
        return "completed";
    if (data.success === false)
        return "failed";
    return "unknown";
}
function normalizedEvent(agentInput, data, now = new Date()) {
    const at = new Date(now).toISOString();
    const timezone = metricsTimezone();
    const agent = String(agentInput || "unknown-agent").trim() || "unknown-agent";
    const groupId = String(data.groupId || data.group_id || "").trim();
    const requestedScope = String(data.scopeType || data.scope_type || data.scope || "").trim().toLowerCase();
    const scopeType = groupId ? "group" : requestedScope === "global" ? "global" : "project";
    const projectId = String(data.projectId || data.project_id || (scopeType === "project" ? data.scopeId || data.scope_id || agent : "")).trim();
    const scopeId = groupId || (scopeType === "global" ? "global" : projectId || "unassigned");
    const role = String(data.role || data.agentRole || data.agent_role || (scopeType === "global" ? "global_agent" : scopeType === "group" ? "member_agent" : "project_agent"));
    const status = normalizedStatus(data);
    const inputTokens = finite(data.inputTokens ?? data.input_tokens ?? data.usage?.inputTokens ?? data.usage?.input_tokens);
    const outputTokens = finite(data.outputTokens ?? data.output_tokens ?? data.usage?.outputTokens ?? data.usage?.output_tokens);
    const totalCostUsd = finite(data.totalCostUsd ?? data.total_cost_usd ?? data.costUsd ?? data.cost_usd ?? data.usage?.totalCostUsd ?? data.usage?.total_cost_usd ?? data.totalCost);
    const executionIdentity = String(data.executionId || data.execution_id || "").trim();
    const stableIdentity = executionIdentity
        ? [executionIdentity, data.source || data.metricSource || data.metric_source, status].filter(Boolean).join(":")
        : "";
    // A task can legitimately contain many model/tool calls with the same role and
    // status. Only an explicit event ID or exact execution ID is safe to dedupe.
    const eventId = String(data.eventId || data.event_id || (stableIdentity
        ? `metric_${crypto.createHash("sha256").update(stableIdentity).digest("hex").slice(0, 32)}`
        : `metric_${Date.now().toString(36)}_${crypto.randomBytes(5).toString("hex")}`));
    return {
        eventId, at, dateKey: metricDateKey(at, timezone), timezone, scopeType, scopeId, groupId, projectId,
        agent, role, source: String(data.source || data.metricSource || data.metric_source || "agent-execution"),
        runtime: String(data.runtime || data.agentType || data.agent_type || ""), status,
        durationMs: finite(data.durationMs ?? data.duration_ms), fileChangeCount: finite(data.fileChangeCount ?? data.file_change_count),
        inputTokens, outputTokens, totalCostUsd,
        traceId: String(data.traceId || data.trace_id || ""), taskId: String(data.taskId || data.task_id || ""),
        executionId: String(data.executionId || data.execution_id || ""),
        error: status === "completed" ? "" : String((0, trace_sanitizer_1.sanitizeTraceValue)(String(data.error || data.message || ""))).slice(0, 300),
        usageReported: inputTokens > 0 || outputTokens > 0 || totalCostUsd > 0,
    };
}
function updateAggregate(db, event, bucketDate) {
    const existing = db.prepare(`SELECT * FROM metric_aggregates_v3 WHERE bucket_date=? AND scope_type=? AND scope_id=? AND role=? AND agent=?`).get(bucketDate, event.scopeType, event.scopeId, event.role, event.agent);
    const samples = existing ? (() => { try {
        return JSON.parse(existing.duration_samples_json || "[]");
    }
    catch {
        return [];
    } })() : [];
    if (event.durationMs > 0)
        samples.push(event.durationMs);
    if (samples.length > SAMPLE_LIMIT)
        samples.splice(0, samples.length - SAMPLE_LIMIT);
    db.prepare(`INSERT INTO metric_aggregates_v3(
    bucket_date, scope_type, scope_id, role, agent, calls, successes, failures, blocked, cancelled, unknown,
    total_ms, total_file_changes, last_file_change_count, input_tokens, output_tokens, total_cost_usd,
    usage_reported_calls, duration_samples_json, last_call
  ) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(bucket_date, scope_type, scope_id, role, agent) DO UPDATE SET
    calls=calls+1, successes=successes+excluded.successes, failures=failures+excluded.failures,
    blocked=blocked+excluded.blocked, cancelled=cancelled+excluded.cancelled, unknown=unknown+excluded.unknown,
    total_ms=total_ms+excluded.total_ms, total_file_changes=total_file_changes+excluded.total_file_changes,
    last_file_change_count=excluded.last_file_change_count, input_tokens=input_tokens+excluded.input_tokens,
    output_tokens=output_tokens+excluded.output_tokens, total_cost_usd=total_cost_usd+excluded.total_cost_usd,
    usage_reported_calls=usage_reported_calls+excluded.usage_reported_calls,
    duration_samples_json=excluded.duration_samples_json, last_call=excluded.last_call`).run(bucketDate, event.scopeType, event.scopeId, event.role, event.agent, event.status === "completed" ? 1 : 0, event.status === "failed" ? 1 : 0, event.status === "blocked" ? 1 : 0, event.status === "cancelled" ? 1 : 0, event.status === "unknown" ? 1 : 0, event.durationMs, event.fileChangeCount, event.fileChangeCount, event.inputTokens, event.outputTokens, event.totalCostUsd, event.usageReported ? 1 : 0, JSON.stringify(samples), event.at);
}
function insertEvent(db, event) {
    const result = db.prepare(`INSERT OR IGNORE INTO metric_events_v3(
    event_id, at, date_key, timezone, scope_type, scope_id, group_id, project_id, agent, role, source,
    runtime, status, duration_ms, file_change_count, input_tokens, output_tokens, total_cost_usd,
    trace_id, task_id, execution_id, error, usage_reported, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(event.eventId, event.at, event.dateKey, event.timezone, event.scopeType, event.scopeId, event.groupId, event.projectId, event.agent, event.role, event.source, event.runtime, event.status, event.durationMs, event.fileChangeCount, event.inputTokens, event.outputTokens, event.totalCostUsd, event.traceId, event.taskId, event.executionId, event.error, event.usageReported ? 1 : 0, new Date().toISOString());
    if (result.changes !== 1)
        return false;
    updateAggregate(db, event, "");
    updateAggregate(db, event, event.dateKey);
    return true;
}
function recordMetricV3(agent, data, now = new Date()) {
    const event = normalizedEvent(agent, data, now);
    const inserted = (0, observability_database_1.withImmediateObservabilityTransaction)(db => insertEvent(db, event));
    return { inserted, event };
}
function ensureLegacyMetricsMigrated(store) {
    if ((0, observability_database_1.observabilityMeta)("metrics_v3_legacy_migration", null)?.completed)
        return { migrated: false, count: 0 };
    const events = Array.isArray(store?.events) ? store.events : [];
    const count = (0, observability_database_1.withImmediateObservabilityTransaction)(db => {
        let inserted = 0;
        for (const legacy of events) {
            const event = normalizedEvent(String(legacy.agent || "unknown-agent"), {
                ...legacy,
                eventId: legacy.id,
                scopeType: legacy.scopeType,
                scopeId: legacy.scopeId,
                groupId: legacy.groupId,
                projectId: legacy.projectId,
                durationMs: legacy.durationMs,
                fileChangeCount: legacy.fileChangeCount,
                inputTokens: legacy.inputTokens,
                outputTokens: legacy.outputTokens,
                totalCostUsd: legacy.totalCostUsd,
                traceId: legacy.traceId,
                taskId: legacy.taskId,
                executionId: legacy.executionId,
                status: VALID_STATUS.has(String(legacy.status || "")) ? legacy.status : legacy.success === true ? "completed" : legacy.success === false ? "failed" : "unknown",
            }, legacy.at || new Date());
            if (insertEvent(db, event))
                inserted += 1;
        }
        return inserted;
    });
    (0, observability_database_1.setObservabilityMeta)("metrics_v3_legacy_migration", { completed: true, migrated_at: new Date().toISOString(), source_events: events.length, inserted: count });
    return { migrated: true, count };
}
function aggregateView(row) {
    let samples = [];
    try {
        samples = JSON.parse(row.duration_samples_json || "[]");
    }
    catch { }
    return {
        calls: Number(row.calls || 0), successes: Number(row.successes || 0), failures: Number(row.failures || 0),
        blocked: Number(row.blocked || 0), cancelled: Number(row.cancelled || 0), unknown: Number(row.unknown || 0),
        totalMs: Number(row.total_ms || 0), avgMs: Number(row.calls || 0) ? Math.round(Number(row.total_ms || 0) / Number(row.calls || 1)) : 0,
        totalFileChanges: Number(row.total_file_changes || 0), lastFileChangeCount: Number(row.last_file_change_count || 0),
        inputTokens: Number(row.input_tokens || 0), outputTokens: Number(row.output_tokens || 0),
        totalCostUsd: Number(row.total_cost_usd || 0), totalCost: Number(row.total_cost_usd || 0),
        usageReportedCalls: Number(row.usage_reported_calls || 0), durationsMs: samples, lastCall: row.last_call || null,
    };
}
function loadMetricsDashboardV3() {
    const rows = (0, observability_database_1.getObservabilityDatabase)().prepare("SELECT * FROM metric_aggregates_v3 ORDER BY bucket_date, scope_type, scope_id, role, agent").all();
    const metrics = { version: 3, schema: "ccm-metrics-dashboard-v3", agents: {}, daily: {}, scopes: {}, events: [], updatedAt: null, timezone: metricsTimezone() };
    for (const row of rows) {
        const scopeKey = `${row.scope_type}:${row.scope_id}`;
        const scope = metrics.scopes[scopeKey] ||= { key: scopeKey, type: row.scope_type, id: row.scope_id, groupId: row.scope_type === "group" ? row.scope_id : "", agents: {}, roles: {}, daily: {}, dailyRoles: {}, updatedAt: null };
        const view = aggregateView(row);
        if (!row.bucket_date) {
            scope.agents[row.agent] = view;
            (scope.roles[row.role] ||= {})[row.agent] = view;
            scope.updatedAt = !scope.updatedAt || String(view.lastCall) > String(scope.updatedAt) ? view.lastCall : scope.updatedAt;
            metrics.updatedAt = !metrics.updatedAt || String(view.lastCall) > String(metrics.updatedAt) ? view.lastCall : metrics.updatedAt;
        }
        else {
            (scope.daily[row.bucket_date] ||= {})[row.agent] = view;
            ((scope.dailyRoles[row.bucket_date] ||= {})[row.role] ||= {})[row.agent] = view;
        }
    }
    return metrics;
}
function validDate(value) {
    const text = String(value || "").trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}
function queryMetricEventsV3(filters = {}) {
    const scopeType = String(filters.scopeType || filters.scope_type || "").trim().toLowerCase();
    const scopeId = String(filters.scopeId || filters.scope_id || "").trim();
    const requestedStatus = String(filters.status || "all").trim().toLowerCase();
    const status = VALID_STATUS.has(requestedStatus) ? requestedStatus : "all";
    const days = Math.max(0, Math.floor(Number(filters.days) || 0));
    const pageSize = Math.max(5, Math.min(100, Math.floor(Number(filters.pageSize || filters.page_size) || 20)));
    const requestedPage = Math.max(1, Math.floor(Number(filters.page) || 1));
    let fromDate = validDate(filters.fromDate || filters.from_date);
    const toDate = validDate(filters.toDate || filters.to_date);
    if (!fromDate && days > 0)
        fromDate = metricDateKey(Date.now() - (days - 1) * 86400000);
    const clauses = [];
    const params = [];
    if (scopeType) {
        clauses.push("scope_type = ?");
        params.push(scopeType);
    }
    if (scopeId) {
        clauses.push("scope_id = ?");
        params.push(scopeId);
    }
    if (fromDate) {
        clauses.push("date_key >= ?");
        params.push(fromDate);
    }
    if (toDate) {
        clauses.push("date_key <= ?");
        params.push(toDate);
    }
    const baseWhere = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const db = (0, observability_database_1.getObservabilityDatabase)();
    const countRows = db.prepare(`SELECT status, COUNT(*) count FROM metric_events_v3 ${baseWhere} GROUP BY status`).all(...params);
    const statusCounts = { all: 0, completed: 0, failed: 0, cancelled: 0, blocked: 0, unknown: 0 };
    for (const row of countRows) {
        statusCounts[row.status] = Number(row.count || 0);
        statusCounts.all += Number(row.count || 0);
    }
    const filteredClauses = [...clauses];
    const filteredParams = [...params];
    if (status !== "all") {
        filteredClauses.push("status = ?");
        filteredParams.push(status);
    }
    const where = filteredClauses.length ? `WHERE ${filteredClauses.join(" AND ")}` : "";
    const total = Number(db.prepare(`SELECT COUNT(*) count FROM metric_events_v3 ${where}`).get(...filteredParams)?.count || 0);
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(requestedPage, totalPages);
    const offset = (page - 1) * pageSize;
    const rows = db.prepare(`SELECT * FROM metric_events_v3 ${where} ORDER BY at DESC, event_id DESC LIMIT ? OFFSET ?`).all(...filteredParams, pageSize, offset);
    const events = rows.map(row => ({
        id: row.event_id, at: row.at, date: row.date_key, timezone: row.timezone, scopeType: row.scope_type,
        scopeId: row.scope_id, groupId: row.group_id, projectId: row.project_id, agent: row.agent, role: row.role,
        source: row.source, runtime: row.runtime, status: row.status, resolvedStatus: row.status,
        success: row.status === "completed", durationMs: Number(row.duration_ms || 0), fileChangeCount: Number(row.file_change_count || 0),
        inputTokens: Number(row.input_tokens || 0), outputTokens: Number(row.output_tokens || 0), totalCostUsd: Number(row.total_cost_usd || 0),
        traceId: row.trace_id, taskId: row.task_id, executionId: row.execution_id, error: row.error,
        usageReported: row.usage_reported === 1,
    }));
    return { events, total, page, pageSize, totalPages, status, statusCounts, retentionDays: EVENT_RETENTION_DAYS, timezone: metricsTimezone(), range: { days, fromDate: fromDate || null, toDate: toDate || null } };
}
function pruneMetricEventsV3(force = false) {
    const previous = (0, observability_database_1.observabilityMeta)("metrics_v3_last_prune", null);
    if (!force && previous?.at && Date.now() - Date.parse(previous.at) < 24 * 60 * 60_000)
        return { skipped: true, ...previous };
    const eventBefore = new Date(Date.now() - EVENT_RETENTION_DAYS * 86400000).toISOString();
    const dailyBefore = metricDateKey(Date.now() - DAILY_RETENTION_DAYS * 86400000);
    const result = (0, observability_database_1.withImmediateObservabilityTransaction)(db => ({
        events: db.prepare("DELETE FROM metric_events_v3 WHERE at < ?").run(eventBefore).changes,
        daily: db.prepare("DELETE FROM metric_aggregates_v3 WHERE bucket_date <> '' AND bucket_date < ?").run(dailyBefore).changes,
    }));
    const receipt = { at: new Date().toISOString(), event_retention_days: EVENT_RETENTION_DAYS, daily_retention_days: DAILY_RETENTION_DAYS, ...result };
    (0, observability_database_1.setObservabilityMeta)("metrics_v3_last_prune", receipt);
    return { skipped: false, ...receipt };
}
function resetMetricsV3() {
    return (0, observability_database_1.withImmediateObservabilityTransaction)(db => {
        const events = db.prepare("DELETE FROM metric_events_v3").run().changes;
        const aggregates = db.prepare("DELETE FROM metric_aggregates_v3").run().changes;
        return { events, aggregates, reset_at: new Date().toISOString() };
    });
}
//# sourceMappingURL=metrics-v3.js.map