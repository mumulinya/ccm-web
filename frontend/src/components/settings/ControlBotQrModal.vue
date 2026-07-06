<script setup>
defineProps({
  qrImage: { type: String, default: '' },
  qrUrl: { type: String, default: '' },
  qrStatus: { type: String, default: '' },
  loading: { type: Boolean, default: false }
})

const emit = defineEmits(['close', 'start'])
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal control-bot-qr-modal">
      <button class="modal-close" @click="emit('close')">&times;</button>
      <h3>🤖 扫码配置飞书控制机器人</h3>
      <p class="modal-desc">扫码会自动创建/授权飞书应用，并把 App ID / Secret 写入全局控制机器人配置；收消息使用 cc-connect 的 WebSocket 长连接。</p>

      <div class="qr-setup-layout">
        <div class="qr-preview">
          <img v-if="qrImage" :src="qrImage" alt="飞书扫码二维码">
          <div v-else class="qr-area">
            <div class="qr-phone">📱</div>
            <div class="qr-hint">等待生成二维码</div>
          </div>
        </div>
        <div class="qr-setup-copy">
          <ol>
            <li>点击“生成扫码链接”</li>
            <li>用飞书 App 扫码并完成授权</li>
            <li>授权后自动回填控制机器人 App ID / Secret</li>
            <li>确认飞书应用事件订阅使用 WebSocket 长连接模式</li>
          </ol>
          <a v-if="qrUrl" class="scan-link" :href="qrUrl" target="_blank" rel="noreferrer">打开扫码链接</a>
          <div v-if="qrStatus" class="qr-status-text">{{ qrStatus }}</div>
        </div>
      </div>

      <div class="btn-actions">
        <button class="btn btn-primary" @click="emit('start')" :disabled="loading">
          {{ loading ? '等待扫码中...' : '生成扫码链接' }}
        </button>
        <button class="btn btn-outline" @click="emit('close')">关闭</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.18); backdrop-filter: blur(12px); display: flex; align-items: center; justify-content: center; z-index: 10001; }
.modal { background: rgba(255, 255, 255, 0.78) !important; backdrop-filter: blur(30px) !important; border: 1px solid rgba(0, 0, 0, 0.06) !important; border-radius: 16px !important; padding: 28px; width: min(560px, calc(100vw - 32px)); position: relative; box-shadow: 0 20px 50px rgba(15, 23, 42, 0.08), 0 0 30px rgba(59, 130, 246, 0.04) !important; max-height: 88vh; overflow-y: auto; }
.modal-close { position: absolute; top: 16px; right: 16px; width: 28px; height: 28px; border-radius: 8px; border: 1px solid rgba(0, 0, 0, 0.05); background: rgba(0,0,0,0.02); color: var(--text-secondary); cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 16px; }
.modal h3 { margin: 0 0 8px; font-size: 16px; color: var(--text-primary); }
.modal-desc { margin: 0 0 18px; font-size: 12px; line-height: 1.6; color: var(--text-muted); }
.qr-setup-layout { display: grid; grid-template-columns: 180px 1fr; gap: 18px; align-items: center; }
.qr-preview { display: flex; align-items: center; justify-content: center; min-height: 180px; border-radius: 12px; background: rgba(255,255,255,0.48); border: 1px solid rgba(0,0,0,0.05); }
.qr-preview img { max-width: 160px; max-height: 160px; }
.qr-area { color: var(--text-muted); text-align: center; }
.qr-phone { font-size: 34px; margin-bottom: 8px; }
.qr-hint { font-size: 12px; }
.qr-setup-copy ol { margin: 0 0 12px 18px; padding: 0; color: var(--text-secondary); font-size: 12px; line-height: 1.7; }
.scan-link { display: inline-flex; margin-bottom: 8px; color: var(--accent-blue); font-size: 12px; }
.qr-status-text { font-size: 12px; color: var(--text-secondary); padding: 8px 10px; border-radius: 8px; background: rgba(59,130,246,0.06); }
.btn-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 18px; }
.btn { padding: 8px 16px; border-radius: 8px; border: none; cursor: pointer; font-size: 13px; transition: all 0.2s; }
.btn:disabled { opacity: 0.55; cursor: not-allowed; }
.btn-primary { background: var(--gradient-blue); color: white; }
.btn-outline { background: transparent; border: 1px solid rgba(0, 0, 0, 0.08); color: var(--text-secondary); }
@media (max-width: 720px) { .qr-setup-layout { grid-template-columns: 1fr; } }
</style>
