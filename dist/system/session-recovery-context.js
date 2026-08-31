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
exports.buildVerifiedSessionRecoveryContext = buildVerifiedSessionRecoveryContext;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const context_budget_1 = require("./context-budget");
const FILE_LIMIT = 5;
const FILE_TOKEN_LIMIT = 5_000;
const FILE_TOTAL_TOKEN_LIMIT = 50_000;
const SKILL_TOKEN_LIMIT = 5_000;
const SKILL_TOTAL_TOKEN_LIMIT = 25_000;
function withinRoot(rootDir, target) {
    const relative = path.relative(path.resolve(rootDir), path.resolve(target));
    return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}
function truncateToTokens(text, maxTokens) {
    if ((0, context_budget_1.estimateTextTokens)(text) <= maxTokens)
        return text;
    let low = 0;
    let high = text.length;
    while (low < high) {
        const middle = Math.ceil((low + high) / 2);
        if ((0, context_budget_1.estimateTextTokens)(text.slice(0, middle)) <= maxTokens)
            low = middle;
        else
            high = middle - 1;
    }
    return text.slice(0, low);
}
function buildVerifiedSessionRecoveryContext(input) {
    const rootDir = String(input.rootDir || "").trim();
    const files = [];
    const seenFiles = new Set();
    let fileTokens = 0;
    for (const raw of [...(Array.isArray(input.fileReferences) ? input.fileReferences : [])].reverse()) {
        if (files.length >= FILE_LIMIT || fileTokens >= FILE_TOTAL_TOKEN_LIMIT)
            break;
        const recordedPath = String(typeof raw === "string" ? raw : raw?.path || raw?.file || "").trim();
        if (!recordedPath)
            continue;
        const resolved = path.isAbsolute(recordedPath) ? path.resolve(recordedPath) : rootDir ? path.resolve(rootDir, recordedPath) : "";
        if (!resolved || rootDir && !withinRoot(rootDir, resolved))
            continue;
        const key = resolved.toLowerCase();
        if (seenFiles.has(key) || !fs.existsSync(resolved) || !fs.statSync(resolved).isFile())
            continue;
        const source = fs.readFileSync(resolved);
        if (source.includes(0))
            continue;
        const remaining = Math.min(FILE_TOKEN_LIMIT, FILE_TOTAL_TOKEN_LIMIT - fileTokens);
        const content = truncateToTokens(source.toString("utf8"), remaining);
        const tokens = (0, context_budget_1.estimateTextTokens)(content);
        if (!content || tokens <= 0)
            continue;
        seenFiles.add(key);
        fileTokens += tokens;
        files.unshift({ path: recordedPath, resolvedPath: resolved, content, tokens, verified: true });
    }
    const skills = [];
    let skillTokens = 0;
    for (const raw of [...(Array.isArray(input.skills) ? input.skills : [])].reverse()) {
        if (skillTokens >= SKILL_TOTAL_TOKEN_LIMIT)
            break;
        const name = String(raw?.name || "").trim();
        const verified = raw?.verified === true;
        const source = verified ? String(raw?.content || "") : "";
        if (!name || !source)
            continue;
        const remaining = Math.min(SKILL_TOKEN_LIMIT, SKILL_TOTAL_TOKEN_LIMIT - skillTokens);
        const content = truncateToTokens(source, remaining);
        const tokens = (0, context_budget_1.estimateTextTokens)(content);
        if (!content || tokens <= 0)
            continue;
        skillTokens += tokens;
        skills.unshift({ name, content, tokens, verified: true });
    }
    return {
        schema: "ccm-verified-session-recovery-context-v1",
        files,
        skills,
        budgets: {
            fileLimit: FILE_LIMIT,
            fileTokenLimit: FILE_TOKEN_LIMIT,
            fileTotalTokenLimit: FILE_TOTAL_TOKEN_LIMIT,
            skillTokenLimit: SKILL_TOKEN_LIMIT,
            skillTotalTokenLimit: SKILL_TOTAL_TOKEN_LIMIT,
        },
        tokens: { files: fileTokens, skills: skillTokens, total: fileTokens + skillTokens },
    };
}
//# sourceMappingURL=session-recovery-context.js.map