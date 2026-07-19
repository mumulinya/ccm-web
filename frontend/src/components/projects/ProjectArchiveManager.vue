<script setup>
import { onMounted, ref } from 'vue'
import { AlertTriangle, ArchiveRestore, Clock3, FileText, RefreshCw, ShieldCheck, Trash2, X } from '@lucide/vue'
import EmptyState from '../common/EmptyState.vue'
import LoadingSkeleton from '../common/LoadingSkeleton.vue'
import { projectsApi } from '../../api/index.js'

const emit = defineEmits(['close', 'changed', 'notify'])
const projects = ref([])
const audit = ref([])
const loading = ref(false)
const preview = ref(null)
const confirmName = ref('')
const acting = ref('')

const load = async () => {
  loading.value = true
  try {
    const [archivedData, auditData] = await Promise.all([projectsApi.archived(), projectsApi.lifecycleAudit(30)])
    projects.value = archivedData.projects || []
    audit.value = auditData.records || []
  } catch (error) {
    emit('notify', { type: 'error', text: error?.message || '归档项目加载失败' })
  } finally { loading.value = false }
}

const restore = async (name) => {
  acting.value = `restore:${name}`
  try {
    const result = await projectsApi.restore(name)
    emit('notify', { type: 'success', text: result.message || '项目已恢复' })
    emit('changed')
    await load()
  } catch (error) { emit('notify', { type: 'error', text: error?.message || '恢复失败' }) }
  finally { acting.value = '' }
}

const inspectPurge = async (name) => {
  acting.value = `preview:${name}`
  confirmName.value = ''
  try { preview.value = await projectsApi.purgePreview(name) }
  catch (error) { emit('notify', { type: 'error', text: error?.message || '删除预览失败' }) }
  finally { acting.value = '' }
}

const purge = async () => {
  if (!preview.value || confirmName.value !== preview.value.project) return
  acting.value = `purge:${preview.value.project}`
  try {
    const result = await projectsApi.purge(preview.value.project, preview.value.preview_token)
    emit('notify', { type: 'success', text: `${result.message}，审计编号 ${result.audit_id}` })
    preview.value = null
    confirmName.value = ''
    await load()
  } catch (error) { emit('notify', { type: 'error', text: error?.message || '永久删除失败' }) }
  finally { acting.value = '' }
}

const formatDate = (value) => value ? new Date(value).toLocaleString('zh-CN') : '-'
const formatBytes = (value) => value < 1024 ? `${value || 0} B` : value < 1048576 ? `${(value / 1024).toFixed(1)} KB` : `${(value / 1048576).toFixed(1)} MB`
onMounted(load)
</script>

<template>
  <div class="archive-overlay" @click.self="emit('close')">
    <section class="archive-panel" aria-label="归档项目管理">
      <header>
        <div><h2>归档项目</h2><p>恢复项目，或在核对影响后永久删除配置和会话。</p></div>
        <div class="head-actions"><button title="刷新" @click="load"><RefreshCw :size="18" /></button><button title="关闭" @click="emit('close')"><X :size="19" /></button></div>
      </header>

      <div class="archive-content">
        <LoadingSkeleton v-if="loading" :rows="4" />
        <EmptyState v-else-if="projects.length === 0" large icon="🛡️" title="没有归档项目" hint="活动项目归档后会出现在这里。" />
        <div v-else class="archive-list">
          <article v-for="item in projects" :key="item.name">
            <div><strong>{{ item.name }}</strong><small><Clock3 :size="13" />归档于 {{ formatDate(item.archived_at) }}</small></div>
            <div class="item-actions">
              <button :disabled="!!acting" @click="restore(item.name)"><ArchiveRestore :size="16" />恢复</button>
              <button class="danger" :disabled="!!acting" @click="inspectPurge(item.name)"><Trash2 :size="16" />永久删除</button>
            </div>
          </article>
        </div>

        <section v-if="preview" class="purge-preview">
          <div class="warning"><AlertTriangle :size="20" /><div><strong>将永久删除 {{ preview.project }}</strong><p>预览有效至 {{ formatDate(preview.expires_at) }}，数据变化后必须重新预览。</p></div></div>
          <div class="impact-grid"><span>{{ preview.session_count }} 个网页会话</span><span>{{ formatBytes(preview.total_bytes) }}</span></div>
          <div class="impact-list"><div v-for="item in preview.items" :key="item.label"><FileText :size="14" /><span>{{ item.label }}</span><small>{{ item.exists ? formatBytes(item.bytes) : '无数据' }}</small></div></div>
          <div class="retained"><ShieldCheck :size="16" /><span>仍会保留：{{ preview.retained.join('、') }}</span></div>
          <label>输入项目名 <strong>{{ preview.project }}</strong> 确认</label>
          <div class="confirm-row"><input v-model="confirmName" autocomplete="off"><button class="danger-solid" :disabled="confirmName !== preview.project || !!acting" @click="purge"><Trash2 :size="16" />确认永久删除</button></div>
        </section>

        <section v-if="audit.length" class="audit">
          <h3>最近操作记录</h3>
          <div v-for="record in audit.slice(0, 8)" :key="record.id"><span>{{ record.project }}</span><small>{{ record.action }} · {{ formatDate(record.time) }}</small><code>{{ record.id }}</code></div>
        </section>
      </div>
    </section>
  </div>
</template>

<style scoped>
.archive-overlay { position:fixed; inset:0; display:flex; justify-content:flex-end; background:rgba(15,23,42,.34); z-index:100; }
.archive-panel { width:min(620px,100%); height:100%; display:flex; flex-direction:column; background:var(--surface,#fff); box-shadow:-18px 0 44px rgba(15,23,42,.16); }
header { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; padding:20px 22px; border-bottom:1px solid rgba(15,23,42,.09); }
h2,h3,p { margin:0; } h2 { font-size:18px; } header p { margin-top:5px; color:var(--text-muted); font-size:12px; }
.head-actions,.item-actions,.confirm-row { display:flex; gap:8px; }
button { display:inline-flex; align-items:center; justify-content:center; gap:6px; min-height:34px; padding:0 11px; border:1px solid rgba(15,23,42,.12); border-radius:7px; background:var(--surface,#fff); color:var(--text-primary); cursor:pointer; }
button:disabled { opacity:.5; cursor:not-allowed; }.head-actions button { width:34px; padding:0; }
.archive-content { padding:16px 20px 28px; overflow:auto; }
.archive-list { display:flex; flex-direction:column; gap:7px; }
article { display:flex; justify-content:space-between; align-items:center; gap:12px; padding:12px 13px; border:1px solid rgba(15,23,42,.09); border-radius:8px; }
article>div:first-child { min-width:0; display:flex; flex-direction:column; gap:5px; } article strong { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
article small { display:flex; align-items:center; gap:5px; color:var(--text-muted); }.danger { color:#dc2626; }
.purge-preview { margin-top:16px; padding:14px; border:1px solid rgba(220,38,38,.25); border-radius:8px; background:rgba(254,242,242,.65); }
.warning { display:flex; gap:10px; color:#991b1b; }.warning p { margin-top:4px; font-size:12px; color:#7f1d1d; }
.impact-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin:13px 0 8px; }.impact-grid span { padding:8px; border-radius:6px; background:rgba(255,255,255,.72); font-size:12px; }
.impact-list { display:flex; flex-direction:column; gap:5px; }.impact-list>div { display:grid; grid-template-columns:18px 1fr auto; align-items:center; font-size:12px; }.impact-list small { color:var(--text-muted); }
.retained { display:flex; gap:7px; margin:12px 0; padding:9px; border-radius:6px; background:rgba(22,163,74,.08); color:#166534; font-size:12px; }
label { display:block; margin:10px 0 6px; font-size:12px; }.confirm-row input { flex:1; min-width:0; padding:8px 10px; border:1px solid rgba(15,23,42,.14); border-radius:7px; }.danger-solid { border-color:#dc2626; background:#dc2626; color:white; }
.audit { margin-top:20px; padding-top:16px; border-top:1px solid rgba(15,23,42,.08); }.audit h3 { margin-bottom:9px; font-size:14px; }.audit>div { display:grid; grid-template-columns:minmax(90px,1fr) auto; gap:3px 10px; padding:8px 0; border-bottom:1px solid rgba(15,23,42,.06); font-size:12px; }.audit small { color:var(--text-muted); }.audit code { grid-column:1/-1; color:var(--text-muted); font-size:10px; overflow:hidden; text-overflow:ellipsis; }
@media (max-width:520px) { header { padding:16px; }.archive-content { padding:12px; } article { align-items:flex-start; flex-direction:column; }.item-actions { width:100%; }.item-actions button { flex:1; }.confirm-row { flex-direction:column; }.danger-solid { width:100%; }.impact-grid { grid-template-columns:1fr; } }
</style>
