<script setup>
import { computed, ref, watch } from 'vue'
import { AlertTriangle, Check, CloudUpload, GitCommitHorizontal, X } from '@lucide/vue'

const props = defineProps({ visible: Boolean, preview: { type: Object, default: null }, loading: Boolean, committing: Boolean, busyAction: { type: String, default: '' }, canPush: Boolean, pushTarget: { type: String, default: '' }, message: { type: String, default: '' } })
const emit = defineEmits(['close', 'commit', 'update:message'])
const verification = ref('')
const reviewed = ref(false)
watch(() => props.visible, visible => { if (visible) { verification.value = ''; reviewed.value = false } })
const canCommit = computed(() => props.message.trim() && verification.value && reviewed.value && !props.preview?.blocked && !props.loading && !props.committing)
const canCommitAndPush = computed(() => canCommit.value && props.canPush)
</script>

<template>
  <div v-if="visible" class="modal-overlay" @click.self="emit('close')">
    <section class="commit-panel" role="dialog" aria-modal="true" aria-label="提交前预览">
      <header><div><span>提交代码</span><small>只提交你明确选择的文件</small></div><button title="关闭" @click="emit('close')"><X :size="18" /></button></header>
      <div v-if="loading" class="panel-loading">正在检查暂存区和文件状态...</div>
      <div v-else-if="preview" class="panel-body">
        <div class="commit-scope"><GitCommitHorizontal :size="17" /><div><strong>本次提交 {{ preview.files?.length || 0 }} 个文件</strong><small v-if="preview.outsideStaged?.length">暂存区另有 {{ preview.outsideStaged.length }} 个未选文件，本次不会带入</small><small v-else>没有混入选择范围之外的暂存文件</small></div></div>
        <div v-if="preview.conflicts?.length" class="blocking"><AlertTriangle :size="16" /><span>存在冲突文件，解决冲突后才能提交</span></div>
        <ul class="preview-files"><li v-for="file in preview.files" :key="file.path"><span>{{ file.path }}</span><small>{{ file.statusText }}</small></li></ul>
        <div v-if="preview.warnings?.length" class="warnings"><p v-for="warning in preview.warnings" :key="warning"><AlertTriangle :size="14" />{{ warning }}</p></div>
        <label class="commit-message"><span>提交说明</span><textarea :value="message" rows="3" maxlength="300" placeholder="说明这次改动解决了什么" @input="emit('update:message', $event.target.value)" /></label>
        <fieldset><legend>验证状态</legend><label><input v-model="verification" type="radio" value="passed" /><span><Check :size="14" />已运行相关验证</span></label><label><input v-model="verification" type="radio" value="not_run" /><span><AlertTriangle :size="14" />尚未运行验证</span></label></fieldset>
        <label class="review-check"><input v-model="reviewed" type="checkbox" /><span>我已核对上述文件范围、风险和验证状态</span></label>
        <div :class="['push-destination', { unavailable: !canPush }]">
          <CloudUpload :size="15" />
          <span v-if="canPush">提交并推送将发送到 {{ pushTarget || 'origin 当前分支' }}</span>
          <span v-else>当前项目没有可用的 origin 分支，只能创建本地提交</span>
        </div>
      </div>
      <footer>
        <button class="secondary" @click="emit('close')">取消</button>
        <button class="commit-only" :disabled="!canCommit" @click="emit('commit', { verification, action: 'commit' })"><GitCommitHorizontal :size="15" />{{ committing && busyAction === 'commit' ? '提交中...' : '提交代码' }}</button>
        <button class="primary" :disabled="!canCommitAndPush" @click="emit('commit', { verification, action: 'commit_and_push' })"><CloudUpload :size="15" />{{ committing && busyAction === 'commit_and_push' ? '提交并推送中...' : '提交并推送' }}</button>
      </footer>
    </section>
  </div>
</template>

<style scoped>
.modal-overlay { position:fixed; inset:0; z-index:10020; display:flex; align-items:center; justify-content:center; padding:20px; background:rgba(15,23,42,.48); backdrop-filter:blur(5px); }
.commit-panel { width:min(620px,100%); max-height:min(760px,90vh); display:flex; flex-direction:column; overflow:hidden; border:1px solid var(--border-color,rgba(15,23,42,.12)); border-radius:8px; background:var(--bg-primary,#fff); box-shadow:0 24px 70px rgba(15,23,42,.24); }
header,footer { padding:14px 18px; display:flex; align-items:center; justify-content:space-between; gap:10px; border-bottom:1px solid var(--border-color,rgba(15,23,42,.09)); }header>div span,header>div small { display:block; }header>div span { font-size:15px;font-weight:650;color:var(--text-primary) }header>div small { margin-top:2px;font-size:11px;color:var(--text-muted) }header>button { border:0;background:transparent;color:var(--text-muted);cursor:pointer; }
.panel-body { padding:16px 18px; overflow:auto; }.panel-loading { padding:60px;text-align:center;color:var(--text-muted); }
.commit-scope { display:flex;align-items:flex-start;gap:10px;padding-bottom:12px }.commit-scope strong,.commit-scope small { display:block }.commit-scope strong { color:var(--text-primary);font-size:13px }.commit-scope small { margin-top:3px;color:var(--text-muted);font-size:11px }.blocking { display:flex;gap:8px;padding:9px;border:1px solid #fecaca;border-radius:6px;background:#fef2f2;color:#b91c1c;font-size:12px }
.preview-files { max-height:190px;margin:0 0 12px;padding:0;overflow:auto;border-top:1px solid var(--border-color,rgba(15,23,42,.09));list-style:none }.preview-files li { display:flex;justify-content:space-between;gap:12px;padding:7px 2px;border-bottom:1px solid var(--border-color,rgba(15,23,42,.07));font:11px ui-monospace,monospace;color:var(--text-secondary) }.preview-files span { overflow:hidden;text-overflow:ellipsis;white-space:nowrap }.preview-files small { color:var(--text-muted);flex-shrink:0 }.warnings p { display:flex;align-items:center;gap:6px;margin:5px 0;color:#b45309;font-size:11px }
.commit-message span,fieldset legend { display:block;margin-bottom:6px;color:var(--text-secondary);font-size:11px;font-weight:650 }.commit-message textarea { width:100%;resize:vertical;padding:9px;border:1px solid var(--border-color,rgba(15,23,42,.12));border-radius:6px;background:var(--bg-primary,#fff);color:var(--text-primary);font:12px inherit;outline:0 }.commit-message textarea:focus { border-color:#3b82f6 }
fieldset { margin:13px 0;padding:0;border:0;display:flex;gap:8px }fieldset label { flex:1 }fieldset input { position:absolute;opacity:0 }fieldset span { min-height:36px;display:flex;align-items:center;justify-content:center;gap:6px;border:1px solid var(--border-color,rgba(15,23,42,.12));border-radius:6px;color:var(--text-secondary);font-size:11px;cursor:pointer }fieldset input:checked+span { border-color:#2563eb;background:rgba(37,99,235,.08);color:#1d4ed8 }.review-check { display:flex;align-items:flex-start;gap:8px;color:var(--text-secondary);font-size:11px }
footer { border-top:1px solid var(--border-color,rgba(15,23,42,.09));border-bottom:0;justify-content:flex-end }footer button { min-height:34px;padding:0 13px;border-radius:6px;font-size:12px;cursor:pointer }.secondary { border:1px solid var(--border-color,rgba(15,23,42,.12));background:transparent;color:var(--text-secondary) }.commit-only,.primary { display:flex;align-items:center;gap:6px }.commit-only { border:1px solid #2563eb;background:transparent;color:#1d4ed8 }.primary { border:0;background:#2563eb;color:#fff }.commit-only:disabled,.primary:disabled { opacity:.45;cursor:not-allowed }.push-destination { display:flex;align-items:center;gap:7px;margin-top:13px;padding:9px 10px;border:1px solid #bfdbfe;border-radius:6px;background:#eff6ff;color:#1d4ed8;font-size:11px }.push-destination.unavailable { border-color:var(--border-color);background:var(--bg-secondary);color:var(--text-muted) }
@media(max-width:600px){.modal-overlay{padding:0;align-items:flex-end}.commit-panel{max-height:92vh;border-radius:8px 8px 0 0}fieldset{flex-direction:column}}
.blocking { border-color:color-mix(in srgb,var(--accent-red) 35%,var(--border-color)); background:var(--danger-soft); color:var(--accent-red); }
.push-destination { border-color:color-mix(in srgb,var(--accent-blue) 35%,var(--border-color)); background:var(--info-soft); color:var(--accent-blue); }
</style>
