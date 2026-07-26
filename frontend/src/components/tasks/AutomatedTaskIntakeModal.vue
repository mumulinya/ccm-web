<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { FileText, Layers3, Paperclip, Sparkles, X } from '@lucide/vue'
import { groupsApi, sessionsApi } from '../../api/index.js'
import AttachmentChips from '../common/AttachmentChips.vue'
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
const fileInput = ref(null)
const busy = ref(false)
const preview = ref(null)

const targetId = computed(() => targetType.value === 'group' ? groupId.value : projectId.value)
const targetLabel = computed(() => {
  if (targetType.value === 'group') return props.groups.find(item => item.id === groupId.value)?.name || groupId.value
  return props.projects.find(item => item.name === projectId.value)?.display_name || projectId.value
})
const planItems = computed(() => preview.value?.intake?.decomposition_plan?.items || preview.value?.decomposition_plan?.items || [])

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

const request = async (path, body) => {
  const response = await fetch(path, body instanceof FormData
    ? { method: 'POST', body }
    : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const data = await response.json().catch(() => ({}))
  if (!response.ok || data.success === false) throw new Error(data.error || `请求失败 (${response.status})`)
  return data
}

const createPreview = async () => {
  if (!requirement.value.trim() && !files.value.length) return toast.warning('请描述业务目标或添加需求资料')
  if (!targetId.value) return toast.warning('请选择执行群聊或项目')
  busy.value = true
  try {
    const form = new FormData()
    form.append('title', title.value.trim())
    form.append('requirement', requirement.value.trim())
    form.append('priority', priority.value)
    form.append('source', 'task-dispatch')
    form.append('request_origin', 'task-dispatch')
    form.append('queue_scope', 'conversation_serial')
    form.append('channel', 'web')
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
  busy.value = true
  try {
    const data = await request('/api/usability/intake/confirm', { task_id: preview.value.id })
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
        <div class="plan-items">
          <article v-for="(item, index) in planItems" :key="item.item_key || index"><span>{{ index + 1 }}</span><div><strong>{{ item.title }}</strong><p>{{ item.business_goal }}</p><small>依赖：{{ item.depends_on?.length ? item.depends_on.join('、') : '无' }}</small></div></article>
          <article v-if="!planItems.length"><span>1</span><div><strong>{{ preview.title }}</strong><p>{{ preview.business_goal || preview.description }}</p></div></article>
        </div>
        <div class="replay-note"><FileText :size="16" /><span>确认后，每个任务的规划、开发、TestAgent、返工和最终验收都会进入任务回放。</span></div>
      </div>

      <footer>
        <button v-if="preview" class="secondary" :disabled="busy" @click="preview = null">返回调整</button>
        <button v-else class="secondary" @click="emit('close')">取消</button>
        <button class="primary" :disabled="busy" @click="preview ? confirmAndQueue() : createPreview()"><Sparkles :size="16" />{{ busy ? '处理中' : preview ? '确认并自动执行' : '让模型整理任务' }}</button>
      </footer>
    </section>
  </div>
</template>

<style scoped>
.automated-intake-overlay{z-index:1100}.automated-intake-modal{width:min(880px,calc(100vw - 32px));max-height:min(860px,calc(100vh - 32px));display:flex;flex-direction:column;overflow:hidden;border:1px solid var(--border-color);border-radius:8px;background:var(--surface);box-shadow:0 24px 70px rgba(15,23,42,.24)}
header{display:flex;align-items:center;gap:12px;padding:17px 19px;border-bottom:1px solid var(--border-color)}header>div{min-width:0;flex:1}header h3{margin:0;color:var(--text-primary);font-size:16px;letter-spacing:0}header p{margin:4px 0 0;color:var(--text-muted);font-size:11px}.modal-icon{width:36px;height:36px;display:grid;place-items:center;border-radius:7px;background:color-mix(in srgb,var(--accent-blue) 10%,var(--surface));color:var(--accent-blue)}.icon-close{width:34px;height:34px;display:grid;place-items:center;border:1px solid var(--border-color);border-radius:7px;background:var(--surface);color:var(--text-muted);cursor:pointer}
.intake-form,.plan-preview{min-height:0;overflow:auto;padding:18px 20px}.target-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px}.target-grid label,.field{display:grid;gap:6px}.target-grid span,.field>span{color:var(--text-secondary);font-size:11px;font-weight:750}.field{margin-top:13px}.field small{color:var(--text-muted);font-weight:500}.target-grid select,.field input,.field textarea{width:100%;min-width:0;border:1px solid var(--border-color);border-radius:7px;background:var(--surface);color:var(--text-primary);font:inherit;outline:none}.target-grid select,.field input{height:38px;padding:0 10px}.field textarea{padding:10px 11px;line-height:1.6;resize:vertical}.target-grid select:focus,.field input:focus,.field textarea:focus{border-color:var(--accent-blue);box-shadow:0 0 0 3px color-mix(in srgb,var(--accent-blue) 12%,transparent)}
.attachment-row{display:flex;align-items:center;gap:10px;margin-top:10px}.attachment-row span{color:var(--text-muted);font-size:10px}.primary,.secondary{min-height:38px;display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:0 13px;border-radius:7px;font-size:12px;font-weight:750;cursor:pointer}.primary{border:1px solid var(--accent-blue);background:var(--accent-blue);color:#fff}.secondary{border:1px solid var(--border-color);background:var(--surface);color:var(--text-secondary)}button:disabled{cursor:not-allowed;opacity:.55}
.plan-summary{display:flex;gap:11px;padding:14px;border:1px solid var(--border-color);border-radius:8px;background:var(--panel-muted)}.plan-summary>span{color:var(--accent-blue)}.plan-summary strong{color:var(--text-primary);font-size:14px}.plan-summary p{margin:5px 0 0;color:var(--text-secondary);font-size:11px;line-height:1.55}.plan-facts{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));margin:13px 0;border:1px solid var(--border-color);border-radius:8px;overflow:hidden}.plan-facts span{display:grid;gap:4px;padding:10px;border-right:1px solid var(--border-color);color:var(--text-muted);font-size:9.5px}.plan-facts span:last-child{border-right:0}.plan-facts strong{overflow:hidden;color:var(--text-primary);font-size:11px;text-overflow:ellipsis;white-space:nowrap}.plan-items{display:grid;gap:7px}.plan-items article{display:flex;gap:10px;padding:11px;border:1px solid var(--border-color);border-radius:7px}.plan-items article>span{flex:0 0 auto;width:24px;height:24px;display:grid;place-items:center;border-radius:6px;background:var(--panel-muted);color:var(--accent-blue);font-size:10px;font-weight:800}.plan-items article div{min-width:0}.plan-items strong{color:var(--text-primary);font-size:12px}.plan-items p{margin:4px 0;color:var(--text-secondary);font-size:10.5px;line-height:1.5}.plan-items small{color:var(--text-muted);font-size:9.5px}.replay-note{display:flex;align-items:center;gap:8px;margin-top:12px;padding:10px;border-left:3px solid var(--accent-green);background:color-mix(in srgb,var(--accent-green) 7%,var(--surface));color:var(--text-secondary);font-size:10.5px}
footer{display:flex;justify-content:flex-end;gap:8px;padding:13px 19px;border-top:1px solid var(--border-color);background:var(--panel-muted)}
@media(max-width:680px){.automated-intake-modal{width:100vw;height:100vh;max-height:none;border:0;border-radius:0}.target-grid,.plan-facts{grid-template-columns:1fr}.plan-facts span{border-right:0;border-bottom:1px solid var(--border-color)}.plan-facts span:last-child{border-bottom:0}.attachment-row{align-items:flex-start;flex-direction:column}footer .primary{flex:1}}
</style>
