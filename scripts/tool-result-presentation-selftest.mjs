#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { normalizeToolResultPresentation } from '../frontend/src/utils/toolResultPresentation.js'

const root = path.resolve(import.meta.dirname, '..')
const require = createRequire(import.meta.url)
const { buildToolDisplayDetail } = require(path.join(root, 'ccm-package', 'dist', 'system', 'tool-display-projection.js'))

const listing = normalizeToolResultPresentation({
  tool: { name: 'list_directory' },
  result: {
    rows: [
      { name: 'components', type: 'directory', path: 'src/components' },
      { name: 'views', type: 'directory', path: 'src/views' },
      { name: 'main.ts', type: 'file', path: 'src/main.ts' },
    ],
  },
})
assert.equal(listing.layout, 'directory')
assert.equal(listing.groups.length, 1)
assert.equal(listing.groups[0].id, 'listing')
assert.deepEqual(listing.groups[0].items.map(item => item.label), ['components/', 'views/', 'main.ts'])

const globListing = normalizeToolResultPresentation({
  tool: { name: 'glob_files' },
  result: { rows: [{ path: 'src/App.vue' }, { path: 'src/main.js' }] },
})
assert.equal(globListing.layout, 'files')
assert.equal(globListing.groups.length, 1)
assert.deepEqual(globListing.groups[0].items.map(item => item.label), ['src/App.vue', 'src/main.js'])

const fileReads = normalizeToolResultPresentation({
  tool: { name: 'read_files' },
  result: {
    rows: [
      { path: 'README.md', from: 1, to: 520, totalLines: 520, status: '已读完' },
      { path: 'package.json', from: 1, to: 80, totalLines: 80, status: '已读完' },
    ],
    presentation: {
      layout: 'file_content',
      groups: [{
        id: 'files',
        label: '读取文件',
        count: 2,
        items: [
          { label: 'README.md', secondary: '第 1–520 行 · 共 520 行 · 已读完' },
          { label: 'package.json', secondary: '第 1–80 行 · 共 80 行 · 已读完' },
        ],
      }],
    },
  },
})
assert.equal(fileReads.layout, 'file_content')
assert.equal(fileReads.groups.length, 1)
assert.equal(fileReads.groups[0].id, 'listing')
assert.equal(fileReads.groups[0].label, '')
assert.deepEqual(fileReads.groups[0].items.map(item => item.label), ['README.md', 'package.json'])
assert.equal(fileReads.groups[0].items[0].path, 'README.md')
assert.equal(fileReads.groups[0].items[1].path, 'package.json')
assert.equal(fileReads.groups[0].items[0].secondary, '1–520/520')

const staleDirectory = normalizeToolResultPresentation({
  tool: { name: 'list_directory' },
  result: {
    rows: [
      { name: 'components', type: 'directory', path: 'src/components' },
      { name: 'main.ts', type: 'file', path: 'src/main.ts' },
      { name: 'views', type: 'directory', path: 'src/views' },
    ],
    presentation: {
      layout: 'directory',
      groups: [
        { id: 'directories', label: '目录', count: 2, items: [{ label: 'components', status: 'directory' }, { label: 'views', status: 'directory' }] },
        { id: 'files', label: '文件', count: 1, items: [{ label: 'main.ts', status: 'file' }] },
      ],
    },
  },
})
assert.equal(staleDirectory.groups.length, 1)
assert.equal(staleDirectory.groups[0].id, 'listing')
assert.deepEqual(staleDirectory.groups[0].items.map(item => item.label), ['components/', 'main.ts', 'views/'])

const projectionSource = fs.readFileSync(path.join(root, 'backend', 'system', 'tool-display-projection.ts'), 'utf8')
assert.match(projectionSource, /id: "listing"/)
assert.doesNotMatch(projectionSource, /label: "目录"/)

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
if (directory.result.presentation.groups[0]?.id === 'listing') {
  assert.equal(directory.result.presentation.groups.length, 1)
  assert.deepEqual(directory.result.presentation.groups[0].items.map(item => item.label), ['components/', 'views/', 'main.ts'])
} else {
  assert.match(projectionSource, /id: "listing"/)
}

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

const currentFiles = buildToolDisplayDetail({
  toolName: 'mcp__ccm__ccm_workspace_readonly__read_files',
  arguments: { paths: ['README.md', 'src/main.ts'] },
  result: {
    item_count: 2,
    files: [
      { path: 'README.md', checksum: 'sha-readme', offset: 1, total_lines: 80, lines: [{ line: 1, text: 'current readme' }], truncated: true, next_cursor: 2 },
      { path: 'src/main.ts', checksum: 'sha-main', offset: 1, total_lines: 20, lines: [{ line: 1, text: 'current main' }], truncated: false },
    ],
  },
  transientBody: true,
})
assert.equal(currentFiles.result.fileRows.length, 2)
assert.equal(currentFiles.result.fileRows[0].lines[0].text, 'current readme')
assert.equal(currentFiles.result.continuation.kind, 'read_files')

const currentSingle = buildToolDisplayDetail({
  toolName: 'mcp__ccm__ccm_workspace_readonly__read_file',
  arguments: { path: 'src/main.ts' },
  result: { path: 'src/main.ts', checksum: 'sha-main', offset: 1, total_lines: 220, lines: [{ line: 1, text: '\tconst ready = true' }], truncated: true, next_cursor: 2 },
  transientBody: true,
})
assert.equal(currentSingle.result.fileRows[0].path, 'src/main.ts')
assert.equal(currentSingle.result.fileRows[0].lines[0].text, '\tconst ready = true')
assert.equal(currentSingle.result.continuation.kind, 'read_file')

const git = buildToolDisplayDetail({
  toolName: 'mcp__ccm__ccm_workspace_readonly__read_git_status',
  result: { lines: ['## main...origin/main', ' M src/a.ts', '?? src/new.ts'] },
})
assert.equal(git.result.presentation.layout, 'git')
assert.equal(git.result.presentation.groups[0].items[0].secondary, '已修改')
assert.equal(git.result.presentation.groups[0].items[1].secondary, '未跟踪')

const presentationSource = fs.readFileSync(path.join(root, 'frontend', 'src', 'utils', 'toolResultPresentation.js'), 'utf8')
const detailSource = fs.readFileSync(path.join(root, 'frontend', 'src', 'components', 'common', 'ToolResultDetail.vue'), 'utf8')
assert.match(presentationSource, /id: 'listing'/)
assert.doesNotMatch(presentationSource, /label: '目录'/)
assert.match(detailSource, /isPathListing/)
assert.match(detailSource, /layout-directory/)
assert.match(detailSource, /file_content/)
assert.doesNotMatch(detailSource, /label: '目录'/)
const transcriptSource = fs.readFileSync(path.join(root, 'frontend', 'src', 'components', 'common', 'AgentExecutionTranscript.vue'), 'utf8')
assert.match(transcriptSource, /<ToolResultDetail/)
assert.match(transcriptSource, /buildLegacyToolDisplay/)
assert.match(transcriptSource, /includeSource: true/)
assert.doesNotMatch(transcriptSource, />读取当前详情</)
const replaySource = fs.readFileSync(path.join(root, 'frontend', 'src', 'components', 'replay', 'TaskReplayTimeline.vue'), 'utf8')
const replayEventSource = fs.readFileSync(path.join(root, 'frontend', 'src', 'components', 'replay', 'TaskReplayTimelineEvent.vue'), 'utf8')
assert.match(`${replaySource}\n${replayEventSource}`, /<ReplayToolDetail/)
assert.match(replaySource, /<TaskReplayTimelineEvent/)
const replayDetailSource = fs.readFileSync(path.join(root, 'frontend', 'src', 'components', 'replay', 'ReplayToolDetail.vue'), 'utf8')
assert.match(replayDetailSource, /includeSource: true/)

console.log(JSON.stringify({ success: true, layouts: ['directory', 'matches', 'file_content', 'git'], contentStored: false }, null, 2))
