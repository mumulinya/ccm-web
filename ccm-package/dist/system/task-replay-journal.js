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
exports.appendTaskReplayJournalEvent = appendTaskReplayJournalEvent;
exports.listTaskReplayJournalEvents = listTaskReplayJournalEvents;
exports.purgeTaskReplayJournalForTask = purgeTaskReplayJournalForTask;
exports.runTaskReplayJournalSelfTest = runTaskReplayJournalSelfTest;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("../core/utils");
const JOURNAL_DIR = path.join(utils_1.CCM_DIR, "reliability", "task-replay-journal");
function safeName(value) {
    return String(value || "unknown").replace(/[^a-zA-Z0-9_.-]/g, "_").slice(0, 160) || "unknown";
}
function journalFile(taskId, rootDir = JOURNAL_DIR) {
    return path.join(rootDir, `${safeName(taskId)}.jsonl`);
}
function appendTaskReplayJournalEvent(taskId, value, options = {}) {
    const id = String(taskId || "").trim();
    if (!id)
        return null;
    const rootDir = path.resolve(options.rootDir || JOURNAL_DIR);
    fs.mkdirSync(rootDir, { recursive: true });
    const row = {
        schema: "ccm-task-replay-journal-event-v1",
        task_id: id,
        recorded_at: new Date().toISOString(),
        event: value && typeof value === "object" ? value : { message: String(value || "") },
    };
    fs.appendFileSync(journalFile(id, rootDir), `${JSON.stringify(row)}\n`, "utf-8");
    return row;
}
function listTaskReplayJournalEvents(taskIds, options = {}) {
    const rootDir = path.resolve(options.rootDir || JOURNAL_DIR);
    const rows = [];
    for (const taskId of [...new Set((taskIds || []).map(item => String(item || "").trim()).filter(Boolean))]) {
        const file = journalFile(taskId, rootDir);
        if (!fs.existsSync(file))
            continue;
        let content = "";
        try {
            content = fs.readFileSync(file, "utf-8");
        }
        catch {
            continue;
        }
        for (const line of content.split(/\r?\n/)) {
            if (!line.trim())
                continue;
            try {
                const row = JSON.parse(line);
                if (row?.schema === "ccm-task-replay-journal-event-v1" && String(row.task_id || "") === taskId)
                    rows.push(row);
            }
            catch { }
        }
    }
    return rows.sort((a, b) => String(a?.event?.at || a.recorded_at || "").localeCompare(String(b?.event?.at || b.recorded_at || "")));
}
function purgeTaskReplayJournalForTask(taskId, options = {}) {
    const id = String(taskId || "").trim();
    if (!id)
        return { removed: false };
    const rootDir = path.resolve(options.rootDir || JOURNAL_DIR);
    const file = journalFile(id, rootDir);
    try {
        if (!fs.existsSync(file))
            return { removed: false };
        fs.unlinkSync(file);
        return { removed: true };
    }
    catch (error) {
        return { removed: false, error: error?.message || String(error) };
    }
}
function runTaskReplayJournalSelfTest(options = {}) {
    const rootDir = path.resolve(options.rootDir || JOURNAL_DIR);
    const taskId = `journal-selftest-${process.pid}-${Date.now()}`;
    appendTaskReplayJournalEvent(taskId, { id: "one", at: "2026-07-13T00:00:00.000Z", type: "task.created", message: "created" }, { rootDir });
    appendTaskReplayJournalEvent(taskId, { id: "two", at: "2026-07-13T00:00:01.000Z", type: "task.completed", message: "done" }, { rootDir });
    const rows = listTaskReplayJournalEvents([taskId], { rootDir });
    const purge = purgeTaskReplayJournalForTask(taskId, { rootDir });
    return { schema: "ccm-task-replay-journal-selftest-v1", pass: rows.length === 2 && rows[0]?.event?.id === "one" && purge.removed === true, rows: rows.length, purged: purge.removed };
}
//# sourceMappingURL=task-replay-journal.js.map