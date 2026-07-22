import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  MENU_CONFIG_BACKUP_KEY,
  MENU_CONFIG_KEY,
  buildConfiguredTabs,
  createDefaultMenuConfiguration,
  exportMenuConfiguration,
  importMenuConfiguration,
  loadMenuConfiguration,
  normalizeMenuConfiguration,
  restoreMenuConfigurationBackup,
  sanitizeExternalUrl,
  saveMenuConfiguration,
} from '../frontend/src/utils/menuConfiguration.js'

class MemoryStorage {
  values = new Map()
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null }
  setItem(key, value) { this.values.set(key, String(value)) }
  removeItem(key) { this.values.delete(key) }
}

const tabs = [
  { id: 'dashboard', label: '我的工作台', icon: 'D' },
  { id: 'global-agent', label: '全局助手', icon: 'G' },
  { id: 'groups', label: '群聊协作', icon: 'C' },
  { id: 'tasks', label: '任务派发', icon: 'T' },
  { id: 'knowledge', label: '知识库与文档', icon: 'K' },
  { id: 'memory-center', label: '记忆控制中心', icon: 'M' },
  { id: 'cleanup-center', label: '清理中心', icon: 'X' },
  { id: 'menumanager', label: '菜单管理', icon: 'N' },
]

const legacy = new MemoryStorage()
legacy.setItem('menu-groups', JSON.stringify([{ id: 'core', label: '核心', icon: 'C' }, { id: 'data', label: '数据', icon: 'D' }, { id: 'system', label: '系统', icon: 'S' }]))
legacy.setItem('menu-tab-groups', JSON.stringify({ dashboard: 'core' }))
legacy.setItem('menu-custom-links', JSON.stringify([
  { id: 'l_docs', label: '安全文档', url: 'https://example.com/docs', icon: 'L', isExternal: true },
  { id: 'l_bad', label: '危险链接', url: 'javascript:alert(1)', icon: 'B', isExternal: true },
]))
legacy.setItem('tab-order', JSON.stringify(['knowledge', 'dashboard']))
const migrated = loadMenuConfiguration(tabs, legacy)
assert.equal(migrated.version, 2)
assert.equal(migrated.items.knowledge.groupId, 'data', 'newly introduced knowledge page must keep current default group')
assert.equal(migrated.items['memory-center'].groupId, 'data')
assert.equal(migrated.items['cleanup-center'].groupId, 'system')
assert.equal(migrated.items.menumanager.groupId, 'system')
assert.equal(migrated.customLinks.length, 1, 'unsafe legacy links must be dropped')
assert.equal(JSON.parse(legacy.getItem(MENU_CONFIG_KEY)).schema, 'ccm-navigation-config-v2')

assert.throws(() => sanitizeExternalUrl('javascript:alert(1)'), /HTTP/)
assert.throws(() => sanitizeExternalUrl('https://user:secret@example.com'), /账号或密码/)
assert.equal(sanitizeExternalUrl('https://example.com/path'), 'https://example.com/path')

const unsafeState = createDefaultMenuConfiguration(tabs)
unsafeState.items.menumanager.hidden = true
unsafeState.items.dashboard.hidden = true
unsafeState.items.dashboard.pinned = true
unsafeState.items.dashboard.mobilePrimary = true
Object.values(unsafeState.items).forEach(item => { item.mobilePrimary = true })
const normalized = normalizeMenuConfiguration(unsafeState, tabs)
assert.equal(normalized.items.menumanager.hidden, false, 'manager entry must remain recoverable')
assert.equal(normalized.items.dashboard.pinned, false, 'hidden menu must leave pinned section')
assert.equal(normalized.items.dashboard.mobilePrimary, false, 'hidden menu must leave mobile primary navigation')
assert.ok(Object.values(normalized.items).filter(item => item.mobilePrimary).length <= 4)

const storage = new MemoryStorage()
const first = saveMenuConfiguration(createDefaultMenuConfiguration(tabs), tabs, storage)
const changed = JSON.parse(JSON.stringify(first))
changed.items.knowledge.pinned = true
changed.items.tasks.mobilePrimary = false
changed.items.knowledge.mobilePrimary = true
changed.customLinks.push({ id: 'l_safe', label: '文档', icon: 'L', url: 'https://example.com', isExternal: true })
changed.items.l_safe = { groupId: 'data', order: 99, hidden: false, pinned: false, mobilePrimary: false }
const second = saveMenuConfiguration(changed, tabs, storage)
assert.ok(storage.getItem(MENU_CONFIG_BACKUP_KEY), 'save must keep one recoverable previous version')
const configured = buildConfiguredTabs(tabs, second)
assert.equal(configured.find(tab => tab.id === 'knowledge').pinned, true)
assert.equal(configured.find(tab => tab.id === 'l_safe').openMode, 'new_tab')
const restored = restoreMenuConfigurationBackup(tabs, storage)
assert.equal(restored.items.knowledge.pinned, false)
assert.equal(storage.getItem(MENU_CONFIG_BACKUP_KEY), null)

const imported = importMenuConfiguration(exportMenuConfiguration(second, tabs), tabs, storage)
assert.equal(imported.customLinks[0].url, 'https://example.com/')
assert.throws(() => importMenuConfiguration('{broken', tabs, storage), /有效 JSON/)
assert.throws(() => importMenuConfiguration(JSON.stringify({ schema: 'wrong' }), tabs, storage), /类型不正确/)

const root = process.cwd()
const app = fs.readFileSync(path.join(root, 'frontend/src/App.vue'), 'utf8')
const manager = fs.readFileSync(path.join(root, 'frontend/src/components/workspace/MenuManager.vue'), 'utf8')
assert.ok(app.includes("id: 'menumanager'") && app.includes('<MenuManager'), 'the single menu center should remain registered as a real page')
assert.ok(!app.includes('showMenuManager'), 'legacy duplicate menu modal must be removed')
assert.ok(!app.includes('<iframe :src="tab.url"'), 'custom links must not run in an unsandboxed iframe')
assert.ok(app.includes("window.open(tabInfo.url, '_blank', 'noopener,noreferrer')"))
assert.ok(manager.includes('手机主导航最多保留 4 个入口'))
assert.ok(manager.includes('importMenuConfiguration') && manager.includes('exportMenuConfiguration'))

console.log(JSON.stringify({
  success: true,
  checks: {
    legacyMigrationPreservesAllCurrentDefaultGroups: true,
    unsafeLegacyAndNewUrlsRejected: true,
    protectedManagerCannotBeHidden: true,
    hiddenItemsLeavePinnedAndMobileNavigation: true,
    mobilePrimaryLimitedToFour: true,
    previousVersionCanBeRestored: true,
    importExportRoundTripValidated: true,
    duplicateManagerAndUnsafeIframeRemoved: true,
  },
}, null, 2))
