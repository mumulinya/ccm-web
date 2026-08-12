<script setup>
import { ChevronDown } from '@lucide/vue'
defineProps({ sections:{type:Array,default:()=>[]}, activeSection:{type:String,default:''}, label:{type:String,default:'设置章节'} })
const emit=defineEmits(['update:activeSection'])
</script>
<template>
  <nav class="workspace-section-nav" :aria-label="label">
    <label><span>{{ label }}</span><select :value="activeSection" @change="emit('update:activeSection',$event.target.value)"><option v-for="item in sections" :key="item.id" :value="item.id">{{ item.label }}</option></select><ChevronDown :size="14" /></label>
    <button v-for="item in sections" :key="item.id" type="button" :class="{active:activeSection===item.id}" :aria-current="activeSection===item.id?'page':undefined" @click="emit('update:activeSection',item.id)"><component :is="item.icon" v-if="item.icon" :size="15" /><span><strong>{{ item.label }}</strong><small v-if="item.description">{{ item.description }}</small></span></button>
  </nav>
</template>
<style scoped>
.workspace-section-nav{width:220px;flex:0 0 220px;display:flex;flex-direction:column;gap:3px;padding:8px;border-right:1px solid var(--border-color);background:var(--surface-nav)}.workspace-section-nav>button{min-height:44px;display:flex;align-items:center;gap:9px;padding:6px 9px;border:0;border-radius:7px;background:transparent;color:var(--text-secondary);font:inherit;text-align:left;cursor:pointer}.workspace-section-nav>button:hover{background:var(--control-hover)}.workspace-section-nav>button.active{background:var(--accent-soft);color:var(--accent-blue)}.workspace-section-nav>button>span{min-width:0;display:grid;gap:2px}.workspace-section-nav strong{font-size:11px}.workspace-section-nav small{overflow:hidden;color:var(--text-muted);font-size:8.5px;text-overflow:ellipsis;white-space:nowrap}.workspace-section-nav label{display:none}
@media(max-width:760px){.workspace-section-nav{width:100%;flex:0 0 auto;padding:8px 12px;border-right:0;border-bottom:1px solid var(--border-color)}.workspace-section-nav>button{display:none}.workspace-section-nav label{position:relative;display:grid;gap:4px}.workspace-section-nav label span{color:var(--text-muted);font-size:9px;font-weight:700}.workspace-section-nav select{width:100%;height:36px;padding:0 34px 0 10px;border:1px solid var(--border-color);border-radius:7px;appearance:none;background:var(--surface);color:var(--text-primary);font-size:11px}.workspace-section-nav label svg{position:absolute;right:10px;bottom:11px;color:var(--text-muted);pointer-events:none}}
</style>
