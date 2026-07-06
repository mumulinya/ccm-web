<script setup>
defineProps({
  projectCount: { type: Number, default: 0 }
})

const emit = defineEmits(['clear-cache'])
</script>

<template>
  <div class="settings-card">
    <div class="card-header">
      <span class="icon">ℹ️</span>
      <div>
        <div class="card-title">系统信息与配置清理</div>
        <div class="card-desc">查看平台基础指标数据，或在此一键将系统所有本地偏好恢复至出厂状态</div>
      </div>
    </div>

    <div class="info-grid">
      <div class="info-item"><div class="info-label">控制台版本</div><div class="info-value">v1.0.8</div></div>
      <div class="info-item"><div class="info-label">核心底层框架</div><div class="info-value">Vue 3 + Vite</div></div>
      <div class="info-item"><div class="info-label">监控节点项目</div><div class="info-value">{{ projectCount }} 个节点</div></div>
      <div class="info-item"><div class="info-label">核心进程状态</div><div class="info-value text-green">ONLINE</div></div>
    </div>

    <div class="system-cleanup-section">
      <h4 class="cleanup-title">⚠️ 危险区域 (Danger Zone)</h4>
      <div class="cleanup-card">
        <div class="cleanup-left">
          <span class="cleanup-label">清除全部本地存储并恢复默认</span>
          <span class="cleanup-desc">这将永久清除存储于本地浏览器的全部菜单排版顺序、新增自定义外部链接、自定义分组、主题颜色配置以及刷新缓存，立即重启至初始状态。</span>
        </div>
        <button class="btn btn-danger" @click="emit('clear-cache')">🗑️ 恢复出厂设置</button>
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
.info-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.info-item { padding: 14px; border-radius: 10px; background: rgba(255,255,255,0.42); border: 1px solid rgba(0,0,0,0.05); }
.info-label { font-size: 11px; color: var(--text-muted); margin-bottom: 5px; }
.info-value { color: var(--text-primary); font-weight: 800; }
.text-green { color: var(--accent-green); }
.system-cleanup-section { margin-top: 26px; }
.cleanup-title { margin: 0 0 10px; color: #dc2626; font-size: 13px; }
.cleanup-card { display: flex; justify-content: space-between; gap: 16px; align-items: center; padding: 16px; border: 1px solid rgba(239,68,68,0.18); border-radius: 12px; background: rgba(239,68,68,0.04); }
.cleanup-left { display: flex; flex-direction: column; gap: 4px; }
.cleanup-label { color: var(--text-primary); font-weight: 700; font-size: 13px; }
.cleanup-desc { color: var(--text-muted); font-size: 11.5px; line-height: 1.5; }
.btn { padding: 8px 16px; border-radius: 8px; border: none; cursor: pointer; font-size: 13px; transition: all 0.2s; }
.btn-danger { background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.18); color: #dc2626; }
:global([data-theme="dark"]) .settings-card, :global([data-theme="dark"]) .cleanup-card { background: rgba(10, 10, 20, 0.38); border-color: rgba(255,255,255,0.06); }
@media (max-width: 768px) { .info-grid { grid-template-columns: 1fr 1fr; } .cleanup-card { flex-direction: column; align-items: stretch; } }
</style>
