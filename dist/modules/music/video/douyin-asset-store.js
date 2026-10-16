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
exports.listDouyinAssets = exports.getDouyinAssetById = exports.getDouyinAsset = exports.douyinOwnerDirectory = void 0;
exports.upsertDouyinAsset = upsertDouyinAsset;
exports.upsertDouyinOperation = upsertDouyinOperation;
exports.findActiveDouyinOperation = findActiveDouyinOperation;
const crypto = __importStar(require("crypto"));
const shared = __importStar(require("../music-persistence"));
const accounts_store_1 = require("./accounts-store");
const access_1 = require("./access");
// 保留旧表和旧数据，以内部来源键隔离新用户资产；公开 DTO 始终保留真实抖音 ID。
const douyinOwnerDirectory = () => (0, accounts_store_1.videoOwner)() === 'workspace' ? '' : crypto.createHash('sha256').update((0, accounts_store_1.videoOwner)()).digest('hex').slice(0, 32);
exports.douyinOwnerDirectory = douyinOwnerDirectory;
const prefix = () => (0, exports.douyinOwnerDirectory)() ? `owner:${(0, exports.douyinOwnerDirectory)()}:` : '';
const scoped = (id) => prefix() + id;
function visible(row) { if (!row)
    return null; const marker = prefix(); if (marker ? !String(row.source_id).startsWith(marker) : String(row.source_id).startsWith('owner:'))
    return null; let metadata = {}; try {
    metadata = JSON.parse(row.metadata_json || '{}');
}
catch { } if (!(0, access_1.videoMediaVisible)({ ...metadata.videoScope, source: 'douyin' }))
    return null; return { ...row, source_id: marker ? String(row.source_id).slice(marker.length) : row.source_id }; }
const getDouyinAsset = (id, kind) => visible(shared.getDouyinAsset(scoped(id), kind));
exports.getDouyinAsset = getDouyinAsset;
const getDouyinAssetById = (id) => visible(shared.getDouyinAssetById(id));
exports.getDouyinAssetById = getDouyinAssetById;
const listDouyinAssets = (limit = 200) => shared.listDouyinAssets(limit).map(visible).filter(Boolean);
exports.listDouyinAssets = listDouyinAssets;
function upsertDouyinAsset(value) { const row = shared.upsertDouyinAsset({ ...value, sourceId: scoped(String(value.sourceId || value.source_id)), metadata: { ...value.metadata, videoScope: (0, access_1.videoMediaScope)('douyin') } }); return visible(row); }
function upsertDouyinOperation(value) { const row = shared.upsertDouyinOperation({ ...value, sourceId: scoped(String(value.sourceId || value.source_id)) }); return row ? { ...row, source_id: String(value.sourceId || value.source_id) } : row; }
function findActiveDouyinOperation(id, kind) { const row = shared.findActiveDouyinOperation(scoped(id), kind); return row ? { ...row, source_id: id } : row; }
//# sourceMappingURL=douyin-asset-store.js.map