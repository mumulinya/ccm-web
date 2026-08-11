import { createApp, ref } from 'vue/dist/vue.esm-bundler.js'
import '../src/style.css'
import ConversationTurnControls from '../src/components/common/ConversationTurnControls.vue'
import ChatComposer from '../src/components/common/ChatComposer.vue'

const style = document.createElement('style')
style.textContent = `
body { margin:0; background:#eef2f7; color:#0f172a; font-family:Inter,system-ui,sans-serif; }
.fixture { width:min(760px,calc(100vw - 24px)); margin:24px auto; display:grid; gap:18px; }
.case { overflow:hidden; border:1px solid rgba(148,163,184,.3); border-radius:8px; background:#fff; box-shadow:0 6px 24px rgba(15,23,42,.06); }
.case h2 { margin:0; padding:10px 14px; border-bottom:1px solid rgba(15,23,42,.07); font-size:13px; }
`
document.head.appendChild(style)

createApp({
  components: { ConversationTurnControls, ChatComposer },
  setup() {
    const input = ref('请把异常重试也纳入当前实现')
    const stopCount = ref(0)
    const guideCount = ref(0)
    const retryCount = ref(0)
    const cancelCount = ref(0)
    const turns = ref([
      { id:'q1', revision:1, kind:'user_message', source:'web', mode:'queue', status:'queued', position:1, messagePreview:'完成后生成一份用户可读总结' },
      { id:'q2', revision:1, kind:'task_dispatch', source:'schedule', task_id:'task-scheduled', mode:'queue', status:'queued', position:2, messagePreview:'每天检查一次移动端布局是否溢出' },
      { id:'q3', revision:2, kind:'user_message', source:'web', mode:'queue', status:'failed', position:3, messagePreview:'失败消息可以重新排队' },
    ])
    return { input, turns, stopCount, guideCount, retryCount, cancelCount }
  },
  template: `
    <main class="fixture">
      <section id="busy-case" class="case">
        <h2>Agent 工作中</h2>
        <ConversationTurnControls :busy="true" :turns="turns" @stop="stopCount++" @guide="guideCount++" @retry="retryCount++" @cancel="cancelCount++" />
        <ChatComposer v-model="input" :busy="true" :allow-input-while-busy="true" send-label="发送" />
        <output id="events">{{ guideCount }}|{{ stopCount }}|{{ retryCount }}|{{ cancelCount }}</output>
      </section>
      <section id="idle-case" class="case">
        <h2>空闲且没有队列</h2>
        <ConversationTurnControls :busy="false" :turns="[]" />
        <ChatComposer model-value="普通问话只显示输入框" />
      </section>
    </main>
  `,
}).mount('#app')
