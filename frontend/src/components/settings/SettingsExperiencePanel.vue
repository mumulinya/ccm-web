<script setup>
import { onMounted, ref } from 'vue'
import { Bot, Gauge, ImagePlus, Palette, RefreshCw, RotateCcw, UserRound } from '@lucide/vue'
import { toast } from '../../utils/toast.js'
import ChatAvatar from '../common/ChatAvatar.vue'
import { useChatIdentity } from '../../composables/useChatIdentity.js'

const themePreset = ref('default')
const pollingInterval = ref(10)
const lowPerf = ref(false)
const userAvatarInput = ref(null)
const agentAvatarInput = ref(null)
const { identity, setAvatar, resetAvatar } = useChatIdentity()

const avatarPresets = {
  user: ['👤', '🙂', '🧑', '👩', '🧑‍💻', '👩‍💻'],
  agent: ['🤖', '🧠', '✨', '⚙️', '🛰️', '💡'],
}

const presets = [
  { key: 'default', label: '系统默认', colors: ['#ffffff', '#3b82f6', '#334155'] },
  { key: 'deep-void', label: '深邃极客', colors: ['#020617', '#22d3ee', '#94a3b8'] },
  { key: 'cyberpunk', label: '赛博之霓', colors: ['#111827', '#ec4899', '#a3e635'] },
  { key: 'deep-ocean', label: '深海探索', colors: ['#0f172a', '#0e7490', '#6366f1'] },
  { key: 'aurora', label: '极地流光', colors: ['#f8fafc', '#22c55e', '#0f766e'] }
]

const dispatchStorage = (key, value) => window.dispatchEvent(new StorageEvent('storage', { key, newValue: String(value) }))

const DARK_PRESETS = new Set(['deep-void', 'cyberpunk', 'deep-ocean'])
const LIGHT_PRESETS = new Set(['aurora'])

const changeTheme = preset => {
  themePreset.value = preset
  localStorage.setItem('theme-preset', preset)
  if (DARK_PRESETS.has(preset)) {
    localStorage.setItem('theme', 'dark')
    dispatchStorage('theme', 'dark')
  } else if (LIGHT_PRESETS.has(preset)) {
    localStorage.setItem('theme', 'light')
    dispatchStorage('theme', 'light')
  }
  dispatchStorage('theme-preset', preset)
  toast.success('主题已应用')
}

const changePolling = seconds => {
  pollingInterval.value = seconds
  localStorage.setItem('app-polling-interval', String(seconds))
  dispatchStorage('app-polling-interval', seconds)
}

const changePerformance = enabled => {
  lowPerf.value = enabled
  localStorage.setItem('app-low-perf', String(enabled))
  dispatchStorage('app-low-perf', enabled)
}

const selectAvatarPreset = (role, value) => {
  if (!setAvatar(role, { type: 'emoji', value })) toast.error('头像保存失败，请检查浏览器存储空间')
}

const openAvatarPicker = role => {
  const input = role === 'user' ? userAvatarInput.value : agentAvatarInput.value
  input?.click()
}

const uploadAvatar = (role, event) => {
  const input = event.target
  const file = input?.files?.[0]
  if (!file) return
  if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) {
    toast.error('头像仅支持 PNG、JPEG、WebP 或 GIF')
    input.value = ''
    return
  }
  if (file.size > 512 * 1024) {
    toast.error('头像图片不能超过 512 KB')
    input.value = ''
    return
  }
  const reader = new FileReader()
  reader.onload = () => {
    const saved = setAvatar(role, { type: 'image', value: String(reader.result || '') })
    if (saved) toast.success(role === 'user' ? '用户头像已更新' : 'Agent 头像已更新')
    else toast.error('头像保存失败，请检查浏览器存储空间')
    input.value = ''
  }
  reader.onerror = () => {
    toast.error('头像图片读取失败')
    input.value = ''
  }
  reader.readAsDataURL(file)
}

const restoreAvatar = role => {
  const saved = resetAvatar(role)
  if (saved) toast.success(role === 'user' ? '用户头像已恢复默认' : 'Agent 头像已恢复默认')
  else toast.error('头像保存失败，请检查浏览器存储空间')
}

onMounted(() => {
  themePreset.value = localStorage.getItem('theme-preset') || 'default'
  pollingInterval.value = Number(localStorage.getItem('app-polling-interval') || 10)
  lowPerf.value = localStorage.getItem('app-low-perf') === 'true'
})
</script>

<template>
  <section class="settings-panel" data-settings-panel="experience">
    <header class="settings-panel-header">
      <div class="settings-panel-heading">
        <Palette :size="20" />
        <div>
          <h2>外观与刷新</h2>
          <p>这些偏好只保存在当前浏览器，不会影响 Agent、任务或知识库数据。</p>
        </div>
      </div>
    </header>

    <div class="settings-section">
      <div class="settings-section-heading">
        <div>
          <h3>界面主题</h3>
          <p>顶部明暗开关控制浅色/深色；预设可叠加配色。深邃/赛博/深海仅用于深色，极地流光仅用于浅色；与开关冲突时会自动回到系统默认。</p>
        </div>
      </div>
      <div class="theme-preset-grid">
        <button v-for="preset in presets" :key="preset.key" type="button" class="theme-preset" :class="{ active: themePreset === preset.key }" @click="changeTheme(preset.key)">
          <span class="theme-swatches"><i v-for="color in preset.colors" :key="color" :style="{ background: color }"></i></span>
          <strong>{{ preset.label }}</strong>
        </button>
      </div>
    </div>

    <div class="settings-section">
      <div class="settings-section-heading">
        <div>
          <h3>会话头像</h3>
          <p>统一应用于群聊、全局 Agent 和项目 Agent；本地图片仅保存在当前浏览器。</p>
        </div>
      </div>
      <div class="avatar-config-grid">
        <section v-for="role in ['user', 'agent']" :key="role" class="avatar-config-item">
          <header class="avatar-config-head">
            <ChatAvatar :role="role" :size="48" />
            <div>
              <strong>{{ role === 'user' ? '用户头像' : 'Agent 头像' }}</strong>
              <span>{{ role === 'user' ? '显示在你发送的消息旁' : '显示在主 Agent 和项目 Agent 回复旁' }}</span>
            </div>
            <component :is="role === 'user' ? UserRound : Bot" :size="17" />
          </header>
          <div class="avatar-preset-list" :aria-label="role === 'user' ? '用户头像预设' : 'Agent 头像预设'">
            <button
              v-for="preset in avatarPresets[role]"
              :key="preset"
              type="button"
              :class="{ active: identity[role].type === 'emoji' && identity[role].value === preset }"
              :title="`使用 ${preset}`"
              @click="selectAvatarPreset(role, preset)"
            >{{ preset }}</button>
          </div>
          <div class="avatar-config-actions">
            <button type="button" class="settings-button" @click="openAvatarPicker(role)"><ImagePlus :size="15" />上传图片</button>
            <button type="button" class="settings-button" @click="restoreAvatar(role)"><RotateCcw :size="15" />恢复默认</button>
          </div>
        </section>
      </div>
      <input ref="userAvatarInput" class="avatar-file-input" type="file" accept="image/png,image/jpeg,image/webp,image/gif" @change="uploadAvatar('user', $event)">
      <input ref="agentAvatarInput" class="avatar-file-input" type="file" accept="image/png,image/jpeg,image/webp,image/gif" @change="uploadAvatar('agent', $event)">
    </div>

    <div class="settings-section">
      <div class="settings-section-heading">
        <div><h3>数据刷新周期</h3><p>用于工作台和性能监控等实时数据。</p></div>
        <RefreshCw :size="17" />
      </div>
      <div class="settings-segmented polling-options">
        <button v-for="seconds in [5, 10, 30, 60, 0]" :key="seconds" type="button" :class="{ active: pollingInterval === seconds }" @click="changePolling(seconds)">
          {{ seconds === 0 ? '暂停' : `${seconds} 秒` }}
        </button>
      </div>
    </div>

    <div class="settings-section">
      <div class="settings-section-heading">
        <div><h3>低性能设备模式</h3><p>减少毛玻璃、动画和悬停效果，降低图形渲染开销。</p></div>
        <Gauge :size="17" />
      </div>
      <label class="settings-switch">
        <input :checked="lowPerf" type="checkbox" @change="changePerformance($event.target.checked)">
        <span class="settings-switch-track"></span>
        {{ lowPerf ? '已开启' : '已关闭' }}
      </label>
    </div>
  </section>
</template>

<style scoped>
.theme-preset-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 9px; }
.theme-preset { min-width: 0; padding: 10px; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-secondary); color: var(--text-secondary); cursor: pointer; }
.theme-preset.active { border-color: rgba(59,130,246,.5); box-shadow: 0 0 0 2px rgba(59,130,246,.08); color: var(--accent-blue); }
.theme-swatches { height: 28px; display: grid; grid-template-columns: repeat(3, 1fr); overflow: hidden; border: 1px solid rgba(100,116,139,.18); border-radius: 6px; margin-bottom: 8px; }
.theme-swatches i { display: block; }
.theme-preset strong { font-size: 10.5px; letter-spacing: 0; }
.polling-options { margin-bottom: 0; }
.avatar-config-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.avatar-config-item { min-width: 0; padding: 14px; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-secondary); }
.avatar-config-head { display: grid; grid-template-columns: 48px minmax(0, 1fr) auto; align-items: center; gap: 11px; }
.avatar-config-head div { min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.avatar-config-head strong { font-size: 12.5px; }
.avatar-config-head span { color: var(--text-muted); font-size: 10.5px; line-height: 1.35; }
.avatar-config-head > svg { color: var(--text-muted); }
.avatar-preset-list { display: grid; grid-template-columns: repeat(6, minmax(30px, 1fr)); gap: 6px; margin-top: 13px; }
.avatar-preset-list button { aspect-ratio: 1; min-width: 0; display: grid; place-items: center; padding: 0; border: 1px solid var(--border-color); border-radius: 50%; background: var(--bg-primary); font-size: 17px; cursor: pointer; }
.avatar-preset-list button:hover { border-color: rgba(59,130,246,.38); }
.avatar-preset-list button.active { border-color: var(--accent-blue); box-shadow: 0 0 0 2px rgba(59,130,246,.1); }
.avatar-config-actions { display: flex; gap: 7px; flex-wrap: wrap; margin-top: 12px; }
.avatar-file-input { display: none; }
@media (max-width: 820px) {
  .theme-preset-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .avatar-config-grid { grid-template-columns: 1fr; }
}
</style>
