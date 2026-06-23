<script setup>
import { ref, computed, onMounted } from 'vue'

const props = defineProps({
  tabs: { type: Array, default: () => [] }
})

const emit = defineEmits(['update-groups'])

const groups = ref([])
const tabGroups = ref({})
const editingGroup = ref(null)
const showAddGroup = ref(false)
const showManageGroups = ref(false) // 管理分组模态弹窗开关

// 自定义外部链接菜单状态
const showAddLink = ref(false)
const newLink = ref({ label: '', url: 'https://', icon: '🌐' })
const newGroup = ref({ label: '', icon: '📁' })

const DEFAULT_GROUPS = [
  { id: 'core', label: '核心功能', icon: '⭐' },
  { id: 'dev', label: '开发工具', icon: '🛠️' },
  { id: 'collab', label: '协作管理', icon: '🤝' },
  { id: 'data', label: '数据监控', icon: '📊' },
  { id: 'system', label: '系统', icon: '⚙️' },
]

const DEFAULT_TAB_GROUPS = {
  projects: 'core', groups: 'collab', tasks: 'collab',
  tools: 'dev', changes: 'dev', terminal: 'dev', templates: 'dev',
  dashboard: 'data', metrics: 'data', search: 'data',
  cron: 'system', pets: 'system', music: 'system', settings: 'system',
}

// 预设 Emoji 网格，用于新建/编辑分组及自定义链接时的快捷图标点击选择
const PRESET_EMOJIS = [
  '📁', '⭐', '🛠️', '🤝', '📊', '⚙️', '🛡️', '🌐', 
  '🚀', '🔑', '🎨', '🎵', '⚡', '⏳', '🔍', '🐞', 
  '📦', '💡', '📅', '📝', '🔔', '💬', '👥', '⚓'
]

const loadGroups = () => {
  try {
    const saved = localStorage.getItem('menu-groups')
    if (saved) { 
      const d = JSON.parse(saved)
      if (Array.isArray(d) && d.length > 0) groups.value = d
      else groups.value = DEFAULT_GROUPS.map(g => ({ ...g })) 
    } else {
      groups.value = DEFAULT_GROUPS.map(g => ({ ...g }))
    }
  } catch { 
    groups.value = DEFAULT_GROUPS.map(g => ({ ...g })) 
  }
  
  try {
    const saved = localStorage.getItem('menu-tab-groups')
    if (saved) tabGroups.value = JSON.parse(saved)
    else tabGroups.value = { ...DEFAULT_TAB_GROUPS }
  } catch { 
    tabGroups.value = { ...DEFAULT_TAB_GROUPS } 
  }
}

const saveGroups = () => {
  localStorage.setItem('menu-groups', JSON.stringify(groups.value))
  localStorage.setItem('menu-tab-groups', JSON.stringify(tabGroups.value))
  emit('update-groups', { groups: groups.value, tabGroups: tabGroups.value })
}

const addGroup = () => {
  if (!newGroup.value.label.trim()) return
  const id = 'g_' + Date.now().toString(36)
  groups.value.push({ id, label: newGroup.value.label.trim(), icon: newGroup.value.icon || '📁' })
  newGroup.value = { label: '', icon: '📁' }
  showAddGroup.value = false
  saveGroups()
}

const deleteGroup = (id) => {
  if (!confirm('确定删除此分组吗？其中的菜单将退回到“未分组”区域。')) return
  for (const [tabId, gid] of Object.entries(tabGroups.value)) {
    if (gid === id) delete tabGroups.value[tabId]
  }
  groups.value = groups.value.filter(g => g.id !== id)
  saveGroups()
}

const startEditGroup = (group) => { 
  editingGroup.value = { ...group } 
}

const saveEditGroup = () => {
  if (!editingGroup.value.label.trim()) return
  const idx = groups.value.findIndex(g => g.id === editingGroup.value.id)
  if (idx !== -1) groups.value[idx] = { ...editingGroup.value }
  editingGroup.value = null
  saveGroups()
}

// 菜单一键指派逻辑（点亮对应的分类胶囊）
const moveTabToGroup = (tabId, groupId) => {
  if (groupId === 'ungrouped') {
    delete tabGroups.value[tabId]
  } else {
    tabGroups.value[tabId] = groupId
  }
  saveGroups()
}

// 新建自定义外部链接
const addCustomLink = () => {
  if (!newLink.value.label.trim() || !newLink.value.url.trim()) return
  const id = 'l_' + Date.now().toString(36)
  
  let links = []
  try {
    const saved = localStorage.getItem('menu-custom-links')
    if (saved) links = JSON.parse(saved)
  } catch {}
  
  links.push({
    id,
    label: newLink.value.label.trim(),
    url: newLink.value.url.trim(),
    icon: newLink.value.icon || '🌐',
    isExternal: true
  })
  
  localStorage.setItem('menu-custom-links', JSON.stringify(links))
  
  // 默认分配到 'core' 组
  tabGroups.value[id] = 'core'
  
  newLink.value = { label: '', url: 'https://', icon: '🌐' }
  showAddLink.value = false
  saveGroups()
}

// 删除自定义外部链接
const deleteCustomLink = (id) => {
  if (!confirm('确定删除此自定义外部链接吗？')) return
  let links = []
  try {
    const saved = localStorage.getItem('menu-custom-links')
    if (saved) links = JSON.parse(saved)
  } catch {}
  
  links = links.filter(l => l.id !== id)
  localStorage.setItem('menu-custom-links', JSON.stringify(links))
  
  delete tabGroups.value[id]
  
  // 从 tab-order 中清理缓存
  try {
    const savedOrder = localStorage.getItem('tab-order')
    if (savedOrder) {
      let order = JSON.parse(savedOrder)
      order = order.filter(o => o !== id)
      localStorage.setItem('tab-order', JSON.stringify(order))
    }
  } catch {}
  
  saveGroups()
}

// 恢复默认设置
const resetDefaults = () => {
  if (!confirm('确定要恢复默认菜单分组配置吗？这会覆盖您的所有自定义分组及自定义链接。')) return
  groups.value = DEFAULT_GROUPS.map(g => ({ ...g }))
  tabGroups.value = { ...DEFAULT_TAB_GROUPS }
  localStorage.removeItem('menu-groups')
  localStorage.removeItem('menu-tab-groups')
  localStorage.removeItem('menu-custom-links')
  localStorage.removeItem('tab-order')
  saveGroups()
}

// 获取菜单项所属的分组 ID，如果没有或者未匹配，则返回 'ungrouped'
const getTabGroupId = (tabId) => {
  const gid = tabGroups.value[tabId]
  if (!gid) return 'ungrouped'
  const groupExists = groups.value.some(g => g.id === gid)
  return groupExists ? gid : 'ungrouped'
}

onMounted(loadGroups)
</script>

<template>
  <div class="menu-mgr">
    <!-- 顶部标题栏 -->
    <div class="mgr-header">
      <div class="mgr-title">
        <h2>📋 菜单功能分区平铺矩阵</h2>
        <span class="mgr-hint">行级平铺矩阵设计：一排一排指派菜单分区，支持添加外部链接并将其以内嵌 iframe 载入。</span>
      </div>
      <div class="mgr-actions">
        <button class="btn btn-outline btn-sm" @click="resetDefaults">↩ 恢复默认</button>
        <button class="btn btn-outline btn-sm" @click="showManageGroups = true">⚙️ 管理分组</button>
        <button class="btn btn-outline btn-sm" @click="showAddLink = true">🌐 自定义链接</button>
        <button class="btn btn-primary btn-sm" @click="showAddGroup = true">+ 新增分组</button>
      </div>
    </div>

    <!-- 一排一排的行清单大容器 -->
    <div class="mgr-body-full">
      <div class="matrix-panel">
        <!-- 表头，列出菜单信息和各指派操作的标头 -->
        <div class="matrix-header-row">
          <div class="col-menu-name">菜单项目 (Menu Items)</div>
          <div class="col-menu-assign">功能分区指派 (Category Assignment)</div>
        </div>
        
        <!-- 数据行列表 -->
        <div class="matrix-rows-container">
          <div v-for="tab in tabs" :key="tab.id" class="menu-row">
            <!-- 左侧列：菜单基本信息 -->
            <div class="menu-info-col">
              <span class="menu-icon">{{ tab.icon }}</span>
              <div class="menu-meta">
                <span class="menu-label">
                  {{ tab.label }}
                  <span v-if="tab.isExternal" class="external-badge">外部</span>
                </span>
                <span class="menu-id-tag">{{ tab.id }}</span>
              </div>
              <!-- 如果是自定义外部链接，显示删除按钮 -->
              <button v-if="tab.isExternal" class="act-btn delete-btn inline-del-btn" title="删除链接" @click="deleteCustomLink(tab.id)">
                🗑️
              </button>
            </div>

            <!-- 右侧列：横向平铺的胶囊按钮组 -->
            <div class="menu-assign-col">
              <!-- '未分组' 胶囊 -->
              <button 
                class="pill-btn pill-ungrouped"
                :class="{ active: getTabGroupId(tab.id) === 'ungrouped' }"
                @click="moveTabToGroup(tab.id, 'ungrouped')">
                <span class="pill-icon">📦</span>
                <span class="pill-label">未分组</span>
              </button>

              <!-- 各分组胶囊 -->
              <button v-for="group in groups" :key="group.id"
                class="pill-btn"
                :class="['pill-' + group.id, { active: getTabGroupId(tab.id) === group.id }]"
                @click="moveTabToGroup(tab.id, group.id)">
                <span class="pill-icon">{{ group.icon }}</span>
                <span class="pill-label">{{ group.label }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 管理分组模态弹窗 -->
    <div v-if="showManageGroups" class="overlay" @click.self="showManageGroups = false">
      <div class="dialog manage-groups-dialog">
        <div class="dialog-header">
          <h3>⚙️ 管理功能分组</h3>
          <button class="dialog-close-btn" @click="showManageGroups = false">×</button>
        </div>
        
        <div class="dialog-body group-list-body">
          <div v-if="groups.length === 0" class="empty-list">暂无自定义分组</div>
          <div v-else class="group-manage-list">
            <div v-for="group in groups" :key="group.id" class="group-manage-row">
              <div class="gm-left">
                <span class="gm-icon">{{ group.icon }}</span>
                <span class="gm-label">{{ group.label }}</span>
              </div>
              <div class="gm-actions">
                <button class="act-btn edit-btn" title="编辑分组" @click="startEditGroup(group)">✏️</button>
                <button class="act-btn delete-btn" title="删除分组" @click="deleteGroup(group.id)">🗑️</button>
              </div>
            </div>
          </div>
        </div>
        
        <div class="dialog-actions">
          <button class="btn btn-outline" @click="showManageGroups = false">关闭</button>
        </div>
      </div>
    </div>

    <!-- 添加分组模态弹窗 -->
    <div v-if="showAddGroup" class="overlay" @click.self="showAddGroup = false">
      <div class="dialog">
        <div class="dialog-header">
          <h3>📂 新建菜单分组</h3>
          <button class="dialog-close-btn" @click="showAddGroup = false">×</button>
        </div>
        
        <div class="dialog-body">
          <div class="field">
            <label>分组名称</label>
            <input v-model="newGroup.label" placeholder="例如：高级应用" @keydown.enter="addGroup" class="tech-input" ref="newGroupNameInput" autofocus />
          </div>
          
          <div class="field">
            <label>选择图标 (点击直接选中)</label>
            <div class="emoji-grid">
              <button v-for="emoji in PRESET_EMOJIS" :key="emoji" 
                type="button"
                class="emoji-btn"
                :class="{ active: newGroup.icon === emoji }"
                @click="newGroup.icon = emoji">
                {{ emoji }}
              </button>
            </div>
          </div>
        </div>
        
        <div class="dialog-actions">
          <button class="btn btn-outline" @click="showAddGroup = false">取消</button>
          <button class="btn btn-primary" @click="addGroup">确认创建</button>
        </div>
      </div>
    </div>

    <!-- 添加自定义链接模态弹窗 -->
    <div v-if="showAddLink" class="overlay" @click.self="showAddLink = false">
      <div class="dialog">
        <div class="dialog-header">
          <h3>🌐 新建自定义外部链接</h3>
          <button class="dialog-close-btn" @click="showAddLink = false">×</button>
        </div>
        
        <div class="dialog-body">
          <div class="field">
            <label>链接名称</label>
            <input v-model="newLink.label" placeholder="例如：飞书文档" class="tech-input" autofocus />
          </div>
          <div class="field">
            <label>链接 URL (如 https://feishu.cn)</label>
            <input v-model="newLink.url" placeholder="https://" class="tech-input" />
          </div>
          
          <div class="field">
            <label>选择图标 (点击直接选中)</label>
            <div class="emoji-grid">
              <button v-for="emoji in PRESET_EMOJIS" :key="emoji" 
                type="button"
                class="emoji-btn"
                :class="{ active: newLink.icon === emoji }"
                @click="newLink.icon = emoji">
                {{ emoji }}
              </button>
            </div>
          </div>
        </div>
        
        <div class="dialog-actions">
          <button class="btn btn-outline" @click="showAddLink = false">取消</button>
          <button class="btn btn-primary" @click="addCustomLink">确认添加</button>
        </div>
      </div>
    </div>

    <!-- 编辑分组模态弹窗 -->
    <div v-if="editingGroup" class="overlay" @click.self="editingGroup = null">
      <div class="dialog">
        <div class="dialog-header">
          <h3>✏️ 编辑菜单分组</h3>
          <button class="dialog-close-btn" @click="editingGroup = null">×</button>
        </div>
        
        <div class="dialog-body">
          <div class="field">
            <label>分组名称</label>
            <input v-model="editingGroup.label" @keydown.enter="saveEditGroup" class="tech-input" autofocus />
          </div>
          
          <div class="field">
            <label>选择图标 (点击直接选中)</label>
            <div class="emoji-grid">
              <button v-for="emoji in PRESET_EMOJIS" :key="emoji" 
                type="button"
                class="emoji-btn"
                :class="{ active: editingGroup.icon === emoji }"
                @click="editingGroup.icon = emoji">
                {{ emoji }}
              </button>
            </div>
          </div>
        </div>
        
        <div class="dialog-actions">
          <button class="btn btn-outline" @click="editingGroup = null">取消</button>
          <button class="btn btn-primary" @click="saveEditGroup">保存修改</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.menu-mgr { 
  height: 100%; 
  display: flex; 
  flex-direction: column; 
  overflow: hidden; 
  background: transparent; 
}

/* 顶部栏 */
.mgr-header { 
  display: flex; 
  align-items: center; 
  justify-content: space-between; 
  padding: 16px 24px; 
  border-bottom: 1px solid rgba(0, 0, 0, 0.04); 
  background: rgba(255, 255, 255, 0.45); 
  backdrop-filter: blur(25px); 
}
.mgr-title h2 { 
  font-size: 15px; 
  margin: 0; 
  color: var(--text-primary); 
  font-weight: 700;
}
.mgr-hint { 
  font-size: 11px; 
  color: var(--text-muted); 
  margin-top: 3px; 
  display: block; 
}
.mgr-actions { 
  display: flex; 
  gap: 10px; 
}

/* 大屏面板大容器 */
.mgr-body-full { 
  flex: 1; 
  overflow-y: auto; 
  padding: 24px; 
  background: transparent;
}

/* 行清单矩阵卡片 */
.matrix-panel {
  background: rgba(255, 255, 255, 0.45); 
  backdrop-filter: blur(25px); 
  border: 1px solid rgba(0, 0, 0, 0.04); 
  border-radius: 14px; 
  overflow: hidden;
  box-shadow: 0 8px 32px 0 rgba(15, 23, 42, 0.02);
  display: flex;
  flex-direction: column;
}

/* 表头行 */
.matrix-header-row {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 24px;
  padding: 14px 24px;
  background: rgba(15, 23, 42, 0.02);
  border-bottom: 1px solid rgba(0, 0, 0, 0.03);
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* 数据行容器 */
.matrix-rows-container {
  display: flex;
  flex-direction: column;
}

/* 菜单行：一排一排 */
.menu-row {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 24px;
  padding: 16px 24px;
  align-items: center;
  border-bottom: 1px solid rgba(0, 0, 0, 0.02);
  transition: all 0.2s ease-in-out;
}
.menu-row:last-child {
  border-bottom: none;
}
.menu-row:hover {
  background: rgba(59, 130, 246, 0.02);
  border-left: 3px solid rgba(59, 130, 246, 0.5);
  padding-left: 21px; /* 补平 border 宽度 */
}

/* 左侧列：菜单信息 */
.menu-info-col {
  display: flex;
  align-items: center;
  gap: 12px;
}
.menu-icon {
  font-size: 18px;
}
.menu-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.menu-label {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
  display: flex;
  align-items: center;
}
.menu-id-tag {
  font-size: 9.5px;
  font-family: 'JetBrains Mono', monospace;
  color: var(--text-muted);
  background: rgba(15, 23, 42, 0.04);
  padding: 1px 6px;
  border-radius: 4px;
  width: fit-content;
}

/* 外部链接标签徽章 */
.external-badge {
  font-size: 8px;
  background: rgba(59, 130, 246, 0.1);
  color: var(--accent-blue);
  border: 1px solid rgba(59, 130, 246, 0.15);
  padding: 1px 5px;
  border-radius: 4px;
  margin-left: 6px;
  font-weight: 700;
  text-transform: uppercase;
}

/* 菜单行内的删除按钮 */
.inline-del-btn {
  opacity: 0.1;
  margin-left: auto;
  transition: opacity 0.2s;
}
.menu-row:hover .inline-del-btn {
  opacity: 0.7;
}
.inline-del-btn:hover {
  opacity: 1 !important;
}

/* 右侧列：横向平铺胶囊按钮组 */
.menu-assign-col {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

/* 胶囊按钮基础样式 */
.pill-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border: 1px solid rgba(0, 0, 0, 0.04);
  background: rgba(0, 0, 0, 0.02);
  color: var(--text-secondary);
  font-size: 11.5px;
  font-weight: 600;
  border-radius: 20px;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.pill-btn:hover {
  background: rgba(15, 23, 42, 0.06);
  color: var(--text-primary);
  transform: translateY(-1px);
}
.pill-btn:active {
  transform: scale(0.95);
}

/* 未选中的胶囊悬浮反馈 */
.pill-icon {
  font-size: 12px;
}

/* 胶囊点亮霓虹高亮灯效 */
.pill-ungrouped.active {
  background: linear-gradient(135deg, #64748b, #475569);
  border-color: #64748b;
  box-shadow: 0 0 10px rgba(100, 116, 139, 0.3);
  color: white;
}
.pill-core.active {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  border-color: #f59e0b;
  box-shadow: 0 0 10px rgba(245, 158, 11, 0.3);
  color: white;
}
.pill-dev.active {
  background: linear-gradient(135deg, #3b82f6, #0284c7);
  border-color: #3b82f6;
  box-shadow: 0 0 10px rgba(59, 130, 246, 0.3);
  color: white;
}
.pill-collab.active {
  background: linear-gradient(135deg, #10b981, #059669);
  border-color: #10b981;
  box-shadow: 0 0 10px rgba(16, 185, 129, 0.3);
  color: white;
}
.pill-data.active {
  background: linear-gradient(135deg, #a855f7, #ec4899);
  border-color: #a855f7;
  box-shadow: 0 0 10px rgba(168, 85, 247, 0.3);
  color: white;
}
.pill-system.active {
  background: linear-gradient(135deg, #f97316, #ea580c);
  border-color: #f97316;
  box-shadow: 0 0 10px rgba(249, 115, 22, 0.3);
  color: white;
}

/* 自定义卡片药丸高亮配色 */
.pill-btn.active:not(.pill-ungrouped):not(.pill-core):not(.pill-dev):not(.pill-collab):not(.pill-data):not(.pill-system) {
  background: linear-gradient(135deg, #06b6d4, #0891b2);
  border-color: #06b6d4;
  box-shadow: 0 0 10px rgba(6, 182, 212, 0.3);
  color: white;
}

/* 分组管理弹窗 */
.manage-groups-dialog {
  width: 440px !important;
}
.group-list-body {
  max-height: 260px;
  overflow-y: auto;
  padding: 4px;
}
.empty-list {
  text-align: center;
  color: var(--text-muted);
  font-size: 12px;
  padding: 30px 0;
}
.group-manage-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.group-manage-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(0,0,0,0.015);
  border: 1px solid rgba(0,0,0,0.02);
  padding: 8px 14px;
  border-radius: 10px;
  transition: all 0.2s;
}
.group-manage-row:hover {
  background: rgba(15,23,42,0.02);
  border-color: rgba(0,0,0,0.05);
}
.gm-left {
  display: flex;
  align-items: center;
  gap: 10px;
}
.gm-icon {
  font-size: 16px;
}
.gm-label {
  font-size: 12.5px;
  font-weight: 700;
  color: var(--text-primary);
}
.gm-actions {
  display: flex;
  gap: 4px;
}
.act-btn { 
  background: none; 
  border: 1px solid transparent; 
  cursor: pointer; 
  font-size: 12px; 
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%; 
  transition: all 0.2s; 
}
.act-btn.edit-btn:hover { 
  background: rgba(59, 130, 246, 0.08); 
  border-color: rgba(59, 130, 246, 0.15); 
}
.act-btn.delete-btn:hover { 
  background: rgba(244, 63, 94, 0.08); 
  border-color: rgba(244, 63, 94, 0.15); 
}

/* 模态弹窗基础 */
.overlay { 
  position: fixed; 
  inset: 0; 
  background: rgba(15, 23, 42, 0.4); 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  z-index: 10000; 
  backdrop-filter: blur(6px); 
}
.dialog { 
  background: rgba(255, 255, 255, 0.9); 
  backdrop-filter: blur(25px);
  border: 1px solid rgba(255, 255, 255, 0.5); 
  border-radius: 16px; 
  padding: 20px 24px; 
  width: 380px; 
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.15);
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.dialog-header h3 { 
  margin: 0; 
  font-size: 14.5px; 
  color: var(--text-primary);
  font-weight: 700;
}
.dialog-close-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: var(--text-muted);
  line-height: 1;
}
.dialog-close-btn:hover {
  color: var(--text-primary);
}
.dialog-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.field { 
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.field label { 
  font-size: 11px; 
  color: var(--text-muted); 
  font-weight: 600;
}

/* 科技输入框 */
.tech-input { 
  width: 100%; 
  padding: 8px 12px; 
  border-radius: 8px; 
  border: 1px solid rgba(0, 0, 0, 0.08); 
  background: rgba(255, 255, 255, 0.8); 
  color: var(--text-primary); 
  font-size: 12.5px; 
  outline: none; 
  transition: all 0.2s;
}
.tech-input:focus { 
  border-color: rgba(59, 130, 246, 0.4); 
  box-shadow: 0 0 8px rgba(59, 130, 246, 0.08);
  background: #ffffff;
}

/* Emoji 选择器网格 */
.emoji-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 6px;
  max-height: 120px;
  overflow-y: auto;
  background: rgba(0,0,0,0.02);
  border: 1px solid rgba(0,0,0,0.04);
  border-radius: 10px;
  padding: 8px;
}
.emoji-btn {
  background: transparent;
  border: 1px solid transparent;
  font-size: 18px;
  padding: 4px;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
}
.emoji-btn:hover {
  background: rgba(255,255,255,0.7);
  transform: scale(1.15);
}
.emoji-btn.active {
  background: rgba(59, 130, 246, 0.08);
  border-color: rgba(59, 130, 246, 0.2);
  transform: scale(1.1);
  box-shadow: 0 2px 6px rgba(59, 130, 246, 0.05);
}

.dialog-actions { 
  display: flex; 
  gap: 8px; 
  justify-content: flex-end; 
}
.btn { 
  padding: 8px 16px; 
  border-radius: 10px; 
  border: none; 
  cursor: pointer; 
  font-size: 12.5px; 
  font-weight: 600;
  transition: all 0.2s;
}
.btn-primary { 
  background: var(--gradient-blue); 
  color: white; 
}
.btn-primary:hover {
  opacity: 0.9;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
}
.btn-outline { 
  background: transparent; 
  border: 1px solid rgba(0,0,0,0.08); 
  color: var(--text-secondary); 
}
.btn-outline:hover {
  background: rgba(0,0,0,0.02);
}
.btn-sm { 
  padding: 5px 12px; 
  font-size: 11.5px; 
  border-radius: 8px;
}

/* 暗色主题支持 */
[data-theme="dark"] .mgr-header,
[data-theme="dark"] .matrix-panel,
[data-theme="dark"] .dialog,
[data-theme="dark"] .group-manage-row {
  background: var(--surface) !important;
  border-color: var(--border-color) !important;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4) !important;
}
[data-theme="dark"] .mgr-header {
  border-bottom-color: rgba(255, 255, 255, 0.05) !important;
}
[data-theme="dark"] .matrix-header-row {
  background: rgba(255, 255, 255, 0.01) !important;
  border-bottom-color: rgba(255, 255, 255, 0.04) !important;
}
[data-theme="dark"] .menu-row {
  border-bottom-color: rgba(255, 255, 255, 0.03) !important;
}
[data-theme="dark"] .menu-row:hover {
  background: rgba(59, 130, 246, 0.04) !important;
}
[data-theme="dark"] .menu-id-tag {
  background: rgba(255, 255, 255, 0.06);
}
[data-theme="dark"] .pill-btn {
  background: rgba(255, 255, 255, 0.03);
  border-color: rgba(255, 255, 255, 0.04);
  color: var(--text-muted);
}
[data-theme="dark"] .pill-btn:hover {
  background: rgba(255, 255, 255, 0.07);
  color: var(--text-primary);
}
[data-theme="dark"] .tech-input {
  background: var(--bg-primary) !important;
  border-color: var(--border-color) !important;
}
[data-theme="dark"] .emoji-grid {
  background: rgba(0, 0, 0, 0.25);
  border-color: rgba(255, 255, 255, 0.03);
}
[data-theme="dark"] .emoji-btn:hover {
  background: rgba(255, 255, 255, 0.05);
}
[data-theme="dark"] .emoji-btn.active {
  background: rgba(59, 130, 246, 0.15) !important;
}
[data-theme="dark"] .btn-outline {
  border-color: rgba(255, 255, 255, 0.15) !important;
}
[data-theme="dark"] .btn-outline:hover {
  background: rgba(255, 255, 255, 0.02);
}
[data-theme="dark"] .group-manage-row:hover {
  background: rgba(255, 255, 255, 0.02) !important;
  border-color: rgba(255,255,255,0.06) !important;
}
[data-theme="dark"] .external-badge {
  background: rgba(59, 130, 246, 0.2) !important;
  border-color: rgba(59, 130, 246, 0.3) !important;
}

@media (max-width: 992px) {
  .matrix-header-row { display: none; }
  .menu-row { grid-template-columns: 1fr; gap: 12px; padding: 20px; }
}
</style>
