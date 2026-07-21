<script setup>
import { Archive, Eye, ShieldAlert, Trash2 } from '@lucide/vue'

defineProps({
  mode: { type: String, required: true },
  actions: { type: Array, default: () => [] },
  retentionDays: { type: Number, default: 30 },
  retentionOptions: { type: Array, default: () => [7, 30, 90, 0] },
  loading: { type: Boolean, default: false },
})

defineEmits(['preview', 'update:retention-days'])

const retentionLabel = (days) => days === 0 ? '全部归档' : `${days} 天前`
</script>

<template>
  <section class="cleanup-panel-heading">
    <div class="cleanup-heading-with-icon" :class="mode">
      <span><component :is="mode === 'safe' ? Archive : ShieldAlert" :size="19" /></span>
      <div>
        <h2>{{ mode === 'safe' ? '安全整理' : '永久删除' }}</h2>
        <p v-if="mode === 'safe'">归档不会破坏回放数据，适合先整理失败或过期记录。</p>
        <p v-else>永久删除不可恢复，只处理预览中由你勾选并最终确认的记录。</p>
      </div>
    </div>
  </section>

  <div class="cleanup-mode-notice" :class="mode">
    <component :is="mode === 'safe' ? Archive : ShieldAlert" :size="16" />
    <span v-if="mode === 'safe'"><strong>默认建议</strong>先归档，再根据清理记录决定是否永久删除。</span>
    <span v-else><strong>高风险区域</strong>生成清单不会删除数据，只有逐项选择并输入确认短语后才会执行。</span>
  </div>

  <section class="cleanup-retention">
    <div>
      <strong>保留范围</strong>
      <span>{{ retentionDays === 0 ? '不按时间过滤，请谨慎检查预览清单。' : `保留最近 ${retentionDays} 天的数据。` }}</span>
    </div>
    <div class="cleanup-retention-options" aria-label="数据保留范围">
      <button
        v-for="days in retentionOptions"
        :key="days"
        :class="{ active: retentionDays === Number(days) }"
        @click="$emit('update:retention-days', Number(days))"
      >{{ retentionLabel(Number(days)) }}</button>
    </div>
  </section>

  <section class="cleanup-action-list">
    <article v-for="action in actions" :key="action.id" class="cleanup-action-row" :class="mode">
      <span class="cleanup-action-icon"><component :is="mode === 'safe' ? Archive : Trash2" :size="18" /></span>
      <div class="cleanup-action-copy">
        <h3>{{ action.label }}</h3>
        <p>{{ action.description }}</p>
        <small><strong>{{ Number(action.target_count || 0).toLocaleString() }}</strong> 项可能符合条件</small>
      </div>
      <button class="cleanup-button" :class="{ danger: mode === 'danger' }" :disabled="loading" @click="$emit('preview', action)">
        <Eye :size="15" /> 查看清单
      </button>
    </article>
    <div v-if="!actions.length" class="cleanup-empty">当前没有可用的整理操作</div>
  </section>
</template>
