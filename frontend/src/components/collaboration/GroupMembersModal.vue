<script setup>
defineProps({
  groupName: { type: String, default: '' },
  members: { type: Array, default: () => [] },
  availableProjects: { type: Array, default: () => [] }
})

const emit = defineEmits(['close', 'add-member', 'remove-member'])
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal members-modal">
      <button class="modal-close" @click="emit('close')">&times;</button>
      <h3>👥 成员管理 - {{ groupName }}</h3>

      <div class="member-section">
        <div class="section-label">当前成员</div>
        <div class="tag-list">
          <span class="tag coordinator">🎯 协调者（主 Agent，不可移除）</span>
          <template v-for="member in members" :key="member.project">
            <span class="tag removable">
              {{ member.project }}
              <button @click="emit('remove-member', member.project)">&times;</button>
            </span>
          </template>
        </div>
      </div>

      <div v-if="availableProjects.length > 0" class="member-section">
        <div class="section-label">添加成员</div>
        <div class="tag-list">
          <button
            v-for="project in availableProjects"
            :key="project.name"
            class="btn btn-outline btn-sm"
            @click="emit('add-member', project.name, project.agent || 'claudecode')"
          >
            + {{ project.name }}
          </button>
        </div>
      </div>
      <div v-else class="empty">所有项目都已加入群聊</div>

      <div class="modal-footer">
        <button class="btn btn-primary" @click="emit('close')">关闭</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.18); backdrop-filter: blur(12px); display: flex; align-items: center; justify-content: center; z-index: 10001; }
.modal { background: rgba(255, 255, 255, 0.75) !important; backdrop-filter: blur(30px) !important; border: 1px solid rgba(0, 0, 0, 0.06) !important; border-radius: 16px !important; padding: 28px; min-width: 420px; box-shadow: 0 20px 50px rgba(15, 23, 42, 0.08), 0 0 30px rgba(59, 130, 246, 0.04) !important; position: relative; }
.members-modal { min-width: 450px; }
.modal-close { position: absolute; top: 16px; right: 16px; width: 28px; height: 28px; border-radius: 8px; border: 1px solid rgba(0, 0, 0, 0.05); background: rgba(0,0,0,0.02); color: var(--text-secondary); cursor: pointer; }
.modal h3 { margin: 0 0 18px; font-size: 16px; color: var(--text-primary); }
.member-section { margin-bottom: 16px; }
.section-label { font-size: 13px; color: var(--text-secondary); margin-bottom: 8px; }
.tag-list { display: flex; flex-wrap: wrap; gap: 6px; }
.tag { border-radius: 4px; font-size: 11px; background: rgba(0,0,0,0.04); color: var(--text-secondary); }
.tag.coordinator { background: rgba(56,189,248,0.1); color: var(--accent-blue); padding: 6px 12px; }
.tag.removable { padding: 6px 8px 6px 12px; display: flex; align-items: center; gap: 4px; }
.tag.removable button { border: none; background: transparent; color: var(--accent-red); cursor: pointer; font-size: 14px; }
.empty { color: var(--text-muted); font-size: 13px; padding: 8px 0; }
.modal-footer { display: flex; justify-content: flex-end; margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--border-color); }
.btn { padding: 8px 16px; border-radius: 8px; border: none; cursor: pointer; font-size: 13px; transition: all 0.2s; }
.btn-sm { padding: 5px 10px; font-size: 12px; }
.btn-primary { background: var(--gradient-blue); color: white; }
.btn-outline { background: transparent; border: 1px solid rgba(0, 0, 0, 0.08); color: var(--text-secondary); }
</style>
