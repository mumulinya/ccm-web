import assert from "node:assert/strict";
import http from "node:http";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const client = await import(pathToFileURL(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-orchestrator-llm-client.js")));
const transport = await import(pathToFileURL(path.join(root, "ccm-package", "dist", "system", "openai-responses-transport.js")));

const requests = [];
const server = http.createServer((req, res) => {
  let body = "";
  req.on("data", chunk => { body += chunk; });
  req.on("end", () => {
    requests.push({ url: req.url, body: body ? JSON.parse(body) : null });
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({
      id: "resp_selftest",
      model: "gpt-5.6-sol",
      status: "completed",
      output: [{ type: "message", content: [{ type: "output_text", text: "OK" }] }],
      usage: { input_tokens: 3, output_tokens: 1, total_tokens: 4 },
    }));
  });
});

const compatibilityRequests = [];
const compatibilityServer = http.createServer((req, res) => {
  let body = "";
  req.on("data", chunk => { body += chunk; });
  req.on("end", () => {
    const parsed = body ? JSON.parse(body) : null;
    compatibilityRequests.push({ url: req.url, body: parsed });
    if (Object.hasOwn(parsed || {}, "max_output_tokens") || Object.hasOwn(parsed || {}, "temperature")) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: { message: "Upstream request failed", type: "upstream_error" } }));
      return;
    }
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/event-stream");
    res.end([
      `event: response.created\ndata: ${JSON.stringify({ type: "response.created", response: { id: "resp_compat", model: "gpt-5.6-sol", status: "in_progress" } })}\n\n`,
      `event: response.output_text.delta\ndata: ${JSON.stringify({ type: "response.output_text.delta", delta: "OK" })}\n\n`,
      `event: response.completed\ndata: ${JSON.stringify({ type: "response.completed", response: { id: "resp_compat", model: "gpt-5.6-sol", status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: "OK" }] }], usage: { input_tokens: 3, output_tokens: 1, total_tokens: 4 } } })}\n\n`,
      "data: [DONE]\n\n",
    ].join(""));
  });
});

await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
await new Promise(resolve => compatibilityServer.listen(0, "127.0.0.1", resolve));
const port = server.address().port;
const compatibilityPort = compatibilityServer.address().port;
try {
  assert.equal(transport.normalizeOpenAiResponsesUrl(`http://127.0.0.1:${port}`), `http://127.0.0.1:${port}/v1/responses`);
  assert.equal(transport.normalizeOpenAiResponsesUrl(`http://127.0.0.1:${port}/v1`), `http://127.0.0.1:${port}/v1/responses`);
  assert.equal(transport.normalizeOpenAiResponsesUrl(`http://127.0.0.1:${port}/v1/responses`), `http://127.0.0.1:${port}/v1/responses`);
  const content = await client.callOpenAiCompatibleChat({
    enabled: true,
    format: "openai-responses",
    apiUrl: `http://127.0.0.1:${port}`,
    apiKey: "selftest-key",
    model: "gpt-5.6-sol",
    reasoningEffort: "high",
    timeoutMs: 10_000,
    providerContextCacheMode: "off",
  }, { messages: [{ role: "user", content: "Reply with OK only." }], maxTokens: 8, retry: false });
  assert.equal(content, "OK");
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, "/v1/responses");
  assert.equal(requests[0].body.model, "gpt-5.6-sol");
  assert.ok(Array.isArray(requests[0].body.input));
  assert.equal(requests[0].body.reasoning.effort, "high");
  assert.equal(requests[0].body.max_output_tokens, 8);
  const compatibleContent = await client.callOpenAiCompatibleChat({
    enabled: true,
    format: "openai-responses",
    apiUrl: `http://127.0.0.1:${compatibilityPort}`,
    apiKey: "selftest-key",
    model: "gpt-5.6-sol",
    reasoningEffort: "off",
    timeoutMs: 10_000,
    providerContextCacheMode: "off",
  }, { messages: [{ role: "user", content: "Reply with OK only." }], maxTokens: 8, retry: false });
  assert.equal(compatibleContent, "OK");
  assert.equal(compatibilityRequests.length, 3);
  assert.equal(compatibilityRequests[0].body.max_output_tokens, 8);
  assert.equal(Object.hasOwn(compatibilityRequests[1].body, "max_output_tokens"), false);
  assert.equal(compatibilityRequests[1].body.temperature, 0.2);
  assert.equal(Object.hasOwn(compatibilityRequests[2].body, "temperature"), false);

  const secondCompatibleContent = await client.callOpenAiCompatibleChat({
    enabled: true,
    format: "openai-responses",
    apiUrl: `http://127.0.0.1:${compatibilityPort}`,
    apiKey: "selftest-key",
    model: "gpt-5.6-sol",
    reasoningEffort: "off",
    timeoutMs: 10_000,
    providerContextCacheMode: "off",
  }, { messages: [{ role: "user", content: "Reply with OK only." }], maxTokens: 8, retry: false });
  assert.equal(secondCompatibleContent, "OK");
  assert.equal(compatibilityRequests.length, 4);
  assert.equal(Object.hasOwn(compatibilityRequests[3].body, "max_output_tokens"), false);
  assert.equal(Object.hasOwn(compatibilityRequests[3].body, "temperature"), false);
  console.log(JSON.stringify({ pass: true, checks: { url: true, requestShape: true, responseParsing: true, maxOutputFallback: true, implicitSse: true } }));
} finally {
  await new Promise(resolve => server.close(resolve));
  await new Promise(resolve => compatibilityServer.close(resolve));
}
