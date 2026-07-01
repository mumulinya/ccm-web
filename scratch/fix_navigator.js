const fs = require('fs');

// Fix all 3 components with the same pattern
const files = [
  {
    path: 'C:/Users/admin/.cc-connect/ccm/frontend/src/components/ProjectManager.vue',
    msgIdPrefix: 'msg-',
  },
  {
    path: 'C:/Users/admin/.cc-connect/ccm/frontend/src/components/GroupChat.vue',
    msgIdPrefix: 'gc-msg-',
  },
  {
    path: 'C:/Users/admin/.cc-connect/ccm/frontend/src/components/GlobalAgent.vue',
    msgIdPrefix: 'msg-',
  },
];

for (const file of files) {
  let content = fs.readFileSync(file.path, 'utf-8');
  const name = file.path.split('/').pop();

  // 1. Replace computed `userMessages` => `navMessages` (all messages, not just user)
  //    Keep userMessages for backward compat but add navMessages
  const userMsgPattern = /const userMessages = computed\(\(\) => \{\s*\n\s*return messages\.value\s*\n\s*\.map\(\(m, idx\) => \(\{ \.\.\.m, originalIndex: idx \}\)\)\s*\n\s*\.filter\(m => m\.role === 'user'\)\s*\n\}\)/;

  if (userMsgPattern.test(content)) {
    content = content.replace(userMsgPattern, (match) => {
      return match + `\nconst navMessages = computed(() => {\n  return messages.value\n    .map((m, idx) => ({ ...m, originalIndex: idx }))\n    .filter(m => m.role === 'user' || m.role === 'assistant')\n})`;
    });
    console.log(`[${name}] ✅ Added navMessages computed`);
  } else {
    console.log(`[${name}] ⚠️ userMessages pattern not found, trying alternative`);
  }

  // 2. Replace template: use navMessages instead of userMessages, show role-based coloring
  const oldTemplate = /<!-- 消息锚点导航条 -->\s*\n\s*<div v-if="userMessages\.length > 1" class="msg-navigator">\s*\n\s*<div\s*\n\s*v-for="msg in userMessages"\s*\n\s*:key="msg\.originalIndex"\s*\n\s*class="navigator-dot"\s*\n\s*@click="scrollToMessage\(msg\.originalIndex\)"\s*\n\s*:title="msg\.content\.slice\(0, 30\) \+ \(msg\.content\.length > 30 \? '\.\.\.' : ''\)"\s*\n\s*>\s*\n\s*<span class="dot-bar"><\/span>\s*\n\s*<\/div>\s*\n\s*<\/div>/;

  const newTemplate = `<!-- 消息锚点导航条 (Codex 风格) -->
        <div v-if="navMessages.length > 1" class="msg-navigator">
          <div class="msg-nav-track">
            <div 
              v-for="msg in navMessages" 
              :key="msg.originalIndex" 
              class="navigator-dot"
              :class="msg.role"
              @click="scrollToMessage(msg.originalIndex)"
              :title="(msg.role === 'user' ? '👤 ' : '🤖 ') + (msg.content || '').slice(0, 40) + ((msg.content || '').length > 40 ? '...' : '')"
            >
              <span class="dot-bar"></span>
            </div>
          </div>
          <div class="msg-nav-scrollbar">
            <div class="msg-nav-thumb"></div>
          </div>
        </div>`;

  if (oldTemplate.test(content)) {
    content = content.replace(oldTemplate, newTemplate);
    console.log(`[${name}] ✅ Replaced template`);
  } else {
    console.log(`[${name}] ⚠️ Template pattern not matched, trying line-based approach`);
    // Line-based fallback
    content = content.replace(
      /<!-- 消息锚点导航条 -->/,
      '<!-- 消息锚点导航条 (Codex 风格) -->'
    );
    content = content.replace(
      /v-if="userMessages\.length > 1" class="msg-navigator"/,
      'v-if="navMessages.length > 1" class="msg-navigator"'
    );
    content = content.replace(
      /v-for="msg in userMessages"/g,
      'v-for="msg in navMessages"'
    );
    // Add :class="msg.role" to navigator-dot
    content = content.replace(
      /class="navigator-dot"\s*\n(\s*)@click="scrollToMessage/g,
      'class="navigator-dot"\n$1:class="msg.role"\n$1@click="scrollToMessage'
    );
    // Update title to show role
    content = content.replace(
      /:title="msg\.content\.slice\(0, 30\) \+ \(msg\.content\.length > 30 \? '\.\.\.' : ''\)"/g,
      `:title="(msg.role === 'user' ? '👤 ' : '🤖 ') + (msg.content || '').slice(0, 40) + ((msg.content || '').length > 40 ? '...' : '')"`
    );
    console.log(`[${name}] ✅ Applied line-based replacements`);
  }

  // 3. Replace CSS: upgrade navigator styles for Codex-style scrollable track
  const oldCssBlock = /\/\* 消息节点锚点导航条 \*\/\s*\n\.msg-navigator \{[^}]+\}\s*\n\s*:global\(\[data-theme="dark"\]\) \.msg-navigator \{[^}]+\}\s*\n\s*\.navigator-dot \{[^}]+\}\s*\n\s*\.dot-bar \{[^}]+\}\s*\n\s*\.navigator-dot:hover \.dot-bar \{[^}]+\}\s*\n\s*\/\* Tooltip 悬停显示用户消息 \*\/\s*\n\.navigator-dot::after \{[^}]+\}\s*\n\s*\.navigator-dot:hover::after \{[^}]+\}/;

  const newCss = `/* 消息节点锚点导航条 (Codex 风格) */
.msg-navigator {
  position: absolute;
  right: 6px;
  top: 8px;
  bottom: 8px;
  width: 28px;
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 14px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  z-index: 100;
  overflow: hidden;
  padding: 6px 0;
}

:global([data-theme="dark"]) .msg-navigator {
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.25);
}

.msg-nav-track {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 2px 0;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.msg-nav-track::-webkit-scrollbar { display: none; }

.navigator-dot {
  width: 20px;
  min-height: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
  position: relative;
  flex-shrink: 0;
  padding: 2px 0;
}

.dot-bar {
  width: 10px;
  height: 3px;
  border-radius: 1.5px;
  opacity: 0.45;
  transition: all 0.2s ease;
}

/* 用户消息 - 蓝色 */
.navigator-dot.user .dot-bar {
  background: var(--accent-blue, #3b82f6);
  opacity: 0.7;
}
/* Agent 回复 - 灰色 */
.navigator-dot.assistant .dot-bar {
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
.navigator-dot.user:hover .dot-bar {
  background: var(--accent-blue, #3b82f6);
  box-shadow: 0 0 6px rgba(59, 130, 246, 0.4);
}
.navigator-dot.assistant:hover .dot-bar {
  background: var(--accent-purple, #a78bfa);
  box-shadow: 0 0 6px rgba(167, 139, 250, 0.3);
}

/* Tooltip 悬停显示消息摘要 */
.navigator-dot::after {
  content: attr(title);
  position: absolute;
  right: 28px;
  top: 50%;
  transform: translateY(-50%) scale(0.9);
  background: rgba(15, 23, 42, 0.92);
  color: #ffffff;
  padding: 5px 10px;
  border-radius: 6px;
  font-size: 11px;
  white-space: nowrap;
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  opacity: 0;
  pointer-events: none;
  transition: all 0.18s cubic-bezier(0.25, 0.8, 0.25, 1);
  transform-origin: right center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  z-index: 200;
}

.navigator-dot:hover::after {
  opacity: 1;
  transform: translateY(-50%) scale(1);
}`;

  if (oldCssBlock.test(content)) {
    content = content.replace(oldCssBlock, newCss);
    console.log(`[${name}] ✅ Replaced CSS block`);
  } else {
    console.log(`[${name}] ⚠️ CSS block pattern not matched, trying targeted replacement`);
    // Replace piece by piece
    content = content.replace(
      '/* 消息节点锚点导航条 */',
      '/* 消息节点锚点导航条 (Codex 风格) */'
    );
    // Replace .msg-navigator block
    content = content.replace(
      /\.msg-navigator \{\s*\n\s*position: absolute;\s*\n\s*right: 12px;\s*\n\s*top: 50%;\s*\n\s*transform: translateY\(-50%\);\s*\n\s*display: flex;\s*\n\s*flex-direction: column;\s*\n\s*gap: 8px;\s*\n\s*padding: 8px 4px;\s*\n\s*background: rgba\(255, 255, 255, 0\.45\);\s*\n\s*backdrop-filter: blur\(10px\);\s*\n\s*border: 1px solid rgba\(0, 0, 0, 0\.05\);\s*\n\s*border-radius: 20px;\s*\n\s*box-shadow: 0 4px 16px rgba\(0, 0, 0, 0\.03\);\s*\n\s*z-index: 100;\s*\n\s*max-height: 70%;\s*\n\s*overflow-y: auto;\s*\n\}/,
      `.msg-navigator {
  position: absolute;
  right: 6px;
  top: 8px;
  bottom: 8px;
  width: 28px;
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 14px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  z-index: 100;
  overflow: hidden;
  padding: 6px 0;
}`
    );

    // Replace dark mode
    content = content.replace(
      /:global\(\[data-theme="dark"\]\) \.msg-navigator \{\s*\n\s*background: rgba\(15, 23, 42, 0\.55\);\s*\n\s*border: 1px solid rgba\(255, 255, 255, 0\.05\);\s*\n\s*box-shadow: 0 4px 16px rgba\(0, 0, 0, 0\.2\);\s*\n\}/,
      `:global([data-theme="dark"]) .msg-navigator {
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.25);
}`
    );

    // Replace .navigator-dot
    content = content.replace(
      /\.navigator-dot \{\s*\n\s*width: 16px;\s*\n\s*height: 16px;\s*\n\s*display: flex;\s*\n\s*align-items: center;\s*\n\s*justify-content: center;\s*\n\s*cursor: pointer;\s*\n\s*transition: all 0\.2s;\s*\n\s*position: relative;\s*\n\}/,
      `.msg-nav-track {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 2px 0;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.msg-nav-track::-webkit-scrollbar { display: none; }

.navigator-dot {
  width: 20px;
  min-height: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
  position: relative;
  flex-shrink: 0;
  padding: 2px 0;
}`
    );

    // Replace .dot-bar
    content = content.replace(
      /\.dot-bar \{\s*\n\s*width: 8px;\s*\n\s*height: 2px;\s*\n\s*background: var\(--text-muted\);\s*\n\s*border-radius: 1px;\s*\n\s*opacity: 0\.5;\s*\n\s*transition: all 0\.2s;\s*\n\}/,
      `.dot-bar {
  width: 10px;
  height: 3px;
  border-radius: 1.5px;
  opacity: 0.45;
  transition: all 0.2s ease;
}

/* 用户消息 - 蓝色 */
.navigator-dot.user .dot-bar {
  background: var(--accent-blue, #3b82f6);
  opacity: 0.7;
}
/* Agent 回复 - 灰色 */
.navigator-dot.assistant .dot-bar {
  background: var(--text-muted, #94a3b8);
  opacity: 0.35;
}`
    );

    // Replace hover styles
    content = content.replace(
      /\.navigator-dot:hover \.dot-bar \{\s*\n\s*width: 14px;\s*\n\s*height: 3px;\s*\n\s*background: var\(--accent-blue\);\s*\n\s*opacity: 1;\s*\n\}/,
      `.navigator-dot:hover {
  transform: scale(1.3);
}
.navigator-dot:hover .dot-bar {
  width: 14px;
  height: 4px;
  opacity: 1;
}
.navigator-dot.user:hover .dot-bar {
  background: var(--accent-blue, #3b82f6);
  box-shadow: 0 0 6px rgba(59, 130, 246, 0.4);
}
.navigator-dot.assistant:hover .dot-bar {
  background: var(--accent-purple, #a78bfa);
  box-shadow: 0 0 6px rgba(167, 139, 250, 0.3);
}`
    );

    // Replace tooltip
    content = content.replace(
      '/* Tooltip 悬停显示用户消息 */',
      '/* Tooltip 悬停显示消息摘要 */'
    );
    content = content.replace(
      /\.navigator-dot::after \{\s*\n\s*content: attr\(title\);\s*\n\s*position: absolute;\s*\n\s*right: 24px;/,
      `.navigator-dot::after {
  content: attr(title);
  position: absolute;
  right: 28px;`
    );
    // Add max-width and text-overflow to tooltip
    content = content.replace(
      /white-space: nowrap;\s*\n\s*opacity: 0;\s*\n\s*pointer-events: none;/,
      `white-space: nowrap;
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  opacity: 0;
  pointer-events: none;`
    );

    console.log(`[${name}] ✅ Applied targeted CSS replacements`);
  }

  // Also wrap the dot list in a track div if not already done by template replacement
  if (!content.includes('msg-nav-track')) {
    // Add track wrapper around the v-for dots inside the navigator
    content = content.replace(
      /(<div v-if="navMessages\.length > 1" class="msg-navigator">)\s*\n\s*(<div\s*\n\s*v-for="msg in navMessages")/,
      '$1\n          <div class="msg-nav-track">\n            $2'
    );
    // Close the track div before closing the navigator
    content = content.replace(
      /(<\/div>\s*\n\s*)<\/div>\s*\n(\s*(?:<!-- 等待|<div class="chat-))/,
      (match, before, after) => {
        // Only if we haven't already done it
        return match;
      }
    );
  }

  fs.writeFileSync(file.path, content, 'utf-8');
  console.log(`[${name}] ✅ File saved\n`);
}

console.log('Done! All 3 files updated.');
