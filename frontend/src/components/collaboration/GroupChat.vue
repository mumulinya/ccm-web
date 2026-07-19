<script setup>
import GroupChatPanel from './GroupChatPanel.vue'

defineProps({
  navigateTo: { type: Object, default: null },
  active: { type: Boolean, default: true },
})
const emit = defineEmits(['navigated'])
</script>

<template>
  <GroupChatPanel :active="active" :navigate-to="navigateTo" @navigated="emit('navigated')" />
</template>
