<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'

const props = defineProps({
  tabs: { type: Array, default: () => [] }
})

const emit = defineEmits(['update-groups'])

const groups = ref([])
const tabGroups = ref({})
const editingGroup = ref(null)
const showAddGroup = ref(false)
const showManageGroups = ref(false)

// 自定义外部链接菜单状态
const showAddLink = ref(false)
const newLink = ref({ label: '', url: 'https://', icon: '🌐' })
const newGroup = ref({ label: '', icon: '📁' })

// 穿梭框状态
const searchQuery = ref('')
const selectedLeftItems = ref(new Set())
const selectedRightItems = ref(new Set())
const activeGroupId = ref(null)
const expandedGroups = ref(new Set())

const DEFAULT_GROUPS = [
  { id: 'core', label: '核心功能', icon: '⭐' },
  { id: 'dev', label: '开发工具', icon: '🛠️' },
  { id: 'collab', label: '协作管理', icon: '🤝' },
  { id: 'data', label: '数据监控', icon: '📊' },
  { id: 'system', label: '系统', icon: '⚙️' },
]

const DEFAULT_TAB_GROUPS = {
  projects: 'core', groups: 'collab', tasks: 'collab', 'trace-replay': 'collab', autodev: 'collab', 'global-agent': 'core',
  tools: 'dev', changes: 'dev', terminal: 'dev',
  dashboard: 'data', metrics: 'data', search: 'data',
  cron: 'system', pets: 'system', music: 'system', settings: 'system',
}

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

  // 默认展开所有分组并选中第一个
  groups.value.forEach(g => expandedGroups.value.add(g.id))
  if (groups.value.length > 0) activeGroupId.value = groups.value[0].id
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
  expandedGroups.value.add(id)
  activeGroupId.value = id
  newGroup.value = { label: '', icon: '📁' }
  showAddGroup.value = false
  saveGroups()
}

const deleteGroup = (id) => {
  if (!confirm('确定删除此分组吗？其中的菜单将退回到"未分组"区域。')) return
  for (const [tabId, gid] of Object.entries(tabGroups.value)) {
    if (gid === id) delete tabGroups.value[tabId]
  }
  groups.value = groups.value.filter(g => g.id !== id)
  expandedGroups.value.delete(id)
  if (activeGroupId.value === id) {
    activeGroupId.value = groups.value.length > 0 ? groups.value[0].id : null
  }
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

const moveTabToGroup = (tabId, groupId) => {
  if (groupId === 'ungrouped') {
    delete tabGroups.value[tabId]
  } else {
    tabGroups.value[tabId] = groupId
  }
  saveGroups()
}

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
  tabGroups.value[id] = activeGroupId.value || 'core'
  newLink.value = { label: '', url: 'https://', icon: '🌐' }
  showAddLink.value = false
  saveGroups()
}

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

const resetDefaults = () => {
  if (!confirm('确定要恢复默认菜单分组配置吗？这会覆盖您的所有自定义分组及自定义链接。')) return
  groups.value = DEFAULT_GROUPS.map(g => ({ ...g }))
  tabGroups.value = { ...DEFAULT_TAB_GROUPS }
  localStorage.removeItem('menu-groups')
  localStorage.removeItem('menu-tab-groups')
  localStorage.removeItem('menu-custom-links')
  localStorage.removeItem('tab-order')
  expandedGroups.value.clear()
  groups.value.forEach(g => expandedGroups.value.add(g.id))
  activeGroupId.value = groups.value[0]?.id || null
  saveGroups()
}

const getTabGroupId = (tabId) => {
  const gid = tabGroups.value[tabId]
  if (!gid) return 'ungrouped'
  const groupExists = groups.value.some(g => g.id === gid)
  return groupExists ? gid : 'ungrouped'
}

// ---- 穿梭框相关计算属性和方法 ----

// 左侧：未分组的菜单项（可搜索过滤）
const ungroupedTabs = computed(() => {
  return props.tabs.filter(tab => getTabGroupId(tab.id) === 'ungrouped')
})

const filteredUngroupedTabs = computed(() => {
  if (!searchQuery.value.trim()) return ungroupedTabs.value
  const q = searchQuery.value.toLowerCase()
  return ungroupedTabs.value.filter(tab =>
    tab.label.toLowerCase().includes(q) || tab.id.toLowerCase().includes(q)
  )
})

// 右侧：分组结构
const getTabsForGroup = (groupId) => {
  return props.tabs.filter(tab => getTabGroupId(tab.id) === groupId)
}

// 切换分组展开/折叠
const toggleExpand = (groupId) => {
  if (expandedGroups.value.has(groupId)) {
    expandedGroups.value.delete(groupId)
  } else {
    expandedGroups.value.add(groupId)
  }
}

// 选择分组（作为穿梭目标）
const selectGroup = (groupId) => {
  activeGroupId.value = groupId
  if (!expandedGroups.value.has(groupId)) {
    expandedGroups.value.add(groupId)
  }
}

// 左侧选择/取消
const toggleLeftItem = (tabId) => {
  if (selectedLeftItems.value.has(tabId)) {
    selectedLeftItems.value.delete(tabId)
  } else {
    selectedLeftItems.value.add(tabId)
  }
  // 强制响应更新
  selectedLeftItems.value = new Set(selectedLeftItems.value)
}

// 全选/取消左侧
const toggleSelectAllLeft = () => {
  if (selectedLeftItems.value.size === filteredUngroupedTabs.value.length && filteredUngroupedTabs.value.length > 0) {
    selectedLeftItems.value = new Set()
  } else {
    selectedLeftItems.value = new Set(filteredUngroupedTabs.value.map(t => t.id))
  }
}

// 右侧选择/取消
const toggleRightItem = (tabId) => {
  if (selectedRightItems.value.has(tabId)) {
    selectedRightItems.value.delete(tabId)
  } else {
    selectedRightItems.value.add(tabId)
  }
  selectedRightItems.value = new Set(selectedRightItems.value)
}

// ---- 穿梭操作 ----

// 将左侧选中项分配到当前活跃分组
const transferToRight = () => {
  if (!activeGroupId.value || selectedLeftItems.value.size === 0) return
  selectedLeftItems.value.forEach(tabId => {
    tabGroups.value[tabId] = activeGroupId.value
  })
  selectedLeftItems.value = new Set()
  saveGroups()
}

// 将右侧选中项退回未分组
const transferToLeft = () => {
  if (selectedRightItems.value.size === 0) return
  selectedRightItems.value.forEach(tabId => {
    delete tabGroups.value[tabId]
  })
  selectedRightItems.value = new Set()
  saveGroups()
}

// 单个项目快速分配（双击）
const quickAssignToGroup = (tabId) => {
  if (!activeGroupId.value) return
  tabGroups.value[tabId] = activeGroupId.value
  selectedLeftItems.value.delete(tabId)
  selectedLeftItems.value = new Set(selectedLeftItems.value)
  saveGroups()
}

// 单个项目从分组中移除（双击）
const quickRemoveFromGroup = (tabId) => {
  delete tabGroups.value[tabId]
  selectedRightItems.value.delete(tabId)
  selectedRightItems.value = new Set(selectedRightItems.value)
  saveGroups()
}

onMounted(loadGroups)
</script>

<template>
  <div class="menu-mgr">
    <!-- 顶部标题栏 -->
    <div class="mgr-header">
      <div class="mgr-title">
        <div class="icon-wrapper">
          <span class="emoji-icon">📋</span>
          <span class="glow-bg"></span>
        </div>
        <div>
          <h2>菜单分组管理</h2>
          <span class="mgr-hint">选中左侧菜单项，点击 → 箭头分配到右侧选中的分组中。双击可快速操作。</span>
        </div>
      </div>
      <div class="mgr-actions">
        <button class="btn btn-outline btn-sm" @click="resetDefaults">↩ 恢复默认</button>
        <button class="btn btn-outline btn-sm" @click="showAddLink = true">🌐 新增链接</button>
        <button class="btn btn-primary btn-sm btn-glow" @click="showAddGroup = true">➕ 新建分组</button>
      </div>
    </div>

    <!-- 双栏穿梭框主体 -->
    <div class="transfer-box">
      <!-- 左侧面板：未分组菜单项 -->
      <div class="panel panel-left">
        <div class="panel-header">
          <div class="panel-title">
            <span class="panel-icon">📦</span>
            <h3>待分配菜单</h3>
            <span class="panel-count">{{ ungroupedTabs.length }}</span>
          </div>
          <label class="select-all-btn" @click="toggleSelectAllLeft">
            <input 
              type="checkbox" 
              :checked="selectedLeftItems.size === filteredUngroupedTabs.length && filteredUngroupedTabs.length > 0"
              :indeterminate="selectedLeftItems.size > 0 && selectedLeftItems.size < filteredUngroupedTabs.length"
              @click.stop
              @change="toggleSelectAllLeft"
            />
            <span>全选</span>
          </label>
        </div>
        <div class="search-bar">
          <span class="search-icon">🔍</span>
          <input 
            v-model="searchQuery" 
            type="text" 
            placeholder="搜索菜单项..." 
            class="search-input"
          />
          <button v-if="searchQuery" class="clear-search" @click="searchQuery = ''">✕</button>
        </div>
        <div class="panel-body">
          <div v-if="filteredUngroupedTabs.length === 0" class="empty-panel">
            <span class="empty-emoji">🎉</span>
            <span v-if="ungroupedTabs.length === 0">所有菜单项已分配完毕！</span>
            <span v-else>搜索无匹配结果</span>
          </div>
          <div 
            v-for="tab in filteredUngroupedTabs" 
            :key="tab.id"
            class="transfer-item"
            :class="{ 'selected': selectedLeftItems.has(tab.id) }"
            @click="toggleLeftItem(tab.id)"
            @dblclick="quickAssignToGroup(tab.id)"
          >
            <input 
              type="checkbox" 
              :checked="selectedLeftItems.has(tab.id)" 
              @click.stop
              @change="toggleLeftItem(tab.id)"
              class="item-checkbox"
            />
            <span class="item-icon">{{ tab.icon }}</span>
            <div class="item-info">
              <span class="item-name">{{ tab.label }}</span>
              <span class="item-id">{{ tab.id }}</span>
            </div>
            <span v-if="tab.isExternal" class="external-tag">外部</span>
            <button 
              v-if="tab.isExternal" 
              class="icon-btn delete-link-btn" 
              title="删除链接" 
              @click.stop="deleteCustomLink(tab.id)"
            >✕</button>
          </div>
        </div>
      </div>

      <!-- 中间操作按钮 -->
      <div class="transfer-actions">
        <button 
          class="transfer-btn to-right" 
          :disabled="selectedLeftItems.size === 0 || !activeGroupId"
          :title="activeGroupId ? `分配到 ${groups.find(g => g.id === activeGroupId)?.label || ''}` : '请先在右侧选择一个目标分组'"
          @click="transferToRight"
        >
          <span class="arrow-icon">→</span>
          <span class="transfer-count" v-if="selectedLeftItems.size > 0">{{ selectedLeftItems.size }}</span>
        </button>
        <button 
          class="transfer-btn to-left" 
          :disabled="selectedRightItems.size === 0"
          title="移回未分组"
          @click="transferToLeft"
        >
          <span class="transfer-count" v-if="selectedRightItems.size > 0">{{ selectedRightItems.size }}</span>
          <span class="arrow-icon">←</span>
        </button>
      </div>

      <!-- 右侧面板：分组结构 -->
      <div class="panel panel-right">
        <div class="panel-header">
          <div class="panel-title">
            <span class="panel-icon">🗂️</span>
            <h3>分组结构</h3>
            <span class="panel-count">{{ groups.length }} 组</span>
          </div>
          <button class="btn btn-outline btn-xs" @click="showManageGroups = true">⚙️ 管理</button>
        </div>
        <div class="panel-body groups-body">
          <div v-if="groups.length === 0" class="empty-panel">
            <span class="empty-emoji">📭</span>
            <span>暂无分组，请先新建一个分组</span>
          </div>
          <div 
            v-for="group in groups" 
            :key="group.id" 
            class="group-section"
            :class="{ 'active-group': activeGroupId === group.id }"
          >
            <div 
              class="group-header"
              @click="selectGroup(group.id)"
            >
              <div class="group-header-left">
                <button class="expand-btn" @click.stop="toggleExpand(group.id)">
                  <span :class="{ 'rotated': expandedGroups.has(group.id) }">▶</span>
                </button>
                <span class="group-icon">{{ group.icon }}</span>
                <span class="group-label">{{ group.label }}</span>
                <span class="group-count">{{ getTabsForGroup(group.id).length }}</span>
              </div>
              <div class="group-header-actions">
                <span v-if="activeGroupId === group.id" class="target-badge">目标</span>
                <button class="icon-btn edit-btn" title="编辑" @click.stop="startEditGroup(group)">✏️</button>
                <button class="icon-btn delete-btn" title="删除" @click.stop="deleteGroup(group.id)">🗑️</button>
              </div>
            </div>
            <div v-show="expandedGroups.has(group.id)" class="group-items">
              <div v-if="getTabsForGroup(group.id).length === 0" class="empty-group-hint">
                将左侧菜单分配到此分组
              </div>
              <div 
                v-for="tab in getTabsForGroup(group.id)" 
                :key="tab.id"
                class="transfer-item in-group"
                :class="{ 'selected': selectedRightItems.has(tab.id) }"
                @click="toggleRightItem(tab.id)"
                @dblclick="quickRemoveFromGroup(tab.id)"
              >
                <input 
                  type="checkbox" 
                  :checked="selectedRightItems.has(tab.id)" 
                  @click.stop
                  @change="toggleRightItem(tab.id)"
                  class="item-checkbox"
                />
                <span class="item-icon">{{ tab.icon }}</span>
                <div class="item-info">
                  <span class="item-name">{{ tab.label }}</span>
                </div>
                <span v-if="tab.isExternal" class="external-tag">外部</span>
                <button 
                  class="remove-item-btn" 
                  title="移出分组" 
                  @click.stop="quickRemoveFromGroup(tab.id)"
                >✕</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 管理分组模态弹窗 -->
    <div v-if="showManageGroups" class="overlay" @click.self="showManageGroups = false">
      <div class="dialog manage-groups-dialog aura-modal">
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
                <span class="gm-count">{{ getTabsForGroup(group.id).length }} 项</span>
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
      <div class="dialog aura-modal">
        <div class="dialog-header">
          <h3>➕ 新建菜单分组</h3>
          <button class="dialog-close-btn" @click="showAddGroup = false">×</button>
        </div>
        <div class="dialog-body">
          <div class="field">
            <label>分组名称</label>
            <input v-model="newGroup.label" placeholder="例如：高级应用" @keydown.enter="addGroup" class="tech-input" autofocus />
          </div>
          <div class="field">
            <label>选择图标</label>
            <div class="emoji-grid">
              <button v-for="emoji in PRESET_EMOJIS" :key="emoji" 
                type="button" class="emoji-btn"
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
      <div class="dialog aura-modal">
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
            <label>选择图标</label>
            <div class="emoji-grid">
              <button v-for="emoji in PRESET_EMOJIS" :key="emoji" 
                type="button" class="emoji-btn"
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
      <div class="dialog aura-modal">
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
            <label>选择图标</label>
            <div class="emoji-grid">
              <button v-for="emoji in PRESET_EMOJIS" :key="emoji" 
                type="button" class="emoji-btn"
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
  background: transparent;
  overflow: hidden;
}

/* ===== 顶部栏 ===== */
.mgr-header {
  display: flex; 
  align-items: center; 
  justify-content: space-between; 
  padding: 14px 22px; 
  margin: 14px 14px 0;
  background: var(--surface-nav);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  box-shadow: var(--shadow-sm);
  z-index: 10;
}

.mgr-title {
  display: flex;
  align-items: center;
  gap: 14px;
}

.icon-wrapper {
  position: relative;
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: var(--bg-secondary);
}

.emoji-icon {
  font-size: 18px;
  z-index: 2;
}

.glow-bg {
  position: absolute;
  inset: -2px;
  background: linear-gradient(135deg, var(--accent-blue), var(--accent-purple));
  opacity: 0.15;
  border-radius: 12px;
  filter: blur(4px);
  z-index: 1;
}

.mgr-title h2 { 
  font-size: 15px; 
  margin: 0; 
  color: var(--text-primary); 
  font-weight: 700;
  letter-spacing: 0.3px;
}

.mgr-hint { 
  font-size: 11.5px; 
  color: var(--text-secondary); 
  margin-top: 3px; 
  display: block; 
}

.mgr-actions { 
  display: flex; 
  gap: 8px; 
}

/* ===== 穿梭框主体 ===== */
.transfer-box {
  flex: 1;
  display: flex;
  gap: 0;
  padding: 14px;
  overflow: hidden;
  min-height: 0;
}

/* ===== 面板通用 ===== */
.panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  overflow: hidden;
  min-height: 0;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  background: var(--surface-nav);
  flex-shrink: 0;
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.panel-icon {
  font-size: 14px;
}

.panel-title h3 {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
}

.panel-count {
  background: var(--bg-secondary);
  color: var(--text-secondary);
  font-size: 10.5px;
  padding: 2px 7px;
  border-radius: 10px;
  font-weight: 600;
}

.select-all-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11.5px;
  color: var(--text-secondary);
  cursor: pointer;
  user-select: none;
}

.select-all-btn input[type="checkbox"] {
  cursor: pointer;
  accent-color: var(--accent-blue);
}

.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  min-height: 0;
}

.panel-body::-webkit-scrollbar {
  width: 5px;
}
.panel-body::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 3px;
}
.panel-body::-webkit-scrollbar-track {
  background: transparent;
}

/* ===== 搜索栏 ===== */
.search-bar {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border-color);
  gap: 8px;
  flex-shrink: 0;
  background: var(--bg-primary);
}

.search-icon {
  font-size: 12px;
  opacity: 0.5;
}

.search-input {
  flex: 1;
  border: none;
  background: transparent;
  outline: none;
  font-size: 12.5px;
  color: var(--text-primary);
}

.search-input::placeholder {
  color: var(--text-muted);
}

.clear-search {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 12px;
  padding: 2px 4px;
  border-radius: 4px;
}
.clear-search:hover {
  color: var(--text-primary);
  background: var(--bg-secondary);
}

/* ===== 穿梭项 ===== */
.transfer-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
  border: 1px solid transparent;
  margin-bottom: 2px;
}

.transfer-item:hover {
  background: var(--bg-secondary);
  border-color: rgba(59, 130, 246, 0.08);
}

.transfer-item.selected {
  background: rgba(59, 130, 246, 0.06);
  border-color: rgba(59, 130, 246, 0.2);
}

.item-checkbox {
  flex-shrink: 0;
  cursor: pointer;
  accent-color: var(--accent-blue);
  width: 14px;
  height: 14px;
}

.item-icon {
  font-size: 15px;
  flex-shrink: 0;
}

.item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.item-name {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-id {
  font-size: 10px;
  color: var(--text-muted);
  font-family: monospace;
}

.external-tag {
  font-size: 9px;
  background: rgba(59, 130, 246, 0.1);
  color: var(--accent-blue);
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 700;
  flex-shrink: 0;
}

.remove-item-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 11px;
  padding: 2px 5px;
  border-radius: 4px;
  opacity: 0;
  transition: all 0.15s;
  flex-shrink: 0;
}
.transfer-item:hover .remove-item-btn {
  opacity: 1;
}
.remove-item-btn:hover {
  color: var(--accent-red, #ef4444);
  background: rgba(239, 68, 68, 0.08);
}

.delete-link-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 11px;
  padding: 2px 5px;
  border-radius: 4px;
  opacity: 0;
  transition: all 0.15s;
  flex-shrink: 0;
}
.transfer-item:hover .delete-link-btn {
  opacity: 1;
}
.delete-link-btn:hover {
  color: var(--accent-red, #ef4444);
  background: rgba(239, 68, 68, 0.08);
}

/* ===== 中间操作按钮 ===== */
.transfer-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 0 10px;
  flex-shrink: 0;
}

.transfer-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  width: 44px;
  height: 44px;
  border-radius: 10px;
  border: 1px solid var(--border-color);
  background: var(--surface);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.transfer-btn:not(:disabled):hover {
  border-color: var(--accent-blue);
  background: rgba(59, 130, 246, 0.06);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.12);
  transform: scale(1.05);
}

.transfer-btn:not(:disabled):active {
  transform: scale(0.97);
}

.transfer-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.arrow-icon {
  font-size: 18px;
  font-weight: 700;
  color: var(--accent-blue);
  line-height: 1;
}

.transfer-btn:disabled .arrow-icon {
  color: var(--text-muted);
}

.transfer-count {
  position: absolute;
  top: -6px;
  right: -6px;
  background: var(--accent-blue);
  color: white;
  font-size: 10px;
  font-weight: 700;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(59, 130, 246, 0.3);
}

/* ===== 空状态 ===== */
.empty-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: var(--text-muted);
  font-size: 12.5px;
  gap: 10px;
}

.empty-emoji {
  font-size: 28px;
}

.empty-group-hint {
  text-align: center;
  padding: 16px 10px;
  color: var(--text-muted);
  font-size: 11.5px;
  border: 1px dashed var(--border-color);
  border-radius: 6px;
  margin: 4px 8px;
}

/* ===== 右侧分组结构 ===== */
.groups-body {
  padding: 6px;
}

.group-section {
  border: 1px solid var(--border-color);
  border-radius: 10px;
  margin-bottom: 6px;
  overflow: hidden;
  transition: all 0.2s ease;
}

.group-section.active-group {
  border-color: rgba(59, 130, 246, 0.35);
  box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.1), 0 2px 8px rgba(59, 130, 246, 0.06);
}

.group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  cursor: pointer;
  transition: background 0.15s;
  background: var(--surface-nav);
}

.group-header:hover {
  background: var(--bg-secondary);
}

.active-group .group-header {
  background: rgba(59, 130, 246, 0.04);
}

.group-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.expand-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 9px;
  color: var(--text-muted);
  padding: 2px;
  transition: transform 0.2s ease;
  line-height: 1;
}

.expand-btn span.rotated {
  display: inline-block;
  transform: rotate(90deg);
}

.group-icon {
  font-size: 14px;
}

.group-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.group-count {
  background: var(--bg-secondary);
  color: var(--text-secondary);
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 8px;
  font-weight: 600;
}

.group-header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.target-badge {
  font-size: 9px;
  background: rgba(59, 130, 246, 0.12);
  color: var(--accent-blue);
  padding: 2px 7px;
  border-radius: 4px;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.icon-btn {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: none;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
  opacity: 0;
}

.group-header:hover .icon-btn {
  opacity: 1;
}

.icon-btn.edit-btn:hover { background: rgba(59, 130, 246, 0.1); color: var(--accent-blue); }
.icon-btn.delete-btn:hover { background: rgba(239, 68, 68, 0.1); color: var(--accent-red, #ef4444); }

.group-items {
  border-top: 1px solid var(--border-color);
  padding: 4px;
}

.group-items .transfer-item {
  padding: 7px 10px;
}

/* ===== Modal 相关 ===== */
.aura-modal {
  background: var(--surface);
  backdrop-filter: blur(25px);
  border: 1px solid var(--border-color);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.1);
  border-radius: 16px;
}

.btn-glow {
  box-shadow: 0 4px 14px rgba(59, 130, 246, 0.4);
}
.btn-glow:hover {
  box-shadow: 0 6px 20px rgba(59, 130, 246, 0.6);
}

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
  padding: 20px 24px; 
  width: 380px; 
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
  font-size: 15px; 
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
.btn-xs { 
  padding: 4px 10px; 
  font-size: 10.5px; 
  border-radius: 6px;
}

/* 管理分组弹窗 */
.manage-groups-dialog {
  width: 420px;
}

.group-manage-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.group-manage-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  transition: all 0.15s;
}

.group-manage-row:hover {
  background: var(--bg-secondary);
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
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.gm-count {
  font-size: 10.5px;
  color: var(--text-muted);
}

.gm-actions {
  display: flex;
  gap: 4px;
}

.act-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: none;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
}

.act-btn.edit-btn:hover { background: rgba(59, 130, 246, 0.1); }
.act-btn.delete-btn:hover { background: rgba(239, 68, 68, 0.1); }

/* ===== 暗色主题 ===== */
[data-theme="dark"] .mgr-header,
[data-theme="dark"] .panel,
[data-theme="dark"] .dialog,
[data-theme="dark"] .group-manage-row {
  background: var(--surface) !important;
  border-color: var(--border-color) !important;
}

[data-theme="dark"] .panel-header,
[data-theme="dark"] .group-header {
  background: var(--surface-nav) !important;
}

[data-theme="dark"] .active-group .group-header {
  background: rgba(59, 130, 246, 0.06) !important;
}

[data-theme="dark"] .search-bar {
  background: var(--bg-primary) !important;
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
}

[data-theme="dark"] .transfer-item:hover {
  background: rgba(255, 255, 255, 0.03);
}

[data-theme="dark"] .transfer-item.selected {
  background: rgba(59, 130, 246, 0.08);
}

[data-theme="dark"] .transfer-btn {
  background: var(--surface);
  border-color: var(--border-color);
}

[data-theme="dark"] .transfer-btn:not(:disabled):hover {
  background: rgba(59, 130, 246, 0.08);
}

@media (max-width: 768px) {
  .transfer-box {
    flex-direction: column;
  }
  .transfer-actions {
    flex-direction: row;
    padding: 6px 0;
  }
  .transfer-btn {
    width: 36px;
    height: 36px;
  }
}
</style>
