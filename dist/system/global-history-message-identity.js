"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mergeGlobalHistoryMessageIdentities = mergeGlobalHistoryMessageIdentities;
const legacyKey = (message) => [message.role, message.timestamp || '', message.content || ''].join('\u0001');
const stableKey = (message) => message.id ? `${message.role}:message:${message.id}`
    : message.agenticRun?.id ? `${message.role}:run:${message.agenticRun.id}` : '';
/** Stable IDs override mutable timestamps; legacy aliasing requires exact proof. */
function mergeGlobalHistoryMessageIdentities(messages, pickMetadata) {
    const rows = new Map(), aliases = new Map();
    for (const message of messages) {
        const stable = stableKey(message), legacy = legacyKey(message), alias = aliases.get(legacy);
        const previousAlias = alias && rows.get(alias);
        const key = stable && rows.has(stable) ? stable : alias && (!stable || !stableKey(previousAlias)) ? alias : stable || `legacy:${legacy}`;
        const previous = rows.get(key), outputKey = stable || key;
        if (outputKey !== key)
            rows.delete(key);
        rows.set(outputKey, previous ? { ...previous, ...pickMetadata(message), role: previous.role, content: previous.content, timestamp: previous.timestamp } : message);
        aliases.set(legacy, outputKey);
    }
    return [...rows.values()].sort((a, b) => String(a.timestamp || '').localeCompare(String(b.timestamp || '')));
}
//# sourceMappingURL=global-history-message-identity.js.map