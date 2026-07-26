<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Box, FileText, Pause, Play, RefreshCw, RotateCcw, Settings2 } from '@lucide/vue'

const props = defineProps({
  project: { type: String, default: '' },
  snapshot: { type: Object, default: null },
  selectedProfileId: { type: String, default: '' },
  loading: { type: Boolean, default: false },
  busyAction: { type: String, default: '' },
})
const emit = defineEmits(['update:selectedProfileId', 'action', 'rescan', 'configure', 'logs'])
const now = ref(Date.now())
let timer = null
onMounted(() => { timer = window.setInterval(() => { now.value = Date.now() }, 1000) })
onBeforeUnmount(() => window.clearInterval(timer))

const profiles = computed(() => (props.snapshot?.profiles || []).filter(profile => profile.enabled !== false))
const selected = computed(() => profiles.value.find(profile => profile.id === props.selectedProfileId) || profiles.value[0] || null)
const processState = computed(() => (props.snapshot?.processes || []).find(row => row.profileId === selected.value?.id) || { status: 'stopped', pid: 0 })
const buildState = computed(() => (props.snapshot?.builds || []).find(row => row.profileId === selected.value?.id) || null)
const starting = computed(() => processState.value.status === 'starting')
const running = computed(() => processState.value.status === 'running')
const active = computed(() => starting.value || running.value)
const unknown = computed(() => processState.value.status === 'unknown')
const building = computed(() => buildState.value?.status === 'building')
const buildLabel = computed(() => ['maven', 'gradle'].includes(selected.value?.projectType) ? '打包 JAR' : '构建')
const durationText = computed(() => {
  if (!running.value || !processState.value.startedAt) return ''
  const seconds = Math.max(0, Math.floor((now.value - new Date(processState.value.startedAt).getTime()) / 1000))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return hours ? `${hours}小时${minutes}分` : minutes ? `${minutes}分${seconds % 60}秒` : `${seconds}秒`
})
const statusText = computed(() => {
  if (unknown.value) return '进程归属待确认'
  if (starting.value) return '正在准备项目依赖'
  if (running.value) return `运行中${durationText.value ? ` ${durationText.value}` : ''}${processState.value.pid ? ` · PID ${processState.value.pid}` : ''}`
  if (processState.value.status === 'failed') return '运行失败'
  return '未运行'
})
</script>

<template>
  <section v-if="project" class="runtime-bar" aria-label="项目运行工作台">
    <div class="runtime-heading">
      <span class="runtime-icon"><Play :size="16" /></span>
      <div><strong>源码运行</strong><small>运行与构建</small></div>
    </div>

    <div v-if="loading" class="runtime-loading"><RefreshCw :size="15" class="spin" />正在读取运行配置</div>
    <template v-else-if="profiles.length">
      <label class="profile-select">
        <span>运行配置</span>
        <select :value="selected?.id || ''" @change="emit('update:selectedProfileId', $event.target.value)">
          <option v-for="profile in profiles" :key="profile.id" :value="profile.id">
            {{ profile.label }} · {{ profile.projectType }}{{ profile.environment !== 'default' ? ` · ${profile.environment}` : '' }} · {{ profile.runCommand ? '可启动' : '仅构建' }}
          </option>
        </select>
      </label>

      <div class="runtime-state" :class="processState.status">
        <span class="state-dot"></span>
        <div><strong>{{ statusText }}</strong><small>{{ selected?.modulePath === '.' ? '项目根目录' : selected?.modulePath }}</small></div>
      </div>

      <div class="runtime-actions">
        <button v-if="!active" class="primary" :disabled="!!busyAction || unknown || !selected?.runCommand" title="启动所选源码项目" @click="emit('action', 'start')"><Play :size="15" />{{ busyAction === 'start' ? '启动中' : '启动' }}</button>
        <button v-else class="pause" :disabled="!!busyAction" :title="starting ? '停止依赖准备' : '暂停所选源码项目'" @click="emit('action', 'stop')"><Pause :size="15" />{{ busyAction === 'stop' ? '停止中' : starting ? '停止准备' : '暂停' }}</button>
        <button :disabled="!!busyAction || starting || unknown || !selected?.runCommand" title="重新运行所选源码项目" @click="emit('action', 'restart')"><RotateCcw :size="15" /></button>
        <button :disabled="!!busyAction || building || !selected?.buildCommand" :title="buildLabel" @click="emit('action', 'build')"><Box :size="15" />{{ building ? '构建中' : buildLabel }}</button>
        <button title="查看运行日志" @click="emit('logs', 'run')"><FileText :size="15" /></button>
        <button title="运行配置" @click="emit('configure')"><Settings2 :size="15" /></button>
      </div>

      <div v-if="buildState && buildState.status !== 'building'" class="build-result" :class="buildState.status">
        <span>{{ buildState.status === 'succeeded' ? '最近构建成功' : '最近构建失败' }}</span>
        <small v-if="buildState.artifacts?.length" :title="buildState.artifacts.join('\n')">{{ buildState.artifacts[0] }}</small>
        <button title="查看构建日志" @click="emit('logs', 'build')"><FileText :size="14" /></button>
      </div>
    </template>

    <div v-else class="runtime-empty">
      <span>没有识别到可靠的运行命令</span>
      <button @click="emit('rescan')"><RefreshCw :size="14" />重新扫描</button>
      <button @click="emit('configure')"><Settings2 :size="14" />手动配置</button>
    </div>
  </section>
</template>

<style scoped>
.runtime-bar { min-height:58px; display:flex; align-items:center; gap:14px; padding:8px 16px; border-bottom:1px solid var(--border-color); background:color-mix(in srgb,var(--surface) 97%,var(--accent-blue) 3%); }
.runtime-heading { min-width:112px; display:flex; align-items:center; gap:8px; }
.runtime-heading > div,.runtime-state > div { display:flex; flex-direction:column; min-width:0; }
.runtime-heading strong,.runtime-state strong { font-size:11.5px; }
.runtime-heading small,.runtime-state small { margin-top:2px; color:var(--text-muted); font-size:9.5px; }
.runtime-icon { width:32px; height:32px; display:grid; place-items:center; border:1px solid color-mix(in srgb,var(--accent-blue) 22%,var(--border-color)); border-radius:7px; background:var(--surface); color:var(--accent-blue); }
.profile-select { min-width:240px; max-width:460px; flex:1; display:grid; grid-template-columns:auto minmax(0,1fr); align-items:center; gap:8px; }
.profile-select span { color:var(--text-muted); font-size:9.5px; white-space:nowrap; }
select { width:100%; height:34px; padding:0 30px 0 10px; border:1px solid var(--border-color); border-radius:6px; background:var(--surface); color:var(--text-primary); font-size:11px; }
.runtime-state { min-width:145px; display:flex; align-items:center; gap:8px; padding:0 10px; border-left:1px solid var(--border-color); }
.state-dot { width:8px; height:8px; border-radius:50%; background:#94a3b8; }
.runtime-state.running .state-dot { background:#16a34a; box-shadow:0 0 0 3px color-mix(in srgb,#16a34a 14%,transparent); }
.runtime-state.starting .state-dot { background:#d97706; box-shadow:0 0 0 3px color-mix(in srgb,#d97706 14%,transparent); }
.runtime-state.failed .state-dot,.runtime-state.unknown .state-dot { background:#dc2626; }
.runtime-actions { display:flex; align-items:center; gap:5px; }
button { min-width:34px; height:34px; display:inline-flex; align-items:center; justify-content:center; gap:6px; padding:0 9px; border:1px solid var(--border-color); border-radius:6px; background:var(--surface); color:var(--text-primary); cursor:pointer; font-size:10.5px; white-space:nowrap; }
button:disabled { opacity:.45; cursor:not-allowed; }
button.primary { border-color:var(--accent-blue); background:var(--accent-blue); color:white; }
button.pause { border-color:#dc2626; color:#dc2626; }
.runtime-loading,.runtime-empty { flex:1; display:flex; align-items:center; gap:8px; color:var(--text-muted); font-size:12px; }
.runtime-empty button:first-of-type { margin-left:auto; }
.build-result { max-width:180px; display:flex; align-items:center; gap:4px; color:var(--text-muted); font-size:9.5px; }
.build-result span { white-space:nowrap; }
.build-result small { max-width:90px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.build-result.succeeded { color:#15803d; }
.build-result.failed { color:#b91c1c; }
.build-result button { width:28px; min-width:28px; height:28px; padding:0; }
.spin { animation:spin 1s linear infinite; }
@keyframes spin { to { transform:rotate(360deg); } }
@media(max-width:1180px) { .build-result { display:none; } .runtime-state { min-width:125px; } }
@media(max-width:900px) { .runtime-bar { flex-wrap:wrap; } .runtime-heading { min-width:104px; } .profile-select { min-width:min(340px,calc(100vw - 165px)); } .runtime-actions { margin-left:auto; } }
@media(max-width:620px) { .runtime-bar { padding:9px 12px; gap:9px; } .runtime-heading { display:none; } .profile-select { width:100%; max-width:none; min-width:0; grid-template-columns:1fr; } .profile-select span { display:none; } .runtime-state { width:100%; min-width:0; padding:0; border-left:0; } .runtime-actions { width:100%; margin-left:0; overflow-x:auto; padding-bottom:2px; } .runtime-actions button { flex:0 0 auto; } }
</style>
