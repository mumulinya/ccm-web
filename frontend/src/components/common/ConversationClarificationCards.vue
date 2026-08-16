<script setup>
import { computed, reactive, ref, watch } from 'vue'
import AskUserQuestionCards from './AskUserQuestionCards.vue'
import { getPrePlanClarification } from '../../utils/prePlanClarification.js'
import {
  ASK_USER_OTHER_ID,
  formatAskUserAnswer,
  questionIsAnswered,
  questionsFromClarification,
} from '../../utils/askUserQuestions.js'

const props = defineProps({
  source: { type: Object, default: null },
  busy: Boolean,
})
const emit = defineEmits(['submit'])

const clarification = computed(() => getPrePlanClarification(props.source))
const summary = computed(() => props.source?.clarification_summary || props.source?.clarificationSummary || props.source || null)
const questions = computed(() => questionsFromClarification(clarification.value, summary.value))
const pending = computed(() => {
  if (!questions.value.length) return false
  const structured = clarification.value
  const structuredStatus = String(structured?.status || '').toLowerCase()
  if (structuredStatus === 'resolved' || structuredStatus === 'cancelled' || structuredStatus === 'canceled') return false
  if (structuredStatus === 'pending') return true
  const status = String(summary.value?.status || '').toLowerCase()
  return ['waiting_user', 'waiting_clarification', 'needs_user', 'pending'].includes(status)
})
const answers = reactive({})
const otherNotes = reactive({})

watch(() => clarification.value?.id || summary.value?.question, () => {
  for (const key of Object.keys(answers)) delete answers[key]
  for (const key of Object.keys(otherNotes)) delete otherNotes[key]
}, { immediate: true })

const valid = computed(() => questions.value.length > 0 && questions.value.every(question => !question.required || questionIsAnswered(question, answers, otherNotes)))

const buildPayload = () => ({
  clarification: clarification.value,
  answers: { ...answers },
  otherNotes: { ...otherNotes },
  answerText: formatAskUserAnswer(questions.value, answers, otherNotes),
})

function selectSingle(question, option) {
  answers[question.id] = option.id
  if (option.id !== ASK_USER_OTHER_ID && questions.value.length === 1 && question.type === 'single' && valid.value && !props.busy) {
    emit('submit', buildPayload())
  }
}
function toggleMultiple(question, option) {
  const current = Array.isArray(answers[question.id]) ? [...answers[question.id]] : []
  const index = current.indexOf(option.id)
  index >= 0 ? current.splice(index, 1) : current.push(option.id)
  answers[question.id] = current
}
function submit() {
  if (valid.value && !props.busy) emit('submit', buildPayload())
}
</script>

<template>
  <section v-if="pending" class="conversation-clarify" aria-label="需要你补充信息">
    <header>
      <strong>{{ summary?.title || clarification?.title || '需要你补充信息' }}</strong>
      <span>{{ summary?.status_label || '等待你回复' }}</span>
    </header>
    <p v-if="summary?.headline && summary.headline !== summary?.question">{{ summary.headline }}</p>
    <AskUserQuestionCards
      :questions="questions"
      :answers="answers"
      :other-notes="otherNotes"
      :disabled="busy"
      @select-single="selectSingle"
      @toggle-multiple="toggleMultiple"
      @update-other="(question, value) => { otherNotes[question.id] = value }"
      @update-text="(question, value) => { answers[question.id] = value }"
    />
    <footer v-if="questions.length > 1 || questions.some(question => question.type !== 'single')">
      <button type="button" class="primary" :disabled="!valid || busy" @click="submit">{{ busy ? '正在提交…' : '发送' }}</button>
    </footer>
  </section>
</template>

<style scoped>
.conversation-clarify {
  margin-top: 10px;
  padding: 11px 12px;
  border: 1px solid rgba(245, 158, 11, 0.24);
  border-radius: 9px;
  background: #fffbeb;
}
header { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
header strong { color: #92400e; font-size: 12px; }
header span { flex: 0 0 auto; padding: 2px 7px; border-radius: 999px; background: #fef3c7; color: #92400e; font-size: 10.5px; font-weight: 800; white-space: nowrap; }
p { margin: 6px 0 0; color: #475569; font-size: 11.5px; line-height: 1.45; }
footer { display: flex; justify-content: flex-end; margin-top: 8px; }
.primary { border: 1px solid #2563eb; background: #2563eb; color: #fff; border-radius: 7px; padding: 7px 11px; font-size: 11px; }
.primary:disabled { opacity: .45; }
</style>
