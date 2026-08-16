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
  <div class="action-panel-root">
    <section class="cleanup-panel-heading">
      <div class="cleanup-heading-with-icon" :class="mode">
        <span><component :is="mode === 'safe' ? Archive : ShieldAlert" :size="18" /></span>
        <div>
          <h2>{{ mode === 'safe' ? '安全整理' : '永久删除' }}</h2>
          <p v-if="mode === 'safe'">归档不会破坏回放数据，适合先整理失败或过期的历史运行记录。</p>
          <p v-else>永久删除不可恢复，只处理在预览清单中被勾选并最终二次确认的记录。</p>
        </div>
      </div>
    </section>

    <div class="cleanup-mode-notice" :class="mode">
      <component :is="mode === 'safe' ? Archive : ShieldAlert" :size="15" />
      <span v-if="mode === 'safe'"><strong>推荐流程</strong> 建议先执行归档，后续根据清理审计记录决定是否永久删除。</span>
      <span v-else><strong>高风险操作</strong> 生成清单不会删除数据，只有逐项确认并输入“永久删除”短语后才会执行。</span>
    </div>

    <section class="cleanup-retention">
      <div>
        <strong>保留时间范围</strong>
        <span>{{ retentionDays === 0 ? '不按时间过滤（全量扫描），请谨慎勾选清单。' : `保留最近 ${retentionDays} 天内的数据，整理更早记录。` }}</span>
      </div>
      <!-- Segmented Pill 药丸胶囊选择栏 -->
      <div class="cleanup-retention-segmented" aria-label="数据保留范围">
        <button
          v-for="days in retentionOptions"
          :key="days"
          type="button"
          class="pill-btn"
          :class="{ active: retentionDays === Number(days) }"
          @click="$emit('update:retention-days', Number(days))"
        >
          {{ retentionLabel(Number(days)) }}
        </button>
      </div>
    </section>

    <section class="cleanup-action-list">
      <article v-for="action in actions" :key="action.id" class="cleanup-action-row" :class="mode">
        <span class="cleanup-action-icon">
          <component :is="mode === 'safe' ? Archive : Trash2" :size="16" />
        </span>
        <div class="cleanup-action-copy">
          <h3>{{ action.label }}</h3>
          <p>{{ action.description }}</p>
          <small class="font-mono"><strong>{{ Number(action.target_count || 0).toLocaleString() }}</strong> 项可能符合条件</small>
        </div>
        <button class="cleanup-button" :class="{ danger: mode === 'danger' }" :disabled="loading" @click="$emit('preview', action)">
          <Eye :size="14" />
          <span>查看清单</span>
        </button>
      </article>
      <div v-if="!actions.length" class="cleanup-empty">当前没有可用的整理操作</div>
    </section>
  </div>
</template>

<style scoped>
.font-mono {
  font-family: var(--font-mono, monospace);
  font-variant-numeric: tabular-nums;
}

.cleanup-retention-segmented {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 3px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--control-bg, var(--bg-primary));
}

.pill-btn {
  height: 28px;
  padding: 0 12px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--text-muted);
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.pill-btn:hover {
  color: var(--text-primary);
}

.pill-btn.active {
  background: var(--surface, var(--bg-card));
  color: var(--accent-blue, #2563eb);
  font-weight: 700;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}
</style>
