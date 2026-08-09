import * as crypto from "crypto";
import * as os from "os";
import * as path from "path";
import { readJsonWithBackup, withFileLock, writeJsonAtomic } from "../core/atomic-json-file";

export const TASK_TRANSITION_SCHEMA = "ccm-task-transition-event-v1" as const;
const STORE_FILE = path.join(process.env.CCM_TASK_TRANSITION_DIR || path.join(os.homedir(), ".cc-connect"), "task-transition-events.json");

export type TaskTransitionEvent = {
  schema: typeof TASK_TRANSITION_SCHEMA;
  eventId: string;
  taskId: string;
  revision: number;
  from: string;
  to: string;
  actor: string;
  reasonCode: string;
  createdAt: string;
  checksum: string;
  contentStored: false;
};

function text(value: any, max = 300) { return String(value ?? "").replace(/[\r\n\t]+/g, " ").replace(/(api[_-]?key|token|password|secret|authorization)\s*[:=]\s*[^\s,;]+/ig, "$1=[redacted]").trim().slice(0, max); }
function hash(value: any) { return crypto.createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex"); }
function readStore() { const value = readJsonWithBackup<any>(STORE_FILE, { schema: "ccm-task-transition-ledger-v1", revision: 0, events: [] }); return { revision: Number(value?.revision || 0), events: Array.isArray(value?.events) ? value.events : [] }; }

export function appendTaskTransitionEvent(input: any): TaskTransitionEvent {
  const createdAt = new Date().toISOString();
  const base = {
    schema: TASK_TRANSITION_SCHEMA,
    eventId: text(input?.eventId || input?.event_id, 160) || `tev_${Date.now().toString(36)}_${crypto.randomBytes(5).toString("hex")}`,
    taskId: text(input?.taskId || input?.task_id, 160),
    revision: Math.max(0, Number(input?.revision || 0)),
    from: text(input?.from, 80),
    to: text(input?.to, 80),
    actor: text(input?.actor || "task-runtime", 120),
    reasonCode: text(input?.reasonCode || input?.reason_code, 160),
    createdAt,
    contentStored: false as const,
  };
  const event = { ...base, checksum: hash(base) };
  withFileLock(STORE_FILE, () => {
    const store = readStore();
    if (!store.events.some((item: any) => item.eventId === event.eventId || item.checksum === event.checksum)) store.events.push(event);
    store.events = store.events.slice(-20_000);
    store.revision += 1;
    writeJsonAtomic(STORE_FILE, { schema: "ccm-task-transition-ledger-v1", revision: store.revision, events: store.events });
  });
  return event;
}

export function listTaskTransitionEvents(taskId: string, limit = 200) { return readStore().events.filter((item: any) => item.taskId === String(taskId)).slice(-Math.max(1, limit)); }

export function reduceTaskTransitionEvents(taskId: string, initial: any = {}) {
  const events = listTaskTransitionEvents(taskId, 20_000);
  let state = { ...initial };
  for (const event of events) state = { ...state, status: event.to || state.status, revision: Math.max(Number(state.revision || 0), Number(event.revision || 0)), lastTransitionEventId: event.eventId };
  return state;
}

export function runTaskTransitionLedgerSelfTest() {
  const event = appendTaskTransitionEvent({ taskId: "selftest", revision: 1, from: "queued", to: "executing" });
  const reduced = reduceTaskTransitionEvents("selftest");
  return { pass: event.contentStored === false && reduced.status === "executing" && reduced.revision === 1, event, reduced };
}
