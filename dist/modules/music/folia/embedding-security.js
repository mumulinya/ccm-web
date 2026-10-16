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
exports.applyFoliaEmbeddingHeaders = applyFoliaEmbeddingHeaders;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const cache = new Map();
// 只允许当前构建中原有的内联启动脚本，避免为嵌入播放器开放任意内联脚本。
function applyFoliaEmbeddingHeaders(res, root) {
    const index = path.join(root, 'index.html');
    const stat = fs.existsSync(index) ? fs.statSync(index) : null;
    const signature = stat ? `${stat.mtimeMs}:${stat.size}` : '';
    let entry = cache.get(root);
    if (!entry || entry.signature !== signature) {
        const html = stat ? fs.readFileSync(index, 'utf8') : '';
        const hashes = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].filter(match => !/\bsrc\s*=/i.test(match[1]) && match[2].trim()).map(match => `'sha256-${crypto.createHash('sha256').update(match[2]).digest('base64')}'`).join(' ');
        entry = { signature, policy: `default-src 'self'; base-uri 'self'; frame-ancestors 'self'; object-src 'none'; script-src 'self' 'wasm-unsafe-eval' ${hashes}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; media-src 'self' blob: https:; font-src 'self' data: https:; connect-src 'self' https:; worker-src 'self' blob:` };
        cache.set(root, entry);
    }
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Content-Security-Policy', entry.policy);
}
//# sourceMappingURL=embedding-security.js.map