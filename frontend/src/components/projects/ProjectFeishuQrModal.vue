<script setup>
import { onBeforeUnmount, onMounted } from 'vue'
import { Bot, ExternalLink, QrCode, X } from '@lucide/vue'

defineProps({
  url: { type: String, default: '' },
  status: { type: String, default: '' },
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'start'])

const handleKeydown = event => {
  if (event.key !== 'Escape') return
  event.stopImmediatePropagation()
  emit('close')
}

onMounted(() => window.addEventListener('keydown', handleKeydown, true))
onBeforeUnmount(() => window.removeEventListener('keydown', handleKeydown, true))
</script>

<template>
  <Teleport to="body">
    <div class="project-feishu-overlay" data-project-feishu-modal @click.self="emit('close')">
      <section class="feishu-qr-modal" role="dialog" aria-modal="true" aria-labelledby="project-feishu-title">
        <header class="feishu-qr-header">
          <span><Bot :size="19" /></span>
          <div>
            <h3 id="project-feishu-title">飞书扫码创建机器人</h3>
            <p>为当前项目创建独立的飞书通知凭据</p>
          </div>
          <button type="button" class="modal-close" title="关闭" aria-label="关闭" @click="emit('close')"><X :size="18" /></button>
        </header>

        <div class="qr-layout">
          <div class="qr-instructions">
            <div class="qr-steps">
              <div class="qr-steps-title">扫码配置步骤</div>
              <ol>
                <li>生成当前项目的一次性扫码链接</li>
                <li>使用飞书 App 扫描二维码</li>
                <li>完成授权后自动保存项目凭据</li>
              </ol>
            </div>
            <div class="qr-tip">
              <strong>凭据说明</strong>
              <p>扫码配置会自动创建飞书应用并获取 App ID 和 Secret，无需手动填写。</p>
            </div>
            <button type="button" class="btn btn-primary" :disabled="loading" @click="emit('start')">
              <QrCode :size="16" />{{ loading ? '正在生成' : '生成扫码链接' }}
            </button>
          </div>

          <div class="qr-preview">
            <div class="qr-box">
              <template v-if="url">
                <img :src="'https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=' + encodeURIComponent(url)" alt="飞书扫码">
              </template>
              <template v-else>
                <QrCode :size="42" />
                <span>等待生成二维码</span>
              </template>
            </div>
            <a v-if="url" :href="url" target="_blank" rel="noreferrer"><ExternalLink :size="14" />打开授权页面</a>
            <div v-if="status" class="qr-status">{{ status }}</div>
          </div>
        </div>

        <footer class="qr-footer">
          <button type="button" class="btn" @click="emit('close')">关闭</button>
        </footer>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.project-feishu-overlay {
  position: fixed;
  inset: 0;
  z-index: 10100;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(15, 23, 42, .48);
  backdrop-filter: blur(7px);
}

.feishu-qr-modal {
  width: min(580px, 100%);
  max-height: calc(100vh - 48px);
  overflow: auto;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--surface, var(--bg-primary));
  color: var(--text-primary);
  box-shadow: 0 28px 80px rgba(15, 23, 42, .3);
}

.feishu-qr-header {
  min-height: 68px;
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 14px 17px;
  border-bottom: 1px solid var(--border-color);
}

.feishu-qr-header > span {
  width: 36px;
  height: 36px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  border-radius: 8px;
  background: color-mix(in srgb, var(--accent-blue) 10%, var(--surface));
  color: var(--accent-blue);
}

.feishu-qr-header > div { min-width: 0; flex: 1; }
.feishu-qr-header h3 { margin: 0; font-size: 15px; letter-spacing: 0; }
.feishu-qr-header p { margin: 4px 0 0; color: var(--text-muted); font-size: 10.5px; }
.modal-close { width: 32px; height: 32px; display: grid; place-items: center; border: 1px solid var(--border-color); border-radius: 7px; background: transparent; color: var(--text-muted); cursor: pointer; }
.modal-close:hover { background: var(--control-hover); color: var(--text-primary); }

.qr-layout { display: flex; gap: 24px; padding: 20px 18px; }
.qr-instructions { flex: 1; }
.qr-steps { margin-bottom: 16px; color: var(--text-secondary); font-size: 12px; line-height: 1.8; }
.qr-steps-title { margin-bottom: 8px; color: var(--text-primary); font-weight: 650; }
.qr-steps ol { padding-left: 20px; }
.qr-tip { padding: 12px; border: 1px solid color-mix(in srgb, var(--accent-blue) 20%, var(--border-color)); border-radius: 8px; background: color-mix(in srgb, var(--accent-blue) 5%, var(--surface)); }
.qr-tip strong { color: var(--accent-blue); font-size: 11px; }
.qr-tip p { margin: 4px 0 0; color: var(--text-muted); font-size: 10.5px; line-height: 1.55; }
.qr-instructions .btn { width: 100%; margin-top: 16px; }

.qr-preview { width: 220px; display: flex; flex-direction: column; align-items: center; }
.qr-box { width: 200px; height: 200px; display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 8px; border: 2px dashed var(--border-color); border-radius: 8px; color: var(--text-muted); font-size: 11px; }
.qr-box img { width: 180px; height: 180px; border-radius: 6px; }
.qr-box > svg { color: var(--text-muted); opacity: .42; }
.qr-preview a { margin-top: 8px; display: inline-flex; align-items: center; gap: 5px; color: var(--accent-blue); font-size: 11px; }
.qr-status { margin-top: 8px; color: var(--text-muted); font-size: 11px; text-align: center; }

.btn { min-height: 36px; display: inline-flex; align-items: center; justify-content: center; gap: 7px; padding: 0 14px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--surface, var(--bg-primary)); color: var(--text-secondary); font: inherit; font-size: 11.5px; font-weight: 650; cursor: pointer; }
.btn-primary { border-color: var(--accent-blue); background: var(--accent-blue); color: #fff; }
.btn:disabled { cursor: wait; opacity: .55; }
.qr-footer { display: flex; justify-content: flex-end; padding: 12px 18px; border-top: 1px solid var(--border-color); }

@media (max-width: 640px) {
  .project-feishu-overlay { align-items: end; padding: 0; }
  .feishu-qr-modal { width: 100%; max-height: 92vh; border-right: 0; border-bottom: 0; border-left: 0; border-radius: 8px 8px 0 0; }
  .qr-layout { flex-direction: column; gap: 16px; }
  .qr-preview { width: 100%; }
  .qr-box { width: min(200px, 100%); height: auto; aspect-ratio: 1; }
  .qr-box img { width: min(180px, calc(100% - 20px)); height: auto; aspect-ratio: 1; }
}
</style>
