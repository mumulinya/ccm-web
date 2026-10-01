"use strict";
/**
 * Policy helpers for CCM's local materialization cache.
 *
 * This cache contains request-preparation data only; it is never Provider
 * prompt-cache state.  Keep the policy separate from the context projection
 * implementation so memory limits can evolve without changing serialization.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LOCAL_HOT_CACHE_MAX_SESSION_BYTES = exports.LOCAL_HOT_CACHE_MAX_ENTRY_BYTES = exports.LOCAL_HOT_CACHE_MAX_BYTES = exports.LOCAL_HOT_CACHE_MAX_ENTRIES = void 0;
exports.shouldKeepLocalMaterialization = shouldKeepLocalMaterialization;
exports.localMaterializationBytes = localMaterializationBytes;
exports.localMaterializationSessionKey = localMaterializationSessionKey;
exports.evictLocalMaterializations = evictLocalMaterializations;
exports.LOCAL_HOT_CACHE_MAX_ENTRIES = Math.max(8, Number(process.env.CCM_CONTEXT_HOT_CACHE_MAX_ENTRIES || 128));
exports.LOCAL_HOT_CACHE_MAX_BYTES = Math.max(4 * 1024 * 1024, Number(process.env.CCM_CONTEXT_HOT_CACHE_MAX_BYTES || 32 * 1024 * 1024));
// A single large tool-result conversation must not evict every other active
// conversation from the process cache.  It is still prepared correctly, but
// is deliberately served as a one-shot materialization instead of being kept
// in memory.
exports.LOCAL_HOT_CACHE_MAX_ENTRY_BYTES = Math.max(512 * 1024, Number(process.env.CCM_CONTEXT_HOT_CACHE_MAX_ENTRY_BYTES || 4 * 1024 * 1024));
exports.LOCAL_HOT_CACHE_MAX_SESSION_BYTES = Math.max(1 * 1024 * 1024, Number(process.env.CCM_CONTEXT_HOT_CACHE_MAX_SESSION_BYTES || 8 * 1024 * 1024));
function shouldKeepLocalMaterialization(approximateBytes) {
    return Math.max(0, Number(approximateBytes || 0)) <= exports.LOCAL_HOT_CACHE_MAX_ENTRY_BYTES;
}
function localMaterializationBytes(entries) {
    let total = 0;
    for (const entry of entries)
        total += Math.max(0, Number(entry.approximateBytes || 0));
    return total;
}
function localMaterializationSessionKey(bindingKey) {
    // bindingKey is scope\0scopeId\0sessionId\0boundaryGeneration.
    // The first three components define the per-session memory budget.
    const parts = String(bindingKey || "").split("\0");
    return parts.slice(0, 3).join("\0");
}
function evictLocalMaterializations(entries, onEvict) {
    let evicted = 0;
    const remove = (key, entry) => {
        if (!entries.delete(key))
            return false;
        evicted += 1;
        onEvict?.(key, entry);
        return true;
    };
    // Enforce a per-session budget first, keeping the newest entries.
    const bySession = new Map();
    for (const row of entries) {
        const key = localMaterializationSessionKey(row[1].bindingKey);
        const list = bySession.get(key) || [];
        list.push(row);
        bySession.set(key, list);
    }
    for (const rows of bySession.values()) {
        let bytes = localMaterializationBytes(rows.map(([, entry]) => entry));
        if (bytes <= exports.LOCAL_HOT_CACHE_MAX_SESSION_BYTES)
            continue;
        rows.sort((a, b) => Number(a[1].lastAccessAtMs || 0) - Number(b[1].lastAccessAtMs || 0));
        for (const [key, entry] of rows) {
            if (bytes <= exports.LOCAL_HOT_CACHE_MAX_SESSION_BYTES)
                break;
            if (remove(key, entry))
                bytes -= Math.max(0, Number(entry.approximateBytes || 0));
        }
    }
    let bytes = localMaterializationBytes(entries.values());
    if (entries.size > exports.LOCAL_HOT_CACHE_MAX_ENTRIES || bytes > exports.LOCAL_HOT_CACHE_MAX_BYTES) {
        const ordered = [...entries.entries()].sort((a, b) => Number(a[1].lastAccessAtMs || 0) - Number(b[1].lastAccessAtMs || 0));
        for (const [key, entry] of ordered) {
            if (entries.size <= exports.LOCAL_HOT_CACHE_MAX_ENTRIES && bytes <= exports.LOCAL_HOT_CACHE_MAX_BYTES)
                break;
            if (remove(key, entry))
                bytes -= Math.max(0, Number(entry.approximateBytes || 0));
        }
    }
    return evicted;
}
//# sourceMappingURL=provider-local-materialization-cache.js.map