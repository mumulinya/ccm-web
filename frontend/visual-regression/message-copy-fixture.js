import { createApp } from 'vue/dist/vue.esm-bundler.js'
import ConversationMessageShell from '../src/components/common/ConversationMessageShell.vue'
import AgentFinalAnswer from '../src/components/common/AgentFinalAnswer.vue'

createApp({
  components: { ConversationMessageShell, AgentFinalAnswer },
  data: () => ({
    userText: '请检查项目状态，并告诉我需要处理的问题。',
    answerText: '系统当前可用。\n\n- 项目配置已读取\n- 暂无运行中的任务',
    streamText: '我正在整理当前可用的项目和任务状态。',
  }),
  template: `<main><section class="conversation">
    <div class="fixture-toolbar"><button type="button" @click="document.documentElement.dataset.theme = document.documentElement.dataset.theme === 'dark' ? '' : 'dark'">切换主题</button></div>
    <ConversationMessageShell class="user-row" role="user" timestamp="2026-08-12T14:00:00+08:00" :copy-text="userText">
      <div class="bubble">{{ userText }}</div>
    </ConversationMessageShell>
    <ConversationMessageShell class="assistant-row" role="assistant" timestamp="2026-08-12T14:00:03+08:00" :copy-text="answerText">
      <AgentFinalAnswer :content="answerText" storage-key="copy-fixture-answer" />
    </ConversationMessageShell>
    <ConversationMessageShell class="streaming-row" role="assistant" streaming :copy-text="streamText">
      <AgentFinalAnswer :content="streamText" streaming storage-key="copy-fixture-stream" />
    </ConversationMessageShell>
  </section></main>`,
}).mount('#app')
