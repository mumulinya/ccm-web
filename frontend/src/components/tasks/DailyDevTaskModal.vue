<script setup>
defineProps({
  task: { type: Object, required: true },
  groups: { type: Array, default: () => [] },
  quality: { type: Object, required: true },
  groupCanExecute: { type: Boolean, default: false },
  groupMessage: { type: String, default: '' },
})

const emit = defineEmits(['close', 'submit', 'update-field'])

const updateField = (field, value) => emit('update-field', { field, value })
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal daily-dev-modal">
      <button class="modal-close" @click="emit('close')">&times;</button>
      <h3>业务开发任务</h3>
      <div class="form-group">
        <label>任务标题</label>
        <input :value="task.title" placeholder="如 订单退款审核功能" @input="updateField('title', $event.target.value)">
      </div>
      <div class="form-group">
        <label>业务目标</label>
        <textarea :value="task.businessGoal" rows="3" placeholder="说明你希望最终实现的业务能力" @input="updateField('businessGoal', $event.target.value)"></textarea>
      </div>
      <div class="form-group">
        <label>开发范围</label>
        <textarea :value="task.scope" rows="3" placeholder="例如后端接口、前端页面、权限、日志、测试等范围" @input="updateField('scope', $event.target.value)"></textarea>
      </div>
      <div class="form-group">
        <label>业务/接口文档</label>
        <textarea :value="task.documents" rows="3" placeholder="粘贴 PRD、接口字段、共享文件名或文档链接" @input="updateField('documents', $event.target.value)"></textarea>
      </div>
      <div class="form-group">
        <label>验收标准</label>
        <textarea :value="task.acceptance" rows="3" placeholder="列出主 Agent 最终报告必须证明的完成标准" @input="updateField('acceptance', $event.target.value)"></textarea>
      </div>
      <div class="form-group">
        <label>约束/注意事项</label>
        <textarea :value="task.constraints" rows="2" placeholder="例如不要改动某模块、必须兼容旧接口、需要保留现有样式" @input="updateField('constraints', $event.target.value)"></textarea>
      </div>
      <div class="form-group">
        <label>开发群聊</label>
        <select :value="task.groupId" @change="updateField('groupId', $event.target.value)">
          <option v-for="g in groups" :key="g.id" :value="g.id">{{ g.name }}</option>
        </select>
        <div :class="['daily-dev-readiness', groupCanExecute ? 'ok' : 'warn']">
          {{ groupMessage }}
        </div>
      </div>
      <div :class="['daily-dev-quality', quality.pass ? 'ok' : 'warn']">
        <strong>需求质量 {{ quality.score }}/{{ quality.total }}</strong>
        <span v-if="quality.pass">信息足够，主 Agent 可以稳定拆分执行。</span>
        <span v-else>建议补充：{{ quality.missing.join('、') }}</span>
      </div>
      <div class="form-group">
        <label>优先级</label>
        <select :value="task.priority" @change="updateField('priority', $event.target.value)">
          <option value="high">🔴 高</option>
          <option value="normal">🟡 中</option>
          <option value="low">⚪ 低</option>
        </select>
      </div>
      <div class="form-group">
        <label class="checkbox-line">
          <input type="checkbox" :checked="task.autoExecute" @change="updateField('autoExecute', $event.target.checked)">
          创建后立即交给主 Agent 执行
        </label>
      </div>
      <div class="form-group">
        <label class="checkbox-line">
          <input type="checkbox" :checked="task.requiresCodeChanges" @change="updateField('requiresCodeChanges', $event.target.checked)">
          完成时必须有实际代码变更
        </label>
      </div>
      <div class="form-group">
        <label class="checkbox-line">
          <input type="checkbox" :checked="task.persistDocuments" @change="updateField('persistDocuments', $event.target.checked)">
          写入群聊需求池，供主 Agent 和定时任务后续读取
        </label>
      </div>
      <div class="form-actions">
        <button class="btn btn-cancel" @click="emit('close')">取消</button>
        <button class="btn btn-primary" :disabled="!groupCanExecute" @click="emit('submit')">{{ task.autoExecute ? '交给主 Agent' : '仅创建任务' }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.daily-dev-modal { min-width: min(720px, calc(100vw - 32px)) !important; max-height: 88vh; overflow-y: auto; }
.form-group textarea {
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: rgba(255, 255, 255, 0.85);
  color: var(--text-primary);
  font-size: 13px;
  resize: vertical;
  outline: none;
}
.checkbox-line { display: flex; align-items: center; gap: 8px; }
.checkbox-line input { accent-color: var(--accent-blue); }
.daily-dev-readiness { margin-top: 7px; padding: 7px 9px; border-radius: 6px; font-size: 11.5px; line-height: 1.45; overflow-wrap: anywhere; }
.daily-dev-readiness.ok { border: 1px solid rgba(34, 197, 94, 0.18); background: rgba(34, 197, 94, 0.08); color: var(--accent-green); }
.daily-dev-readiness.warn { border: 1px solid rgba(234, 179, 8, 0.24); background: rgba(234, 179, 8, 0.09); color: #854d0e; }
.daily-dev-quality { display: flex; flex-direction: column; gap: 3px; margin-bottom: 16px; padding: 8px 10px; border-radius: 7px; font-size: 11.5px; line-height: 1.45; }
.daily-dev-quality.ok { border: 1px solid rgba(34, 197, 94, 0.18); background: rgba(34, 197, 94, 0.07); color: var(--accent-green); }
.daily-dev-quality.warn { border: 1px solid rgba(234, 179, 8, 0.24); background: rgba(234, 179, 8, 0.09); color: #854d0e; }
.daily-dev-quality strong { font-size: 12px; }
</style>
