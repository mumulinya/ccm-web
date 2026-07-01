<script setup>
defineProps({
  open: Boolean,
  commands: { type: Array, default: () => [] },
  activeIndex: { type: Number, default: 0 },
  loading: Boolean,
  query: { type: String, default: '' }
})
defineEmits(['select'])
</script>

<template>
  <div v-if="open" class="slash-menu" role="listbox" aria-label="斜杠命令">
    <div class="slash-head">
      <span><strong>/</strong> CCM 命令中心</span>
      <small>↑↓ 选择 · Enter 执行 · Esc 关闭</small>
    </div>
    <div v-if="loading" class="slash-empty">正在加载命令…</div>
    <div v-else-if="commands.length === 0" class="slash-empty">没有匹配“{{ query }}”的命令</div>
    <div v-else class="slash-list">
      <button
        v-for="(command, index) in commands"
        :key="command.name"
        type="button"
        class="slash-item"
        :class="{ active: index === activeIndex, disabled: command.availability?.enabled === false }"
        role="option"
        :aria-selected="index === activeIndex"
        @mousedown.prevent="$emit('select', command)"
      >
        <span class="slash-icon">{{ command.icon || '/' }}</span>
        <span class="slash-copy">
          <span class="slash-name">/{{ command.name }} <i v-if="command.argumentHint">{{ command.argumentHint }}</i></span>
          <span class="slash-description">{{ command.description }}</span>
        </span>
        <span class="slash-meta">
          <b v-if="command.risk !== 'safe'" :class="`risk-${command.risk}`">{{ command.risk === 'high' ? '需确认' : '受控' }}</b>
          <b v-if="command.availability?.enabled === false" class="unavailable">{{ command.availability.reason }}</b>
          <em>{{ command.category }}</em>
        </span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.slash-menu{position:absolute;left:0;right:0;bottom:calc(100% + 8px);z-index:80;overflow:hidden;border:1px solid rgba(99,102,241,.2);border-radius:13px;background:rgba(255,255,255,.98);box-shadow:0 20px 55px rgba(15,23,42,.2);backdrop-filter:blur(18px);color:var(--text-primary)}
.slash-head{display:flex;align-items:center;justify-content:space-between;padding:10px 13px;border-bottom:1px solid var(--border-color);font-size:11px}.slash-head strong{display:inline-grid;place-items:center;width:20px;height:20px;margin-right:6px;border-radius:6px;background:var(--accent-blue);color:white}.slash-head small{color:var(--text-muted);font-size:9px}
.slash-list{max-height:330px;overflow:auto;padding:5px}.slash-item{width:100%;display:grid;grid-template-columns:31px minmax(0,1fr) auto;align-items:center;gap:8px;padding:9px;border:0;border-radius:9px;background:transparent;color:inherit;text-align:left;cursor:pointer}.slash-item:hover,.slash-item.active{background:rgba(var(--accent-blue-rgb),.09)}
.slash-icon{display:grid;place-items:center;width:29px;height:29px;border-radius:8px;background:rgba(var(--accent-blue-rgb),.09);color:var(--accent-blue);font-size:14px}.slash-copy{display:flex;min-width:0;flex-direction:column;gap:2px}.slash-name{font:600 12px/1.3 var(--font-tech,monospace)}.slash-name i{font-style:normal;font-weight:400;color:var(--text-muted)}.slash-description{overflow:hidden;color:var(--text-muted);font-size:10px;text-overflow:ellipsis;white-space:nowrap}.slash-meta{display:flex;align-items:flex-end;flex-direction:column;gap:3px}.slash-meta em,.slash-meta b{font-size:8px;font-style:normal;font-weight:600}.slash-meta em{color:var(--text-muted)}.slash-meta b{padding:2px 5px;border-radius:8px}.risk-guarded{background:rgba(245,158,11,.1);color:#d97706}.risk-high{background:rgba(239,68,68,.1);color:#dc2626}.slash-empty{padding:24px;text-align:center;color:var(--text-muted);font-size:11px}
.slash-item.disabled{opacity:.52}.slash-meta .unavailable{color:var(--text-muted);background:rgba(100,116,139,.1)}
:global([data-theme="dark"]) .slash-menu{background:rgba(15,23,42,.98);border-color:rgba(129,140,248,.28);box-shadow:0 22px 60px rgba(0,0,0,.45)}
@media(max-width:700px){.slash-head small{display:none}.slash-list{max-height:260px}}
</style>
