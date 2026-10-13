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
exports.readBoundLegacyProjectSession = readBoundLegacyProjectSession;
exports.mergeBoundLegacyHistory = mergeBoundLegacyHistory;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("../../core/utils");
/** Legacy files are observations only. A current V2 binding must prove the
 * project/session identity before any legacy history is considered. */
function readBoundLegacyProjectSession(project, sessionId, targets) {
    if (!targets.some(target => target.project_id === project && (target.session_ids || []).includes(sessionId)))
        return null;
    const candidates = [];
    let bytesRead = 0;
    for (const root of [...new Set([utils_1.CCM_DIR, utils_1.LEGACY_CCM_DIR])]) {
        const directory = path.join(root, "sessions");
        if (!fs.existsSync(directory))
            continue;
        const names = fs.readdirSync(directory).filter(name => name.endsWith(".json"));
        if (names.length > 500)
            throw Object.assign(new Error("旧飞书会话文件数超过兼容预算，请先整理历史存储"), { code: "legacy_context_conflict" });
        for (const name of names) {
            const file = path.join(directory, name);
            const stat = fs.lstatSync(file);
            if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 16 * 1024 * 1024)
                continue;
            bytesRead += stat.size;
            if (bytesRead > 16 * 1024 * 1024)
                throw Object.assign(new Error("旧飞书会话读取超过兼容预算，请先整理历史存储"), { code: "legacy_context_conflict" });
            try {
                const store = JSON.parse(fs.readFileSync(file, "utf-8"));
                const declaredProject = store.project_id || store.project;
                if (declaredProject && declaredProject !== project)
                    continue;
                const session = store.sessions?.[sessionId];
                if (!session || !Array.isArray(session.history))
                    continue;
                candidates.push(session);
            }
            catch { /* An unrelated or invalid legacy file is not authoritative. */ }
        }
    }
    if (!candidates.length)
        return null;
    const fingerprints = new Set(candidates.map(value => JSON.stringify([value.agent_session_id, value.history])));
    if (fingerprints.size !== 1)
        throw Object.assign(new Error("旧飞书会话证据冲突，保持当前 V2 绑定并等待人工处理"), { code: "legacy_context_conflict" });
    return candidates[0];
}
function mergeBoundLegacyHistory(current, incoming) {
    const result = [...current];
    const positions = new Map();
    result.forEach((message, index) => {
        const id = String(message?.id || message?.message_id || "");
        if (id && !positions.has(id))
            positions.set(id, index);
    });
    for (const message of incoming) {
        const id = String(message?.id || message?.message_id || "");
        // Unidentified legacy observations cannot prove deduplication or overwrite.
        if (!id)
            continue;
        const index = positions.get(id);
        if (index === undefined) {
            positions.set(id, result.length);
            result.push(message);
        }
        else if (JSON.stringify(result[index]) !== JSON.stringify(message))
            result[index] = { ...result[index], ...message };
    }
    return result;
}
//# sourceMappingURL=project-feishu-legacy-read.js.map