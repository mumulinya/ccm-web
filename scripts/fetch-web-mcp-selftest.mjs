#!/usr/bin/env node
import assert from "node:assert/strict";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { McpClient } = require("../ccm-package/dist/tools/mcp-client.js");
const { isLegacyFetchWebMcpDefinition, buildBundledFetchWebMcpTool } = require("../ccm-package/dist/tools/internal-mcp-registry.js");

const entry = path.resolve("ccm-package", "dist", "integrations", "fetch-web-mcp.js");
const bundled = buildBundledFetchWebMcpTool({ name: "fetch-web-mcp", enabled: true });
assert.equal(bundled.command, process.execPath);
assert.equal(path.resolve(bundled.args[0]), entry);
assert.equal(isLegacyFetchWebMcpDefinition({ name: "fetch-web-mcp", command: "uvx mcp-server-fetch" }), true);
assert.equal(isLegacyFetchWebMcpDefinition({ name: "fetch-web-mcp", command: "custom-fetch" }), false);

const client = new McpClient(process.execPath, [entry]);
try {
  assert.equal(await client.connect(), true, client.getDiagnostics().lastError);
  const tools = await client.listTools();
  assert.deepEqual(tools.map(tool => tool.name), ["fetch"]);
  const blocked = await client.callTool("fetch", { url: "http://127.0.0.1:3080" });
  assert.equal(blocked.isError, true);
  assert.match(String(blocked.content?.[0]?.text || ""), /不允许读取本机或局域网地址/);
  const fetched = await client.callTool("fetch", { url: "https://example.com", max_length: 3_000 });
  assert.notEqual(fetched.isError, true, String(fetched.content?.[0]?.text || ""));
  const body = JSON.parse(String(fetched.content?.[0]?.text || "{}"));
  assert.match(body.text, /Example Domain/);
  assert.ok(body.returnedChars > 0 && body.returnedChars <= 3_000);
  console.log(JSON.stringify({
    pass: true,
    checks: {
      bundledNodeEntryReady: true,
      legacyOfficialDefinitionDetected: true,
      customDefinitionPreserved: true,
      jsonRpcDiscoveryReady: true,
      privateNetworkBlocked: true,
      publicHtmlConvertedToText: true,
    },
  }, null, 2));
} finally {
  client.disconnect();
}
