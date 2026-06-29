<script setup>
import { computed, onMounted, ref } from 'vue'
import { groupsApi } from '../api/index.js'
import { toast } from '../utils/toast.js'

const loading = ref(false)
const actionLoading = ref(false)
const overview = ref(null)
const groups = ref([])
const selectedReportId = ref('')
const setup = ref({ groupId: '', time: '09:30', batch: 3 })
const notification = ref({ daily_enabled: false, daily_time: '18:30', weekly_enabled: false, weekly_day: 5, weekly_time: '18:40', retry_limit: 3, retry_interval_minutes: 10, history: [] })
const feishu = ref({ notification_ready: false, webhook_ready: false })
const weeklyReports = ref([])

const dailyDevPrompt = `请按日常开发主 Agent 工作流执行：
1. 扫描群聊共享文档和需求池，优先处理 ready 业务需求。
2. 主 Agent 先生成计划，再派发给对应项目子 Agent。
3. 子 Agent 返回 CCM_AGENT_RECEIPT，包含文件、验证、阻塞点。
4. 主 Agent 复盘缺口，能续跑就续跑，不能续跑就说明需要用户补充的信息。
5. 最终报告必须包含完成内容、涉及文件、验证结果、风险和下一步。`

const report = computed(() => {
  if (!overview.value) return null
  if (!selectedReportId.value) return overview.value.today
  return (overview.value.reports || []).find(item => item.id === selectedReportId.value) || overview.value.today
})
const jobs = computed(() => overview.value?.daily_dev_jobs || [])
const weeklyReport = computed(() => weeklyReports.value[0] || null)
const notificationHistory = computed(() => [...(notification.value.history || [])].reverse().slice(0, 4))
const reports = computed(() => overview.value?.reports || [])
const summary = computed(() => report.value?.summary || {})
const backlog = computed(() => overview.value?.backlog || report.value?.backlog || { counts: {}, total: 0 })

const readResponse = async (res) => {
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data.error) throw new Error(data.error || data.message || `HTTP ${res.status}`)
  return data
}

const loadGroups = async () => {
  const data = await groupsApi.list()
  groups.value = data.groups || []
  if (!setup.value.groupId && groups.value.length) setup.value.groupId = groups.value[0].id
}

const loadOverview = async () => {
  loading.value = true
  try {
    const data = await readResponse(await fetch('/api/auto-dev/overview'))
    overview.value = data
    notification.value = { ...notification.value, ...(data.notification || {}) }
    weeklyReports.value = data.weekly_reports || []
    if (!selectedReportId.value && data.today?.id) selectedReportId.value = data.today.id
  } catch (e) {
    toast.error(e.message || '加载自动开发状态失败')
  } finally {
    loading.value = false
  }
}

const loadFeishuStatus = async () => {
  try {
    const data = await readResponse(await fetch('/api/feishu/config'))
    feishu.value = data.config || {}
  } catch {
    feishu.value = { notification_ready: false, webhook_ready: false }
  }
}

const saveNotification = async () => {
  actionLoading.value = true
  try {
    const data = await readResponse(await fetch('/api/auto-dev/notification/config', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(notification.value)
    }))
    notification.value = data.config
    toast.success('飞书通知计划已保存')
  } catch (e) {
    toast.error(e.message || '保存通知计划失败')
  } finally {
    actionLoading.value = false
  }
}

const generateWeeklyReport = async () => {
  actionLoading.value = true
  try {
    const data = await readResponse(await fetch('/api/auto-dev/weekly-report/generate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({})
    }))
    weeklyReports.value = data.reports || [data.report]
    toast.success('本周开发周报已生成')
  } catch (e) {
    toast.error(e.message || '生成周报失败')
  } finally {
    actionLoading.value = false
  }
}

const sendNotification = async (kind) => {
  if (!feishu.value.notification_ready) {
    toast.warning('请先在系统设置中配置飞书群机器人 Webhook')
    return
  }
  actionLoading.value = true
  try {
    const data = await readResponse(await fetch('/api/auto-dev/notification/send', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind })
    }))
    notification.value = data.config || notification.value
    if (kind === 'weekly' && data.report) weeklyReports.value = [data.report, ...weeklyReports.value.filter(item => item.id !== data.report.id)]
    toast.success(kind === 'weekly' ? '周报通知已发送' : '今日日报通知已发送')
  } catch (e) {
    toast.error(e.message || '飞书通知发送失败')
  } finally {
    actionLoading.value = false
  }
}
const generateReport = async () => {
  actionLoading.value = true
  try {
    const data = await readResponse(await fetch('/api/auto-dev/report/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: report.value?.date })
    }))
    overview.value = { ...(overview.value || {}), today: data.report, reports: data.reports || [] }
    selectedReportId.value = data.report.id
    toast.success('开发日报已生成')
  } catch (e) {
    toast.error(e.message || '生成开发日报失败')
  } finally {
    actionLoading.value = false
  }
}

const runJob = async (job) => {
  actionLoading.value = true
  try {
    const data = await readResponse(await fetch('/api/cron/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: job.id })
    }))
    toast.success(data.message || '已触发自动开发任务')
    await loadOverview()
  } catch (e) {
    toast.error(e.message || '触发失败')
  } finally {
    actionLoading.value = false
  }
}

const toggleJob = async (job, enabled) => {
  try {
    await readResponse(await fetch('/api/cron/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: job.id, enabled })
    }))
    await loadOverview()
  } catch (e) {
    toast.error(e.message || '更新定时任务失败')
  }
}

const scheduleFromTime = (time) => {
  const [hourRaw, minuteRaw] = String(time || '09:30').split(':')
  const hour = Math.max(0, Math.min(23, Number(hourRaw) || 9))
  const minute = Math.max(0, Math.min(59, Number(minuteRaw) || 30))
  return `${minute} ${hour} * * *`
}

const createDailyJob = async () => {
  if (!setup.value.groupId) {
    toast.warning('请选择群聊')
    return
  }
  actionLoading.value = true
  try {
    await readResponse(await fetch('/api/cron/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: '每日自动开发接活与复盘',
        target_type: 'group',
        group_id: setup.value.groupId,
        schedule: scheduleFromTime(setup.value.time),
        priority: 'normal',
        workflow_type: 'daily_dev',
        requires_code_changes: true,
        backlog_batch_limit: Math.max(1, Math.min(20, Number(setup.value.batch || 3))),
        import_shared_docs: true,
        continue_gaps: true,
        gap_continue_limit: Math.max(1, Math.min(20, Number(setup.value.batch || 3))),
        prompt: dailyDevPrompt
      })
    }))
    toast.success('每日自动开发任务已创建')
    await loadOverview()
  } catch (e) {
    toast.error(e.message || '创建失败')
  } finally {
    actionLoading.value = false
  }
}

const formatTime = (value) => value ? new Date(value).toLocaleString('zh-CN') : '未记录'
const formatShortTime = (value) => value ? new Date(value).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '未记录'
const statusLabel = (status) => ({
  never: '未执行', running: '触发中', running_task: '执行中', queued: '已入队', waiting: '等待', skipped: '跳过', done: '完成', failed: '失败'
}[status || 'never'] || status)
const groupName = (id) => groups.value.find(group => group.id === id)?.name || id || '未绑定群聊'

onMounted(async () => {
  await loadGroups()
  await Promise.all([loadOverview(), loadFeishuStatus()])
})
</script>

<template>
  <div class="auto-dev-page">
    <header class="auto-dev-head">
      <div>
        <h3>自动开发与日报</h3>
        <p>记录全天开发工作；定时接活只是可选的无人值守能力</p>
      </div>
      <div class="head-actions">
        <button class="btn btn-outline" :disabled="loading" @click="loadOverview">刷新</button>
        <button class="btn btn-primary" :disabled="actionLoading" @click="generateReport">生成今日日报</button>
      </div>
    </header>

    <section class="metric-grid">
      <div><span>今日开发活动</span><strong>{{ summary.total_activities || 0 }}</strong></div>
      <div><span>任务记录</span><strong>{{ summary.touched_tasks || 0 }}</strong></div>
      <div><span>文档派活</span><strong>{{ summary.document_requests || 0 }}</strong></div>
      <div><span>群聊指令</span><strong>{{ summary.group_chat_requests || 0 }}</strong></div>
      <div><span>项目对话</span><strong>{{ summary.project_chat_requests || 0 }}</strong></div>
      <div><span>完成</span><strong>{{ summary.done_tasks || 0 }}</strong></div>
      <div><span>代码变更</span><strong>{{ summary.file_changes || 0 }}</strong></div>
      <div><span>验证</span><strong>{{ summary.verifications || 0 }}</strong></div>
    </section>

    <section class="ops-layout">
      <div class="ops-main">
        <section class="panel">
          <div class="panel-title">
            <div>
              <strong>开发日报</strong>
              <span>{{ report?.date || '今日' }} · {{ formatTime(report?.generated_at) }}</span>
            </div>
            <select v-model="selectedReportId">
              <option v-for="item in reports" :key="item.id" :value="item.id">{{ item.date }}</option>
            </select>
          </div>
          <pre class="report-content">{{ report?.markdown || '暂无开发日报' }}</pre>
        </section>

        <section class="panel">
          <div class="panel-title">
            <div>
              <strong>本周开发周报</strong>
              <span>{{ weeklyReport ? `${weeklyReport.start_date} 至 ${weeklyReport.end_date}` : '尚未生成' }}</span>
            </div>
            <button class="btn btn-outline btn-sm" :disabled="actionLoading" @click="generateWeeklyReport">生成周报</button>
          </div>
          <pre class="report-content weekly">{{ weeklyReport?.markdown || '生成后将汇总本周业务、代码修改、验证、风险和下周计划' }}</pre>
        </section>

        <section class="panel">
          <div class="panel-title compact"><strong>今日开发活动明细</strong></div>
          <div v-if="!report?.activities?.length" class="empty-line">今天还没有识别到开发任务或开发对话</div>
          <div v-else class="item-list">
            <div v-for="item in report.activities" :key="item.id" class="line-item">
              <strong>{{ item.source_label }} · {{ item.location }} · {{ item.status_label }}</strong>
              <span>{{ item.title }}</span>
            </div>
          </div>
        </section>

        <section class="panel">
          <div class="panel-title compact"><strong>今日阻塞与续跑</strong></div>
          <div v-if="!report?.blockers?.length" class="empty-line">暂无阻塞任务</div>
          <div v-else class="item-list">
            <div v-for="item in report.blockers" :key="item.id" class="line-item warn">
              <strong>{{ item.title }}</strong>
              <span>{{ item.reason }}</span>
            </div>
          </div>
        </section>
      </div>

      <aside class="ops-side">
        <section class="panel notify-panel">
          <div class="panel-title compact"><strong>飞书群通知</strong></div>
          <div :class="['notify-target', feishu.notification_ready ? 'ready' : 'missing']">
            <strong>{{ feishu.notification_ready ? '通知到飞书群机器人' : '尚未配置飞书通知' }}</strong>
            <span>{{ feishu.notification_ready ? '日报、周报和任务状态会发送到机器人所在群' : '请先到系统设置配置飞书群机器人 Webhook' }}</span>
          </div>
          <label class="notify-row">
            <span><input v-model="notification.daily_enabled" type="checkbox"> 每日自动通知</span>
            <input v-model="notification.daily_time" type="time">
          </label>
          <label class="notify-row weekly-row">
            <span><input v-model="notification.weekly_enabled" type="checkbox"> 每周自动通知</span>
            <select v-model.number="notification.weekly_day">
              <option :value="1">周一</option><option :value="2">周二</option><option :value="3">周三</option>
              <option :value="4">周四</option><option :value="5">周五</option><option :value="6">周六</option><option :value="0">周日</option>
            </select>
            <input v-model="notification.weekly_time" type="time">
          </label>
          <div class="notify-actions">
            <button class="btn btn-primary" :disabled="actionLoading" @click="saveNotification">保存计划</button>
            <button class="btn btn-outline" :disabled="actionLoading || !feishu.notification_ready" @click="sendNotification('daily')">通知今日日报</button>
            <button class="btn btn-outline" :disabled="actionLoading || !feishu.notification_ready" @click="sendNotification('weekly')">通知本周周报</button>
          </div>
          <div class="notify-status">
            <span>日报：{{ notification.last_daily_result || '尚未发送' }}</span>
            <span>周报：{{ notification.last_weekly_result || '尚未发送' }}</span>
            <span>发送失败后每 {{ notification.retry_interval_minutes }} 分钟重试，最多 {{ notification.retry_limit }} 次</span>
          </div>
          <div v-if="notificationHistory.length" class="notify-history">
            <div v-for="item in notificationHistory" :key="item.id">
              <strong>{{ item.kind === 'weekly' ? '周报' : '日报' }} · {{ item.success ? '成功' : '失败' }}</strong>
              <span>{{ formatShortTime(item.attempted_at) }} · {{ item.result }}</span>
            </div>
          </div>
        </section>

        <section class="panel setup-panel">
          <div class="panel-title compact"><strong>每日接活任务</strong></div>
          <div class="setup-grid">
            <label>
              <span>群聊</span>
              <select v-model="setup.groupId">
                <option v-for="group in groups" :key="group.id" :value="group.id">{{ group.name || group.id }}</option>
              </select>
            </label>
            <label>
              <span>时间</span>
              <input v-model="setup.time" type="time">
            </label>
            <label>
              <span>批量数</span>
              <input v-model.number="setup.batch" type="number" min="1" max="20">
            </label>
          </div>
          <button class="btn btn-primary wide" :disabled="actionLoading || !groups.length" @click="createDailyJob">创建每日接活</button>
        </section>

        <section class="panel">
          <div class="panel-title compact"><strong>需求池</strong></div>
          <div class="backlog-chips">
            <span>总数 {{ backlog.total || 0 }}</span>
            <span>可接活 {{ backlog.counts?.ready || 0 }}</span>
            <span>待补充 {{ backlog.counts?.needs_user || 0 }}</span>
            <span>阻塞 {{ backlog.counts?.blocked || 0 }}</span>
            <span>完成 {{ backlog.counts?.done || 0 }}</span>
          </div>
        </section>

        <section class="panel">
          <div class="panel-title compact"><strong>调度任务</strong></div>
          <div v-if="!jobs.length" class="empty-line">暂无日常开发定时任务</div>
          <div v-else class="job-list">
            <article v-for="job in jobs" :key="job.id" class="job-card">
              <div class="job-top">
                <strong>{{ job.name }}</strong>
                <label class="switch"><input type="checkbox" :checked="job.enabled" @change="toggleJob(job, $event.target.checked)"><span>{{ job.enabled ? '启用' : '停用' }}</span></label>
              </div>
              <div class="job-meta">
                <span>{{ groupName(job.group_id) }}</span>
                <span>{{ job.schedule }}</span>
                <span>下次 {{ formatShortTime(job.next_run) }}</span>
                <span :class="['job-status', job.last_status || 'never']">{{ statusLabel(job.last_status) }}</span>
              </div>
              <div class="job-result">{{ job.last_result || '暂无运行记录' }}</div>
              <button class="btn btn-outline btn-sm" :disabled="actionLoading" @click="runJob(job)">立即运行</button>
            </article>
          </div>
        </section>
      </aside>
    </section>
  </div>
</template>

<style scoped>
.auto-dev-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: transparent;
}

/* 顶部信息栏 */
.auto-dev-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
  background: var(--surface-nav);
}

.auto-dev-head h3 {
  margin: 0;
  font-size: 18px;
  color: var(--text-primary);
  font-weight: 700;
}

.auto-dev-head p {
  margin: 4px 0 0;
  color: var(--text-muted);
  font-size: 12px;
}

.head-actions {
  display: flex;
  gap: 8px;
}

/* 统计卡片网格 */
.metric-grid {
  display: grid;
  grid-template-columns: repeat(8, minmax(0, 1fr));
  gap: 10px;
  padding: 14px 20px;
}

.metric-grid > div {
  min-width: 0;
  padding: 12px 14px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--surface);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.metric-grid > div:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.metric-grid span {
  display: block;
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 600;
}

.metric-grid strong {
  display: block;
  margin-top: 6px;
  color: var(--text-primary);
  font-size: 22px;
  font-weight: 700;
}

/* 主体布局 */
.ops-layout {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 14px;
  padding: 0 20px 18px;
  overflow: hidden;
}

.ops-main, .ops-side {
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 通用面板 */
.panel {
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: var(--surface);
  padding: 14px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.02);
  transition: box-shadow 0.2s ease;
}

.panel:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
}

.panel-title {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.panel-title.compact {
  margin-bottom: 8px;
}

.panel-title strong {
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 600;
}

.panel-title span {
  display: block;
  margin-top: 4px;
  color: var(--text-muted);
  font-size: 11.5px;
}

.panel-title select {
  max-width: 140px;
}

/* 报告内容区 */
.report-content {
  margin: 0;
  min-height: 360px;
  max-height: 58vh;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.65;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 14px;
  font-family: monospace;
}

.report-content.weekly {
  min-height: 220px;
  max-height: 42vh;
}

/* 通知配置相关 */
.notify-target {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px;
  margin-bottom: 12px;
  border-radius: 8px;
  border: 1px solid transparent;
}

.notify-target.ready {
  background: rgba(34, 197, 94, 0.08);
  border-color: rgba(34, 197, 94, 0.2);
}

.notify-target.missing {
  background: rgba(234, 179, 8, 0.08);
  border-color: rgba(234, 179, 8, 0.2);
}

.notify-target strong {
  color: var(--text-primary);
  font-size: 13px;
}

.notify-target span {
  color: var(--text-muted);
  font-size: 11.5px;
}

.notify-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 104px;
  gap: 8px;
  align-items: center;
  margin-top: 10px;
}

.notify-row.weekly-row {
  grid-template-columns: minmax(0, 1fr) 76px 104px;
}

.notify-row > span {
  color: var(--text-secondary);
  font-size: 12px;
}

.notify-row input[type="checkbox"] {
  width: auto;
  margin-right: 6px;
  accent-color: var(--accent-blue);
  cursor: pointer;
}

.notify-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 12px;
}

.notify-actions .btn:first-child {
  grid-column: 1 / -1;
}

.notify-status {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 10px;
  color: var(--text-muted);
  font-size: 11px;
}

.notify-history {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--border-color);
}

.notify-history > div {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 11px;
}

.notify-history strong {
  color: var(--text-secondary);
}

.notify-history span {
  color: var(--text-muted);
  text-align: right;
  overflow-wrap: anywhere;
}

/* 列表项通用 */
.item-list, .job-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.line-item {
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  transition: transform 0.15s ease;
}

.line-item:hover {
  transform: translateX(2px);
  background: var(--bg-secondary);
}

.line-item.warn {
  background: rgba(234, 179, 8, 0.06);
  border-color: rgba(234, 179, 8, 0.2);
}

.line-item strong, .line-item span {
  display: block;
  overflow-wrap: anywhere;
}

.line-item strong {
  color: var(--text-primary);
  font-size: 13px;
}

.line-item span {
  margin-top: 4px;
  color: var(--text-secondary);
  font-size: 11.5px;
  line-height: 1.5;
}

/* 表单输入区 */
.setup-grid {
  display: grid;
  grid-template-columns: 1fr 92px 74px;
  gap: 10px;
}

.setup-grid label {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.setup-grid span {
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 600;
}

input, select {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 12px;
  outline: none;
  transition: all 0.2s;
}

input:focus, select:focus {
  border-color: var(--accent-blue);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

.wide {
  width: 100%;
  margin-top: 12px;
}

/* 标签筹码 */
.backlog-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.backlog-chips span {
  padding: 4px 10px;
  border-radius: 6px;
  background: rgba(59, 130, 246, 0.1);
  color: var(--accent-blue);
  font-size: 11.5px;
  font-weight: 600;
}

/* Job 卡片 */
.job-card {
  padding: 12px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  transition: all 0.2s ease;
}

.job-card:hover {
  border-color: rgba(59, 130, 246, 0.3);
  transform: translateY(-1px);
}

.job-top {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
}

.job-top strong {
  min-width: 0;
  color: var(--text-primary);
  font-size: 13px;
  overflow-wrap: anywhere;
}

.switch {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--text-muted);
  font-size: 11.5px;
  cursor: pointer;
}

.switch input {
  width: auto;
  accent-color: var(--accent-blue);
  cursor: pointer;
}

.job-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 10px 0;
}

.job-meta span {
  padding: 3px 8px;
  border-radius: 6px;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  font-size: 11px;
  border: 1px solid var(--border-color);
}

.job-status.queued, .job-status.done {
  color: var(--accent-green, #10b981);
  background: rgba(16, 185, 129, 0.1);
  border-color: rgba(16, 185, 129, 0.2) !important;
}

.job-status.waiting, .job-status.failed {
  color: var(--accent-orange, #d97706);
  background: rgba(245, 158, 11, 0.1);
  border-color: rgba(245, 158, 11, 0.2) !important;
}

.job-result {
  margin-bottom: 10px;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.empty-line {
  color: var(--text-muted);
  font-size: 12px;
  padding: 12px;
  text-align: center;
  border-radius: 8px;
  background: var(--bg-primary);
  border: 1px dashed var(--border-color);
}

/* 按钮通用 */
.btn {
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid transparent;
  cursor: pointer;
  font-size: 12.5px;
  white-space: nowrap;
  font-weight: 600;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none !important;
  box-shadow: none !important;
}

.btn-primary {
  color: white;
  background: var(--gradient-blue);
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.2);
}

.btn-primary:not(:disabled):hover {
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  opacity: 0.95;
}

.btn-outline {
  color: var(--accent-blue);
  background: rgba(59, 130, 246, 0.05);
  border-color: rgba(59, 130, 246, 0.2);
}

.btn-outline:not(:disabled):hover {
  background: rgba(59, 130, 246, 0.1);
  border-color: rgba(59, 130, 246, 0.3);
}

.btn-sm {
  padding: 6px 12px;
  font-size: 11.5px;
}

/* 响应式 */
@media (max-width: 980px) {
  .metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .ops-layout {
    grid-template-columns: 1fr;
    overflow-y: auto;
  }
  .ops-main, .ops-side {
    overflow: visible;
  }
  .auto-dev-page {
    overflow-y: auto;
  }
}

/* 暗色主题深度适配 */
[data-theme="dark"] .auto-dev-head { background: var(--surface-nav); }
[data-theme="dark"] .panel { background: var(--surface); box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
[data-theme="dark"] .metric-grid > div { background: var(--surface); box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
[data-theme="dark"] .metric-grid > div:hover { box-shadow: 0 6px 16px rgba(0,0,0,0.4); }
[data-theme="dark"] .report-content { background: var(--bg-primary); border-color: var(--border-color); }
[data-theme="dark"] .line-item { background: var(--surface); border-color: var(--border-color); }
[data-theme="dark"] .line-item:hover { background: var(--bg-secondary); border-color: rgba(255,255,255,0.1); }
[data-theme="dark"] .job-card { background: var(--surface); border-color: var(--border-color); }
[data-theme="dark"] .job-meta span { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1); color: var(--text-secondary); }
[data-theme="dark"] .empty-line { background: rgba(255,255,255,0.02); border-color: rgba(255,255,255,0.05); }
[data-theme="dark"] input, 
[data-theme="dark"] select { background: var(--bg-primary); border-color: var(--border-color); }
[data-theme="dark"] .notify-target.ready { background: rgba(34, 197, 94, 0.15); border-color: rgba(34, 197, 94, 0.3); }
[data-theme="dark"] .notify-target.missing { background: rgba(234, 179, 8, 0.15); border-color: rgba(234, 179, 8, 0.3); }
[data-theme="dark"] .line-item.warn { background: rgba(234, 179, 8, 0.12); border-color: rgba(234, 179, 8, 0.25); }
[data-theme="dark"] .btn-outline { background: rgba(59, 130, 246, 0.1); border-color: rgba(59, 130, 246, 0.3); }
[data-theme="dark"] .btn-outline:not(:disabled):hover { background: rgba(59, 130, 246, 0.2); }
</style>