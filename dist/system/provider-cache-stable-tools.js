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
exports.stabilizeProviderCacheToolOrder = stabilizeProviderCacheToolOrder;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const atomic_json_file_1 = require("../core/atomic-json-file");
const ROOT = path.join(os.homedir(), ".ccm", "provider-context-cache", "tool-order");
function hash(value, length = 40) {
    return crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value ?? null)).digest("hex").slice(0, length);
}
function identity(input) {
    const scope = String(input?.scope || "other");
    const source = String(input?.source || "").toLowerCase();
    return {
        scope,
        scopeId: scope === "global" ? "global" : String(input?.scopeId || ""),
        scopeProfile: /summary|title|memory|compact|review|suggest|secondary|semantic|synthesis|distill|extract/.test(source)
            ? "auxiliary"
            : "main_agent",
    };
}
function canonicalValue(value) {
    if (Array.isArray(value))
        return value.map(canonicalValue);
    if (!value || typeof value !== "object")
        return value;
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalValue(value[key])]));
}
function canonicalTool(tool) {
    return {
        name: String(tool.name || ""),
        description: String(tool.description || ""),
        inputSchema: canonicalValue(tool.inputSchema || { type: "object", properties: {} }),
        ...(tool.deferred === true ? { deferred: true } : {}),
    };
}
function stabilizeProviderCacheToolOrder(tools, input) {
    const rows = Array.isArray(tools)
        ? [...new Map(tools.filter(tool => !!tool?.name).map(tool => [String(tool.name), canonicalTool(tool)])).values()]
        : [];
    if (rows.length < 2)
        return rows;
    const key = identity(input);
    const file = path.join(ROOT, `${hash(key)}.json`);
    let previous = [];
    try {
        const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
        if (parsed?.contentStored === false && parsed?.identityChecksum === hash(key, 64))
            previous = Array.isArray(parsed.order) ? parsed.order.map(String) : [];
    }
    catch { }
    const byName = new Map(rows.map(tool => [String(tool.name), tool]));
    const order = [
        ...previous.filter(name => byName.has(name)),
        ...[...byName.keys()].filter(name => !previous.includes(name)).sort((a, b) => a.localeCompare(b)),
    ];
    try {
        fs.mkdirSync(ROOT, { recursive: true });
        (0, atomic_json_file_1.writeJsonAtomic)(file, {
            schema: "ccm-provider-cache-tool-order-v1",
            identityChecksum: hash(key, 64),
            order,
            updatedAt: new Date().toISOString(),
            contentStored: false,
        });
    }
    catch { }
    return order.map(name => byName.get(name)).filter(Boolean);
}
//# sourceMappingURL=provider-cache-stable-tools.js.map