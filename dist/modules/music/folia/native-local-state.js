"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanFoliaLocalState = cleanFoliaLocalState;
const workspace_catalog_1 = require("./workspace-catalog");
const music_catalog_1 = require("../music-catalog");
// Folia 本地资料选择是服务器权威状态；文件句柄、缓存二进制与账号凭据不参与同步。
const fields = ['title', 'titleOrigin', 'importedMetadata', 'onlineMetadata', 'localLyricsContent', 'localTranslationLyricsContent', 'localLyricsFormat', 'hasLocalLyrics', 'embeddedLyricsContent', 'embeddedTranslationLyricsContent', 'hasEmbeddedLyrics', 'lyricsSource', 'matchedLyrics', 'matchedLyricsSongId', 'matchedIsPureMusic', 'matchedLyricsSource', 'matchedLyricsProviderPlatform', 'hasManualLyricSelection', 'localLyricsOrigin', 'localTranslationLyricsOrigin', 'hasLocalTranslationLyrics', 'markedPureMusic', 'noAutoMatch', 'useOnlineCover', 'folderName', 'folderPath', 'lyricOffset'];
function cleanFoliaLocalState(input) {
    if (!input || typeof input.filename !== 'string')
        throw new Error('缺少本地歌曲身份');
    (0, music_catalog_1.resolveSafeMusicFile)(input.filename);
    (0, workspace_catalog_1.requireMusicFilename)(input.filename);
    const data = Object.fromEntries(fields.flatMap(key => input.data?.[key] === undefined ? [] : [[key, input.data[key]]]));
    if (Buffer.byteLength(JSON.stringify(data)) > 768 * 1024)
        throw new Error('本地歌曲资料过大');
    const forbidden = /^(cookie|token|access_token|refresh_token|password|passwordHash|fileHandle|coverBlob)$/i;
    const cleanse = (value) => Array.isArray(value) ? value.map(cleanse) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).filter(([key]) => !forbidden.test(key)).map(([key, item]) => [key, cleanse(item)])) : value;
    return { filename: input.filename, data: cleanse(data) };
}
//# sourceMappingURL=native-local-state.js.map