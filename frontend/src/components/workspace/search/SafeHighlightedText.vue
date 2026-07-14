<script setup>
import { computed } from 'vue'

const props = defineProps({ text: { type: String, default: '' }, terms: { type: Array, default: () => [] } })

const segments = computed(() => {
  const terms = [...new Set(props.terms.map(item => String(item || '').trim()).filter(Boolean))].sort((a, b) => b.length - a.length)
  if (!terms.length) return [{ text: props.text, marked: false }]
  const escaped = terms.map(item => item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const matcher = new RegExp(`(${escaped.join('|')})`, 'gi')
  const lowerTerms = new Set(terms.map(item => item.toLowerCase()))
  return props.text.split(matcher).filter(Boolean).map(item => ({ text: item, marked: lowerTerms.has(item.toLowerCase()) }))
})
</script>

<template>
  <span><template v-for="(segment, index) in segments" :key="index"><mark v-if="segment.marked">{{ segment.text }}</mark><template v-else>{{ segment.text }}</template></template></span>
</template>

<style scoped>
mark { padding: 0 2px; border-radius: 2px; background: color-mix(in srgb, #facc15 24%, transparent); color: inherit; font-weight: 700; }
</style>
