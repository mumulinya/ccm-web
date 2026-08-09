<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  options: { type: Array, default: () => [] },
  placeholder: { type: String, default: '选择群聊或项目' },
  disabled: { type: Boolean, default: false },
  ariaLabel: { type: String, default: '选择群聊或项目' },
})

const emit = defineEmits(['update:modelValue', 'change'])
const groups = computed(() => ({
  group: props.options.filter(item => item.scope === 'group'),
  project: props.options.filter(item => item.scope === 'project'),
}))

function update(event) {
  const value = String(event?.target?.value || '')
  emit('update:modelValue', value)
  emit('change', value)
}
</script>

<template>
  <select
    class="scope-target-select"
    :value="modelValue"
    :disabled="disabled"
    :aria-label="ariaLabel"
    @change="update"
  >
    <option value="">{{ placeholder }}</option>
    <optgroup v-if="groups.group.length" :label="`群聊 (${groups.group.length})`">
      <option
        v-for="item in groups.group"
        :key="item.value"
        :value="item.value"
        :disabled="item.disabled"
      >{{ item.label }}{{ item.reason ? ` · ${item.reason}` : '' }}</option>
    </optgroup>
    <optgroup v-if="groups.project.length" :label="`项目 (${groups.project.length})`">
      <option
        v-for="item in groups.project"
        :key="item.value"
        :value="item.value"
        :disabled="item.disabled"
      >{{ item.label }}{{ item.reason ? ` · ${item.reason}` : '' }}</option>
    </optgroup>
  </select>
</template>

<style scoped>
.scope-target-select {
  width: 100%;
  min-width: 0;
  min-height: 38px;
  border: 1px solid var(--border-color, #dfe4ec);
  border-radius: 7px;
  background: var(--bg-secondary, #f5f7fb);
  color: var(--text-primary, #172033);
  padding: 7px 30px 7px 10px;
  font: inherit;
  cursor: pointer;
}
.scope-target-select:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--accent-pink, #ec4899) 55%, #fff);
  outline-offset: 1px;
}
.scope-target-select:disabled { opacity: .55; cursor: not-allowed; }
</style>
