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
exports.buildStableToolSchema = buildStableToolSchema;
const crypto = __importStar(require("crypto"));
const workspace_model_result_projection_1 = require("../tools/workspace-model-result-projection");
function normalize(value) {
    if (Array.isArray(value))
        return value.map(normalize);
    if (!value || typeof value !== "object")
        return value;
    return Object.keys(value).sort().reduce((out, key) => {
        if (["callCount", "lastCalledAt", "status", "result", "invoked", "recentlyUsed"].includes(key))
            return out;
        out[key] = normalize(value[key]);
        return out;
    }, {});
}
function buildStableToolSchema(tools = [], version = "ccm-tool-schema-v1") {
    const projected = (Array.isArray(tools) ? tools : []).map(tool => normalize(tool)).sort((a, b) => String(a?.name || a?.canonicalName || a?.function?.name || "").localeCompare(String(b?.name || b?.canonicalName || b?.function?.name || "")));
    const checksum = crypto.createHash("sha256").update((0, workspace_model_result_projection_1.stableModelJson)(projected)).digest("hex");
    const tokens = Math.ceil((0, workspace_model_result_projection_1.stableModelJson)(projected).length / 4);
    return { version, checksum, tools: projected, tokens, stable: true, contentStored: false };
}
//# sourceMappingURL=stable-tool-schema.js.map