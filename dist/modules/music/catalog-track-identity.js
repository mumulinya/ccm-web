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
exports.assignCatalogTrackIdentities = assignCatalogTrackIdentities;
const crypto = __importStar(require("crypto"));
/** 内容校验和用于去重，文件条目 ID 还必须能区分相同内容的多个副本。 */
function assignCatalogTrackIdentities(rows, previous) {
    const previousByFile = new Map(previous.map(row => [row.filename, row]));
    const assigned = new Map(), used = new Set();
    // 先保留旧条目，再分配新副本，避免新文件排序靠前时抢占旧 ID。
    for (const row of rows) {
        const old = previousByFile.get(row.filename);
        if (old?.track_id && old.file_checksum === row.file_checksum && !used.has(old.track_id)) {
            assigned.set(row.filename, old.track_id);
            used.add(old.track_id);
        }
    }
    return rows.map(row => {
        let id = assigned.get(row.filename);
        if (!id) {
            id = row.track_id;
            if (used.has(id)) {
                const base = `${row.track_id}_${crypto.createHash('sha256').update(row.filename).digest('hex').slice(0, 24)}`;
                id = base;
                for (let suffix = 2; used.has(id); suffix++)
                    id = `${base}_${suffix}`;
            }
            used.add(id);
        }
        return { ...row, track_id: id };
    });
}
//# sourceMappingURL=catalog-track-identity.js.map