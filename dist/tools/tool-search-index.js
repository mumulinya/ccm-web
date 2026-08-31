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
exports.recordToolSearchSuccess = recordToolSearchSuccess;
exports.searchTools = searchTools;
const crypto = __importStar(require("crypto"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const atomic_json_file_1 = require("../core/atomic-json-file");
const USAGE_FILE = path.join(process.env.CCM_TOOL_SEARCH_STATE_DIR || path.join(os.homedir(), ".ccm"), "tool-search-usage.json");
function normalized(value) {
    return String(value || "").toLowerCase().replace(/[^\p{L}\p{N}_-]+/gu, " ").trim();
}
function terms(value) {
    return [...new Set(normalized(value).split(/\s+/).filter(item => item.length > 1))];
}
function flattenSchema(value, prefix = "", depth = 0) {
    if (!value || typeof value !== "object" || depth > 4)
        return [];
    const rows = [];
    for (const [key, child] of Object.entries(value)) {
        rows.push(prefix ? `${prefix}.${key}` : key);
        if (child && typeof child === "object")
            rows.push(...flattenSchema(child, prefix ? `${prefix}.${key}` : key, depth + 1));
    }
    return rows.slice(0, 500);
}
function readUsage() {
    const fallback = { schema: "ccm-tool-search-usage-v1", revision: 0, rows: [] };
    const value = (0, atomic_json_file_1.readJsonWithBackup)(USAGE_FILE, fallback);
    return { schema: fallback.schema, revision: Number(value?.revision || 0), rows: Array.isArray(value?.rows) ? value.rows : [] };
}
function recordToolSearchSuccess(toolName) {
    const name = String(toolName || "").trim();
    if (!name)
        return;
    (0, atomic_json_file_1.withFileLock)(USAGE_FILE, () => {
        const store = readUsage();
        const row = store.rows.find(item => item.name === name);
        if (row) {
            row.successes += 1;
            row.lastSuccessAt = new Date().toISOString();
        }
        else
            store.rows.push({ name, successes: 1, lastSuccessAt: new Date().toISOString() });
        store.rows = store.rows.sort((a, b) => Date.parse(b.lastSuccessAt) - Date.parse(a.lastSuccessAt)).slice(0, 2000);
        store.revision += 1;
        (0, atomic_json_file_1.writeJsonAtomic)(USAGE_FILE, store);
    });
}
function searchTools(input) {
    const raw = String(input.query || "").trim();
    const select = /^select:\s*(.+)$/i.exec(raw)?.[1]?.trim() || "";
    const queryTerms = terms(select || raw);
    const intentTerms = terms(input.intent || "");
    const usage = new Map(readUsage().rows.map(row => [row.name, row]));
    const candidates = (input.tools || []).filter(tool => tool && tool.authorized !== false && tool.connected !== false && tool.schemaDrift !== true && tool.trusted !== false).map((tool, ordinal) => {
        const name = String(tool.name || "");
        const canonicalName = String(tool.canonicalName || name);
        const aliases = [...new Set([...(Array.isArray(tool.aliases) ? tool.aliases : []), tool.server, tool.server && name ? `${tool.server}/${name}` : ""].map(String).filter(Boolean))];
        const nameText = normalized(name);
        const canonicalText = normalized(canonicalName);
        const aliasText = normalized(aliases.join(" "));
        const descriptionText = normalized(tool.description);
        const schemaFields = flattenSchema(tool.inputSchema).map(normalized);
        const exact = !!select && [nameText, canonicalText, ...aliases.map(normalized)].includes(normalized(select));
        let score = exact ? 1_000_000 : 0;
        const reasons = [];
        for (const term of queryTerms) {
            if (nameText === term || canonicalText === term) {
                score += 160;
                reasons.push(`名称:${term}`);
            }
            else if (nameText.includes(term) || canonicalText.includes(term)) {
                score += 80;
                reasons.push(`名称片段:${term}`);
            }
            if (aliasText.split(" ").includes(term)) {
                score += 60;
                reasons.push(`别名:${term}`);
            }
            else if (aliasText.includes(term))
                score += 30;
            if (descriptionText.includes(term)) {
                score += 24;
                reasons.push(`描述:${term}`);
            }
            if (schemaFields.some(field => field === term || field.endsWith(` ${term}`) || field.includes(term))) {
                score += 18;
                reasons.push(`参数:${term}`);
            }
        }
        for (const term of intentTerms) {
            if (descriptionText.includes(term))
                score += 6;
            if (nameText.includes(term) || canonicalText.includes(term))
                score += 10;
        }
        if (tool.alwaysLoad === true || tool.builtin === true || tool.server === "ccm__workspace_readonly") {
            score += 8;
            reasons.push("内置优先");
        }
        const used = usage.get(canonicalName) || usage.get(name);
        if (used) {
            const ageDays = Math.max(0, (Date.now() - Date.parse(used.lastSuccessAt)) / 86_400_000);
            score += Math.max(0, 20 - ageDays) + Math.min(15, Math.log2(used.successes + 1) * 3);
            reasons.push("最近成功使用");
        }
        if (!queryTerms.length)
            score += Math.max(0, 5 - ordinal / 1000);
        return { tool, score, exact, reasons: [...new Set(reasons)].slice(0, 8), schemaChecksum: String(tool.checksum || crypto.createHash("sha256").update(JSON.stringify(tool.inputSchema || null)).digest("hex")) };
    });
    const filtered = select ? candidates.filter(item => item.exact) : candidates.filter(item => !queryTerms.length || item.score > 0);
    return filtered.sort((a, b) => b.score - a.score || String(a.tool.canonicalName || a.tool.name).localeCompare(String(b.tool.canonicalName || b.tool.name))).slice(0, Math.max(1, Math.min(50, Number(input.maxResults || 12))));
}
//# sourceMappingURL=tool-search-index.js.map