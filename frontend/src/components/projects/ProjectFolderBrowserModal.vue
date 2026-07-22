<script setup>
import { computed, ref, watch } from 'vue'
import {
  ArrowLeft, ChevronRight, File, Folder, FolderCheck, FolderPlus,
  FolderTree, HardDrive, Home, LoaderCircle, RefreshCw, X,
} from '@lucide/vue'

const props = defineProps({
  path: { type: String, default: '' },
  items: { type: Array, default: () => [] },
  drives: { type: Array, default: () => [] },
  home: { type: String, default: '' },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
})

const emit = defineEmits(['close', 'load', 'go-up', 'refresh', 'select', 'create'])
const address = ref(props.path)
const creating = ref(false)
const folderName = ref('')

watch(() => props.path, value => { address.value = value || '' })

const directories = computed(() => props.items.filter(item => item.isDirectory))
const files = computed(() => props.items.filter(item => !item.isDirectory))

const navigateAddress = () => {
  const target = address.value.trim()
  if (target) emit('load', target)
}

const startCreate = () => {
  creating.value = true
  folderName.value = ''
}

const cancelCreate = () => {
  creating.value = false
  folderName.value = ''
}

const submitCreate = () => {
  const name = folderName.value.trim()
  if (!name) return
  emit('create', name)
  cancelCreate()
}
</script>

<template>
  <div class="folder-browser-overlay" @click.self="emit('close')">
    <section class="folder-browser" role="dialog" aria-modal="true" aria-labelledby="folder-browser-title">
      <header class="folder-browser-header">
        <span class="folder-browser-mark"><FolderTree :size="20" /></span>
        <div>
          <h3 id="folder-browser-title">选择项目目录</h3>
          <p>浏览本机目录，或为新项目创建一个文件夹</p>
        </div>
        <button class="icon-button close-button" title="关闭" aria-label="关闭" @click="emit('close')"><X :size="18" /></button>
      </header>

      <div class="folder-browser-toolbar">
        <button class="icon-button" title="返回上级目录" :disabled="loading || !path" @click="emit('go-up')"><ArrowLeft :size="17" /></button>
        <button class="icon-button" title="刷新当前目录" :disabled="loading" @click="emit('refresh')"><RefreshCw :size="16" :class="{ spinning: loading }" /></button>
        <label class="address-bar">
          <Folder :size="15" />
          <input v-model="address" aria-label="目录地址" spellcheck="false" @keydown.enter.prevent="navigateAddress">
          <button type="button" title="打开目录" @click="navigateAddress"><ChevronRight :size="16" /></button>
        </label>
        <button class="new-folder-button" :disabled="loading || !path" @click="startCreate"><FolderPlus :size="16" />新建文件夹</button>
      </div>

      <div class="folder-browser-body">
        <aside class="location-sidebar" aria-label="快捷位置">
          <button v-if="home" @click="emit('load', home)"><Home :size="16" /><span>用户目录</span></button>
          <button v-for="drive in drives" :key="drive.path" @click="emit('load', drive.path)">
            <HardDrive :size="16" /><span>{{ drive.name === '/' ? '根目录' : `${drive.name}:` }}</span>
          </button>
          <button v-if="!drives.length" @click="emit('load', '/')"><HardDrive :size="16" /><span>根目录</span></button>
        </aside>

        <main class="directory-pane">
          <div v-if="creating" class="create-folder-row">
            <FolderPlus :size="18" />
            <input v-model="folderName" autofocus maxlength="120" placeholder="输入文件夹名称" @keydown.enter.prevent="submitCreate" @keydown.esc.prevent="cancelCreate">
            <button class="create-confirm" :disabled="!folderName.trim()" @click="submitCreate">创建</button>
            <button class="create-cancel" @click="cancelCreate">取消</button>
          </div>

          <div v-if="loading" class="folder-state"><LoaderCircle :size="22" class="spinning" /><strong>正在读取目录</strong></div>
          <div v-else-if="error" class="folder-state error-state"><Folder :size="22" /><strong>{{ error }}</strong><button @click="emit('refresh')">重试</button></div>
          <div v-else-if="!items.length" class="folder-state"><FolderCheck :size="24" /><strong>这是一个空目录</strong><span>可以直接选择，或在此创建项目文件夹</span></div>
          <div v-else class="directory-list" role="list">
            <button v-for="item in directories" :key="item.path" class="directory-row" @click="emit('load', item.path)">
              <span class="file-icon folder-icon"><Folder :size="18" /></span>
              <span class="item-name" :title="item.name">{{ item.name }}</span>
              <span class="item-type">文件夹</span>
              <ChevronRight :size="15" />
            </button>
            <div v-for="item in files" :key="item.path" class="directory-row file-row">
              <span class="file-icon"><File :size="17" /></span>
              <span class="item-name" :title="item.name">{{ item.name }}</span>
              <span class="item-type">文件</span>
              <span class="row-spacer"></span>
            </div>
          </div>
        </main>
      </div>

      <footer class="folder-browser-footer">
        <div class="selected-directory"><span>当前选择</span><strong :title="path">{{ path || '尚未选择目录' }}</strong></div>
        <button class="secondary-button" @click="emit('close')">取消</button>
        <button class="primary-button" :disabled="loading || !path" @click="emit('select')"><FolderCheck :size="16" />使用此目录</button>
      </footer>
    </section>
  </div>
</template>

<style scoped>
.folder-browser-overlay { position:fixed; inset:0; z-index:10050; display:grid; place-items:center; padding:24px; background:rgba(15,23,42,.36); backdrop-filter:blur(5px); }
.folder-browser { width:min(880px,calc(100vw - 32px)); height:min(680px,calc(100vh - 48px)); min-height:480px; display:flex; flex-direction:column; overflow:hidden; border:1px solid var(--border-color,rgba(15,23,42,.12)); border-radius:8px; background:var(--surface,var(--bg-primary,#fff)); color:var(--text-primary); box-shadow:0 24px 70px rgba(15,23,42,.2); }
.folder-browser-header { min-height:70px; padding:14px 18px; display:flex; align-items:center; gap:12px; border-bottom:1px solid var(--border-color,rgba(15,23,42,.1)); }
.folder-browser-mark { width:38px; height:38px; display:grid; place-items:center; border-radius:7px; background:color-mix(in srgb,var(--accent-blue,#2563eb) 10%,transparent); color:var(--accent-blue,#2563eb); }
.folder-browser-header>div { min-width:0; flex:1; }.folder-browser-header h3 { margin:0; font-size:15px; letter-spacing:0; }.folder-browser-header p { margin:4px 0 0; color:var(--text-muted); font-size:11px; }
.icon-button { width:34px; height:34px; flex:0 0 auto; display:grid; place-items:center; border:1px solid var(--border-color,rgba(15,23,42,.1)); border-radius:6px; background:transparent; color:var(--text-secondary); cursor:pointer; }.icon-button:hover:not(:disabled) { background:var(--control-hover,rgba(37,99,235,.06)); color:var(--text-primary); }.icon-button:disabled { opacity:.4; cursor:not-allowed; }.close-button { border:0; }
.folder-browser-toolbar { min-height:54px; padding:9px 12px; display:flex; align-items:center; gap:7px; border-bottom:1px solid var(--border-color,rgba(15,23,42,.1)); background:color-mix(in srgb,var(--bg-secondary,#f8fafc) 75%,transparent); }
.address-bar { min-width:0; height:34px; flex:1; display:flex; align-items:center; gap:7px; padding-left:10px; border:1px solid var(--border-color,rgba(15,23,42,.12)); border-radius:6px; background:var(--surface,var(--bg-primary,#fff)); color:var(--text-muted); }.address-bar:focus-within { border-color:var(--accent-blue,#2563eb); box-shadow:0 0 0 3px color-mix(in srgb,var(--accent-blue,#2563eb) 10%,transparent); }.address-bar input { min-width:0; flex:1; border:0; outline:0; background:transparent; color:var(--text-primary); font:12px ui-monospace,SFMono-Regular,Consolas,monospace; }.address-bar button { width:30px; height:30px; display:grid; place-items:center; border:0; background:transparent; color:var(--text-muted); cursor:pointer; }
.new-folder-button,.secondary-button,.primary-button,.create-folder-row button,.folder-state button { min-height:34px; display:inline-flex; align-items:center; justify-content:center; gap:7px; padding:0 12px; border:1px solid var(--border-color,rgba(15,23,42,.12)); border-radius:6px; background:var(--surface,var(--bg-primary,#fff)); color:var(--text-secondary); font-size:12px; font-weight:600; cursor:pointer; white-space:nowrap; }.new-folder-button:hover,.secondary-button:hover { background:var(--control-hover,rgba(37,99,235,.06)); color:var(--text-primary); }
.folder-browser-body { min-height:0; flex:1; display:grid; grid-template-columns:176px minmax(0,1fr); }
.location-sidebar { padding:10px; overflow-y:auto; border-right:1px solid var(--border-color,rgba(15,23,42,.1)); background:color-mix(in srgb,var(--bg-secondary,#f8fafc) 54%,transparent); }.location-sidebar button { width:100%; min-height:36px; display:flex; align-items:center; gap:9px; padding:0 10px; border:0; border-radius:5px; background:transparent; color:var(--text-secondary); font-size:12px; text-align:left; cursor:pointer; }.location-sidebar button:hover { background:var(--control-hover,rgba(37,99,235,.07)); color:var(--text-primary); }
.directory-pane { min-width:0; min-height:0; display:flex; flex-direction:column; overflow:hidden; background:var(--surface,var(--bg-primary,#fff)); }.directory-list { min-height:0; overflow:auto; padding:6px 0; }
.directory-row { width:100%; min-height:42px; display:grid; grid-template-columns:32px minmax(0,1fr) 74px 24px; align-items:center; gap:7px; padding:0 14px; border:0; border-bottom:1px solid color-mix(in srgb,var(--border-color,rgba(15,23,42,.1)) 62%,transparent); background:transparent; color:var(--text-secondary); text-align:left; cursor:pointer; }.directory-row:hover { background:color-mix(in srgb,var(--accent-blue,#2563eb) 5%,transparent); }.file-row { cursor:default; opacity:.68; }.file-row:hover { background:transparent; }.file-icon { width:28px; height:28px; display:grid; place-items:center; border-radius:5px; background:var(--bg-secondary,#f8fafc); color:var(--text-muted); }.folder-icon { color:#b7791f; background:color-mix(in srgb,#f59e0b 10%,transparent); }.item-name { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--text-primary); font-size:12.5px; }.item-type { color:var(--text-muted); font-size:10.5px; }.row-spacer { width:15px; }
.create-folder-row { min-height:52px; display:grid; grid-template-columns:28px minmax(0,1fr) auto auto; align-items:center; gap:8px; padding:8px 14px; border-bottom:1px solid var(--border-color,rgba(15,23,42,.1)); color:#b7791f; background:color-mix(in srgb,#f59e0b 5%,transparent); }.create-folder-row input { min-width:0; height:34px; padding:0 10px; border:1px solid var(--accent-blue,#2563eb); border-radius:5px; outline:0; background:var(--surface,var(--bg-primary,#fff)); color:var(--text-primary); font-size:12px; }.create-folder-row .create-confirm { border-color:var(--accent-blue,#2563eb); background:var(--accent-blue,#2563eb); color:#fff; }.create-folder-row .create-cancel { background:transparent; }
.folder-state { height:100%; min-height:240px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; padding:24px; color:var(--text-muted); text-align:center; }.folder-state strong { color:var(--text-secondary); font-size:13px; }.folder-state span { font-size:11px; }.error-state strong { color:var(--danger-color,#b91c1c); }
.folder-browser-footer { min-height:66px; display:flex; align-items:center; gap:9px; padding:10px 14px; border-top:1px solid var(--border-color,rgba(15,23,42,.1)); background:color-mix(in srgb,var(--bg-secondary,#f8fafc) 54%,transparent); }.selected-directory { min-width:0; flex:1; }.selected-directory span,.selected-directory strong { display:block; }.selected-directory span { color:var(--text-muted); font-size:10px; }.selected-directory strong { margin-top:3px; overflow:hidden; color:var(--text-primary); text-overflow:ellipsis; white-space:nowrap; font:11px ui-monospace,SFMono-Regular,Consolas,monospace; }.primary-button { border-color:var(--accent-blue,#2563eb); background:var(--accent-blue,#2563eb); color:#fff; }.primary-button:disabled,.new-folder-button:disabled { opacity:.42; cursor:not-allowed; }
.spinning { animation:folder-spin .8s linear infinite; } @keyframes folder-spin { to { transform:rotate(360deg); } }
@media(max-width:680px){.folder-browser-overlay{padding:0}.folder-browser{width:100vw;height:100dvh;min-height:0;border:0;border-radius:0}.folder-browser-header{min-height:64px}.folder-browser-header p{display:none}.folder-browser-toolbar{flex-wrap:wrap}.address-bar{order:3;flex-basis:100%}.new-folder-button{margin-left:auto}.folder-browser-body{grid-template-columns:1fr;grid-template-rows:auto minmax(0,1fr)}.location-sidebar{display:flex;gap:5px;padding:7px;overflow-x:auto;border-right:0;border-bottom:1px solid var(--border-color,rgba(15,23,42,.1))}.location-sidebar button{width:auto;flex:0 0 auto}.folder-browser-footer{flex-wrap:wrap}.selected-directory{flex-basis:100%}.secondary-button,.primary-button{flex:1}.create-folder-row{grid-template-columns:26px minmax(0,1fr)}.create-folder-row button{grid-row:2}.create-folder-row .create-confirm{grid-column:1}.create-folder-row .create-cancel{grid-column:2}}
</style>
