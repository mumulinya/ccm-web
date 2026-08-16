<script setup>
import { Check } from '@lucide/vue'
import { ASK_USER_OTHER_ID, isOtherOption } from '../../utils/askUserQuestions.js'

const props = defineProps({
  questions: { type: Array, default: () => [] },
  answers: { type: Object, default: () => ({}) },
  otherNotes: { type: Object, default: () => ({}) },
  disabled: Boolean,
})

const emit = defineEmits(['select-single', 'toggle-multiple', 'update-other', 'update-text'])

const selected = (question, option) => {
  if (question.type === 'multiple') return (props.answers[question.id] || []).includes(option.id)
  return props.answers[question.id] === option.id
}

const needsOtherNote = question => {
  const value = props.answers[question.id]
  if (question.type === 'multiple') {
    return (Array.isArray(value) ? value : []).some(id => id === ASK_USER_OTHER_ID || isOtherOption((question.options || []).find(item => item.id === id)))
  }
  return value === ASK_USER_OTHER_ID || isOtherOption((question.options || []).find(item => item.id === value))
}
</script>

<template>
  <div class="ask-user-questions">
    <fieldset v-for="(question, index) in questions" :key="question.id" class="question">
      <legend>
        <span>{{ index + 1 }}</span>
        {{ question.label }}
        <em v-if="question.required">必填</em>
      </legend>
      <p v-if="question.reason" class="reason">{{ question.reason }}</p>
      <textarea
        v-if="question.type === 'text'"
        :value="answers[question.id] || ''"
        rows="2"
        maxlength="600"
        :disabled="disabled"
        placeholder="请用自己的话说明"
        @input="emit('update-text', question, $event.target.value)"
      />
      <div v-else class="option-grid" :class="{ multiple: question.type === 'multiple' }">
        <button
          v-for="option in question.options || []"
          :key="option.id"
          type="button"
          class="option"
          :class="{ selected: selected(question, option) }"
          :disabled="disabled"
          :aria-pressed="selected(question, option)"
          @click="question.type === 'multiple' ? emit('toggle-multiple', question, option) : emit('select-single', question, option)"
        >
          <span class="choice">
            <Check v-if="question.type === 'multiple' && selected(question, option)" :size="13" />
            <i v-else />
          </span>
          <span>
            <b>{{ option.label }}</b>
            <small v-if="option.description">{{ option.description }}</small>
          </span>
          <mark v-if="option.recommended">推荐</mark>
        </button>
      </div>
      <textarea
        v-if="needsOtherNote(question)"
        :value="otherNotes[question.id] || ''"
        rows="2"
        maxlength="400"
        :disabled="disabled"
        placeholder="请说明其他选择"
        @input="emit('update-other', question, $event.target.value)"
      />
    </fieldset>
  </div>
</template>

<style scoped>
.ask-user-questions { display: grid; }
.question { border: 0; margin: 0; padding: 10px 0; }
.question + .question { border-top: 1px solid color-mix(in srgb, var(--border-color, #edf0f4) 70%, transparent); }
legend { display: flex; align-items: center; gap: 7px; font-size: 12px; font-weight: 650; color: var(--text-primary, #1f2937); }
legend > span { display: grid; place-items: center; width: 18px; height: 18px; border-radius: 50%; background: #eef4ff; color: #2563eb; font-size: 10px; }
legend em { font-style: normal; font-size: 9px; color: #dc2626; font-weight: 500; }
.reason { margin: 3px 0 0; color: var(--text-secondary, #64748b); font-size: 11px; line-height: 1.45; }
.option-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 6px; margin-top: 7px; }
.option { position: relative; display: flex; align-items: flex-start; gap: 8px; text-align: left; border: 1px solid var(--border-color, #dfe3ea); border-radius: 7px; background: var(--bg-primary, #fff); padding: 8px 9px; color: var(--text-primary, #1f2937); }
.option:hover:not(:disabled) { border-color: #93b4f5; }
.option.selected { border-color: #4f7ee8; background: color-mix(in srgb, #2563eb 6%, var(--bg-primary, #fff)); }
.option:disabled { opacity: .55; }
.choice { display: grid; place-items: center; width: 15px; height: 15px; border: 1px solid #aeb8c7; border-radius: 50%; margin-top: 1px; flex: 0 0 auto; }
.multiple .choice { border-radius: 4px; }
.option.selected .choice { border-color: #2563eb; background: #2563eb; color: #fff; }
.option b { display: block; font-size: 11px; }
.option small { display: block; margin-top: 2px; color: var(--text-secondary, #64748b); font-size: 10px; line-height: 1.35; }
.option mark { position: absolute; right: 7px; top: 6px; background: transparent; color: #2563eb; font-size: 9px; }
textarea { box-sizing: border-box; width: 100%; margin-top: 7px; border: 1px solid var(--border-color, #d7dce5); border-radius: 7px; padding: 8px 9px; background: var(--bg-primary, #fff); color: var(--text-primary, #1f2937); font: inherit; resize: vertical; min-height: 52px; }
@media (max-width: 640px) { .option-grid { grid-template-columns: 1fr; } }
</style>
