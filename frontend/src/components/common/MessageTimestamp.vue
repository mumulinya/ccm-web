<script setup>
import { computed } from 'vue'

const props = defineProps({
  value: { type: [String, Number, Date], default: '' },
})

const pad = value => String(value).padStart(2, '0')

const parsedDate = computed(() => {
  if (props.value instanceof Date) return props.value
  if (typeof props.value === 'number') {
    return new Date(Math.abs(props.value) < 1e12 ? props.value * 1000 : props.value)
  }
  const raw = String(props.value || '').trim()
  if (!raw) return null
  const numeric = Number(raw)
  if (/^\d+$/.test(raw) && Number.isFinite(numeric)) {
    return new Date(Math.abs(numeric) < 1e12 ? numeric * 1000 : numeric)
  }
  return new Date(raw)
})

const validDate = computed(() => (
  parsedDate.value && Number.isFinite(parsedDate.value.getTime())
    ? parsedDate.value
    : null
))

const label = computed(() => {
  const date = validDate.value
  if (!date) return ''
  return [
    `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())}`,
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`,
  ].join(' ')
})

const isoValue = computed(() => validDate.value?.toISOString() || '')
</script>

<template>
  <time v-if="validDate" class="message-timestamp" :datetime="isoValue" :title="label">
    {{ label }}
  </time>
</template>

<style scoped>
.message-timestamp {
  display: block;
  letter-spacing: 0;
  white-space: nowrap;
}
</style>
