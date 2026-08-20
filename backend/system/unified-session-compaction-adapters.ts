import * as crypto from "crypto";
import type {
  UnifiedCompactionFence,
  UnifiedCompactionResult,
  UnifiedCompactionSnapshot,
  UnifiedSessionCompactionAdapter,
} from "./unified-session-compaction-types";
import { createUnifiedSessionCompactionEngine } from "./unified-session-compaction-engine";

function checksum(value: unknown) {
  return crypto.createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex");
}

export type UnifiedAdapterHooks = {
  load: (fence: UnifiedCompactionFence) => Promise<UnifiedCompactionSnapshot> | UnifiedCompactionSnapshot;
  acquire?: () => Promise<UnifiedCompactionFence> | UnifiedCompactionFence;
  validate?: (fence: UnifiedCompactionFence, snapshot: UnifiedCompactionSnapshot) => Promise<void> | void;
  commit: (result: UnifiedCompactionResult, fence: UnifiedCompactionFence) => Promise<void> | void;
  failure?: (error: unknown, fence: UnifiedCompactionFence) => Promise<void> | void;
  recovery?: (summary: any, snapshot: UnifiedCompactionSnapshot) => any;
};

export function createUnifiedScopeAdapter(hooks: UnifiedAdapterHooks): UnifiedSessionCompactionAdapter {
  return {
    async acquireFence() {
      if (hooks.acquire) return hooks.acquire();
      return {
        scope: "global",
        exactSessionId: "unbound",
        generation: 0,
        checksum: checksum({ at: Date.now(), nonce: crypto.randomBytes(8).toString("hex") }),
        acquiredAt: new Date().toISOString(),
      };
    },
    async loadSnapshot(fence) {
      const snapshot = await hooks.load(fence);
      if (!snapshot?.scope || !snapshot.exactSessionId) throw new Error("unified_compaction_snapshot_identity_missing");
      if (fence.exactSessionId === "unbound") {
        fence.scope = snapshot.scope;
        fence.exactSessionId = snapshot.exactSessionId;
        fence.generation = Math.max(0, Number(snapshot.boundaryGeneration || snapshot.previousState?.boundaryGeneration || 0));
      }
      return snapshot;
    },
    async validateFence(fence, snapshot) {
      if (fence.scope !== snapshot.scope || fence.exactSessionId !== snapshot.exactSessionId) throw new Error("unified_compaction_fence_identity_mismatch");
      await hooks.validate?.(fence, snapshot);
    },
    buildRecoveryInput(summary, snapshot) {
      return hooks.recovery?.(summary, snapshot) || { scope: snapshot.scope, exactSessionId: snapshot.exactSessionId, summary, snapshot };
    },
    async commit(result, fence) { await hooks.commit(result, fence); },
    async recordFailure(error, fence) { await hooks.failure?.(error, fence); },
  };
}

export function runUnifiedScopeCompaction(input: any) {
  return createUnifiedSessionCompactionEngine({ ...input, adapter: input.adapter || createUnifiedScopeAdapter(input.hooks) }).run();
}
