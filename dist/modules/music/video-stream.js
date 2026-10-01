"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.streamMusicVideo = streamMusicVideo;
const fs = __importStar(require("fs"));
/** Serve a verified managed MP4, including byte ranges for native seeking. */
function streamMusicVideo(req, res, file) {
    const size = fs.statSync(file).size;
    const headers = { 'Content-Type': 'video/mp4', 'Accept-Ranges': 'bytes', 'Cache-Control': 'private, no-cache', 'X-Content-Type-Options': 'nosniff' };
    let start = 0, end = size - 1, partial = false;
    if (req.headers.range) {
        const match = /^bytes=(\d*)-(\d*)$/.exec(String(req.headers.range));
        const invalid = () => { res.writeHead(416, { ...headers, 'Content-Range': `bytes */${size}` }); res.end(); };
        if (!match || (!match[1] && !match[2]))
            return invalid();
        if (!match[1]) {
            const suffix = Number(match[2]);
            if (!Number.isSafeInteger(suffix) || suffix <= 0)
                return invalid();
            start = Math.max(0, size - suffix);
        }
        else {
            start = Number(match[1]);
            end = match[2] ? Number(match[2]) : end;
            if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= size || start > end)
                return invalid();
            end = Math.min(end, size - 1);
        }
        partial = true;
        headers['Content-Range'] = `bytes ${start}-${end}/${size}`;
    }
    headers['Content-Length'] = Math.max(0, end - start + 1);
    res.writeHead(partial ? 206 : 200, headers);
    if (req.method === 'HEAD' || size === 0) {
        res.end();
        return;
    }
    const stream = fs.createReadStream(file, { start, end });
    res.on('close', () => stream.destroy());
    stream.on('error', () => res.destroy());
    stream.pipe(res);
}
//# sourceMappingURL=video-stream.js.map