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
exports.prepareReadonlyDocument = prepareReadonlyDocument;
const fs = __importStar(require("fs"));
const crypto = __importStar(require("crypto"));
const version = (stat) => `${stat.dev}:${stat.ino}:${stat.mtimeMs}:${stat.ctimeMs}:${stat.size}`;
// Executed only by the managed read-only Worker. Never writes business state.
async function prepareReadonlyDocument(input) {
    let before;
    let bytes;
    if (input.file) {
        const descriptor = fs.openSync(input.file, 'r');
        try {
            before = fs.fstatSync(descriptor);
            if (!before.isFile() || before.size > (input.type === 'vision-file' ? 12 : 25) * 1024 * 1024)
                throw new Error('document_source_size_invalid');
            bytes = Buffer.allocUnsafe(before.size);
            let offset = 0;
            while (offset < bytes.length) {
                const count = fs.readSync(descriptor, bytes, offset, Math.min(256 * 1024, bytes.length - offset), offset);
                if (!count)
                    throw new Error('document_source_changed');
                offset += count;
            }
            if (version(before) !== version(fs.fstatSync(descriptor)))
                throw new Error('document_source_changed');
        }
        finally {
            fs.closeSync(descriptor);
        }
    }
    else {
        bytes = Buffer.from(input.bytes);
        if (bytes.length > 25 * 1024 * 1024)
            throw new Error('document_source_size_invalid');
    }
    let result;
    if (input.type === 'vision-file') {
        result = { data: bytes.toString('base64'), checksum: crypto.createHash('sha256').update(bytes).digest('hex') };
    }
    else {
        const parsed = await require('pdf-parse')(bytes);
        result = { text: String(parsed?.text || '').trim() };
    }
    if (before) {
        if (version(before) !== version(fs.statSync(input.file)))
            throw new Error('document_source_changed');
        result.sourceVersion = version(before);
    }
    return result;
}
//# sourceMappingURL=readonly-document-parser.js.map