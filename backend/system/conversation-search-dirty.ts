import { observabilityMeta, setObservabilityMeta } from "./observability-database";

export const CONVERSATION_SEARCH_DIRTY_META_KEY = "conversation_search_dirty_v3";

export function markConversationSearchIndexDirty(reason = "conversation_changed") {
  setObservabilityMeta(CONVERSATION_SEARCH_DIRTY_META_KEY, {
    dirty: true,
    reason: String(reason || "conversation_changed").slice(0, 160),
    at: new Date().toISOString(),
  });
}

export function conversationSearchDirtyState(fallback: any = null) {
  return observabilityMeta(CONVERSATION_SEARCH_DIRTY_META_KEY, fallback);
}

export function clearConversationSearchIndexDirty(value: any) {
  setObservabilityMeta(CONVERSATION_SEARCH_DIRTY_META_KEY, { dirty: false, ...value });
}

