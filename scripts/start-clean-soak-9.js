#!/usr/bin/env node
const base = String(process.env.CCM_BASE_URL || "http://127.0.0.1:3080").replace(/\/$/, "");

async function request(path, options = {}) {
  const response = await fetch(`${base}${path}`, { headers: { "content-type": "application/json", ...(options.headers || {}) }, ...options });
  const payload = await response.json();
  if (!response.ok || payload.success === false) throw new Error(payload.error || `${path} HTTP ${response.status}`);
  return payload;
}

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  // Remove stale locks and recover abandoned leases before starting bots; an
  // old lock must never make an expected connection look successfully started.
  const debt = await request("/api/reliability/debt/reconcile", { method: "POST", body: JSON.stringify({ reason: "stability:9:start 启动前自动清理" }) });
  const projects = await request("/api/projects");
  const expected = (projects.projects || []).filter(project => {
    const platform = String(project.platform || "").trim().toLowerCase();
    return platform === "feishu" || platform === "飞书";
  });
  const started = [];
  let result = await request("/api/reliability/soak/start", { method: "POST", body: JSON.stringify({ duration_ms: 24 * 60 * 60 * 1000, interval_ms: 60 * 1000, clean_mode: true, reconcile_debt: true, startup_grace_seconds: 30 }) });
  if (result.blocked) {
    const missingConnections = result.preflight?.missing_feishu_connections || [];
    if (missingConnections.some(item => item.kind === "global" || item.id === "global-control")) {
      const control = await request("/api/feishu/control-bot/start", { method: "POST", body: "{}" });
      started.push({ project: "global-control", pid: control.pid || 0 });
    }
    const missing = new Set(missingConnections.filter(item => item.kind !== "global").map(item => item.project));
    for (const project of expected.filter(project => missing.has(project.name))) {
      const start = await request("/api/start", { method: "POST", body: JSON.stringify({ project: project.name, agent: project.agent || "" }) });
      started.push({ project: project.name, pid: start.pid || 0 });
    }
  }
  // Feishu long connections publish their live lock asynchronously. Retry only
  // a blocked preflight; a successfully started soak is never started twice.
  for (let attempt = 1; result.blocked && attempt <= 30; attempt += 1) {
    await wait(2000);
    result = await request("/api/reliability/soak/start", { method: "POST", body: JSON.stringify({ duration_ms: 24 * 60 * 60 * 1000, interval_ms: 60 * 1000, clean_mode: true, reconcile_debt: true, startup_grace_seconds: 30 }) });
    if (!result.blocked || attempt === 30) break;
  }
  if (result.blocked) {
    console.error(JSON.stringify({ pass: false, started_projects: started, debt: debt.result, preflight: result.preflight }, null, 2));
    process.exitCode = 1;
    return;
  }
  console.log(JSON.stringify({ pass: true, test_id: result.state?.id, ends_at: result.state?.ends_at, started_projects: started, expected_feishu: (result.state?.baseline?.feishu?.connections || []).map(item => item.name || item.id), debt_clean: debt.result?.pass === true }, null, 2));
}

main().catch(error => { console.error(error.message || error); process.exitCode = 1; });
