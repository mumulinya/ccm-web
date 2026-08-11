<script setup>
defineProps({
  name: { type: String, default: '' },
  placeholder: { type: String, default: '' },
})

const emit = defineEmits(['close', 'submit', 'update:name'])
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal group-rename-modal">
      <button class="modal-close" @click="emit('close')">&times;</button>
      <h3>✏️ 重命名群聊</h3>
      <div class="form-group">
        <label>新名称</label>
        <input :value="name" :placeholder="placeholder" @input="emit('update:name', $event.target.value)">
      </div>
      <div class="form-actions">
        <button class="btn btn-cancel" @click="emit('close')">取消</button>
        <button class="btn btn-primary" @click="emit('submit')">确定</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.group-rename-modal { min-width: 420px; }
.form-group { margin-bottom: 18px; }
.form-group label { display: block; font-size: 12.5px; color: var(--text-secondary); margin-bottom: 8px; font-weight: 500; }
.form-group input { width:100%; height:var(--control-height-lg,36px); box-sizing:border-box; padding:0 var(--control-padding-x,10px); border-radius:var(--radius-md,6px); border:1px solid var(--border-color); background:var(--control-bg); color:var(--text-primary); font-size:12px; outline:none; }
.form-group input:focus { border-color:var(--accent-blue); box-shadow:var(--focus-ring); }
.form-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 24px; }
</style>
