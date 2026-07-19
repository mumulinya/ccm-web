/**
 * Structured TestAgent environment preparation checklist.
 * Used when independent review is blocked on login / env / runtime conditions.
 * Never embeds secret values — only env names and non-sensitive hints.
 */

const ENV_NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;
const ENV_FROM_TEXT_RE = /environment variable ["'`]([A-Za-z_][A-Za-z0-9_]*)["'`]/gi;
const ENV_NAME_TOKEN_RE = /\b([A-Z][A-Z0-9_]{2,})\b/g;

function asArray(value: any): any[] {
  return Array.isArray(value) ? value : [];
}

function uniqueStrings(values: any[], limit = 16): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const text = String(value || "").trim();
    if (!text || seen.has(text)) continue;
    seen.add(text);
    out.push(text);
    if (out.length >= limit) break;
  }
  return out;
}

function collectTextBlobs(report: any, verdict: any): string[] {
  const blobs: string[] = [];
  for (const item of asArray(report?.blockedReasons)) blobs.push(String(item || ""));
  for (const item of asArray(verdict?.blockedReasons)) blobs.push(String(item || ""));
  for (const item of asArray(report?.risks)) blobs.push(String(item || ""));
  for (const item of asArray(verdict?.risks)) blobs.push(String(item || ""));
  for (const result of asArray(report?.browserResults)) {
    blobs.push(String(result?.error || ""));
    for (const step of asArray(result?.steps)) {
      blobs.push(String(step?.error || ""));
      blobs.push(String(step?.detail || ""));
    }
  }
  return blobs.filter(Boolean);
}

function extractEnvNamesFromText(text: string): string[] {
  const names: string[] = [];
  let match: RegExpExecArray | null;
  const quoted = new RegExp(ENV_FROM_TEXT_RE.source, "gi");
  while ((match = quoted.exec(text))) {
    if (ENV_NAME_RE.test(match[1])) names.push(match[1]);
  }
  if (/缺少环境变量|credentialEnvNames|valueEnv|未定义|not defined|missing.*(env|credential)/i.test(text)) {
    const token = new RegExp(ENV_NAME_TOKEN_RE.source, "g");
    while ((match = token.exec(text))) {
      const name = match[1];
      if (ENV_NAME_RE.test(name) && !/^(HTTP|HTTPS|JSON|HTML|POST|GET|PUT|PATCH|DELETE|TRUE|FALSE|NULL)$/.test(name)) {
        names.push(name);
      }
    }
  }
  return names;
}

export type TestAgentEnvironmentPrep = {
  schema: "ccm-test-agent-environment-prep-v1";
  missingEnvNames: string[];
  storageStateHint: string;
  seedHints: string[];
  userSummary: string;
  readyEnvNames: string[];
};

export function buildTestAgentEnvironmentPrepChecklist(report: any = null, verdict: any = null): TestAgentEnvironmentPrep | null {
  const missingEnvNames: string[] = [];
  let needsStorageState = false;
  const seedHints: string[] = [];

  for (const result of asArray(report?.browserResults)) {
    const status = String(result?.status || "").toLowerCase();
    const auth = result?.authentication || {};
    const credentialEnvNames = asArray(auth.credentialEnvNames || auth.credential_env_names)
      .map((item: any) => String(item || "").trim())
      .filter((name: string) => ENV_NAME_RE.test(name));
    if ((status === "blocked" || status === "skipped") && credentialEnvNames.length) {
      missingEnvNames.push(...credentialEnvNames);
    }
    if ((status === "blocked" || status === "skipped") && (
      /storageState|storage_state|登录态文件|会话状态文件/i.test(String(result?.error || ""))
      || (!auth.storageState && !auth.existingSession && credentialEnvNames.length === 0 && /login|登录|auth|session/i.test(String(result?.name || "")))
    )) {
      needsStorageState = true;
    }
    if (status === "blocked" || status === "skipped") {
      seedHints.push(`浏览器检查「${result?.name || "未命名"}」受阻：${String(result?.error || "需要补齐登录或运行条件").slice(0, 120)}`);
    }
  }

  for (const blob of collectTextBlobs(report, verdict)) {
    missingEnvNames.push(...extractEnvNamesFromText(blob));
    if (/storageState|storage_state|登录态文件|authStatePath|会话状态/i.test(blob)) needsStorageState = true;
  }

  const authSummary = verdict?.browserAuthenticationSummary
    || report?.browserAuthenticationSummary
    || report?.verdict?.browserAuthenticationSummary
    || null;
  const blockedAuth = Number(authSummary?.blockedChecks || authSummary?.blocked_checks || 0);
  const pendingAuth = Number(authSummary?.pendingChecks || authSummary?.pending_checks || 0);
  if (blockedAuth > 0 || pendingAuth > 0) {
    seedHints.push("登录态浏览器验收受阻：请确认测试账号可用、必要环境变量名已配置，或提供可用的 storageState 路径。");
  }

  const uniqueMissing = uniqueStrings(missingEnvNames, 12);
  const storageStateHint = needsStorageState
    ? "需要可用的浏览器登录态文件（storageStatePath / authStatePath），不要内联 cookie/token 明文。"
    : "";
  const uniqueSeeds = uniqueStrings([
    ...seedHints,
    uniqueMissing.length ? `请配置环境变量名：${uniqueMissing.join("、")}（只声明名称是否就绪，不要回传密钥值）。` : "",
    storageStateHint,
  ], 8);

  const hasSignal = uniqueMissing.length > 0 || !!storageStateHint || uniqueSeeds.length > 0
    || verdict?.needsEnvironment === true
    || String(verdict?.reviewRoute || "").toLowerCase() === "environment";
  if (!hasSignal) return null;

  const readyEnvNames = uniqueMissing.filter(name => process.env[name] !== undefined && String(process.env[name] || "") !== "");
  const stillMissing = uniqueMissing.filter(name => !readyEnvNames.includes(name));
  const userParts = [
    stillMissing.length ? `缺环境变量名：${stillMissing.join("、")}` : "",
    readyEnvNames.length && stillMissing.length === 0 ? `已声明的环境变量名已就绪：${readyEnvNames.join("、")}` : "",
    storageStateHint ? "缺登录态文件（storageState）" : "",
    !stillMissing.length && !storageStateHint ? "缺登录/运行条件" : "",
  ].filter(Boolean);

  return {
    schema: "ccm-test-agent-environment-prep-v1",
    missingEnvNames: uniqueMissing,
    storageStateHint,
    seedHints: uniqueSeeds,
    userSummary: userParts.join("；") || "需要先补齐环境、登录或运行条件",
    readyEnvNames,
  };
}

export function formatTestAgentEnvironmentPrepUserLines(prep: TestAgentEnvironmentPrep | null): string[] {
  if (!prep) return ["当前缺少环境、登录或运行条件。"];
  return uniqueStrings([
    prep.userSummary,
    prep.missingEnvNames.length
      ? `缺少环境变量名：${prep.missingEnvNames.join("、")}（回执中只说明是否已配置，不要写入密钥值）。`
      : "",
    prep.storageStateHint,
    ...prep.seedHints.slice(0, 3),
  ], 6);
}

export function applyTestAgentEnvironmentPrepToHandoff(handoff: any, prep: TestAgentEnvironmentPrep | null) {
  if (!handoff || typeof handoff !== "object" || !prep) return handoff;
  const readyEnvNames = (prep.missingEnvNames || []).filter(
    name => process.env[name] !== undefined && String(process.env[name] || "") !== "",
  );
  return {
    ...handoff,
    metadata: {
      ...(handoff.metadata || {}),
      testAgentEnvironmentPrep: {
        ...prep,
        readyEnvNames,
        checkedAt: new Date().toISOString(),
      },
      environmentPrepChecklist: {
        missingEnvNames: prep.missingEnvNames,
        storageStateHint: prep.storageStateHint,
        seedHints: prep.seedHints,
        readyEnvNames,
        checkedAt: new Date().toISOString(),
      },
    },
  };
}

export type TestAgentScreenshotRef = {
  stepName: string;
  path: string;
  kind: "failure" | "capture";
  checkName?: string;
};

export function collectTestAgentFailureScreenshotRefs(report: any = null): TestAgentScreenshotRef[] {
  const refs: TestAgentScreenshotRef[] = [];
  const seen = new Set<string>();
  for (const result of asArray(report?.browserResults)) {
    const checkName = String(result?.name || "").trim();
    const failedStep = asArray(result?.steps).find((step: any) => String(step?.status || "").toLowerCase() === "failed");
    const structured = asArray(result?.screenshotRefs || result?.screenshot_refs);
    if (structured.length) {
      for (const item of structured) {
        const pathText = String(item?.path || "").trim();
        const kind = String(item?.kind || "").toLowerCase() === "capture" ? "capture" : "failure";
        if (!pathText || kind !== "failure") continue;
        const key = `${pathText}|${kind}`;
        if (seen.has(key)) continue;
        seen.add(key);
        refs.push({
          stepName: String(item?.stepName || item?.step_name || failedStep?.name || "browser-failure").trim() || "browser-failure",
          path: pathText,
          kind: "failure",
          checkName,
        });
      }
      continue;
    }
    for (const shot of asArray(result?.screenshots)) {
      const pathText = String(shot || "").trim();
      if (!pathText || !/\.failure\.png$/i.test(pathText)) continue;
      const key = `${pathText}|failure`;
      if (seen.has(key)) continue;
      seen.add(key);
      const base = pathText.replace(/\\/g, "/").split("/").pop() || "";
      const stepFromName = base.replace(/\.failure\.png$/i, "").split("-").slice(3).join("-") || failedStep?.name || "browser-failure";
      refs.push({
        stepName: String(stepFromName || "browser-failure"),
        path: pathText,
        kind: "failure",
        checkName,
      });
    }
  }
  return refs.slice(0, 12);
}

export function formatFailureScreenshotTechnicalRows(refs: TestAgentScreenshotRef[] = []): string[] {
  return refs.map(item => {
    const step = item.stepName || "browser-failure";
    const check = item.checkName ? `${item.checkName} / ` : "";
    const file = String(item.path || "").replace(/\\/g, "/").split("/").pop() || item.path;
    return `失败步骤 → 截图：${check}${step} → ${file}`;
  });
}

export function countTestAgentFlakyStabilityGroups(report: any = null, verdict: any = null): number {
  const fromVerdict = Number(verdict?.evidenceSummary?.browserFlakyStabilityGroups
    ?? verdict?.evidence_summary?.browserFlakyStabilityGroups
    ?? 0);
  if (fromVerdict > 0) return fromVerdict;
  return Number(
    report?.browserStabilitySummary?.statusCounts?.flaky
    ?? report?.browser_stability_summary?.status_counts?.flaky
    ?? verdict?.browserStabilitySummary?.statusCounts?.flaky
    ?? 0,
  );
}
