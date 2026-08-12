<script setup>
import { X } from '@lucide/vue'
import { nextTick, ref, watch } from 'vue'
const props=defineProps({open:{type:Boolean,default:false},title:{type:String,default:'详情'},subtitle:{type:String,default:''},loading:{type:Boolean,default:false},width:{type:String,default:'normal'}})
const emit=defineEmits(['close'])
const closeButton=ref(null)
watch(()=>props.open,value=>{if(value)nextTick(()=>closeButton.value?.focus())})
</script>
<template>
  <Teleport to="body">
    <Transition name="drawer">
      <div v-if="open" class="responsive-drawer-layer" @keydown.esc="emit('close')">
        <button class="responsive-drawer-scrim" type="button" aria-label="关闭详情" @click="emit('close')"></button>
        <aside :class="['responsive-detail-drawer',width]" role="dialog" aria-modal="true" :aria-label="title">
          <header><div><h3>{{ title }}</h3><p v-if="subtitle">{{ subtitle }}</p></div><button ref="closeButton" type="button" aria-label="关闭详情" @click="emit('close')"><X :size="17" /></button></header>
          <div v-if="loading" class="responsive-drawer-loading">正在读取详情…</div><div v-else class="responsive-drawer-body"><slot /></div>
          <footer v-if="$slots.footer"><slot name="footer" /></footer>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>
<style scoped>
.responsive-drawer-layer{position:fixed;inset:0;z-index:300;display:flex;justify-content:flex-end}.responsive-drawer-scrim{position:absolute;inset:0;padding:0;border:0;background:rgba(15,23,42,.3);cursor:default}.responsive-detail-drawer{position:relative;width:min(460px,92vw);height:100%;display:flex;flex-direction:column;border-left:1px solid var(--border-color);background:var(--surface);box-shadow:-18px 0 45px rgba(15,23,42,.16)}.responsive-detail-drawer.wide{width:min(720px,94vw)}.responsive-detail-drawer>header{min-height:64px;display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:13px 16px;border-bottom:1px solid var(--border-color)}.responsive-detail-drawer h3{margin:0;font-size:15px}.responsive-detail-drawer p{margin:3px 0 0;color:var(--text-muted);font-size:10px}.responsive-detail-drawer>header button{width:32px;height:32px;display:grid;place-items:center;padding:0;border:1px solid var(--border-color);border-radius:7px;background:transparent;color:var(--text-muted);cursor:pointer}.responsive-drawer-body{min-height:0;flex:1;overflow:auto;padding:16px}.responsive-drawer-loading{min-height:0;flex:1;display:grid;place-items:center;color:var(--text-muted);font-size:11px}.responsive-detail-drawer>footer{flex:0 0 auto;padding:10px 16px;border-top:1px solid var(--border-color)}.drawer-enter-active,.drawer-leave-active{transition:opacity .18s ease}.drawer-enter-active .responsive-detail-drawer,.drawer-leave-active .responsive-detail-drawer{transition:transform .18s ease}.drawer-enter-from,.drawer-leave-to{opacity:0}.drawer-enter-from .responsive-detail-drawer,.drawer-leave-to .responsive-detail-drawer{transform:translateX(100%)}
@media(max-width:640px){.responsive-drawer-layer{align-items:flex-end}.responsive-detail-drawer,.responsive-detail-drawer.wide{width:100%;height:min(92vh,860px);border-left:0;border-top:1px solid var(--border-color);border-radius:12px 12px 0 0}.drawer-enter-from .responsive-detail-drawer,.drawer-leave-to .responsive-detail-drawer{transform:translateY(100%)}}
@media(prefers-reduced-motion:reduce){.drawer-enter-active,.drawer-leave-active,.drawer-enter-active .responsive-detail-drawer,.drawer-leave-active .responsive-detail-drawer{transition:none}}
</style>
