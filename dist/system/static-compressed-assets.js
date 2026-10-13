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
exports.resolveCompressedStaticSlice = resolveCompressedStaticSlice;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const publicRoot = path.resolve(__dirname, '../../public');
const indexPath = path.join(publicRoot, 'assets/ccm-static-compressed.json');
const archivePath = path.join(publicRoot, 'assets/ccm-static-compressed.pack');
let cached = null;
let loading = null;
const verified = new Map();
async function loadIndex() {
    const stat = await fs.promises.stat(indexPath);
    const version = `${stat.mtimeMs}:${stat.ctimeMs}:${stat.size}`;
    if (cached?.version === version)
        return cached.index;
    if (loading)
        return loading;
    loading = (async () => {
        if (stat.size > 1024 * 1024)
            return null;
        const index = JSON.parse(await fs.promises.readFile(indexPath, 'utf8'));
        const archive = await fs.promises.stat(archivePath);
        if (index.version !== 1 || archive.size !== index.archiveSize)
            return null;
        cached = { version, index };
        verified.clear();
        return index;
    })();
    try {
        return await loading;
    }
    finally {
        loading = null;
    }
}
/** Build-time compressed bytes, streamed from a single npm artifact. Original
 * content is verified once per file version so stale packs never serve an old
 * build. Failure falls back to normal static delivery. */
async function resolveCompressedStaticSlice(file, coding, original) {
    const relative = path.relative(publicRoot, path.resolve(file));
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative))
        return null;
    try {
        const index = await loadIndex();
        const entry = index?.entries?.[relative.replace(/\\/g, '/')];
        const variant = entry?.variants?.[coding];
        if (!variant || entry.sourceSize !== original.size || !Number.isSafeInteger(variant.offset) || !Number.isSafeInteger(variant.size)
            || variant.offset < 0 || variant.size <= 0 || variant.offset + variant.size > index.archiveSize)
            return null;
        const version = `${original.dev}:${original.ino}:${original.mtimeMs}:${original.ctimeMs}:${original.size}:${entry.sourceChecksum}`;
        if (verified.get(file) !== version) {
            const checksum = crypto.createHash('sha256').update(await fs.promises.readFile(file)).digest('hex');
            const after = await fs.promises.stat(file);
            if (checksum !== entry.sourceChecksum || after.mtimeMs !== original.mtimeMs || after.ctimeMs !== original.ctimeMs || after.size !== original.size)
                return null;
            if (verified.size >= 256)
                verified.delete(verified.keys().next().value);
            verified.set(file, version);
        }
        return { file: archivePath, offset: variant.offset, size: variant.size, etag: `"${entry.sourceChecksum}-${coding}"` };
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=static-compressed-assets.js.map