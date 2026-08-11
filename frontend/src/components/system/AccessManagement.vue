<script setup>
import { computed, onMounted, ref } from 'vue'
import { Check, ChevronRight, KeyRound, Plus, RefreshCw, Search, ShieldCheck, Trash2, UserCheck, UserPlus, UserX, Users } from '@lucide/vue'
import { toast } from '../../utils/toast.js'

const props = defineProps({ mode: { type: String, default: 'users' } })
const emit = defineEmits(['open-users', 'open-permissions'])
const users = ref([])
const modules = ref([])
const featureGrants = ref([])
const resourceGrants = ref([])
const projects = ref([])
const groups = ref([])
const audit = ref([])
const loading = ref(false)
const errorMessage = ref('')
const selectedUserId = ref('')
const createForm = ref({ username: '', password: '' })
const resourceForm = ref({ resourceType: 'project', resourceId: '', level: 'use' })
const selectedModules = ref([])
const policyRevision = ref(0)
const userQuery = ref('')

const selectedUser = computed(() => users.value.find(item => item.id === selectedUserId.value) || null)
const selectedFeatureGrant = computed(() => featureGrants.value.find(item => item.userId === selectedUserId.value) || null)
const visibleResources = computed(() => resourceForm.value.resourceType === 'project' ? projects.value.map(item => ({ id: item.name, label: item.display_name || item.name })) : groups.value.map(item => ({ id: item.id, label: item.name || item.id })))
const selectedResources = computed(() => resourceGrants.value.filter(item => item.userId === selectedUserId.value))
const ordinaryUsers = computed(() => users.value.filter(item => item.role !== 'admin'))
const filteredOrdinaryUsers = computed(() => {
  const query = userQuery.value.trim().toLowerCase()
  return query ? ordinaryUsers.value.filter(item => String(item.username || '').toLowerCase().includes(query)) : ordinaryUsers.value
})
const selectedAccessSummary = computed(() => ({ modules: selectedModules.value.length, resources: selectedResources.value.length }))
function selectAllModules() { selectedModules.value = modules.value.map(item => item.id) }
function clearModules() { selectedModules.value = [] }
function resourceLabel(grant) {
  const rows = grant.resourceType === 'project' ? projects.value.map(item => ({ id: item.name, label: item.display_name || item.name })) : groups.value.map(item => ({ id: item.id, label: item.name || item.id }))
  return rows.find(item => item.id === grant.resourceId)?.label || grant.resourceId
}

async function readJson(url, options) {
  const response = await fetch(url, { cache: 'no-store', ...options })
  const data = await response.json().catch(() => ({}))
  if (!response.ok || data.success === false) {
    if (response.status === 404) throw new Error('权限接口未加载，请重启 CCM 服务后刷新页面')
    if (response.status === 403) throw new Error(data.error || '当前账号没有管理员权限')
    throw new Error(data.error || '请求失败')
  }
  return data
}
function selectUser(id) {
  selectedUserId.value = id
  selectedModules.value = [...(featureGrants.value.find(item => item.userId === id)?.modules || [])]
}
function openPermissions(user) {
  sessionStorage.setItem('ccm-access-selected-user', String(user?.id || ''))
  emit('open-permissions', user?.id || '')
}
async function load() {
  loading.value = true
  errorMessage.value = ''
  try {
    const [usersData, features, resources, projectData, groupData, auditData] = await Promise.all([
      readJson('/api/auth/users'), readJson('/api/admin/feature-access'), readJson('/api/admin/resource-access'),
      readJson('/api/projects'), readJson('/api/groups'), readJson('/api/admin/access-audit'),
    ])
    users.value = usersData.users || []
    modules.value = features.modules || []
    featureGrants.value = features.grants || []
    resourceGrants.value = resources.grants || []
    policyRevision.value = Math.max(Number(features.revision || 0), Number(resources.revision || 0))
    projects.value = projectData.projects || []
    groups.value = groupData.groups || []
    audit.value = auditData.events || []
    const preferredUserId = sessionStorage.getItem('ccm-access-selected-user') || selectedUserId.value
    const currentSelection = users.value.find(item => item.id === selectedUserId.value)
    if (!currentSelection || (props.mode === 'permissions' && currentSelection.role === 'admin')) selectUser(users.value.find(item => item.id === preferredUserId && item.role !== 'admin')?.id || users.value.find(item => item.role !== 'admin')?.id || users.value[0]?.id || '')
  } catch (error) { errorMessage.value = error.message || '读取权限数据失败'; toast.error(errorMessage.value) } finally { loading.value = false }
}
async function createUser() {
  try {
    const data = await readJson('/api/auth/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(createForm.value) })
    createForm.value = { username: '', password: '' }; await load(); selectUser(data.user?.id || '')
    toast.success('普通用户已创建，尚未授予任何功能或资源权限')
  } catch (error) { toast.error(error.message || '创建用户失败') }
}
async function updateStatus(user, enabled) {
  try { await readJson(`/api/auth/users/${encodeURIComponent(user.id)}/status`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled }) }); await load(); toast.success(enabled ? '账户已启用' : '账户已禁用') } catch (error) { toast.error(error.message) }
}
async function resetPassword(user) {
  const password = window.prompt(`为 ${user.username} 设置新密码（至少 8 位）`)
  if (!password) return
  try { await readJson(`/api/auth/users/${encodeURIComponent(user.id)}/password-reset`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) }); toast.success('密码已重置，原会话已注销') } catch (error) { toast.error(error.message) }
}
async function removeUser(user) {
  if (!window.confirm(`删除用户“${user.username}”及其登录会话？授权审计会保留。`)) return
  try { await readJson(`/api/auth/users/${encodeURIComponent(user.id)}`, { method: 'DELETE' }); await load(); toast.success('用户已删除') } catch (error) { toast.error(error.message) }
}
async function saveFeatures() {
  if (!selectedUser.value || selectedUser.value.role === 'admin') return
  try { await readJson(`/api/admin/feature-access/${encodeURIComponent(selectedUser.value.id)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ modules: selectedModules.value, revision: policyRevision.value }) }); await load(); toast.success('功能权限已保存') } catch (error) { await load(); toast.error(error.message) }
}
async function grantResource() {
  if (!selectedUser.value || !resourceForm.value.resourceId) return toast.error('请选择资源')
  try { await readJson(`/api/admin/resource-access/${encodeURIComponent(selectedUser.value.id)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...resourceForm.value, revision: policyRevision.value }) }); await load(); toast.success('资源权限已保存') } catch (error) { await load(); toast.error(error.message) }
}
async function revokeResource(grant) {
  if (!selectedUser.value) return
  try { await readJson(`/api/admin/resource-access/${encodeURIComponent(selectedUser.value.id)}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resourceType: grant.resourceType, resourceId: grant.resourceId, revision: policyRevision.value }) }); await load(); toast.success('资源权限已撤销') } catch (error) { await load(); toast.error(error.message) }
}
onMounted(load)
</script>

<template>
  <section class="access-page">
    <header class="access-header">
      <div class="title-block">
        <span class="access-icon"><Users v-if="mode === 'users'" :size="20"/><ShieldCheck v-else :size="20"/></span>
        <div><h1>{{ mode === 'users' ? '用户管理' : '权限管理' }}</h1><p>{{ mode === 'users' ? '维护成员账号、登录状态与安全凭据。' : '控制成员可以使用的功能，以及可访问的项目和群聊。' }}</p></div>
      </div>
      <button class="icon-button" type="button" title="刷新数据" :disabled="loading" @click="load"><RefreshCw :size="16" :class="{ spinning: loading }"/></button>
    </header>

    <div v-if="errorMessage" class="error-banner"><div><strong>权限数据未能加载</strong><span>{{ errorMessage }}</span></div><button type="button" @click="load">重新加载</button></div>

    <template v-if="mode === 'users'">
      <div class="summary-grid">
        <article><span>成员总数</span><strong>{{ users.length }}</strong><small>包含管理员与普通用户</small></article>
        <article><span>可用账号</span><strong>{{ users.filter(item => !item.disabled_at).length }}</strong><small>{{ users.filter(item => item.disabled_at).length }} 个账号已停用</small></article>
        <article><span>普通用户</span><strong>{{ users.filter(item => item.role !== 'admin').length }}</strong><small>新用户默认没有任何权限</small></article>
      </div>
      <div class="users-layout">
        <form class="panel create-user" @submit.prevent="createUser">
          <div class="panel-heading"><div><h2>新增普通用户</h2><p>创建后再前往权限管理进行授权。</p></div><UserPlus :size="18"/></div>
          <label><span>用户名</span><input v-model.trim="createForm.username" required minlength="3" maxlength="32" placeholder="输入 3–32 位用户名" autocomplete="username"/></label>
          <label><span>初始密码</span><input v-model="createForm.password" required type="password" minlength="8" placeholder="至少 8 位" autocomplete="new-password"/></label>
          <button class="primary" type="submit"><UserPlus :size="15"/>创建用户</button>
          <p class="form-tip">创建完成后，用户首次登录即可修改密码。</p>
        </form>
        <section class="panel user-list">
          <div class="panel-heading list-heading"><div><h2>成员账号</h2><p>管理账号状态、密码和登录会话。</p></div><span>{{ users.length }} 人</span></div>
          <div v-if="users.length" class="user-table">
            <div v-for="user in users" :key="user.id" class="user-row">
              <span class="user-avatar">{{ user.username?.slice(0, 1)?.toUpperCase() }}</span>
              <div class="user-name"><strong>{{ user.username }}</strong><small>{{ user.role === 'admin' ? '管理员拥有全部权限' : `${user.access?.features?.length || 0} 个功能 · ${user.access?.resources?.length || 0} 个资源` }}</small></div>
              <span class="role-chip" :class="{ admin: user.role === 'admin' }">{{ user.role === 'admin' ? '管理员' : '普通用户' }}</span>
              <span class="status" :class="{ disabled: user.disabled_at }">{{ user.disabled_at ? '已停用' : '正常' }}</span>
              <div class="row-actions"><button v-if="user.role !== 'admin'" type="button" title="配置权限" @click="openPermissions(user)"><ShieldCheck :size="15"/></button><button v-if="user.role !== 'admin'" type="button" title="重置密码" @click="resetPassword(user)"><KeyRound :size="15"/></button><button v-if="user.role !== 'admin'" type="button" :title="user.disabled_at ? '启用账号' : '停用账号'" @click="updateStatus(user, !!user.disabled_at)"><UserCheck v-if="user.disabled_at" :size="15"/><UserX v-else :size="15"/></button><button v-if="user.role !== 'admin'" type="button" class="danger" title="删除用户" @click="removeUser(user)"><Trash2 :size="15"/></button></div>
            </div>
          </div>
          <div v-else class="empty-state"><Users :size="24"/><strong>还没有成员</strong><span>使用左侧表单创建第一个普通用户。</span></div>
        </section>
      </div>
    </template>

    <template v-else>
      <div class="permissions-layout">
        <aside class="panel user-picker">
          <div class="panel-heading"><div><h2>成员</h2><p>选择要配置权限的用户</p></div><span>{{ ordinaryUsers.length }}</span></div>
          <label v-if="ordinaryUsers.length" class="member-search"><Search :size="14"/><input v-model.trim="userQuery" placeholder="搜索用户名"/></label>
          <div class="picker-list"><button v-for="user in filteredOrdinaryUsers" :key="user.id" type="button" :class="{ active: selectedUserId === user.id }" @click="selectUser(user.id)"><span class="user-avatar">{{ user.username?.slice(0, 1)?.toUpperCase() }}</span><span class="picker-name"><strong>{{ user.username }}</strong><small>{{ user.access?.features?.length || 0 }} 个功能 · {{ user.access?.resources?.length || 0 }} 个资源</small></span><ChevronRight :size="15"/></button></div>
          <div v-if="!ordinaryUsers.length" class="mini-empty"><Users :size="22"/><strong>还没有普通用户</strong><span>创建用户后即可配置权限</span><button type="button" class="secondary-action" @click="emit('open-users')">前往用户管理</button></div>
          <div v-else-if="!filteredOrdinaryUsers.length" class="mini-empty"><Search :size="20"/><span>没有匹配的用户</span></div>
        </aside>

        <main v-if="selectedUser" class="permission-editor">
          <section class="panel identity-card"><div><span class="large-avatar">{{ selectedUser.username?.slice(0, 1)?.toUpperCase() }}</span><div><span class="identity-eyebrow">正在配置</span><h2>{{ selectedUser.username }}</h2><p>保存后立即影响菜单、会话、任务派发和 API 访问。</p></div></div><div class="identity-summary"><span><b>{{ selectedAccessSummary.modules }}</b> 项功能</span><span><b>{{ selectedAccessSummary.resources }}</b> 个资源</span><em class="status" :class="{ disabled: selectedUser.disabled_at }">{{ selectedUser.disabled_at ? '账号已停用' : '账号正常' }}</em></div></section>

          <section class="panel permission-section">
            <div class="section-heading sticky-section-heading"><div><span class="step-index">1</span><div><h3>功能权限</h3><p>决定用户可以看到和使用哪些功能区域。</p></div></div><div class="section-actions"><button type="button" @click="selectAllModules">全部选择</button><button type="button" @click="clearModules">清空</button><button class="primary compact" type="button" @click="saveFeatures"><Check :size="15"/>保存功能权限</button></div></div>
            <div class="module-grid"><label v-for="module in modules" :key="module.id" :class="{ checked: selectedModules.includes(module.id) }"><input v-model="selectedModules" type="checkbox" :value="module.id"/><span class="check-box"><Check v-if="selectedModules.includes(module.id)" :size="13"/></span><span><strong>{{ module.label }}</strong><small>{{ module.description }}</small></span></label></div>
          </section>

          <section class="panel permission-section">
            <div class="section-heading"><div><span class="step-index">2</span><div><h3>项目与群聊范围</h3><p>功能权限之外，还必须明确授予具体资源。</p></div></div></div>
            <div class="resource-workspace"><div class="grant-form"><div class="grant-form-title"><strong>添加资源授权</strong><small>项目和群聊相互独立，不会自动继承。</small></div><label><span>资源类型</span><select v-model="resourceForm.resourceType" @change="resourceForm.resourceId = ''"><option value="project">项目</option><option value="group">群聊</option></select></label><label class="resource-select"><span>目标资源</span><select v-model="resourceForm.resourceId"><option value="">请选择{{ resourceForm.resourceType === 'project' ? '项目' : '群聊' }}</option><option v-for="item in visibleResources" :key="item.id" :value="item.id">{{ item.label }}</option></select></label><label><span>权限级别</span><select v-model="resourceForm.level"><option value="use">使用</option><option value="manage">完整管理</option></select></label><button class="primary grant-button" type="button" @click="grantResource"><Plus :size="15"/>添加授权</button></div>
            <div class="grant-list"><div class="grant-list-heading"><strong>已授权资源</strong><span>{{ selectedResources.length }}</span></div><div v-for="grant in selectedResources" :key="grant.grantId" class="grant-row"><span class="resource-type">{{ grant.resourceType === 'project' ? '项目' : '群聊' }}</span><strong>{{ resourceLabel(grant) }}</strong><em :class="{ manage: grant.level === 'manage' }">{{ grant.level === 'manage' ? '完整管理' : '使用' }}</em><button class="text-danger" type="button" @click="revokeResource(grant)">撤销</button></div><div v-if="!selectedResources.length" class="mini-empty horizontal"><ShieldCheck :size="20"/><span>尚未授予任何项目或群聊</span></div></div></div>
          </section>
        </main>
        <main v-else class="panel empty-state editor-empty"><ShieldCheck :size="30"/><strong>{{ ordinaryUsers.length ? '选择一个普通用户' : '先创建普通用户' }}</strong><span>{{ ordinaryUsers.length ? '然后为他配置功能模块、项目和群聊权限。' : '普通用户创建完成后，才可以配置功能和资源范围。' }}</span><button v-if="!ordinaryUsers.length" type="button" class="primary" @click="emit('open-users')"><UserPlus :size="15"/>前往用户管理</button></main>
      </div>

      <details class="panel audit"><summary class="panel-heading"><div><h2>最近权限变更</h2><p>需要核对时再展开查看管理员的授权与撤销操作。</p></div><span>最近 {{ Math.min(audit.length, 12) }} 条</span></summary><div class="audit-list"><div v-for="event in audit.slice(0, 12)" :key="event.eventId"><time>{{ new Date(event.occurredAt).toLocaleString() }}</time><span>{{ event.action }}</span><small>{{ event.kind === 'resource' ? (event.resourceType === 'project' ? '项目' : '群聊') : '功能权限' }} · {{ event.resourceId || event.targetUserId }}</small></div><div v-if="!audit.length" class="mini-empty horizontal"><ShieldCheck :size="20"/><span>暂无权限变更记录</span></div></div></details>
    </template>
  </section>
</template>

<style scoped>
.access-page{min-height:100%;padding:22px 26px 34px;background:var(--bg-primary);color:var(--text-primary)}
.access-page h1,.access-page h2,.access-page h3,.access-page p{margin:0}.access-header,.title-block,.panel-heading,.section-heading,.section-heading>div,.identity-card,.identity-card>div,.user-row,.grant-row{display:flex;align-items:center}.access-header{justify-content:space-between;margin:0 auto 18px;max-width:1280px}.title-block{gap:12px}.title-block h1{font-size:22px;line-height:1.2}.title-block p,.panel-heading p,.section-heading p,.identity-card p{margin-top:3px;color:var(--text-muted);font-size:12px}.access-icon{display:grid;place-items:center;width:38px;height:38px;border-radius:9px;background:color-mix(in srgb,var(--accent-blue) 12%,var(--surface));color:var(--accent-blue);border:1px solid color-mix(in srgb,var(--accent-blue) 20%,var(--border-color))}.icon-button,.row-actions button{display:grid;place-items:center;width:34px;height:34px;border:1px solid var(--border-color);border-radius:7px;background:var(--surface);color:var(--text-secondary);cursor:pointer}.icon-button:hover,.row-actions button:hover{border-color:var(--border-strong);background:var(--control-hover);color:var(--text-primary)}.icon-button:disabled{opacity:.55;cursor:wait}.spinning{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
.error-banner{display:flex;align-items:center;justify-content:space-between;gap:16px;max-width:1280px;margin:0 auto 16px;padding:12px 14px;border:1px solid color-mix(in srgb,var(--accent-red) 36%,var(--border-color));border-radius:8px;background:color-mix(in srgb,var(--accent-red) 8%,var(--surface));color:var(--text-primary)}.error-banner>div{display:grid;gap:2px}.error-banner span{color:var(--text-secondary);font-size:12px}.error-banner button{height:31px;padding:0 11px;border:1px solid color-mix(in srgb,var(--accent-red) 35%,var(--border-color));border-radius:6px;background:var(--surface);color:var(--accent-red);cursor:pointer}
.panel,.summary-grid{max-width:1280px}.panel{border:1px solid var(--border-color);border-radius:9px;background:var(--surface);box-shadow:var(--shadow-sm)}.panel-heading{justify-content:space-between;padding:15px 16px;border-bottom:1px solid var(--border-color)}.panel-heading h2{font-size:14px}.panel-heading>span,.list-heading>span{padding:3px 7px;border-radius:999px;background:var(--panel-muted);color:var(--text-muted);font-size:10px;font-weight:700}.summary-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:0 auto 12px}.summary-grid article{display:grid;grid-template-columns:1fr auto;gap:2px 12px;padding:13px 15px;border:1px solid var(--border-color);border-radius:8px;background:var(--surface)}.summary-grid span,.summary-grid small{color:var(--text-muted);font-size:11px}.summary-grid strong{grid-row:1/3;grid-column:2;font-size:23px;line-height:1.2}.summary-grid small{grid-column:1}
.users-layout{display:grid;grid-template-columns:300px minmax(0,1fr);gap:12px;max-width:1280px;margin:0 auto}.create-user{align-self:start;display:grid;gap:13px;padding-bottom:15px}.create-user .panel-heading{margin-bottom:1px}.create-user>label{display:grid;gap:6px;padding:0 16px}.create-user label>span,.grant-form label>span{color:var(--text-secondary);font-size:11px;font-weight:650}.create-user input,.grant-form select{width:100%;height:36px;padding:0 10px;border:1px solid var(--border-color);border-radius:6px;background:var(--control-bg);color:var(--text-primary);outline:none}.create-user input:focus,.grant-form select:focus{border-color:var(--accent-blue);box-shadow:var(--focus-ring)}.create-user .primary{margin:2px 16px 0}.form-tip{padding:0 16px;color:var(--text-muted);font-size:10.5px}.primary{min-height:34px;display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:0 12px;border:1px solid var(--accent-blue);border-radius:6px;background:var(--accent-blue);color:#fff;cursor:pointer;font-size:12px;font-weight:700}.primary:hover{background:color-mix(in srgb,var(--accent-blue) 86%,#000)}.primary.compact{min-height:31px;font-size:11px}.user-list{overflow:hidden}.user-table{display:grid}.user-row{min-height:65px;gap:12px;padding:10px 15px;border-bottom:1px solid var(--border-color)}.user-row:last-child{border-bottom:0}.user-row:hover{background:var(--panel-muted)}.user-avatar,.large-avatar{display:grid;place-items:center;border-radius:8px;background:color-mix(in srgb,var(--accent-blue) 10%,var(--panel-muted));color:var(--accent-blue);font-weight:750}.user-avatar{width:34px;height:34px;font-size:12px}.large-avatar{width:42px;height:42px;font-size:15px}.user-name{min-width:0;display:grid;gap:3px;flex:1}.user-name strong{overflow:hidden;text-overflow:ellipsis}.user-name small,.picker-name small,.module-grid small{color:var(--text-muted);font-size:10.5px}.role-chip,.status{white-space:nowrap;padding:3px 7px;border-radius:999px;font-size:10px;font-weight:700}.role-chip{background:var(--panel-muted);color:var(--text-muted)}.role-chip.admin{background:color-mix(in srgb,var(--accent-purple) 12%,var(--surface));color:var(--accent-purple)}.status{background:color-mix(in srgb,var(--accent-green) 10%,var(--surface));color:var(--accent-green)}.status.disabled{background:color-mix(in srgb,var(--accent-red) 10%,var(--surface));color:var(--accent-red)}.row-actions{display:flex;gap:5px}.row-actions .danger,.text-danger{color:var(--accent-red)}
.permissions-layout{display:grid;grid-template-columns:255px minmax(0,1fr);align-items:start;gap:12px;max-width:1280px;margin:0 auto}.user-picker{overflow:hidden}.picker-list{display:grid;padding:7px}.picker-list button{width:100%;display:grid;grid-template-columns:34px minmax(0,1fr) 18px;align-items:center;gap:9px;padding:8px;border:1px solid transparent;border-radius:7px;background:transparent;color:var(--text-primary);text-align:left;cursor:pointer}.picker-list button:hover{background:var(--panel-muted)}.picker-list button.active{border-color:color-mix(in srgb,var(--accent-blue) 28%,var(--border-color));background:color-mix(in srgb,var(--accent-blue) 8%,var(--surface))}.picker-name{min-width:0;display:grid;gap:2px}.picker-name strong{overflow:hidden;text-overflow:ellipsis}.picker-list button>svg{color:var(--accent-blue)}.permission-editor{display:grid;gap:12px}.identity-card{justify-content:space-between;padding:14px 16px}.identity-card>div{gap:11px}.identity-card h2{font-size:16px}.permission-section{padding-bottom:15px}.section-heading{justify-content:space-between;gap:12px;padding:14px 16px;border-bottom:1px solid var(--border-color)}.section-heading>div{gap:9px}.section-heading h3{font-size:13px}.step-index{display:grid;place-items:center;width:23px;height:23px;border-radius:6px;background:var(--panel-muted);color:var(--accent-blue);font-size:10px;font-weight:800}.module-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;padding:14px 16px 0}.module-grid label{min-width:0;display:grid;grid-template-columns:20px minmax(0,1fr);gap:8px;padding:10px;border:1px solid var(--border-color);border-radius:7px;background:var(--bg-secondary);cursor:pointer}.module-grid label:hover{border-color:var(--border-strong)}.module-grid label.checked{border-color:color-mix(in srgb,var(--accent-blue) 40%,var(--border-color));background:color-mix(in srgb,var(--accent-blue) 6%,var(--surface))}.module-grid input{display:none}.module-grid label>span:last-child{min-width:0;display:grid;gap:3px}.module-grid strong{font-size:11.5px}.check-box{display:grid;place-items:center;width:18px;height:18px;border:1px solid var(--border-strong);border-radius:5px;color:#fff}.checked .check-box{border-color:var(--accent-blue);background:var(--accent-blue)}
.grant-form{display:grid;grid-template-columns:120px minmax(180px,1fr) 130px auto;align-items:end;gap:8px;padding:14px 16px}.grant-form label{display:grid;gap:6px}.grant-button{height:36px}.grant-list{display:grid;gap:6px;padding:0 16px}.grant-row{gap:10px;min-height:40px;padding:7px 10px;border:1px solid var(--border-color);border-radius:7px;background:var(--bg-secondary)}.grant-row strong{min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;font-size:11.5px}.resource-type{padding:3px 7px;border-radius:5px;background:var(--panel-muted);color:var(--text-muted);font-size:10px}.grant-row em{padding:3px 7px;border-radius:999px;background:color-mix(in srgb,var(--accent-green) 10%,var(--surface));color:var(--accent-green);font-size:10px;font-style:normal}.grant-row em.manage{background:color-mix(in srgb,var(--accent-purple) 10%,var(--surface));color:var(--accent-purple)}.grant-row button{border:0;background:transparent;cursor:pointer;font-size:11px}.audit{margin:12px auto 0;overflow:hidden}.audit-list>div{display:grid;grid-template-columns:165px 145px minmax(0,1fr);gap:12px;padding:9px 16px;border-bottom:1px solid var(--border-color);font-size:10.5px}.audit-list>div:last-child{border-bottom:0}.audit time,.audit small{color:var(--text-muted)}
.empty-state,.mini-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;color:var(--text-muted);text-align:center}.empty-state{min-height:180px;padding:28px}.empty-state strong{color:var(--text-secondary);font-size:12px}.empty-state span,.mini-empty{font-size:10.5px}.mini-empty{padding:24px 14px}.mini-empty.horizontal{min-height:46px;flex-direction:row;padding:10px}.editor-empty{min-height:260px}
/* Admin console layout: one scroll owner, compact cards and stable actions. */
.access-page{height:100%;min-height:0;overflow-x:hidden;overflow-y:auto;box-sizing:border-box;scrollbar-gutter:stable;padding:20px 24px 48px;background:var(--bg-primary)}
.access-header,.summary-grid,.users-layout,.permissions-layout,.audit,.error-banner{width:min(100%,1440px);max-width:none}
.access-header{position:relative;margin-bottom:16px;padding:2px 2px 14px;border-bottom:1px solid var(--border-color)}
.title-block h1{font-size:20px;letter-spacing:-.02em}.title-block p{font-size:11px}.access-icon{width:36px;height:36px;border-radius:8px}
.panel{border-radius:10px;box-shadow:0 1px 2px color-mix(in srgb,#000 5%,transparent)}
.summary-grid{gap:8px}.summary-grid article{min-height:66px;padding:12px 14px;border-radius:9px}.summary-grid strong{font-size:20px}.summary-grid span{font-weight:700;color:var(--text-secondary)}
.users-layout{grid-template-columns:minmax(280px,340px) minmax(0,1fr);gap:14px}.create-user{position:sticky;top:0}.user-list{min-width:0}.user-row{min-height:60px;padding:9px 14px}.row-actions{opacity:.68}.user-row:hover .row-actions,.row-actions:focus-within{opacity:1}
.permissions-layout{grid-template-columns:270px minmax(0,1fr);gap:14px}.user-picker{position:sticky;top:0;max-height:calc(100vh - 170px);display:flex;flex-direction:column}.member-search{display:flex;align-items:center;gap:7px;margin:8px 9px 2px;padding:0 9px;height:34px;border:1px solid var(--border-color);border-radius:7px;background:var(--control-bg);color:var(--text-muted)}.member-search:focus-within{border-color:var(--accent-blue);box-shadow:var(--focus-ring)}.member-search input{min-width:0;width:100%;border:0;outline:0;background:transparent;color:var(--text-primary);font-size:11px}.picker-list{min-height:0;overflow-y:auto;padding:6px}.picker-list button{min-height:52px}.picker-list button.active{border-color:color-mix(in srgb,var(--accent-blue) 38%,var(--border-color));box-shadow:inset 3px 0 0 var(--accent-blue)}.picker-list button>svg{color:var(--text-muted)}.picker-list button.active>svg{color:var(--accent-blue)}
.permission-editor{min-width:0;gap:10px}.identity-card{padding:13px 15px;background:linear-gradient(105deg,color-mix(in srgb,var(--accent-blue) 6%,var(--surface)),var(--surface) 42%)}.identity-eyebrow{display:block;margin-bottom:2px;color:var(--accent-blue);font-size:9px;font-weight:800;text-transform:uppercase}.identity-summary{display:flex;align-items:center;gap:8px}.identity-summary>span{padding:6px 9px;border:1px solid var(--border-color);border-radius:7px;background:var(--surface);color:var(--text-muted);font-size:10px}.identity-summary b{color:var(--text-primary);font-size:12px}.identity-summary .status{font-style:normal}
.permission-section{overflow:clip;padding-bottom:14px}.sticky-section-heading{position:sticky;z-index:5;top:0;background:color-mix(in srgb,var(--surface) 96%,transparent);backdrop-filter:blur(10px)}.section-actions{display:flex;align-items:center;gap:5px}.section-actions>button:not(.primary),.secondary-action{min-height:30px;padding:0 9px;border:1px solid var(--border-color);border-radius:6px;background:var(--surface);color:var(--text-secondary);font-size:10px;cursor:pointer}.section-actions>button:not(.primary):hover,.secondary-action:hover{border-color:var(--border-strong);background:var(--control-hover);color:var(--text-primary)}
.module-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;padding:12px 14px 0}.module-grid label{min-height:54px;align-items:start;padding:10px 11px;background:var(--surface)}.module-grid label.checked{box-shadow:inset 3px 0 0 var(--accent-blue)}.module-grid strong{font-size:11px}.module-grid small{line-height:1.45}
.resource-workspace{display:grid;grid-template-columns:minmax(260px,340px) minmax(0,1fr);gap:0}.grant-form{display:grid;grid-template-columns:1fr;align-content:start;gap:10px;padding:14px;border-right:1px solid var(--border-color);background:var(--panel-muted)}.grant-form-title{display:grid;gap:2px;margin-bottom:2px}.grant-form-title strong{font-size:11.5px}.grant-form-title small{color:var(--text-muted);font-size:9.5px;line-height:1.45}.grant-button{grid-column:auto;width:100%}.grant-list{align-content:start;gap:6px;padding:14px}.grant-list-heading{display:flex;align-items:center;justify-content:space-between;min-height:28px}.grant-list-heading strong{font-size:11.5px}.grant-list-heading span{padding:2px 6px;border-radius:999px;background:var(--panel-muted);color:var(--text-muted);font-size:9px}.grant-row{background:var(--surface)}
.audit{margin-top:10px}.audit>summary{cursor:pointer;list-style:none}.audit>summary::-webkit-details-marker{display:none}.audit:not([open])>summary{border-bottom:0}.audit-list{max-height:320px;overflow:auto}.editor-empty .primary{margin-top:5px}.mini-empty strong{color:var(--text-secondary);font-size:11px}
.create-user input,.grant-form select{height:var(--control-height,34px);padding-inline:var(--control-padding-x,10px);border-radius:var(--radius-md,6px)}.grant-button{height:var(--control-height,34px)}
@media(max-width:1050px){.permissions-layout{grid-template-columns:230px minmax(0,1fr)}.resource-workspace{grid-template-columns:1fr}.grant-form{grid-template-columns:110px minmax(160px,1fr) 125px auto;border-right:0;border-bottom:1px solid var(--border-color)}.grant-form-title{grid-column:1/-1}.grant-button{grid-column:auto}.identity-summary>span{display:none}}
@media(max-width:760px){.access-page{padding:14px 10px 28px}.access-header{align-items:flex-start}.title-block h1{font-size:18px}.summary-grid{grid-template-columns:1fr}.users-layout,.permissions-layout{grid-template-columns:1fr}.create-user,.user-picker{position:static;max-height:none}.picker-list{max-height:230px}.module-grid{grid-template-columns:1fr}.grant-form{grid-template-columns:1fr}.grant-form-title,.grant-button{grid-column:auto}.user-row{display:grid;grid-template-columns:34px minmax(0,1fr) auto}.user-row .role-chip{display:none}.user-row .status{grid-column:2}.row-actions{grid-column:3;grid-row:1/3;opacity:1}.identity-card{align-items:flex-start;gap:10px}.identity-summary{display:grid;justify-items:end}.section-heading{align-items:flex-start;flex-direction:column}.section-actions{width:100%;flex-wrap:wrap}.section-actions .primary{margin-left:auto}.audit-list>div{grid-template-columns:1fr;gap:2px}}
</style>
