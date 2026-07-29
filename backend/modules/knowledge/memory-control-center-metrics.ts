import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { METRICS_FILE, now, readJson } from "./memory-control-center-types";

// 指标是纯追加流水：每次打点只 append 一行，不再「全量读 → push → 全量写」，
// 那种写法在并发派工时会互相覆盖，而且每次都要重写全部历史事件。
export const METRICS_EVENT_FILE = METRICS_FILE.replace(/\.json$/, "") + ".jsonl";

export const MEMORY_METRIC_EVENT_SCAN_LIMIT = 2_000;

function eventId() {
  return `mem_${Date.now().toString(36)}_${crypto.randomBytes(4).toString("hex")}`;
}

export function recordMemoryMetric(type: string, detail: any = {}) {
  const event = { id: eventId(), type, at: now(), ...detail };
  try {
    fs.mkdirSync(path.dirname(METRICS_EVENT_FILE), { recursive: true });
    fs.appendFileSync(METRICS_EVENT_FILE, `${JSON.stringify(event)}\n`, "utf-8");
  } catch {}
  return event;
}

function readMetricEvents(limit = MEMORY_METRIC_EVENT_SCAN_LIMIT) {
  let lines: string[] = [];
  try {
    lines = fs.readFileSync(METRICS_EVENT_FILE, "utf-8").split("\n").filter(Boolean);
  } catch {}
  return lines.slice(-Math.max(1, limit)).flatMap(line => {
    try { return [JSON.parse(line)]; } catch { return []; }
  });
}

/**
 * 聚合读取。历史上指标存在 metrics.json 的 counters 里，这里把旧文件的计数
 * 作为基线叠加，避免切换到 jsonl 之后已有统计归零。
 */
export function readMemoryMetrics(limit = MEMORY_METRIC_EVENT_SCAN_LIMIT) {
  const legacy = readJson(METRICS_FILE, { version: 1, counters: {}, events: [] });
  const counters: Record<string, number> = { ...(legacy?.counters || {}) };
  const events = readMetricEvents(limit);
  for (const event of events) {
    const type = String(event?.type || "");
    if (!type) continue;
    counters[type] = Number(counters[type] || 0) + 1;
  }
  return {
    version: 2,
    counters,
    events,
    eventFile: METRICS_EVENT_FILE,
    legacyEventCount: Array.isArray(legacy?.events) ? legacy.events.length : 0,
    updatedAt: String(events[events.length - 1]?.at || legacy?.updatedAt || ""),
  };
}
