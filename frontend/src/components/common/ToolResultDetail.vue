<script setup>
import { computed, ref } from 'vue'
import { ChevronDown, ChevronRight, File, FileCode2, FileSearch, Folder, GitBranch, Search, TestTube2 } from '@lucide/vue'
import { normalizeToolResultPresentation } from '../../utils/toolResultPresentation.js'

const props = defineProps({
  display: { type: Object, default: () => ({}) },
  tokenCount: { type: Number, default: 0 },
  detailed: Boolean,
  customContent: Boolean,
})
const expandedGroups = ref(new Set())
const presentation = computed(() => normalizeToolResultPresentation(props.display))
const result = computed(() => props.display?.result || {})
const groups = computed(() => presentation.value.groups || [])
const technicalAvailable = computed(() => !!(
  props.display?.sensitiveCommand
  || props.display?.arguments?.length
  || result.value?.searchExecution
  || result.value?.freshness
  || result.value?.authoritativeRevision
  || props.tokenCount
))
const technicalState = computed(() => {
  if (result.value?.searchExecution?.cancelled) return '已取消，保留部分结果'
  if (result.value?.searchExecution?.timedOut) return '已超时，保留部分结果'
  if (result.value?.searchExecution?.partial) return '部分结果'
  return '完整结果'
})
const freshnessLabel = computed(() => ({ current: '与当前权威来源一致', drifted: '当前内容已经变化', deleted: '权威来源已删除', permission_revoked: '当前权限已撤销' }[result.value?.freshness] || ''))
const iconFor = computed(() => ({ directory: Folder, files: File, matches: Search, symbols: FileCode2, file_content: FileSearch, git: GitBranch, verification: TestTube2 }[presentation.value.layout] || File))
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
</script>

<template>
  <section class="tool-result-detail">
    <header class="tool-result-summary">
      <component :is="iconFor" :size="15" aria-hidden="true" />
      <strong>{{ result.summary || '工具执行完成' }}</strong>
    </header>

    <slot v-if="customContent" name="content" />
    <div v-else-if="groups.length" class="tool-result-groups">
      <section v-for="group in groups" :key="group.id" class="tool-result-group">
        <header><strong>{{ group.label }}</strong><span>{{ group.count || group.items.length }}</span></header>
        <div :class="['tool-result-items', `layout-${presentation.layout}`]">
          <div v-for="(entry, index) in visibleItems(group)" :key="`${entry.path || entry.label}:${entry.line || index}`" class="tool-result-item" :title="entry.path || entry.label">
            <Folder v-if="entry.status === 'directory'" :size="14" aria-hidden="true" />
            <File v-else :size="14" aria-hidden="true" />
            <span class="tool-result-item-copy">
              <strong>{{ entry.label }}</strong>
              <small v-if="entry.line">第 {{ entry.line }} 行</small>
              <small v-if="entry.secondary">{{ entry.secondary }}</small>
            </span>
          </div>
        </div>
        <button v-if="group.items.length > 20 && !detailed" type="button" class="tool-result-more" :aria-expanded="isAllVisible(group)" @click="toggleGroup(group)">
          <template v-if="isAllVisible(group)"><ChevronDown :size="13" />收起</template>
          <template v-else><ChevronRight :size="13" />查看全部 {{ group.items.length }} 项</template>
        </button>
      </section>
    </div>

    <slot name="actions" />

    <details v-if="technicalAvailable" class="tool-technical-detail" :open="detailed">
      <summary>技术详情</summary>
      <div class="tool-technical-body">
        <div v-if="display.sensitiveCommand"><b>脱敏命令</b><pre>{{ display.sensitiveCommand }}</pre></div>
        <dl v-if="display.arguments?.length">
          <template v-for="argument in display.arguments" :key="argument.label"><dt>{{ argument.label }}</dt><dd>{{ displayValue(argument.value) }}</dd></template>
        </dl>
        <dl v-if="result.searchExecution || freshnessLabel || result.authoritativeRevision || tokenCount">
          <template v-if="result.searchExecution"><dt>搜索方式</dt><dd>{{ result.searchExecution.engine === 'bundled_rg' ? 'CCM 内置搜索' : result.searchExecution.engine === 'system_rg' ? '系统搜索' : '兼容搜索' }}</dd><dt>结果状态</dt><dd>{{ technicalState }}</dd></template>
          <template v-if="freshnessLabel"><dt>数据状态</dt><dd>{{ freshnessLabel }}</dd></template>
          <template v-if="result.authoritativeRevision"><dt>权威版本</dt><dd>{{ result.authoritativeRevision }}</dd></template>
          <template v-if="tokenCount"><dt>结果 Token</dt><dd>{{ tokenCount }}</dd></template>
        </dl>
      </div>
    </details>
  </section>
</template>

<style scoped>
.tool-result-detail{display:grid;gap:10px;min-width:0}.tool-result-summary{display:flex;align-items:center;gap:7px;color:var(--text-secondary)}.tool-result-summary svg{flex:none;color:var(--text-muted)}.tool-result-summary strong{font-size:11px;line-height:1.45}.tool-result-groups{display:grid;gap:12px}.tool-result-group{display:grid;gap:7px}.tool-result-group>header{display:flex;align-items:center;gap:6px}.tool-result-group>header strong{font-size:11px}.tool-result-group>header span{color:var(--text-muted);font-size:10px}.tool-result-items{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:5px 9px}.tool-result-items.layout-matches,.tool-result-items.layout-symbols,.tool-result-items.layout-git{grid-template-columns:1fr}.tool-result-item{display:flex;align-items:flex-start;min-width:0;gap:6px;padding:5px 6px;border-radius:6px;background:color-mix(in srgb,var(--bg-secondary,#f1f5f9) 58%,transparent);color:var(--text-secondary)}.tool-result-item>svg{flex:none;margin-top:1px;color:var(--text-muted)}.tool-result-item-copy{display:flex;align-items:baseline;min-width:0;gap:6px;overflow:hidden}.tool-result-item-copy strong{min-width:0;overflow:hidden;font-size:10.5px;font-weight:600;text-overflow:ellipsis;white-space:nowrap}.tool-result-item-copy small{flex:none;color:var(--text-muted);font-size:9.5px}.layout-matches .tool-result-item-copy,.layout-symbols .tool-result-item-copy,.layout-git .tool-result-item-copy{flex-wrap:wrap}.layout-matches .tool-result-item-copy small:last-child{flex-basis:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.tool-result-more{justify-self:start;display:inline-flex;align-items:center;gap:4px;padding:0;border:0;background:transparent;color:var(--accent-blue,#2563eb);font-size:10px;cursor:pointer}.tool-technical-detail{padding-top:8px;border-top:1px dashed color-mix(in srgb,var(--border-color,#cbd5e1) 75%,transparent)}.tool-technical-detail>summary{color:var(--text-muted);font-size:10px;font-weight:700;cursor:pointer}.tool-technical-body{display:grid;gap:8px;margin-top:8px}.tool-technical-body b{display:block;margin-bottom:4px;color:var(--text-muted);font-size:9.5px}.tool-technical-body pre{max-height:180px;margin:0;padding:7px;border-radius:6px;background:var(--bg-secondary);font:9.5px/1.5 ui-monospace,SFMono-Regular,Consolas,monospace;white-space:pre-wrap;overflow:auto}.tool-technical-body dl{display:grid;grid-template-columns:minmax(80px,auto) minmax(0,1fr);gap:4px 10px;margin:0}.tool-technical-body dt{color:var(--text-muted);font-size:9.5px}.tool-technical-body dd{min-width:0;margin:0;color:var(--text-secondary);font:9.5px/1.5 ui-monospace,SFMono-Regular,Consolas,monospace;white-space:pre-wrap;overflow-wrap:anywhere}@media(max-width:720px){.tool-result-items{grid-template-columns:1fr}.tool-technical-body dl{grid-template-columns:1fr}.tool-result-item-copy{flex-wrap:wrap}}
</style>
