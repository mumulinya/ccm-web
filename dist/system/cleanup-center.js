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
exports.getCleanupHistory = getCleanupHistory;
exports.getCleanupSummary = getCleanupSummary;
exports.previewCleanupAction = previewCleanupAction;
exports.getCleanupTransaction = getCleanupTransaction;
exports.runCleanupAction = runCleanupAction;
exports.cancelCleanupTransaction = cancelCleanupTransaction;
exports.resumeCleanupTransaction = resumeCleanupTransaction;
exports.recoverCleanupTransactions = recoverCleanupTransactions;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const db_1 = require("../core/db");
const task_store_1 = require("../core/task-store");
const atomic_json_file_1 = require("../core/atomic-json-file");
const utils_1 = require("../core/utils");
const attachment_reference_registry_1 = require("./attachment-reference-registry");
const collaboration_1 = require("../modules/collaboration/collaboration");
const chat_runs_1 = require("../projects/chat-runs");
const observability_database_1 = require("./observability-database");
const storage_index_1 = require("./storage-index");
const metrics_v3_1 = require("./metrics-v3");
const runtime_schema_policy_1 = require("./runtime-schema-policy");
const CLEANUP_DIR = path.join(utils_1.CCM_DIR, "cleanup-center");
const CLEANUP_LOCK_FILE = path.join(CLEANUP_DIR, "operation");
const CLEANUP_AUDIT_FILE = path.join(CLEANUP_DIR, "audit.jsonl");
const PREVIEW_TTL_MS = 10 * 60_000;
const DEFAULT_RETENTION_DAYS = 30;
const RETENTION_OPTIONS = [7, 30, 90, 180, 0];
const activeCleanupExecutions = new Set();
const ACTIONS = {
    archive_failed_project_runs: {
        id: "archive_failed_project_runs",
        label: "归档失败的项目运行",
        description: "从进行中列表移走失败记录，仍可保留用于复盘。",
        risk: "safe",
        irreversible: false,
    },
    purge_archived_tasks: {
        id: "purge_archived_tasks",
        label: "永久删除已归档任务",
        description: "同时清理子 Agent 会话、TestAgent 证据、任务回放和执行工作树。",
        risk: "danger",
        irreversible: true,
    },
    purge_archived_cron: {
        id: "purge_archived_cron",
        label: "永久删除已归档定时任务",
        description: "永久移除不再需要的定时任务配置。",
        risk: "danger",
        irreversible: true,
    },
    purge_archived_project_runs: {
        id: "purge_archived_project_runs",
        label: "永久删除已归档项目运行",
        description: "永久移除项目运行记录及关联会话和执行产物。",
        risk: "danger",
        irreversible: true,
    },
    purge_orphan_uploads: {
        id: "purge_orphan_uploads",
        label: "清理孤立上传附件",
        description: "删除超过24小时且没有任何任务引用的上传文件。",
        risk: "danger",
        irreversible: true,
    },
    purge_read_notifications: {
        id: "purge_read_notifications",
        label: "清理已读通知",
        description: "删除超过保留期的已读或已取消提醒通知；未解决的权限和阻塞通知始终保留。",
        risk: "danger",
        irreversible: true,
    },
    purge_music_runtime: {
        id: "purge_music_runtime",
        label: "清理音乐运行记录与临时文件",
        description: "清理过期播放命令、下载记录、已完成重复项隔离文件和CCM拥有的媒体临时文件，不删除正式歌曲、歌单或播放历史。",
        risk: "danger",
        irreversible: true,
    },
    reset_metrics: {
        id: "reset_metrics",
        label: "重置性能指标",
        description: "清空性能执行明细与聚合，保留本次高风险审计摘要。",
        risk: "danger",
        irreversible: true,
    },
    purge_retired_runtime_data: {
        id: "purge_retired_runtime_data",
        label: "永久清理已退役运行数据",
        description: "仅清理已被当前Schema替代的会话、任务、记忆、压缩、缓存和验收运行记录，不触碰配置或项目仓库。",
        risk: "danger",
        irreversible: true,
    },
};
function readJsonSafe(file, fallback = null) {
    try {
        if (!fs.existsSync(file))
            return fallback;
        return JSON.parse(fs.readFileSync(file, "utf-8"));
    }
    catch {
        return fallback;
    }
}
function countFilesAndBytes(target) {
    const result = { files: 0, bytes: 0 };
    const walk = (entry) => {
        if (!fs.existsSync(entry))
            return;
        const stat = fs.statSync(entry);
        if (stat.isFile()) {
            result.files += 1;
            result.bytes += stat.size;
            return;
        }
        if (!stat.isDirectory())
            return;
        for (const name of fs.readdirSync(entry))
            walk(path.join(entry, name));
    };
    try {
        walk(target);
    }
    catch { }
    return result;
}
function fileBytes(file) {
    try {
        return fs.statSync(file).size;
    }
    catch {
        return 0;
    }
}
function normalizedRetentionDays(value) {
    const days = Number(value);
    return RETENTION_OPTIONS.includes(days) ? days : DEFAULT_RETENTION_DAYS;
}
function recordTimestamp(record, fields) {
    for (const field of fields) {
        const value = record?.[field];
        if (!value)
            continue;
        const timestamp = Date.parse(String(value));
        if (Number.isFinite(timestamp))
            return timestamp;
    }
    return null;
}
function matchesRetention(record, retentionDays, fields) {
    if (retentionDays === 0)
        return true;
    const timestamp = recordTimestamp(record, fields);
    if (timestamp === null)
        return false;
    return timestamp <= Date.now() - retentionDays * 24 * 60 * 60_000;
}
function candidateFingerprint(value) {
    return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
function tokenChecksum(token) {
    return crypto.createHash("sha256").update(token).digest("hex");
}
function cleanupExpiredPreviews() {
    (0, observability_database_1.getObservabilityDatabase)().prepare("DELETE FROM cleanup_previews_v2 WHERE expires_at < ? OR consumed_at IS NOT NULL").run(new Date().toISOString());
}
function taskCandidate(task) {
    return {
        id: String(task.id || ""),
        title: task.title || task.description || task.message || task.goal || "未命名任务",
        status: task.status || "archived",
        project: task.target_project || task.project || task.group_id || "",
        updated_at: task.archived_at || task.deleted_at || task.updated_at || task.created_at || "",
        fingerprint: candidateFingerprint({
            id: task.id,
            status: task.status,
            archived: !!task.archived,
            deleted_at: task.deleted_at || "",
            updated_at: task.updated_at || "",
        }),
    };
}
function cronCandidate(job) {
    return {
        id: String(job.id || ""),
        title: job.name || job.title || "未命名定时任务",
        status: "archived",
        project: job.project || job.group_id || job.target || "",
        updated_at: job.archived_at || job.deleted_at || job.updated_at || job.created_at || "",
        fingerprint: candidateFingerprint({
            id: job.id,
            archived: !!job.archived,
            deleted_at: job.deleted_at || "",
            updated_at: job.updated_at || "",
        }),
    };
}
function projectRunCandidate(run) {
    return {
        id: String(run.id || ""),
        title: run.message || run.project || "项目运行",
        status: run.status || "",
        project: run.project || "",
        updated_at: run.archived_at || run.deleted_at || run.updated_at || run.created_at || "",
        fingerprint: candidateFingerprint({
            id: run.id,
            status: run.status,
            archived: !!run.archived,
            deleted_at: run.deleted_at || "",
            updated_at: run.updated_at || "",
        }),
    };
}
function listCleanupCandidates(action, retentionDays) {
    const dateFields = ["archived_at", "deleted_at", "updated_at", "created_at"];
    let candidates = [];
    if (action === "purge_archived_tasks") {
        candidates = (0, db_1.loadTasks)()
            .filter((task) => task.archived || task.deleted_at || task.status === "archived")
            .filter((task) => matchesRetention(task, retentionDays, dateFields))
            .map(taskCandidate);
    }
    else if (action === "purge_archived_cron") {
        candidates = (0, db_1.loadCronJobs)()
            .filter((job) => job.archived || job.deleted_at)
            .filter((job) => matchesRetention(job, retentionDays, dateFields))
            .map(cronCandidate);
    }
    else if (action === "purge_archived_project_runs") {
        candidates = [...chat_runs_1.projectChatRuns.values()]
            .filter((run) => run.archived || run.deleted_at || run.status === "archived")
            .filter((run) => matchesRetention(run, retentionDays, dateFields))
            .map(projectRunCandidate);
    }
    else if (action === "archive_failed_project_runs") {
        candidates = [...chat_runs_1.projectChatRuns.values()]
            .filter((run) => run.status === "failed" && !run.archived && !run.deleted_at)
            .filter((run) => matchesRetention(run, retentionDays, ["updated_at", "created_at"]))
            .map(projectRunCandidate);
    }
    else if (action === "purge_orphan_uploads") {
        candidates = (0, attachment_reference_registry_1.listOrphanAttachments)(24 * 60 * 60_000).map((item) => ({
            id: item.id,
            title: item.id,
            status: "orphan",
            project: "未被任务引用",
            updated_at: item.updated_at,
            fingerprint: candidateFingerprint(item),
        }));
    }
    else if (action === "purge_read_notifications") {
        const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60_000).toISOString();
        const rows = (0, observability_database_1.getObservabilityDatabase)().prepare(`
      SELECT notification_id,title,notification_type,state,read_at,dismissed_at,updated_at
      FROM user_notifications_v2
      WHERE (read_at IS NOT NULL OR dismissed_at IS NOT NULL)
        AND updated_at <= ?
        AND NOT (state='active' AND notification_type IN ('permission_required','needs_user'))
      ORDER BY updated_at ASC
    `).all(cutoff);
        candidates = rows.map(row => ({
            id: String(row.notification_id || ""),
            title: String(row.title || "已读通知"),
            status: String(row.state || "resolved"),
            project: "通知中心",
            updated_at: String(row.updated_at || ""),
            fingerprint: candidateFingerprint(row),
        }));
    }
    else if (action === "purge_music_runtime") {
        const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60_000).toISOString();
        const db = (0, observability_database_1.getObservabilityDatabase)();
        const commands = db.prepare(`
      SELECT command_id,status,updated_at FROM music_playback_commands_v3
      WHERE status IN ('completed','failed','superseded','cancelled') AND updated_at <= ?
    `).all(cutoff);
        const downloads = db.prepare(`
      SELECT job_id,status,updated_at FROM music_download_jobs_v2
      WHERE status IN ('done','failed','cancelled') AND updated_at <= ?
    `).all(cutoff);
        const duplicates = db.prepare(`
      SELECT transaction_id,status,updated_at FROM music_duplicate_transactions_v1
      WHERE status IN ('completed','rolled_back') AND updated_at <= ?
    `).all(cutoff);
        const musicDir = path.resolve(utils_1.CCM_DIR, "music");
        const temporaryFiles = [];
        try {
            for (const filename of fs.readdirSync(musicDir)) {
                if (!/\.(?:ccm-part|ccm-backup)$/i.test(filename))
                    continue;
                const target = path.resolve(musicDir, filename);
                const stat = fs.lstatSync(target);
                if (!stat.isFile() || stat.isSymbolicLink() || stat.mtime.toISOString() > cutoff)
                    continue;
                temporaryFiles.push({
                    id: `temp:${Buffer.from(filename, "utf8").toString("base64url")}`,
                    title: filename,
                    status: "orphan",
                    project: "音乐媒体临时文件",
                    updated_at: stat.mtime.toISOString(),
                    fingerprint: candidateFingerprint({ filename, size: stat.size, mtime: stat.mtimeMs }),
                });
            }
        }
        catch { }
        candidates = [
            ...commands.map(row => ({ id: `command:${row.command_id}`, title: "过期播放命令", status: row.status, project: "音乐播放器", updated_at: row.updated_at, fingerprint: candidateFingerprint(row) })),
            ...downloads.map(row => ({ id: `download:${row.job_id}`, title: "历史下载任务", status: row.status, project: "下载中心", updated_at: row.updated_at, fingerprint: candidateFingerprint(row) })),
            ...duplicates.map(row => ({ id: `duplicate:${row.transaction_id}`, title: "已完成重复项隔离文件", status: row.status, project: "曲库重复治理", updated_at: row.updated_at, fingerprint: candidateFingerprint(row) })),
            ...temporaryFiles,
        ];
    }
    else if (action === "reset_metrics") {
        const metricState = (0, observability_database_1.getObservabilityDatabase)().prepare("SELECT COUNT(*) count,MAX(created_at) latest FROM metric_events_v3").get();
        candidates = [{
                id: "all_metrics",
                title: "全部性能指标与执行明细",
                status: "active",
                project: "整个 CCM 工作区",
                updated_at: metricState?.latest || "",
                fingerprint: candidateFingerprint({ id: "all_metrics", metric_store: "v3", count: Number(metricState?.count || 0), latest: metricState?.latest || "" }),
            }];
    }
    else if (action === "purge_retired_runtime_data") {
        candidates = (0, runtime_schema_policy_1.publicRetiredRuntimeCandidates)().map((item) => ({
            id: item.id,
            title: `已退役运行数据 · ${item.domain}`,
            status: "retired",
            project: `${item.recordCount} 条记录 · ${item.retiredSchemas.length} 种Schema`,
            updated_at: "",
            fingerprint: item.fingerprint,
        }));
    }
    return candidates
        .filter(candidate => !!candidate.id)
        .sort((a, b) => String(a.updated_at).localeCompare(String(b.updated_at)) || a.id.localeCompare(b.id));
}
function getStorageStats() {
    const index = (0, storage_index_1.getStorageIndexStatus)();
    const empty = { files: 0, bytes: 0, errors: 0, skipped_links: 0 };
    const summary = index.summary || {};
    return {
        executions: summary.executions || empty,
        checkpoints: summary.checkpoints || empty,
        outputs: summary.outputs || empty,
        projectSessions: summary.projectSessions || empty,
        groupMessages: summary.groupMessages || empty,
        testArtifacts: summary.testArtifacts || empty,
        testRuns: summary.testRuns || empty,
        replay: summary.replay || empty,
        uploads: summary.uploads || empty,
        totalBytes: Number(summary.totalBytes || 0),
        index,
    };
}
function appendCleanupAudit(record) {
    fs.mkdirSync(path.dirname(CLEANUP_AUDIT_FILE), { recursive: true });
    if (fs.existsSync(CLEANUP_AUDIT_FILE) && fs.statSync(CLEANUP_AUDIT_FILE).size > 2 * 1024 * 1024) {
        const rows = fs.readFileSync(CLEANUP_AUDIT_FILE, "utf-8").split(/\r?\n/).filter(Boolean).slice(-500);
        fs.writeFileSync(CLEANUP_AUDIT_FILE, rows.length ? `${rows.join("\n")}\n` : "", "utf-8");
    }
    fs.appendFileSync(CLEANUP_AUDIT_FILE, `${JSON.stringify(record)}\n`, "utf-8");
}
function getCleanupHistory(limit = 40) {
    const size = Math.max(1, Math.min(100, Number(limit) || 40));
    const v2 = (0, observability_database_1.getObservabilityDatabase)().prepare("SELECT * FROM cleanup_transactions_v2 WHERE status IN ('completed','partial','failed','cancelled') ORDER BY COALESCE(completed_at,updated_at) DESC LIMIT ?").all(size).map((row) => ({
        schema: "ccm-cleanup-transaction-v2",
        id: row.transaction_id,
        transaction_id: row.transaction_id,
        action: row.action,
        label: ACTIONS[row.action]?.label || row.action,
        status: row.status === "completed" ? "success" : row.status,
        retention_days: row.retention_days,
        requested_count: row.requested_count,
        processed_count: row.processed_count,
        failed_count: row.failed_count,
        released_bytes: row.released_bytes,
        started_at: row.started_at,
        completed_at: row.completed_at,
        error: row.error_summary || "",
    }));
    if (!fs.existsSync(CLEANUP_AUDIT_FILE))
        return v2;
    try {
        const legacy = fs.readFileSync(CLEANUP_AUDIT_FILE, "utf-8")
            .split(/\r?\n/)
            .filter(Boolean)
            .slice(-size)
            .reverse()
            .map(line => {
            try {
                return JSON.parse(line);
            }
            catch {
                return null;
            }
        })
            .filter(Boolean);
        return [...v2, ...legacy].sort((a, b) => String(b.completed_at || "").localeCompare(String(a.completed_at || ""))).slice(0, size);
    }
    catch {
        return v2;
    }
}
function getCleanupSummary() {
    const attachmentRegistry = (0, attachment_reference_registry_1.readAttachmentReferenceRegistry)();
    const tasks = (0, db_1.loadTasks)();
    const cronJobs = (0, db_1.loadCronJobs)();
    const projectRuns = [...chat_runs_1.projectChatRuns.values()];
    const groups = readJsonSafe(utils_1.GROUPS_FILE, []);
    const globalHistoryFile = path.join(utils_1.CCM_DIR, "global-agent-history.json");
    const globalHistory = readJsonSafe(globalHistoryFile, { sessions: [] });
    const storage = getStorageStats();
    const retiredRuntimeData = (0, runtime_schema_policy_1.scanRetiredRuntimeData)();
    const groupRows = Array.isArray(groups) ? groups.map((group) => {
        const file = path.join(utils_1.GROUP_MESSAGES_DIR, `${group.id}.json`);
        const messages = readJsonSafe(file, []);
        return {
            id: group.id,
            title: group.name || group.id,
            type: "群聊会话",
            count: Array.isArray(messages) ? messages.length : 0,
            bytes: fileBytes(file),
            updated_at: "",
        };
    }) : [];
    const globalSessions = Array.isArray(globalHistory.sessions) ? globalHistory.sessions : [];
    const projectSessionCount = storage.projectSessions.files;
    const conversationCount = projectSessionCount + groupRows.length + globalSessions.length;
    const qualityFiles = storage.testArtifacts.files + storage.testRuns.files + storage.replay.files;
    const qualityBytes = storage.testArtifacts.bytes + storage.testRuns.bytes + storage.replay.bytes;
    const executionFiles = storage.executions.files + storage.checkpoints.files + storage.outputs.files;
    const executionBytes = storage.executions.bytes + storage.checkpoints.bytes + storage.outputs.bytes;
    const defaultCandidates = Object.fromEntries(Object.keys(ACTIONS).map(action => [
        action,
        listCleanupCandidates(action, action === "purge_read_notifications" ? 180 : DEFAULT_RETENTION_DAYS),
    ]));
    const activeTransactions = (0, observability_database_1.getObservabilityDatabase)().prepare("SELECT * FROM cleanup_transactions_v2 WHERE status IN ('previewed','claimed','executing') ORDER BY created_at DESC LIMIT 5").all()
        .map((row) => publicCleanupTransaction(row, { limit: 20 }));
    const cards = [
        {
            id: "uploads",
            title: "需求附件",
            count: storage.uploads.files,
            bytes: storage.uploads.bytes,
            detail: `${attachmentRegistry.items.filter((item) => item.reference_count === 0).length} 个当前无任务引用`,
        },
        {
            id: "tasks",
            title: "任务记录",
            count: tasks.length,
            bytes: (() => {
                try {
                    const status = (0, task_store_1.getSqliteTaskStoreStatus)();
                    return Number(status.database_bytes || 0) + Number(status.wal_bytes || 0) + Number(status.shm_bytes || 0);
                }
                catch {
                    return fileBytes(path.join(utils_1.CCM_DIR, "ccm.db")) || fileBytes(path.join(utils_1.CCM_DIR, "tasks.json"));
                }
            })(),
            detail: `${tasks.filter((task) => task.archived || task.deleted_at || task.status === "archived").length} 项已归档`,
        },
        {
            id: "cron",
            title: "定时任务",
            count: cronJobs.length,
            bytes: fileBytes(path.join(utils_1.CCM_DIR, "cron-jobs.json")),
            detail: `${cronJobs.filter((job) => job.archived || job.deleted_at).length} 项已归档`,
        },
        {
            id: "project_runs",
            title: "项目运行",
            count: projectRuns.length,
            bytes: fileBytes(path.join(utils_1.CCM_DIR, "project-chat-runs.json")),
            detail: `${projectRuns.filter((run) => run.status === "failed").length} 项失败`,
        },
        {
            id: "conversations",
            title: "会话数据",
            count: conversationCount,
            bytes: storage.projectSessions.bytes + storage.groupMessages.bytes + fileBytes(globalHistoryFile),
            detail: "项目、群聊与全局会话",
        },
        {
            id: "execution_artifacts",
            title: "执行产物",
            count: executionFiles,
            bytes: executionBytes,
            detail: "执行记录、检查点和输出",
        },
        {
            id: "quality_evidence",
            title: "测试与回放证据",
            count: qualityFiles,
            bytes: qualityBytes,
            detail: "TestAgent 证据和任务回放",
        },
    ];
    return {
        success: true,
        updated_at: new Date().toISOString(),
        policy: {
            default_retention_days: DEFAULT_RETENTION_DAYS,
            retention_options: RETENTION_OPTIONS,
            preview_ttl_minutes: PREVIEW_TTL_MS / 60_000,
        },
        storage: { total_bytes: storage.totalBytes, index: storage.index },
        retired_runtime_data: {
            schema: "ccm-retired-runtime-data-summary-v1",
            summaries: retiredRuntimeData.summaries,
            total_records: retiredRuntimeData.totals.records,
            total_files: retiredRuntimeData.totals.files,
            total_bytes: retiredRuntimeData.totals.bytes,
            contentStored: false,
        },
        cards,
        rows: {
            tasks: tasks.slice(-200).reverse().map((task) => ({
                id: task.id,
                title: task.title || task.description || task.message || task.goal || "未命名任务",
                status: task.status || "",
                project: task.target_project || task.project || task.group_id || "",
                updated_at: task.updated_at || task.created_at || "",
            })),
            cron: cronJobs.slice(-200).reverse().map((job) => ({
                id: job.id,
                title: job.name || job.title || "未命名定时任务",
                status: job.archived || job.deleted_at ? "archived" : job.enabled === false ? "disabled" : "enabled",
                project: job.project || job.group_id || job.target || "",
                updated_at: job.updated_at || job.created_at || "",
            })),
            project_runs: projectRuns.slice(-200).reverse().map((run) => ({
                id: run.id,
                title: run.message || run.project || "项目运行",
                status: run.status || "",
                project: run.project || "",
                updated_at: run.updated_at || run.created_at || "",
            })),
            conversations: [
                ...groupRows,
                ...globalSessions.slice(-100).reverse().map((session) => ({
                    id: session.id,
                    title: session.name || session.title || session.id || "全局会话",
                    type: "全局 Agent 会话",
                    count: Array.isArray(session.messages) ? session.messages.length : 0,
                    bytes: 0,
                    updated_at: session.updatedAt || session.updated_at || session.createdAt || "",
                })),
                { id: "project-sessions", title: "项目会话文件", type: "项目会话", count: projectSessionCount, bytes: storage.projectSessions.bytes, updated_at: "" },
            ],
            execution_artifacts: [
                { id: "executions", title: "执行记录", type: "执行产物", count: storage.executions.files, bytes: storage.executions.bytes },
                { id: "checkpoints", title: "执行检查点", type: "执行产物", count: storage.checkpoints.files, bytes: storage.checkpoints.bytes },
                { id: "outputs", title: "执行输出", type: "执行产物", count: storage.outputs.files, bytes: storage.outputs.bytes },
            ],
            quality_evidence: [
                { id: "test-artifacts", title: "TestAgent 截图与浏览器证据", type: "测试证据", count: storage.testArtifacts.files, bytes: storage.testArtifacts.bytes },
                { id: "test-runs", title: "TestAgent 运行记录", type: "测试证据", count: storage.testRuns.files, bytes: storage.testRuns.bytes },
                { id: "task-replay", title: "任务回放日志", type: "回放证据", count: storage.replay.files, bytes: storage.replay.bytes },
            ],
            uploads: attachmentRegistry.items.slice(-200).reverse().map((item) => ({
                id: item.id,
                title: item.id,
                type: item.reference_count ? "任务附件" : "未引用附件",
                count: item.reference_count,
                bytes: item.bytes,
                updated_at: item.updated_at,
            })),
        },
        actions: Object.values(ACTIONS).map(action => ({
            ...action,
            target_count: defaultCandidates[action.id].length,
        })),
        active_transactions: activeTransactions,
        history: getCleanupHistory(),
    };
}
function previewCleanupAction(action, options = {}) {
    cleanupExpiredPreviews();
    const definition = ACTIONS[action];
    if (!definition)
        return { success: false, error: "不支持的清理动作" };
    const retentionDays = options.retention_days === undefined && action === "purge_read_notifications"
        ? 180
        : normalizedRetentionDays(options.retention_days);
    const candidates = listCleanupCandidates(action, retentionDays);
    const token = crypto.randomUUID();
    const now = Date.now();
    const previewChecksum = candidateFingerprint({ action, retentionDays, candidates });
    (0, observability_database_1.getObservabilityDatabase)().prepare(`
    INSERT INTO cleanup_previews_v2(token_checksum,action,retention_days,preview_checksum,candidates_json,created_at,expires_at)
    VALUES(?,?,?,?,?,?,?)
  `).run(tokenChecksum(token), action, retentionDays, previewChecksum, JSON.stringify(candidates), new Date(now).toISOString(), new Date(now + PREVIEW_TTL_MS).toISOString());
    return {
        success: true,
        preview_token: token,
        expires_at: new Date(now + PREVIEW_TTL_MS).toISOString(),
        action: { ...definition, target_count: candidates.length },
        policy: { retention_days: retentionDays },
        preview_checksum: previewChecksum,
        preview: {
            will_affect: candidates.length,
            irreversible: definition.irreversible,
            note: definition.irreversible
                ? "只会永久删除本次预览中勾选的记录。任务相关的测试证据和回放会一并删除。"
                : "归档后记录仍会保留，可以继续用于复盘。",
            items: candidates.map(({ fingerprint, ...candidate }) => candidate),
        },
    };
}
function mergeCleanupTotals(target, source) {
    if (!source || typeof source !== "object")
        return;
    for (const [key, value] of Object.entries(source)) {
        if (typeof value === "number")
            target[key] = Number(target[key] || 0) + value;
        else if (value && typeof value === "object" && "removed" in value)
            target[key] = Number(target[key] || 0) + (value.removed ? 1 : 0);
    }
}
function readCleanupPreview(token) {
    const row = (0, observability_database_1.getObservabilityDatabase)().prepare("SELECT * FROM cleanup_previews_v2 WHERE token_checksum=?").get(tokenChecksum(token));
    if (!row || row.consumed_at || Date.parse(row.expires_at) <= Date.now())
        return null;
    return {
        tokenChecksum: row.token_checksum,
        action: row.action,
        retentionDays: Number(row.retention_days || 0),
        previewChecksum: row.preview_checksum,
        candidates: JSON.parse(row.candidates_json || "[]"),
        expiresAt: row.expires_at,
    };
}
function publicCleanupTransaction(row, options = {}) {
    if (!row)
        return null;
    const offset = Math.max(0, Number(options.offset || 0));
    const limit = Math.max(1, Math.min(200, Number(options.limit || 50)));
    const db = (0, observability_database_1.getObservabilityDatabase)();
    const steps = db.prepare("SELECT item_id,item_checksum,sequence,status,result_json,error_summary,started_at,completed_at,updated_at FROM cleanup_transaction_steps_v2 WHERE transaction_id=? ORDER BY sequence LIMIT ? OFFSET ?")
        .all(row.transaction_id, limit, offset).map((step) => ({
        item_id: step.item_id,
        sequence: step.sequence,
        status: step.status,
        result: step.result_json ? JSON.parse(step.result_json) : null,
        error: step.error_summary || "",
        started_at: step.started_at,
        completed_at: step.completed_at,
        updated_at: step.updated_at,
    }));
    return {
        schema: "ccm-cleanup-transaction-v2",
        transaction_id: row.transaction_id,
        action: row.action,
        label: ACTIONS[row.action]?.label || row.action,
        status: row.status,
        requested_count: row.requested_count,
        processed_count: row.processed_count,
        failed_count: row.failed_count,
        released_bytes: row.released_bytes,
        created_at: row.created_at,
        started_at: row.started_at,
        completed_at: row.completed_at,
        updated_at: row.updated_at,
        error: row.error_summary || "",
        cancel_requested: row.cancel_requested === 1,
        result_page: { offset, limit, total: row.requested_count, items: steps, next_offset: offset + steps.length < row.requested_count ? offset + steps.length : null },
    };
}
function getCleanupTransaction(transactionId, options = {}) {
    const row = (0, observability_database_1.getObservabilityDatabase)().prepare("SELECT * FROM cleanup_transactions_v2 WHERE transaction_id=?").get(String(transactionId || ""));
    return publicCleanupTransaction(row, options);
}
function executeCleanupStep(action, id) {
    if (action === "archive_failed_project_runs") {
        const archived = (0, chat_runs_1.archiveProjectChatRun)(id, "清理中心归档失败项目运行");
        if (!archived)
            throw new Error("项目运行不存在");
        return { status: "archived" };
    }
    if (action === "purge_archived_project_runs") {
        const result = (0, chat_runs_1.purgeProjectChatRun)(id);
        if (!result)
            throw new Error("项目运行不存在");
        return { status: "deleted", cleanup: result.cleanup || {} };
    }
    if (action === "purge_archived_tasks") {
        const result = (0, collaboration_1.purgeArchivedTask)(id);
        if (!result)
            throw new Error("任务不存在");
        return { status: "deleted", cleanup: result.purge_cleanup || {} };
    }
    if (action === "purge_orphan_uploads") {
        const result = (0, attachment_reference_registry_1.purgeOrphanAttachment)(id, 24 * 60 * 60_000);
        return { status: "deleted", cleanup: { upload_files: 1, upload_bytes: Number(result.bytes || 0) } };
    }
    if (action === "purge_archived_cron") {
        return (0, atomic_json_file_1.withFileLock)(path.join(CLEANUP_DIR, "cron"), () => {
            const jobs = (0, db_1.loadCronJobs)();
            const next = jobs.filter((job) => String(job.id || "") !== id);
            if (next.length === jobs.length)
                throw new Error("定时任务不存在");
            (0, db_1.saveCronJobs)(next);
            return { status: "deleted" };
        });
    }
    if (action === "purge_read_notifications") {
        return (0, observability_database_1.withImmediateObservabilityTransaction)(db => {
            const row = db.prepare(`
        SELECT notification_id FROM user_notifications_v2
        WHERE notification_id=?
          AND (read_at IS NOT NULL OR dismissed_at IS NOT NULL)
          AND NOT (state='active' AND notification_type IN ('permission_required','needs_user'))
      `).get(id);
            if (!row)
                throw new Error("通知不存在或仍需保留");
            db.prepare("DELETE FROM user_notifications_v2 WHERE notification_id=?").run(id);
            return { status: "deleted" };
        });
    }
    if (action === "purge_music_runtime") {
        const [kind, rawId] = String(id || "").split(":", 2);
        if (!rawId)
            throw new Error("音乐清理项身份无效");
        return (0, observability_database_1.withImmediateObservabilityTransaction)(db => {
            if (kind === "command") {
                const changed = db.prepare(`
          DELETE FROM music_playback_commands_v3
          WHERE command_id=? AND status IN ('completed','failed','superseded','cancelled')
        `).run(rawId);
                if (!changed.changes)
                    throw new Error("播放命令不存在或仍在运行");
                return { status: "deleted" };
            }
            if (kind === "download") {
                const changed = db.prepare(`
          DELETE FROM music_download_jobs_v2 WHERE job_id=? AND status IN ('done','failed','cancelled')
        `).run(rawId);
                if (!changed.changes)
                    throw new Error("下载任务不存在或仍在运行");
                return { status: "deleted" };
            }
            if (kind === "duplicate") {
                const row = db.prepare(`
          SELECT status,quarantine_json FROM music_duplicate_transactions_v1 WHERE transaction_id=?
        `).get(rawId);
                if (!row || !["completed", "rolled_back"].includes(String(row.status)))
                    throw new Error("重复项事务仍需保留");
                const quarantineRoot = path.resolve(utils_1.CCM_DIR, "music", ".quarantine");
                let releasedBytes = 0;
                for (const item of JSON.parse(row.quarantine_json || "[]")) {
                    const target = path.resolve(String(item?.quarantinePath || ""));
                    if (!target.startsWith(`${quarantineRoot}${path.sep}`))
                        continue;
                    try {
                        const stat = fs.lstatSync(target);
                        if (!stat.isFile() || stat.isSymbolicLink())
                            continue;
                        releasedBytes += stat.size;
                        fs.unlinkSync(target);
                    }
                    catch { }
                }
                db.prepare(`
          UPDATE music_duplicate_transactions_v1
          SET result_json=json_set(result_json,'$.quarantine_cleaned_at',?),updated_at=?
          WHERE transaction_id=?
        `).run(new Date().toISOString(), new Date().toISOString(), rawId);
                return { status: "deleted", cleanup: { music_bytes: releasedBytes } };
            }
            if (kind === "temp") {
                const filename = Buffer.from(rawId, "base64url").toString("utf8");
                if (filename !== path.basename(filename) || !/\.(?:ccm-part|ccm-backup)$/i.test(filename)) {
                    throw new Error("音乐临时文件身份无效");
                }
                const musicRoot = path.resolve(utils_1.CCM_DIR, "music");
                const target = path.resolve(musicRoot, filename);
                if (!target.startsWith(`${musicRoot}${path.sep}`))
                    throw new Error("音乐临时文件越界");
                const stat = fs.lstatSync(target);
                if (!stat.isFile() || stat.isSymbolicLink())
                    throw new Error("音乐临时文件类型无效");
                fs.unlinkSync(target);
                return { status: "deleted", cleanup: { music_bytes: stat.size } };
            }
            throw new Error("不支持的音乐清理项");
        });
    }
    if (action === "reset_metrics")
        return { status: "deleted", cleanup: (0, metrics_v3_1.resetMetricsV3)() };
    if (action === "purge_retired_runtime_data")
        return (0, runtime_schema_policy_1.purgeRetiredRuntimeCandidate)(id);
    throw new Error("不支持的清理动作");
}
function cleanupResultBytes(result) {
    const cleanup = result?.cleanup && typeof result.cleanup === "object" ? result.cleanup : {};
    return Object.entries(cleanup).reduce((total, [key, value]) => {
        if (!/(?:^|_)bytes$/i.test(key) || !Number.isFinite(Number(value)))
            return total;
        return total + Math.max(0, Number(value));
    }, 0);
}
function cleanupTransactionProgress(transactionId) {
    const rows = (0, observability_database_1.getObservabilityDatabase)().prepare("SELECT status,result_json FROM cleanup_transaction_steps_v2 WHERE transaction_id=?").all(transactionId);
    return rows.reduce((summary, row) => {
        if (row.status === "completed") {
            summary.processed += 1;
            try {
                summary.releasedBytes += cleanupResultBytes(JSON.parse(row.result_json || "{}"));
            }
            catch { /* Invalid legacy result does not invalidate the transaction. */ }
        }
        else if (row.status === "failed")
            summary.failed += 1;
        else if (row.status === "pending" || row.status === "executing")
            summary.pending += 1;
        return summary;
    }, { processed: 0, failed: 0, pending: 0, releasedBytes: 0 });
}
function executeCleanupTransaction(transactionId) {
    if (activeCleanupExecutions.has(transactionId))
        return;
    activeCleanupExecutions.add(transactionId);
    const db = (0, observability_database_1.getObservabilityDatabase)();
    try {
        const transaction = db.prepare("SELECT * FROM cleanup_transactions_v2 WHERE transaction_id=?").get(transactionId);
        if (!transaction || !["previewed", "claimed", "executing"].includes(String(transaction.status)))
            return;
        const startedAt = transaction.started_at || new Date().toISOString();
        db.prepare("UPDATE cleanup_transactions_v2 SET status='executing',started_at=?,updated_at=? WHERE transaction_id=?").run(startedAt, new Date().toISOString(), transactionId);
        const steps = db.prepare("SELECT * FROM cleanup_transaction_steps_v2 WHERE transaction_id=? AND status IN ('pending','executing') ORDER BY sequence").all(transactionId);
        for (const step of steps) {
            const state = db.prepare("SELECT cancel_requested FROM cleanup_transactions_v2 WHERE transaction_id=?").get(transactionId);
            if (state?.cancel_requested === 1)
                break;
            const at = new Date().toISOString();
            db.prepare("UPDATE cleanup_transaction_steps_v2 SET status='executing',started_at=COALESCE(started_at,?),updated_at=? WHERE transaction_id=? AND item_id=?").run(at, at, transactionId, step.item_id);
            try {
                const result = executeCleanupStep(transaction.action, step.item_id);
                db.prepare("UPDATE cleanup_transaction_steps_v2 SET status='completed',result_json=?,error_summary=NULL,completed_at=?,updated_at=? WHERE transaction_id=? AND item_id=?")
                    .run(JSON.stringify(result), new Date().toISOString(), new Date().toISOString(), transactionId, step.item_id);
            }
            catch (error) {
                db.prepare("UPDATE cleanup_transaction_steps_v2 SET status='failed',error_summary=?,completed_at=?,updated_at=? WHERE transaction_id=? AND item_id=?")
                    .run(String(error?.message || error).slice(0, 1000), new Date().toISOString(), new Date().toISOString(), transactionId, step.item_id);
            }
            const progress = cleanupTransactionProgress(transactionId);
            db.prepare("UPDATE cleanup_transactions_v2 SET processed_count=?,failed_count=?,released_bytes=?,updated_at=? WHERE transaction_id=?")
                .run(progress.processed, progress.failed, progress.releasedBytes, new Date().toISOString(), transactionId);
        }
        const counts = cleanupTransactionProgress(transactionId);
        const latest = db.prepare("SELECT cancel_requested FROM cleanup_transactions_v2 WHERE transaction_id=?").get(transactionId);
        const finalStatus = latest?.cancel_requested === 1 ? "cancelled" : (counts.failed ? (counts.processed ? "partial" : "failed") : "completed");
        const completedAt = new Date().toISOString();
        db.prepare("UPDATE cleanup_transactions_v2 SET status=?,processed_count=?,failed_count=?,released_bytes=?,completed_at=?,updated_at=? WHERE transaction_id=?")
            .run(finalStatus, counts.processed, counts.failed, counts.releasedBytes, completedAt, completedAt, transactionId);
        const receipt = publicCleanupTransaction(db.prepare("SELECT * FROM cleanup_transactions_v2 WHERE transaction_id=?").get(transactionId), { limit: 200 });
        appendCleanupAudit({ ...receipt, id: transactionId, operation: ACTIONS[transaction.action]?.irreversible ? "永久删除" : "安全整理" });
        (0, storage_index_1.startStorageIndexScan)({ force: true });
    }
    finally {
        activeCleanupExecutions.delete(transactionId);
    }
}
function runCleanupAction(action, options = {}) {
    const definition = ACTIONS[action];
    if (!definition)
        return { success: false, error: "不支持的清理动作" };
    const previewToken = String(options.preview_token || "").trim();
    if (!previewToken)
        return { success: false, error: "请先生成清理预览" };
    if (definition.irreversible && String(options.confirmation_phrase || "").trim() !== "永久删除")
        return { success: false, error: "永久操作需要输入确认短语“永久删除”" };
    cleanupExpiredPreviews();
    const snapshot = readCleanupPreview(previewToken);
    if (!snapshot || snapshot.action !== action)
        return { success: false, error: "清理预览已失效，请重新预览" };
    const availableIds = new Set(snapshot.candidates.map(candidate => candidate.id));
    const requestedIds = Array.isArray(options.selected_ids)
        ? [...new Set(options.selected_ids.map(value => String(value || "").trim()).filter(Boolean))]
        : snapshot.candidates.map(candidate => candidate.id);
    if (!requestedIds.length)
        return { success: false, error: "请至少选择一条记录" };
    if (requestedIds.some(id => !availableIds.has(id)))
        return { success: false, error: "选择内容不属于本次预览，请重新预览", code: "state_drift" };
    const currentById = new Map(listCleanupCandidates(action, snapshot.retentionDays).map(candidate => [candidate.id, candidate]));
    for (const id of requestedIds) {
        const expected = snapshot.candidates.find(candidate => candidate.id === id);
        const current = currentById.get(id);
        if (!expected || !current || expected.fingerprint !== current.fingerprint)
            return { success: false, error: "预览后数据已发生变化，请重新预览后再执行", code: "state_drift" };
    }
    const created = new Date().toISOString();
    const transactionId = `cleanup_${Date.now()}_${crypto.randomBytes(5).toString("hex")}`;
    const createdResult = (0, observability_database_1.withImmediateObservabilityTransaction)((db) => {
        const active = db.prepare("SELECT transaction_id FROM cleanup_transactions_v2 WHERE status IN ('previewed','claimed','executing') LIMIT 1").get();
        if (active)
            return { success: false, error: "另一个清理事务正在执行", code: "cleanup_busy", transaction_id: active.transaction_id };
        const fence = Number(db.prepare("SELECT MAX(fencing_token) value FROM cleanup_transactions_v2").get()?.value || 0) + 1;
        db.prepare(`INSERT INTO cleanup_transactions_v2(transaction_id,action,status,preview_token_checksum,preview_checksum,retention_days,requested_by,confirmation_phrase,fencing_token,owner_instance,requested_count,created_at,updated_at) VALUES(?,?,'previewed',?,?,?,?,?,?,?,?,?,?)`)
            .run(transactionId, action, snapshot.tokenChecksum, snapshot.previewChecksum, snapshot.retentionDays, String(options.requested_by || "admin"), definition.irreversible ? "confirmed" : "", fence, `${process.pid}`, requestedIds.length, created, created);
        const insert = db.prepare("INSERT INTO cleanup_transaction_steps_v2(transaction_id,item_id,item_checksum,sequence,status,updated_at) VALUES(?,?,?,?,'pending',?)");
        requestedIds.forEach((id, index) => insert.run(transactionId, id, snapshot.candidates.find(item => item.id === id).fingerprint, index + 1, created));
        db.prepare("UPDATE cleanup_previews_v2 SET consumed_at=? WHERE token_checksum=?").run(created, snapshot.tokenChecksum);
        return { success: true, transaction_id: transactionId };
    });
    if (!createdResult.success)
        return createdResult;
    setImmediate(() => executeCleanupTransaction(transactionId));
    return { success: true, accepted: true, transaction_id: transactionId, transaction: getCleanupTransaction(transactionId) };
}
function cancelCleanupTransaction(transactionId) {
    const db = (0, observability_database_1.getObservabilityDatabase)();
    const row = db.prepare("SELECT status FROM cleanup_transactions_v2 WHERE transaction_id=?").get(String(transactionId || ""));
    if (!row)
        return { success: false, error: "清理事务不存在" };
    if (["completed", "partial", "failed", "cancelled"].includes(String(row.status)))
        return { success: true, transaction: getCleanupTransaction(transactionId) };
    db.prepare("UPDATE cleanup_transactions_v2 SET cancel_requested=1,updated_at=? WHERE transaction_id=?").run(new Date().toISOString(), transactionId);
    return { success: true, transaction: getCleanupTransaction(transactionId) };
}
function resumeCleanupTransaction(transactionId) {
    const row = (0, observability_database_1.getObservabilityDatabase)().prepare("SELECT status FROM cleanup_transactions_v2 WHERE transaction_id=?").get(String(transactionId || ""));
    if (!row)
        return { success: false, error: "清理事务不存在" };
    if (["completed", "partial", "failed", "cancelled"].includes(String(row.status)))
        return { success: true, transaction: getCleanupTransaction(transactionId) };
    setImmediate(() => executeCleanupTransaction(transactionId));
    return { success: true, resumed: true, transaction: getCleanupTransaction(transactionId) };
}
function recoverCleanupTransactions() {
    const db = (0, observability_database_1.getObservabilityDatabase)();
    const rows = db.prepare("SELECT transaction_id,action FROM cleanup_transactions_v2 WHERE status IN ('previewed','claimed','executing') ORDER BY created_at").all();
    for (const row of rows) {
        const current = new Set(listCleanupCandidates(row.action, 0).map(item => item.id));
        const executing = db.prepare("SELECT item_id FROM cleanup_transaction_steps_v2 WHERE transaction_id=? AND status='executing'").all(row.transaction_id);
        for (const step of executing) {
            if (current.has(step.item_id))
                db.prepare("UPDATE cleanup_transaction_steps_v2 SET status='pending',updated_at=? WHERE transaction_id=? AND item_id=?").run(new Date().toISOString(), row.transaction_id, step.item_id);
            else
                db.prepare("UPDATE cleanup_transaction_steps_v2 SET status='completed',result_json=?,completed_at=?,updated_at=? WHERE transaction_id=? AND item_id=?")
                    .run(JSON.stringify({ status: "recovered_already_applied" }), new Date().toISOString(), new Date().toISOString(), row.transaction_id, step.item_id);
        }
        setImmediate(() => executeCleanupTransaction(row.transaction_id));
    }
    return { recovered: rows.length };
}
//# sourceMappingURL=cleanup-center.js.map