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
  <span class="highlighted-text"><template v-for="(segment, index) in segments" :key="index"><mark v-if="segment.marked" class="search-highlight">{{ segment.text }}</mark><template v-else>{{ segment.text }}</template></template></span>
</template>

<style scoped>
.search-highlight {
  padding: 1px 4px;
  margin: 0 1px;
  border-radius: 4px;
  background: rgba(234, 179, 8, 0.22);
  color: var(--text-primary);
  border: 1px solid rgba(234, 179, 8, 0.35);
  font-weight: 700;
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;
}
</style>
