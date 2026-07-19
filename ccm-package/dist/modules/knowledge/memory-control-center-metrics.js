"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordMemoryMetric = recordMemoryMetric;
const memory_control_center_types_1 = require("./memory-control-center-types");
function recordMemoryMetric(type, detail = {}) {
    const state = (0, memory_control_center_types_1.readJson)(memory_control_center_types_1.METRICS_FILE, { version: 1, counters: {}, events: [] });
    const counters = { ...(state.counters || {}) };
    counters[type] = Number(counters[type] || 0) + 1;
    const event = { id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, type, at: (0, memory_control_center_types_1.now)(), ...detail };
    const next = {
        version: 1,
        counters,
        events: [...(Array.isArray(state.events) ? state.events : []), event].slice(-500),
        updatedAt: event.at,
    };
    (0, memory_control_center_types_1.writeJsonAtomic)(memory_control_center_types_1.METRICS_FILE, next);
    return event;
}
//# sourceMappingURL=memory-control-center-metrics.js.map