<script setup>
defineProps({
  themePreset: { type: String, default: 'default' },
  pollingInterval: { type: Number, default: 10 },
  lowPerf: { type: Boolean, default: false }
})

const emit = defineEmits(['theme-change', 'polling-change', 'performance-change'])

const presets = [
  { key: 'default', label: '系统默认', preview: 'bg-default', dots: ['p-blue', 'p-gray'] },
  { key: 'deep-void', label: '深邃极客', preview: 'bg-void', dots: ['p-cyan', 'p-dark'] },
  { key: 'cyberpunk', label: '赛博之霓', preview: 'bg-cyber', dots: ['p-pink', 'p-neon'] },
  { key: 'deep-ocean', label: '深海探索', preview: 'bg-ocean', dots: ['p-indigo', 'p-teal'] },
  { key: 'aurora', label: '极地流光', preview: 'bg-aurora', dots: ['p-aurora-g', 'p-aurora-w'] },
]
</script>

<template>
  <div class="settings-card">
    <div class="card-header">
      <span class="icon">🎨</span>
      <div>
        <div class="card-title">个性化与体验设置</div>
        <div class="card-desc">配置 Web 界面的主题艺术预设、数据自动轮询周期及针对性能的 GPU 加速开关</div>
      </div>
    </div>

    <div class="settings-subsection">
      <h4 class="sub-title">💎 科技霓虹艺术主题预设</h4>
      <div class="preset-grid">
        <div
          v-for="preset in presets"
          :key="preset.key"
          class="preset-card"
          :class="{ active: themePreset === preset.key }"
          @click="emit('theme-change', preset.key)"
        >
          <div class="preset-preview" :class="preset.preview">
            <span v-for="dot in preset.dots" :key="dot" class="dot-p" :class="dot"></span>
          </div>
          <span class="preset-label">{{ preset.label }}</span>
        </div>
      </div>
    </div>

    <div class="settings-subsection spaced">
      <h4 class="sub-title">🔄 协作大屏自动刷新轮询周期</h4>
      <div class="polling-selector-wrap">
        <div class="polling-options">
          <button
            v-for="sec in [5, 10, 30, 60, 0]"
            :key="sec"
            class="btn btn-sm btn-poll-opt"
            :class="{ active: pollingInterval === sec }"
            @click="emit('polling-change', sec)"
          >
            {{ sec === 0 ? '⏸️ 停止刷新' : sec + ' 秒' }}
          </button>
        </div>
        <div class="form-hint">修改后，仪表盘看板及性能监控数据将按照此时间间隔定期拉取最新协作状态。</div>
      </div>
    </div>

    <div class="settings-subsection spaced">
      <h4 class="sub-title">⚡ 极速 GPU 硬件加速模式</h4>
      <div class="form-group row-checkbox">
        <label class="switch-label">
          <input type="checkbox" :checked="lowPerf" class="switch-input" @change="emit('performance-change', $event.target.checked)">
          <span class="switch-slider"></span>
          <div class="switch-text-block">
            <span class="switch-text">启用低配硬件渲染加速</span>
            <span class="switch-hint">（开启后将禁用全站毛玻璃磨砂 `backdrop-filter` 以及复杂的交互悬停缩放，能极大地为核显设备降温和提速）</span>
          </div>
        </label>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-card { background: rgba(255, 255, 255, 0.55); border: 1px solid rgba(0, 0, 0, 0.05); border-radius: 16px; padding: 24px; }
.card-header { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
.icon { font-size: 22px; }
.card-title { font-size: 16px; font-weight: 700; color: var(--text-primary); }
.card-desc { font-size: 11.5px; color: var(--text-muted); margin-top: 3px; }
.settings-subsection.spaced { margin-top: 24px; }
.sub-title { margin: 0 0 12px; color: var(--text-primary); font-size: 14px; }
.preset-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; }
.preset-card { padding: 12px; border: 1px solid rgba(0,0,0,0.06); border-radius: 10px; background: rgba(255,255,255,0.42); cursor: pointer; transition: all 0.2s; }
.preset-card:hover { transform: translateY(-2px); border-color: rgba(59, 130, 246, 0.15); background: rgba(255,255,255,0.7); }
.preset-card.active { border-color: var(--accent-blue); background: rgba(59, 130, 246, 0.03); box-shadow: 0 4px 12px rgba(59, 130, 246, 0.08); }
.preset-preview { height: 56px; border-radius: 8px; margin-bottom: 8px; display: flex; align-items: center; justify-content: center; gap: 8px; }
.bg-default { background: linear-gradient(135deg, #f8fafc, #dbeafe); }
.bg-void { background: linear-gradient(135deg, #020617, #0f172a); }
.bg-cyber { background: linear-gradient(135deg, #111827, #831843); }
.bg-ocean { background: linear-gradient(135deg, #0f172a, #0e7490); }
.bg-aurora { background: linear-gradient(135deg, #052e16, #a7f3d0); }
.dot-p { width: 12px; height: 12px; border-radius: 999px; display: inline-block; }
.p-blue { background: #3b82f6; }
.p-gray { background: #94a3b8; }
.p-cyan { background: #22d3ee; }
.p-dark { background: #1e293b; }
.p-pink { background: #ec4899; }
.p-neon { background: #a3e635; }
.p-indigo { background: #6366f1; }
.p-teal { background: #14b8a6; }
.p-aurora-g { background: #22c55e; }
.p-aurora-w { background: #f8fafc; }
.preset-label { display: block; text-align: center; color: var(--text-secondary); font-size: 12px; font-weight: 700; }
.polling-options { display: flex; flex-wrap: wrap; gap: 8px; }
.btn { padding: 8px 16px; border-radius: 8px; border: none; cursor: pointer; font-size: 13px; transition: all 0.2s; }
.btn-sm { padding: 5px 10px; font-size: 12px; }
.btn-poll-opt { background: rgba(255,255,255,0.48); border: 1px solid rgba(0,0,0,0.06); color: var(--text-secondary); }
.btn-poll-opt.active { color: var(--accent-blue); border-color: rgba(59,130,246,0.24); background: rgba(59,130,246,0.08); }
.form-hint { margin-top: 8px; font-size: 11.5px; color: var(--text-muted); line-height: 1.5; }
.switch-label { display: flex; align-items: center; gap: 10px; cursor: pointer; }
.switch-input { display: none; }
.switch-slider { width: 38px; height: 20px; border-radius: 999px; background: #cbd5e1; position: relative; flex-shrink: 0; transition: background 0.2s; }
.switch-slider::after { content: ''; position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 50%; background: white; transition: transform 0.2s; }
.switch-input:checked + .switch-slider { background: var(--accent-blue); }
.switch-input:checked + .switch-slider::after { transform: translateX(18px); }
.switch-text-block { display: flex; flex-direction: column; gap: 3px; }
.switch-text { color: var(--text-primary); font-size: 13px; font-weight: 600; }
.switch-hint { color: var(--text-muted); font-size: 11.5px; line-height: 1.4; }
:global([data-theme="dark"]) .settings-card, :global([data-theme="dark"]) .preset-card { background: rgba(10, 10, 20, 0.38); border-color: rgba(255,255,255,0.06); }
</style>
