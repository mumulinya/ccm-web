<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { CircleHelp, Sparkles, X } from '@lucide/vue'
import AskUserQuestionCards from './AskUserQuestionCards.vue'
import { ASK_USER_OTHER_ID, formatAskUserAnswer, questionIsAnswered, withOtherOption } from '../../utils/askUserQuestions.js'

const props = defineProps({ clarification: { type: Object, default: null }, busy: Boolean })
const emit = defineEmits(['submit', 'defaults', 'cancel'])
const answers = reactive({})
const otherNotes = reactive({})
const additionalNote = ref('')

const questions = computed(() => (Array.isArray(props.clarification?.questions) ? props.clarification.questions : []).map(question => (
  question.type === 'text' ? question : { ...question, options: withOtherOption(question.options) }
)))
const midTurn = computed(() => String(props.clarification?.purpose || '').toLowerCase() === 'mid_turn')
const answered = question => questionIsAnswered(question, answers, otherNotes)
const valid = computed(() => questions.value.length > 0 && questions.value.every(question => !question.required || answered(question)))

watch(() => props.clarification?.id, () => {
  for (const key of Object.keys(answers)) delete answers[key]
  for (const key of Object.keys(otherNotes)) delete otherNotes[key]
  additionalNote.value = ''
}, { immediate: true })

function selectSingle(question, option) { answers[question.id] = option.id }
function toggleMultiple(question, option) {
  const current = Array.isArray(answers[question.id]) ? [...answers[question.id]] : []
  const index = current.indexOf(option.id)
  index >= 0 ? current.splice(index, 1) : current.push(option.id)
  answers[question.id] = current
}
function useDefaults() {
  for (const question of questions.value) {
    if (answered(question)) continue
    const defaults = (question.options || []).filter(option => option.safeDefault && option.id !== ASK_USER_OTHER_ID)
    if (question.type === 'multiple') answers[question.id] = defaults.map(option => option.id)
    else if (question.type === 'single' && defaults[0]) answers[question.id] = defaults[0].id
  }
  emit('defaults', { ...buildPayload(), useDefaults: true })
}
function buildPayload() {
  const normalized = Object.fromEntries(Object.entries(answers).map(([key, value]) => [key, Array.isArray(value) ? [...value] : value]))
  return {
    clarification: props.clarification,
    answers: normalized,
    additionalNote: additionalNote.value.trim(),
    answerText: formatAskUserAnswer(questions.value, normalized, otherNotes, additionalNote.value),
  }
}
function submit() { if (valid.value && !props.busy) emit('submit', buildPayload()) }
</script>

<template>
  <section v-if="clarification?.status === 'pending'" class="pre-plan-dock" aria-labelledby="pre-plan-title" aria-live="polite">
    <header>
      <span class="title-icon"><CircleHelp :size="17" /></span>
      <div>
        <strong id="pre-plan-title">{{ clarification.title || (midTurn ? `需要确认 ${questions.length} 项` : `制定计划前，需要确认 ${questions.length} 项`) }}</strong>
        <p>{{ clarification.headline || (midTurn ? '请先选择一项，我会按你的答案继续。' : '这些选择会影响实施方案和验收结果。') }}</p>
      </div>
      <button class="icon-button" type="button" aria-label="取消本次澄清" title="取消" :disabled="busy" @click="emit('cancel', { clarification })"><X :size="16" /></button>
    </header>

    <div class="question-list">
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
    </div>

    <label v-if="clarification.allowAdditionalNote !== false" class="additional-note">
      <span>补充说明 <small>可选</small></span>
      <textarea v-model="additionalNote" rows="2" maxlength="600" placeholder="还有其他业务规则、兼容要求或验收说明，可以写在这里" />
    </label>

    <footer>
      <button v-if="clarification.safeDefaultsAvailable && !midTurn" type="button" class="secondary" :disabled="busy" @click="useDefaults"><Sparkles :size="15" />采用安全默认值</button>
      <span v-else class="hint">{{ midTurn ? '回答后会作为下一条消息继续当前工作。' : '回答后会先生成详细计划，不会直接修改代码。' }}</span>
      <button type="button" class="primary" :disabled="!valid || busy" @click="submit">{{ busy ? '正在提交…' : (midTurn ? '发送' : '生成详细计划') }}</button>
    </footer>
  </section>
</template>

<style scoped>
.pre-plan-dock{margin:0 0 9px;border:1px solid color-mix(in srgb,var(--border-color,#dfe3ea) 80%,transparent);border-radius:10px;background:color-mix(in srgb,var(--bg-primary,#fff) 98%,var(--accent-color,#2563eb) 2%);box-shadow:0 3px 12px rgba(15,23,42,.045);overflow:hidden}.pre-plan-dock header{display:flex;gap:9px;align-items:flex-start;padding:11px 13px 10px;border-bottom:1px solid color-mix(in srgb,var(--border-color,#e5e7eb) 72%,transparent)}.title-icon{display:grid;place-items:center;width:26px;height:26px;border-radius:7px;color:#2563eb;background:color-mix(in srgb,#2563eb 9%,transparent);flex:0 0 auto}.pre-plan-dock header div{min-width:0;flex:1}.pre-plan-dock strong{font-size:13px;color:var(--text-primary,#111827)}.pre-plan-dock header p{margin:3px 0 0;color:var(--text-secondary,#64748b);font-size:11px;line-height:1.45}.icon-button{border:0;background:transparent;color:#64748b;padding:5px;border-radius:6px}.question-list{padding:2px 13px}.additional-note{display:block;padding:0 13px 10px;color:var(--text-primary,#374151);font-size:11px}.additional-note small{color:#94a3b8}.additional-note textarea{box-sizing:border-box;width:100%;margin-top:7px;border:1px solid var(--border-color,#d7dce5);border-radius:7px;padding:8px 9px;background:var(--bg-primary,#fff);color:var(--text-primary,#1f2937);font:inherit;resize:vertical;min-height:52px}.pre-plan-dock footer{display:flex;align-items:center;justify-content:flex-end;gap:8px;padding:9px 13px;background:color-mix(in srgb,var(--bg-secondary,#f8fafc) 62%,transparent)}.hint{margin-right:auto;color:#64748b;font-size:10px}.primary,.secondary{display:inline-flex;align-items:center;gap:6px;border-radius:7px;padding:7px 11px;font-size:11px}.primary{border:1px solid #2563eb;background:#2563eb;color:#fff}.primary:disabled{opacity:.45}.secondary{margin-right:auto;border:1px solid var(--border-color,#d7dce5);background:var(--bg-primary,#fff);color:var(--text-primary,#334155)}@media(max-width:640px){.pre-plan-dock{border-radius:9px}.pre-plan-dock footer{align-items:stretch;flex-direction:column}.primary,.secondary{justify-content:center;width:100%;margin:0}.hint{margin:0;text-align:center}}
</style>
