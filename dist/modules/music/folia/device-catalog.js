"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyDeviceCatalogMutation = applyDeviceCatalogMutation;
const device_metadata_1 = require("./device-metadata");
const device_lyrics_1 = require("./device-lyrics");
// 设备目录是授权引用与资料投影；不保存本机路径、媒体 URL、凭据或文件句柄。
const uuid = (value) => typeof value === 'string' && /^[a-f0-9-]{36}$/i.test(value);
const text = (value, max = 240) => typeof value === 'string' ? value.replace(/[\u0000-\u001f]/g, '').slice(0, max) : '';
function lyrics(input) {
    return (0, device_lyrics_1.cleanDeviceLyricData)(input);
}
function lyricState(input) {
    if (!input || !['online', 'imported'].includes(input.lyricsSource))
        throw Error('设备歌词选择无效');
    const value = { lyricsSource: input.lyricsSource, hasOnlineOverride: input.hasOnlineOverride === true };
    if (typeof input.matchedIsPureMusic === 'boolean')
        value.matchedIsPureMusic = input.matchedIsPureMusic;
    for (const key of ['importedLyrics', 'onlineOverrideLyrics'])
        if (input[key] === null)
            value[key] = null;
        else if (input[key])
            value[key] = lyrics(input[key]);
    for (const key of ['importedLyricsName', 'matchedSongId', 'matchedLyricsSource', 'matchedLyricsProviderPlatform'])
        if (input[key] !== undefined)
            value[key] = text(String(input[key]), 200);
    if (Buffer.byteLength(JSON.stringify(value)) > 512 * 1024)
        throw Error('设备歌词资料过大');
    return value;
}
function applyDeviceCatalogMutation(input, operation) {
    if (!uuid(operation?.deviceId))
        throw Error('设备引用无效');
    const state = structuredClone(input || { version: 1, devices: {} });
    state.devices ||= {};
    if (!state.devices[operation.deviceId] && Object.keys(state.devices).length >= 32)
        throw Error('设备索引数量超出限制');
    const device = state.devices[operation.deviceId] || { music: [], video: [], metadata: {} };
    if (operation.kind === 'index') {
        if (!['music', 'video'].includes(operation.mediaKind) || !Array.isArray(operation.entries) || operation.entries.length > 2000)
            throw Error('设备文件索引无效或过多');
        device[operation.mediaKind] = operation.entries.map((entry) => {
            if (!uuid(entry.id) || typeof entry.name !== 'string' || /[\\/]/.test(entry.name))
                throw Error('设备文件引用或名称无效');
            return { id: entry.id, name: text(entry.name), title: text(entry.title), size: Math.max(0, Math.min(2 ** 41, Number(entry.size) || 0)), modifiedAt: Math.max(0, Number(entry.modifiedAt) || 0) };
        });
        device.indexedAt = new Date().toISOString();
    }
    else if (['lyrics', 'metadata', 'instrumental'].includes(operation.kind)) {
        if (!uuid(operation.fileId) || !device.music.some((entry) => entry.id === operation.fileId))
            throw Error('请先同步当前设备的音乐索引');
        const previous = device.metadata?.[operation.fileId] || { revision: 0 };
        if (operation.expectedMetadataRevision !== previous.revision)
            throw Object.assign(Error('歌曲资料已在其他窗口修改，请刷新后重试'), { statusCode: 409 });
        let changes;
        if (operation.kind === 'lyrics')
            changes = { onlineLyricsState: lyricState(operation.state), instrumental: false, pureMusicBackup: null };
        else if (operation.kind === 'metadata')
            changes = { selection: (0, device_metadata_1.cleanDeviceMetadata)(operation.selection) };
        else {
            if (typeof operation.marked !== 'boolean')
                throw Error('纯音乐标记无效');
            changes = { instrumental: operation.marked, onlineLyricsState: operation.marked ? { lyricsSource: 'online', hasOnlineOverride: true, onlineOverrideLyrics: null, matchedIsPureMusic: true } : previous.pureMusicBackup || null, pureMusicBackup: operation.marked ? (previous.instrumental ? previous.pureMusicBackup : previous.onlineLyricsState || null) : null };
        }
        device.metadata ||= {};
        device.metadata[operation.fileId] = { ...previous, revision: previous.revision + 1, ...changes };
    }
    else
        throw Error('设备资料操作无效');
    state.devices[operation.deviceId] = device;
    if (Buffer.byteLength(JSON.stringify(state)) > 8 * 1024 * 1024)
        throw Error('设备资料库已达容量限制');
    return state;
}
//# sourceMappingURL=device-catalog.js.map