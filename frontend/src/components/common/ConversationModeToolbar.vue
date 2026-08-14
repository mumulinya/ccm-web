<script setup>
import { ref, watch } from 'vue'
import ConversationAgentMode from './ConversationAgentMode.vue'
import ConversationPermissionMode from './ConversationPermissionMode.vue'

const props = defineProps({
  scope: { type: String, required: true },
  scopeId: { type: String, default: '' },
  exactSessionId: { type: String, default: '' },
  modeDisabled: Boolean,
  permissionDisabled: Boolean,
})

const agentMode = ref('agent')
const syncMode = detail => { agentMode.value = detail?.mode === 'plan' ? 'plan' : 'agent' }

watch(() => [props.scope, props.scopeId, props.exactSessionId], () => { agentMode.value = 'agent' })
</script>

<template>
  <div class="conversation-mode-inline" aria-label="会话工作模式和子 Agent 权限">
    <ConversationAgentMode
      :scope="scope"
      :scope-id="scopeId"
      :exact-session-id="exactSessionId"
      :disabled="modeDisabled"
      @resolved="syncMode"
      @changed="syncMode"
    />
    <span v-if="agentMode !== 'plan'" class="conversation-mode-inline__divider" aria-hidden="true">·</span>
    <ConversationPermissionMode
      v-if="agentMode !== 'plan'"
      :scope="scope"
      :scope-id="scopeId"
      :exact-session-id="exactSessionId"
      :disabled="permissionDisabled"
    />
  </div>
</template>

<style scoped>
.conversation-mode-inline{display:inline-flex;align-items:center;min-width:0;gap:2px;color:var(--text-muted)}.conversation-mode-inline__divider{padding:0 1px;color:var(--border-strong,var(--text-muted));font-size:12px}.conversation-mode-inline :deep(.agent-mode__trigger),.conversation-mode-inline :deep(.permission-mode__trigger){height:26px;padding:0 5px;border-color:transparent;background:transparent;border-radius:6px}.conversation-mode-inline :deep(.agent-mode__trigger:hover:not(:disabled)),.conversation-mode-inline :deep(.permission-mode__trigger:hover:not(:disabled)){background:var(--bg-secondary)}.conversation-mode-inline :deep(.permission-mode__trigger){color:var(--text-muted)}.conversation-mode-inline :deep(.agent-mode__trigger.is-plan){border-color:transparent;background:color-mix(in srgb,var(--accent-blue) 9%,transparent)}@media(max-width:560px){.conversation-mode-inline{max-width:100%}.conversation-mode-inline :deep(.agent-mode__trigger),.conversation-mode-inline :deep(.permission-mode__trigger){padding:0 4px}.conversation-mode-inline :deep(.permission-mode__trigger span){max-width:112px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}}
</style>
