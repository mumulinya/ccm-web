<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { Download, ListMusic, ListPlus, LoaderCircle, Play, Search, X } from '@lucide/vue'
import { toast } from '../../utils/toast.js'

const props = defineProps({
  open: { type: Boolean, default: false },
  initialQuery: { type: String, default: '' },
  actionHandler: { type: Function, required: true },
})
const emit = defineEmits(['close'])
const query = ref('')
const loading = ref(false)
const activeSource = ref('all')
const result = ref({ local: [], netease: [], bilibili: [], errors: {} })
const busyKey = ref('')
const inputRef = ref(null)

const sources = [
  { id: 'all', label: '全部' },
  { id: 'local', label: '本地' },
  { id: 'netease', label: '网易' },
  { id: 'bilibili', label: 'B站' },
]
const sourceLabel = { local: '本地', netease: '网易', bilibili: 'B站' }
const sourceRows = computed(() => {
  const rows = [
    ...(result.value.local || []),
    ...(result.value.netease || []),
    ...(result.value.bilibili || []),
  ]
  return activeSource.value === 'all' ? rows : (result.value[activeSource.value] || [])
})
const counts = computed(() => ({
  all: (result.value.local?.length || 0) + (result.value.netease?.length || 0) + (result.value.bilibili?.length || 0),
  local: result.value.local?.length || 0,
  netease: result.value.netease?.length || 0,
  bilibili: result.value.bilibili?.length || 0,
}))
const itemTrack = item => item.type === 'local' ? item.track : item
const itemKey = item => `${item.type}:${item.track?.filename || item.songId || item.bvid}`

const search = async () => {
  const value = query.value.trim()
  if (!value) return
  loading.value = true
  try {
    const res = await fetch(`/api/music/search-unified?q=${encodeURIComponent(value)}`)
    const data = await res.json()
    if (!res.ok || !data.success) throw new Error(data.error || '统一音乐搜索失败')
    result.value = data
  } catch (error) {
    toast.error(error?.message || '统一音乐搜索失败')
  } finally {
    loading.value = false
  }
}

const runAction = async (action, item) => {
  const key = `${itemKey(item)}:${action}`
  busyKey.value = key
  try { await props.actionHandler(action, item) }
  finally { busyKey.value = '' }
}

watch(() => props.open, async (open) => {
  if (!open) return
  query.value = props.initialQuery || query.value
  await nextTick()
  inputRef.value?.focus()
  if (query.value.trim()) search()
}, { immediate: true })
</script>

<template>
  <div v-if="open" class="unified-search-layer" role="dialog" aria-modal="true" aria-label="统一音乐搜索">
    <button class="unified-search-scrim" aria-label="关闭" @click="emit('close')"></button>
    <section class="unified-search-dialog">
      <header>
        <div><strong>统一音乐搜索</strong><span>一次搜索本地、网易和 B站</span></div>
        <button title="关闭" @click="emit('close')"><X :size="18" /></button>
      </header>
      <form class="unified-search-form" @submit.prevent="search">
        <Search :size="16" />
        <input ref="inputRef" v-model="query" placeholder="搜索歌曲、歌手或专辑" />
        <button type="submit" :disabled="loading || !query.trim()">
          <LoaderCircle v-if="loading" class="spin" :size="15" />
          <Search v-else :size="15" />
          搜索
        </button>
      </form>
      <nav class="unified-source-tabs" aria-label="搜索来源">
        <button v-for="source in sources" :key="source.id" :class="{ active: activeSource === source.id }" @click="activeSource = source.id">
          {{ source.label }} <small>{{ counts[source.id] }}</small>
        </button>
      </nav>
      <div class="unified-search-results">
        <div v-if="!loading && !sourceRows.length" class="unified-search-empty">
          <Search :size="32" /><strong>{{ query.trim() ? '没有找到匹配歌曲' : '输入关键词开始搜索' }}</strong>
        </div>
        <article v-for="item in sourceRows" :key="itemKey(item)" class="unified-result-row">
          <img v-if="itemTrack(item).pic" :src="itemTrack(item).pic" alt="" />
          <span v-else class="unified-result-cover"><ListMusic :size="16" /></span>
          <span class="unified-result-copy">
            <strong>{{ itemTrack(item).title || itemTrack(item).name }}</strong>
            <small>{{ itemTrack(item).artist || itemTrack(item).author || '未知艺术家' }}</small>
          </span>
          <span class="source-chip" :class="item.type">{{ sourceLabel[item.type] }}</span>
          <span class="unified-result-duration">{{ itemTrack(item).duration || '--:--' }}</span>
          <div class="unified-result-actions">
            <button title="立即播放" :disabled="!!busyKey" @click="runAction('play', item)"><Play :size="14" /></button>
            <button title="下一首播放" :disabled="!!busyKey" @click="runAction('next', item)"><ListPlus :size="14" /></button>
            <button v-if="item.type !== 'local'" title="下载到本地" :disabled="!!busyKey" @click="runAction('download', item)"><Download :size="14" /></button>
            <button title="加入歌单" :disabled="!!busyKey" @click="runAction('playlist', item)"><ListMusic :size="14" /></button>
          </div>
        </article>
      </div>
      <footer v-if="Object.keys(result.errors || {}).length">
        部分来源暂不可用：{{ Object.entries(result.errors).map(([source, message]) => `${sourceLabel[source] || source} ${message}`).join('；') }}
      </footer>
    </section>
  </div>
</template>

<style scoped>
.unified-search-layer { position: fixed; inset: 0; z-index: 1240; display: grid; place-items: center; padding: 24px; }
.unified-search-scrim { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; background: rgba(1,7,12,.7); }
.unified-search-dialog { position: relative; width: min(880px, 100%); max-height: min(760px, calc(100vh - 48px)); display: flex; flex-direction: column; overflow: hidden; border: 1px solid rgba(105,184,207,.24); border-radius: 8px; color: #dce8ef; background: #0b171d; box-shadow: 0 24px 80px rgba(0,0,0,.55); }
.unified-search-dialog > header { min-height: 66px; padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(105,184,207,.13); }
.unified-search-dialog > header > div { display: flex; flex-direction: column; gap: 3px; }
.unified-search-dialog > header strong { font-size: 15px; }
.unified-search-dialog > header span { color: #7892a0; font-size: 10px; }
.unified-search-dialog > header button { width: 32px; height: 32px; display: grid; place-items: center; border: 0; border-radius: 5px; color: #91aab8; background: transparent; cursor: pointer; }
.unified-search-form { margin: 14px 14px 8px; height: 42px; display: grid; grid-template-columns: auto minmax(0,1fr) auto; align-items: center; gap: 9px; padding-left: 12px; border: 1px solid rgba(105,184,207,.22); border-radius: 6px; background: rgba(2,11,16,.7); color: #6f93a5; }
.unified-search-form input { min-width: 0; border: 0; outline: 0; color: #e7f3f7; background: transparent; }
.unified-search-form button { align-self: stretch; padding: 0 13px; display: inline-flex; align-items: center; gap: 6px; border: 0; border-left: 1px solid rgba(105,184,207,.16); color: #8ce7ee; background: rgba(68,215,232,.07); cursor: pointer; }
.unified-source-tabs { display: flex; gap: 4px; padding: 0 14px 10px; overflow-x: auto; }
.unified-source-tabs button { height: 29px; padding: 0 10px; border: 1px solid transparent; border-radius: 5px; color: #7892a0; background: transparent; cursor: pointer; }
.unified-source-tabs button.active { color: #8ce7ee; border-color: rgba(68,215,232,.2); background: rgba(68,215,232,.07); }
.unified-source-tabs small { margin-left: 4px; }
.unified-search-results { flex: 1; min-height: 240px; overflow-y: auto; padding: 0 8px 10px; }
.unified-result-row { min-height: 58px; display: grid; grid-template-columns: 40px minmax(0,1fr) auto 48px auto; align-items: center; gap: 9px; padding: 6px 8px; border-bottom: 1px solid rgba(105,184,207,.08); }
.unified-result-row img, .unified-result-cover { width: 36px; height: 36px; border-radius: 5px; }
.unified-result-row img { object-fit: cover; }
.unified-result-cover { display: grid; place-items: center; color: #6f93a5; background: rgba(105,184,207,.08); }
.unified-result-copy { min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.unified-result-copy strong, .unified-result-copy small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.unified-result-copy strong { font-size: 12px; }.unified-result-copy small, .unified-result-duration { color: #718c9a; font-size: 10px; }
.source-chip { padding: 3px 6px; border-radius: 4px; color: #90dfe8; background: rgba(68,215,232,.07); font-size: 9px; }
.source-chip.netease { color: #ff9ba5; background: rgba(255,93,108,.08); }.source-chip.bilibili { color: #f2b4cd; background: rgba(236,115,162,.08); }
.unified-result-actions { display: flex; gap: 2px; }
.unified-result-actions button { width: 30px; height: 30px; display: grid; place-items: center; border: 1px solid transparent; border-radius: 5px; color: #819eac; background: transparent; cursor: pointer; }
.unified-result-actions button:hover { color: #e7f8fb; border-color: rgba(105,184,207,.18); background: rgba(105,184,207,.07); }
.unified-search-empty { min-height: 300px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; color: #6f8997; }
.unified-search-empty strong { color: #bdcfd7; font-size: 12px; }
.unified-search-dialog > footer { padding: 9px 14px; border-top: 1px solid rgba(255,175,90,.12); color: #d5a46e; font-size: 10px; }
.spin { animation: unified-spin .8s linear infinite; } @keyframes unified-spin { to { transform: rotate(360deg); } }
@media (max-width: 650px) { .unified-search-layer { padding: 0; align-items: end; }.unified-search-dialog { max-height: 86vh; border-right: 0; border-bottom: 0; border-left: 0; border-radius: 8px 8px 0 0; }.unified-result-row { grid-template-columns: 36px minmax(0,1fr) auto; }.unified-result-duration { display: none; }.unified-result-actions { grid-column: 2 / 4; justify-content: flex-end; } }
</style>
