<script setup>
defineProps({
  name: { type: String, default: '' },
  projects: { type: Array, default: () => [] },
})

const emit = defineEmits(['close', 'submit', 'update:name', 'toggle-project'])
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal group-create-modal">
      <button class="modal-close" @click="emit('close')">&times;</button>
      <h3>新建群聊</h3>
      <div class="form-group">
        <label>群聊名称</label>
        <input :value="name" placeholder="如：智评生活开发群" @input="emit('update:name', $event.target.value)">
      </div>
      <div class="form-group">
        <label>选择加入的项目执行成员</label>
        <div class="checkbox-list">
          <label v-for="project in projects" :key="project.name" class="checkbox-item">
            <input
              type="checkbox"
              :checked="project.selected"
              @change="emit('toggle-project', { name: project.name, selected: $event.target.checked })"
            >
            <span>{{ project.name }}</span>
            <span class="tag">{{ project.agent }}</span>
          </label>
        </div>
      </div>
      <div class="form-actions">
        <button class="btn btn-cancel" @click="emit('close')">取消</button>
        <button class="btn btn-primary" @click="emit('submit')">创建</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.group-create-modal { min-width: 420px; }
.form-group { margin-bottom: 18px; }
.form-group label { display: block; font-size: 12.5px; color: var(--text-secondary); margin-bottom: 8px; font-weight: 500; }
.form-group input { width: 100%; padding: 10px 14px; border-radius: 10px; border: 1px solid rgba(0, 0, 0, 0.08); background: rgba(255, 255, 255, 0.8); color: var(--text-primary); font-size: 13px; outline: none; }
.checkbox-list { max-height: 200px; overflow-y: auto; padding: 6px 0; }
.checkbox-item { display: flex; align-items: center; gap: 8px; padding: 6px 8px; cursor: pointer; border-radius: 6px; transition: background 0.2s; }
.checkbox-item:hover { background: rgba(0,0,0,0.02); }
.checkbox-item input { width: auto; accent-color: var(--accent-blue); }
.tag { font-size: 10px; padding: 2px 6px; background: rgba(0,0,0,0.04); border-radius: 4px; color: var(--text-muted); font-family: 'Share Tech Mono', monospace; }
.form-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 24px; }
</style>
