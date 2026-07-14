<script setup>
import { computed, nextTick, ref } from 'vue'
import { buildRawRows, buildSplitHunks, buildUnifiedHunks, highlightSearch } from './codeDiff.js'

const props = defineProps({
  file: { type: String, default: '' }, raw: { type: String, default: '' }, hunks: { type: Array, default: () => [] },
  reason: { type: String, default: '' }, truncated: { type: Boolean, default: false }, staged: { type: Boolean, default: false },
  mode: { type: String, default: 'unified' }, search: { type: String, default: '' }, compact: { type: Boolean, default: false }, loading: { type: Boolean, default: false },
})
const emit = defineEmits(['hunk-action'])
const root = ref(null)
const currentHunk = ref(-1)
const unified = computed(() => buildUnifiedHunks(props.hunks, props.file, props.compact))
const split = computed(() => buildSplitHunks(props.raw, props.file, props.compact))
const rawRows = computed(() => buildRawRows(props.raw, props.file, props.compact))
const html = value => highlightSearch(value, props.search)

const navigateHunk = async direction => {
  await nextTick()
  const nodes = [...(root.value?.querySelectorAll('.diff-hunk') || [])]
  if (!nodes.length) return
  currentHunk.value = (currentHunk.value + direction + nodes.length) % nodes.length
  nodes[currentHunk.value].scrollIntoView({ behavior: 'smooth', block: 'start' })
}
defineExpose({ navigateHunk })
</script>

<template>
  <div ref="root" class="diff-viewer" :class="{ compact }">
    <div v-if="loading" class="diff-empty">正在读取代码差异...</div>
    <div v-else-if="!file" class="diff-empty">从左侧选择文件查看具体改动</div>
    <div v-else-if="!raw && !hunks.length" class="diff-empty">{{ reason || '当前区域没有差异' }}</div>
    <template v-else>
      <div v-if="reason || truncated" class="diff-notice">{{ reason || '内容较大，当前展示已截断' }}</div>
      <template v-if="hunks.length && mode === 'unified'">
        <section v-for="(hunk, index) in unified" :key="`${hunk.header}-${index}`" class="diff-hunk">
          <header>
            <code>{{ hunk.header }}</code>
            <span class="hunk-actions">
              <template v-if="!staged">
                <button @click="emit('hunk-action', { hunk, action: 'stage' })">暂存此块</button>
                <button class="danger" @click="emit('hunk-action', { hunk, action: 'discard' })">丢弃此块</button>
              </template>
              <button v-else @click="emit('hunk-action', { hunk, action: 'unstage' })">取消暂存</button>
            </span>
          </header>
          <div v-for="(row, rowIndex) in hunk.rows" :key="rowIndex" class="diff-row" :class="row.type">
            <span class="line-no">{{ row.oldLine }}</span><span class="line-no">{{ row.newLine }}</span>
            <span class="sign">{{ row.type === 'add' ? '+' : row.type === 'remove' ? '-' : ' ' }}</span>
            <code v-html="html(row.html)"></code>
          </div>
        </section>
      </template>
      <template v-else-if="hunks.length && mode === 'split'">
        <section v-for="(hunk, index) in split" :key="`${hunk.header}-${index}`" class="diff-hunk split-hunk">
          <header><code>{{ hunk.header }}</code></header>
          <div class="split-head"><span>原文件</span><span>修改后</span></div>
          <div v-for="(row, rowIndex) in hunk.rows" :key="rowIndex" class="split-row">
            <div :class="row.left?.type || 'empty'"><span class="line-no">{{ row.left?.line || '' }}</span><span class="sign">{{ row.left ? '-' : '' }}</span><code v-html="row.left ? html(row.left.html) : ''"></code></div>
            <div :class="row.right?.type || 'empty'"><span class="line-no">{{ row.right?.line || '' }}</span><span class="sign">{{ row.right ? '+' : '' }}</span><code v-html="row.right ? html(row.right.html) : ''"></code></div>
          </div>
        </section>
      </template>
      <div v-else>
        <div v-for="(row, index) in rawRows" :key="index" class="diff-row" :class="row.type"><span class="line-no"></span><span class="line-no"></span><span class="sign">{{ row.sign }}</span><code v-html="html(row.html)"></code></div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.diff-viewer { flex:1; min-height:0; overflow:auto; background:var(--bg-primary,#fff); font:12px/1.55 'JetBrains Mono',Consolas,monospace; scroll-behavior:smooth; }
.diff-empty { min-height:260px; height:100%; display:flex; align-items:center; justify-content:center; color:var(--text-muted); font-family:inherit; }
.diff-notice { position:sticky; top:0; z-index:3; padding:7px 14px; background:#fffbeb; border-bottom:1px solid #fde68a; color:#92400e; font-family:system-ui,sans-serif; font-size:11px; }
.diff-hunk { scroll-margin-top:8px; }.diff-hunk header { min-height:34px; padding:5px 12px; display:flex; align-items:center; justify-content:space-between; gap:12px; background:color-mix(in srgb,#2563eb 7%,var(--bg-primary,#fff)); border-top:1px solid rgba(37,99,235,.1); color:#1d4ed8; }.diff-hunk header code { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.hunk-actions { display:flex; gap:5px; flex-shrink:0; }.hunk-actions button { padding:3px 7px; border:1px solid rgba(37,99,235,.25); border-radius:4px; background:var(--bg-primary,#fff); color:#1d4ed8; font:10px system-ui,sans-serif; cursor:pointer; }.hunk-actions button.danger { border-color:rgba(220,38,38,.25); color:#b91c1c; }
.diff-row { min-height:21px; display:grid; grid-template-columns:44px 44px 18px minmax(max-content,1fr); }.diff-row code { padding:1px 14px 1px 4px; white-space:pre; }.line-no { padding:1px 7px; text-align:right; color:var(--text-muted); opacity:.68; user-select:none; border-right:1px solid rgba(15,23,42,.06); }.sign { text-align:center; user-select:none; }.add { background:rgba(5,150,105,.09); color:#065f46; }.remove { background:rgba(220,38,38,.08); color:#991b1b; }.context { color:var(--text-secondary); }.meta { background:rgba(37,99,235,.06); color:#1d4ed8; }
.split-head { display:grid; grid-template-columns:1fr 1fr; background:color-mix(in srgb,var(--bg-primary,#fff) 96%,#64748b); color:var(--text-muted); font:10px system-ui,sans-serif; }.split-head span { padding:5px 12px; }.split-head span:first-child { border-right:1px solid var(--border-color,rgba(15,23,42,.09)); }
.split-row { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); }.split-row>div { min-height:21px; display:grid; grid-template-columns:44px 18px minmax(max-content,1fr); overflow:hidden; }.split-row>div:first-child { border-right:1px solid var(--border-color,rgba(15,23,42,.09)); }.split-row code { padding:1px 10px 1px 4px; white-space:pre; }.split-row .empty { background:rgba(100,116,139,.035); }
:deep(.word-add){background:rgba(5,150,105,.25);border-radius:2px}:deep(.word-remove){background:rgba(220,38,38,.22);border-radius:2px;text-decoration:line-through}:deep(.hl-keyword){color:#2563eb;font-weight:650}:deep(.hl-string){color:#0f766e}:deep(.hl-number){color:#c2410c}:deep(.diff-match){background:#fde047;color:inherit;padding:0;border-bottom:1px solid #ca8a04}
[data-theme="dark"] .add { color:#a7f3d0; }[data-theme="dark"] .remove { color:#fecaca; }[data-theme="dark"] .diff-notice { background:#422006;color:#fde68a;border-color:#713f12; }
@media(max-width:768px){.diff-row{grid-template-columns:34px 34px 14px minmax(max-content,1fr)}.diff-row code{padding-right:8px}.line-no{padding-left:3px;padding-right:3px}.split-hunk{display:none}.hunk-actions button{padding:3px 5px}.diff-hunk header{align-items:flex-start;flex-direction:column}.hunk-actions{align-self:flex-end}}
</style>
