<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import {
  ArrowDown, ArrowUp, FileText, GitMerge, Layers3, Paperclip, Pencil,
  Plus, Sparkles, Trash2, X,
} from '@lucide/vue'
import { groupsApi, sessionsApi } from '../../api/index.js'
import AttachmentChips from '../common/AttachmentChips.vue'
import OnlineDocumentReferences from '../common/OnlineDocumentReferences.vue'
import { toast } from '../../utils/toast.js'

const props = defineProps({
  groups: { type: Array, default: () => [] },
  projects: { type: Array, default: () => [] },
})
const emit = defineEmits(['close', 'created'])

const targetType = ref(props.groups.length ? 'group' : 'project')
const groupId = ref(props.groups[0]?.id || '')
const projectId = ref(props.projects[0]?.name || '')
const sessionId = ref('')
const sessions = ref([])
const sessionsLoading = ref(false)
const title = ref('')
const requirement = ref('')
const priority = ref('normal')
const files = ref([])
const clientMessageId = ref('')
const fileInput = ref(null)
const busy = ref(false)
const preview = ref(null)
const editingItemKey = ref('')

const targetId = computed(() => targetType.value === 'group' ? groupId.value : projectId.value)
const targetLabel = computed(() => {
  if (targetType.value === 'group') return props.groups.find(item => item.id === groupId.value)?.name || groupId.value
  return props.projects.find(item => item.name === projectId.value)?.display_name || projectId.value
})
const planItems = computed(() => preview.value?.intake?.decomposition_plan?.items || preview.value?.decomposition_plan?.items || [])
const decompositionPlan = computed(() => preview.value?.intake?.decomposition_plan || preview.value?.decomposition_plan || null)
const planTargetOptions = computed(() => [
  { value: 'auto:', label: '由主 Agent 根据项目能力选择' },
  ...props.groups.map(item => ({ value: `group:${item.id}`, label: `群聊 · ${item.name}` })),
  ...props.projects.map(item => ({ value: `project:${item.name}`, label: `项目 · ${item.display_name || item.name}` })),
])
const planValidation = computed(() => {
  if (!planItems.value.length) return { pass: false, message: '至少保留一个可执行任务' }
  const keys = new Set(planItems.value.map(item => item.item_key))
  if (keys.size !== planItems.value.length) return { pass: false, message: '任务标识重复，请删除重复任务后重新添加' }
  for (const item of planItems.value) {
    if (!String(item.title || '').trim()) return { pass: false, message: '每个任务都需要标题' }
    if (!String(item.business_goal || '').trim()) return { pass: false, message: `“${item.title}”需要明确业务目标` }
    if ((item.depends_on || []).some(key => key === item.item_key || !keys.has(key))) {
      return { pass: false, message: `“${item.title}”存在无效依赖，请重新选择` }
    }
  }
  const visiting = new Set()
  const visited = new Set()
  const byKey = new Map(planItems.value.map(item => [item.item_key, item]))
  const containsCycle = key => {
    if (visiting.has(key)) return true
    if (visited.has(key)) return false
    visiting.add(key)
    const cyclic = (byKey.get(key)?.depends_on || []).some(containsCycle)
    visiting.delete(key)
    visited.add(key)
    return cyclic
  }
  if (planItems.value.some(item => containsCycle(item.item_key))) {
    return { pass: false, message: '任务之间形成了循环依赖，请取消其中一条前置依赖' }
  }
  return { pass: true, message: `${planItems.value.length} 个任务的依赖关系有效` }
})

const loadSessions = async () => {
  sessions.value = []
  sessionId.value = ''
  if (!targetId.value) return
  sessionsLoading.value = true
  try {
    const data = targetType.value === 'group'
      ? await groupsApi.sessions(targetId.value)
      : await sessionsApi.list(targetId.value)
    sessions.value = (data.sessions || []).filter(item => !item.archived)
  } catch (error) {
    toast.warning(error?.message || '会话列表暂时无法读取，将创建专属自动开发会话')
  } finally {
    sessionsLoading.value = false
  }
}

watch([targetType, groupId, projectId], loadSessions)
onMounted(loadSessions)

const addFiles = incoming => {
  const keys = new Set(files.value.map(file => `${file.name}:${file.size}:${file.lastModified || 0}`))
  for (const file of Array.from(incoming || [])) {
    if (!file?.name || file.size > 25 * 1024 * 1024 || files.value.length >= 10) continue
    const key = `${file.name}:${file.size}:${file.lastModified || 0}`
    if (!keys.has(key)) {
      keys.add(key)
      files.value.push(file)
    }
  }
}
const chooseFiles = () => fileInput.value?.click()
const onFiles = event => {
  addFiles(event.target.files)
  event.target.value = ''
}
const onPaste = event => {
  const pasted = Array.from(event.clipboardData?.files || [])
  if (!pasted.length) return
  event.preventDefault()
  addFiles(pasted)
}

const uniqueList = values => [...new Set((values || []).map(value => String(value || '').trim()).filter(Boolean))]
const isIntegrationItem = item => item?.item_key === 'epic-integration-acceptance'
const updateItemList = (item, field, value) => {
  item[field] = uniqueList(String(value || '').split(/\r?\n/))
}
const itemTargetValue = item => `${item.target_type || 'auto'}:${item.target_id || ''}`
const setItemTarget = (item, value) => {
  const separator = value.indexOf(':')
  item.target_type = separator >= 0 ? value.slice(0, separator) : 'auto'
  item.target_id = separator >= 0 ? value.slice(separator + 1) : ''
}
const itemTargetLabel = item => planTargetOptions.value.find(option => option.value === itemTargetValue(item))?.label || '由主 Agent 自动选择'
const toggleDependency = (item, dependencyKey, checked) => {
  const next = new Set(item.depends_on || [])
  if (checked) next.add(dependencyKey)
  else next.delete(dependencyKey)
  next.delete(item.item_key)
  item.depends_on = [...next]
}
const movePlanItem = (index, offset) => {
  const nextIndex = index + offset
  if (nextIndex < 0 || nextIndex >= planItems.value.length) return
  const [item] = planItems.value.splice(index, 1)
  planItems.value.splice(nextIndex, 0, item)
}
const removePlanItem = index => {
  if (isIntegrationItem(planItems.value[index])) return toast.warning('跨任务集成验收是最终交付门禁，不能删除')
  if (planItems.value.length <= 1) return toast.warning('至少保留一个可执行任务')
  const [removed] = planItems.value.splice(index, 1)
  for (const item of planItems.value) item.depends_on = (item.depends_on || []).filter(key => key !== removed.item_key)
  if (editingItemKey.value === removed.item_key) editingItemKey.value = ''
}
const mergePlanItemUp = index => {
  if (index <= 0) return
  const current = planItems.value[index]
  const previous = planItems.value[index - 1]
  if (isIntegrationItem(current) || isIntegrationItem(previous)) {
    return toast.warning('跨任务集成验收需要保持独立，不能与开发任务合并')
  }
  previous.business_goal = [previous.business_goal, current.business_goal].filter(Boolean).join('\n')
  for (const field of ['scope', 'acceptance_criteria', 'risks', 'suggested_agent_capabilities', 'source_evidence']) {
    previous[field] = uniqueList([...(previous[field] || []), ...(current[field] || [])])
  }
  previous.depends_on = uniqueList([...(previous.depends_on || []), ...(current.depends_on || [])])
    .filter(key => key !== previous.item_key && key !== current.item_key)
  for (const item of planItems.value) {
    item.depends_on = uniqueList((item.depends_on || []).map(key => key === current.item_key ? previous.item_key : key))
      .filter(key => key !== item.item_key)
  }
  planItems.value.splice(index, 1)
  editingItemKey.value = previous.item_key
}
const addPlanItem = () => {
  const key = `manual-${Date.now().toString(36)}-${planItems.value.length + 1}`
  planItems.value.push({
    item_key: key,
    title: '新增执行任务',
    business_goal: '',
    scope: [],
    target_type: 'auto',
    target_id: '',
    acceptance_criteria: decompositionPlan.value?.global_acceptance_criteria?.length
      ? [...decompositionPlan.value.global_acceptance_criteria]
      : ['完成该任务范围并提供实际验证证据'],
    depends_on: [],
    risks: [],
    suggested_agent_capabilities: ['general-development'],
    parallelizable: false,
    source_evidence: [...(decompositionPlan.value?.source_evidence || [])],
  })
  editingItemKey.value = key
}

const request = async (path, body) => {
  const response = await fetch(path, body instanceof FormData
    ? { method: 'POST', body }
    : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const data = await response.json().catch(() => ({}))
  if (!response.ok || data.success === false) throw new Error(data.error || `请求失败 (${response.status})`)
  return data
}

const createClientMessageId = () => globalThis.crypto?.randomUUID?.()
  || `task_dispatch_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`

const createPreview = async () => {
  if (!requirement.value.trim() && !files.value.length) return toast.warning('请描述业务目标或添加需求资料')
  if (!targetId.value) return toast.warning('请选择执行群聊或项目')
  busy.value = true
  try {
    if (!clientMessageId.value) clientMessageId.value = createClientMessageId()
    const form = new FormData()
    form.append('title', title.value.trim())
    form.append('requirement', requirement.value.trim())
    form.append('priority', priority.value)
    form.append('source', 'task-dispatch')
    form.append('request_origin', 'task-dispatch')
    form.append('queue_scope', 'conversation_serial')
    form.append('channel', 'web')
    form.append('client_message_id', clientMessageId.value)
    form.append('source_channel', 'task-dispatch')
    form.append('target_scope', targetType.value === 'group' ? 'group_session' : 'project_session')
    form.append('target_id', targetId.value)
    form.append('exact_session_id', sessionId.value)
    if (targetType.value === 'group') {
      form.append('group_id', groupId.value)
      form.append('group_session_id', sessionId.value)
    } else {
      form.append('target_project', projectId.value)
      form.append('project_session_id', sessionId.value)
    }
    files.value.forEach(file => form.append('files', file, file.name))
    const data = await request('/api/usability/intake/preview', form)
    preview.value = { ...data.task, intake: data.confirmation || data.task?.intake_draft || null, decomposition_plan: data.confirmation?.decomposition_plan }
    toast.success(`模型已整理执行计划${planItems.value.length ? `，拆分为 ${planItems.value.length} 个任务` : ''}`)
  } catch (error) {
    toast.error(error.message)
  } finally {
    busy.value = false
  }
}

const confirmAndQueue = async () => {
  if (!preview.value?.id) return
  if (!planValidation.value.pass) return toast.warning(planValidation.value.message)
  busy.value = true
  try {
    const data = await request('/api/usability/intake/confirm', {
      task_id: preview.value.id,
      decomposition_plan: decompositionPlan.value,
    })
    emit('created', data)
    toast.success(`已创建 ${data.children?.length || 1} 个分派任务，并按会话顺序进入自动执行队列`)
    emit('close')
  } catch (error) {
    toast.error(error.message)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="modal-overlay automated-intake-overlay" @click.self="emit('close')" @paste.capture="onPaste">
    <section class="automated-intake-modal" role="dialog" aria-modal="true" aria-labelledby="automated-intake-title">
      <header>
        <span class="modal-icon"><Sparkles :size="19" /></span>
        <div><h3 id="automated-intake-title">自动开发任务</h3><p>提交业务描述、图片或文档，由模型拆分并按会话顺序自动执行。</p></div>
        <button class="icon-close" title="关闭" @click="emit('close')"><X :size="18" /></button>
      </header>

      <div v-if="!preview" class="intake-form">
        <div class="target-grid">
          <label><span>执行范围</span><select v-model="targetType"><option value="group">群聊会话</option><option value="project">项目会话</option></select></label>
          <label v-if="targetType === 'group'"><span>群聊</span><select v-model="groupId"><option v-for="group in groups" :key="group.id" :value="group.id">{{ group.name }}</option></select></label>
          <label v-else><span>项目</span><select v-model="projectId"><option v-for="project in projects" :key="project.name" :value="project.name">{{ project.display_name || project.name }}</option></select></label>
          <label><span>会话</span><select v-model="sessionId" :disabled="sessionsLoading"><option value="">新建专属自动开发会话</option><option v-for="session in sessions" :key="session.id" :value="session.id">{{ session.name || session.title || session.id }}</option></select></label>
          <label><span>队列优先级</span><select v-model="priority"><option value="high">高，插入当前队列前部</option><option value="normal">普通，按创建顺序</option><option value="low">低，等待普通任务</option></select></label>
        </div>
        <label class="field"><span>任务标题 <small>可选</small></span><input v-model="title" placeholder="模型会根据需求自动生成标题"></label>
        <label class="field"><span>业务目标与要求</span><textarea v-model="requirement" rows="7" placeholder="描述想完成的结果、范围和验收要求；也可以只上传需求文档或图片。"></textarea></label>
        <OnlineDocumentReferences :text="requirement" pending-label="整理计划时读取" />
        <AttachmentChips :files="files" @remove="index => files.splice(index, 1)" />
        <div class="attachment-row">
          <input ref="fileInput" type="file" hidden multiple accept="image/*,.txt,.md,.json,.csv,.pdf,.docx,.pptx,.xlsx" @change="onFiles">
          <button class="secondary" :disabled="busy" @click="chooseFiles"><Paperclip :size="16" />添加图片或文档</button>
          <span>可在文本框直接粘贴，最多 10 个文件，单个 25 MB</span>
        </div>
      </div>

      <div v-else class="plan-preview">
        <div class="plan-summary"><span><Layers3 :size="18" /></span><div><strong>{{ preview.title }}</strong><p>{{ preview.intake?.business_goal || preview.business_goal || preview.description }}</p></div></div>
        <div class="plan-facts"><span>执行位置 <strong>{{ targetLabel }}</strong></span><span>精确会话 <strong>{{ preview.project_session_id || preview.group_session_id || '已自动创建' }}</strong></span><span>任务数量 <strong>{{ planItems.length || 1 }}</strong></span><span>执行策略 <strong>会话内串行</strong></span></div>
        <div :class="['plan-validation', planValidation.pass ? 'ok' : 'warn']">{{ planValidation.message }}</div>
        <div class="plan-items">
          <article v-for="(item, index) in planItems" :key="item.item_key || index" :class="{ editing: editingItemKey === item.item_key }">
            <span>{{ index + 1 }}</span>
            <div class="plan-item-body">
              <div class="plan-item-title">
                <div>
                  <strong>{{ item.title }} <em v-if="isIntegrationItem(item)" class="required-gate">必需验收</em></strong>
                  <small>{{ itemTargetLabel(item) }}</small>
                </div>
                <div class="plan-item-actions">
                  <button title="上移" :disabled="index === 0" @click="movePlanItem(index, -1)"><ArrowUp :size="14" /></button>
                  <button title="下移" :disabled="index === planItems.length - 1" @click="movePlanItem(index, 1)"><ArrowDown :size="14" /></button>
                  <button v-if="index > 0" :title="isIntegrationItem(item) || isIntegrationItem(planItems[index - 1]) ? '最终验收必须保持独立' : '合并到上一项'" :disabled="isIntegrationItem(item) || isIntegrationItem(planItems[index - 1])" @click="mergePlanItemUp(index)"><GitMerge :size="14" /></button>
                  <button title="编辑任务" @click="editingItemKey = editingItemKey === item.item_key ? '' : item.item_key"><Pencil :size="14" /></button>
                  <button class="danger" :title="isIntegrationItem(item) ? '最终验收不能删除' : '删除任务'" :disabled="planItems.length <= 1 || isIntegrationItem(item)" @click="removePlanItem(index)"><Trash2 :size="14" /></button>
                </div>
              </div>
              <p>{{ item.business_goal }}</p>
              <small>依赖：{{ item.depends_on?.length ? item.depends_on.map(key => planItems.find(candidate => candidate.item_key === key)?.title || key).join('、') : '无，可立即进入队列' }}</small>
              <div v-if="item.source_evidence?.length" class="source-evidence">
                <FileText :size="13" />
                <span>来源：{{ item.source_evidence.join('；') }}</span>
              </div>
              <div v-if="editingItemKey === item.item_key" class="plan-item-editor">
                <label><span>任务标题</span><input v-model="item.title"></label>
                <label><span>业务目标</span><textarea v-model="item.business_goal" rows="3"></textarea></label>
                <label><span>执行位置</span><select :value="itemTargetValue(item)" @change="setItemTarget(item, $event.target.value)"><option v-for="option in planTargetOptions" :key="option.value" :value="option.value">{{ option.label }}</option></select></label>
                <label><span>工作范围 <small>每行一项</small></span><textarea :value="(item.scope || []).join('\n')" rows="3" @input="updateItemList(item, 'scope', $event.target.value)"></textarea></label>
                <label><span>验收标准 <small>每行一项</small></span><textarea :value="(item.acceptance_criteria || []).join('\n')" rows="3" @input="updateItemList(item, 'acceptance_criteria', $event.target.value)"></textarea></label>
                <fieldset>
                  <legend>前置依赖</legend>
                  <label v-for="candidate in planItems.filter(candidate => candidate.item_key !== item.item_key)" :key="candidate.item_key" class="dependency-option">
                    <input type="checkbox" :checked="(item.depends_on || []).includes(candidate.item_key)" @change="toggleDependency(item, candidate.item_key, $event.target.checked)">
                    <span>{{ candidate.title }}</span>
                  </label>
                  <small v-if="planItems.length <= 1">当前没有其他任务可作为依赖。</small>
                </fieldset>
              </div>
            </div>
          </article>
          <article v-if="!planItems.length"><span>1</span><div><strong>{{ preview.title }}</strong><p>{{ preview.business_goal || preview.description }}</p></div></article>
        </div>
        <button class="add-plan-item" @click="addPlanItem"><Plus :size="15" />新增执行任务</button>
        <div class="replay-note"><FileText :size="16" /><span>确认后，每个任务的规划、开发、TestAgent、返工和最终验收都会进入任务回放。</span></div>
      </div>

      <footer>
        <button v-if="preview" class="secondary" :disabled="busy" @click="preview = null">返回调整</button>
        <button v-else class="secondary" @click="emit('close')">取消</button>
        <button class="primary" :disabled="busy || (preview && !planValidation.pass)" @click="preview ? confirmAndQueue() : createPreview()"><Sparkles :size="16" />{{ busy ? '处理中' : preview ? '确认并自动执行' : '让模型整理任务' }}</button>
      </footer>
    </section>
  </div>
</template>

<style scoped>
.automated-intake-overlay{z-index:1100}.automated-intake-modal{width:min(880px,calc(100vw - 32px));max-height:min(860px,calc(100vh - 32px));display:flex;flex-direction:column;overflow:hidden;border:1px solid var(--border-color);border-radius:8px;background:var(--surface);box-shadow:0 24px 70px rgba(15,23,42,.24)}
header{display:flex;align-items:center;gap:12px;padding:17px 19px;border-bottom:1px solid var(--border-color)}header>div{min-width:0;flex:1}header h3{margin:0;color:var(--text-primary);font-size:16px;letter-spacing:0}header p{margin:4px 0 0;color:var(--text-muted);font-size:11px}.modal-icon{width:36px;height:36px;display:grid;place-items:center;border-radius:7px;background:color-mix(in srgb,var(--accent-blue) 10%,var(--surface));color:var(--accent-blue)}.icon-close{width:34px;height:34px;display:grid;place-items:center;border:1px solid var(--border-color);border-radius:7px;background:var(--surface);color:var(--text-muted);cursor:pointer}
.intake-form,.plan-preview{min-height:0;overflow:auto;padding:18px 20px}.target-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px}.target-grid label,.field{display:grid;gap:6px}.target-grid span,.field>span{color:var(--text-secondary);font-size:11px;font-weight:750}.field{margin-top:13px}.field small{color:var(--text-muted);font-weight:500}.target-grid select,.field input,.field textarea{width:100%;min-width:0;border:1px solid var(--border-color);border-radius:7px;background:var(--surface);color:var(--text-primary);font:inherit;outline:none}.target-grid select,.field input{height:38px;padding:0 10px}.field textarea{padding:10px 11px;line-height:1.6;resize:vertical}.target-grid select:focus,.field input:focus,.field textarea:focus{border-color:var(--accent-blue);box-shadow:0 0 0 3px color-mix(in srgb,var(--accent-blue) 12%,transparent)}
.attachment-row{display:flex;align-items:center;gap:10px;margin-top:10px}.attachment-row span{color:var(--text-muted);font-size:10px}.primary,.secondary{min-height:38px;display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:0 13px;border-radius:7px;font-size:12px;font-weight:750;cursor:pointer}.primary{border:1px solid var(--accent-blue);background:var(--accent-blue);color:#fff}.secondary{border:1px solid var(--border-color);background:var(--surface);color:var(--text-secondary)}button:disabled{cursor:not-allowed;opacity:.55}
.plan-summary{display:flex;gap:11px;padding:14px;border:1px solid var(--border-color);border-radius:8px;background:var(--panel-muted)}.plan-summary>span{color:var(--accent-blue)}.plan-summary strong{color:var(--text-primary);font-size:14px}.plan-summary p{margin:5px 0 0;color:var(--text-secondary);font-size:11px;line-height:1.55}.plan-facts{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));margin:13px 0;border:1px solid var(--border-color);border-radius:8px;overflow:hidden}.plan-facts span{display:grid;gap:4px;padding:10px;border-right:1px solid var(--border-color);color:var(--text-muted);font-size:9.5px}.plan-facts span:last-child{border-right:0}.plan-facts strong{overflow:hidden;color:var(--text-primary);font-size:11px;text-overflow:ellipsis;white-space:nowrap}
.plan-validation{margin-bottom:8px;padding:7px 9px;border-radius:6px;font-size:10.5px}.plan-validation.ok{background:color-mix(in srgb,var(--accent-green) 8%,var(--surface));color:var(--accent-green)}.plan-validation.warn{background:rgba(245,158,11,.09);color:#b54708}
.plan-items{display:grid;gap:7px}.plan-items article{display:flex;gap:10px;padding:11px;border:1px solid var(--border-color);border-radius:7px}.plan-items article.editing{border-color:color-mix(in srgb,var(--accent-blue) 42%,var(--border-color));background:color-mix(in srgb,var(--accent-blue) 3%,var(--surface))}.plan-items article>span{flex:0 0 auto;width:24px;height:24px;display:grid;place-items:center;border-radius:6px;background:var(--panel-muted);color:var(--accent-blue);font-size:10px;font-weight:800}.plan-item-body{min-width:0;flex:1}.plan-item-title{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.plan-item-title>div:first-child{min-width:0;display:grid;gap:2px}.plan-item-title>div:first-child strong{display:flex;align-items:center;flex-wrap:wrap;gap:5px;overflow-wrap:anywhere}.plan-item-title>div:first-child small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.plan-item-actions{display:flex;gap:3px;flex:0 0 auto}.plan-item-actions button{width:27px;height:27px;display:grid;place-items:center;padding:0;border:1px solid var(--border-color);border-radius:6px;background:var(--surface);color:var(--text-muted);cursor:pointer}.plan-item-actions button:hover:not(:disabled){border-color:var(--accent-blue);color:var(--accent-blue)}.plan-item-actions button.danger:hover:not(:disabled){border-color:#ef4444;color:#b42318}.plan-item-actions button:disabled{opacity:.35;cursor:not-allowed}.plan-items strong{color:var(--text-primary);font-size:12px}.required-gate{display:inline-flex;padding:1px 5px;border-radius:4px;background:color-mix(in srgb,var(--accent-green) 10%,var(--surface));color:var(--accent-green);font-size:8.5px;font-style:normal;white-space:nowrap}.plan-items p{margin:4px 0;color:var(--text-secondary);font-size:10.5px;line-height:1.5}.plan-items small{color:var(--text-muted);font-size:9.5px}
.source-evidence{display:flex;align-items:flex-start;gap:5px;margin-top:6px;color:var(--text-muted);font-size:9.5px;line-height:1.45}.source-evidence svg{flex:0 0 auto;margin-top:1px}.source-evidence span{overflow-wrap:anywhere}
.plan-item-editor{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin-top:10px;padding-top:10px;border-top:1px solid var(--border-color)}.plan-item-editor label{min-width:0;display:grid;gap:4px}.plan-item-editor label:nth-child(2),.plan-item-editor label:nth-child(4),.plan-item-editor label:nth-child(5),.plan-item-editor fieldset{grid-column:1/-1}.plan-item-editor label>span,.plan-item-editor legend{color:var(--text-secondary);font-size:10px;font-weight:750}.plan-item-editor input,.plan-item-editor textarea,.plan-item-editor select{width:100%;min-width:0;box-sizing:border-box;padding:7px 8px;border:1px solid var(--border-color);border-radius:6px;background:var(--surface);color:var(--text-primary);font:inherit;font-size:11px;outline:none}.plan-item-editor textarea{resize:vertical;line-height:1.5}.plan-item-editor fieldset{display:flex;flex-wrap:wrap;gap:6px 12px;margin:0;padding:8px;border:1px solid var(--border-color);border-radius:6px}.dependency-option{display:flex!important;grid-column:auto!important;align-items:center;grid-template-columns:auto 1fr!important;gap:5px!important;max-width:100%}.dependency-option input{width:auto}.dependency-option span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.add-plan-item{min-height:34px;display:inline-flex;align-items:center;justify-content:center;gap:6px;margin-top:8px;padding:0 10px;border:1px dashed var(--border-color);border-radius:7px;background:transparent;color:var(--accent-blue);font-size:11px;font-weight:750;cursor:pointer}.add-plan-item:hover{border-color:var(--accent-blue);background:color-mix(in srgb,var(--accent-blue) 5%,var(--surface))}.replay-note{display:flex;align-items:center;gap:8px;margin-top:12px;padding:10px;border-left:3px solid var(--accent-green);background:color-mix(in srgb,var(--accent-green) 7%,var(--surface));color:var(--text-secondary);font-size:10.5px}
footer{display:flex;justify-content:flex-end;gap:8px;padding:13px 19px;border-top:1px solid var(--border-color);background:var(--panel-muted)}
@media(max-width:680px){.automated-intake-modal{width:100vw;height:100vh;max-height:none;border:0;border-radius:0}.target-grid,.plan-facts,.plan-item-editor{grid-template-columns:1fr}.plan-facts span{border-right:0;border-bottom:1px solid var(--border-color)}.plan-facts span:last-child{border-bottom:0}.attachment-row{align-items:flex-start;flex-direction:column}.plan-item-title{align-items:stretch;flex-direction:column}.plan-item-actions{overflow-x:auto}.plan-item-editor label,.plan-item-editor fieldset{grid-column:1!important}footer .primary{flex:1}}
</style>
