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
exports.inspectNativeSessionPresence = inspectNativeSessionPresence;
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const crypto_1 = require("crypto");
const runtime_1 = require("./runtime");
/** Read only bounded session metadata. Provider transcripts are never returned
 * or copied into CCM persistence. Unknown storage contracts fail closed. */
function inspectNativeSessionPresence(runtimeId, input) {
    const sessionId = String(input.nativeSessionId || "");
    if (!/^[a-zA-Z0-9_-]{1,160}$/.test(sessionId))
        return { valid: false, reason: "native_session_identity_invalid" };
    if (!["codex", "claudecode"].includes(runtimeId))
        return { valid: false, reason: "native_session_storage_inspection_unsupported" };
    try {
        const options = input.options || {};
        const metadata = (0, runtime_1.readRuntimeLaunchMetadata)(options);
        const home = runtimeId === "codex"
            ? metadata.isolatedHomePath || metadata.runtimeHomePath || (options.mcpConfigPath ? path.dirname(options.mcpConfigPath) : "") || process.env.CODEX_HOME || path.join(os.homedir(), ".codex")
            : process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), ".claude");
        const directory = fs.realpathSync(path.join(home, runtimeId === "codex" ? "sessions" : "projects"));
        const workspace = fs.realpathSync(input.workspacePath);
        const canonical = (value) => {
            const real = fs.realpathSync(value);
            return process.platform === "win32" ? real.toLowerCase() : real;
        };
        const pending = [{ directory, depth: 0 }];
        let checked = 0;
        while (pending.length && checked < 5000) {
            const current = pending.pop();
            for (const entry of fs.readdirSync(current.directory, { withFileTypes: true })) {
                if (++checked > 5000)
                    break;
                if (entry.isSymbolicLink())
                    continue;
                const file = path.join(current.directory, entry.name);
                if (entry.isDirectory() && current.depth < 4) {
                    pending.push({ directory: file, depth: current.depth + 1 });
                    continue;
                }
                if (!entry.isFile() || !entry.name.endsWith(`${sessionId}.jsonl`))
                    continue;
                let descriptor;
                try {
                    descriptor = fs.openSync(file, "r");
                    const buffer = Buffer.alloc(65536);
                    const size = fs.readSync(descriptor, buffer, 0, buffer.length, 0);
                    for (const line of buffer.toString("utf8", 0, size).split(/\r?\n/).slice(0, 12)) {
                        let row;
                        try {
                            row = JSON.parse(line);
                        }
                        catch {
                            continue;
                        }
                        const session = runtimeId === "codex" && row.type === "session_meta" ? row.payload : runtimeId === "claudecode" ? row : null;
                        const observedId = runtimeId === "codex" ? session?.id : session?.sessionId;
                        if (observedId !== sessionId || !session?.cwd)
                            continue;
                        if (canonical(session.cwd) !== canonical(workspace))
                            return { valid: false, reason: "native_session_workspace_mismatch" };
                        return { valid: true, reason: "native_session_storage_verified", storageRef: (0, crypto_1.createHash)("sha256").update(file).digest("hex") };
                    }
                }
                finally {
                    if (descriptor !== undefined)
                        fs.closeSync(descriptor);
                }
            }
        }
        return { valid: false, reason: checked >= 5000 ? "native_session_storage_scan_limit" : "native_session_not_found" };
    }
    catch {
        return { valid: false, reason: "native_session_storage_unavailable" };
    }
}
//# sourceMappingURL=native-session-presence.js.map