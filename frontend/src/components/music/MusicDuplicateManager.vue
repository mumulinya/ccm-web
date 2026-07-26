<script setup>
import { onMounted, ref } from 'vue'
import { CheckCircle2, Files, LoaderCircle, RefreshCw, Trash2, X } from '@lucide/vue'
import { confirmDialog, toast } from '../../utils/toast.js'

const emit = defineEmits(['close', 'changed'])
const loading = ref(false)
const mergingId = ref('')
const groups = ref([])
const selected = ref({})

const load = async () => {
  loading.value = true
  try {
    const res = await fetch('/api/music/duplicates')
    const data = await res.json()
    if (!res.ok || !data.success) throw new Error(data.error || '扫描重复歌曲失败')
    groups.value = data.groups || []
    selected.value = Object.fromEntries(groups.value.map(group => [group.id, group.recommendedFilename]))
  } catch (error) {
    toast.error(error?.message || '扫描重复歌曲失败')
  } finally {
    loading.value = false
  }
}

const mergeGroup = async (group) => {
  const keepFilename = selected.value[group.id] || group.recommendedFilename
  const removeFilenames = group.items.map(item => item.filename).filter(filename => filename !== keepFilename)
  if (!removeFilenames.length) return
  const confirmed = await confirmDialog(`将保留：${keepFilename}\n永久删除其余 ${removeFilenames.length} 个重复文件。是否继续？`)
  if (!confirmed) return
  mergingId.value = group.id
  try {
    const res = await fetch('/api/music/duplicates/merge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keepFilename, removeFilenames }),
    })
    const data = await res.json()
    if (!res.ok || !data.success) throw new Error(data.error || '合并重复歌曲失败')
    groups.value = data.groups || []
    selected.value = Object.fromEntries(groups.value.map(item => [item.id, item.recommendedFilename]))
    emit('changed')
    toast.success(`已保留所选版本，并清理 ${data.deleted?.length || 0} 个重复文件`)
  } catch (error) {
    toast.error(error?.message || '合并重复歌曲失败')
  } finally {
    mergingId.value = ''
  }
}

onMounted(load)
</script>

<template>
  <div class="duplicate-layer" role="dialog" aria-modal="true" aria-label="重复歌曲治理">
    <button class="duplicate-scrim" aria-label="关闭" @click="emit('close')"></button>
    <section class="duplicate-dialog">
      <header>
        <div class="duplicate-title">
          <span class="duplicate-icon"><Files :size="19" /></span>
          <div><strong>重复歌曲治理</strong><small>按歌曲名、艺术家和文件质量识别</small></div>
        </div>
        <div class="duplicate-header-actions">
          <button title="重新扫描" :disabled="loading" @click="load"><RefreshCw :size="16" /></button>
          <button title="关闭" @click="emit('close')"><X :size="17" /></button>
        </div>
      </header>

      <div v-if="loading" class="duplicate-empty"><LoaderCircle class="spin" :size="30" /><strong>正在扫描曲库</strong></div>
      <div v-else-if="!groups.length" class="duplicate-empty"><CheckCircle2 :size="34" /><strong>没有发现重复歌曲</strong><span>曲库中的歌曲版本已经保持唯一。</span></div>
      <div v-else class="duplicate-content">
        <article v-for="group in groups" :key="group.id" class="duplicate-group">
          <div class="duplicate-group-head">
            <div><strong>{{ group.title }}</strong><span>{{ group.artist }} · {{ group.items.length }} 个版本</span></div>
            <button class="merge-button" :disabled="mergingId === group.id" @click="mergeGroup(group)">
              <LoaderCircle v-if="mergingId === group.id" class="spin" :size="14" />
              <Trash2 v-else :size="14" />
              保留所选版本
            </button>
          </div>
          <label v-for="item in group.items" :key="item.filename" class="duplicate-version" :class="{ selected: selected[group.id] === item.filename }">
            <input v-model="selected[group.id]" type="radio" :name="group.id" :value="item.filename" />
            <span class="duplicate-version-copy">
              <strong>{{ item.filename }}</strong>
              <small>{{ item.source }} / {{ item.relativePath }}</small>
            </span>
            <span v-if="item.filename === group.recommendedFilename" class="recommended">推荐保留</span>
            <span class="file-facts">{{ item.extension }} · {{ item.sizeLabel }}<small>{{ new Date(item.modified).toLocaleString() }}</small></span>
          </label>
        </article>
      </div>
    </section>
  </div>
</template>

<style scoped>
.duplicate-layer { position: fixed; inset: 0; z-index: 1250; display: grid; place-items: center; padding: 24px; }
.duplicate-scrim { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; background: rgba(1, 7, 12, .68); }
.duplicate-dialog { position: relative; width: min(820px, 100%); max-height: min(760px, calc(100vh - 48px)); display: flex; flex-direction: column; overflow: hidden; border: 1px solid rgba(105,184,207,.24); border-radius: 8px; color: #dce8ef; background: #0b171d; box-shadow: 0 24px 80px rgba(0,0,0,.55); }
.duplicate-dialog > header { min-height: 68px; padding: 13px 16px; display: flex; align-items: center; justify-content: space-between; gap: 12px; border-bottom: 1px solid rgba(105,184,207,.14); }
.duplicate-title, .duplicate-header-actions, .duplicate-group-head, .duplicate-version { display: flex; align-items: center; }
.duplicate-title { gap: 10px; }
.duplicate-title > div { display: flex; flex-direction: column; gap: 2px; }
.duplicate-title strong { font-size: 15px; }
.duplicate-title small, .duplicate-group-head span, .duplicate-version-copy small, .file-facts small { color: #7892a0; font-size: 10px; }
.duplicate-icon { width: 36px; height: 36px; display: grid; place-items: center; border-radius: 6px; color: #72d8e5; background: rgba(68,215,232,.08); border: 1px solid rgba(68,215,232,.22); }
.duplicate-header-actions { gap: 4px; }
.duplicate-header-actions button { width: 32px; height: 32px; display: grid; place-items: center; border: 0; border-radius: 5px; color: #91aab8; background: transparent; cursor: pointer; }
.duplicate-header-actions button:hover { color: #e5f7fb; background: rgba(105,184,207,.09); }
.duplicate-content { min-height: 0; overflow-y: auto; padding: 12px; }
.duplicate-group { margin-bottom: 10px; overflow: hidden; border: 1px solid rgba(105,184,207,.14); border-radius: 7px; background: rgba(255,255,255,.018); }
.duplicate-group-head { justify-content: space-between; gap: 12px; padding: 12px 13px; border-bottom: 1px solid rgba(105,184,207,.1); }
.duplicate-group-head > div { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.merge-button { height: 31px; padding: 0 10px; display: inline-flex; align-items: center; gap: 6px; border: 1px solid rgba(255,113,128,.22); border-radius: 5px; color: #ff9aa4; background: rgba(255,113,128,.06); cursor: pointer; }
.duplicate-version { min-height: 58px; gap: 10px; padding: 9px 13px; border-bottom: 1px solid rgba(105,184,207,.08); cursor: pointer; }
.duplicate-version:last-child { border-bottom: 0; }
.duplicate-version.selected { background: rgba(68,215,232,.06); }
.duplicate-version-copy { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 3px; }
.duplicate-version-copy strong, .duplicate-version-copy small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.duplicate-version-copy strong { font-size: 12px; font-weight: 650; }
.recommended { padding: 3px 6px; border-radius: 4px; color: #62e6b2; background: rgba(52,211,153,.09); font-size: 10px; }
.file-facts { min-width: 120px; display: flex; flex-direction: column; align-items: flex-end; gap: 2px; color: #9bb4c1; font-size: 10px; }
.duplicate-empty { min-height: 330px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 9px; color: #6f8997; }
.duplicate-empty strong { color: #cbdce4; }
.duplicate-empty span { font-size: 11px; }
.spin { animation: duplicate-spin .8s linear infinite; }
@keyframes duplicate-spin { to { transform: rotate(360deg); } }
@media (max-width: 640px) {
  .duplicate-layer { padding: 0; align-items: end; }
  .duplicate-dialog { max-height: 82vh; border-right: 0; border-bottom: 0; border-left: 0; border-radius: 8px 8px 0 0; }
  .duplicate-version { align-items: flex-start; flex-wrap: wrap; }
  .file-facts { width: 100%; padding-left: 24px; align-items: flex-start; }
  .recommended { margin-left: 24px; }
}
</style>
