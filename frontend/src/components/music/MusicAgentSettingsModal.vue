<script setup>
defineProps({
  config: { type: Object, required: true },
})

const emit = defineEmits(['close', 'save', 'update-proxy'])
</script>

<template>
  <div class="settings-overlay" @click.self="emit('close')">
    <div class="settings-modal">
      <div class="settings-header">
        <span>⚙️ 音乐 Agent 设置</span>
        <button class="close-btn" @click="emit('close')">&times;</button>
      </div>
      <div class="settings-body">
        <div class="config-summary">
          <div class="summary-title">统一大模型配置</div>
          <div class="summary-row">
            <span>来源</span>
            <strong>{{ config.sourceLabel || '系统设置 / 统一大模型配置' }}</strong>
          </div>
          <div class="summary-row">
            <span>状态</span>
            <strong>{{ config.enabled ? (config.hasKey && config.model ? '已就绪' : '待完善') : '已关闭' }}</strong>
          </div>
          <div class="summary-row">
            <span>模型</span>
            <strong>{{ config.model || '未配置' }}</strong>
          </div>
          <div class="summary-row">
            <span>接口</span>
            <strong>{{ config.apiUrl || '未配置' }}</strong>
          </div>
          <span class="hint">音乐 Agent 与群聊主 Agent 共用系统设置里的统一大模型配置。需要修改 API Key、模型或接口地址时，请到“系统设置 → 统一大模型配置”。</span>
        </div>
        <div class="field">
          <label>音乐网络代理（可选）</label>
          <input :value="config.proxy" placeholder="http://127.0.0.1:7890" @input="emit('update-proxy', $event.target.value)" />
          <span class="hint">B站搜索被封时配置代理，支持 http/socks5</span>
        </div>
      </div>
      <div class="settings-footer">
        <button class="btn-aura" @click="emit('close')">取消</button>
        <button class="btn-aura btn-primary" @click="emit('save')">保存</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-overlay {
  position: fixed;
  inset: 0;
  z-index: 10020;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(3, 2, 10, 0.7);
  backdrop-filter: blur(16px);
}

.settings-modal {
  width: min(520px, 92vw);
  overflow: hidden;
  border: 1px solid rgba(165, 139, 255, 0.22);
  border-radius: 18px;
  background: rgba(17, 13, 32, 0.96);
  color: #e2d8ff;
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.55), 0 0 36px rgba(123, 97, 255, 0.16);
}

.settings-header,
.settings-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px;
  border-bottom: 1px solid rgba(165, 139, 255, 0.14);
}

.settings-header span {
  font-size: 15px;
  font-weight: 800;
}

.close-btn {
  width: 30px;
  height: 30px;
  cursor: pointer;
  border: 1px solid rgba(165, 139, 255, 0.18);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  color: #d8ccff;
  font-size: 18px;
}

.settings-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 18px;
}

.config-summary {
  display: grid;
  gap: 9px;
  padding: 14px;
  border: 1px solid rgba(165, 139, 255, 0.14);
  border-radius: 14px;
  background: rgba(165, 139, 255, 0.06);
}

.summary-title {
  color: #d8ccff;
  font-size: 13px;
  font-weight: 800;
}

.summary-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  font-size: 12px;
}

.summary-row span,
.hint {
  color: #a58bff;
}

.summary-row strong {
  color: #f5f0ff;
  text-align: right;
  font-weight: 700;
  word-break: break-all;
}

.field {
  display: grid;
  gap: 8px;
}

.field label {
  color: #d8ccff;
  font-size: 12px;
  font-weight: 700;
}

.field input {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  border: 1px solid rgba(165, 139, 255, 0.18);
  border-radius: 10px;
  outline: none;
  background: rgba(7, 5, 16, 0.72);
  color: #f5f0ff;
  font-size: 13px;
}

.hint {
  font-size: 11px;
  line-height: 1.55;
}

.settings-footer {
  justify-content: flex-end;
  gap: 10px;
  border-top: 1px solid rgba(165, 139, 255, 0.14);
  border-bottom: none;
}

.btn-aura {
  padding: 8px 14px;
  cursor: pointer;
  border: 1px solid rgba(165, 139, 255, 0.18);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  color: #d8ccff;
  font-size: 12px;
  font-weight: 800;
}

.btn-primary {
  border-color: rgba(165, 139, 255, 0.5);
  background: #d8ccff;
  color: #10091f;
}
</style>
