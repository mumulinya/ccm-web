import { registerSessionCompactionHook } from "./session-compaction-core";

let initialized = false;

export function initializeBuiltInSessionCompactionHooks() {
  if (initialized) return { initialized: false, reason: "already_initialized" };
  initialized = true;
  registerSessionCompactionHook("pre_compact", (input: any) => ({
    schema: "ccm-session-compaction-hook-result-v1",
    phase: "pre_compact",
    scope: String(input.scope || ""),
    sessionId: String(input.sessionId || ""),
    customInstructions: String(input.scopeHookInstructions || input.scope_hook_instructions || "").trim(),
  }));
  registerSessionCompactionHook("session_start", (input: any) => ({
    schema: "ccm-session-compaction-hook-result-v1",
    phase: "session_start",
    scope: String(input.scope || ""),
    sessionId: String(input.sessionId || ""),
    recoveryContext: input.recoveryContext || input.recovery_context || null,
  }));
  registerSessionCompactionHook("post_compact", (input: any) => ({
    schema: "ccm-session-compaction-hook-result-v1",
    phase: "post_compact",
    scope: String(input.scope || ""),
    sessionId: String(input.sessionId || ""),
    completedAt: new Date().toISOString(),
    committed: input.result?.compacted !== false,
  }));
  return { initialized: true, phases: ["pre_compact", "session_start", "post_compact"] };
}
