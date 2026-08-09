<script setup>
import GroupChatPanel from './GroupChatPanel.vue'

defineProps({
  navigateTo: { type: Object, default: null },
  active: { type: Boolean, default: true },
})
const emit = defineEmits(['navigated', 'switch-tab', 'set-navigation'])
</script>

<template>
  <GroupChatPanel
    :active="active"
    :navigate-to="navigateTo"
    @navigated="emit('navigated')"
    @switch-tab="emit('switch-tab', $event)"
    @set-navigation="emit('set-navigation', $event)"
  />
</template>
