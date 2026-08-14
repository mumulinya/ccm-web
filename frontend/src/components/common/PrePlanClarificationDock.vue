<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { Check, CircleHelp, Sparkles, X } from '@lucide/vue'
import { formatPrePlanClarificationAnswer } from '../../utils/prePlanClarification.js'

const props = defineProps({ clarification: { type: Object, default: null }, busy: Boolean })
const emit = defineEmits(['submit', 'defaults', 'cancel'])
const answers = reactive({})
const additionalNote = ref('')

const questions = computed(() => Array.isArray(props.clarification?.questions) ? props.clarification.questions : [])
const answered = question => {
  const value = answers[question.id]
  return Array.isArray(value) ? value.length > 0 : String(value ?? '').trim().length > 0
}
const valid = computed(() => questions.value.length > 0 && questions.value.every(question => !question.required || answered(question)))

watch(() => props.clarification?.id, () => {
  for (const key of Object.keys(answers)) delete answers[key]
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
    const defaults = (question.options || []).filter(option => option.safeDefault)
    if (question.type === 'multiple') answers[question.id] = defaults.map(option => option.id)
    else if (question.type === 'single' && defaults[0]) answers[question.id] = defaults[0].id
  }
  emit('defaults', { ...buildPayload(), useDefaults: true })
}
function buildPayload() {
  const normalized = Object.fromEntries(Object.entries(answers).map(([key, value]) => [key, Array.isArray(value) ? [...value] : value]))
  return { clarification: props.clarification, answers: normalized, additionalNote: additionalNote.value.trim(), answerText: formatPrePlanClarificationAnswer(props.clarification, normalized, additionalNote.value) }
}
function submit() { if (valid.value && !props.busy) emit('submit', buildPayload()) }
</script>

<template>
  <section v-if="clarification?.status === 'pending'" class="pre-plan-dock" aria-labelledby="pre-plan-title" aria-live="polite">
    <header>
      <span class="title-icon"><CircleHelp :size="17" /></span>
      <div>
        <strong id="pre-plan-title">{{ clarification.title || `制定计划前，需要确认 ${questions.length} 项` }}</strong>
        <p>{{ clarification.headline || '这些选择会影响实施方案和验收结果。' }}</p>
      </div>
      <button class="icon-button" type="button" aria-label="取消本次澄清" title="取消" :disabled="busy" @click="emit('cancel', { clarification })"><X :size="16" /></button>
    </header>

    <div class="question-list">
      <fieldset v-for="(question, index) in questions" :key="question.id" class="question">
        <legend><span>{{ index + 1 }}</span>{{ question.label }}<em v-if="question.required">必填</em></legend>
        <p class="reason">{{ question.reason }}</p>
        <textarea v-if="question.type === 'text'" v-model="answers[question.id]" rows="2" maxlength="600" placeholder="请输入业务要求或验收边界" />
        <div v-else class="option-grid" :class="{ multiple: question.type === 'multiple' }">
          <button v-for="option in question.options || []" :key="option.id" type="button" class="option" :class="{ selected: question.type === 'multiple' ? (answers[question.id] || []).includes(option.id) : answers[question.id] === option.id }" :aria-pressed="question.type === 'multiple' ? (answers[question.id] || []).includes(option.id) : answers[question.id] === option.id" @click="question.type === 'multiple' ? toggleMultiple(question, option) : selectSingle(question, option)">
            <span class="choice"><Check v-if="question.type === 'multiple' && (answers[question.id] || []).includes(option.id)" :size="13" /><i v-else /></span>
            <span><b>{{ option.label }}</b><small v-if="option.description">{{ option.description }}</small></span>
            <mark v-if="option.recommended">推荐</mark>
          </button>
        </div>
      </fieldset>
    </div>

    <label v-if="clarification.allowAdditionalNote !== false" class="additional-note">
      <span>补充说明 <small>可选</small></span>
      <textarea v-model="additionalNote" rows="2" maxlength="600" placeholder="还有其他业务规则、兼容要求或验收说明，可以写在这里" />
    </label>

    <footer>
      <button v-if="clarification.safeDefaultsAvailable" type="button" class="secondary" :disabled="busy" @click="useDefaults"><Sparkles :size="15" />采用安全默认值</button>
      <span v-else class="hint">回答后会先生成详细计划，不会直接修改代码。</span>
      <button type="button" class="primary" :disabled="!valid || busy" @click="submit">{{ busy ? '正在提交…' : '生成详细计划' }}</button>
    </footer>
  </section>
</template>

<style scoped>
.pre-plan-dock{margin:0 0 9px;border:1px solid color-mix(in srgb,var(--border-color,#dfe3ea) 80%,transparent);border-radius:10px;background:color-mix(in srgb,var(--bg-primary,#fff) 98%,var(--accent-color,#2563eb) 2%);box-shadow:0 3px 12px rgba(15,23,42,.045);overflow:hidden}.pre-plan-dock header{display:flex;gap:9px;align-items:flex-start;padding:11px 13px 10px;border-bottom:1px solid color-mix(in srgb,var(--border-color,#e5e7eb) 72%,transparent)}.title-icon{display:grid;place-items:center;width:26px;height:26px;border-radius:7px;color:#2563eb;background:color-mix(in srgb,#2563eb 9%,transparent);flex:0 0 auto}.pre-plan-dock header div{min-width:0;flex:1}.pre-plan-dock strong{font-size:13px;color:var(--text-primary,#111827)}.pre-plan-dock header p,.reason{margin:3px 0 0;color:var(--text-secondary,#64748b);font-size:11px;line-height:1.45}.icon-button{border:0;background:transparent;color:#64748b;padding:5px;border-radius:6px}.question-list{padding:2px 13px}.question{border:0;margin:0;padding:10px 0}.question+.question{border-top:1px solid color-mix(in srgb,var(--border-color,#edf0f4) 70%,transparent)}legend{display:flex;align-items:center;gap:7px;font-size:12px;font-weight:650;color:var(--text-primary,#1f2937)}legend>span{display:grid;place-items:center;width:18px;height:18px;border-radius:50%;background:#eef4ff;color:#2563eb;font-size:10px}legend em{font-style:normal;font-size:9px;color:#dc2626;font-weight:500}.option-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:6px;margin-top:7px}.option{position:relative;display:flex;align-items:flex-start;gap:8px;text-align:left;border:1px solid var(--border-color,#dfe3ea);border-radius:7px;background:var(--bg-primary,#fff);padding:8px 9px;color:var(--text-primary,#1f2937)}.option:hover{border-color:#93b4f5}.option.selected{border-color:#4f7ee8;background:color-mix(in srgb,#2563eb 6%,var(--bg-primary,#fff))}.choice{display:grid;place-items:center;width:15px;height:15px;border:1px solid #aeb8c7;border-radius:50%;margin-top:1px;flex:0 0 auto}.multiple .choice{border-radius:4px}.option.selected .choice{border-color:#2563eb;background:#2563eb;color:#fff}.option.selected:not(.multiple .option) .choice:after{content:'';width:5px;height:5px;border-radius:50%;background:#2563eb}.option b{display:block;font-size:11px}.option small{display:block;margin-top:2px;color:var(--text-secondary,#64748b);font-size:10px;line-height:1.35}.option mark{position:absolute;right:7px;top:6px;background:transparent;color:#2563eb;font-size:9px}textarea{box-sizing:border-box;width:100%;margin-top:7px;border:1px solid var(--border-color,#d7dce5);border-radius:7px;padding:8px 9px;background:var(--bg-primary,#fff);color:var(--text-primary,#1f2937);font:inherit;resize:vertical;min-height:52px}.additional-note{display:block;padding:0 13px 10px;color:var(--text-primary,#374151);font-size:11px}.additional-note small{color:#94a3b8}.pre-plan-dock footer{display:flex;align-items:center;justify-content:flex-end;gap:8px;padding:9px 13px;background:color-mix(in srgb,var(--bg-secondary,#f8fafc) 62%,transparent)}.hint{margin-right:auto;color:#64748b;font-size:10px}.primary,.secondary{display:inline-flex;align-items:center;gap:6px;border-radius:7px;padding:7px 11px;font-size:11px}.primary{border:1px solid #2563eb;background:#2563eb;color:#fff}.primary:disabled{opacity:.45}.secondary{margin-right:auto;border:1px solid var(--border-color,#d7dce5);background:var(--bg-primary,#fff);color:var(--text-primary,#334155)}@media(max-width:640px){.pre-plan-dock{border-radius:9px}.option-grid{grid-template-columns:1fr}.pre-plan-dock footer{align-items:stretch;flex-direction:column}.primary,.secondary{justify-content:center;width:100%;margin:0}.hint{margin:0;text-align:center}}
</style>
