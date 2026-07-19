import { METRICS_FILE, now, readJson, writeJsonAtomic } from "./memory-control-center-types";

export function recordMemoryMetric(type: string, detail: any = {}) {
  const state = readJson(METRICS_FILE, { version: 1, counters: {}, events: [] });
  const counters = { ...(state.counters || {}) };
  counters[type] = Number(counters[type] || 0) + 1;
  const event = { id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, type, at: now(), ...detail };
  const next = {
    version: 1,
    counters,
    events: [...(Array.isArray(state.events) ? state.events : []), event].slice(-500),
    updatedAt: event.at,
  };
  writeJsonAtomic(METRICS_FILE, next);
  return event;
}
