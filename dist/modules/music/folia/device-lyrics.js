"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanDeviceLyricData = cleanDeviceLyricData;
// 保留 Folia 逐字、分词、翻译、罗马音和背景人声资料；未知运行时/凭据字段不进入服务端。
const fields = new Set(['lines', 'title', 'artist', 'isWordByWord', 'ttml', 'timingMode', 'startTime', 'endTime', 'fullText', 'words', 'text', 'syllables', 'endsWithSpace', 'ruby', 'obscene', 'emptyBeat', 'role', 'language', 'alternateTexts', 'backgroundVocal', 'backgroundVocals', 'agentId', 'id', 'name', 'type', 'songPart', 'blockIndex', 'romanization', 'translation', 'isChorus', 'chorusEffect', 'wordSegments', 'autoWordSegments']);
function clean(value, depth = 0) {
    if (depth > 9)
        return undefined;
    if (value === null || typeof value === 'boolean')
        return value;
    if (typeof value === 'number')
        return Number.isFinite(value) ? value : 0;
    if (typeof value === 'string')
        return value.replace(/[\u0000-\u0008\u000b-\u001f]/g, '').slice(0, 4000);
    if (Array.isArray(value))
        return value.slice(0, 4000).map(item => clean(item, depth + 1));
    if (value && typeof value === 'object')
        return Object.fromEntries(Object.entries(value).flatMap(([key, item]) => {
            if (key === 'agents' && depth < 4 && item && typeof item === 'object' && !Array.isArray(item))
                return [[key, Object.fromEntries(Object.entries(item).slice(0, 64).filter(([id]) => !['__proto__', 'prototype', 'constructor'].includes(id)).map(([id, agent]) => [id.slice(0, 100), clean(agent, depth + 1)]))]];
            return fields.has(key) ? [[key, clean(item, depth + 1)]] : [];
        }));
    return undefined;
}
function cleanDeviceLyricData(input) { if (!input || !Array.isArray(input.lines) || input.lines.length > 4000 || input.lines.some((line) => !line || typeof line !== 'object' || typeof line.fullText !== 'string' || !Number.isFinite(line.startTime) || !Number.isFinite(line.endTime) || !Array.isArray(line.words)))
    throw Error('设备歌词无效'); return clean(input); }
//# sourceMappingURL=device-lyrics.js.map