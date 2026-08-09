export const MENU_CONFIG_SCHEMA = 'ccm-navigation-config-v3'
export const MENU_CONFIG_VERSION = 3
export const LEGACY_MENU_CONFIG_SCHEMA = 'ccm-navigation-config-v2'
export const MENU_CONFIG_KEY = 'ccm-navigation-config-v2'
export const MENU_CONFIG_BACKUP_KEY = 'ccm-navigation-config-v2-backup'
export const MENU_CONFIG_EVENT = 'ccm-navigation-config-changed'
export const MENU_CONFIG_SERVER_SCHEMA = 'ccm-navigation-config-response-v3'
export const MENU_CONFIG_BROADCAST_CHANNEL = 'ccm-navigation-config-v3'

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
  'code-intelligence': 'dev',
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
export const sanitizeMenuIcon = (value, fallback = '📁') => {
  const icon = String(value || '').trim()
  if (!icon) return fallback
  if (/^[A-Za-z][A-Za-z0-9-]{0,47}$/.test(icon)) return icon
  if (/[<>&"'`/\\]/.test(icon) || icon.length > 12) return fallback
  try {
    const segments = [...new Intl.Segmenter('zh-CN', { granularity: 'grapheme' }).segment(icon)]
    return segments.length === 1 ? icon : fallback
  } catch {
    return [...icon].length <= 2 ? icon : fallback
  }
}
const cleanIcon = sanitizeMenuIcon
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
      icon: '',
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
      icon: cleanIcon(current.icon, ''),
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
  const config = [MENU_CONFIG_SCHEMA, LEGACY_MENU_CONFIG_SCHEMA].includes(stored?.schema)
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

export function readMenuConfigurationBackup(tabDefinitions = [], storage) {
  const raw = parseJson(safeStorage(storage)?.getItem(MENU_CONFIG_BACKUP_KEY), null)
  if (!raw) throw new Error('没有可恢复的上一版配置')
  return normalizeMenuConfiguration(raw, tabDefinitions)
}

export function clearMenuConfigurationBackup(storage) {
  safeStorage(storage)?.removeItem(MENU_CONFIG_BACKUP_KEY)
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
  if (raw.schema && ![MENU_CONFIG_SCHEMA, LEGACY_MENU_CONFIG_SCHEMA].includes(raw.schema)) throw new Error('配置文件类型不正确')
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
      configuredIcon: normalized.items[tab.id]?.icon || '',
      displayIcon: normalized.items[tab.id]?.icon || tab.icon || '',
      order: normalized.items[tab.id]?.order ?? fallbackOrder,
      hiddenFromMenu: normalized.items[tab.id]?.hidden === true,
    }))
    .sort((left, right) => left.order - right.order || left.label.localeCompare(right.label, 'zh-CN'))
}

const stableJson = value => JSON.stringify(value, Object.keys(value || {}).sort())
const deepEqual = (left, right) => JSON.stringify(left) === JSON.stringify(right)

export function createMenuConfigurationOverrides(config, baseConfig, tabDefinitions = []) {
  const effective = normalizeMenuConfiguration(config, tabDefinitions)
  const base = normalizeMenuConfiguration(baseConfig, tabDefinitions)
  const items = {}
  for (const [id, current] of Object.entries(effective.items || {})) {
    const original = base.items?.[id] || {}
    const patch = {}
    for (const key of ['groupId', 'order', 'hidden', 'pinned', 'mobilePrimary', 'icon']) {
      if (!deepEqual(current?.[key], original?.[key])) patch[key] = current?.[key]
    }
    if (Object.keys(patch).length) items[id] = patch
  }
  return {
    groups: deepEqual(effective.groups, base.groups) ? null : effective.groups,
    items,
    customLinks: (effective.customLinks || []).filter(link => !(base.customLinks || []).some(baseLink => baseLink.id === link.id)),
  }
}

export function applyMenuConfigurationOverrides(baseConfig, overrides, tabDefinitions = []) {
  const base = normalizeMenuConfiguration(baseConfig, tabDefinitions)
  const source = overrides && typeof overrides === 'object' ? overrides : {}
  const merged = {
    ...base,
    groups: Array.isArray(source.groups) ? source.groups : base.groups,
    items: { ...base.items },
    customLinks: [
      ...(base.customLinks || []),
      ...(source.customLinks || []).filter(link => !(base.customLinks || []).some(baseLink => baseLink.id === link.id)),
    ],
    updatedAt: new Date().toISOString(),
  }
  for (const [id, patch] of Object.entries(source.items || {})) {
    merged.items[id] = { ...(merged.items[id] || {}), ...(patch || {}) }
  }
  return normalizeMenuConfiguration(merged, tabDefinitions)
}

async function responseJson(response) {
  const result = await response.json().catch(() => ({}))
  if (!response.ok || result.success === false) {
    const error = new Error(result.error || `导航配置请求失败 (${response.status})`)
    error.code = result.code || ''
    error.current = result.current || null
    error.status = response.status
    throw error
  }
  return result
}

async function sha256Text(value) {
  if (globalThis.crypto?.subtle) {
    const bytes = new TextEncoder().encode(String(value || ''))
    const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes)
    return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')
  }
  let hash = 2166136261
  for (const char of String(value || '')) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619)
  return `fallback-${(hash >>> 0).toString(16)}`
}

function navigationStateFromResponse(result, tabDefinitions = []) {
  const builtInDefault = createDefaultMenuConfiguration(tabDefinitions)
  const workspaceDefault = result?.workspace_default?.configuration
    ? normalizeMenuConfiguration(result.workspace_default.configuration, tabDefinitions)
    : builtInDefault
  const personalOverrides = result?.personal?.overrides || { groups: null, items: {}, customLinks: [] }
  return {
    schema: MENU_CONFIG_SERVER_SCHEMA,
    config: applyMenuConfigurationOverrides(workspaceDefault, personalOverrides, tabDefinitions),
    workspaceDefault,
    workspaceRevision: Number(result?.workspace_default?.revision || 0),
    personalRevision: Number(result?.personal?.revision || 0),
    personalOverrides,
    migrationChecksum: String(result?.personal?.migration_checksum || ''),
    canManageWorkspaceDefault: result?.can_manage_workspace_default === true,
  }
}

export async function loadServerMenuConfiguration(tabDefinitions = [], storage) {
  const result = await responseJson(await fetch('/api/navigation/config', { headers: { Accept: 'application/json' }, cache: 'no-store' }))
  let state = navigationStateFromResponse(result, tabDefinitions)
  const target = safeStorage(storage)
  const localRaw = target?.getItem(MENU_CONFIG_KEY) || ''
  if (!state.personalRevision && localRaw) {
    const localConfig = normalizeMenuConfiguration(parseJson(localRaw, null), tabDefinitions)
    const migrationChecksum = await sha256Text(localRaw)
    const overrides = createMenuConfigurationOverrides(localConfig, state.workspaceDefault, tabDefinitions)
    const migrated = await responseJson(await fetch('/api/navigation/config', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expected_revision: 0, overrides, migration_checksum: migrationChecksum }),
    }))
    state = navigationStateFromResponse({ ...result, personal: migrated.personal }, tabDefinitions)
  }
  saveMenuConfiguration(state.config, tabDefinitions, target, { backup: false })
  return state
}

export async function savePersonalMenuConfigurationV3(config, state, tabDefinitions = [], storage) {
  const overrides = createMenuConfigurationOverrides(config, state.workspaceDefault, tabDefinitions)
  const result = await responseJson(await fetch('/api/navigation/config', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ expected_revision: state.personalRevision, overrides }),
  }))
  const next = {
    ...state,
    personalRevision: Number(result.personal?.revision || state.personalRevision + 1),
    personalOverrides: result.personal?.overrides || overrides,
    config: applyMenuConfigurationOverrides(state.workspaceDefault, result.personal?.overrides || overrides, tabDefinitions),
  }
  saveMenuConfiguration(next.config, tabDefinitions, storage)
  broadcastMenuConfiguration(next)
  return next
}

export async function saveWorkspaceMenuConfigurationV3(config, state, tabDefinitions = [], storage) {
  const configuration = normalizeMenuConfiguration(config, tabDefinitions)
  const result = await responseJson(await fetch('/api/navigation/default', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ expected_revision: state.workspaceRevision, configuration }),
  }))
  const workspaceDefault = normalizeMenuConfiguration(result.workspace_default?.configuration || configuration, tabDefinitions)
  const next = {
    ...state,
    workspaceRevision: Number(result.workspace_default?.revision || state.workspaceRevision + 1),
    workspaceDefault,
    config: applyMenuConfigurationOverrides(workspaceDefault, state.personalOverrides, tabDefinitions),
  }
  saveMenuConfiguration(next.config, tabDefinitions, storage)
  broadcastMenuConfiguration(next)
  return next
}

export async function resetPersonalMenuConfigurationV3(state, tabDefinitions = [], storage) {
  const result = await responseJson(await fetch('/api/navigation/config/reset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ expected_revision: state.personalRevision }),
  }))
  const next = {
    ...state,
    personalRevision: Number(result.personal?.revision || state.personalRevision + 1),
    personalOverrides: { groups: null, items: {}, customLinks: [] },
    config: normalizeMenuConfiguration(state.workspaceDefault, tabDefinitions),
  }
  saveMenuConfiguration(next.config, tabDefinitions, storage)
  broadcastMenuConfiguration(next)
  return next
}

let navigationChannel = null
function broadcastMenuConfiguration(state) {
  if (typeof window === 'undefined') return
  try {
    navigationChannel ||= new BroadcastChannel(MENU_CONFIG_BROADCAST_CHANNEL)
    navigationChannel.postMessage({
      type: 'navigation-config-changed',
      workspaceRevision: state.workspaceRevision,
      personalRevision: state.personalRevision,
    })
  } catch {}
}

export function subscribeMenuConfigurationBroadcast(handler) {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return () => {}
  const channel = new BroadcastChannel(MENU_CONFIG_BROADCAST_CHANNEL)
  channel.onmessage = event => {
    if (event.data?.type === 'navigation-config-changed') handler(event.data)
  }
  return () => channel.close()
}

export function parseMenuConfigurationImport(text, tabDefinitions = []) {
  const raw = parseJson(text, null)
  if (!raw || typeof raw !== 'object') throw new Error('配置文件不是有效 JSON')
  if (raw.schema && ![MENU_CONFIG_SCHEMA, LEGACY_MENU_CONFIG_SCHEMA].includes(raw.schema)) throw new Error('配置文件类型不正确')
  return normalizeMenuConfiguration(raw, tabDefinitions)
}
