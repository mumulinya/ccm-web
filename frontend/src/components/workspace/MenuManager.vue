<script setup>
import { computed, ref, watch } from 'vue'
import {
  ArrowDown, ArrowUp, Download, Eye, EyeOff, ExternalLink, FileUp, FolderPlus,
  Link2, Menu, Pencil, Pin, PinOff, RotateCcw, Search, Smartphone,
  Trash2, Undo2, X,
} from '@lucide/vue'
import { confirmDialog, toast } from '../../utils/toast.js'
import WorkspacePageShell from '../common/WorkspacePageShell.vue'
import {
  PROTECTED_MENU_IDS,
  buildConfiguredTabs,
  clearMenuConfigurationBackup,
  createDefaultMenuConfiguration,
  exportMenuConfiguration,
  hasMenuConfigurationBackup,
  loadMenuConfiguration,
  parseMenuConfigurationImport,
  resetPersonalMenuConfigurationV3,
  readMenuConfigurationBackup,
  sanitizeExternalUrl,
  saveMenuConfiguration,
  savePersonalMenuConfigurationV3,
  saveWorkspaceMenuConfigurationV3,
} from '../../utils/menuConfiguration.js'

const props = defineProps({
  tabs: { type: Array, default: () => [] },
  config: { type: Object, default: null },
  navigationState: { type: Object, default: null },
  authRole: { type: String, default: 'viewer' },
})
const emit = defineEmits(['update-config'])
const clone = value => JSON.parse(JSON.stringify(value))
const builtInTabs = computed(() => props.tabs.filter(tab => !tab.isExternal).map(({ id, label, icon }) => ({ id, label, icon })))
const draft = ref(clone(props.config || loadMenuConfiguration(builtInTabs.value)))
const query = ref('')
const activeView = ref('all')
const backupAvailable = ref(hasMenuConfigurationBackup())
const showGroupDialog = ref(false)
const groupForm = ref({ id: '', label: '', icon: '📁' })
const showLinkDialog = ref(false)
const linkForm = ref({ id: '', label: '', url: 'https://', icon: '🌐' })
const importInput = ref(null)
const saveBusy = ref(false)
const configurationMode = ref('personal')

const PRESET_ICONS = ['📁', '⭐', '🛠️', '🤝', '📊', '⚙️', '🛡️', '🌐', '🚀', '🔑', '🎨', '🎵', '⚡', '🔍', '📦', '💡', '📅', '📝', '🔔', '💬']
const menuPrimaryAction = computed(() => ({ id: 'save', label: saveBusy.value ? '保存中…' : '保存布局', disabled: saveBusy.value }))
const menuSecondaryActions = computed(() => ([
  { id: 'undo', label: '恢复上一版', icon: Undo2, disabled: !backupAvailable.value },
  { id: 'import', label: '导入配置', icon: FileUp },
  { id: 'export', label: '导出配置', icon: Download },
  { id: 'reset', label: '恢复默认', icon: RotateCcw },
]))
const saveCurrentLayout = () => persist(clone(draft.value), '导航布局已保存')
const handleMenuSecondaryAction = action => {
  if (action?.id === 'undo') undoLast()
  if (action?.id === 'import') importInput.value?.click()
  if (action?.id === 'export') exportConfig()
  if (action?.id === 'reset') resetDefaults()
}

watch(() => props.config, value => {
  if (value && configurationMode.value === 'personal') draft.value = clone(value)
}, { deep: true })
watch(configurationMode, mode => {
  draft.value = clone(mode === 'workspace'
    ? (props.navigationState?.workspaceDefault || createDefaultMenuConfiguration(builtInTabs.value))
    : (props.navigationState?.config || props.config || loadMenuConfiguration(builtInTabs.value)))
  activeView.value = 'all'
})

const configuredTabs = computed(() => buildConfiguredTabs(builtInTabs.value, draft.value))
const groupMap = computed(() => new Map((draft.value.groups || []).map(group => [group.id, group])))
const mobileCount = computed(() => configuredTabs.value.filter(tab => tab.mobilePrimary && !tab.hiddenFromMenu).length)
const hiddenCount = computed(() => configuredTabs.value.filter(tab => tab.hiddenFromMenu).length)
const pinnedCount = computed(() => configuredTabs.value.filter(tab => tab.pinned && !tab.hiddenFromMenu).length)
const externalCount = computed(() => configuredTabs.value.filter(tab => tab.isExternal).length)
const editableExternalIds = computed(() => new Set(configurationMode.value === 'workspace'
  ? (draft.value.customLinks || []).map(link => link.id)
  : (props.navigationState?.personalOverrides?.customLinks || []).map(link => link.id)))

const viewOptions = computed(() => [
  { id: 'all', label: '全部菜单', count: configuredTabs.value.length },
  { id: 'pinned', label: '常用固定', count: pinnedCount.value },
  { id: 'mobile', label: '手机入口', count: mobileCount.value },
  { id: 'hidden', label: '已隐藏', count: hiddenCount.value },
])

const groupCount = groupId => configuredTabs.value.filter(tab => (tab.groupId || 'ungrouped') === groupId).length
const visibleRows = computed(() => {
  const needle = query.value.trim().toLowerCase()
  return configuredTabs.value.filter(tab => {
    if (needle && !`${tab.label} ${tab.id} ${tab.url || ''}`.toLowerCase().includes(needle)) return false
    if (activeView.value === 'all') return true
    if (activeView.value === 'pinned') return tab.pinned && !tab.hiddenFromMenu
    if (activeView.value === 'mobile') return tab.mobilePrimary && !tab.hiddenFromMenu
    if (activeView.value === 'hidden') return tab.hiddenFromMenu
    if (activeView.value === 'ungrouped') return !tab.groupId || tab.groupId === 'ungrouped' || !groupMap.value.has(tab.groupId)
    return tab.groupId === activeView.value
  })
})

const persist = async (next, message) => {
  if (saveBusy.value) return
  saveBusy.value = true
  const previous = clone(draft.value)
  draft.value = clone(next)
  try {
    const currentState = props.navigationState
    if (!currentState) {
      draft.value = saveMenuConfiguration(next, builtInTabs.value)
      emit('update-config', clone(draft.value))
    } else {
      const state = configurationMode.value === 'workspace'
        ? await saveWorkspaceMenuConfigurationV3(next, currentState, builtInTabs.value)
        : await savePersonalMenuConfigurationV3(next, currentState, builtInTabs.value)
      draft.value = clone(configurationMode.value === 'workspace' ? state.workspaceDefault : state.config)
      emit('update-config', { config: clone(state.config), state })
    }
    backupAvailable.value = hasMenuConfigurationBackup()
    if (message) toast.success(message)
  } catch (error) {
    draft.value = previous
    if (error?.code === 'state_drift' || error?.status === 409) toast.warning('导航配置已在其他设备更新，请重新加载后再修改')
    else toast.error(error?.message || '导航配置保存失败')
  } finally {
    saveBusy.value = false
  }
}

const updateItem = (id, changes, message = '导航配置已更新') => {
  const next = clone(draft.value)
  const current = next.items[id]
  if (!current) return
  if (changes.hidden === true && PROTECTED_MENU_IDS.has(id)) return toast.warning('导航配置中心不能隐藏，避免失去管理入口')
  if (changes.mobilePrimary === true && !current.mobilePrimary && mobileCount.value >= 4) return toast.warning('手机主导航最多保留 4 个入口')
  next.items[id] = { ...current, ...changes }
  if (next.items[id].hidden) {
    next.items[id].pinned = false
    next.items[id].mobilePrimary = false
  }
  persist(next, message)
}

const editItemIcon = tab => {
  const value = window.prompt('输入一个 Lucide 图标名（例如 FolderKanban），或单个 Unicode 图标；留空恢复默认。', tab.configuredIcon || '')
  if (value == null) return
  updateItem(tab.id, { icon: value.trim() }, value.trim() ? '菜单图标已更新' : '菜单图标已恢复默认')
}

const moveItem = (id, direction) => {
  const rows = configuredTabs.value.filter(tab => (tab.groupId || 'ungrouped') === (draft.value.items[id]?.groupId || 'ungrouped'))
  const index = rows.findIndex(tab => tab.id === id)
  const targetIndex = index + direction
  if (index < 0 || targetIndex < 0 || targetIndex >= rows.length) return
  const next = clone(draft.value)
  const target = rows[targetIndex]
  const currentOrder = next.items[id].order
  next.items[id].order = next.items[target.id].order
  next.items[target.id].order = currentOrder
  persist(next, '菜单顺序已更新')
}

const openGroupEditor = group => {
  groupForm.value = group ? clone(group) : { id: '', label: '', icon: '📁' }
  showGroupDialog.value = true
}

const saveGroup = () => {
  const label = groupForm.value.label.trim()
  if (!label) return toast.warning('请输入分组名称')
  const next = clone(draft.value)
  if (groupForm.value.id) {
    const index = next.groups.findIndex(group => group.id === groupForm.value.id)
    if (index < 0) return
    next.groups[index] = { ...next.groups[index], label, icon: groupForm.value.icon || '📁' }
  } else {
    next.groups.push({ id: `g_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`, label, icon: groupForm.value.icon || '📁' })
  }
  persist(next, groupForm.value.id ? '分组已更新' : '分组已创建')
  showGroupDialog.value = false
}

const moveGroup = (id, direction) => {
  const next = clone(draft.value)
  const index = next.groups.findIndex(group => group.id === id)
  const targetIndex = index + direction
  if (index < 0 || targetIndex < 0 || targetIndex >= next.groups.length) return
  const [group] = next.groups.splice(index, 1)
  next.groups.splice(targetIndex, 0, group)
  persist(next, '分组顺序已更新')
}

const deleteGroup = async group => {
  const count = groupCount(group.id)
  const approved = await confirmDialog(`删除分组“${group.label}”后，其中 ${count} 个菜单会移到未分组。是否继续？`)
  if (!approved) return
  const next = clone(draft.value)
  next.groups = next.groups.filter(item => item.id !== group.id)
  Object.values(next.items).forEach(item => { if (item.groupId === group.id) item.groupId = 'ungrouped' })
  if (activeView.value === group.id) activeView.value = 'ungrouped'
  persist(next, '分组已删除，原菜单已移到未分组')
}

const openLinkEditor = link => {
  linkForm.value = link ? { id: link.id, label: link.label, url: link.url, icon: link.icon || '🌐' } : { id: '', label: '', url: 'https://', icon: '🌐' }
  showLinkDialog.value = true
}

const saveLink = () => {
  const label = linkForm.value.label.trim()
  if (!label) return toast.warning('请输入链接名称')
  let url
  try { url = sanitizeExternalUrl(linkForm.value.url) } catch (error) { return toast.warning(error.message) }
  const next = clone(draft.value)
  if (linkForm.value.id) {
    const link = next.customLinks.find(item => item.id === linkForm.value.id)
    if (!link) return
    Object.assign(link, { label, url, icon: linkForm.value.icon || '🌐', openMode: 'new_tab' })
  } else {
    const id = `l_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
    next.customLinks.push({ id, label, url, icon: linkForm.value.icon || '🌐', isExternal: true, openMode: 'new_tab' })
    next.items[id] = { groupId: draft.value.groups[0]?.id || 'ungrouped', order: configuredTabs.value.length, hidden: false, pinned: false, mobilePrimary: false }
  }
  persist(next, linkForm.value.id ? '外部链接已更新' : '外部链接已添加')
  showLinkDialog.value = false
}

const deleteLink = async link => {
  if (!editableExternalIds.value.has(link.id)) return toast.warning('工作区链接只能由 Admin 在“工作区默认”中修改')
  const approved = await confirmDialog(`确定删除外部链接“${link.label}”吗？该操作不会影响目标网站。`)
  if (!approved) return
  const next = clone(draft.value)
  next.customLinks = next.customLinks.filter(item => item.id !== link.id)
  delete next.items[link.id]
  persist(next, '外部链接已删除')
}

const exportConfig = () => {
  const blob = new Blob([exportMenuConfiguration(draft.value, builtInTabs.value)], { type: 'application/json;charset=utf-8' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `ccm-navigation-${new Date().toISOString().slice(0, 10)}.json`
  link.click()
  URL.revokeObjectURL(link.href)
  toast.success('导航配置已导出')
}

const importConfig = async event => {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  if (file.size > 512 * 1024) return toast.error('配置文件不能超过 512 KB')
  try {
    const config = parseMenuConfigurationImport(await file.text(), builtInTabs.value)
    await persist(config, '导航配置已导入并同步')
  } catch (error) { toast.error(error.message || '配置导入失败') }
}

const resetDefaults = async () => {
  const approved = await confirmDialog('恢复默认会重置分组、顺序、隐藏、固定、手机入口和外部链接。当前配置会保留为可撤销备份。是否继续？')
  if (!approved) return
  try {
    if (configurationMode.value === 'personal' && props.navigationState) {
      const state = await resetPersonalMenuConfigurationV3(props.navigationState, builtInTabs.value)
      draft.value = clone(state.config)
      emit('update-config', { config: clone(state.config), state })
      toast.success('已恢复工作区默认导航')
    } else {
      const config = createDefaultMenuConfiguration(builtInTabs.value)
      await persist(config, '工作区默认导航已重置')
    }
    backupAvailable.value = true
    activeView.value = 'all'
  } catch (error) { toast.error(error?.message || '恢复默认失败') }
}

const undoLast = async () => {
  try {
    const config = readMenuConfigurationBackup(builtInTabs.value)
    await persist(config, '已恢复上一版导航配置')
    clearMenuConfigurationBackup()
    backupAvailable.value = false
  } catch (error) { toast.warning(error.message) }
}
</script>

<template>
  <WorkspacePageShell
    title="菜单管理"
    description="管理全局菜单分组、常用入口固定与手机端导航"
    :primary-action="menuPrimaryAction"
    :secondary-actions="menuSecondaryActions"
    @primary-action="saveCurrentLayout"
    @secondary-action="handleMenuSecondaryAction"
  >
    <template #status>
      <div class="config-scope-segmented" role="group" aria-label="配置范围">
        <button
          type="button"
          class="pill-btn"
          :class="{ active: configurationMode === 'personal' }"
          @click="configurationMode = 'personal'"
        >
          个人布局
        </button>
        <button
          v-if="authRole === 'admin'"
          type="button"
          class="pill-btn"
          :class="{ active: configurationMode === 'workspace' }"
          @click="configurationMode = 'workspace'"
        >
          工作区默认
        </button>
      </div>
      <span v-if="saveBusy" class="saving-state">正在同步…</span>
    </template>

    <div class="navigation-center" :class="{ saving: saveBusy }" :aria-busy="saveBusy">
      <input ref="importInput" type="file" accept="application/json,.json" hidden @change="importConfig" />

      <!-- 3 格现代 KPI 卡片 -->
      <section class="config-summary" aria-label="导航统计">
        <div class="summary-kpi-card">
          <Eye :size="18" class="kpi-icon blue" />
          <div class="kpi-copy">
            <small>当前显示菜单</small>
            <strong class="font-mono">{{ configuredTabs.length - hiddenCount }}</strong>
          </div>
        </div>
        <div class="summary-kpi-card">
          <Pin :size="18" class="kpi-icon green" />
          <div class="kpi-copy">
            <small>常用固定入口</small>
            <strong class="font-mono">{{ pinnedCount }}</strong>
          </div>
        </div>
        <div class="summary-kpi-card">
          <Smartphone :size="18" class="kpi-icon purple" />
          <div class="kpi-copy">
            <small>手机主导航</small>
            <strong class="font-mono">{{ mobileCount }} / 4</strong>
          </div>
        </div>
      </section>

      <!-- 双栏配置区 -->
      <div class="config-layout" :inert="saveBusy || undefined">
        <!-- 左侧分组侧栏 -->
        <aside class="group-sidebar">
          <div class="sidebar-heading">
            <strong>视图与分组</strong>
            <button class="add-group-btn" title="新建分组" @click="openGroupEditor(null)">
              <FolderPlus :size="15" />
            </button>
          </div>
          <nav class="view-list" aria-label="菜单视图">
            <button
              v-for="view in viewOptions"
              :key="view.id"
              :class="{ active: activeView === view.id }"
              @click="activeView = view.id"
            >
              <span>{{ view.label }}</span>
              <small class="font-mono">{{ view.count }}</small>
            </button>
          </nav>
          <div class="group-heading">功能分组</div>
          <div class="group-list">
            <div
              v-for="(group, index) in draft.groups"
              :key="group.id"
              class="group-row"
              :class="{ active: activeView === group.id }"
            >
              <button class="group-select" @click="activeView = group.id">
                <span>{{ group.icon }} {{ group.label }}</span>
                <small class="font-mono">{{ groupCount(group.id) }}</small>
              </button>
              <div class="row-actions">
                <button title="上移分组" :disabled="index === 0" @click="moveGroup(group.id, -1)"><ArrowUp :size="13" /></button>
                <button title="下移分组" :disabled="index === draft.groups.length - 1" @click="moveGroup(group.id, 1)"><ArrowDown :size="13" /></button>
                <button title="编辑分组" @click="openGroupEditor(group)"><Pencil :size="13" /></button>
                <button class="danger" title="删除分组" @click="deleteGroup(group)"><Trash2 :size="13" /></button>
              </div>
            </div>
            <button class="ungrouped-row" :class="{ active: activeView === 'ungrouped' }" @click="activeView = 'ungrouped'">
              <span>📁 未分组</span>
              <small class="font-mono">{{ groupCount('ungrouped') }}</small>
            </button>
          </div>
        </aside>

        <!-- 右侧菜单工作台 -->
        <main class="menu-workspace">
          <div class="workspace-toolbar">
            <label class="menu-search">
              <Search :size="15" />
              <input v-model="query" placeholder="搜索菜单名称、ID 或链接..." />
              <button v-if="query" class="clear-query-btn" title="清除搜索" @click.prevent="query = ''"><X :size="13" /></button>
            </label>
            <button class="add-link-btn" @click="openLinkEditor(null)">
              <Link2 :size="15" />
              <span>新增外部链接</span>
            </button>
          </div>
          <div class="column-head">
            <span>菜单信息</span>
            <span>所属分组</span>
            <span>显示</span>
            <span>常用</span>
            <span>手机</span>
            <span>顺序</span>
            <span class="text-right">操作</span>
          </div>
          <div class="menu-list">
            <div v-if="!visibleRows.length" class="empty-state">没有匹配的菜单项</div>
            <article
              v-for="tab in visibleRows"
              :key="tab.id"
              class="menu-row"
              :class="{ muted: tab.hiddenFromMenu }"
              :data-menu-id="tab.id"
            >
              <div class="menu-identity">
                <span class="menu-icon-wrap">{{ tab.displayIcon }}</span>
                <div>
                  <strong>{{ tab.label }}</strong>
                  <small class="font-mono">{{ tab.id }}</small>
                  <a v-if="tab.isExternal" :href="tab.url" target="_blank" rel="noopener noreferrer">
                    <ExternalLink :size="11" />{{ tab.url }}
                  </a>
                </div>
              </div>
              <select
                :value="tab.groupId || 'ungrouped'"
                class="group-select-input"
                :aria-label="`${tab.label} 所属分组`"
                @change="updateItem(tab.id, { groupId: $event.target.value })"
              >
                <option value="ungrouped">未分组</option>
                <option v-for="group in draft.groups" :key="group.id" :value="group.id">{{ group.label }}</option>
              </select>
              <button
                class="state-button"
                :class="{ active: !tab.hiddenFromMenu }"
                :title="tab.hiddenFromMenu ? '显示菜单' : '隐藏菜单'"
                :disabled="PROTECTED_MENU_IDS.has(tab.id)"
                @click="updateItem(tab.id, { hidden: !tab.hiddenFromMenu })"
              >
                <Eye v-if="!tab.hiddenFromMenu" :size="15" />
                <EyeOff v-else :size="15" />
              </button>
              <button
                class="state-button"
                :class="{ active: tab.pinned }"
                :title="tab.pinned ? '取消固定' : '固定到常用'"
                :disabled="tab.hiddenFromMenu"
                @click="updateItem(tab.id, { pinned: !tab.pinned })"
              >
                <PinOff v-if="tab.pinned" :size="15" />
                <Pin v-else :size="15" />
              </button>
              <button
                class="state-button"
                :class="{ active: tab.mobilePrimary }"
                :title="tab.mobilePrimary ? '移出手机主导航' : '加入手机主导航'"
                :disabled="tab.hiddenFromMenu"
                @click="updateItem(tab.id, { mobilePrimary: !tab.mobilePrimary })"
              >
                <Smartphone :size="15" />
              </button>
              <div class="order-actions">
                <button title="上移菜单" @click="moveItem(tab.id, -1)"><ArrowUp :size="13" /></button>
                <button title="下移菜单" @click="moveItem(tab.id, 1)"><ArrowDown :size="13" /></button>
              </div>
              <div class="item-actions">
                <button title="修改菜单图标" @click="editItemIcon(tab)"><Pencil :size="14" /></button>
                <button v-if="tab.isExternal && editableExternalIds.has(tab.id)" title="编辑外部链接" @click="openLinkEditor(tab)"><Link2 :size="14" /></button>
                <button v-if="tab.isExternal && editableExternalIds.has(tab.id)" class="danger" title="删除外部链接" @click="deleteLink(tab)"><Trash2 :size="14" /></button>
              </div>
            </article>
          </div>
        </main>
      </div>

      <!-- 分组弹窗 -->
      <div v-if="showGroupDialog" class="dialog-overlay" @click.self="showGroupDialog = false" @keydown.esc="showGroupDialog = false">
        <section class="config-dialog" role="dialog" aria-modal="true" aria-labelledby="group-dialog-title">
          <header>
            <strong id="group-dialog-title">{{ groupForm.id ? '编辑分组' : '新建分组' }}</strong>
            <button class="dialog-close-btn" title="关闭" @click="showGroupDialog = false"><X :size="16" /></button>
          </header>
          <div class="dialog-body">
            <label>
              <span>分组名称</span>
              <input v-model="groupForm.label" maxlength="48" autofocus class="dialog-input" @keydown.enter="saveGroup" />
            </label>
            <div class="icon-picker">
              <span>预设图标</span>
              <div class="icon-grid">
                <button
                  v-for="icon in PRESET_ICONS"
                  :key="icon"
                  type="button"
                  class="icon-opt-btn"
                  :class="{ active: groupForm.icon === icon }"
                  @click="groupForm.icon = icon"
                >
                  {{ icon }}
                </button>
              </div>
            </div>
          </div>
          <footer>
            <button class="btn btn-cancel" @click="showGroupDialog = false">取消</button>
            <button class="btn btn-primary" @click="saveGroup">保存</button>
          </footer>
        </section>
      </div>

      <!-- 链接弹窗 -->
      <div v-if="showLinkDialog" class="dialog-overlay" @click.self="showLinkDialog = false" @keydown.esc="showLinkDialog = false">
        <section class="config-dialog" role="dialog" aria-modal="true" aria-labelledby="link-dialog-title">
          <header>
            <strong id="link-dialog-title">{{ linkForm.id ? '编辑外部链接' : '新增外部链接' }}</strong>
            <button class="dialog-close-btn" title="关闭" @click="showLinkDialog = false"><X :size="16" /></button>
          </header>
          <div class="dialog-body">
            <label>
              <span>链接名称</span>
              <input v-model="linkForm.label" maxlength="48" autofocus class="dialog-input" />
            </label>
            <label>
              <span>HTTP/HTTPS 地址</span>
              <input v-model="linkForm.url" inputmode="url" class="dialog-input" @keydown.enter="saveLink" />
            </label>
            <div class="icon-picker">
              <span>预设图标</span>
              <div class="icon-grid">
                <button
                  v-for="icon in PRESET_ICONS"
                  :key="icon"
                  type="button"
                  class="icon-opt-btn"
                  :class="{ active: linkForm.icon === icon }"
                  @click="linkForm.icon = icon"
                >
                  {{ icon }}
                </button>
              </div>
            </div>
          </div>
          <footer>
            <button class="btn btn-cancel" @click="showLinkDialog = false">取消</button>
            <button class="btn btn-primary" @click="saveLink">保存</button>
          </footer>
        </section>
      </div>
    </div>
  </WorkspacePageShell>
</template>

<style scoped>
.font-mono {
  font-family: var(--font-mono, monospace);
  font-variant-numeric: tabular-nums;
}

.navigation-center {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.config-scope-segmented {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 3px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--control-bg, var(--bg-primary));
}

.pill-btn {
  height: 28px;
  padding: 0 12px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--text-muted);
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.pill-btn:hover {
  color: var(--text-primary);
}

.pill-btn.active {
  background: var(--surface, var(--bg-card));
  color: var(--accent-blue);
  font-weight: 700;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.saving-state {
  color: var(--text-muted);
  font-size: 11px;
}

/* 3 格 KPI 卡片 */
.config-summary {
  flex: 0 0 auto;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  padding: 12px 24px 0;
}

.summary-kpi-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--surface, var(--bg-card));
  box-shadow: var(--shadow-sm);
}

.kpi-icon {
  flex-shrink: 0;
}
.kpi-icon.blue { color: var(--accent-blue); }
.kpi-icon.green { color: var(--accent-green, #10b981); }
.kpi-icon.purple { color: #8b5cf6; }

.kpi-copy {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.kpi-copy small {
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 500;
}

.kpi-copy strong {
  color: var(--text-primary);
  font-size: 15px;
  font-weight: 700;
}

/* 双栏布局 */
.config-layout {
  flex: 1;
  min-height: 0;
  display: flex;
  margin: 12px 24px 24px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--surface, var(--bg-card));
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

.group-sidebar {
  width: 250px;
  flex: 0 0 250px;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--border-color);
  background: var(--panel-muted);
}

.sidebar-heading {
  min-height: 42px;
  padding: 8px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border-color);
  font-size: 12px;
  font-weight: 700;
  color: var(--text-primary);
}

.add-group-btn {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--surface);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
}

.add-group-btn:hover {
  border-color: var(--accent-blue);
  color: var(--accent-blue);
}

.view-list {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.view-list button,
.group-select,
.ungrouped-row {
  width: 100%;
  min-height: 34px;
  padding: 0 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  text-align: left;
  transition: all 0.15s ease;
}

.view-list button:hover,
.view-list button.active,
.group-row.active,
.ungrouped-row.active {
  background: var(--accent-soft);
  color: var(--accent-blue);
  border-color: color-mix(in srgb, var(--accent-blue) 30%, transparent);
}

.view-list small,
.group-select small,
.ungrouped-row small {
  color: var(--text-muted);
  font-size: 11px;
}

.group-heading {
  padding: 10px 14px 4px;
  color: var(--text-muted);
  font-size: 10.5px;
  font-weight: 700;
  text-transform: uppercase;
}

.group-list {
  flex: 1;
  min-height: 0;
  padding: 4px 8px 12px;
  overflow-y: auto;
}

.group-row {
  min-height: 36px;
  display: flex;
  align-items: center;
  border-radius: 6px;
  transition: background 0.15s ease;
}

.group-select {
  min-width: 0;
  flex: 1;
}

.group-select span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row-actions {
  display: none;
  align-items: center;
  gap: 2px;
  padding-right: 4px;
}

.group-row:hover .row-actions,
.group-row:focus-within .row-actions {
  display: flex;
}

.row-actions button {
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.15s ease;
}

.row-actions button:hover {
  color: var(--text-primary);
  background: var(--surface);
}

.row-actions button.danger:hover {
  color: var(--accent-red, #ef4444);
}

.ungrouped-row {
  margin-top: 4px;
}

/* 右侧菜单舞台 */
.menu-workspace {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--surface, var(--bg-card));
}

.workspace-toolbar {
  min-height: 48px;
  padding: 8px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid var(--border-color);
}

.menu-search {
  width: min(380px, 60%);
  height: 34px;
  padding: 0 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--control-bg, var(--bg-primary));
  color: var(--text-muted);
  transition: border-color 0.15s ease;
}

.menu-search:focus-within {
  border-color: var(--accent-blue);
  box-shadow: var(--focus-ring);
}

.menu-search input {
  min-width: 0;
  flex: 1;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--text-primary);
  font-size: 12px;
}

.clear-query-btn {
  width: 20px;
  height: 20px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
}

.add-link-btn {
  height: 34px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--surface);
  color: var(--accent-blue);
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.add-link-btn:hover {
  border-color: var(--accent-blue);
  background: var(--accent-soft);
}

.column-head,
.menu-row {
  display: grid;
  grid-template-columns: minmax(220px, 1.5fr) minmax(130px, 0.7fr) 52px 52px 52px 64px 60px;
  align-items: center;
  column-gap: 8px;
}

.column-head {
  min-height: 34px;
  padding: 0 16px;
  border-bottom: 1px solid var(--border-color);
  background: var(--panel-muted);
  color: var(--text-muted);
  font-size: 10.5px;
  font-weight: 700;
}

.column-head span:nth-child(n+3) {
  text-align: center;
}

.column-head .text-right {
  text-align: right;
}

.menu-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.menu-row {
  min-height: 56px;
  padding: 6px 16px;
  border-bottom: 1px solid var(--border-color);
  transition: background 0.15s ease;
}

.menu-row:hover {
  background: var(--control-hover, rgba(148, 163, 184, 0.04));
}

.menu-row.muted {
  opacity: 0.55;
}

.menu-identity {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.menu-icon-wrap {
  width: 32px;
  height: 32px;
  flex: 0 0 32px;
  display: grid;
  place-items: center;
  border-radius: 6px;
  background: var(--panel-muted);
  border: 1px solid var(--border-color);
  font-size: 15px;
}

.menu-identity div {
  min-width: 0;
}

.menu-identity strong {
  display: block;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.menu-identity small {
  display: block;
  margin-top: 1px;
  color: var(--text-muted);
  font-size: 10px;
}

.menu-identity a {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  max-width: 260px;
  margin-top: 2px;
  color: var(--accent-blue);
  font-size: 10px;
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.group-select-input {
  width: 100%;
  height: 30px;
  padding: 0 8px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--control-bg, var(--bg-primary));
  color: var(--text-secondary);
  font-size: 11px;
  outline: 0;
  transition: border-color 0.15s ease;
}

.group-select-input:focus {
  border-color: var(--accent-blue);
  box-shadow: var(--focus-ring);
}

.state-button {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  padding: 0;
  justify-self: center;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--surface);
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.15s ease;
}

.state-button:hover {
  border-color: var(--accent-blue);
  color: var(--text-primary);
}

.state-button.active {
  color: var(--accent-blue);
  border-color: color-mix(in srgb, var(--accent-blue) 35%, var(--border-color));
  background: var(--accent-soft);
}

.state-button:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.order-actions,
.item-actions {
  display: flex;
  justify-content: center;
  gap: 4px;
}

.order-actions button,
.item-actions button {
  width: 26px;
  height: 26px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 1px solid var(--border-color);
  border-radius: 5px;
  background: var(--surface);
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.15s ease;
}

.order-actions button:hover,
.item-actions button:hover {
  border-color: var(--accent-blue);
  color: var(--text-primary);
}

.item-actions button.danger:hover {
  border-color: var(--accent-red, #ef4444);
  color: var(--accent-red, #ef4444);
}

.empty-state {
  padding: 60px 16px;
  text-align: center;
  color: var(--text-muted);
  font-size: 12px;
}

/* 弹窗样式 */
.dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 10020;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: var(--overlay-scrim, rgba(15, 23, 42, 0.55));
  backdrop-filter: blur(4px);
}

.config-dialog {
  width: min(460px, 100%);
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--surface, var(--bg-card));
  box-shadow: var(--shadow-lg);
}

.config-dialog header {
  min-height: 48px;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border-color);
}

.config-dialog header strong {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
}

.dialog-close-btn {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
}

.dialog-close-btn:hover {
  background: var(--panel-muted);
  color: var(--text-primary);
}

.dialog-body {
  padding: 16px;
  overflow-y: auto;
}

.dialog-body label > span,
.icon-picker > span {
  display: block;
  margin-bottom: 5px;
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 600;
}

.dialog-body label + label,
.dialog-body label + .icon-picker {
  display: block;
  margin-top: 12px;
}

.dialog-input {
  width: 100%;
  height: 34px;
  box-sizing: border-box;
  padding: 0 10px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--control-bg, var(--bg-primary));
  color: var(--text-primary);
  font-size: 12px;
  outline: 0;
  transition: border-color 0.15s ease;
}

.dialog-input:focus {
  border-color: var(--accent-blue);
  box-shadow: var(--focus-ring);
}

.icon-picker {
  margin-top: 12px;
}

.icon-grid {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 4px;
}

.icon-opt-btn {
  min-width: 0;
  height: 32px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--surface);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.icon-opt-btn:hover {
  border-color: var(--accent-blue);
}

.icon-opt-btn.active {
  border-color: var(--accent-blue);
  background: var(--accent-soft);
}

.config-dialog footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid var(--border-color);
  background: var(--panel-muted);
}

.btn {
  height: 32px;
  padding: 0 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-cancel {
  background: var(--surface);
  color: var(--text-secondary);
}

.btn-primary {
  border-color: var(--accent-blue);
  background: var(--accent-blue);
  color: #fff;
}

.btn-primary:hover {
  background: color-mix(in srgb, var(--accent-blue) 88%, #000);
}

@media (max-width: 900px) {
  .column-head,
  .menu-row {
    grid-template-columns: minmax(180px, 1fr) 120px 42px 42px 42px 60px 48px;
  }
  .group-sidebar {
    width: 220px;
    flex-basis: 220px;
  }
}

@media (max-width: 768px) {
  .navigation-center {
    overflow: auto;
  }
  .config-summary {
    grid-template-columns: 1fr;
    padding: 8px 12px 0;
  }
  .config-layout {
    flex: none;
    min-height: 760px;
    margin: 8px 12px 70px;
    flex-direction: column;
    overflow: visible;
  }
  .group-sidebar {
    width: 100%;
    flex: 0 0 auto;
    border-right: 0;
    border-bottom: 1px solid var(--border-color);
  }
  .view-list {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
  }
  .view-list button {
    padding: 0 5px;
  }
  .workspace-toolbar {
    align-items: stretch;
    flex-direction: column;
  }
  .menu-search {
    width: 100%;
  }
  .column-head {
    display: none;
  }
  .menu-row {
    grid-template-columns: minmax(0, 1fr) repeat(3, 34px);
    grid-template-areas: 'identity visible pinned mobile' 'group order order actions';
    row-gap: 8px;
    min-height: 94px;
  }
  .menu-identity { grid-area: identity; }
  .group-select-input { grid-area: group; }
  .menu-row > .state-button:nth-of-type(1) { grid-area: visible; }
  .menu-row > .state-button:nth-of-type(2) { grid-area: pinned; }
  .menu-row > .state-button:nth-of-type(3) { grid-area: mobile; }
  .order-actions { grid-area: order; justify-content: flex-start; }
  .item-actions { grid-area: actions; }
  .icon-grid { grid-template-columns: repeat(5, 1fr); }
}
</style>
