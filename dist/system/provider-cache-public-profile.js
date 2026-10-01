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
exports.PROVIDER_CACHE_PUBLIC_PROFILE_VERSION = void 0;
exports.buildProviderCachePublicToolProfile = buildProviderCachePublicToolProfile;
exports.buildProviderCachePublicProfile = buildProviderCachePublicProfile;
const crypto = __importStar(require("crypto"));
const workspace_model_result_projection_1 = require("../tools/workspace-model-result-projection");
const ccm_public_stable_prefix_1 = require("./ccm-public-stable-prefix");
exports.PROVIDER_CACHE_PUBLIC_PROFILE_VERSION = "ccm-public-profile-v3";
function digest(value, length = 64) {
    return crypto.createHash("sha256").update(typeof value === "string" ? value : (0, workspace_model_result_projection_1.stableModelJson)(value)).digest("hex").slice(0, length);
}
/**
 * The public tool profile is a schema fingerprint only. It deliberately does
 * not retain descriptions, permissions, paths, arguments, results, or any
 * session data. The fingerprint lets the Provider route equivalent tool
 * catalogs together without making private tool content part of the cache
 * namespace.
 */
function buildProviderCachePublicToolProfile(input = {}) {
    const schemaChecksum = String(input.publicToolSchemaChecksum || input.toolSchemaChecksum || "");
    const schemaVersion = String(input.publicToolSchemaVersion || input.toolSchemaVersion || "v1");
    return {
        version: exports.PROVIDER_CACHE_PUBLIC_PROFILE_VERSION,
        checksum: digest({
            toolSchemaChecksum: schemaChecksum,
            toolSchemaVersion: schemaVersion,
        }),
        tokens: Math.max(0, Number(input.publicToolSchemaTokens ?? input.toolSchemaTokens ?? 0)),
        schemaChecksum,
        schemaVersion,
        contentStored: false,
    };
}
function buildProviderCachePublicProfile(input = { wireLayoutVersion: "" }) {
    const publicPrefix = (0, ccm_public_stable_prefix_1.getCcmPublicStablePrefix)();
    const tools = buildProviderCachePublicToolProfile(input);
    return {
        profileVersion: exports.PROVIDER_CACHE_PUBLIC_PROFILE_VERSION,
        publicPrefixChecksum: String(input.publicPrefixChecksum || publicPrefix.checksum),
        publicToolProfileChecksum: tools.checksum,
        publicPrefixTokens: publicPrefix.tokens,
        publicToolProfileTokens: tools.tokens,
        publicToolSchemaChecksum: tools.schemaChecksum,
        publicToolSchemaVersion: tools.schemaVersion,
        publicInstructionChecksum: String(input.publicInstructionChecksum || ""),
        publicInstructionTokens: Math.max(0, Number(input.publicInstructionTokens || 0)),
        publicInstructionBlockCount: Math.max(0, Number(input.publicInstructionBlockCount || 0)),
        wireLayoutVersion: String(input.wireLayoutVersion || ""),
        contentStored: false,
    };
}
//# sourceMappingURL=provider-cache-public-profile.js.map