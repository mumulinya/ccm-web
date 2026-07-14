export const MENU_CONFIG_SCHEMA = 'ccm-navigation-config-v2'
export const MENU_CONFIG_VERSION = 2
export const MENU_CONFIG_KEY = 'ccm-navigation-config-v2'
export const MENU_CONFIG_BACKUP_KEY = 'ccm-navigation-config-v2-backup'
export const MENU_CONFIG_EVENT = 'ccm-navigation-config-changed'

export const DEFAULT_MENU_GROUPS = [
  { id: 'core', label: '核心功能', icon: '⭐' },
  { id: 'dev', label: '开发工具', icon: '🛠️' },
  { id: 'collab', label: '协作管理', icon: '🤝' },
  { id: 'data', label: '数据监控', icon: '📊' },
  { id: 'system', label: '系统', icon: '⚙️' },
]

export const DEFAULT_MENU_ASSIGNMENTS = {
  dashboard: 'core',
  projects: 'core',
  'global-agent': 'core',
  groups: 'collab',
  tasks: 'collab',
  'trace-replay': 'collab',
  autodev: 'collab',
  tools: 'dev',
  changes: 'dev',
  terminal: 'dev',
  knowledge: 'data',
  'memory-center': 'data',
  metrics: 'data',
  search: 'data',
  'cleanup-center': 'system',
  cron: 'system',
  pets: 'system',
  music: 'system',
  settings: 'system',
  menumanager: 'system',
}

export const DEFAULT_MOBILE_PRIMARY_IDS = ['dashboard', 'global-agent', 'groups', 'tasks']
export const PROTECTED_MENU_IDS = new Set(['menumanager'])

const clone = value => JSON.parse(JSON.stringify(value))
const safeStorage = storage => storage || (typeof localStorage !== 'undefined' ? localStorage : null)
const cleanLabel = (value, fallback = '') => String(value || '').replace(/\s+/g, ' ').trim().slice(0, 48) || fallback
const cleanIcon = (value, fallback = '📁') => String(value || '').trim().slice(0, 8) || fallback
const validId = value => /^[a-zA-Z0-9_-]{1,80}$/.test(String(value || '')) && value !== 'ungrouped'

export function sanitizeExternalUrl(value) {
  let parsed
  try { parsed = new URL(String(value || '').trim()) } catch { throw new Error('请输入完整的 http:// 或 https:// 链接') }
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('外部链接只允许使用 HTTP 或 HTTPS')
  if (parsed.username || parsed.password) throw new Error('外部链接不能包含账号或密码')
  return parsed.toString()
}

function normalizeCustomLinks(rawLinks = []) {
  const seen = new Set()
  const links = []
  for (const raw of Array.isArray(rawLinks) ? rawLinks : []) {
    const id = validId(raw?.id) && String(raw.id).startsWith('l_') ? String(raw.id) : ''
    if (!id || seen.has(id)) continue
    try {
      links.push({
        id,
        label: cleanLabel(raw.label, '外部链接'),
        icon: cleanIcon(raw.icon, '🌐'),
        url: sanitizeExternalUrl(raw.url),
        isExternal: true,
        openMode: 'new_tab',
      })
      seen.add(id)
    } catch {}
  }
  return links
}

export function createDefaultMenuConfiguration(tabDefinitions = []) {
  const items = {}
  tabDefinitions.forEach((tab, order) => {
    items[tab.id] = {
      groupId: DEFAULT_MENU_ASSIGNMENTS[tab.id] || 'ungrouped',
      order,
      hidden: false,
      pinned: false,
      mobilePrimary: DEFAULT_MOBILE_PRIMARY_IDS.includes(tab.id),
    }
  })
  return {
    schema: MENU_CONFIG_SCHEMA,
    version: MENU_CONFIG_VERSION,
    updatedAt: new Date().toISOString(),
    groups: clone(DEFAULT_MENU_GROUPS),
    items,
    customLinks: [],
  }
}

export function normalizeMenuConfiguration(raw, tabDefinitions = []) {
  const defaults = createDefaultMenuConfiguration(tabDefinitions)
  const source = raw && typeof raw === 'object' ? raw : defaults
  const groupSeen = new Set()
  const groups = (Array.isArray(source.groups) && source.groups.length ? source.groups : defaults.groups).flatMap(group => {
    const id = validId(group?.id) ? String(group.id) : ''
    if (!id || groupSeen.has(id)) return []
    groupSeen.add(id)
    return [{ id, label: cleanLabel(group.label, '未命名分组'), icon: cleanIcon(group.icon) }]
  })
  const validGroups = new Set(groups.map(group => group.id))
  const customLinks = normalizeCustomLinks(source.customLinks)
  const allDefinitions = [...tabDefinitions, ...customLinks]
  const items = {}
  const mobileIds = []
  allDefinitions.forEach((tab, fallbackOrder) => {
    const current = source.items?.[tab.id] || defaults.items[tab.id] || {}
    const defaultGroup = defaults.items[tab.id]?.groupId || (tab.isExternal ? 'core' : 'ungrouped')
    const requestedGroup = String(current.groupId || defaultGroup)
    const hidden = PROTECTED_MENU_IDS.has(tab.id) ? false : current.hidden === true
    const mobilePrimary = !hidden && current.mobilePrimary === true && mobileIds.length < 4
    if (mobilePrimary) mobileIds.push(tab.id)
    items[tab.id] = {
      groupId: validGroups.has(requestedGroup) ? requestedGroup : requestedGroup === 'ungrouped' ? 'ungrouped' : validGroups.has(defaultGroup) ? defaultGroup : 'ungrouped',
      order: Number.isFinite(Number(current.order)) ? Number(current.order) : fallbackOrder,
      hidden,
      pinned: !hidden && current.pinned === true,
      mobilePrimary,
    }
  })
  return {
    schema: MENU_CONFIG_SCHEMA,
    version: MENU_CONFIG_VERSION,
    updatedAt: String(source.updatedAt || new Date().toISOString()),
    groups,
    items,
    customLinks,
  }
}

function parseJson(value, fallback = null) {
  try { return JSON.parse(value) } catch { return fallback }
}

export function migrateLegacyMenuConfiguration(tabDefinitions = [], storage) {
  const target = safeStorage(storage)
  const config = createDefaultMenuConfiguration(tabDefinitions)
  if (!target) return config
  const groups = parseJson(target.getItem('menu-groups'), null)
  const assignments = parseJson(target.getItem('menu-tab-groups'), null)
  const customLinks = normalizeCustomLinks(parseJson(target.getItem('menu-custom-links'), []))
  const order = parseJson(target.getItem('tab-order'), [])
  if (Array.isArray(groups) && groups.length) config.groups = groups
  config.customLinks = customLinks
  const ids = [...tabDefinitions.map(tab => tab.id), ...customLinks.map(link => link.id)]
  ids.forEach((id, fallbackOrder) => {
    config.items[id] = {
      groupId: assignments?.[id] || DEFAULT_MENU_ASSIGNMENTS[id] || (id.startsWith('l_') ? 'core' : 'ungrouped'),
      order: Array.isArray(order) && order.includes(id) ? order.indexOf(id) : fallbackOrder,
      hidden: false,
      pinned: false,
      mobilePrimary: DEFAULT_MOBILE_PRIMARY_IDS.includes(id),
    }
  })
  return normalizeMenuConfiguration(config, tabDefinitions)
}

export function loadMenuConfiguration(tabDefinitions = [], storage) {
  const target = safeStorage(storage)
  if (!target) return createDefaultMenuConfiguration(tabDefinitions)
  const stored = parseJson(target.getItem(MENU_CONFIG_KEY), null)
  const config = stored?.schema === MENU_CONFIG_SCHEMA
    ? normalizeMenuConfiguration(stored, tabDefinitions)
    : migrateLegacyMenuConfiguration(tabDefinitions, target)
  target.setItem(MENU_CONFIG_KEY, JSON.stringify(config))
  return config
}

export function saveMenuConfiguration(config, tabDefinitions = [], storage, { backup = true } = {}) {
  const target = safeStorage(storage)
  const normalized = normalizeMenuConfiguration({ ...config, updatedAt: new Date().toISOString() }, tabDefinitions)
  if (target) {
    const previous = target.getItem(MENU_CONFIG_KEY)
    if (backup && previous && previous !== JSON.stringify(normalized)) target.setItem(MENU_CONFIG_BACKUP_KEY, previous)
    target.setItem(MENU_CONFIG_KEY, JSON.stringify(normalized))
  }
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(MENU_CONFIG_EVENT, { detail: normalized }))
  return normalized
}

export function hasMenuConfigurationBackup(storage) {
  return !!safeStorage(storage)?.getItem(MENU_CONFIG_BACKUP_KEY)
}

export function restoreMenuConfigurationBackup(tabDefinitions = [], storage) {
  const target = safeStorage(storage)
  const raw = parseJson(target?.getItem(MENU_CONFIG_BACKUP_KEY), null)
  if (!raw) throw new Error('没有可恢复的上一版配置')
  const restored = saveMenuConfiguration(raw, tabDefinitions, target, { backup: false })
  target?.removeItem(MENU_CONFIG_BACKUP_KEY)
  return restored
}

export function resetMenuConfiguration(tabDefinitions = [], storage) {
  return saveMenuConfiguration(createDefaultMenuConfiguration(tabDefinitions), tabDefinitions, storage)
}

export function importMenuConfiguration(text, tabDefinitions = [], storage) {
  const raw = parseJson(text, null)
  if (!raw || typeof raw !== 'object') throw new Error('配置文件不是有效 JSON')
  if (raw.schema && raw.schema !== MENU_CONFIG_SCHEMA) throw new Error('配置文件类型不正确')
  return saveMenuConfiguration(raw, tabDefinitions, storage)
}

export function exportMenuConfiguration(config, tabDefinitions = []) {
  return JSON.stringify(normalizeMenuConfiguration(config, tabDefinitions), null, 2)
}

export function buildConfiguredTabs(tabDefinitions = [], config) {
  const normalized = normalizeMenuConfiguration(config, tabDefinitions)
  return [...tabDefinitions.map(tab => ({ ...tab })), ...normalized.customLinks.map(link => ({ ...link }))]
    .map((tab, fallbackOrder) => ({
      ...tab,
      ...(normalized.items[tab.id] || {}),
      order: normalized.items[tab.id]?.order ?? fallbackOrder,
      hiddenFromMenu: normalized.items[tab.id]?.hidden === true,
    }))
    .sort((left, right) => left.order - right.order || left.label.localeCompare(right.label, 'zh-CN'))
}
