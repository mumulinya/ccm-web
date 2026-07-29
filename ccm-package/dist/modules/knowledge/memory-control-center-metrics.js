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
exports.MEMORY_METRIC_EVENT_SCAN_LIMIT = exports.METRICS_EVENT_FILE = void 0;
exports.recordMemoryMetric = recordMemoryMetric;
exports.readMemoryMetrics = readMemoryMetrics;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const memory_control_center_types_1 = require("./memory-control-center-types");
// 指标是纯追加流水：每次打点只 append 一行，不再「全量读 → push → 全量写」，
// 那种写法在并发派工时会互相覆盖，而且每次都要重写全部历史事件。
exports.METRICS_EVENT_FILE = memory_control_center_types_1.METRICS_FILE.replace(/\.json$/, "") + ".jsonl";
exports.MEMORY_METRIC_EVENT_SCAN_LIMIT = 2_000;
function eventId() {
    return `mem_${Date.now().toString(36)}_${crypto.randomBytes(4).toString("hex")}`;
}
function recordMemoryMetric(type, detail = {}) {
    const event = { id: eventId(), type, at: (0, memory_control_center_types_1.now)(), ...detail };
    try {
        fs.mkdirSync(path.dirname(exports.METRICS_EVENT_FILE), { recursive: true });
        fs.appendFileSync(exports.METRICS_EVENT_FILE, `${JSON.stringify(event)}\n`, "utf-8");
    }
    catch { }
    return event;
}
function readMetricEvents(limit = exports.MEMORY_METRIC_EVENT_SCAN_LIMIT) {
    let lines = [];
    try {
        lines = fs.readFileSync(exports.METRICS_EVENT_FILE, "utf-8").split("\n").filter(Boolean);
    }
    catch { }
    return lines.slice(-Math.max(1, limit)).flatMap(line => {
        try {
            return [JSON.parse(line)];
        }
        catch {
            return [];
        }
    });
}
/**
 * 聚合读取。历史上指标存在 metrics.json 的 counters 里，这里把旧文件的计数
 * 作为基线叠加，避免切换到 jsonl 之后已有统计归零。
 */
function readMemoryMetrics(limit = exports.MEMORY_METRIC_EVENT_SCAN_LIMIT) {
    const legacy = (0, memory_control_center_types_1.readJson)(memory_control_center_types_1.METRICS_FILE, { version: 1, counters: {}, events: [] });
    const counters = { ...(legacy?.counters || {}) };
    const events = readMetricEvents(limit);
    for (const event of events) {
        const type = String(event?.type || "");
        if (!type)
            continue;
        counters[type] = Number(counters[type] || 0) + 1;
    }
    return {
        version: 2,
        counters,
        events,
        eventFile: exports.METRICS_EVENT_FILE,
        legacyEventCount: Array.isArray(legacy?.events) ? legacy.events.length : 0,
        updatedAt: String(events[events.length - 1]?.at || legacy?.updatedAt || ""),
    };
}
//# sourceMappingURL=memory-control-center-metrics.js.map