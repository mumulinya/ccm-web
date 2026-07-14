#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), 'utf8')
const navigator = read('../frontend/src/components/common/MessageNavigator.vue')
const project = read('../frontend/src/components/projects/ProjectManager.vue')
const group = read('../frontend/src/components/collaboration/GroupChat.vue')
const globalAgent = read('../frontend/src/components/global/GlobalAgent.vue')

const checks = {
  sharedComponentTracksVisibleMessage: /activeOriginalIndex/.test(navigator) && /addEventListener\('scroll'/.test(navigator),
  railUsesActualMessageViewport: /navigatorGeometry/.test(navigator) && /ResizeObserver/.test(navigator) && /containerRect\.height/.test(navigator),
  codexStyleUsesLeftLineRail: /left:\s*10px/.test(navigator) && /msg-nav-marker\.active[\s\S]*?width:\s*30px/.test(navigator),
  oldPillContainerRemoved: !/border-radius:\s*14px/.test(navigator) && !/backdrop-filter:\s*blur\(12px\)/.test(navigator),
  previewTeleportsOutsideChatOverflow: /<Teleport to="body">/.test(navigator) && /message-nav-preview/.test(navigator),
  projectSessionsUseSharedNavigator: /<MessageNavigator[\s\S]*?:scroll-container="messagesEl"[\s\S]*?target-id-prefix="msg-"/.test(project),
  groupSessionsUseSharedNavigator: /<MessageNavigator[\s\S]*?:scroll-container="groupMessagesEl"[\s\S]*?target-id-prefix="gc-msg-"/.test(group),
  globalSessionsUseSharedNavigator: /<MessageNavigator[\s\S]*?:scroll-container="chatBody"[\s\S]*?target-id-prefix="msg-"/.test(globalAgent),
}

for (const [name, passed] of Object.entries(checks)) assert.equal(passed, true, `${name} failed`)
console.log(JSON.stringify({ pass: true, checks }, null, 2))
