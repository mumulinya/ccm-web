import assert from 'node:assert/strict'
import fs from 'node:fs'

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const manager = read('frontend/src/components/projects/useProjectManager.js')
const styles = read('frontend/src/components/projects/ProjectManager.css')
const sendFlow = manager.slice(
  manager.indexOf('const sendMessage = async'),
  manager.indexOf('const formatFileSize =', manager.indexOf('const sendMessage = async')),
)

assert.doesNotMatch(sendFlow, /role:\s*['"]thinking['"]/)
assert.doesNotMatch(sendFlow, /messages\.value\.push\(thinkingMsg\)/)
assert.doesNotMatch(sendFlow, /thinkingMessages/)
assert.match(sendFlow, /data\.type === ['"]chunk['"]/)
assert.match(sendFlow, /agentMsg\.content \+= data\.text/)
assert.match(styles, /\.msg-meta\s*\{[\s\S]*?width:\s*max-content;/)
assert.match(styles, /\.msg-meta\s*\{[\s\S]*?white-space:\s*nowrap;/)

console.log(JSON.stringify({
  pass: true,
  checks: 7,
  paidProviderCalls: 0,
}, null, 2))
