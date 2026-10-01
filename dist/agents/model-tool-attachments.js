"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.modelToolAttachments = modelToolAttachments;
exports.appendModelToolAttachments = appendModelToolAttachments;
exports.materializeInputAttachments = materializeInputAttachments;
const transient_model_content_1 = require("../system/transient-model-content");
/** Serializable attachment evidence, separate from the textual tool body. */
function modelToolAttachments(row) {
    if (Array.isArray(row?.modelAttachments))
        return row.modelAttachments;
    const seen = new Set();
    return [row, row?.output, row?.modelOutput, row?.result].flatMap(value => (0, transient_model_content_1.transientModelBlocks)(value))
        .filter(block => { if (seen.has(block))
        return false; seen.add(block); return true; })
        .map(block => block.type === 'text' ? { type: 'text', text: block.text }
        : { type: 'image', mimeType: block.mimeType, data: block.data.toString('base64'), label: block.label });
}
function appendModelToolAttachments(messages, rows, family) {
    const parts = [];
    for (const row of rows)
        for (const block of row.modelAttachments || []) {
            const text = block.type === 'text' ? block.text : `${row.callId ? `工具 ${row.callId}：` : ''}${block.label || '视觉内容'}`;
            parts.push(family === 'gemini' ? { text } : { type: 'text', text });
            if (block.type === 'image')
                parts.push(family === 'anthropic'
                    ? { type: 'image', source: { type: 'base64', media_type: block.mimeType, data: block.data } }
                    : family === 'gemini' ? { inlineData: { mimeType: block.mimeType, data: block.data } }
                        : { type: 'image_url', image_url: { url: `data:${block.mimeType};base64,${block.data}` } });
        }
    return parts.length ? [...messages, { role: 'user', content: parts }] : messages;
}
function materializeInputAttachments(messages, family) {
    return appendModelToolAttachments(messages, [{ modelAttachments: modelToolAttachments(messages) }], family);
}
//# sourceMappingURL=model-tool-attachments.js.map