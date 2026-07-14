import * as fs from "fs";
import * as path from "path";
import { CCM_DIR } from "../core/utils";

const JOURNAL_DIR = path.join(CCM_DIR, "reliability", "task-replay-journal");

function safeName(value: string) {
  return String(value || "unknown").replace(/[^a-zA-Z0-9_.-]/g, "_").slice(0, 160) || "unknown";
}

function journalFile(taskId: string, rootDir = JOURNAL_DIR) {
  return path.join(rootDir, `${safeName(taskId)}.jsonl`);
}

export function appendTaskReplayJournalEvent(taskId: string, value: any, options: { rootDir?: string } = {}) {
  const id = String(taskId || "").trim();
  if (!id) return null;
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

export function listTaskReplayJournalEvents(taskIds: string[], options: { rootDir?: string } = {}) {
  const rootDir = path.resolve(options.rootDir || JOURNAL_DIR);
  const rows: any[] = [];
  for (const taskId of [...new Set((taskIds || []).map(item => String(item || "").trim()).filter(Boolean))]) {
    const file = journalFile(taskId, rootDir);
    if (!fs.existsSync(file)) continue;
    let content = "";
    try { content = fs.readFileSync(file, "utf-8"); } catch { continue; }
    for (const line of content.split(/\r?\n/)) {
      if (!line.trim()) continue;
      try {
        const row = JSON.parse(line);
        if (row?.schema === "ccm-task-replay-journal-event-v1" && String(row.task_id || "") === taskId) rows.push(row);
      } catch {}
    }
  }
  return rows.sort((a, b) => String(a?.event?.at || a.recorded_at || "").localeCompare(String(b?.event?.at || b.recorded_at || "")));
}

export function purgeTaskReplayJournalForTask(taskId: string, options: { rootDir?: string } = {}) {
  const id = String(taskId || "").trim();
  if (!id) return { removed: false };
  const rootDir = path.resolve(options.rootDir || JOURNAL_DIR);
  const file = journalFile(id, rootDir);
  try {
    if (!fs.existsSync(file)) return { removed: false };
    fs.unlinkSync(file);
    return { removed: true };
  } catch (error: any) {
    return { removed: false, error: error?.message || String(error) };
  }
}

export function runTaskReplayJournalSelfTest(options: { rootDir?: string } = {}) {
  const rootDir = path.resolve(options.rootDir || JOURNAL_DIR);
  const taskId = `journal-selftest-${process.pid}-${Date.now()}`;
  appendTaskReplayJournalEvent(taskId, { id: "one", at: "2026-07-13T00:00:00.000Z", type: "task.created", message: "created" }, { rootDir });
  appendTaskReplayJournalEvent(taskId, { id: "two", at: "2026-07-13T00:00:01.000Z", type: "task.completed", message: "done" }, { rootDir });
  const rows = listTaskReplayJournalEvents([taskId], { rootDir });
  const purge = purgeTaskReplayJournalForTask(taskId, { rootDir });
  return { schema: "ccm-task-replay-journal-selftest-v1", pass: rows.length === 2 && rows[0]?.event?.id === "one" && purge.removed === true, rows: rows.length, purged: purge.removed };
}
