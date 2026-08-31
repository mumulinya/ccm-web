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
exports.stableId = stableId;
exports.iso = iso;
exports.safeText = safeText;
exports.publicFile = publicFile;
exports.stringList = stringList;
exports.safeTextList = safeTextList;
exports.normalizeStatus = normalizeStatus;
// 任务回放共享底座：脱敏、时间与状态归一化。
// task-replay.ts 与 task-replay-plan.ts 共同引用；本模块不得 import 其他 collaboration 模块。
const crypto = __importStar(require("crypto"));
const path = __importStar(require("path"));
function stableId(prefix, value) {
    return `${prefix}_${crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value || {})).digest("hex").slice(0, 22)}`;
}
function iso(value, fallback = "") {
    const parsed = Date.parse(String(value || ""));
    return Number.isFinite(parsed) ? new Date(parsed).toISOString() : fallback;
}
function safeText(value, max = 1200) {
    let text = typeof value === "string" ? value : value == null ? "" : JSON.stringify(value);
    text = text
        .replace(/CCM_AGENT_RECEIPT[\s\S]*?(?=\n\S|$)/gi, "[内部回执已收起]")
        .replace(/(api[_-]?key|access[_-]?token|refresh[_-]?token|authorization|password|secret)\s*[=:]\s*[^\s,;]+/gi, "$1=[已隐藏]")
        .replace(/\b(?:sk|xox[baprs]|gh[pousr])[-_][A-Za-z0-9_-]{12,}\b/g, "[密钥已隐藏]")
        .replace(/[A-Za-z]:\\Users\\[^\s"']+/gi, "[本机路径]")
        .replace(/\/(?:home|Users)\/[^\s"']+/g, "[本机路径]")
        .replace(/\r\n/g, "\n")
        .trim();
    return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
function publicFile(value) {
    const raw = String(value?.path || value?.file || value || "").trim();
    if (!raw)
        return "";
    return path.isAbsolute(raw) ? path.basename(raw) : raw.replace(/\\/g, "/").replace(/^\.\//, "").slice(0, 260);
}
function stringList(values, max = 100) {
    return [...new Set((Array.isArray(values) ? values : values ? [values] : []).map(publicFile).filter(Boolean))].slice(0, max);
}
function safeTextList(values, max = 20, itemMax = 240) {
    return (Array.isArray(values) ? values : values ? [values] : [])
        .map(item => safeText(item, itemMax))
        .filter(Boolean)
        .slice(0, max);
}
function normalizeStatus(value) {
    const text = String(value || "").toLowerCase();
    const exact = {
        cancelled: "cancelled", canceled: "cancelled", reverted: "cancelled",
        failed: "failed", error: "failed", rejected: "failed", invalid: "failed",
        blocked: "blocked", waiting_user: "blocked", needs_user: "blocked", waiting_clarification: "blocked", waiting_confirmation: "blocked",
        warning: "warning", warn: "warning", partial: "warning", attention: "warning", needs_review: "warning",
        running: "running", in_progress: "running", progress: "running", reviewing: "running", executing: "running", queued: "running", pending: "running", monitoring: "running", supervising: "running",
        passed: "passed", success: "passed", succeeded: "passed", completed: "passed", complete: "passed", done: "passed", ok: "passed", accepted: "passed",
    };
    return exact[text] || "info";
}
//# sourceMappingURL=task-replay-shared.js.map