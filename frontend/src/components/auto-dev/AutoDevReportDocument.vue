<script setup>
import { computed } from 'vue'

const props = defineProps({
  markdown: { type: String, default: '' },
  emptyText: { type: String, default: '暂无报告' },
})

const blocks = computed(() => {
  const lines = String(props.markdown || '').replace(/\r\n/g, '\n').split('\n')
  const result = []
  let paragraph = []
  let list = []

  const flushParagraph = () => {
    if (!paragraph.length) return
    result.push({ type: 'paragraph', text: paragraph.join('\n').trim() })
    paragraph = []
  }
  const flushList = () => {
    if (!list.length) return
    result.push({ type: 'list', items: list })
    list = []
  }

  for (const line of lines) {
    const heading = line.match(/^(#{1,4})\s+(.+)$/)
    const item = line.match(/^\s*[-*]\s+(.+)$/)
    if (heading) {
      flushParagraph()
      flushList()
      result.push({ type: 'heading', level: heading[1].length, text: heading[2].trim() })
    } else if (item) {
      flushParagraph()
      list.push(item[1].trim())
    } else if (!line.trim()) {
      flushParagraph()
      flushList()
    } else {
      flushList()
      paragraph.push(line.trim())
    }
  }

  flushParagraph()
  flushList()
  return result
})
</script>

<template>
  <article class="report-document">
    <p v-if="!blocks.length" class="report-empty">{{ emptyText }}</p>
    <template v-for="(block, index) in blocks" :key="`${block.type}-${index}`">
      <h2 v-if="block.type === 'heading' && block.level === 1">{{ block.text }}</h2>
      <h3 v-else-if="block.type === 'heading' && block.level === 2">{{ block.text }}</h3>
      <h4 v-else-if="block.type === 'heading'">{{ block.text }}</h4>
      <ul v-else-if="block.type === 'list'">
        <li v-for="(item, itemIndex) in block.items" :key="itemIndex">{{ item }}</li>
      </ul>
      <p v-else class="report-paragraph">{{ block.text }}</p>
    </template>
  </article>
</template>

<style scoped>
.report-document {
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.7;
}

.report-document h2,
.report-document h3,
.report-document h4 {
  color: var(--text-primary);
  letter-spacing: 0;
}

.report-document h2 {
  margin: 0 0 18px;
  font-size: 19px;
}

.report-document h3 {
  margin: 24px 0 10px;
  padding-bottom: 7px;
  border-bottom: 1px solid var(--border-color);
  font-size: 15px;
}

.report-document h4 {
  margin: 18px 0 8px;
  font-size: 13px;
}

.report-document ul {
  display: grid;
  gap: 7px;
  margin: 0;
  padding-left: 20px;
}

.report-document li::marker {
  color: var(--accent-blue);
}

.report-paragraph {
  margin: 0 0 12px;
  white-space: pre-line;
  overflow-wrap: anywhere;
}

.report-empty {
  margin: 0;
  padding: 40px 16px;
  color: var(--text-muted);
  text-align: center;
}
</style>
