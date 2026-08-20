<script setup>
import { computed } from 'vue'
import TaskExperienceCard from '../tasks/TaskExperienceCard.vue'
import { taskCardNeedsConversationControl } from '../../utils/taskCardPresentation.js'
const props = defineProps({ card: { type: Object, required: true }, runtime: { type: Object, default: () => ({}) }, suppressPlan: { type: Boolean, default: false } })
defineEmits(['action'])
const visible = computed(() => taskCardNeedsConversationControl(props.card, { planOwnedByDock: props.suppressPlan }))
</script>

<template>
  <TaskExperienceCard v-if="visible" :card="card" context="group" compact :suppress-plan="suppressPlan" @action="$emit('action', $event)" />
</template>
