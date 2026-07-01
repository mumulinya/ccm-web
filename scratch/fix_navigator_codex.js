const fs = require('fs');

const files = [
  'C:/Users/admin/.cc-connect/ccm/frontend/src/components/ProjectManager.vue',
  'C:/Users/admin/.cc-connect/ccm/frontend/src/components/GroupChat.vue',
  'C:/Users/admin/.cc-connect/ccm/frontend/src/components/GlobalAgent.vue'
];

for (const path of files) {
  if (!fs.existsSync(path)) continue;
  let content = fs.readFileSync(path, 'utf-8');

  // 1. Update navMessages computed property
  const oldNav = /const navMessages = computed\(\(\) => \{\s*return messages\.value\s*\.map\(\(m, idx\) => \(\{ \.\.\.m, originalIndex: idx \}\)\)\s*\.filter\(m => m\.role === 'user' \|\| m\.role === 'assistant'\)\s*\}\)/;

  const newNav = `const navMessages = computed(() => {
  const turns = [];
  let currentTurn = null;
  messages.value.forEach((m, idx) => {
    if (m.role === 'user') {
      if (currentTurn) turns.push(currentTurn);
      currentTurn = {
        originalIndex: idx,
        userContent: m.content || '',
        assistantContent: '',
        role: 'user',
        files: m.files || []
      };
    } else if (m.role === 'assistant' && currentTurn) {
      if (!currentTurn.assistantContent) {
        currentTurn.assistantContent = m.content || (m.agenticRun ? (m.agenticRun.final_reply || m.agenticRun.status) : '');
      }
    }
  });
  if (currentTurn) turns.push(currentTurn);
  return turns.length > 40 ? turns.slice(-40) : turns;
})`;
  content = content.replace(oldNav, newNav);

  // 2. Update HTML tooltip
  const oldHTML = /<div\s*v-for="msg in navMessages"[\s\S]*?:title="\(msg\.role === 'user' \? '👤 ' : '🤖 '\) \+ \(msg\.content \|\| ''\)\.slice\(0, 40\) \+ \(\(msg\.content \|\| ''\)\.length > 40 \? '\.\.\.' : ''\)"\s*>\s*<span class="dot-bar"><\/span>\s*<\/div>/;

  const newHTML = `<div 
              v-for="msg in navMessages" 
              :key="msg.originalIndex" 
              class="navigator-dot"
              :class="msg.role"
              @click="scrollToMessage(msg.originalIndex)"
            >
              <span class="dot-bar"></span>
              <div class="nav-tooltip-card">
                <div class="nav-tt-user">{{ (msg.userContent || '附件内容').slice(0, 80) + ((msg.userContent || '').length > 80 ? '...' : '') }}</div>
                <div class="nav-tt-assistant" v-if="msg.assistantContent">{{ msg.assistantContent.slice(0, 80) + (msg.assistantContent.length > 80 ? '...' : '') }}</div>
                <div class="nav-tt-tags" v-if="msg.files && msg.files.length">
                  <span class="nav-tt-tag" v-for="f in msg.files" :key="f.name">📄 {{ f.name }}</span>
                </div>
              </div>
            </div>`;
  content = content.replace(oldHTML, newHTML);

  // 3. Replace tooltip CSS
  const oldCSS = /\/\* Tooltip 悬停显示消息摘要 \*\/[\s\S]*?\.navigator-dot:hover::after \{\s*opacity: 1;\s*transform: translateY\(-50%\) scale\(1\);\s*\}/;

  const newCSS = `/* Tooltip 悬停显示消息摘要 */
.nav-tooltip-card {
  position: absolute;
  right: 28px;
  top: 50%;
  transform: translateY(-50%) scale(0.9);
  background: var(--surface, #ffffff);
  border: 1px solid var(--border-color, rgba(0, 0, 0, 0.08));
  color: var(--text-primary, #333333);
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;
  max-width: 320px;
  width: max-content;
  opacity: 0;
  pointer-events: none;
  transition: all 0.18s cubic-bezier(0.25, 0.8, 0.25, 1);
  transform-origin: right center;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  z-index: 200;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
:global([data-theme="dark"]) .nav-tooltip-card {
  background: rgba(30, 41, 59, 0.95);
  border-color: rgba(255, 255, 255, 0.1);
  color: #f1f5f9;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}
.navigator-dot:hover .nav-tooltip-card {
  opacity: 1;
  transform: translateY(-50%) scale(1);
}
.nav-tt-user {
  font-weight: 600;
  white-space: pre-wrap;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.nav-tt-assistant {
  font-size: 12px;
  color: var(--text-muted, #777);
  white-space: pre-wrap;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
:global([data-theme="dark"]) .nav-tt-assistant {
  color: #94a3b8;
}
.nav-tt-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 2px;
}
.nav-tt-tag {
  background: rgba(0, 0, 0, 0.05);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  color: var(--text-secondary, #555);
}
:global([data-theme="dark"]) .nav-tt-tag {
  background: rgba(255, 255, 255, 0.1);
  color: #cbd5e1;
}`;
  content = content.replace(oldCSS, newCSS);

  fs.writeFileSync(path, content, 'utf-8');
  console.log(`Updated ${path}`);
}
