<script setup>
import { computed, onMounted, ref } from 'vue'
import { Activity, Clock3, Info, RotateCcw, ShieldCheck } from '@lucide/vue'
import { projectsApi } from '../../api/index.js'
import { confirmDialog, toast } from '../../utils/toast.js'

const props = defineProps({ initialStatus: { type: Object, default: null } })
const emit = defineEmits(['status'])
const status = ref(props.initialStatus)
const projectCount = ref(0)
const resetting = ref(false)

const uptime = computed(() => {
  const seconds = Number(status.value?.service?.uptimeSeconds || 0)
  if (seconds < 60) return `${seconds} 秒`
  if (seconds < 3600) return `${Math.floor(seconds / 60)} 分钟`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} 小时`
  return `${Math.floor(seconds / 86400)} 天`
})

const load = async () => {
  try {
    const [statusResponse, projects] = await Promise.all([
      fetch('/api/system/settings-status'),
      projectsApi.list()
    ])
    const data = await statusResponse.json()
    if (statusResponse.ok && data.success) {
      status.value = data
      emit('status', data)
    }
    projectCount.value = projects.projects?.length || 0
  } catch {
    toast.error('读取系统运行信息失败')
  }
}

const resetPreferences = async () => {
  const confirmed = await confirmDialog('恢复当前浏览器的主题、刷新周期和菜单布局？Agent 配置、项目、任务、会话及知识库不会被删除。')
  if (!confirmed) return
  resetting.value = true
  const keys = [
    'theme', 'theme-preset', 'app-polling-interval', 'app-low-perf',
    'tab-order', 'menu-custom-links', 'menu-groups', 'menu-tab-groups'
  ]
  keys.forEach(key => localStorage.removeItem(key))
  document.documentElement.setAttribute('data-theme', 'light')
  document.documentElement.setAttribute('data-theme-preset', 'default')
  document.documentElement.classList.remove('low-perf')
  keys.forEach(key => window.dispatchEvent(new StorageEvent('storage', { key, newValue: null })))
  toast.success('界面偏好已恢复，正在刷新页面')
  setTimeout(() => window.location.reload(), 450)
}

onMounted(load)
</script>

<template>
  <section class="settings-panel" data-settings-panel="system">
    <header class="settings-panel-header">
      <div class="settings-panel-heading">
        <Info :size="20" />
        <div>
          <h2>系统与重置</h2>
          <p>这里展示真实运行状态，并只允许重置当前浏览器的界面偏好。</p>
        </div>
      </div>
    </header>

    <div class="settings-status-banner" :class="{ ready: status?.service?.status === 'online' }">
      <div class="settings-status-copy">
        <Activity :size="18" />
        <div>
          <strong>{{ status?.service?.status === 'online' ? 'CCM 服务运行正常' : '正在读取服务状态' }}</strong>
          <span>{{ status?.service?.status === 'online' ? `已持续运行 ${uptime}` : '暂时无法取得运行信息。' }}</span>
        </div>
      </div>
    </div>

    <div class="settings-tile-grid system-info-grid">
      <div class="settings-tile"><div class="settings-tile-label">当前版本</div><div class="settings-tile-value">v{{ status?.version || 'unknown' }}</div></div>
      <div class="settings-tile"><div class="settings-tile-label">项目数量</div><div class="settings-tile-value">{{ projectCount }}</div></div>
      <div class="settings-tile"><div class="settings-tile-label">凭据保护</div><div class="settings-tile-value">{{ status?.credentials?.protected ? '已启用' : '未确认' }}</div><div class="settings-tile-note">{{ status?.credentials?.backend || '' }}</div></div>
    </div>

    <div class="settings-section">
      <div class="settings-inline-status reset-row">
        <div>
          <strong>恢复界面默认设置</strong>
          <span>重置主题、刷新周期、自定义菜单和菜单顺序，不会删除任何业务数据或密钥。</span>
        </div>
        <button type="button" class="settings-button danger" :disabled="resetting" @click="resetPreferences"><RotateCcw :size="15" /> 恢复默认</button>
      </div>
    </div>

    <details class="settings-details">
      <summary><ShieldCheck :size="14" /> 技术信息</summary>
      <div class="settings-details-content technical-grid">
        <span><b>进程 PID</b>{{ status?.service?.pid || '-' }}</span>
        <span><b>启动时间</b>{{ status?.service?.startedAt ? new Date(status.service.startedAt).toLocaleString() : '-' }}</span>
        <span><b>加密凭据数</b>{{ status?.credentials?.entries ?? '-' }}</span>
        <span><b>运行时长</b>{{ uptime }}</span>
      </div>
    </details>
  </section>
</template>

<style scoped>
.technical-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 9px 18px; }
.technical-grid span { display: flex; flex-direction: column; gap: 2px; overflow-wrap: anywhere; }
.technical-grid b { color: var(--text-muted); font-size: 10px; }
@media (max-width: 820px) { .technical-grid { grid-template-columns: 1fr; } }
</style>
