<script setup>
import { computed } from 'vue'
import { conversationTodoModel } from '../../utils/conversationTodo.js'

const props = defineProps({
  source: { type: Object, default: null },
  decision: { type: Object, default: null },
})

const model = computed(() => conversationTodoModel(props.source, props.decision))
</script>

<template>
  <section v-if="model" class="conversation-todo" aria-label="当前待办">
    <header>
      <strong>{{ model.title }}</strong>
      <small>{{ model.done }}/{{ model.total }}</small>
    </header>
    <ol>
      <li v-for="step in model.steps" :key="step.id" :class="[step.status, { active: step.active, done: step.done }]">
        <span class="mark" aria-hidden="true">{{ step.done ? '✓' : step.active ? '◐' : '○' }}</span>
        <span>{{ step.label }}</span>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.conversation-todo {
  margin: 8px 0 0;
  padding: 8px 10px;
  border: 1px solid color-mix(in srgb, var(--border-color, #dfe3ea) 80%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--bg-secondary, #f8fafc) 70%, transparent);
}
header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}
strong { font-size: 11px; color: var(--text-primary, #1f2937); }
small { color: var(--text-muted, #94a3b8); font-size: 10px; }
ol { margin: 0; padding: 0; list-style: none; display: grid; gap: 4px; }
li {
  display: grid;
  grid-template-columns: 14px minmax(0, 1fr);
  gap: 6px;
  align-items: start;
  color: var(--text-secondary, #475569);
  font-size: 11px;
  line-height: 1.4;
}
li.done { color: var(--text-muted, #94a3b8); text-decoration: line-through; }
li.active { color: var(--text-primary, #111827); font-weight: 600; }
.mark { font-size: 10px; line-height: 1.4; color: #2563eb; }
li.done .mark { color: #16a34a; }
</style>
