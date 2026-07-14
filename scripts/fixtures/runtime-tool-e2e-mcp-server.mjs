#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

const marker = String(process.env.CCM_RUNTIME_TOOL_E2E_MCP_MARKER || '')
const auditFile = String(process.env.CCM_RUNTIME_TOOL_E2E_AUDIT_FILE || '')
const runtime = String(process.env.CCM_RUNTIME_TOOL_E2E_RUNTIME || '')

const server = new McpServer({ name: 'ccm-runtime-tool-e2e', version: '1.0.0' })

server.tool(
  'prove_runtime_tool',
  'Return a deterministic CCM runtime-tool acceptance marker.',
  { nonce: z.string().describe('The nonce supplied by the acceptance prompt') },
  async ({ nonce }) => {
    if (auditFile) {
      fs.mkdirSync(path.dirname(auditFile), { recursive: true })
      fs.appendFileSync(auditFile, `${JSON.stringify({ at: new Date().toISOString(), runtime, nonce, marker })}\n`, 'utf8')
    }
    return { content: [{ type: 'text', text: `${marker}:${nonce}` }] }
  },
)

await server.connect(new StdioServerTransport())
