#!/usr/bin/env node
const base = String(process.env.CCM_BASE_URL || "http://127.0.0.1:3080").replace(/\/$/, "");

async function get(path) {
  const response = await fetch(`${base}${path}`);
  const payload = await response.json();
  if (!response.ok || payload.success === false) throw new Error(payload.error || `${path} HTTP ${response.status}`);
  return payload;
}

async function main() {
  const [soak, lifecycle, debt] = await Promise.all([
    get("/api/reliability/soak/status"),
    get("/api/reliability/process-lifecycle?event_limit=20"),
    get("/api/reliability/debt"),
  ]);
  const state = soak.state || {};
  const summary = soak.report?.summary || state.report?.summary || null;
  const latest = state.latest_sample || state.baseline || {};
  const debtClean = Object.values(debt.debt?.counts || {}).every(value => Number(value || 0) === 0);
  const criticalAlerts = (state.alerts || []).filter(alert => alert.severity === "critical");
  const windowRestartCounts = summary?.restart_classification || latest.lifecycle || {};
  const liveInvariants = {
    debt_clean: debtClean,
    sample_loop_error_free: Number(state.sample_errors || 0) === 0,
    same_boot: !state.baseline?.boot_id || (latest.boot_id === state.baseline.boot_id && lifecycle.current?.boot_id === state.baseline.boot_id),
    no_window_restarts: Number(windowRestartCounts.starts || 0) === 0 && Number(windowRestartCounts.unexpected_restarts || 0) === 0,
    code_and_config_frozen: !state.baseline?.freeze?.hash || latest.freeze?.hash === state.baseline.freeze.hash,
    runner_healthy: latest.runner?.healthy === true,
    all_expected_feishu_healthy: latest.feishu?.healthy === true && Number(latest.feishu?.active_connections || 0) === Number(latest.feishu?.expected_connections || 0),
    no_critical_alerts: criticalAlerts.length === 0,
  };
  const runningClean = state.status === "running" && state.clean_mode === true && Object.values(liveInvariants).every(Boolean);
  const completedClean = state.status === "completed" && state.clean_mode === true && summary?.pass === true;
  const result = {
    pass: debtClean && (runningClean || completedClean),
    status: state.status || "not_started",
    clean_mode: state.clean_mode === true,
    test_id: state.id || "",
    progress: state.duration_ms ? Number(Math.max(0, Math.min(100, (Date.now() - Date.parse(state.started_at)) / state.duration_ms * 100)).toFixed(2)) : 0,
    debt_clean: debtClean,
    current_boot: lifecycle.current?.boot_id || "",
    baseline_boot: state.baseline?.boot_id || "",
    window_restart_counts: windowRestartCounts,
    historical_restart_counts: lifecycle.counts || {},
    live_invariants: liveInvariants,
    critical_alerts: criticalAlerts.map(alert => ({ code: alert.code, message: alert.message, incidents: alert.count || 1, observations: alert.observations || alert.count || 1 })),
    latest_invariants: summary?.invariants || null,
    final_pass: summary?.pass ?? null,
    ends_at: state.ends_at || "",
  };
  console.log(JSON.stringify(result, null, 2));
  if (!result.pass) process.exitCode = 1;
}

main().catch(error => { console.error(error.message || error); process.exitCode = 1; });
