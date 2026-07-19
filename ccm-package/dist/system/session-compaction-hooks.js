"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeBuiltInSessionCompactionHooks = initializeBuiltInSessionCompactionHooks;
const session_compaction_core_1 = require("./session-compaction-core");
let initialized = false;
function initializeBuiltInSessionCompactionHooks() {
    if (initialized)
        return { initialized: false, reason: "already_initialized" };
    initialized = true;
    (0, session_compaction_core_1.registerSessionCompactionHook)("pre_compact", (input) => ({
        schema: "ccm-session-compaction-hook-result-v1",
        phase: "pre_compact",
        scope: String(input.scope || ""),
        sessionId: String(input.sessionId || ""),
        customInstructions: String(input.scopeHookInstructions || input.scope_hook_instructions || "").trim(),
    }));
    (0, session_compaction_core_1.registerSessionCompactionHook)("session_start", (input) => ({
        schema: "ccm-session-compaction-hook-result-v1",
        phase: "session_start",
        scope: String(input.scope || ""),
        sessionId: String(input.sessionId || ""),
        recoveryContext: input.recoveryContext || input.recovery_context || null,
    }));
    (0, session_compaction_core_1.registerSessionCompactionHook)("post_compact", (input) => ({
        schema: "ccm-session-compaction-hook-result-v1",
        phase: "post_compact",
        scope: String(input.scope || ""),
        sessionId: String(input.sessionId || ""),
        completedAt: new Date().toISOString(),
        committed: input.result?.compacted !== false,
    }));
    return { initialized: true, phases: ["pre_compact", "session_start", "post_compact"] };
}
//# sourceMappingURL=session-compaction-hooks.js.map