"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mergeTranscriptIngestion = mergeTranscriptIngestion;
// Preserve the existing ten-second duplicate semantics while avoiding a full
// transcript copy/reverse for every incoming message during history migration.
function mergeTranscriptIngestion(existing, incoming, normalize, onNew) {
    const byId = new Map(existing.map(message => [message.id, message]));
    const byContent = new Map();
    const key = (message) => `${message.role}\0${message.content}`;
    const add = (message) => { const bucket = byContent.get(key(message)) || []; bucket.push(message); byContent.set(key(message), bucket); };
    existing.forEach(add);
    let changed = false, assistantAdded = false;
    for (const raw of incoming) {
        const message = normalize(raw);
        if (!message.content.trim())
            continue;
        if ((byContent.get(key(message)) || []).some(item => Math.abs(Date.parse(item.timestamp) - Date.parse(message.timestamp)) <= 10_000))
            continue;
        const previous = byId.get(message.id);
        if (previous)
            byContent.set(key(previous), (byContent.get(key(previous)) || []).filter(item => item.id !== previous.id));
        byId.set(message.id, message);
        add(message);
        changed = true;
        onNew(raw, message);
        if (message.role === 'assistant')
            assistantAdded = true;
    }
    return { messages: [...byId.values()], changed, assistantAdded };
}
//# sourceMappingURL=transcript-ingestion-merge.js.map