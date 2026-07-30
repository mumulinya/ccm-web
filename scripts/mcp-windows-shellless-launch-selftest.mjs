import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { resolveMcpStdioCommand } = require('../ccm-package/dist/tools/mcp-client.js')
const {
  buildBundledFilesystemMcpTool,
  isLegacyOfficialFilesystemMcpDefinition,
  resolveBundledFilesystemMcpEntry,
} = require('../ccm-package/dist/tools/internal-mcp-registry.js')

const inputArgs = ['--yes', '@modelcontextprotocol/server-filesystem', 'C:\\workspace']
const resolved = resolveMcpStdioCommand('npx', inputArgs)
if (process.platform === 'win32') {
  assert.equal(resolved.cmd, process.execPath)
  assert.match(resolved.args[0], /node_modules[\\/]npm[\\/]bin[\\/]npx-cli\.js$/)
  assert.equal(fs.existsSync(resolved.args[0]), true)
  assert.deepEqual(resolved.args.slice(1), inputArgs)
} else {
  assert.equal(resolved.cmd, 'npx')
  assert.deepEqual(resolved.args, inputArgs)
}

const custom = resolveMcpStdioCommand(path.join('C:', 'Tools', 'custom-mcp.exe'), ['--stdio'])
assert.equal(custom.cmd, path.join('C:', 'Tools', 'custom-mcp.exe'))
assert.deepEqual(custom.args, ['--stdio'])

const filesystemEntry = resolveBundledFilesystemMcpEntry()
assert.equal(fs.existsSync(filesystemEntry), true)
assert.match(filesystemEntry, /@modelcontextprotocol[\\/]server-filesystem[\\/]dist[\\/]index\.js$/)
const legacyOfficial = {
  name: 'filesystem-mcp',
  command: 'npx',
  args: ['-y', '@modelcontextprotocol/server-filesystem', 'C:\\workspace'],
  marketplace: { source: { id: 'ccm-official', trust: 'official' } },
}
assert.equal(isLegacyOfficialFilesystemMcpDefinition(legacyOfficial), true)
assert.equal(isLegacyOfficialFilesystemMcpDefinition({ ...legacyOfficial, marketplace: undefined }), false)
const bundledFilesystem = buildBundledFilesystemMcpTool(legacyOfficial)
assert.equal(bundledFilesystem.command, process.execPath)
assert.equal(bundledFilesystem.args[0], filesystemEntry)
assert.equal(bundledFilesystem.args[1], 'C:\\workspace')
assert.equal(bundledFilesystem.enabled, true)

console.log(JSON.stringify({
  success: true,
  platform: process.platform,
  shell: false,
  npmCliResolved: process.platform !== 'win32' || resolved.cmd === process.execPath,
  bundledFilesystemDirectLaunch: bundledFilesystem.command === process.execPath,
  customSameNameProtected: isLegacyOfficialFilesystemMcpDefinition({ ...legacyOfficial, marketplace: undefined }) === false,
  paidProviderCalls: 0,
}))
