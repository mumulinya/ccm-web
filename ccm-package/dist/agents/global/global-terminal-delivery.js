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
exports.createGlobalRunTerminalReceipt = createGlobalRunTerminalReceipt;
exports.ensureGlobalTerminalDeliveries = ensureGlobalTerminalDeliveries;
exports.listGlobalTerminalDeliveries = listGlobalTerminalDeliveries;
exports.retryGlobalTerminalDelivery = retryGlobalTerminalDelivery;
exports.drainGlobalTerminalDeliveries = drainGlobalTerminalDeliveries;
const crypto = __importStar(require("crypto"));
const path = __importStar(require("path"));
const atomic_json_file_1 = require("../../core/atomic-json-file");
const utils_1 = require("../../core/utils");
const FILE = process.env.CCM_GLOBAL_TERMINAL_OUTBOX_FILE || path.join(utils_1.CCM_DIR, "global-agent-runs", "terminal-deliveries.json");
function stable(value) {
    if (Array.isArray(value))
        return value.map(stable);
    if (value && typeof value === "object")
        return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
    return value;
}
function sha(value) {
    return crypto.createHash("sha256").update(JSON.stringify(stable(value))).digest("hex");
}
function readStore() {
    const raw = (0, atomic_json_file_1.readJsonWithBackup)(FILE, { schema: "ccm-global-terminal-outbox-v1", deliveries: [] });
    return {
        schema: "ccm-global-terminal-outbox-v1",
        deliveries: (Array.isArray(raw?.deliveries) ? raw.deliveries : []).filter((item) => item?.id && item?.dedupe_key),
    };
}
function mutate(fn) {
    return (0, atomic_json_file_1.withFileLock)(FILE, () => {
        const store = readStore();
        const result = fn(store);
        store.deliveries = store.deliveries.slice(-2_000);
        (0, atomic_json_file_1.writeJsonAtomic)(FILE, store);
        return result;
    });
}
function createGlobalRunTerminalReceipt(input) {
    const base = {
        schema: "ccm-global-run-terminal-receipt-v2",
        supervisor_id: String(input?.id || input?.supervisor_id || ""),
        mission_id: String(input?.mission_id || ""),
        global_run_id: String(input?.global_run_id || ""),
        session_id: String(input?.session_id || "default"),
        outcome: (["failed", "cancelled"].includes(String(input?.outcome)) ? input.outcome : "completed"),
        report_checksum: sha(input?.report || {}),
        settled_at: String(input?.settled_at || new Date().toISOString()),
    };
    return { ...base, checksum: sha(base) };
}
function ensureGlobalTerminalDeliveries(record, receipt) {
    const kinds = ["memory", "run", "replay", /feishu/i.test(String(record?.source || "")) ? "feishu" : "web_session"];
    return mutate((store) => {
        const now = new Date().toISOString();
        const rows = [];
        for (const kind of kinds) {
            const dedupeKey = `${receipt.checksum}:${kind}`;
            let row = store.deliveries.find((item) => item.dedupe_key === dedupeKey);
            if (!row) {
                row = {
                    schema: "ccm-global-terminal-delivery-v1",
                    id: `gtd_${Date.now().toString(36)}_${crypto.randomBytes(5).toString("hex")}`,
                    dedupe_key: dedupeKey,
                    supervisor_id: receipt.supervisor_id,
                    mission_id: receipt.mission_id,
                    global_run_id: receipt.global_run_id,
                    session_id: receipt.session_id,
                    source: String(record?.source || "global-agent"),
                    kind,
                    state: "pending",
                    attempts: 0,
                    max_attempts: 5,
                    next_attempt_at: now,
                    last_error: "",
                    created_at: now,
                    updated_at: now,
                    delivered_at: "",
                };
                store.deliveries.push(row);
            }
            rows.push(row);
        }
        return rows;
    });
}
function listGlobalTerminalDeliveries(input = {}) {
    return readStore().deliveries.filter((item) => (!input.supervisorId || item.supervisor_id === input.supervisorId)
        && (!input.states?.length || input.states.includes(item.state)));
}
function retryGlobalTerminalDelivery(id) {
    return mutate((store) => {
        const item = store.deliveries.find((row) => row.id === id);
        if (!item)
            throw new Error("终态投递记录不存在");
        item.state = "pending";
        item.attempts = 0;
        item.next_attempt_at = new Date().toISOString();
        item.last_error = "";
        item.updated_at = item.next_attempt_at;
        return item;
    });
}
async function drainGlobalTerminalDeliveries(input) {
    const now = Date.now();
    const candidates = listGlobalTerminalDeliveries({ supervisorId: input.supervisorId, states: ["pending", "sending"] })
        .filter((item) => !item.next_attempt_at || Date.parse(item.next_attempt_at) <= now);
    const results = [];
    for (const candidate of candidates) {
        const claimed = mutate((store) => {
            const item = store.deliveries.find((row) => row.id === candidate.id);
            if (!item || !["pending", "sending"].includes(item.state))
                return null;
            item.state = "sending";
            item.attempts += 1;
            item.updated_at = new Date().toISOString();
            return { ...item };
        });
        if (!claimed)
            continue;
        try {
            await input.deliver(claimed);
            results.push(mutate((store) => {
                const item = store.deliveries.find((row) => row.id === claimed.id);
                item.state = "delivered";
                item.last_error = "";
                item.delivered_at = new Date().toISOString();
                item.updated_at = item.delivered_at;
                return { ...item };
            }));
        }
        catch (error) {
            results.push(mutate((store) => {
                const item = store.deliveries.find((row) => row.id === claimed.id);
                item.last_error = String(error?.message || error).slice(0, 1_000);
                item.state = item.attempts >= item.max_attempts ? "delivery_failed" : "pending";
                item.next_attempt_at = new Date(Date.now() + Math.min(60_000, 1_000 * (2 ** Math.max(0, item.attempts - 1)))).toISOString();
                item.updated_at = new Date().toISOString();
                return { ...item };
            }));
        }
    }
    return { total: candidates.length, results };
}
//# sourceMappingURL=global-terminal-delivery.js.map