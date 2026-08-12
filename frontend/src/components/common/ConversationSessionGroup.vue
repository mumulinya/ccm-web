<script setup>
import { ChevronRight, Plus } from '@lucide/vue'

defineProps({
  label: { type: String, required: true },
  count: { type: Number, default: 0 },
  expanded: { type: Boolean, default: false },
  emptyLabel: { type: String, default: '暂无会话' },
  createLabel: { type: String, default: '' },
  tone: { type: String, default: 'default' },
})

const emit = defineEmits(['toggle', 'create'])
</script>

<template>
  <section :class="['conversation-session-group', `tone-${tone}`]">
    <div class="conversation-session-heading">
      <button
        class="conversation-session-toggle"
        type="button"
        :aria-expanded="expanded"
        @click="emit('toggle')"
      >
        <span>
          <ChevronRight class="conversation-session-chevron" :class="{ expanded }" :size="14" />
          <slot name="icon" />
          <span>{{ label }}</span>
        </span>
        <strong>{{ count }}</strong>
      </button>
      <button
        v-if="createLabel"
        class="conversation-session-create"
        type="button"
        :title="createLabel"
        :aria-label="createLabel"
        @click="emit('create')"
      ><Plus :size="14" /></button>
    </div>
    <div v-show="expanded" class="conversation-session-content">
      <slot v-if="count > 0" />
      <p v-else class="conversation-session-empty">{{ emptyLabel }}</p>
    </div>
  </section>
</template>

<style scoped>
.conversation-session-group { display:flex; flex-direction:column; margin-top:3px; }
.conversation-session-heading { display:flex; align-items:center; gap:2px; border-radius:7px; }
.conversation-session-toggle { min-width:0; height:32px; flex:1; display:flex; align-items:center; justify-content:space-between; padding:0 7px; border:0; border-radius:6px; background:transparent; color:var(--text-muted); font:inherit; font-size:10px; font-weight:700; text-align:left; cursor:pointer; transition:background .15s ease,color .15s ease; }
.conversation-session-toggle:hover { background:var(--control-hover); color:var(--text-primary); }
.conversation-session-toggle > span { min-width:0; display:inline-flex; align-items:center; gap:5px; }
.conversation-session-toggle > span > span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.conversation-session-toggle strong { flex:0 0 auto; font-size:9px; }
.conversation-session-chevron { flex:0 0 auto; transition:transform .16s ease; }
.conversation-session-chevron.expanded { transform:rotate(90deg); }
.conversation-session-create { width:26px; height:26px; flex:0 0 26px; display:grid; place-items:center; padding:0; border:0; border-radius:6px; background:transparent; color:var(--text-muted); cursor:pointer; opacity:0; transition:opacity .15s ease,background .15s ease,color .15s ease; }
.conversation-session-heading:hover .conversation-session-create,.conversation-session-create:focus-visible { opacity:1; }
.conversation-session-create:hover { background:var(--control-hover); color:var(--accent-blue); }
.tone-feishu .conversation-session-create:hover { color:#00a870; }
.conversation-session-content { min-width:0; display:flex; flex-direction:column; }
.conversation-session-empty { margin:2px 8px 5px 27px; color:var(--text-muted); font-size:9.5px; line-height:24px; }
@media (hover:none) { .conversation-session-create { opacity:1; } }
</style>
