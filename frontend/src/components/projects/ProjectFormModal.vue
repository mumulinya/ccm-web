<script setup>
const props = defineProps({
  mode: { type: String, required: true },
  project: { type: Object, default: null },
  form: { type: Object, required: true },
  agentOptions: { type: Array, default: () => [] },
  platforms: { type: Array, default: () => [] },
})

const emit = defineEmits(['close', 'submit', 'browse', 'open-feishu', 'update-field'])

const updateField = (field, event) => {
  emit('update-field', { field, value: event.target.value })
}
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal">
      <button class="modal-close" @click="emit('close')">&times;</button>
      <h3>{{ mode === 'create' ? '新建项目' : `编辑项目 - ${project?.name || form.name}` }}</h3>

      <div v-if="mode === 'create'" class="form-group">
        <label>项目名称</label>
        <input :value="form.name" placeholder="如 my-app" @input="updateField('name', $event)">
      </div>

      <div class="form-group">
        <label>{{ mode === 'create' ? '代码目录路径' : '代码目录' }}</label>
        <div class="inline-field">
          <input :value="form.work_dir" :placeholder="mode === 'create' ? '如 D:\\projects\\my-app' : '项目代码目录路径'" @input="updateField('work_dir', $event)">
          <button class="btn btn-outline btn-sm" @click="emit('browse', 'work_dir')">📁 浏览</button>
        </div>
      </div>

      <div class="form-group">
        <label>{{ mode === 'create' ? 'Agent' : 'Agent 类型' }}</label>
        <select :value="form.agent" @change="updateField('agent', $event)">
          <option v-for="agent in agentOptions" :key="agent.type" :value="agent.type">{{ agent.name }}</option>
        </select>
      </div>

      <div class="form-group">
        <label>平台</label>
        <select :value="form.platform" @change="updateField('platform', $event)">
          <option v-for="p in platforms" :key="p.value" :value="p.value">{{ p.label }}</option>
        </select>
      </div>

      <div v-if="form.platform === 'feishu' || form.platform === 'lark'" class="feishu-action">
        <button class="btn btn-outline" @click="emit('open-feishu')">🤖 扫码创建飞书机器人</button>
        <div>自动配置飞书机器人并获取凭证</div>
      </div>

      <div class="form-actions">
        <button class="btn btn-cancel" @click="emit('close')">取消</button>
        <button class="btn btn-primary" @click="emit('submit')">{{ mode === 'create' ? '创建' : '保存修改' }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.inline-field {
  display: flex;
  gap: 8px;
}

.inline-field input {
  flex: 1;
}

.feishu-action {
  margin-bottom: 16px;
}

.feishu-action .btn {
  width: 100%;
}

.feishu-action div {
  margin-top: 4px;
  color: var(--text-muted);
  font-size: 11px;
  text-align: center;
}
</style>
