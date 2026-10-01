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
exports.orderStablePrefixBlocks = orderStablePrefixBlocks;
const workspace_model_result_projection_1 = require("../tools/workspace-model-result-projection");
const crypto = __importStar(require("crypto"));
function orderStablePrefixBlocks(blocks = []) {
    const rank = (b) => ({ public: 0, ccm: 0, role: 1, agent: 1, prompt: 2, skill: 2, tool: 3, schema: 3, scope: 4, project: 4, group: 4, global: 4 }[String(b?.category || b?.kind || '').toLowerCase()] ?? 99);
    return (Array.isArray(blocks) ? blocks : []).filter(b => b?.prefixEligible === true).map((b, i) => {
        const checksum = String(b.checksum || b.contentChecksum || crypto.createHash('sha256').update((0, workspace_model_result_projection_1.stableModelJson)(b.content ?? b)).digest('hex'));
        return { id: String(b.id || `stable-${i}`), version: String(b.version || 'v1'), prefixEligible: true, checksum, tokens: Math.max(0, Number(b.tokens || 0)), contentStored: false, _rank: rank(b), _order: i };
    }).sort((a, b) => a._rank - b._rank || a.id.localeCompare(b.id)).map(({ _rank, _order, ...b }) => b);
}
//# sourceMappingURL=stable-prefix-layout.js.map