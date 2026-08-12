<script setup>
import { Ellipsis, X } from '@lucide/vue'
import { onMounted, onUnmounted, ref } from 'vue'

const props = defineProps({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  activeView: { type: String, default: '' },
  views: { type: Array, default: () => [] },
  primaryAction: { type: Object, default: null },
  secondaryActions: { type: Array, default: () => [] },
  storageKey: { type: String, default: '' },
  compact: { type: Boolean, default: false },
})

const emit = defineEmits(['update:activeView', 'primary-action', 'secondary-action'])
const moreOpen = ref(false)
const root = ref(null)

const chooseView = id => {
  emit('update:activeView', id)
  if (props.storageKey) {
    try { sessionStorage.setItem(`${props.storageKey}:view`, id) } catch {}
  }
}
const runSecondary = action => {
  moreOpen.value = false
  emit('secondary-action', action)
}
const closeOutside = event => {
  if (moreOpen.value && root.value && !root.value.contains(event.target)) moreOpen.value = false
}
onMounted(() => document.addEventListener('pointerdown', closeOutside))
onUnmounted(() => document.removeEventListener('pointerdown', closeOutside))
</script>

<template>
  <section ref="root" :class="['workspace-page-shell', { compact }]">
    <header class="workspace-page-header">
      <div class="workspace-page-copy">
        <slot name="identity">
          <h2>{{ title }}</h2>
          <p v-if="description">{{ description }}</p>
        </slot>
      </div>
      <div class="workspace-page-status"><slot name="status" /></div>
      <div class="workspace-page-actions">
        <slot name="actions" />
        <button
          v-if="primaryAction"
          type="button"
          class="workspace-primary-action"
          :disabled="primaryAction.disabled"
          @click="emit('primary-action', primaryAction)"
        ><component :is="primaryAction.icon" v-if="primaryAction.icon" :size="15" />{{ primaryAction.label }}</button>
        <div v-if="secondaryActions.length" class="workspace-more-wrap">
          <button type="button" class="workspace-more-trigger" aria-label="更多操作" title="更多操作" :aria-expanded="moreOpen" @click="moreOpen = !moreOpen"><Ellipsis :size="18" /></button>
          <div v-if="moreOpen" class="workspace-more-menu">
            <header><strong>更多操作</strong><button type="button" aria-label="关闭" @click="moreOpen = false"><X :size="14" /></button></header>
            <button v-for="action in secondaryActions" :key="action.id" type="button" :class="{ danger: action.danger }" :disabled="action.disabled" @click="runSecondary(action)"><component :is="action.icon" v-if="action.icon" :size="15" /><span>{{ action.label }}</span></button>
          </div>
        </div>
      </div>
    </header>
    <nav v-if="views.length" class="workspace-page-tabs" :aria-label="`${title}视图`">
      <button v-for="view in views" :key="view.id" type="button" :class="{ active: activeView === view.id }" :aria-current="activeView === view.id ? 'page' : undefined" @click="chooseView(view.id)"><component :is="view.icon" v-if="view.icon" :size="14" /><span>{{ view.label }}</span><small v-if="view.count !== undefined">{{ view.count }}</small></button>
    </nav>
    <div class="workspace-page-body"><slot /></div>
  </section>
</template>

<style scoped>
.workspace-page-shell{height:100%;min-height:0;display:flex;flex-direction:column;overflow:hidden;background:var(--bg-primary);color:var(--text-primary)}
.workspace-page-header{min-height:66px;flex:0 0 auto;display:flex;align-items:center;gap:16px;padding:10px 18px;border-bottom:1px solid var(--border-color);background:var(--surface)}
.workspace-page-copy{min-width:0;flex:1}.workspace-page-copy h2{margin:0;color:var(--text-primary);font-size:17px;letter-spacing:-.02em}.workspace-page-copy p{margin:3px 0 0;color:var(--text-muted);font-size:10.5px;line-height:1.45}
.workspace-page-status{min-width:0;display:flex;align-items:center;gap:6px}.workspace-page-actions{position:relative;display:flex;align-items:center;gap:6px}
.workspace-primary-action,.workspace-more-trigger,.workspace-more-menu button{height:34px;display:inline-flex;align-items:center;justify-content:center;gap:6px;border:1px solid var(--border-color);border-radius:7px;background:var(--surface);color:var(--text-secondary);font:inherit;font-size:11px;font-weight:700;cursor:pointer}.workspace-primary-action{padding:0 12px;border-color:var(--accent-blue);background:var(--accent-blue);color:white}.workspace-more-trigger{width:34px;padding:0}.workspace-primary-action:disabled,.workspace-more-menu button:disabled{opacity:.45;cursor:not-allowed}
.workspace-more-wrap{position:relative}.workspace-more-menu{position:absolute;top:40px;right:0;z-index:80;width:200px;padding:6px;border:1px solid var(--border-color);border-radius:9px;background:var(--surface);box-shadow:var(--shadow-lg)}.workspace-more-menu header{height:30px;display:flex;align-items:center;justify-content:space-between;padding:0 5px 4px 8px;color:var(--text-muted);font-size:10px}.workspace-more-menu header button{width:26px;height:26px;padding:0;border:0}.workspace-more-menu>button{width:100%;justify-content:flex-start;padding:0 9px;border-color:transparent;background:transparent;font-weight:550}.workspace-more-menu>button:hover{background:var(--control-hover);color:var(--text-primary)}.workspace-more-menu>button.danger{color:var(--accent-red)}
.workspace-page-tabs{min-height:43px;flex:0 0 auto;display:flex;align-items:flex-end;gap:2px;overflow-x:auto;padding:0 16px;border-bottom:1px solid var(--border-color);background:var(--surface);scrollbar-width:none}.workspace-page-tabs::-webkit-scrollbar{display:none}.workspace-page-tabs button{position:relative;height:42px;display:inline-flex;align-items:center;gap:6px;padding:0 11px;border:0;background:transparent;color:var(--text-muted);font:inherit;font-size:11px;font-weight:700;white-space:nowrap;cursor:pointer}.workspace-page-tabs button:hover{color:var(--text-primary)}.workspace-page-tabs button.active{color:var(--accent-blue)}.workspace-page-tabs button.active::after{content:'';position:absolute;right:9px;bottom:0;left:9px;height:2px;border-radius:2px 2px 0 0;background:var(--accent-blue)}.workspace-page-tabs small{min-width:17px;padding:1px 5px;border-radius:999px;background:var(--control-bg);color:inherit;font-size:8.5px;text-align:center}
.workspace-page-body{min-height:0;flex:1;overflow:auto}.compact .workspace-page-header{min-height:58px}.compact .workspace-page-copy h2{font-size:15px}
@media(max-width:720px){.workspace-page-header{min-height:auto;align-items:flex-start;flex-wrap:wrap;padding:10px 12px}.workspace-page-copy{flex-basis:calc(100% - 46px)}.workspace-page-status{order:3;width:100%;overflow-x:auto}.workspace-page-actions{margin-left:auto}.workspace-page-tabs{padding:0 7px}.workspace-page-tabs button{padding:0 9px}.workspace-page-body{overflow-x:hidden}}
@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;transition:none!important}}
</style>
