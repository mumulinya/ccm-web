<script setup>
import { onMounted, ref } from 'vue'
import { Gauge, Palette, RefreshCw } from '@lucide/vue'
import { toast } from '../../utils/toast.js'

const themePreset = ref('default')
const pollingInterval = ref(10)
const lowPerf = ref(false)

const presets = [
  { key: 'default', label: '系统默认', colors: ['#ffffff', '#3b82f6', '#334155'] },
  { key: 'deep-void', label: '深邃极客', colors: ['#020617', '#22d3ee', '#94a3b8'] },
  { key: 'cyberpunk', label: '赛博之霓', colors: ['#111827', '#ec4899', '#a3e635'] },
  { key: 'deep-ocean', label: '深海探索', colors: ['#0f172a', '#0e7490', '#6366f1'] },
  { key: 'aurora', label: '极地流光', colors: ['#f8fafc', '#22c55e', '#0f766e'] }
]

const dispatchStorage = (key, value) => window.dispatchEvent(new StorageEvent('storage', { key, newValue: String(value) }))

const changeTheme = preset => {
  themePreset.value = preset
  localStorage.setItem('theme-preset', preset)
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
        <div><h3>界面主题</h3><p>选择一套全站颜色预设。</p></div>
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
@media (max-width: 820px) { .theme-preset-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
</style>
