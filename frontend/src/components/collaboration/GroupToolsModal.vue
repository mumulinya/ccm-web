<script setup>
import AgentToolsModal from '../common/AgentToolsModal.vue'
import ContextPolicyFields from '../common/ContextPolicyFields.vue'

defineProps({
  groupName: { type: String, default: '' },
  tools: { type: Object, default: () => ({ mcp: [], skill: [] }) },
  allTools: { type: Object, default: () => ({ mcp: [], skill: [] }) },
  toolAudit: { type: Object, default: null },
  authorizationReadiness: { type: Object, default: null },
  connectionPreflight: { type: Object, default: null },
  verificationStatus: { type: Object, default: null },
  contextPolicy: { type: Object, default: () => ({ override: {}, effective: {} }) },
})

const emit = defineEmits(['close', 'save', 'toggle-tool', 'update-context-policy'])
</script>

<template>
  <AgentToolsModal
    open
    :title="`群聊工具配置${groupName ? ` - ${groupName}` : ''}`"
    description="授权群聊主 Agent 与其派发成员可由模型按语义选择使用的 MCP 与 Skill。"
    :all-tools="allTools"
    :selected-tools="tools"
    :readiness="authorizationReadiness"
    :preflight="connectionPreflight"
    scope-note="授权只作用于当前群聊；不会继承全局助手或其他群聊、项目的授权。"
    @close="emit('close')"
    @save="emit('save')"
    @toggle-tool="(type, name) => emit('toggle-tool', type, name)"
  >
    <template #details><ContextPolicyFields :policy="contextPolicy" @update="emit('update-context-policy', $event)" /></template>
  </AgentToolsModal>
</template>
