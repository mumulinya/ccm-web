"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleMusicDetailApi = handleMusicDetailApi;
const utils_1 = require("../../core/utils");
const media_detail_1 = require("./media-detail");
const media_preview_1 = require("./media-preview");
const media_errors_1 = require("./media-errors");
function handleMusicDetailApi(pathname, req, res) {
    if ((0, media_preview_1.handlePreviewRead)(pathname, req, res))
        return true;
    if (!['/api/music/media/detail', '/api/music/media/previews'].includes(pathname))
        return false;
    if (req.method !== 'POST') {
        (0, utils_1.sendJson)(res, { success: false, error: '请使用 POST' }, 405);
        return true;
    }
    let raw = '';
    req.on('data', b => { raw += b; if (Buffer.byteLength(raw) > 16384)
        req.destroy(); });
    req.on('end', async () => { try {
        const body = JSON.parse(raw || '{}');
        (0, utils_1.sendJson)(res, pathname.endsWith('/detail') ? { success: true, detail: await (0, media_detail_1.readMusicDetailResilient)(body) } : { success: true, preview: (0, media_preview_1.createMusicPreview)(body) });
    }
    catch (e) {
        (0, utils_1.sendJson)(res, { success: false, error: (0, media_errors_1.publicMediaError)(e), errorKind: e?.category }, 400);
    } });
    return true;
}
//# sourceMappingURL=media-detail-api.js.map