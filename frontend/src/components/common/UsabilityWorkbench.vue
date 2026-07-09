<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { toast, confirmDialog } from '../../utils/toast.js'

const emit = defineEmits(['navigate'])
const data = ref(null)
const loading = ref(true)
const refreshing = ref(false)
const requirement = ref('')
const target = ref('')
const intakeBusy = ref(false)
const confirmation = ref(null)
const actionBusy = ref('')
let timer = null

const attention = computed(() => data.value?.attention || [])
const active = computed(() => data.value?.active || [])
const completed = computed(() => data.value?.completed || [])
const resources = computed(() => data.value?.resources || { projects: [], groups: [], cron: [] })
const targetOptions = computed(() => [
  ...resources.value.groups.map(item => ({ value: `group:${item.id}`, label: `协作群 · ${item.name}` })),
  ...resources.value.projects.map(item => ({ value: `project:${item.name}`, label: `项目 · ${item.name}` })),
])

const api = async (path, body) => {
  const response = await fetch(path, body === undefined ? undefined : {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok || result.success === false) throw new Error(result.error || result.message || `请求失败 (${response.status})`)
  return result
}

const load = async (quiet = false) => {
  if (!quiet) refreshing.value = true
  try {
    data.value = await api('/api/usability/workbench')
    if (!target.value && targetOptions.value.length) target.value = targetOptions.value[0].value
  } catch (error) {
    toast.error(error.message || '工作台加载失败')
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

const createPreview = async () => {
  if (!requirement.value.trim()) return toast.warning('先用一句话说说你想完成什么')
  if (!target.value) return toast.warning('请先选择一个项目或协作群')
  intakeBusy.value = true
  try {
    const [kind, id] = target.value.split(':')
    const result = await api('/api/usability/intake/preview', {
      requirement: requirement.value.trim(),
      group_id: kind === 'group' ? id : '',
      target_project: kind === 'project' ? id : '',
    })
    confirmation.value = { ...result.task, intake: result.confirmation || result.task?.intake_draft || null }
    toast.success('执行计划已整理好，确认前不会开始')
    await load(true)
  } catch (error) { toast.error(error.message) }
  intakeBusy.value = false
}

const confirmIntake = async () => {
  if (!confirmation.value?.id) return
  intakeBusy.value = true
  try {
    const result = await api('/api/usability/intake/confirm', { task_id: confirmation.value.id })
    toast.success(result.queued ? '已确认，任务开始推进' : (result.queue_result?.message || '已确认执行'))
    requirement.value = ''
    confirmation.value = null
    await load()
  } catch (error) { toast.error(error.message) }
  intakeBusy.value = false
}

const reviseIntake = async () => {
  if (!confirmation.value?.id) return
  const feedback = window.prompt('希望我怎么调整这份执行前计划？', '')
  if (!feedback?.trim()) return
  intakeBusy.value = true
  try {
    const result = await api('/api/usability/intake/revise', { task_id: confirmation.value.id, feedback: feedback.trim() })
    confirmation.value = {
      ...result.task,
      intake: result.plan_mode || result.task?.intake_draft || confirmation.value.intake || null,
    }
    toast.success('执行前计划已调整，确认前仍不会开始')
    await load(true)
  } catch (error) { toast.error(error.message) }
  intakeBusy.value = false
}

const discardIntake = async () => {
  if (!confirmation.value?.id) return
  try {
    await api('/api/tasks/delete', { id: confirmation.value.id, reason: '用户放弃执行前确认卡' })
    confirmation.value = null
    toast.info('确认卡已放弃，没有开始执行')
    await load(true)
  } catch (error) { toast.error(error.message) }
}

const navigateTask = task => emit('navigate', { tab: 'tasks', taskId: task.id })
const navigateResource = (tab, extra = {}) => emit('navigate', { tab, ...extra })

const actionLabel = action => ({
  confirm: '确认执行', edit: '调整计划', cancel: '取消', supplement: '补充说明', resume: '恢复', retry: '重试',
  switch_executor: '切换执行器', pause: '暂停', start: '开始', view_report: '查看交付', archive: '归档', view: '查看',
})[action] || action

const runAction = async (task, action) => {
  if (['supplement', 'switch_executor', 'view_report', 'view'].includes(action)) return navigateTask(task)
  actionBusy.value = `${task.id}:${action}`
  try {
    if (action === 'confirm') {
      confirmation.value = task
      return await confirmIntake()
    }
    if (action === 'edit') {
      const feedback = window.prompt('希望我怎么调整这份执行前计划？', '')
      if (!feedback?.trim()) return
      await api('/api/usability/intake/revise', { task_id: task.id, feedback: feedback.trim() })
    }
    if (action === 'retry') await api('/api/tasks/retry', { task_id: task.id, reason: '用户从工作台重试', auto_execute: true })
    if (action === 'start') await api('/api/tasks/queue', { task_id: task.id })
    if (action === 'pause' || action === 'resume') await api('/api/tasks/bulk', { ids: [task.id], action })
    if (action === 'archive') await api('/api/tasks/delete', { id: task.id, reason: '用户从工作台归档已完成任务' })
    if (action === 'cancel') {
      const ok = await confirmDialog(`确定取消“${task.title}”吗？已产生的执行证据会保留。`)
      if (!ok) return
      await api('/api/tasks/cancel', { task_id: task.id, reason: '用户从工作台取消任务' })
    }
    toast.success(`${actionLabel(action)}操作已提交`)
    await load(true)
  } catch (error) { toast.error(error.message) }
  finally { actionBusy.value = '' }
}

const phaseMeta = phase => ({
  needs_user: ['需要你决定', 'decision'], failed: ['执行遇到问题', 'danger'], in_progress: ['正在推进', 'active'],
  queued: ['等待开始', 'queued'], recently_completed: ['刚刚完成', 'success'],
})[phase] || ['历史事项', 'muted']

const formatTime = value => {
  if (!value) return ''
  const date = new Date(value)
  return date.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

onMounted(() => {
  load()
  timer = window.setInterval(() => load(true), 15000)
})
onUnmounted(() => timer && window.clearInterval(timer))
</script>

<template>
  <div class="workbench">
    <header class="hero">
      <div>
        <span class="eyebrow">我的工作台</span>
        <h1>今天想推进什么？</h1>
        <p>说目标就够了。我会先整理范围、验收标准和风险，等你确认后再开始。</p>
      </div>
      <button class="ghost" :disabled="refreshing" @click="load()">{{ refreshing ? '刷新中…' : '刷新' }}</button>
    </header>

    <section class="intake-card">
      <textarea v-model="requirement" rows="3" placeholder="例如：给项目增加支付退款功能，前后端都要完成并跑测试" @keydown.ctrl.enter.prevent="createPreview" />
      <div class="intake-footer">
        <select v-model="target">
          <option value="" disabled>选择项目或协作群</option>
          <option v-for="item in targetOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
        </select>
        <span class="hint">Ctrl + Enter</span>
        <button class="primary" :disabled="intakeBusy || !requirement.trim()" @click="createPreview">整理执行计划</button>
      </div>
    </section>

    <section v-if="confirmation" class="confirm-card">
      <div class="confirm-head">
        <div><span class="status decision">执行前确认</span><h2>{{ confirmation.title }}</h2></div>
        <span class="safe-note">尚未开始，不会修改项目</span>
      </div>
      <div class="confirm-grid">
        <div><label>目标项目</label><strong>{{ confirmation.intake?.group_name || confirmation.intake?.project }}</strong></div>
        <div><label>影响范围</label><strong>{{ (confirmation.intake?.scope || confirmation.intake?.impact_scope?.areas || []).join('、') }}</strong></div>
        <div class="wide"><label>验收标准</label><p>{{ Array.isArray(confirmation.intake?.acceptance) ? confirmation.intake.acceptance.join('；') : confirmation.intake?.acceptance }}</p></div>
        <div class="wide"><label>主要风险</label><p>{{ (confirmation.intake?.risks || confirmation.intake?.risk?.reasons || [confirmation.intake?.risk?.summary]).filter(Boolean).join('；') }}</p></div>
        <div v-if="confirmation.intake?.clarification_questions?.length" class="wide">
          <label>需要确认</label>
          <p v-for="item in confirmation.intake.clarification_questions.slice(0, 4)" :key="item.id || item.question">{{ item.question }}</p>
        </div>
      </div>
      <details><summary>技术记录</summary><code>Task {{ confirmation.id }} · Trace {{ confirmation.trace_id }}</code></details>
      <div class="confirm-actions">
        <button class="ghost" :disabled="intakeBusy" @click="reviseIntake">调整计划</button>
        <button class="ghost danger-text" @click="discardIntake">放弃</button>
        <button class="primary" :disabled="intakeBusy" @click="confirmIntake">确认并开始</button>
      </div>
    </section>

    <div v-if="loading" class="empty">正在整理今天的工作…</div>
    <template v-else>
      <section v-if="attention.length" class="section-block">
        <div class="section-title"><div><span class="eyebrow warn">优先处理</span><h2>有 {{ attention.length }} 件事需要你</h2></div></div>
        <div class="task-list">
          <article v-for="task in attention" :key="task.id" class="task-card" :class="task.phase">
            <div class="task-main">
              <span class="status" :class="phaseMeta(task.phase)[1]">{{ phaseMeta(task.phase)[0] }}</span>
              <h3>{{ task.title }}</h3><p>{{ task.reason }}</p>
              <small>{{ task.intake?.group_name || task.target_project || '协作任务' }} · {{ formatTime(task.updated_at) }}</small>
            </div>
            <div class="task-actions"><button v-for="action in task.actions.slice(0, 3)" :key="action" :class="action === 'retry' || action === 'confirm' ? 'primary small' : 'ghost small'" :disabled="actionBusy === `${task.id}:${action}`" @click="runAction(task, action)">{{ actionLabel(action) }}</button></div>
          </article>
        </div>
      </section>

      <section class="section-block">
        <div class="section-title"><div><span class="eyebrow">当前进展</span><h2>正在推进</h2></div><button class="text-btn" @click="navigateResource('tasks')">查看全部任务 →</button></div>
        <div v-if="active.length" class="task-grid">
          <article v-for="task in active.slice(0, 6)" :key="task.id" class="task-card compact">
            <span class="status" :class="phaseMeta(task.phase)[1]">{{ phaseMeta(task.phase)[0] }}</span><h3>{{ task.title }}</h3><p>{{ task.reason }}</p>
            <div class="task-bottom"><small>{{ formatTime(task.updated_at) }}</small><button class="text-btn" @click="navigateTask(task)">查看进度</button></div>
          </article>
        </div>
        <div v-else class="empty compact-empty">现在没有任务在运行。上面说一句目标，就可以开始。</div>
      </section>

      <section v-if="completed.length" class="section-block">
        <div class="section-title"><div><span class="eyebrow success-text">交付</span><h2>刚刚完成</h2></div></div>
        <div class="completed-list">
          <button v-for="task in completed.slice(0, 5)" :key="task.id" @click="navigateTask(task)">
            <span>✓</span><div><strong>{{ task.title }}</strong><small>{{ task.delivery.files_changed }} 个文件 · {{ task.delivery.verification_count }} 项验证</small></div><time>{{ formatTime(task.updated_at) }}</time>
          </button>
        </div>
      </section>

      <section class="resources">
        <button @click="navigateResource('projects')"><span>项目</span><strong>{{ resources.projects.length }}</strong><small>{{ resources.projects.filter(p => p.running).length }} 个正在运行</small></button>
        <button @click="navigateResource('groups')"><span>协作群</span><strong>{{ resources.groups.length }}</strong><small>多 Agent 协作入口</small></button>
        <button @click="navigateResource('cron')"><span>定时任务</span><strong>{{ resources.cron.length }}</strong><small>{{ resources.cron.filter(c => c.enabled).length }} 个已启用</small></button>
      </section>

      <details class="technical"><summary>系统与技术详情</summary><p>工作台每 15 秒同步一次。完成或取消超过 {{ data.archive?.retention_days || 30 }} 天的任务会自动归档；内部协议、原始结果说明和 Trace 默认不打扰日常使用。</p></details>
    </template>
  </div>
</template>

<style scoped>
.workbench{box-sizing:border-box;max-width:1180px;min-height:100%;margin:0 auto;padding:28px 28px 60px;color:var(--text-primary,#172033)}
.hero,.section-title,.confirm-head,.intake-footer,.task-bottom,.confirm-actions{display:flex;align-items:center;justify-content:space-between;gap:16px}
.hero{padding:10px 0 22px}.hero h1{font-size:34px;margin:5px 0 8px;letter-spacing:-.03em}.hero p{margin:0;color:var(--text-secondary,#667085)}
.eyebrow{font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#4f6fff}.eyebrow.warn{color:#b54708}.success-text{color:#067647}
.intake-card,.confirm-card,.task-card,.resources button,.technical{background:var(--bg-card,#fff);border:1px solid var(--border-color,#e5e9f2);border-radius:18px;box-shadow:0 10px 35px rgba(31,42,68,.06)}
.intake-card{padding:18px}.intake-card textarea{width:100%;box-sizing:border-box;border:0;resize:vertical;background:transparent;color:inherit;font:500 17px/1.65 inherit;outline:0}.intake-footer{border-top:1px solid var(--border-color,#edf0f5);padding-top:12px}.intake-footer select{border:0;background:var(--bg-secondary,#f5f7fb);color:inherit;padding:9px 12px;border-radius:10px;max-width:330px}.hint{margin-left:auto;color:#98a2b3;font-size:12px}
button{font:inherit;cursor:pointer}.primary,.ghost{border-radius:10px;padding:10px 16px;font-weight:700}.primary{border:1px solid #4f6fff;background:#4f6fff;color:white}.primary:disabled,.ghost:disabled{opacity:.5;cursor:not-allowed}.ghost{border:1px solid var(--border-color,#dfe4ec);background:var(--bg-card,#fff);color:inherit}.small{padding:7px 11px;font-size:13px}.danger-text{color:#b42318}
.confirm-card{margin-top:18px;padding:20px;border-color:#b9c6ff;background:linear-gradient(135deg,rgba(79,111,255,.06),rgba(255,255,255,.02))}.confirm-head h2{margin:8px 0 0;font-size:20px}.safe-note{font-size:13px;color:#067647}.confirm-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:18px 0}.confirm-grid>div{background:var(--bg-secondary,#f7f8fb);border-radius:12px;padding:13px}.confirm-grid .wide{grid-column:1/-1}.confirm-grid label{display:block;color:#7a8496;font-size:12px;margin-bottom:5px}.confirm-grid p{margin:0;line-height:1.55}.confirm-card details{font-size:12px;color:#7a8496}.confirm-actions{justify-content:flex-end;margin-top:16px}
.section-block{margin-top:34px}.section-title{margin-bottom:14px}.section-title h2{margin:4px 0 0;font-size:22px}.task-list{display:flex;flex-direction:column;gap:10px}.task-card{padding:17px 18px;display:flex;justify-content:space-between;gap:20px}.task-card.needs_user{border-left:4px solid #f79009}.task-card.failed{border-left:4px solid #f04438}.task-main h3,.task-card.compact h3{margin:8px 0 6px;font-size:17px}.task-main p,.task-card.compact p{margin:0 0 8px;color:var(--text-secondary,#667085);line-height:1.5}.task-main small,.task-card small{color:#98a2b3}.task-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end}.status{display:inline-flex;border-radius:999px;padding:4px 8px;font-size:12px;font-weight:800}.status.decision{background:#fff3e0;color:#b54708}.status.danger{background:#fee4e2;color:#b42318}.status.active{background:#e8edff;color:#3e5bd9}.status.queued{background:#f2f4f7;color:#475467}.status.success{background:#dcfae6;color:#067647}
.task-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.task-card.compact{display:block}.text-btn{border:0;background:transparent;color:#4f6fff;padding:4px;font-weight:700}.completed-list{border:1px solid var(--border-color,#e5e9f2);border-radius:16px;overflow:hidden}.completed-list button{width:100%;display:grid;grid-template-columns:28px 1fr auto;align-items:center;text-align:left;gap:10px;padding:14px 16px;border:0;border-bottom:1px solid var(--border-color,#edf0f5);background:var(--bg-card,#fff);color:inherit}.completed-list button:last-child{border-bottom:0}.completed-list button>span{color:#12b76a;font-weight:900}.completed-list small{display:block;color:#98a2b3;margin-top:3px}.completed-list time{font-size:12px;color:#98a2b3}
.resources{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:30px}.resources button{text-align:left;padding:17px;color:inherit}.resources span,.resources small{display:block;color:#7a8496}.resources strong{display:block;font-size:28px;margin:5px 0}.technical{margin-top:14px;padding:14px 17px;color:#667085;font-size:13px}.technical p{margin:12px 0 0;line-height:1.6}.empty{padding:45px;text-align:center;color:#7a8496}.compact-empty{border:1px dashed var(--border-color,#dfe4ec);border-radius:14px;padding:25px}
@media(max-width:760px){.workbench{padding:18px 14px 40px}.hero{align-items:flex-start}.hero h1{font-size:27px}.intake-footer{flex-wrap:wrap}.intake-footer select{width:100%;max-width:none}.hint{display:none}.confirm-grid,.task-grid,.resources{grid-template-columns:1fr}.task-card{display:block}.task-actions{justify-content:flex-start;margin-top:14px}.completed-list button{grid-template-columns:24px 1fr}.completed-list time{display:none}}
</style>
