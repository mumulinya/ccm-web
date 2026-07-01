const fs = require('fs');
const files = [
  'C:/Users/admin/.cc-connect/ccm/frontend/src/components/ProjectManager.vue',
  'C:/Users/admin/.cc-connect/ccm/frontend/src/components/GroupChat.vue',
  'C:/Users/admin/.cc-connect/ccm/frontend/src/components/GlobalAgent.vue'
];

for (const path of files) {
  let content = fs.readFileSync(path, 'utf-8');

  // Replace dot-bar HTML
  const oldHTML = /<span class="dot-bar"><\/span>/;
  const newHTML = `<div class="dot-cluster">
                  <span class="dot-bar user-bar"></span>
                  <span class="dot-bar assistant-bar" v-if="msg.assistantContent"></span>
                </div>`;
  content = content.replace(oldHTML, newHTML);

  // Replace CSS
  const oldCSS = /\.navigator-dot \{[\s\S]*?\.navigator-dot\.assistant:hover \.dot-bar \{[^}]*\}/;
  const newCSS = `.navigator-dot {
  width: 24px;
  min-height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
  position: relative;
  flex-shrink: 0;
  padding: 2px 0;
}

.dot-cluster {
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-items: center;
}

.dot-bar {
  width: 10px;
  height: 3px;
  border-radius: 1.5px;
  transition: all 0.2s ease;
}

.user-bar {
  background: var(--accent-blue, #3b82f6);
  opacity: 0.5;
}
.assistant-bar {
  background: var(--text-muted, #94a3b8);
  opacity: 0.35;
}

.navigator-dot:hover {
  transform: scale(1.3);
}
.navigator-dot:hover .dot-bar {
  width: 14px;
  height: 4px;
  opacity: 1;
}
.navigator-dot:hover .user-bar {
  box-shadow: 0 0 6px rgba(59, 130, 246, 0.4);
}
.navigator-dot:hover .assistant-bar {
  box-shadow: 0 0 6px rgba(148, 163, 184, 0.4);
}`;
  content = content.replace(oldCSS, newCSS);

  fs.writeFileSync(path, content, 'utf-8');
}
console.log('Updated dot visual clustering');
