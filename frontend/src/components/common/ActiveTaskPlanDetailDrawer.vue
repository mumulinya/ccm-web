<script setup>
import { computed, ref, watch } from 'vue'
import { AlertTriangle, Check, ChevronDown, ChevronUp, Circle, GitBranch, Plus, Trash2 } from '@lucide/vue'
import ResponsiveDetailDrawer from './ResponsiveDetailDrawer.vue'
import { toast } from '../../utils/toast.js'

const props = defineProps({
  open: { type: Boolean, default: false },
  taskId: { type: String, default: '' },
  fallbackPlan: { type: Object, default: null },
})
const emit = defineEmits(['close', 'confirm', 'updated', 'locate'])

const loading = ref(false)
const saving = ref(false)
const error = ref('')
const plan = ref(null)
const editing = ref(false)
const draft = ref(null)

const statusText = status => ({
  ready: '计划已就绪', awaiting_confirmation: '等待确认', executing: '正在执行', blocked: '需要处理', reviewing: '正在验收', completed: '全部完成',
  pending: '待执行', waiting_dependency: '等待依赖', waiting_permission: '等待授权', running: '执行中', review: '验收中', rework: '返工中', skipped: '已跳过',
}[String(status || '').toLowerCase()] || String(status || '待执行'))

const planSubtitle = computed(() => {
  const current = plan.value
  if (!current) return ''
  return `${current.title || '实施计划'} · ${current.scope === 'group' ? '群聊协作' : '项目任务'}`
})
const canEdit = computed(() => plan.value && !['completed'].includes(plan.value.status))
const needsConfirmation = computed(() => plan.value?.status === 'awaiting_confirmation' || props.fallbackPlan?.status === 'ready')
const workItems = computed(() => Array.isArray(plan.value?.workItems) ? plan.value.workItems : [])
const assignments = computed(() => Array.isArray(plan.value?.assignments) ? plan.value.assignments : [])
const completedCount = computed(() => workItems.value.filter(item => item.status === 'completed').length)

const fallbackDetail = () => ({
  schema: 'ccm-task-plan-detail-v1',
  taskId: props.taskId,
  title: props.fallbackPlan?.title || '需求实施计划',
  goal: props.fallbackPlan?.goal || '',
  summary: '',
  status: props.fallbackPlan?.status || 'executing',
  scope: (props.fallbackPlan?.steps || []).some(item => item.project) ? 'group' : 'project',
  workItems: (props.fallbackPlan?.steps || []).map((item, index) => ({
    id: item.id || `work_${index + 1}`, planStepId: item.id || `work_${index + 1}`, title: item.title, objective: item.title,
    project: item.project || '', status: item.status || 'pending', dependsOn: [], acceptanceCriteria: [], editable: item.status === 'pending',
  })),
  assignments: [], acceptanceCriteria: [], permissionBoundaries: [], risks: [], sourceReferences: [], revisionHistory: [],
  revision: props.fallbackPlan?.revision || 1, generation: props.fallbackPlan?.generation || 0, bindingChecksum: '',
})

const loadPlan = async () => {
  if (!props.taskId) return
  loading.value = true
  error.value = ''
  try {
    const response = await fetch(`/api/tasks/${encodeURIComponent(props.taskId)}/plan-detail`, { cache: 'no-store' })
    const data = await response.json()
    if (!response.ok || data.success === false) throw new Error(data.error || '无法读取详细计划')
    plan.value = data.plan
  } catch (loadError) {
    error.value = loadError?.message || '无法读取详细计划'
    plan.value = fallbackDetail()
  } finally { loading.value = false }
}

watch(() => [props.open, props.taskId], ([open]) => {
  if (open) loadPlan()
  else { editing.value = false; draft.value = null; error.value = '' }
}, { immediate: true })

const startEditing = () => {
  if (!canEdit.value) return
  draft.value = JSON.parse(JSON.stringify(plan.value))
  editing.value = true
}
const cancelEditing = () => { editing.value = false; draft.value = null }
const moveItem = (index, direction) => {
  const items = draft.value?.workItems || []
  const target = index + direction
  if (target < 0 || target >= items.length) return
  const [item] = items.splice(index, 1)
  items.splice(target, 0, item)
}
const removeItem = index => {
  const item = draft.value?.workItems?.[index]
  if (!item?.editable) return
  draft.value.workItems.splice(index, 1)
  for (const row of draft.value.workItems) row.dependsOn = (row.dependsOn || []).filter(id => id !== item.id)
}
const addItem = () => {
  const id = `work_user_${Date.now().toString(36)}`
  draft.value.workItems.push({
    id, planStepId: id, title: '新增执行步骤', objective: '', project: plan.value?.scope === 'project' ? (workItems.value[0]?.project || '') : '',
    status: 'pending', dependsOn: [], acceptanceCriteria: [], editable: true,
  })
}
const updateCsv = (target, field, value) => { target[field] = String(value || '').split(/[，,\n]/).map(item => item.trim()).filter(Boolean) }
const savePlan = async () => {
  if (!draft.value || saving.value) return
  saving.value = true
  try {
    const response = await fetch(`/api/tasks/${encodeURIComponent(props.taskId)}/plan-detail`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        revision: plan.value.revision, generation: plan.value.generation, bindingChecksum: plan.value.bindingChecksum,
        title: draft.value.title, goal: draft.value.goal, workItems: draft.value.workItems,
        acceptanceCriteria: draft.value.acceptanceCriteria, permissionBoundaries: draft.value.permissionBoundaries,
        summary: '用户在详细计划中调整了执行清单',
      }),
    })
    const data = await response.json()
    if (!response.ok || data.success === false) {
      if (response.status === 409 && data.current) plan.value = data.current
      throw new Error(data.error || '保存计划失败')
    }
    plan.value = data.plan
    editing.value = false
    draft.value = null
    emit('updated', data.plan)
    toast.success('详细计划已更新')
  } catch (saveError) { toast.error(saveError?.message || '保存计划失败') }
  finally { saving.value = false }
}
const confirmPlan = () => emit('confirm', { taskId: props.taskId, plan: plan.value })
const locateItem = item => emit('locate', { taskId: props.taskId, planStepId: item.planStepId || item.id, workItemId: item.id })
</script>

<template>
  <ResponsiveDetailDrawer :open="open" title="详细计划" :subtitle="planSubtitle" :loading="loading" width="wide" @close="emit('close')">
    <div v-if="error && !plan" class="plan-detail-error">{{ error }}</div>
    <template v-else-if="plan">
      <div class="plan-detail-status">
        <span :class="`status-${plan.status}`">{{ statusText(plan.status) }}</span>
        <small>{{ completedCount }} / {{ workItems.length }} 项完成</small>
      </div>

      <section class="plan-detail-section">
        <header><b>1</b><h4>目标与范围</h4></header>
        <template v-if="editing">
          <input v-model="draft.title" class="plan-edit-title" maxlength="180" aria-label="计划标题">
          <textarea v-model="draft.goal" rows="3" maxlength="900" aria-label="计划目标"></textarea>
        </template>
        <template v-else><h3>{{ plan.title }}</h3><p>{{ plan.goal || plan.summary || '按当前需求完成实现与验收。' }}</p></template>
      </section>

      <section v-if="assignments.length" class="plan-detail-section">
        <header><b>2</b><h4>{{ plan.scope === 'group' ? '项目分工' : '当前项目' }}</h4></header>
        <div class="assignment-list">
          <article v-for="assignment in assignments" :key="assignment.id">
            <span><strong>{{ assignment.project || assignment.label }}</strong><small>{{ assignment.label !== assignment.project ? assignment.label : `${assignment.workItemIds?.length || 0}个工作项` }}</small></span>
            <em :class="`work-${assignment.status}`">{{ statusText(assignment.status) }}</em>
          </article>
        </div>
      </section>

      <section class="plan-detail-section">
        <header><b>3</b><h4>依赖关系</h4></header>
        <div class="dependency-list">
          <div v-for="item in (editing ? draft.workItems : workItems)" :key="item.id">
            <GitBranch :size="14" />
            <span>{{ item.dependsOn?.length ? item.dependsOn.join('、') : '任务起点' }}</span>
            <i>→</i><strong>{{ item.title }}</strong>
          </div>
        </div>
      </section>

      <section class="plan-detail-section">
        <header><b>4</b><h4>验收标准</h4></header>
        <textarea v-if="editing" :value="draft.acceptanceCriteria.join('\n')" rows="4" @input="updateCsv(draft, 'acceptanceCriteria', $event.target.value)"></textarea>
        <ul v-else class="criteria-list">
          <li v-for="criterion in plan.acceptanceCriteria" :key="criterion"><Check :size="14" />{{ criterion }}</li>
          <li v-if="!plan.acceptanceCriteria.length"><Circle :size="12" />完成工作项后执行构建、测试和独立验收</li>
        </ul>
      </section>

      <details v-if="plan.sourceReferences?.length" class="plan-detail-collapsible">
        <summary>源码依据 · {{ plan.sourceReferences.reduce((sum, item) => sum + (item.paths?.length || 0), 0) }}个文件</summary>
        <div v-for="source in plan.sourceReferences" :key="source.project"><strong>{{ source.project }}</strong><code v-for="path in source.paths" :key="path">{{ path }}</code></div>
      </details>

      <section v-if="plan.risks?.length || plan.permissionBoundaries?.length" class="plan-detail-section risk-section">
        <header><b>5</b><h4>风险与权限</h4></header>
        <p v-for="risk in [...plan.risks, ...plan.permissionBoundaries]" :key="risk"><AlertTriangle :size="14" />{{ risk }}</p>
      </section>

      <section class="plan-detail-section execution-list-section">
        <header class="execution-list-head">
          <span><b>6</b><h4>执行清单 · {{ (editing ? draft.workItems : workItems).length }}项</h4></span>
          <button v-if="editing" type="button" @click="addItem"><Plus :size="14" />新增</button>
        </header>
        <ol class="detail-work-items">
          <li v-for="(item, index) in (editing ? draft.workItems : workItems)" :key="item.id" :class="`work-${item.status}`">
            <template v-if="editing">
              <span class="edit-order">
                <button type="button" :disabled="index === 0 || !item.editable" aria-label="上移" @click="moveItem(index, -1)"><ChevronUp :size="14" /></button>
                <button type="button" :disabled="index === draft.workItems.length - 1 || !item.editable" aria-label="下移" @click="moveItem(index, 1)"><ChevronDown :size="14" /></button>
              </span>
              <div class="edit-fields">
                <input v-model="item.title" :disabled="!item.editable" maxlength="180" aria-label="工作项标题">
                <textarea v-model="item.objective" :disabled="!item.editable" rows="2" maxlength="520" aria-label="工作项目标"></textarea>
                <div class="edit-row"><input v-model="item.project" :disabled="!item.editable || plan.scope === 'project'" placeholder="所属项目"><input :value="item.dependsOn.join(', ')" :disabled="!item.editable" placeholder="前置工作项ID" @input="updateCsv(item, 'dependsOn', $event.target.value)"></div>
                <input :value="item.acceptanceCriteria.join('；')" :disabled="!item.editable" placeholder="验收标准" @input="updateCsv(item, 'acceptanceCriteria', $event.target.value)">
              </div>
              <button type="button" class="delete-item" :disabled="!item.editable" aria-label="删除工作项" @click="removeItem(index)"><Trash2 :size="15" /></button>
            </template>
            <button v-else type="button" class="work-item-button" @click="locateItem(item)">
              <span class="work-mark"><Check v-if="item.status === 'completed'" :size="13" /><span v-else-if="['running','reviewing','rework'].includes(item.status)">●</span><span v-else-if="item.status.startsWith('waiting')">◷</span><Circle v-else :size="13" /></span>
              <span class="work-copy"><strong>{{ item.title }}</strong><small v-if="item.waitingReason || item.objective">{{ item.waitingReason || item.objective }}</small></span>
              <em v-if="plan.scope === 'group' && item.project">{{ item.project }}</em><i>{{ statusText(item.status) }}</i>
            </button>
          </li>
        </ol>
      </section>

      <details v-if="plan.revisionHistory?.length" class="plan-detail-collapsible">
        <summary>计划修订 · {{ plan.revisionHistory.length }}次</summary>
        <p v-for="revision in plan.revisionHistory" :key="revision.revision">v{{ revision.revision }} · {{ revision.summary }}</p>
      </details>
    </template>

    <template #footer>
      <div class="plan-detail-footer">
        <template v-if="editing"><button type="button" :disabled="saving" @click="cancelEditing">取消</button><button type="button" class="primary" :disabled="saving" @click="savePlan">{{ saving ? '保存中…' : '保存调整' }}</button></template>
        <template v-else><button v-if="canEdit" type="button" @click="startEditing">{{ plan?.status === 'executing' ? '调整后续计划' : '调整计划' }}</button><button v-if="needsConfirmation" type="button" class="primary" @click="confirmPlan">确认并分派</button><button v-else type="button" class="primary" @click="emit('close')">{{ plan?.status === 'completed' ? '查看结果' : '返回执行现场' }}</button></template>
      </div>
    </template>
  </ResponsiveDetailDrawer>
</template>

<style scoped>
.plan-detail-status{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:13px}.plan-detail-status span{padding:4px 9px;border-radius:999px;background:var(--accent-soft);color:var(--accent-blue);font-size:11px;font-weight:800}.plan-detail-status .status-awaiting_confirmation{background:#fff7ed;color:#c2410c}.plan-detail-status .status-completed{background:#ecfdf5;color:#15803d}.plan-detail-status .status-blocked{background:#fef2f2;color:#b91c1c}.plan-detail-status small{color:var(--text-muted);font-size:11px}
.plan-detail-section{display:grid;gap:9px;padding:14px 0;border-top:1px solid color-mix(in srgb,var(--border-color) 78%,transparent)}.plan-detail-section:first-of-type{border-top:0;padding-top:0}.plan-detail-section>header,.execution-list-head>span{display:flex;align-items:center;gap:8px}.plan-detail-section header>b,.execution-list-head b{width:21px;height:21px;display:grid;place-items:center;border-radius:50%;background:#dbeafe;color:#1d4ed8;font-size:11px}.plan-detail-section h4,.execution-list-head h4{margin:0;color:var(--text-primary);font-size:13px}.plan-detail-section h3{margin:0;color:var(--text-primary);font-size:14px}.plan-detail-section p{margin:0;color:var(--text-secondary);font-size:12px;line-height:1.55}.plan-detail-section input,.plan-detail-section textarea{box-sizing:border-box;width:100%;padding:8px 9px;border:1px solid var(--border-color);border-radius:7px;background:var(--surface);color:var(--text-primary);font:inherit;font-size:12px;line-height:1.45}.plan-detail-section input:focus,.plan-detail-section textarea:focus{outline:2px solid color-mix(in srgb,var(--accent-blue) 20%,transparent);border-color:var(--accent-blue)}.plan-edit-title{font-weight:800}
.assignment-list{display:grid;border:1px solid var(--border-color);border-radius:9px;overflow:hidden}.assignment-list article{min-height:43px;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:6px 10px;border-top:1px solid var(--border-color)}.assignment-list article:first-child{border-top:0}.assignment-list span{min-width:0;display:grid;gap:2px}.assignment-list strong{font-size:12px}.assignment-list small{color:var(--text-muted);font-size:10px}.assignment-list em{font-size:10.5px;font-style:normal;color:var(--text-muted)}.assignment-list .work-running,.assignment-list .work-reviewing{color:#2563eb}.assignment-list .work-blocked,.assignment-list .work-waiting_dependency{color:#d97706}.assignment-list .work-completed{color:#15803d}
.dependency-list{display:grid;gap:6px}.dependency-list div{display:grid;grid-template-columns:16px minmax(70px,.7fr) auto minmax(110px,1.4fr);align-items:center;gap:7px;padding:7px 8px;border:1px solid color-mix(in srgb,var(--border-color) 74%,transparent);border-radius:7px;color:var(--text-secondary);font-size:11px}.dependency-list strong{color:var(--text-primary);font-size:11px}.dependency-list i{font-style:normal;color:var(--text-muted)}
.criteria-list{display:grid;gap:7px;margin:0;padding:0;list-style:none}.criteria-list li{display:flex;align-items:flex-start;gap:7px;color:var(--text-secondary);font-size:11.5px}.criteria-list svg{flex:0 0 auto;margin-top:1px;color:#16a34a}.plan-detail-collapsible{margin:0;padding:10px 0;border-top:1px solid var(--border-color);color:var(--text-secondary);font-size:11px}.plan-detail-collapsible summary{cursor:pointer;color:var(--text-primary);font-size:12px;font-weight:800}.plan-detail-collapsible>div{display:grid;gap:4px;margin-top:8px}.plan-detail-collapsible code{padding:4px 7px;border-radius:5px;background:var(--bg-secondary);font-size:10px;overflow-wrap:anywhere}.plan-detail-collapsible p{margin:7px 0 0;line-height:1.45}.risk-section p{display:flex;align-items:flex-start;gap:7px;padding:7px 8px;border-radius:7px;background:#fffbeb;color:#92400e}.risk-section svg{flex:0 0 auto;margin-top:1px}
.execution-list-head{display:flex;align-items:center;justify-content:space-between;gap:10px}.execution-list-head button{display:flex;align-items:center;gap:4px;padding:5px 8px;border:1px solid var(--border-color);border-radius:6px;background:transparent;color:var(--accent-blue);font-size:11px;cursor:pointer}.detail-work-items{display:grid;margin:0;padding:0;border:1px solid var(--border-color);border-radius:9px;overflow:hidden;list-style:none}.detail-work-items li{border-top:1px solid var(--border-color)}.detail-work-items li:first-child{border-top:0}.work-item-button{width:100%;min-height:48px;display:grid;grid-template-columns:20px minmax(0,1fr) auto auto;align-items:center;gap:8px;padding:7px 9px;border:0;background:transparent;color:var(--text-secondary);text-align:left;cursor:pointer}.work-item-button:hover{background:color-mix(in srgb,var(--accent-blue) 5%,transparent)}.work-mark{width:18px;height:18px;display:grid;place-items:center;color:var(--text-muted)}.work-running .work-mark,.work-reviewing .work-mark,.work-rework .work-mark{color:#2563eb}.work-completed .work-mark{color:#16a34a}.work-waiting_dependency .work-mark,.work-waiting_permission .work-mark{color:#d97706}.work-copy{min-width:0;display:grid;gap:2px}.work-copy strong{overflow:hidden;color:var(--text-primary);font-size:11.5px;text-overflow:ellipsis;white-space:nowrap}.work-copy small{overflow:hidden;color:var(--text-muted);font-size:9.5px;text-overflow:ellipsis;white-space:nowrap}.work-item-button em{padding:2px 6px;border-radius:5px;background:var(--bg-secondary);color:#2563eb;font-size:9px;font-style:normal}.work-item-button i{color:var(--text-muted);font-size:9.5px;font-style:normal;white-space:nowrap}.work-completed{opacity:.68}.work-running,.work-reviewing,.work-rework{background:color-mix(in srgb,var(--accent-blue) 5%,transparent)}
.detail-work-items li:has(.edit-fields){display:grid;grid-template-columns:28px minmax(0,1fr) 28px;gap:8px;padding:9px}.edit-order{display:grid;align-content:start;gap:3px}.edit-order button,.delete-item{width:26px;height:26px;display:grid;place-items:center;padding:0;border:1px solid var(--border-color);border-radius:5px;background:transparent;color:var(--text-muted);cursor:pointer}.edit-order button:disabled,.delete-item:disabled{opacity:.35;cursor:not-allowed}.delete-item{color:#dc2626}.edit-fields{display:grid;gap:6px}.edit-row{display:grid;grid-template-columns:minmax(100px,.7fr) minmax(150px,1.3fr);gap:6px}.plan-detail-footer{display:flex;justify-content:flex-end;gap:8px}.plan-detail-footer button{min-height:34px;padding:0 14px;border:1px solid var(--border-color);border-radius:7px;background:var(--surface);color:var(--text-secondary);font-size:12px;font-weight:800;cursor:pointer}.plan-detail-footer button.primary{border-color:#2563eb;background:#2563eb;color:#fff}.plan-detail-footer button:disabled{opacity:.5;cursor:not-allowed}.plan-detail-error{padding:14px;border-radius:8px;background:#fef2f2;color:#b91c1c;font-size:12px}
@media(max-width:640px){.dependency-list div{grid-template-columns:16px minmax(0,1fr) auto}.dependency-list strong{grid-column:2 / -1}.work-item-button{grid-template-columns:20px minmax(0,1fr) auto}.work-item-button>i{grid-column:2}.work-copy small{white-space:normal}.edit-row{grid-template-columns:1fr}.detail-work-items li:has(.edit-fields){grid-template-columns:24px minmax(0,1fr) 24px}}
</style>
