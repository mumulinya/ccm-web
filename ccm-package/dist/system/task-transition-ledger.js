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
exports.TASK_TRANSITION_SCHEMA = void 0;
exports.appendTaskTransitionEvent = appendTaskTransitionEvent;
exports.listTaskTransitionEvents = listTaskTransitionEvents;
exports.reduceTaskTransitionEvents = reduceTaskTransitionEvents;
exports.runTaskTransitionLedgerSelfTest = runTaskTransitionLedgerSelfTest;
const crypto = __importStar(require("crypto"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const atomic_json_file_1 = require("../core/atomic-json-file");
exports.TASK_TRANSITION_SCHEMA = "ccm-task-transition-event-v1";
const STORE_FILE = path.join(process.env.CCM_TASK_TRANSITION_DIR || path.join(os.homedir(), ".cc-connect"), "task-transition-events.json");
function text(value, max = 300) { return String(value ?? "").replace(/[\r\n\t]+/g, " ").replace(/(api[_-]?key|token|password|secret|authorization)\s*[:=]\s*[^\s,;]+/ig, "$1=[redacted]").trim().slice(0, max); }
function hash(value) { return crypto.createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex"); }
function readStore() { const value = (0, atomic_json_file_1.readJsonWithBackup)(STORE_FILE, { schema: "ccm-task-transition-ledger-v1", revision: 0, events: [] }); return { revision: Number(value?.revision || 0), events: Array.isArray(value?.events) ? value.events : [] }; }
function appendTaskTransitionEvent(input) {
    const createdAt = new Date().toISOString();
    const base = {
        schema: exports.TASK_TRANSITION_SCHEMA,
        eventId: text(input?.eventId || input?.event_id, 160) || `tev_${Date.now().toString(36)}_${crypto.randomBytes(5).toString("hex")}`,
        taskId: text(input?.taskId || input?.task_id, 160),
        revision: Math.max(0, Number(input?.revision || 0)),
        from: text(input?.from, 80),
        to: text(input?.to, 80),
        actor: text(input?.actor || "task-runtime", 120),
        reasonCode: text(input?.reasonCode || input?.reason_code, 160),
        createdAt,
        contentStored: false,
    };
    const event = { ...base, checksum: hash(base) };
    (0, atomic_json_file_1.withFileLock)(STORE_FILE, () => {
        const store = readStore();
        if (!store.events.some((item) => item.eventId === event.eventId || item.checksum === event.checksum))
            store.events.push(event);
        store.events = store.events.slice(-20_000);
        store.revision += 1;
        (0, atomic_json_file_1.writeJsonAtomic)(STORE_FILE, { schema: "ccm-task-transition-ledger-v1", revision: store.revision, events: store.events });
    });
    return event;
}
function listTaskTransitionEvents(taskId, limit = 200) { return readStore().events.filter((item) => item.taskId === String(taskId)).slice(-Math.max(1, limit)); }
function reduceTaskTransitionEvents(taskId, initial = {}) {
    const events = listTaskTransitionEvents(taskId, 20_000);
    let state = { ...initial };
    for (const event of events)
        state = { ...state, status: event.to || state.status, revision: Math.max(Number(state.revision || 0), Number(event.revision || 0)), lastTransitionEventId: event.eventId };
    return state;
}
function runTaskTransitionLedgerSelfTest() {
    const event = appendTaskTransitionEvent({ taskId: "selftest", revision: 1, from: "queued", to: "executing" });
    const reduced = reduceTaskTransitionEvents("selftest");
    return { pass: event.contentStored === false && reduced.status === "executing" && reduced.revision === 1, event, reduced };
}
//# sourceMappingURL=task-transition-ledger.js.map