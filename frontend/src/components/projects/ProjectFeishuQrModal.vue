<script setup>
defineProps({
  url: { type: String, default: '' },
  status: { type: String, default: '' },
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'start'])
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal feishu-qr-modal">
      <button class="modal-close" @click="emit('close')">&times;</button>
      <h3>🤖 飞书扫码创建机器人</h3>

      <div class="qr-layout">
        <div class="qr-instructions">
          <div class="qr-steps">
            <div class="qr-steps-title">扫码配置步骤：</div>
            <ol>
              <li>点击"生成扫码链接"</li>
              <li>用飞书 App 扫描二维码</li>
              <li>授权后自动完成配置</li>
            </ol>
          </div>
          <div class="qr-tip">
            <div>💡 提示</div>
            <p>扫码配置会自动创建飞书应用并获取 App ID 和 Secret，无需手动填写。</p>
          </div>
          <button class="btn btn-primary" :disabled="loading" @click="emit('start')">
            {{ loading ? '生成中...' : '📱 生成扫码链接' }}
          </button>
        </div>

        <div class="qr-preview">
          <div class="qr-box">
            <template v-if="url">
              <img :src="'https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=' + encodeURIComponent(url)" alt="飞书扫码">
            </template>
            <template v-else>
              <span class="qr-placeholder-icon">📱</span>
              <span>等待生成二维码</span>
            </template>
          </div>
          <a v-if="url" :href="url" target="_blank">🔗 点击打开授权页面</a>
          <div v-if="status" class="qr-status">{{ status }}</div>
        </div>
      </div>

      <div class="qr-footer">
        <button class="btn btn-primary" @click="emit('close')">关闭</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.feishu-qr-modal {
  min-width: 500px;
}

.qr-layout {
  display: flex;
  gap: 24px;
  margin-top: 16px;
}

.qr-instructions {
  flex: 1;
}

.qr-steps {
  margin-bottom: 16px;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.8;
}

.qr-steps-title {
  margin-bottom: 8px;
  color: var(--text-primary);
  font-weight: 500;
}

.qr-steps ol {
  padding-left: 20px;
}

.qr-tip {
  padding: 12px;
  background: rgba(56, 189, 248, 0.05);
  border: 1px solid rgba(56, 189, 248, 0.2);
  border-radius: 8px;
}

.qr-tip div {
  color: var(--accent-blue);
  font-size: 12px;
}

.qr-tip p {
  margin: 4px 0 0;
  color: var(--text-muted);
  font-size: 11px;
}

.qr-instructions .btn {
  width: 100%;
  margin-top: 16px;
}

.qr-preview {
  width: 220px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.qr-box {
  width: 200px;
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 8px;
  border: 2px dashed var(--border-color);
  border-radius: 12px;
  color: var(--text-muted);
  font-size: 11px;
}

.qr-box img {
  width: 180px;
  height: 180px;
  border-radius: 8px;
}

.qr-placeholder-icon {
  font-size: 48px;
  opacity: 0.3;
}

.qr-preview a {
  margin-top: 8px;
  color: var(--accent-blue);
  font-size: 11px;
}

.qr-status {
  margin-top: 8px;
  color: var(--text-muted);
  font-size: 11px;
  text-align: center;
}

.qr-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--border-color);
}

@media (max-width: 640px) {
  .qr-layout {
    flex-direction: column;
    gap: 16px;
  }

  .qr-preview {
    width: 100%;
  }

  .qr-box {
    width: min(200px, 100%);
    aspect-ratio: 1;
    height: auto;
  }

  .qr-box img {
    width: min(180px, calc(100% - 20px));
    height: auto;
    aspect-ratio: 1;
  }
}
</style>
