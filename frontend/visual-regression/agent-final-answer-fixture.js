import { createApp } from 'vue/dist/vue.esm-bundler.js'
import AgentFinalAnswer from '../src/components/common/AgentFinalAnswer.vue'

const markdown = `# CCM Workspace

这是一个 **多 Agent 协作平台**，支持普通段落、[安全链接](https://example.com) 和 \`行内代码\`。

## 核心能力

- 分析项目并制定计划
- 交给 @project-agent 修改代码
- 通过独立验收后交付

> 最终回答应当像文档一样自然阅读，不应出现内部纵向滚动框。

\`\`\`ts
const safe = true
console.log('markdown code block')
\`\`\`

<img src=x onerror="window.__agentAnswerXss=true">

[危险链接](javascript:window.__agentAnswerXss=true)`

const longMarkdown = `${markdown}\n\n${Array.from({ length: 42 }, (_, index) => `${index + 1}. 第 ${index + 1} 条长回答内容用于验证页面自然滚动和手动收起。`).join('\n')}`

createApp({
  components: { AgentFinalAnswer },
  data: () => ({ streaming: true, streamText: '# 流式回答\n\n正在输出 **Markdown**', markdown, longMarkdown }),
  methods: {
    finishStream() {
      this.streamText += '\n\n- 完成后的内容仍在同一个回答节点中。'
      this.streaming = false
    },
    toggleTheme() {
      const root = document.documentElement
      root.dataset.theme = root.dataset.theme === 'dark' ? '' : 'dark'
    },
  },
  template: `<main>
    <div class="fixture-toolbar"><button @click="finishStream">完成流式</button><button @click="toggleTheme">切换主题</button></div>
    <article class="fixture-message ordinary"><span class="fixture-avatar">A</span><div class="fixture-answer"><AgentFinalAnswer :content="markdown" storage-key="fixture-ordinary" /></div></article>
    <article class="fixture-message streaming"><span class="fixture-avatar">A</span><div class="fixture-answer"><AgentFinalAnswer :content="streamText" :streaming="streaming" storage-key="fixture-streaming" /></div></article>
    <article class="fixture-message long"><span class="fixture-avatar">A</span><div class="fixture-answer"><AgentFinalAnswer :content="longMarkdown" storage-key="fixture-long" /></div></article>
  </main>`,
}).mount('#app')

