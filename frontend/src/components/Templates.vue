<script setup>
import { ref, onMounted, inject } from 'vue'
import { toast, confirmDialog } from '../utils/toast.js'
import { projectsApi, groupsApi } from '../api/index.js'

const applyTemplate = inject('applyTemplate', null)

const templates = ref([])
const selectedCategory = ref('')
const searchQuery = ref('')

const categories = [
  { id: '', name: '全部', icon: '📚' },
  { id: 'development', name: '开发', icon: '💻' },
  { id: 'maintenance', name: '维护', icon: '🔧' },
  { id: 'review', name: '审查', icon: '🔍' },
  { id: 'collaboration', name: '协作', icon: '🤝' },
  { id: 'planning', name: '规划', icon: '📋' },
  { id: 'custom', name: '自定义', icon: '✏️' },
]

// 弹窗相关状态
const showEditModal = ref(false)
const isEditing = ref(false)
const tagsInputText = ref('')
const currentTemplate = ref({
  id: '',
  name: '',
  category: 'development',
  description: '',
  icon: '📝',
  prompt: '',
  tags: []
})

const loadTemplates = async () => {
  const url = selectedCategory.value ? `/api/templates?category=${selectedCategory.value}` : '/api/templates'
  const res = await fetch(url)
  const data = await res.json()
  templates.value = data.templates || []
}

const filteredTemplates = () => {
  if (!searchQuery.value) return templates.value
  const q = searchQuery.value.toLowerCase()
  return templates.value.filter(t =>
    t.name.toLowerCase().includes(q) ||
    (t.description || '').toLowerCase().includes(q)
  )
}

// 会话分发弹窗状态
const showSelectTargetModal = ref(false)
const targetSessionType = ref('group')
const selectedProjectForTemplate = ref('')
const selectedGroupForTemplate = ref('')
const projectsList = ref([])
const groupsList = ref([])
const templateToUse = ref(null)

const useTemplate = async (template) => {
  templateToUse.value = template
  try {
    const [projData, groupData] = await Promise.all([
      projectsApi.list(),
      groupsApi.list()
    ])
    projectsList.value = projData.projects || []
    groupsList.value = groupData.groups || []
    
    if (projectsList.value.length > 0) {
      selectedProjectForTemplate.value = projectsList.value[0].name
    }
    if (groupsList.value.length > 0) {
      selectedGroupForTemplate.value = groupsList.value[0].id
    }
  } catch (e) {
    toast.error('加载会话列表失败')
  }
  showSelectTargetModal.value = true
}

const confirmUseTemplate = () => {
  if (!templateToUse.value) return
  
  if (targetSessionType.value === 'group') {
    if (!selectedGroupForTemplate.value) {
      toast.warning('请选择目标群聊')
      return
    }
    if (applyTemplate) {
      applyTemplate(templateToUse.value, 'groups', selectedGroupForTemplate.value)
      toast.success(`已应用模板 "${templateToUse.value.name}" 并跳转至群聊`)
    } else {
      copyToClipboard(templateToUse.value)
    }
  } else {
    if (!selectedProjectForTemplate.value) {
      toast.warning('请选择目标项目')
      return
    }
    if (applyTemplate) {
      applyTemplate(templateToUse.value, 'projects', selectedProjectForTemplate.value)
      toast.success(`已应用模板 "${templateToUse.value.name}" 并跳转至项目 [${selectedProjectForTemplate.value}]`)
    } else {
      copyToClipboard(templateToUse.value)
    }
  }
  showSelectTargetModal.value = false
  templateToUse.value = null
}

const copyToClipboard = (template) => {
  navigator.clipboard.writeText(template.prompt).then(() => {
    toast.success(`模板 "${template.name}" 已复制到剪贴板`)
  }).catch(() => {
    toast.error('复制失败，请手动复制')
  })
}

const deleteTemplate = async (id) => {
  const confirmed = await confirmDialog('确定删除此模板？删除后无法恢复。')
  if (!confirmed) return
  await fetch(`/api/templates/${id}`, { method: 'DELETE' })
  loadTemplates()
  toast.success('模板已删除')
}

// 打开创建弹窗
const openCreateModal = () => {
  isEditing.value = false
  currentTemplate.value = {
    id: '',
    name: '',
    category: 'development',
    description: '',
    icon: '📝',
    prompt: '',
    tags: []
  }
  tagsInputText.value = ''
  showEditModal.value = true
}

// 打开编辑弹窗
const openEditModal = (template) => {
  isEditing.value = true
  currentTemplate.value = { ...template, tags: [...(template.tags || [])] }
  tagsInputText.value = (template.tags || []).join(', ')
  showEditModal.value = true
}

// 保存模板
const saveTemplate = async () => {
  if (!currentTemplate.value.name.trim()) {
    toast.warning('请输入模板名称')
    return
  }
  if (!currentTemplate.value.prompt.trim()) {
    toast.warning('请输入提示词内容')
    return
  }

  currentTemplate.value.tags = tagsInputText.value
    ? tagsInputText.value.split(/[,，\s]+/).map(t => t.trim()).filter(Boolean)
    : []

  const isNew = !isEditing.value
  const url = isNew ? '/api/templates' : `/api/templates/${currentTemplate.value.id}`
  const method = isNew ? 'POST' : 'PUT'

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(currentTemplate.value)
    })
    const data = await res.json()
    if (data.success) {
      toast.success(isNew ? '模板创建成功！' : '模板已更新！')
      showEditModal.value = false
      loadTemplates()
    } else {
      toast.error('保存失败: ' + (data.error || '未知错误'))
    }
  } catch (error) {
    toast.error('保存出错，请稍后重试')
  }
}

onMounted(loadTemplates)
</script>

<template>
  <div class="templates">
    <div class="toolbar">
      <div style="display:flex;align-items:center;gap:12px">
        <select v-model="selectedCategory" @change="loadTemplates" class="select">
          <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.icon }} {{ c.name }}</option>
        </select>
        <input v-model="searchQuery" placeholder="搜索模板..." class="search-input">
      </div>
      <button class="btn btn-primary" @click="openCreateModal">+ 新建模板</button>
    </div>

    <div class="template-list">
      <div v-if="filteredTemplates().length === 0" class="empty">
        <span class="icon">📚</span>
        <span>暂无模板</span>
      </div>
      <div class="template-grid">
        <div v-for="t in filteredTemplates()" :key="t.id" class="template-card">
          <div class="card-header">
            <span class="card-icon">{{ t.icon || '📝' }}</span>
            <div>
              <div class="card-title">{{ t.name }}</div>
              <div class="card-desc">{{ t.description || '' }}</div>
            </div>
          </div>
          <div class="card-tags">
            <span v-for="tag in (t.tags || [])" :key="tag" class="tag">{{ tag }}</span>
          </div>
          <div class="card-preview">{{ (t.prompt || '').substring(0, 120) }}{{ (t.prompt || '').length > 120 ? '...' : '' }}</div>
          <div class="card-actions">
            <button class="btn btn-primary btn-sm" @click="useTemplate(t)">使用模板</button>
            <button class="btn btn-outline btn-sm" @click="openEditModal(t)">编辑</button>
            <button class="btn btn-danger btn-sm" style="background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.18); color: #dc2626;" @click="deleteTemplate(t.id)">删除</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 新建/编辑模板弹窗 -->
    <div v-if="showEditModal" class="modal-overlay" @click.self="showEditModal = false">
      <div class="modal" style="min-width: 500px; max-height: 85vh; display: flex; flex-direction: column;">
        <button class="modal-close" @click="showEditModal = false">&times;</button>
        <h3>{{ isEditing ? '✏️ 编辑模板' : '➕ 新建模板' }}</h3>
        
        <div style="flex: 1; overflow-y: auto; padding-right: 4px; margin-top: 12px;">
          <div style="display: grid; grid-template-columns: 80px 1fr; gap: 12px;">
            <div class="form-group">
              <label>图标 (Emoji)</label>
              <input v-model="currentTemplate.icon" placeholder="📝" style="text-align: center; font-size: 20px;">
            </div>
            <div class="form-group">
              <label>模板名称</label>
              <input v-model="currentTemplate.name" placeholder="如：前端开发规范">
            </div>
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div class="form-group">
              <label>类别</label>
              <select v-model="currentTemplate.category" class="select" style="width: 100%; height: 38px;">
                <option v-for="c in categories.filter(c => c.id !== '')" :key="c.id" :value="c.id">
                  {{ c.icon }} {{ c.name }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>标签 (空格或逗号分隔)</label>
              <input v-model="tagsInputText" placeholder="如：前端, Vue, 规范">
            </div>
          </div>

          <div class="form-group">
            <label>模板描述</label>
            <input v-model="currentTemplate.description" placeholder="简单介绍该模板的用途">
          </div>

          <div class="form-group">
            <label>提示词内容 (支持 {变量名} 占位符)</label>
            <textarea v-model="currentTemplate.prompt" rows="8" placeholder="在此输入提示词内容。如果需要插入时动态输入，请使用大括号包裹变量，例如：请帮我开发 {页面名称}..." style="width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px solid rgba(0, 0, 0, 0.08); background: rgba(255, 255, 255, 0.8); color: var(--text-primary); font-size: 13px; font-family: monospace; resize: vertical; outline: none;"></textarea>
          </div>
        </div>

        <div class="form-actions" style="margin-top: 16px; padding-top: 12px; border-top: 1px solid rgba(0,0,0,0.05);">
          <button class="btn btn-cancel" @click="showEditModal = false">取消</button>
          <button class="btn btn-primary" @click="saveTemplate">保存</button>
        </div>
      </div>
    </div>

    <!-- 选择使用会话弹窗 -->
    <div v-if="showSelectTargetModal" class="modal-overlay" @click.self="showSelectTargetModal = false">
      <div class="modal" style="min-width: 420px; padding: 24px; display: flex; flex-direction: column;">
        <button class="modal-close" @click="showSelectTargetModal = false">&times;</button>
        <h3 style="margin-bottom: 16px; font-size: 16px; display: flex; align-items: center; gap: 8px;">🎯 选择使用模板的目标会话</h3>
        
        <div style="flex: 1; margin-top: 8px;">
          <div class="form-group" style="margin-bottom: 18px;">
            <label style="font-weight: 600;">选择会话类型</label>
            <div style="display: flex; gap: 16px; margin-top: 8px;">
              <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 13.5px; color: var(--text-primary);">
                <input type="radio" v-model="targetSessionType" value="group" style="width: auto; margin: 0;">
                💬 群聊协作 (Coordinator)
              </label>
              <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 13.5px; color: var(--text-primary);">
                <input type="radio" v-model="targetSessionType" value="project" style="width: auto; margin: 0;">
                💻 项目 Agent 单聊
              </label>
            </div>
          </div>

          <div v-if="targetSessionType === 'group'" class="form-group" style="margin-top: 12px;">
            <label style="font-weight: 600;">选择目标群聊</label>
            <select v-model="selectedGroupForTemplate" class="select" style="width: 100%; margin-top: 8px; box-sizing: border-box;">
              <option v-for="g in groupsList" :key="g.id" :value="g.id">
                💬 {{ g.name || '未命名群聊' }} ({{ g.members?.length || 0 }} 成员)
              </option>
            </select>
            <div v-if="groupsList.length === 0" style="font-size: 11px; color: var(--accent-red); margin-top: 6px;">
              ⚠️ 当前暂无可用的群聊，请先前往“群聊协作”创建群聊。
            </div>
          </div>

          <div v-if="targetSessionType === 'project'" class="form-group" style="margin-top: 12px;">
            <label style="font-weight: 600;">选择目标项目</label>
            <select v-model="selectedProjectForTemplate" class="select" style="width: 100%; margin-top: 8px; box-sizing: border-box;">
              <option v-for="p in projectsList" :key="p.name" :value="p.name">
                📂 {{ p.name }} ({{ p.agent || 'Agent' }})
              </option>
            </select>
            <div v-if="projectsList.length === 0" style="font-size: 11px; color: var(--accent-red); margin-top: 6px;">
              ⚠️ 当前暂无可用的项目，请先前往“项目管理”创建项目。
            </div>
          </div>
        </div>

        <div class="form-actions" style="margin-top: 24px; padding-top: 12px; border-top: 1px solid rgba(0,0,0,0.05);">
          <button class="btn btn-cancel" @click="showSelectTargetModal = false">取消</button>
          <button class="btn btn-primary" @click="confirmUseTemplate" :disabled="(targetSessionType === 'group' && groupsList.length === 0) || (targetSessionType === 'project' && projectsList.length === 0)">确认使用</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.templates { display: flex; flex-direction: column; height: 100%; }
.toolbar { display: flex; align-items: center; justify-content: space-between; padding: 12px 20px; background: rgba(255, 255, 255, 0.25); border-bottom: 1px solid rgba(0, 0, 0, 0.05); }
.select { padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(0, 0, 0, 0.08); background: rgba(255, 255, 255, 0.85); color: var(--text-primary); font-size: 13px; outline: none; }
.search-input { padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(0, 0, 0, 0.08); background: rgba(255, 255, 255, 0.85); color: var(--text-primary); font-size: 13px; outline: none; min-width: 200px; }
.template-list { flex: 1; overflow-y: auto; padding: 20px; }
.template-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
.template-card { background: rgba(255, 255, 255, 0.45); backdrop-filter: blur(25px); border: 1px solid rgba(0, 0, 0, 0.05); border-radius: 12px; padding: 20px; transition: all 0.2s; box-shadow: 0 8px 32px 0 rgba(15, 23, 42, 0.04); }
.template-card:hover { border-color: rgba(59, 130, 246, 0.25); transform: translateY(-2px); box-shadow: 0 12px 30px rgba(59, 130, 246, 0.08); }
.card-header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.card-icon { font-size: 28px; }
.card-title { font-size: 15px; font-weight: 600; color: var(--text-primary); }
.card-desc { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
.card-tags { display: flex; gap: 6px; margin-bottom: 12px; }
.tag { font-size: 11px; padding: 2px 8px; background: rgba(59, 130, 246, 0.08); color: var(--accent-blue); border-radius: 4px; }
.card-preview { font-size: 12px; color: var(--text-muted); line-height: 1.5; max-height: 50px; overflow: hidden; margin-bottom: 12px; word-break: break-all; }
.card-actions { display: flex; gap: 8px; padding-top: 12px; border-top: 1px solid rgba(0, 0, 0, 0.05); }
.empty { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 200px; gap: 8px; color: var(--text-muted); }
.icon { font-size: 40px; opacity: 0.5; }

/* 按钮通用样式 */
.btn { padding: 8px 16px; border-radius: 10px; border: none; cursor: pointer; font-size: 13px; transition: all 0.2s; }
.btn-primary { background: var(--gradient-blue); color: white; font-weight: 600; }
.btn-outline { background: transparent; border: 1px solid rgba(0, 0, 0, 0.08); color: var(--text-secondary); }
.btn-danger { background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.18); color: #dc2626; }
.btn-cancel { background: rgba(0, 0, 0, 0.02); border: 1px solid rgba(0, 0, 0, 0.06); color: var(--text-secondary); }
.btn-sm { padding: 5px 10px; font-size: 12px; }

/* 弹窗及表单样式 */
.modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.18); backdrop-filter: blur(12px); display: flex; align-items: center; justify-content: center; z-index: 10001; }
.modal { background: rgba(255, 255, 255, 0.75) !important; backdrop-filter: blur(30px) !important; border: 1px solid rgba(0, 0, 0, 0.06) !important; border-radius: 16px !important; padding: 28px; box-shadow: 0 20px 50px rgba(15, 23, 42, 0.08), 0 0 30px rgba(59, 130, 246, 0.04) !important; position: relative; }
.modal-close { position: absolute; top: 16px; right: 16px; width: 28px; height: 28px; border-radius: 8px; border: 1px solid rgba(0, 0, 0, 0.05); background: rgba(0,0,0,0.02); color: var(--text-secondary); cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 16px; }
.form-group { margin-bottom: 18px; }
.form-group label { display: block; font-size: 12.5px; color: var(--text-secondary); margin-bottom: 8px; font-weight: 500; }
.form-group input { width: 100%; padding: 10px 14px; border-radius: 10px; border: 1px solid rgba(0, 0, 0, 0.08); background: rgba(255, 255, 255, 0.8); color: var(--text-primary); font-size: 13px; outline: none; }
.form-actions { display: flex; gap: 10px; justify-content: flex-end; }

/* 暗色主题适配 */
[data-theme="dark"] .modal {
  background: var(--surface) !important;
  border-color: var(--border-color) !important;
}
[data-theme="dark"] .form-group input,
[data-theme="dark"] .form-group textarea,
[data-theme="dark"] .select {
  background: var(--bg-primary) !important;
  border-color: var(--border-color) !important;
  color: var(--text-primary) !important;
}

@media (max-width: 768px) {
  .template-grid { grid-template-columns: 1fr !important; }
  .modal-overlay { padding: 0 !important; align-items: flex-end !important; }
  .modal { min-width: 0 !important; width: 100% !important; max-height: 90vh; border-radius: 16px 16px 0 0 !important; }
}
</style>
