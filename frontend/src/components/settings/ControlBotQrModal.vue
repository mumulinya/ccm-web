<script setup>
import { ExternalLink, QrCode, X } from '@lucide/vue'

defineProps({
  qrImage: { type: String, default: '' },
  qrUrl: { type: String, default: '' },
  qrStatus: { type: String, default: '' },
  loading: { type: Boolean, default: false }
})
const emit = defineEmits(['close', 'start'])
</script>

<template>
  <div class="settings-modal-overlay" @click.self="emit('close')">
    <section class="settings-modal" role="dialog" aria-modal="true" aria-labelledby="qr-modal-title">
      <button type="button" class="settings-modal-close" title="关闭" aria-label="关闭" @click="emit('close')"><X :size="17" /></button>
      <header>
        <QrCode :size="20" />
        <div><h2 id="qr-modal-title">扫码配置任务会话</h2><p>授权后会自动回填飞书应用凭证，消息通过 WebSocket 长连接接收。</p></div>
      </header>
      <div class="qr-modal-body">
        <div class="qr-preview">
          <img v-if="qrImage" :src="qrImage" alt="飞书授权二维码">
          <QrCode v-else :size="54" />
        </div>
        <div>
          <ol><li>生成扫码链接。</li><li>使用飞书 App 扫码并完成授权。</li><li>凭证回填后关闭窗口并启动任务会话。</li></ol>
          <a v-if="qrUrl" :href="qrUrl" target="_blank" rel="noreferrer"><ExternalLink :size="14" /> 打开扫码链接</a>
          <p v-if="qrStatus" class="qr-status">{{ qrStatus }}</p>
        </div>
      </div>
      <footer>
        <button type="button" class="settings-button" @click="emit('close')">关闭</button>
        <button type="button" class="settings-button primary" :disabled="loading" @click="emit('start')"><QrCode :size="15" /> {{ loading ? '等待授权' : '生成扫码链接' }}</button>
      </footer>
    </section>
  </div>
</template>

<style scoped>
.settings-modal-overlay { position: fixed; inset: 0; z-index: 10001; display: grid; place-items: center; padding: 16px; background: rgba(15,23,42,.42); }
.settings-modal { width: min(560px, 100%); position: relative; padding: 22px; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-primary); box-shadow: 0 24px 64px rgba(15,23,42,.2); }
.settings-modal-close { position: absolute; top: 12px; right: 12px; width: 30px; height: 30px; display: grid; place-items: center; border: 1px solid var(--border-color); border-radius: 7px; background: var(--bg-secondary); color: var(--text-secondary); cursor: pointer; }
.settings-modal header { display: flex; gap: 10px; padding-right: 34px; }
.settings-modal header > svg { color: var(--accent-blue); flex: 0 0 auto; }
.settings-modal h2 { margin: 0; font-size: 16px; letter-spacing: 0; }
.settings-modal header p { margin: 4px 0 0; color: var(--text-muted); font-size: 11px; line-height: 1.5; }
.qr-modal-body { display: grid; grid-template-columns: 170px minmax(0,1fr); gap: 18px; align-items: center; margin: 20px 0; }
.qr-preview { width: 170px; aspect-ratio: 1; display: grid; place-items: center; border: 1px solid var(--border-color); border-radius: 8px; background: white; color: #94a3b8; }
.qr-preview img { width: 154px; height: 154px; object-fit: contain; }
.qr-modal-body ol { margin: 0 0 10px; padding-left: 18px; color: var(--text-secondary); font-size: 11px; line-height: 1.75; }
.qr-modal-body a { display: inline-flex; align-items: center; gap: 6px; color: var(--accent-blue); font-size: 11px; font-weight: 700; text-decoration: none; }
.qr-status { margin: 10px 0 0; padding: 8px; border-radius: 7px; background: var(--bg-secondary); color: var(--text-secondary); font-size: 11px; }
.settings-modal footer { display: flex; justify-content: flex-end; gap: 8px; }
@media (max-width: 600px) { .qr-modal-body { grid-template-columns: 1fr; } .qr-preview { width: min(170px, 100%); margin: auto; } }
</style>
