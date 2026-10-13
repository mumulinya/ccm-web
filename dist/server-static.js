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
exports.sendFile = sendFile;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const static_compressed_assets_1 = require("./system/static-compressed-assets");
const types = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css',
    '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.gif': 'image/gif', '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.eot': 'application/vnd.ms-fontobject', '.map': 'application/json' };
function quality(header, coding) {
    const entries = header.split(',').map(part => part.trim().split(';'));
    const entry = entries.find(part => part[0].toLowerCase() === coding) || entries.find(part => part[0] === '*');
    if (!entry)
        return coding === 'identity' ? 1 : 0;
    const q = entry.slice(1).find(value => /^\s*q\s*=/i.test(value));
    const value = q ? Number(q.split('=')[1]) : 1;
    return Number.isFinite(value) && value >= 0 && value <= 1 ? value : 0;
}
// Optional request keeps internal callers compatible with identity delivery.
function sendFile(res, filePath, req) {
    fs.stat(filePath, (error, original) => {
        if (error || !original.isFile()) {
            res.writeHead(404);
            res.end('Not Found');
            return;
        }
        const ext = path.extname(filePath).toLowerCase();
        const header = String(req?.headers?.['accept-encoding'] || '');
        const choices = req?.headers?.range ? [] : ['br', 'gzip'].filter(coding => quality(header, coding) > 0)
            .sort((a, b) => quality(header, b) - quality(header, a));
        const deliver = (selected, stat, coding, slice) => {
            if (!coding && header && quality(header, 'identity') === 0) {
                res.writeHead(406);
                res.end();
                return;
            }
            const etag = slice?.etag || 'W/"' + stat.size.toString(16) + '-' + Math.trunc(stat.mtimeMs).toString(16) + '-' + (coding || 'identity') + '"';
            const priorVary = String(res.getHeader('Vary') || '');
            const headers = { 'Content-Type': types[ext] || 'application/octet-stream', 'Content-Length': slice?.size ?? stat.size, ETag: etag,
                'Last-Modified': original.mtime.toUTCString(), Vary: [...new Set([...priorVary.split(',').map(x => x.trim()).filter(Boolean), 'Accept-Encoding'])].join(', '),
                'Cache-Control': ext === '.html' ? 'no-cache' : /[.-][\w-]{8,}\.(?:js|css)$/.test(path.basename(filePath)) ? 'public, max-age=31536000, immutable' : 'no-cache' };
            if (coding)
                headers['Content-Encoding'] = coding;
            const noneMatch = String(req?.headers?.['if-none-match'] || '');
            const modified = req?.headers?.['if-modified-since'];
            if (noneMatch.split(',').map(x => x.trim()).some(x => x === etag || x === '*')
                || (!noneMatch && modified && Math.floor(original.mtimeMs / 1000) <= Math.floor(Date.parse(modified) / 1000))) {
                delete headers['Content-Length'];
                res.writeHead(304, headers);
                res.end();
                return;
            }
            res.writeHead(200, headers);
            if (req?.method === 'HEAD') {
                res.end();
                return;
            }
            const stream = fs.createReadStream(selected, slice ? { start: slice.offset, end: slice.offset + slice.size - 1 } : undefined);
            stream.on('error', () => res.destroy());
            res.once('close', () => stream.destroy());
            stream.pipe(res);
        };
        const choose = async (index) => {
            if (index >= choices.length) {
                deliver(filePath, original, '');
                return;
            }
            const coding = choices[index], candidate = filePath + '.' + (coding === 'gzip' ? 'gz' : 'br');
            const slice = await (0, static_compressed_assets_1.resolveCompressedStaticSlice)(filePath, coding, original);
            if (slice) {
                deliver(slice.file, original, coding, slice);
                return;
            }
            fs.stat(candidate, (err, stat) => {
                if (err || !stat.isFile() || stat.mtimeMs < original.mtimeMs)
                    choose(index + 1);
                else
                    deliver(candidate, stat, coding);
            });
        };
        choose(0);
    });
}
//# sourceMappingURL=server-static.js.map