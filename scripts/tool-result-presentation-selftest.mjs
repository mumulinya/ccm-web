#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const root = path.resolve(import.meta.dirname, '..')
const require = createRequire(import.meta.url)
const { buildToolDisplayDetail } = require(path.join(root, 'ccm-package', 'dist', 'system', 'tool-display-projection.js'))

const directory = buildToolDisplayDetail({
  toolName: 'mcp__ccm__ccm_workspace_readonly__list_directory',
  arguments: { project_id: 'fixture', path: 'src' },
  result: {
    total: 3,
    items: [
      { name: 'components', type: 'directory', path: 'src/components' },
      { name: 'views', type: 'directory', path: 'src/views' },
      { name: 'main.ts', type: 'file', path: 'src/main.ts' },
    ],
  },
})
assert.equal(directory.result.presentation.layout, 'directory')
assert.deepEqual(directory.result.presentation.groups.map(group => [group.label, group.count]), [['目录', 2], ['文件', 1]])
assert.equal(directory.result.presentation.groups[0].items[0].label, 'components')

const matches = buildToolDisplayDetail({
  toolName: 'mcp__ccm__ccm_workspace_readonly__grep_text',
  arguments: { pattern: 'needle', path: 'src' },
  result: { total: 2, lines: ['src/a.ts:12:needle one', 'src/a.ts:28:needle two'] },
  transientBody: true,
})
assert.equal(matches.result.presentation.layout, 'matches')
assert.equal(matches.result.presentation.groups[0].label, 'src/a.ts')
assert.deepEqual(matches.result.presentation.groups[0].items.map(item => item.line), [12, 28])

const files = buildToolDisplayDetail({
  toolName: 'mcp__ccm__ccm_workspace_readonly__read_files',
  arguments: { paths: ['README.md', 'src/main.ts'] },
  result: {
    item_count: 2,
    files: [
      { path: 'README.md', offset: 1, total_lines: 80, lines: [{ line: 1, text: 'BODY_SENTINEL' }], truncated: true, next_cursor: 2 },
      { path: 'src/main.ts', offset: 1, total_lines: 20, lines: [{ line: 1, text: 'BODY_SENTINEL' }], truncated: false },
    ],
  },
  transientBody: false,
})
assert.equal(files.result.presentation.layout, 'file_content')
assert.equal(files.result.presentation.groups[0].count, 2)
assert.match(files.result.presentation.groups[0].items[0].secondary, /部分读取/)
assert.equal(JSON.stringify(files).includes('BODY_SENTINEL'), false)

const git = buildToolDisplayDetail({
  toolName: 'mcp__ccm__ccm_workspace_readonly__read_git_status',
  result: { lines: ['## main...origin/main', ' M src/a.ts', '?? src/new.ts'] },
})
assert.equal(git.result.presentation.layout, 'git')
assert.equal(git.result.presentation.groups[0].items[0].secondary, '已修改')
assert.equal(git.result.presentation.groups[0].items[1].secondary, '未跟踪')

const detailSource = fs.readFileSync(path.join(root, 'frontend', 'src', 'components', 'common', 'ToolResultDetail.vue'), 'utf8')
assert.match(detailSource, /技术详情/)
assert.match(detailSource, /slice\(0, 20\)/)
assert.match(detailSource, /查看全部/)
const transcriptSource = fs.readFileSync(path.join(root, 'frontend', 'src', 'components', 'common', 'AgentExecutionTranscript.vue'), 'utf8')
assert.match(transcriptSource, /<ToolResultDetail/)
assert.match(transcriptSource, /buildLegacyToolDisplay/)
const replaySource = fs.readFileSync(path.join(root, 'frontend', 'src', 'components', 'replay', 'TaskReplayTimeline.vue'), 'utf8')
assert.match(replaySource, /<ToolResultDetail/)

console.log(JSON.stringify({ success: true, layouts: ['directory', 'matches', 'file_content', 'git'], contentStored: false }, null, 2))
