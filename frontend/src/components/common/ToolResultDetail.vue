<script setup>
import { computed, ref } from 'vue'
import { ChevronDown, ChevronRight, Copy, File, FileCode2, FileSearch, Folder, GitBranch, Search } from '@lucide/vue'
import { normalizeToolResultPresentation } from '../../utils/toolResultPresentation.js'
import { listingPathIsOpenable } from '../../utils/executionSourceReads.js'

const props = defineProps({
  display: { type: Object, default: () => ({}) },
  tokenCount: { type: Number, default: 0 },
  detailed: Boolean,
  customContent: Boolean,
  showTechnical: Boolean,
  sourceLoading: Boolean,
  sourceError: { type: String, default: "" },
  openablePaths: { type: Array, default: () => [] },
})
const emit = defineEmits(['open-source', 'open-listing-path'])
const expandedGroups = ref(new Set())
const expandedPaths = ref(new Set())
const copyNotice = ref('')
const presentation = computed(() => normalizeToolResultPresentation(props.display))
const result = computed(() => props.display?.result || {})
const groups = computed(() => presentation.value.groups || [])
const fileRows = computed(() => Array.isArray(result.value.fileRows) ? result.value.fileRows : [])
const isPathListing = computed(() => ['directory', 'files', 'file_content'].includes(presentation.value.layout))
const isFileContentListing = computed(() => presentation.value.layout === 'file_content')
const iconFor = computed(() => {
  const layout = presentation.value.layout
  if (layout === 'matches') return Search
  if (layout === 'symbols') return FileSearch
  if (layout === 'git') return GitBranch
  if (layout === 'directory' || layout === 'files') return Folder
  if (layout === 'file_content') return FileCode2
  return File
})
const technicalAvailable = computed(() => !!(
  props.display?.sensitiveCommand
  || props.display?.arguments?.length
  || result.value?.searchExecution
  || result.value?.freshness
  || result.value?.authoritativeRevision
  || result.value?.commandExecution
  || props.tokenCount
))
const technicalState = computed(() => {
  if (result.value?.searchExecution?.cancelled) return '已取消，保留部分结果'
  if (result.value?.searchExecution?.timedOut) return '已超时，保留部分结果'
  if (result.value?.searchExecution?.partial) return '部分结果'
  return '完整结果'
})
const freshnessLabel = computed(() => ({ current: '与当前权威来源一致', drifted: '当前内容已经变化', deleted: '权威来源已删除', permission_revoked: '当前权限已撤销' }[result.value?.freshness] || ''))
const showGroupHeader = group => !isPathListing.value && !!(group.label && group.label.trim())
const isAllVisible = group => props.detailed || expandedGroups.value.has(group.id)
const visibleItems = group => isAllVisible(group) ? group.items : group.items.slice(0, 20)
const toggleGroup = group => {
  const next = new Set(expandedGroups.value)
  next.has(group.id) ? next.delete(group.id) : next.add(group.id)
  expandedGroups.value = next
}
const displayValue = value => {
  if (value == null || value === '') return '—'
  if (typeof value === 'object') { try { return JSON.stringify(value, null, 2) } catch { return '—' } }
  return String(value)
}
const normalizePath = value => String(value || '').replace(/\\/g, '/').replace(/^\.\//, '').trim()
const entryPath = entry => normalizePath(entry?.path || entry?.label)
const fileRowFor = entry => {
  const path = entryPath(entry)
  if (!path) return null
  const samePath = (left, right) => left === right || left.endsWith(`/${right}`) || right.endsWith(`/${left}`)
  return fileRows.value.find(file => {
    const filePath = normalizePath(file?.path || file?.name)
    return samePath(filePath, path)
  }) || null
}
const isFileExpanded = entry => expandedPaths.value.has(entryPath(entry))
const listingHint = computed(() => {
  if (!isPathListing.value || isFileContentListing.value) return ''
  return openableListingCount.value
    ? '这是目录或文件清单，不含正文。已读取的文件可点击查看内容。'
    : '这是目录或文件清单，Agent 未读取这些文件的正文。'
})
const openableListingCount = computed(() => {
  if (!isPathListing.value || isFileContentListing.value) return 0
  return groups.value.reduce((count, group) => (
    count + (group.items || []).filter(entry => listingFileOpenable(entry)).length
  ), 0)
})
const listingFileOpenable = entry => (
  entry?.status !== 'directory' && listingPathIsOpenable(entryPath(entry), props.openablePaths)
)
const openListingFile = entry => {
  if (!listingFileOpenable(entry)) return
  emit('open-listing-path', { path: entryPath(entry) })
}
const toggleFile = entry => {
  const path = entryPath(entry)
  if (!path) return
  const next = new Set(expandedPaths.value)
  if (next.has(path)) next.delete(path)
  else {
    next.add(path)
    emit('open-source', { path })
  }
  expandedPaths.value = next
}
const fileRange = file => {
  const from = Math.max(1, Number(file?.from || file?.lines?.[0]?.line || 1))
  const to = Math.max(from, Number(file?.to || file?.lines?.at?.(-1)?.line || from))
  return from === to ? `第 ${from} 行` : `第 ${from}–${to} 行`
}
const fileFreshnessLabel = file => {
  if (file?.freshness === 'drifted') return '文件已变化，下面是当前版本'
  if (file?.freshness === 'deleted') return '文件已删除'
  if (file?.freshness === 'permission_revoked') return '源码读取权限已撤销'
  return ''
}
const copyFile = async file => {
  const text = (Array.isArray(file?.lines) ? file.lines : []).map(line => String(line?.text ?? '')).join('\n')
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    copyNotice.value = `已复制 ${file.path}`
    window.setTimeout(() => { if (copyNotice.value === `已复制 ${file.path}`) copyNotice.value = '' }, 1800)
  } catch {
    copyNotice.value = '复制失败，请选择源码后复制'
  }
}
</script>

<template>
  <section class="tool-result-detail">
    <header v-if="!isPathListing || !groups.length" class="tool-result-summary">
      <component :is="iconFor" :size="15" aria-hidden="true" />
      <strong>{{ result.summary || '工具执行完成' }}</strong>
    </header>

    <slot v-if="customContent" name="content" />
    <div v-else-if="groups.length" class="tool-result-groups" :class="{ listing: isPathListing }">
      <section v-for="group in groups" :key="group.id" class="tool-result-group">
        <header v-if="showGroupHeader(group)"><strong>{{ group.label }}</strong><span>{{ group.count || group.items.length }}</span></header>
        <div :class="['tool-result-items', `layout-${presentation.layout}`]">
          <div v-for="(entry, index) in visibleItems(group)" :key="`${entry.path || entry.label}:${entry.line || index}`" class="tool-result-file">
            <button
              v-if="isFileContentListing"
              type="button"
              class="tool-result-item tool-result-item-open"
              :class="{ expanded: isFileExpanded(entry) }"
              :title="entry.path || entry.label"
              :aria-expanded="isFileExpanded(entry)"
              @click="toggleFile(entry)"
            >
              <File :size="14" aria-hidden="true" />
              <span class="tool-result-item-copy">
                <strong>{{ entry.label }}</strong>
                <small v-if="entry.secondary">{{ entry.secondary }}</small>
              </span>
              <ChevronDown v-if="isFileExpanded(entry)" :size="12" aria-hidden="true" />
              <ChevronRight v-else :size="12" aria-hidden="true" />
            </button>
            <button
              v-else-if="listingFileOpenable(entry)"
              type="button"
              class="tool-result-item tool-result-item-open"
              :title="entry.path || entry.label"
              @click="openListingFile(entry)"
            >
              <File :size="14" aria-hidden="true" />
              <span class="tool-result-item-copy">
                <strong>{{ entry.label }}</strong>
                <small>查看已读内容</small>
              </span>
              <ChevronRight :size="12" aria-hidden="true" />
            </button>
            <div v-else class="tool-result-item" :title="entry.path || entry.label">
              <Folder v-if="entry.status === 'directory'" :size="14" aria-hidden="true" />
              <File v-else :size="14" aria-hidden="true" />
              <span class="tool-result-item-copy">
                <strong>{{ entry.label }}</strong>
                <small v-if="entry.line">第 {{ entry.line }} 行</small>
                <small v-if="entry.secondary">{{ entry.secondary }}</small>
              </span>
            </div>
            <div v-if="isFileContentListing && isFileExpanded(entry)" class="tool-result-file-detail">
              <div class="tool-result-file-head">
                <span>{{ fileRowFor(entry) ? fileRange(fileRowFor(entry)) : '文件内容' }}</span>
                <button v-if="fileRowFor(entry)?.lines?.length" type="button" title="复制当前读取范围" aria-label="复制当前读取范围" @click.stop="copyFile(fileRowFor(entry))">
                  <Copy :size="11" />复制
                </button>
              </div>
              <p v-if="fileFreshnessLabel(fileRowFor(entry))" class="tool-result-file-freshness" :class="{ drifted: fileRowFor(entry)?.freshness === 'drifted', unavailable: ['deleted', 'permission_revoked'].includes(fileRowFor(entry)?.freshness) }">{{ fileFreshnessLabel(fileRowFor(entry)) }}</p>
              <p v-if="copyNotice" class="tool-result-file-notice">{{ copyNotice }}</p>
              <div v-if="fileRowFor(entry)?.lines?.length" class="tool-result-file-lines" role="region" :aria-label="`${entry.path || entry.label} 已读取内容`">
                <div v-for="line in fileRowFor(entry).lines" :key="line.line" class="tool-result-file-line">
                  <span>{{ line.line }}</span><code>{{ line.text || ' ' }}</code>
                </div>
              </div>
              <p v-else class="tool-result-file-empty">{{ sourceError ? '当前无法读取文件内容，请点底部重试。' : sourceLoading ? '正在读取文件内容…' : fileRowFor(entry)?.status === 'unchanged' ? '文件内容未变化，主 Agent 继续使用当前上下文中的已读内容。' : fileRowFor(entry) ? '该文件本次没有可显示的文本内容。' : '正在准备文件内容…' }}</p>
              <small v-if="fileRowFor(entry)?.status === 'partial'" class="tool-result-file-pending">该文件尚未读完，可在批次底部继续读取剩余内容。</small>
            </div>
          </div>
        </div>
        <button v-if="group.items.length > 20 && !detailed" type="button" class="tool-result-more" :aria-expanded="isAllVisible(group)" @click="toggleGroup(group)">
          <template v-if="isAllVisible(group)"><ChevronDown :size="13" />收起</template>
          <template v-else><ChevronRight :size="13" />查看全部 {{ group.items.length }} 项</template>
        </button>
      </section>
    </div>
    <p v-if="listingHint" class="tool-result-listing-hint">{{ listingHint }}</p>

    <slot name="actions" />

    <details v-if="showTechnical && technicalAvailable" class="tool-technical-detail" :open="detailed">
      <summary>技术详情</summary>
      <div class="tool-technical-body">
        <div v-if="display.sensitiveCommand"><b>脱敏命令</b><pre>{{ display.sensitiveCommand }}</pre></div>
        <dl v-if="display.arguments?.length">
          <template v-for="argument in display.arguments" :key="argument.label"><dt>{{ argument.label }}</dt><dd>{{ displayValue(argument.value) }}</dd></template>
        </dl>
        <dl v-if="result.searchExecution || freshnessLabel || result.authoritativeRevision || result.commandExecution || tokenCount">
          <template v-if="result.searchExecution"><dt>搜索方式</dt><dd>{{ result.searchExecution.engine === 'bundled_rg' ? 'CCM 内置搜索' : result.searchExecution.engine === 'system_rg' ? '系统搜索' : '兼容搜索' }}</dd><dt>结果状态</dt><dd>{{ technicalState }}</dd></template>
          <template v-if="freshnessLabel"><dt>数据状态</dt><dd>{{ freshnessLabel }}</dd></template>
          <template v-if="result.authoritativeRevision"><dt>权威版本</dt><dd>{{ result.authoritativeRevision }}</dd></template>
          <template v-if="result.commandExecution"><dt>执行状态</dt><dd>{{ result.commandExecution.status || 'unknown' }}</dd><dt v-if="Number.isFinite(result.commandExecution.exitCode)">退出码</dt><dd v-if="Number.isFinite(result.commandExecution.exitCode)">{{ result.commandExecution.exitCode }}</dd><dt v-if="Number.isFinite(result.commandExecution.durationMs)">耗时</dt><dd v-if="Number.isFinite(result.commandExecution.durationMs)">{{ result.commandExecution.durationMs }} ms</dd></template>
          <template v-if="tokenCount"><dt>结果 Token</dt><dd>{{ tokenCount }}</dd></template>
        </dl>
      </div>
    </details>
  </section>
</template>

<style scoped>
.tool-result-detail{display:grid;gap:10px;min-width:0}.tool-result-summary{display:flex;align-items:center;gap:7px;color:var(--text-secondary)}.tool-result-summary svg{flex:none;color:var(--text-muted)}.tool-result-summary strong{font-size:11px;line-height:1.45}.tool-result-groups{display:grid;gap:12px}.tool-result-group{display:grid;gap:7px}.tool-result-group>header{display:flex;align-items:center;gap:6px}.tool-result-group>header strong{font-size:11px}.tool-result-group>header span{color:var(--text-muted);font-size:10px}.tool-result-items{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:5px 9px}.tool-result-items.layout-matches,.tool-result-items.layout-symbols,.tool-result-items.layout-git{grid-template-columns:1fr}.tool-result-items.layout-file_content{grid-template-columns:repeat(auto-fill,minmax(240px,1fr))}.tool-result-item{display:flex;align-items:flex-start;min-width:0;gap:6px;padding:5px 6px;border-radius:6px;background:color-mix(in srgb,var(--bg-secondary,#f1f5f9) 58%,transparent);color:var(--text-secondary)}.tool-result-item>svg{flex:none;margin-top:1px;color:var(--text-muted)}.tool-result-item-copy{display:flex;align-items:baseline;min-width:0;gap:6px;overflow:hidden}.tool-result-item-copy strong{min-width:0;overflow:hidden;font-size:10.5px;font-weight:600;text-overflow:ellipsis;white-space:nowrap}.tool-result-item-copy small{flex:none;color:var(--text-muted);font-size:9.5px}.layout-file_content .tool-result-item-copy{display:grid;flex:1;align-items:start;gap:2px;overflow:hidden}.layout-file_content .tool-result-item-copy strong{display:block;width:100%;color:var(--text-primary);font:600 10.5px/1.4 ui-monospace,SFMono-Regular,Consolas,monospace}.layout-file_content .tool-result-item-copy small{display:block;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;line-height:1.4}.layout-matches .tool-result-item-copy,.layout-symbols .tool-result-item-copy,.layout-git .tool-result-item-copy{flex-wrap:wrap}.layout-matches .tool-result-item-copy small:last-child{flex-basis:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.tool-result-more{justify-self:start;display:inline-flex;align-items:center;gap:4px;padding:0;border:0;background:transparent;color:var(--accent-blue,#2563eb);font-size:10px;cursor:pointer}.tool-technical-detail{padding-top:8px;border-top:1px dashed color-mix(in srgb,var(--border-color,#cbd5e1) 75%,transparent)}.tool-technical-detail>summary{color:var(--text-muted);font-size:10px;font-weight:700;cursor:pointer}.tool-technical-body{display:grid;gap:8px;margin-top:8px}.tool-technical-body b{display:block;margin-bottom:4px;color:var(--text-muted);font-size:9.5px}.tool-technical-body pre{max-height:180px;margin:0;padding:7px;border-radius:6px;background:var(--bg-secondary);font:9.5px/1.5 ui-monospace,SFMono-Regular,Consolas,monospace;white-space:pre-wrap;overflow:auto}.tool-technical-body dl{display:grid;grid-template-columns:minmax(80px,auto) minmax(0,1fr);gap:4px 10px;margin:0}.tool-technical-body dt{color:var(--text-muted);font-size:9.5px}.tool-technical-body dd{min-width:0;margin:0;color:var(--text-secondary);font:9.5px/1.5 ui-monospace,SFMono-Regular,Consolas,monospace;white-space:pre-wrap;overflow-wrap:anywhere}@media(max-width:720px){.tool-result-items,.tool-result-items.layout-file_content{grid-template-columns:1fr}.tool-technical-body dl{grid-template-columns:1fr}.tool-result-item-copy{flex-wrap:wrap}}
.tool-result-groups.listing{gap:0}
.tool-result-groups.listing .tool-result-group{gap:0}
.tool-result-items.layout-directory,
.tool-result-items.layout-files,
.tool-result-items.layout-file_content{grid-template-columns:1fr;gap:0}
.layout-directory .tool-result-item,
.layout-files .tool-result-item,
.layout-file_content .tool-result-item{align-items:center;padding:1px 0;border-radius:0;background:transparent}
.layout-directory .tool-result-item>svg,
.layout-files .tool-result-item>svg,
.layout-file_content .tool-result-item>svg{margin-top:0}
.layout-directory .tool-result-item-copy strong,
.layout-files .tool-result-item-copy strong,
.layout-file_content .tool-result-item-copy strong{color:var(--text-primary);font:500 11px/1.45 ui-monospace,SFMono-Regular,Consolas,monospace}
.layout-file_content .tool-result-item-copy{display:flex;flex:1;align-items:baseline;gap:8px;overflow:hidden}
.layout-file_content .tool-result-item-copy strong{display:inline;width:auto}
.layout-file_content .tool-result-item-copy small{display:inline;flex:none;white-space:nowrap}
.tool-result-file{display:grid;min-width:0}
.tool-result-item-open{width:100%;border:0;font:inherit;text-align:left;cursor:pointer}
.tool-result-item-open:hover{background:color-mix(in srgb,var(--primary-color,#2563eb) 6%,transparent)}
.tool-result-item-open:focus-visible{outline:2px solid color-mix(in srgb,var(--primary-color,#2563eb) 65%,transparent);outline-offset:1px}
.tool-result-item-open>svg:last-of-type{margin-left:auto;color:var(--text-muted)}
.tool-result-file-detail{margin:2px 0 10px 18px;min-width:0}
.tool-result-file-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:6px;color:var(--text-muted);font:10px/1.4 ui-monospace,SFMono-Regular,Consolas,monospace}
.tool-result-file-head button{display:inline-flex;align-items:center;gap:3px;padding:2px 5px;border:1px solid color-mix(in srgb,var(--border-color,#94a3b8) 35%,transparent);border-radius:4px;color:var(--text-muted);background:transparent;font:inherit;cursor:pointer}
.tool-result-file-head button:hover{color:var(--text-primary);background:rgba(100,116,139,.08)}
.tool-result-file-freshness{margin:0 0 6px;padding:4px 7px;border-radius:5px;color:#b45309;background:rgba(245,158,11,.1);font-size:10px}
.tool-result-file-freshness.unavailable{color:#b91c1c;background:rgba(239,68,68,.08)}
.tool-result-file-notice{margin:0 0 6px;color:#2563eb;font-size:10px}
.tool-result-file-lines{overflow-x:auto;overflow-y:visible;border-radius:5px;background:color-mix(in srgb,var(--surface,#fff) 84%,transparent)}
.tool-result-file-line{display:grid;grid-template-columns:64px minmax(0,1fr);min-height:22px;border-bottom:1px solid color-mix(in srgb,var(--border-color,#94a3b8) 14%,transparent)}
.tool-result-file-line:last-child{border-bottom:0}
.tool-result-file-line>span{padding:4px 7px;color:var(--text-muted);background:rgba(100,116,139,.045);font:9px/1.5 ui-monospace,SFMono-Regular,Consolas,monospace;user-select:none}
.tool-result-file-line code{min-width:max-content;padding:4px 8px;white-space:pre;overflow-wrap:normal;color:var(--text-secondary);font:10px/1.5 ui-monospace,SFMono-Regular,Consolas,monospace}
.tool-result-file-empty{margin:0;color:var(--text-muted);font-size:10px}
.tool-result-file-pending{display:block;margin-top:7px;color:#2563eb;font-size:10px}
.tool-result-listing-hint{margin:4px 0 0;color:var(--text-muted);font-size:10px;line-height:1.45}
</style>
