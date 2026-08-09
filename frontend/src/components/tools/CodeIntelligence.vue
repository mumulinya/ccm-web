<script setup>
import { computed, onMounted, ref } from 'vue'
import { Activity, CircleAlert, Database, Play, RefreshCw, RotateCcw, Server } from '@lucide/vue'
import { toast } from '../../utils/toast.js'

const projects = ref([])
const servers = ref([])
const loading = ref(false)
const working = ref('')
const error = ref('')
const totals = computed(() => projects.value.reduce((sum, item) => ({ files: sum.files + Number(item.files || 0), symbols: sum.symbols + Number(item.symbols || 0), diagnostics: sum.diagnostics + Number(item.diagnostics || 0) }), { files: 0, symbols: 0, diagnostics: 0 }))

async function request(url, options) {
  const response = await fetch(url, { credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, ...options })
  const data = await response.json()
  if (!response.ok || data.success === false) throw new Error(data.error || `HTTP ${response.status}`)
  return data
}

async function load() {
  loading.value = true; error.value = ''
  try {
    const [projectData, serverData] = await Promise.all([request('/api/code-intelligence/projects'), request('/api/code-intelligence/language-servers')])
    projects.value = projectData.projects || []
    servers.value = serverData.languageServers || []
  } catch (cause) { error.value = cause.message || String(cause) }
  finally { loading.value = false }
}

async function projectAction(project, action) {
  working.value = `${project}:${action}`
  try {
    await request(`/api/code-intelligence/projects/${encodeURIComponent(project)}/${action}`, { method: 'POST', body: JSON.stringify({ reason: action === 'reindex' ? '管理员显式重建代码语义索引' : '管理员按需启动代码语义索引' }) })
    toast.success(action === 'reindex' ? '索引重建完成' : '代码智能已启动')
    await load()
  } catch (cause) { toast.error(cause.message || String(cause)) }
  finally { working.value = '' }
}

async function serverAction(server, action) {
  working.value = `${server.id}:${action}`
  try {
    const data = await request(`/api/code-intelligence/language-servers/${encodeURIComponent(server.id)}/${action}`, { method: 'POST', body: JSON.stringify(action === 'install' ? {} : { reason: `管理员${action}语言服务` }) })
    if (data.requiresConfirmation) toast.info('已生成安装预览；CCM没有静默下载语言服务')
    await load()
  } catch (cause) { toast.error(cause.message || String(cause)) }
  finally { working.value = '' }
}

onMounted(load)
</script>

<template>
  <section class="code-intelligence-page">
    <header><div><span class="eyebrow">CODE INTELLIGENCE</span><h1>代码智能</h1><p>真实语言服务、增量符号索引、调用图和诊断状态。索引仅保存位置与校验值，不保存源码正文。</p></div><button class="icon" :disabled="loading" title="刷新" @click="load"><RefreshCw :size="18" :class="{ spin: loading }" /></button></header>
    <div v-if="error" class="error"><CircleAlert :size="17" />{{ error }}</div>
    <div class="stats"><article><Database /><b>{{ totals.files }}</b><span>已索引文件</span></article><article><Activity /><b>{{ totals.symbols }}</b><span>符号</span></article><article><CircleAlert /><b>{{ totals.diagnostics }}</b><span>诊断</span></article></div>
    <section class="panel"><div class="panel-title"><h2>项目索引</h2><span>默认按需启动，文件变化后只更新受影响文件</span></div><div class="table-wrap"><table><thead><tr><th>项目</th><th>状态</th><th>服务</th><th>代次</th><th>文件 / 符号 / 诊断</th><th>最后增量</th><th>操作</th></tr></thead><tbody><tr v-for="project in projects" :key="project.project"><td><b>{{ project.project }}</b></td><td><span class="state" :class="project.status">{{ project.status }}</span></td><td>{{ project.languageServer }}</td><td>{{ project.generation }}</td><td>{{ project.files }} / {{ project.symbols }} / {{ project.diagnostics }}</td><td>{{ project.lastIndexedAt || '尚未建立' }}</td><td class="actions"><button :disabled="!!working" @click="projectAction(project.project, 'start')"><Play :size="14" />启动</button><button :disabled="!!working" @click="projectAction(project.project, 'reindex')"><RotateCcw :size="14" />重建</button></td></tr><tr v-if="!projects.length"><td colspan="7" class="empty">没有可用项目</td></tr></tbody></table></div></section>
    <section class="panel"><div class="panel-title"><h2>语言服务</h2><span>TS/JS随包提供；其他语言只发现，不会自动下载</span></div><div class="server-grid"><article v-for="server in servers" :key="server.id"><div class="server-name"><Server :size="18" /><b>{{ server.id }}</b><span class="state" :class="server.status">{{ server.status }}</span></div><p>{{ server.languages.join(' · ') }}</p><small>{{ server.discoveredPath || server.source }}</small><div class="actions"><button v-if="server.status !== 'missing'" :disabled="!!working" @click="serverAction(server, 'stop')">停止</button><button v-else :disabled="!!working" @click="serverAction(server, 'install')">安装预览</button></div></article></div></section>
  </section>
</template>

<style scoped>
.code-intelligence-page{height:100%;overflow:auto;padding:24px;color:var(--text-primary,#e8edf7);background:var(--bg-primary,#0b1020)}header{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;margin-bottom:20px}h1{margin:3px 0 6px;font-size:28px}h2{margin:0;font-size:17px}p{margin:0;color:var(--text-secondary,#9ba8bd)}.eyebrow{font-size:11px;letter-spacing:.16em;color:#7da5ff}.icon,.actions button{border:1px solid rgba(130,150,190,.24);background:rgba(100,120,160,.08);color:inherit;border-radius:8px;padding:7px 10px;display:inline-flex;align-items:center;gap:5px;cursor:pointer}.stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-bottom:16px}.stats article,.panel,.server-grid article{border:1px solid rgba(130,150,190,.18);background:rgba(20,28,48,.72);border-radius:12px}.stats article{display:grid;grid-template-columns:auto 1fr;gap:3px 10px;align-items:center;padding:16px}.stats article svg{grid-row:1/3;color:#7da5ff}.stats b{font-size:22px}.stats span{font-size:12px;color:#9ba8bd}.panel{padding:16px;margin-bottom:16px}.panel-title{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}.panel-title span{font-size:12px;color:#9ba8bd}.table-wrap{overflow:auto}table{width:100%;border-collapse:collapse;font-size:13px}th,td{text-align:left;padding:10px;border-bottom:1px solid rgba(130,150,190,.12);white-space:nowrap}th{color:#9ba8bd}.state{font-size:11px;padding:3px 7px;border-radius:999px;background:#34405a}.state.ready,.state.available{background:#153d31;color:#83e6b7}.state.missing{background:#4b2d22;color:#ffb18a}.state.stopped,.state.not_indexed{background:#32394b;color:#bec9dc}.actions{display:flex;gap:7px}.server-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:10px}.server-grid article{padding:13px}.server-name{display:flex;align-items:center;gap:8px}.server-name .state{margin-left:auto}.server-grid p{font-size:12px;margin:8px 0}.server-grid small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#7f8ca3;margin-bottom:10px}.error{display:flex;gap:8px;padding:10px;border:1px solid #7e3939;background:#371e24;border-radius:9px;margin-bottom:14px}.empty{text-align:center;color:#9ba8bd}.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}@media(max-width:760px){.stats{grid-template-columns:1fr}.panel-title{align-items:flex-start;gap:6px;flex-direction:column}}
</style>

