import * as crypto from "crypto";
import * as path from "path";
import { readJsonWithBackup, withFileLock, writeJsonAtomic } from "../../core/atomic-json-file";
import { CCM_DIR } from "../../core/utils";

export type GlobalRunTerminalReceiptV2 = {
  schema: "ccm-global-run-terminal-receipt-v2";
  supervisor_id: string;
  mission_id: string;
  global_run_id: string;
  session_id: string;
  outcome: "completed" | "failed" | "cancelled";
  report_checksum: string;
  settled_at: string;
  checksum: string;
};

export type GlobalTerminalDeliveryV1 = {
  schema: "ccm-global-terminal-delivery-v1";
  id: string;
  dedupe_key: string;
  supervisor_id: string;
  mission_id: string;
  global_run_id: string;
  session_id: string;
  source: string;
  kind: "memory" | "run" | "web_session" | "feishu" | "replay";
  state: "pending" | "sending" | "delivered" | "delivery_failed";
  attempts: number;
  max_attempts: number;
  next_attempt_at: string;
  last_error: string;
  created_at: string;
  updated_at: string;
  delivered_at: string;
};

const FILE = process.env.CCM_GLOBAL_TERMINAL_OUTBOX_FILE || path.join(CCM_DIR, "global-agent-runs", "terminal-deliveries.json");

function stable(value: any): any {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}

function sha(value: any) {
  return crypto.createHash("sha256").update(JSON.stringify(stable(value))).digest("hex");
}

function readStore(): { schema: "ccm-global-terminal-outbox-v1"; deliveries: GlobalTerminalDeliveryV1[] } {
  const raw = readJsonWithBackup<any>(FILE, { schema: "ccm-global-terminal-outbox-v1", deliveries: [] });
  return {
    schema: "ccm-global-terminal-outbox-v1",
    deliveries: (Array.isArray(raw?.deliveries) ? raw.deliveries : []).filter((item: any) => item?.id && item?.dedupe_key),
  };
}

function mutate<T>(fn: (store: ReturnType<typeof readStore>) => T) {
  return withFileLock(FILE, () => {
    const store = readStore();
    const result = fn(store);
    store.deliveries = store.deliveries.slice(-2_000);
    writeJsonAtomic(FILE, store);
    return result;
  });
}

export function createGlobalRunTerminalReceipt(input: any): GlobalRunTerminalReceiptV2 {
  const base = {
    schema: "ccm-global-run-terminal-receipt-v2" as const,
    supervisor_id: String(input?.id || input?.supervisor_id || ""),
    mission_id: String(input?.mission_id || ""),
    global_run_id: String(input?.global_run_id || ""),
    session_id: String(input?.session_id || "default"),
    outcome: (["failed", "cancelled"].includes(String(input?.outcome)) ? input.outcome : "completed") as "completed" | "failed" | "cancelled",
    report_checksum: sha(input?.report || {}),
    settled_at: String(input?.settled_at || new Date().toISOString()),
  };
  return { ...base, checksum: sha(base) };
}

export function ensureGlobalTerminalDeliveries(record: any, receipt: GlobalRunTerminalReceiptV2) {
  const kinds: GlobalTerminalDeliveryV1["kind"][] = ["memory", "run", "replay", /feishu/i.test(String(record?.source || "")) ? "feishu" : "web_session"];
  return mutate((store) => {
    const now = new Date().toISOString();
    const rows: GlobalTerminalDeliveryV1[] = [];
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

export function listGlobalTerminalDeliveries(input: { supervisorId?: string; states?: string[] } = {}) {
  return readStore().deliveries.filter((item) => (!input.supervisorId || item.supervisor_id === input.supervisorId)
    && (!input.states?.length || input.states.includes(item.state)));
}

export function retryGlobalTerminalDelivery(id: string) {
  return mutate((store) => {
    const item = store.deliveries.find((row) => row.id === id);
    if (!item) throw new Error("终态投递记录不存在");
    item.state = "pending";
    item.attempts = 0;
    item.next_attempt_at = new Date().toISOString();
    item.last_error = "";
    item.updated_at = item.next_attempt_at;
    return item;
  });
}

export async function drainGlobalTerminalDeliveries(input: {
  supervisorId?: string;
  deliver: (delivery: GlobalTerminalDeliveryV1) => Promise<void>;
}) {
  const now = Date.now();
  const candidates = listGlobalTerminalDeliveries({ supervisorId: input.supervisorId, states: ["pending", "sending"] })
    .filter((item) => !item.next_attempt_at || Date.parse(item.next_attempt_at) <= now);
  const results: GlobalTerminalDeliveryV1[] = [];
  for (const candidate of candidates) {
    const claimed = mutate((store) => {
      const item = store.deliveries.find((row) => row.id === candidate.id);
      if (!item || !["pending", "sending"].includes(item.state)) return null;
      item.state = "sending";
      item.attempts += 1;
      item.updated_at = new Date().toISOString();
      return { ...item };
    });
    if (!claimed) continue;
    try {
      await input.deliver(claimed);
      results.push(mutate((store) => {
        const item = store.deliveries.find((row) => row.id === claimed.id)!;
        item.state = "delivered";
        item.last_error = "";
        item.delivered_at = new Date().toISOString();
        item.updated_at = item.delivered_at;
        return { ...item };
      }));
    } catch (error: any) {
      results.push(mutate((store) => {
        const item = store.deliveries.find((row) => row.id === claimed.id)!;
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
