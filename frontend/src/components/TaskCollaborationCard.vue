<script setup>
import TaskExperienceCard from './TaskExperienceCard.vue'
defineProps({ card: { type: Object, required: true }, runtime: { type: Object, default: () => ({}) } })
defineEmits(['action'])
</script>

<template>
  <TaskExperienceCard :card="card" context="group" @action="$emit('action', $event)" />
</template>
