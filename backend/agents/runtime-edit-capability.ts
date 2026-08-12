export type RuntimeEditCapabilityResolution = {
  nativeWorkspaceEditing: boolean;
  source: "runtime_and_probe" | "runtime_declared" | "probe_denied" | "runtime_unsupported";
  verified: boolean;
  reason: string;
  observedAt: string;
};

function probeWritePassed(probe: any) {
  const write = probe?.capabilities?.write;
  if (write?.pass === true) return true;
  return String(probe?.capabilities?.filesystem || "").toLowerCase() === "workspace_write";
}

function probeWriteDenied(probe: any) {
  const write = probe?.capabilities?.write;
  if (write?.pass === false) return true;
  return String(probe?.capabilities?.filesystem || "").toLowerCase() === "read_only";
}

export function resolveRuntimeEditCapability(input: {
  runtimeDeclared: boolean;
  probe?: any;
  maxProbeAgeMs?: number;
}): RuntimeEditCapabilityResolution {
  const probe = input.probe || null;
  const observedAt = String(probe?.checked_at || probe?.checkedAt || "");
  const checkedAt = Date.parse(observedAt);
  const ageMs = Number.isFinite(checkedAt) ? Math.max(0, Date.now() - checkedAt) : Number.POSITIVE_INFINITY;
  const fresh = ageMs <= Math.max(60_000, Number(input.maxProbeAgeMs || 24 * 60 * 60 * 1000));

  if (!input.runtimeDeclared) {
    return {
      nativeWorkspaceEditing: false,
      source: "runtime_unsupported",
      verified: false,
      reason: "该运行时未声明原生工作区编辑能力，使用 CCM 受控编辑工具",
      observedAt,
    };
  }
  if (probe && fresh && probeWriteDenied(probe)) {
    return {
      nativeWorkspaceEditing: false,
      source: "probe_denied",
      verified: true,
      reason: String(probe?.capabilities?.write?.reason || "最近一次真实写入探针未通过，已切换为 CCM 受控编辑工具"),
      observedAt,
    };
  }
  if (probe && fresh && probeWritePassed(probe)) {
    return {
      nativeWorkspaceEditing: true,
      source: "runtime_and_probe",
      verified: true,
      reason: "运行时声明与真实写入探针一致",
      observedAt,
    };
  }
  return {
    nativeWorkspaceEditing: true,
    source: "runtime_declared",
    verified: false,
    reason: "暂未取得新鲜写入探针，沿用运行时原生能力声明；正式任务仍受执行前探针与工作区门禁约束",
    observedAt,
  };
}

