// Behavior-freeze fixture helpers extracted from collaboration-coordination-self-tests.ts.
// Keeps host self-test under the 1500-line limit without changing behavior.

import {
  COORDINATOR_REVIEW_MAX_ROUNDS,
  hasConfiguredTestAgentMultiSessionBrowserCheck,
} from "./collaboration";

export function buildCoordinationSelfTestFakeNativeReport(ctx: any = {}) {
  const { fakeVerdictPath, independentHandoff } = ctx;
  return (
  {
      schema: "ccm-test-agent-report-v1",
      agent: "test-agent",
      id: "test-agent-report-selftest",
      workOrderId: independentHandoff?.id || "work-order-selftest",
      taskId: "test-agent-work-order-selftest",
      groupId: "test-agent-work-order-group",
      status: "passed",
      recommendation: "accept",
      summary: "TestAgent verified command checks and reviewed evidence.",
      startedAt: "2026-07-08T00:00:00.000Z",
      finishedAt: "2026-07-08T00:00:01.000Z",
      durationMs: 1000,
      artifactDir: "C:/tmp/test-agent-artifacts/selftest",
      requiredChecks: ["commands"],
      commandResults: [{
        project: "web-app",
        command: "npm test",
        cwd: "C:/repo/web-app",
        status: "passed",
        exitCode: 0,
        startedAt: "2026-07-08T00:00:00.000Z",
        finishedAt: "2026-07-08T00:00:01.000Z",
        durationMs: 1000,
        stdout: "",
        stderr: "",
        output: "",
      }],
      devServerResults: [],
      httpResults: [],
      browserResults: [{
        provider: "playwright",
        project: "web-app",
        name: "登录恢复浏览器复核",
        url: "http://127.0.0.1:5173/login",
        finalUrl: "http://127.0.0.1:5173/dashboard",
        status: "passed",
        startedAt: "2026-07-08T00:00:00.000Z",
        finishedAt: "2026-07-08T00:00:01.000Z",
        durationMs: 1000,
        steps: [
          { kind: "action", name: "action:goto", status: "passed", detail: "url=/login" },
          { kind: "action", name: "action:uploadFile", status: "passed", detail: "label=附件; file=notes.txt, meta.json" },
          { kind: "action", name: "action:reload", status: "passed", detail: "url=/dashboard" },
          { kind: "assertion", name: "assert:pageNotBlank", status: "passed", detail: "page has visible content" },
          { kind: "assertion", name: "assert:downloadedFile", status: "passed", detail: "filename=tasks.csv; contentIncludes=Ship TestAgent; minBytes=20" },
          { kind: "assertion", name: "assert:consoleNoErrors", status: "passed", detail: "console clean" },
          { kind: "assertion", name: "assert:networkNoErrors", status: "passed", detail: "network clean" },
          { kind: "assertion", name: "assert:tableRowIncludes", status: "passed", detail: "table=#orders; row=A-100; expected text count=2" },
          { kind: "assertion", name: "assert:tableCellTextEquals", status: "passed", detail: "table=#orders; row=B-200; column=Status" },
          { kind: "assertion", name: "assert:tableCellTextIncludes", status: "passed", detail: "table=#orders; row=B-200; column=Total" },
        ],
        screenshots: [],
        consoleErrors: [],
        pageErrors: [],
        networkRequests: [],
        networkErrors: [],
        browserArtifacts: [{
          type: "download",
          title: "Download: tasks.csv",
          path: "C:/tmp/test-agent-artifacts/selftest/browser-artifacts/downloads/tasks.csv",
          source: "playwright:download",
          mediaType: "text/csv",
        }],
      }],
      browserToolCalls: [],
      browserNetworkSummary: [{
        project: "web-app",
        name: "登录恢复浏览器复核",
        provider: "playwright",
        status: "passed",
        url: "http://127.0.0.1:5173/login",
        finalUrl: "http://127.0.0.1:5173/dashboard",
        requestCount: 4,
        responseCount: 4,
        failedRequestCount: 0,
        failedResponseCount: 0,
        errorCount: 0,
        statusCodes: { "200": 4 },
        resourceTypes: { document: 1, fetch: 1, script: 2 },
        failureKinds: {},
        failedUrls: [],
        errors: [],
        networkLogPath: "C:/tmp/test-agent-artifacts/selftest/network.log",
      }],
      browserInteractionSummary: [{
        project: "web-app",
        name: "登录恢复浏览器复核",
        provider: "playwright",
        status: "passed",
        url: "http://127.0.0.1:5173/login",
        finalUrl: "http://127.0.0.1:5173/dashboard",
        actionCount: 3,
        assertionCount: 7,
        passedActions: 3,
        failedActions: 0,
        passedAssertions: 7,
        failedAssertions: 0,
        actionTypes: { goto: 1, uploadFile: 1, reload: 1 },
        assertionTypes: {
          pageNotBlank: 1,
          downloadedFile: 1,
          consoleNoErrors: 1,
          networkNoErrors: 1,
          tableRowIncludes: 1,
          tableCellTextEquals: 1,
          tableCellTextIncludes: 1,
        },
        actionSteps: [{ kind: "action", name: "action:uploadFile", status: "passed", detail: "label=附件; file=notes.txt, meta.json" }],
        failedSteps: [],
      }],
      browserFlowSummary: {
        total: 1,
        statusCounts: { passed: 1, failed: 0, blocked: 0, skipped: 0 },
        flowTypeCount: 1,
        criteriaCount: 1,
        actionCount: 3,
        assertionCount: 7,
        failedStepCount: 0,
        items: [{
          flowType: "acceptance_form_flow",
          total: 1,
          statusCounts: { passed: 1, failed: 0, blocked: 0, skipped: 0 },
          criteriaCount: 1,
          criteria: ["登录恢复后进入工作台"],
          projects: ["web-app"],
          providers: ["playwright"],
          actionCount: 3,
          assertionCount: 7,
          failedStepCount: 0,
          failures: [],
        }],
      },
      browserMultiSessionSummary: {
        total: 2,
        statusCounts: { passed: 2, failed: 0, blocked: 0, skipped: 0 },
        sessionCount: 4,
        uniqueSessionCount: 4,
        sessionNames: ["sender", "receiver", "author", "observer"],
        parallelGroupCount: 2,
        comparisonCount: 2,
        failedComparisonCount: 0,
        actionCount: 7,
        assertionCount: 8,
        failedStepCount: 0,
        items: [{
          check: "发送消息后接收方实时看到",
          status: "passed",
          sessionNames: ["sender", "receiver"],
          failedSessionNames: [],
          failedSteps: [],
        }, {
          check: "作者更新后观察方同步刷新",
          status: "passed",
          sessionNames: ["author", "observer"],
          failedSessionNames: [],
          failedSteps: [],
        }],
      },
      browserActionEffectSummary: {
        checks: 1,
        actions: 1,
        changed: 1,
        unchanged: 0,
        unavailable: 0,
        failed: 0,
        detailSuppressed: 0,
        crossSession: 0,
        actionTypes: { click: 1 },
        changedSignals: { url: 0, title: 0, page_text: 1, dom: 0, network: 0, dialog: 0, popup: 0, download: 0 },
        items: [{
          project: "web-app",
          name: "保存登录设置",
          provider: "playwright",
          status: "passed",
          actions: 1,
          changed: 1,
          unchanged: 0,
          unavailable: 0,
          failed: 0,
          detailSuppressed: 0,
          crossSession: 0,
          actionTypes: { click: 1 },
          changedSignals: { url: 0, title: 0, page_text: 1, dom: 0, network: 0, dialog: 0, popup: 0, download: 0 },
        }],
      },
      browserRecoverySummary: {
        checks: 1,
        attempted: 1,
        recovered: 1,
        failed: 0,
        notRetried: 0,
        items: [{
          project: "web-app",
          name: "登录恢复浏览器复核",
          provider: "playwright",
          status: "passed",
          attempted: 1,
          recovered: 1,
          failed: 0,
          notRetried: 0,
          events: [],
        }],
      },
      adversarialEvidenceSummary: {
        required: true,
        waived: false,
        status: "verified",
        total: 1,
        passed: 1,
        failed: 0,
        blocked: 0,
        skipped: 0,
        http: 0,
        browser: 1,
        relevant: 1,
        unlinked: 0,
        passedRelevant: 1,
        goalLinked: 1,
        criteriaCovered: ["登录恢复后重复提交不会产生重复副作用"],
        probeTypes: ["duplicate_submit"],
        items: [{
          project: "web-app",
          surface: "browser",
          name: "重复提交保护",
          target: "http://127.0.0.1:5173/login",
          status: "passed",
          probeType: "duplicate_submit",
          provider: "playwright",
          relevance: "explicit",
          linkedCriteria: ["登录恢复后重复提交不会产生重复副作用"],
          goalLinked: true,
          matchScore: 100,
        }],
      },
      requiredCheckCoverage: [{ check: "commands", status: "verified", evidence: ["npm test"] }],
      acceptanceCoverage: [{ criterion: "独立复核 web-app 的交付证据", status: "verified", evidence: ["npm test"] }],
      evidence: [{ type: "command", project: "web-app", title: "npm test", status: "passed", detail: "exit=0" }],
      risks: [],
      blockedReasons: [],
      issues: [],
      metadata: {
        reviewSubject: "web-app",
        browserAuthenticationSummary: {
          configuredChecks: 2,
          passedChecks: 2,
          failedChecks: 0,
          blockedChecks: 0,
          authenticatedSessions: 2,
          credentialEnvNames: ["TEST_EMAIL", "TEST_PASSWORD"],
          storageStateCount: 2,
          sensitiveArtifactSuppressionCount: 2,
        },
        artifactFiles: {
          reportJsonPath: "C:/tmp/test-agent-artifacts/selftest/report.json",
          reportMarkdownPath: "C:/tmp/test-agent-artifacts/selftest/report.md",
          verdictJsonPath: fakeVerdictPath,
          manifestPath: "C:/tmp/test-agent-artifacts/selftest/artifact-manifest.json",
        },
        previousLedger: { filesChanged: ["src/views/OrderDetail.vue"] },
      },
    }
  );
}

export function buildCoordinationSelfTestFakeFailedNativeReport(ctx: any = {}) {
  const { fakeFailedVerdictPath, fakeNativeReport } = ctx;
  return (
  {
      ...fakeNativeReport,
      id: "test-agent-report-failed-selftest",
      status: "failed",
      recommendation: "rework",
      summary: "TestAgent found failed checks and requires rework.",
      artifactDir: "C:/tmp/test-agent-artifacts/failed-selftest",
      commandResults: [{
        ...(fakeNativeReport.commandResults?.[0] || {}),
        status: "failed",
        exitCode: 1,
        stderr: "登录恢复测试未通过",
        output: "登录恢复测试未通过",
      }],
      browserResults: [{
        ...(fakeNativeReport.browserResults?.[0] || {}),
        status: "failed",
        steps: [
          { kind: "action", name: "action:goto", status: "passed", detail: "url=/login" },
          { kind: "action", name: "action:reload", status: "passed", detail: "url=/dashboard" },
          { kind: "assertion", name: "assert:pageNotBlank", status: "passed", detail: "page has visible content" },
          { kind: "assertion", name: "assert:networkNoErrors", status: "failed", detail: "发现网络请求异常", error: "会话请求未成功" },
          { kind: "assertion", name: "assert:tableCellTextEquals", status: "failed", detail: "table=#orders; row=B-200; column=Status", error: "登录状态未恢复" },
        ],
        browserArtifacts: [],
      }],
      browserNetworkSummary: [{
        ...(fakeNativeReport.browserNetworkSummary?.[0] || {}),
        status: "failed",
        failedRequestCount: 1,
        errorCount: 0,
        networkLogPath: "C:/tmp/test-agent-artifacts/failed-selftest/network.log",
      }],
      browserInteractionSummary: [{
        ...(fakeNativeReport.browserInteractionSummary?.[0] || {}),
        status: "failed",
        actionCount: 2,
        assertionCount: 3,
        passedActions: 2,
        failedActions: 0,
        passedAssertions: 1,
        failedAssertions: 2,
        actionTypes: { goto: 1, reload: 1 },
        assertionTypes: { pageNotBlank: 1, networkNoErrors: 1, tableCellTextEquals: 1 },
        actionSteps: [],
        failedSteps: [
          { kind: "assertion", name: "assert:networkNoErrors", status: "failed", detail: "发现网络请求异常", error: "会话请求未成功" },
          { kind: "assertion", name: "assert:tableCellTextEquals", status: "failed", detail: "table=#orders; row=B-200; column=Status", error: "登录状态未恢复" },
        ],
      }],
      browserFlowSummary: {
        total: 1,
        statusCounts: { passed: 0, failed: 1, blocked: 0, skipped: 0 },
        flowTypeCount: 1,
        criteriaCount: 1,
        actionCount: 2,
        assertionCount: 3,
        failedStepCount: 2,
        items: [{
          flowType: "acceptance_form_flow",
          total: 1,
          statusCounts: { passed: 0, failed: 1, blocked: 0, skipped: 0 },
          criteriaCount: 1,
          criteria: ["登录恢复后进入工作台"],
          projects: ["web-app"],
          providers: ["playwright"],
          actionCount: 2,
          assertionCount: 3,
          failedStepCount: 2,
          failures: [{
            project: "web-app",
            name: "登录恢复浏览器复核",
            status: "failed",
            error: "会话请求未成功",
            failedSteps: ["assert:networkNoErrors: 会话请求未成功"],
          }],
        }],
      },
      browserMultiSessionSummary: {
        total: 2,
        statusCounts: { passed: 1, failed: 1, blocked: 0, skipped: 0 },
        sessionCount: 4,
        uniqueSessionCount: 4,
        sessionNames: ["sender", "receiver", "author", "observer"],
        parallelGroupCount: 2,
        comparisonCount: 2,
        failedComparisonCount: 1,
        actionCount: 7,
        assertionCount: 8,
        failedStepCount: 1,
        items: [{
          check: "发送消息后接收方实时看到",
          status: "passed",
          sessionNames: ["sender", "receiver"],
          failedSessionNames: [],
          failedSteps: [],
        }, {
          check: "作者更新后观察方同步刷新",
          status: "failed",
          sessionNames: ["author", "observer"],
          failedSessionNames: ["observer"],
          failedComparisonCount: 1,
          failedSteps: [{ name: "session:observer:assert:visible", error: "locator=#raw-observer" }],
        }],
      },
      browserActionEffectSummary: {
        checks: 1,
        actions: 1,
        changed: 0,
        unchanged: 1,
        unavailable: 0,
        failed: 1,
        detailSuppressed: 0,
        crossSession: 0,
        actionTypes: { click: 1 },
        changedSignals: { url: 0, title: 0, page_text: 0, dom: 0, network: 0, dialog: 0, popup: 0, download: 0 },
        items: [{
          project: "web-app",
          name: "保存登录设置",
          provider: "playwright",
          status: "failed",
          actions: 1,
          changed: 0,
          unchanged: 1,
          unavailable: 0,
          failed: 1,
          detailSuppressed: 0,
          crossSession: 0,
          actionTypes: { click: 1 },
          changedSignals: { url: 0, title: 0, page_text: 0, dom: 0, network: 0, dialog: 0, popup: 0, download: 0 },
        }],
      },
      adversarialEvidenceSummary: {
        required: true,
        waived: false,
        status: "failed",
        total: 1,
        passed: 0,
        failed: 1,
        blocked: 0,
        skipped: 0,
        http: 0,
        browser: 1,
        relevant: 1,
        unlinked: 0,
        passedRelevant: 0,
        goalLinked: 1,
        criteriaCovered: ["重复提交不能创建重复会话"],
        probeTypes: ["duplicate_submit"],
        items: [{
          project: "web-app",
          surface: "browser",
          name: "重复提交登录",
          target: "http://127.0.0.1:5173/login?token=hidden",
          status: "failed",
          probeType: "duplicate_submit",
          provider: "playwright",
          relevance: "explicit",
          linkedCriteria: ["重复提交不能创建重复会话"],
          goalLinked: true,
          matchScore: 100,
        }],
      },
      requiredCheckCoverage: [{ check: "commands", status: "not_verified", missingReason: "npm test 未通过" }],
      acceptanceCoverage: [{ criterion: "登录恢复验证必须通过", status: "not_verified", evidence: ["npm test 未通过"] }],
      failureSummary: [{
        type: "browser",
        project: "web-app",
        title: "登录恢复浏览器复核",
        status: "failed",
        reason: "会话请求没有恢复登录态；失败截图在 C:/tmp/test-agent-artifacts/failed-selftest/screenshots/login.failure.png。",
        evidence: ["C:/tmp/test-agent-artifacts/failed-selftest/screenshots/login.failure.png"],
        nextAction: "先修复会话恢复请求，再重新运行浏览器复核。",
        diagnostics: [
          "打开失败截图核对页面是否仍停留在登录态。",
          "检查浏览器网络日志中的 /api/session 请求。",
        ],
      }],
      evidence: [{ type: "command", project: "web-app", title: "npm test", status: "failed", detail: "exit=1" }],
      risks: ["命令验证未通过，不能进入最终验收"],
      metadata: {
        reviewSubject: "web-app",
        browserAuthenticationSummary: {
          configuredChecks: 2,
          passedChecks: 1,
          failedChecks: 1,
          blockedChecks: 0,
          authenticatedSessions: 2,
          credentialEnvNames: ["TEST_EMAIL", "TEST_PASSWORD"],
          storageStateCount: 2,
          sensitiveArtifactSuppressionCount: 2,
        },
        artifactFiles: {
          reportJsonPath: "C:/tmp/test-agent-artifacts/failed-selftest/report.json",
          reportMarkdownPath: "C:/tmp/test-agent-artifacts/failed-selftest/report.md",
          verdictJsonPath: fakeFailedVerdictPath,
          manifestPath: "C:/tmp/test-agent-artifacts/failed-selftest/artifact-manifest.json",
        },
        previousLedger: { filesChanged: ["src/views/OrderDetail.vue"] },
      },
    }
  );
}

export function buildCoordinationSelfTestFakeNeedsRecheckReport(ctx: any = {}) {
  const { fakeNativeReport } = ctx;
  return (
  {
      ...fakeNativeReport,
      id: "test-agent-report-needs-recheck-selftest",
      status: "passed",
      recommendation: "accept",
      summary: "Legacy result says pass, but browser recovery and adversarial evidence are incomplete.",
      browserActionEffectSummary: {
        checks: 1,
        actions: 1,
        changed: 0,
        unchanged: 0,
        unavailable: 1,
        failed: 1,
        detailSuppressed: 1,
        crossSession: 0,
        actionTypes: { click: 1 },
        changedSignals: { url: 0, title: 0, page_text: 0, dom: 0, network: 0, dialog: 0, popup: 0, download: 0 },
        items: [{
          project: "web-app",
          name: "提交登录表单",
          provider: "playwright",
          status: "blocked",
          actions: 1,
          changed: 0,
          unchanged: 0,
          unavailable: 1,
          failed: 1,
          detailSuppressed: 1,
          crossSession: 0,
          actionTypes: { click: 1 },
          changedSignals: { url: 0, title: 0, page_text: 0, dom: 0, network: 0, dialog: 0, popup: 0, download: 0 },
        }],
      },
      browserRecoverySummary: {
        checks: 1,
        attempted: 1,
        recovered: 0,
        failed: 0,
        notRetried: 1,
        items: [{
          project: "web-app",
          name: "提交登录表单",
          provider: "playwright",
          status: "blocked",
          attempted: 1,
          recovered: 0,
          failed: 0,
          notRetried: 1,
          events: [{ operation: "click", reason: "unsafe duplicate side effect", rawSessionId: "hidden-session" }],
        }],
      },
      adversarialEvidenceSummary: {
        required: true,
        waived: false,
        status: "missing",
        total: 0,
        passed: 0,
        failed: 0,
        blocked: 0,
        skipped: 0,
        http: 0,
        browser: 0,
        relevant: 0,
        unlinked: 0,
        passedRelevant: 0,
        goalLinked: 0,
        criteriaCovered: [],
        probeTypes: [],
        items: [],
      },
    }
  );
}

export function buildCoordinationSelfTestChecks(ctx: any = {}) {
  const { blockedAuthenticationReceipt, blockedAuthenticationReviewSummary, blockedIndependentFollowUp, commandOnlyAcceptanceCriteria, commandOnlyCompletedTasks, commandOnlyHandoff, commandOnlyVerificationCommands, environmentReviewFollowUps, environmentRoutedFollowUp, failedAuthenticationReceipt, failedAuthenticationReviewSummary, failedNativeTestAgentOutput, failedNativeTestAgentReceipt, failedNativeTestAgentReviewSummary, failedNativeTestAgentVisibleOutput, failedReviewReworkFollowUps, failedReviewRoutedFollowUp, failedRoute, failedTableEvidenceSummary, hardRouteFilteredLlmFollowUps, independentFollowUp, independentGateFollowUps, independentGateRoutedFollowUp, independentHandoff, independentHandoffAcceptance, independentHandoffProject, independentHandoffReviewInstructions, independentRoute, latestReviewWinsGate, nativePlanBlockedOutput, nativePlanBlockedReceipt, nativePlanSummary, nativeTestAgentOutput, nativeTestAgentReceipt, nativeTestAgentReviewSummary, nativeTestAgentRuntimeContext, nativeTestAgentVisibleOutput, nativeVerifierSelection, needsRecheckReceipt, needsRecheckReviewFollowUps, needsRecheckReviewSummary, needsRecheckRoutedFollowUp, needsRecheckVisibleOutput, noVerifierSelection, notVerifiedCoverageTestAgentReceipt, notVerifiedCoverageTestAgentVisibleOutput, postReviewSpotCheckContract, postReviewSpotCheckRoutedFollowUp, scheduledRecheckRoutedFollowUp, scheduledRechecks, structuredTestAgentEvidenceFollowUps, task, unknownCoverageTestAgentReceipt, unknownCoverageTestAgentVisibleOutput, verifierSelection, wrongDirectionContinuation, wrongDirectionRoute } = ctx;
  return (
  {
      hasReworkPacket: task.includes("主 Agent 返工工作单"),
      hasVisibleSummary: task.includes("用户可见返工摘要") && task.includes("补齐前端验证证据"),
      hasRound: task.includes("第 2/3 轮执行"),
      hasRoutePacket: task.includes("返工路由") && task.includes("继续同一子 Agent 修复"),
      hasContinuationSemantics: task.includes("续跑语义") && task.includes("同一个子 Agent"),
      hasScratchpadContext: task.includes("上一轮完成通知") && task.includes("上下文摘要"),
      hasOriginalRequirement: task.includes("原始需求"),
      hasCoordinatorPlan: task.includes("初始协调计划摘要"),
      hasReason: task.includes("返工原因"),
      hasVerification: task.includes("验证要求"),
      hasReceipt: task.includes("CCM_AGENT_RECEIPT"),
      failedRouteKeepsSameWorker: failedRoute.strategy === "continue_same_worker" && failedRoute.continuationStrategy === "same_worker_scratchpad",
      independentRouteUsesFreshVerifier: independentRoute.strategy === "fresh_verification_worker" && independentRoute.requires_fresh_verifier === true,
      independentVerifierSelectsTestAgent: verifierSelection.available === true && verifierSelection.targetName === "test-agent" && verifierSelection.originalTarget === "web-app",
      independentVerifierExcludesOriginalTarget: verifierSelection.candidates.every((item: any) => item.project !== "web-app"),
      independentVerifierReportsMissingCandidate: noVerifierSelection.available === false && noVerifierSelection.targetName === "",
      nativeTestAgentDoesNotRequireGroupMembership: nativeVerifierSelection.available === true
        && nativeVerifierSelection.targetName === "test-agent"
        && nativeVerifierSelection.nativeTestAgent?.available === true,
      postReviewSpotCheckContractPasses: postReviewSpotCheckContract.pass === true,
      postReviewSpotCheckReusesSameVerifierAndHandoff: postReviewSpotCheckRoutedFollowUp.targetName === "test-agent"
        && postReviewSpotCheckRoutedFollowUp.reworkRoute?.strategy === "resume_verifier"
        && postReviewSpotCheckRoutedFollowUp.continuationStrategy === "same_verifier_context"
        && postReviewSpotCheckRoutedFollowUp.testAgentHandoff?.id === independentHandoff?.id
        && postReviewSpotCheckRoutedFollowUp.reviewSubject === "web-app",
      coordinatorReviewLoopAllowsRepairRecheckAndFinalAcceptance: COORDINATOR_REVIEW_MAX_ROUNDS === 5,
      structuredTestAgentReceiptSkipsGenericWorkerFollowUp: structuredTestAgentEvidenceFollowUps.length === 0,
      hardReviewRouteSuppressesConflictingLlmFollowUps: hardRouteFilteredLlmFollowUps.length === 1
        && hardRouteFilteredLlmFollowUps[0].targetName === "docs-agent",
      needsRecheckCreatesSameTestAgentWorkOrderContinuation: needsRecheckReviewFollowUps.length === 1
        && needsRecheckReviewFollowUps[0].targetName === "test-agent"
        && needsRecheckReviewFollowUps[0].rework_kind === "test_agent_review_recheck"
        && needsRecheckRoutedFollowUp?.targetName === "test-agent"
        && needsRecheckRoutedFollowUp?.reworkRoute?.strategy === "resume_verifier"
        && needsRecheckRoutedFollowUp?.continuationStrategy === "same_verifier_context"
        && needsRecheckRoutedFollowUp?.testAgentHandoff?.id === independentHandoff?.id
        && needsRecheckRoutedFollowUp?.message.includes("不能复用上一轮结论"),
      needsEnvironmentPreparesConditionsBeforeRecheck: environmentReviewFollowUps.length === 1
        && environmentReviewFollowUps[0].targetName === "web-app"
        && environmentReviewFollowUps[0].rework_kind === "test_agent_environment_prepare"
        && environmentReviewFollowUps[0].rerunTestAgentAfterCompletion === true
        && environmentRoutedFollowUp?.reworkRoute?.strategy === "prepare_verification_environment"
        && environmentRoutedFollowUp?.reworkRoute?.user_label === "补齐复核条件后自动复验"
        && environmentRoutedFollowUp?.message.includes("主 Agent 收到可用结果后会自动沿用原复核工作单重新运行 TestAgent"),
      needsEnvironmentStructuredPrepChecklist: !!(
        environmentReviewFollowUps[0]?.testAgentEnvironmentPrep
        || environmentReviewFollowUps[0]?.test_agent_environment_prep
      )
        && Array.isArray((environmentReviewFollowUps[0]?.testAgentEnvironmentPrep
          || environmentReviewFollowUps[0]?.test_agent_environment_prep)?.seedHints),
      implementationReworkSchedulesTestAgentRecheck: failedReviewReworkFollowUps[0]?.rerunTestAgentAfterCompletion === true
        && failedReviewReworkFollowUps[0]?.testAgentRecheckHandoff?.id === independentHandoff?.id
        && scheduledRechecks.length === 1
        && scheduledRechecks[0].targetName === "test-agent"
        && scheduledRecheckRoutedFollowUp?.reworkRoute?.strategy === "resume_verifier"
        && scheduledRecheckRoutedFollowUp?.continuationStrategy === "same_verifier_context"
        && scheduledRecheckRoutedFollowUp?.testAgentHandoff?.id === independentHandoff?.id,
      coordinatorReviewBudgetCoversRepairRecheckAndAcceptance: COORDINATOR_REVIEW_MAX_ROUNDS >= 4,
      testAgentRecheckBudgetPerSubject: (() => {
        const {
          TEST_AGENT_RECHECK_MAX_PER_SUBJECT,
          applyTestAgentRecheckBudget,
        } = require("./collaboration-runtime-test-agent-handoff");
        const first = applyTestAgentRecheckBudget([
          { rework_kind: "test_agent_review_recheck", reviewSubject: "demo", targetName: "test-agent" },
          { rework_kind: "test_agent_review_recheck", reviewSubject: "demo", targetName: "test-agent" },
          { rework_kind: "test_agent_review_recheck", reviewSubject: "demo", targetName: "test-agent" },
        ], new Map());
        return TEST_AGENT_RECHECK_MAX_PER_SUBJECT === 2
          && first.kept.length === 2
          && first.blocked.length === 1
          && /复验已达上限/.test(String(first.blocked[0]?.reason || ""));
      })(),
      latestTestAgentReviewSupersedesStaleFailure: latestReviewWinsGate.pass === true
        && latestReviewWinsGate.status === "passed"
        && latestReviewWinsGate.evidence_count === 1
        && latestReviewWinsGate.passed_count === 1
        && latestReviewWinsGate.failed_count === 0
        && latestReviewWinsGate.evidence?.[0]?.summary.includes("最新复核已通过"),
      independentReworkDispatchesToVerifier: independentFollowUp.targetName === "test-agent"
        && independentFollowUp.project === "test-agent"
        && independentFollowUp.continuationOf === "web-app"
        && independentFollowUp.reviewSubject === "web-app"
        && independentFollowUp.verifierSelection?.targetName === "test-agent",
      independentReworkTaskNamesReviewSubject: independentFollowUp.message.includes("主 Agent 返工工作单：test-agent")
        && independentFollowUp.message.includes("独立复核对象：web-app")
        && independentFollowUp.userTaskPreview.includes("复核 web-app"),
      independentReworkBuildsNativeTestAgentHandoff: independentHandoff?.schema === "ccm-test-agent-handoff-v1"
        && independentHandoffProject?.name === "web-app"
        && independentHandoff?.metadata?.reviewSubject === "web-app"
        && independentHandoff?.metadata?.verifier === "test-agent"
        && independentHandoffReviewInstructions.includes("独立复核")
        && independentHandoffReviewInstructions.includes("不得只复述原实现者结论")
        && independentHandoff?.originalUserGoal.includes("完善订单详情页")
        && independentHandoff?.review_subject === "web-app"
        && !independentHandoff?.work_order,
      descriptiveVerificationEvidenceIsNotExecutedAsShell: commandOnlyVerificationCommands.length === 2
        && commandOnlyVerificationCommands[0] === "npm run test"
        && commandOnlyVerificationCommands[1] === "npm run build"
        && commandOnlyVerificationCommands.every((command: string) => !command.includes("node scripts/") && !command.includes("→")),
      commandOnlyHandoffCarriesAdversarialWaiver: commandOnlyHandoff?.options?.requireAdversarialProbe === false
        && String(commandOnlyHandoff?.options?.adversarialProbeWaiver || "").includes("没有已配置的 HTTP、浏览器或用户输入攻击面"),
      testAgentAcceptanceExcludesCoordinatorResponsibilities: independentHandoffAcceptance.includes("订单详情变更覆盖用户目标")
        && commandOnlyAcceptanceCriteria.some((criterion: string) => criterion.includes("导出的静态常量值符合需求"))
        && commandOnlyAcceptanceCriteria.some((criterion: string) => criterion.includes("命令 npm run test 必须成功执行"))
        && commandOnlyAcceptanceCriteria.every((criterion: string) => !criterion.includes("主 Agent")
          && !criterion.includes("最终总结")
          && !criterion.includes("实际文件变更")
          && !criterion.includes("验收项目子 Agent")
          && !criterion.includes("TestAgent")
          && !criterion.includes("项目执行成员必须说明")
          && !criterion.includes("返工再复验"))
        && commandOnlyCompletedTasks.every((item: string) => !item.includes("基于最新项目状态核对")),
      independentReworkKeepsNativeHandoffOutOfVisibleText: independentFollowUp.message.includes("TestAgent 原生复核交接单")
        && !independentFollowUp.message.includes("```json")
        && !independentFollowUp.message.includes("ccm-test-agent-handoff-v1"),
      nativeTestAgentReportBecomesIndependentReviewReceipt: nativeTestAgentReceipt.status === "done"
        && nativeTestAgentReceipt.filesChanged.length === 0
        && nativeTestAgentReceipt.independentReview?.[0]?.reviewSubject === "web-app"
        && nativeTestAgentReceipt.independentReview?.[0]?.verdict === "passed"
        && nativeTestAgentReceipt.verification.some((item: string) => item.includes("npm test")),
      nativeTestAgentReceiptConsumesVerdictArtifact: nativeTestAgentReceipt.testAgentReport?.verdict?.schema === "ccm-test-agent-verdict-v1"
        && nativeTestAgentReceipt.testAgentReport?.verdict?.canAccept === true
        && nativeTestAgentReceipt.testAgentReport?.verdict?.needsRework === false
        && nativeTestAgentReceipt.summary.includes("可以接受")
        && nativeTestAgentReceipt.actions.some((item: string) => item.includes("保留 TestAgent 报告和证据清单")),
      nativeFailedTestAgentReceiptRequestsRework: failedNativeTestAgentReceipt.status === "failed"
        && failedNativeTestAgentReceipt.independentReview?.[0]?.verdict === "failed"
        && failedNativeTestAgentReceipt.summary.includes("需要返工")
        && failedNativeTestAgentReceipt.blockers.some((item: string) => item.includes("浏览器检查") && item.includes("登录恢复浏览器复核"))
        && failedNativeTestAgentReceipt.blockers.some((item: string) => item.includes("必检项 命令验证未覆盖"))
        && failedNativeTestAgentReceipt.blockers.some((item: string) => item.includes("验收条件未通过"))
        && failedNativeTestAgentReceipt.needs.some((item: string) => item.includes("打开失败截图核对页面"))
        && failedNativeTestAgentReceipt.needs.some((item: string) => item.includes("把失败检查项带回给原实现成员返工"))
        && failedNativeTestAgentReceipt.needs.some((item: string) => item.includes("自动重新运行 TestAgent 复核"))
        && failedNativeTestAgentReceipt.actions.some((item: string) => item.includes("读取 TestAgent 裁决：需要返工")),
      nativeTestAgentUnknownCoverageReportBlocksWithoutVerdictArtifact: unknownCoverageTestAgentReceipt.status === "blocked"
        && unknownCoverageTestAgentReceipt.independentReview?.[0]?.verdict === "blocked"
        && unknownCoverageTestAgentReceipt.summary.includes("需要人工确认")
        && unknownCoverageTestAgentReceipt.testAgentReport?.verdict?.schema === "ccm-test-agent-verdict-v1"
        && unknownCoverageTestAgentReceipt.testAgentReport?.verdict?.canAccept === false
        && unknownCoverageTestAgentReceipt.testAgentReport?.verdict?.needsHuman === true
        && unknownCoverageTestAgentReceipt.testAgentReport?.verdict?.unknownAcceptanceCriteria?.length === 1
        && unknownCoverageTestAgentReceipt.blockers.some((item: string) => item.includes("验收条件待确认"))
        && unknownCoverageTestAgentReceipt.needs.some((item: string) => item.includes("补齐未覆盖的验证证据"))
        && unknownCoverageTestAgentReceipt.needs.every((item: string) => !item.includes("可以接受"))
        && unknownCoverageTestAgentReceipt.actions.some((item: string) => item.includes("根据报告形成 TestAgent 裁决：需要人工确认")),
      nativeTestAgentUnknownCoverageVisibleOutputDoesNotAccept: unknownCoverageTestAgentVisibleOutput.includes("独立复核需要人工确认")
        && unknownCoverageTestAgentVisibleOutput.includes("结论：部分通过；建议：需要人工确认")
        && unknownCoverageTestAgentVisibleOutput.includes("复核裁决：需要人工确认")
        && unknownCoverageTestAgentVisibleOutput.includes("验收条件待确认")
        && !unknownCoverageTestAgentVisibleOutput.includes("独立复核通过")
        && !unknownCoverageTestAgentVisibleOutput.includes("复核裁决：可以接受")
        && !/verdict\.json|C:\/tmp|ccm-test-agent-verdict-v1/i.test(unknownCoverageTestAgentVisibleOutput),
      nativeTestAgentNotVerifiedCoverageReportRequestsReworkWithoutVerdictArtifact: notVerifiedCoverageTestAgentReceipt.status === "failed"
        && notVerifiedCoverageTestAgentReceipt.independentReview?.[0]?.verdict === "failed"
        && notVerifiedCoverageTestAgentReceipt.summary.includes("需要返工")
        && notVerifiedCoverageTestAgentReceipt.testAgentReport?.verdict?.schema === "ccm-test-agent-verdict-v1"
        && notVerifiedCoverageTestAgentReceipt.testAgentReport?.verdict?.canAccept === false
        && notVerifiedCoverageTestAgentReceipt.testAgentReport?.verdict?.needsRework === true
        && notVerifiedCoverageTestAgentReceipt.testAgentReport?.verdict?.failedRequiredChecks?.length === 1
        && notVerifiedCoverageTestAgentReceipt.testAgentReport?.verdict?.failedAcceptanceCriteria?.length === 1
        && notVerifiedCoverageTestAgentReceipt.blockers.some((item: string) => item.includes("必检项 浏览器流程未覆盖"))
        && notVerifiedCoverageTestAgentReceipt.blockers.some((item: string) => item.includes("验收条件未通过"))
        && notVerifiedCoverageTestAgentReceipt.needs.some((item: string) => item.includes("自动重新运行 TestAgent 复核"))
        && notVerifiedCoverageTestAgentReceipt.actions.some((item: string) => item.includes("根据报告形成 TestAgent 裁决：需要返工")),
      nativeTestAgentNotVerifiedCoverageVisibleOutputShowsRework: notVerifiedCoverageTestAgentVisibleOutput.includes("独立复核要求返工")
        && notVerifiedCoverageTestAgentVisibleOutput.includes("结论：未通过；建议：需要返工")
        && notVerifiedCoverageTestAgentVisibleOutput.includes("复核裁决：需要返工")
        && notVerifiedCoverageTestAgentVisibleOutput.includes("必检项 浏览器流程未覆盖")
        && notVerifiedCoverageTestAgentVisibleOutput.includes("验收条件未通过")
        && !notVerifiedCoverageTestAgentVisibleOutput.includes("复核裁决：可以接受")
        && !/verdict\.json|C:\/tmp|ccm-test-agent-verdict-v1/i.test(notVerifiedCoverageTestAgentVisibleOutput),
      nativeFailedTestAgentVisibleOutputShowsReworkPath: failedNativeTestAgentVisibleOutput.includes("独立复核要求返工")
        && failedNativeTestAgentVisibleOutput.includes("结论：未通过；建议：需要返工")
        && failedNativeTestAgentVisibleOutput.includes("复核裁决：需要返工")
        && failedNativeTestAgentVisibleOutput.includes("返工重点")
        && failedNativeTestAgentVisibleOutput.includes("浏览器检查")
        && failedNativeTestAgentVisibleOutput.includes("排查建议")
        && failedNativeTestAgentVisibleOutput.includes("打开失败截图核对页面")
        && failedNativeTestAgentVisibleOutput.includes("待补齐项")
        && failedNativeTestAgentVisibleOutput.includes("必检项 命令验证未覆盖")
        && failedNativeTestAgentVisibleOutput.includes("验收条件未通过")
        && failedNativeTestAgentVisibleOutput.includes("把失败检查项带回给原实现成员返工")
        && failedNativeTestAgentVisibleOutput.includes("自动重新运行 TestAgent 复核"),
      nativeFailedTestAgentVisibleOutputHidesRawVerdict: failedNativeTestAgentOutput.includes("CCM_AGENT_RECEIPT")
        && !/needsRework|failedRequiredChecks|report_json|verdict\.json|artifact-manifest\.json|browser-artifacts|C:\/tmp|\bfailed\b|\brework\b|networkLogPath/i.test(failedNativeTestAgentVisibleOutput),
      nativeTestAgentOutputCarriesReceiptAndArtifacts: nativeTestAgentOutput.includes("CCM_AGENT_RECEIPT")
        && nativeTestAgentReceipt.testAgentReport?.artifactFiles?.reportMarkdownPath?.includes("report.md")
        && nativeTestAgentReceipt.testAgentReport?.artifactFiles?.manifestPath?.includes("artifact-manifest.json")
        && nativeTestAgentVisibleOutput.includes("证据归档")
        && nativeTestAgentVisibleOutput.includes("技术详情")
        && nativeTestAgentVisibleOutput.includes("TestAgent 独立复核完成")
        && !/C:\/tmp|artifact-manifest\.json|report\.md|verdict\.json/i.test(nativeTestAgentVisibleOutput),
      nativeTestAgentVisibleOutputUsesFriendlyLabels: nativeTestAgentVisibleOutput.includes("独立复核通过")
        && nativeTestAgentVisibleOutput.includes("结论：通过；建议：可以接受")
        && nativeTestAgentVisibleOutput.includes("复核裁决：可以接受")
        && nativeTestAgentVisibleOutput.includes("命令 npm test 通过")
        && !/\bpassed\b|\baccept\b|verified command|blocked\/needs|exit=0/i.test(nativeTestAgentVisibleOutput),
      nativeTestAgentReceiptIncludesBrowserEvidenceSummary: nativeTestAgentReceipt.verification.some((item: string) => item.includes("浏览器交互"))
        && nativeTestAgentReceipt.verification.some((item: string) => item.includes("浏览器网络"))
        && nativeTestAgentReceipt.testAgentReport?.verdict?.browserInteractionSummary?.length === 1
        && nativeTestAgentReceipt.testAgentReport?.verdict?.browserNetworkSummary?.length === 1,
      nativeTestAgentReceiptIncludesBrowserFlowSummary: nativeTestAgentReceipt.verification.some((item: string) => item.includes("真实浏览器验收") && item.includes("1 个通过"))
        && nativeTestAgentReceipt.testAgentReport?.verdict?.browserFlowSummary?.total === 1
        && nativeTestAgentReceipt.testAgentReport?.browserFlowSummary?.criteriaCount === 1
        && nativeTestAgentReceipt.testAgentReport?.verdict?.requiredCheckSummary
        && nativeTestAgentReceipt.testAgentReport?.verdict?.acceptanceSummary,
      nativeTestAgentReceiptIncludesSafeAuthenticationSummary: nativeTestAgentReceipt.verification.some((item: string) =>
        item.includes("登录态浏览器验收") && item.includes("2 项通过") && item.includes("2 个已登录会话")
      )
        && nativeTestAgentReceipt.testAgentReport?.browserAuthenticationSummary?.configuredChecks === 2
        && nativeTestAgentReceipt.testAgentReport?.verdict?.browserAuthenticationSummary?.passedChecks === 2
        && !/credentialEnvNames|TEST_EMAIL|TEST_PASSWORD|storageState|cookie|token|sha/i.test(JSON.stringify({
          report: nativeTestAgentReceipt.testAgentReport?.browserAuthenticationSummary,
          verdict: nativeTestAgentReceipt.testAgentReport?.verdict?.browserAuthenticationSummary,
          summary: nativeTestAgentReviewSummary,
          visible: nativeTestAgentVisibleOutput,
        })),
      nativeTestAgentReceiptIncludesActionEffectAndAdversarialEvidence: nativeTestAgentReceipt.verification.some((item: string) =>
        item.includes("操作结果验证") && item.includes("产生预期变化")
      )
        && nativeTestAgentReceipt.verification.some((item: string) =>
          item.includes("边界与异常验证") && item.includes("与当前目标相关并通过")
        )
        && nativeTestAgentReceipt.testAgentReport?.verdict?.browserActionEffectSummary?.changed === 1
        && nativeTestAgentReceipt.testAgentReport?.verdict?.adversarialEvidenceSummary?.status === "verified",
      failedActionEffectAndAdversarialEvidenceOverridePass: failedNativeTestAgentReceipt.status === "failed"
        && failedNativeTestAgentReceipt.testAgentReport?.verdict?.canAccept === false
        && failedNativeTestAgentReceipt.testAgentReport?.verdict?.needsRework === true
        && failedNativeTestAgentReceipt.blockers.some((item: string) => item.includes("没有产生可见效果"))
        && failedNativeTestAgentReceipt.blockers.some((item: string) => item.includes("边界检查") && item.includes("未通过"))
        && failedNativeTestAgentReviewSummary.rows.some((item: string) => item.includes("操作结果验证"))
        && failedNativeTestAgentReviewSummary.rows.some((item: string) => item.includes("边界与异常验证"))
        && !/token=hidden|duplicate_submit|playwright|changedSignals/i.test(JSON.stringify(failedNativeTestAgentReviewSummary)),
      incompleteActionRecoveryAndAdversarialEvidenceRequireRecheck: needsRecheckReceipt.status === "blocked"
        && needsRecheckReceipt.independentReview?.[0]?.verdict === "needs_recheck"
        && needsRecheckReceipt.testAgentReport?.verdict?.canAccept === false
        && needsRecheckReceipt.testAgentReport?.verdict?.needsRework === false
        && needsRecheckReceipt.testAgentReport?.verdict?.needsRecheck === true
        && needsRecheckReviewSummary.status === "needs_recheck"
        && needsRecheckReviewSummary.status_label === "需复验"
        && needsRecheckReviewSummary.rows.some((item: string) => item.includes("暂时无法确认页面效果"))
        && needsRecheckReviewSummary.rows.some((item: string) => item.includes("不代表实现失败"))
        && needsRecheckReviewSummary.rows.some((item: string) => item.includes("TestAgent 工作单"))
        && needsRecheckReviewSummary.next_action.includes("重新运行 TestAgent")
        && !needsRecheckReviewSummary.headline.includes("原实现成员返工")
        && needsRecheckReceipt.needs.every((item: string) => !item.includes("决定是否返工原实现成员")),
      needsRecheckVisibleOutputAvoidsImplementationRework: needsRecheckVisibleOutput.includes("独立复核还没有闭环")
        && needsRecheckVisibleOutput.includes("建议：重新复验")
        && needsRecheckVisibleOutput.includes("不代表实现失败")
        && needsRecheckVisibleOutput.includes("TestAgent 工作单")
        && !needsRecheckVisibleOutput.includes("复核裁决：需要返工")
        && !/hidden-session|unsafe duplicate side effect|rawSessionId|token=|duplicate_submit|playwright/i.test(needsRecheckVisibleOutput),
      failedAuthenticationOverridesLegacyPass: failedAuthenticationReceipt.status === "failed"
        && failedAuthenticationReceipt.testAgentReport?.verdict?.canAccept === false
        && failedAuthenticationReceipt.testAgentReport?.verdict?.needsRework === true
        && failedAuthenticationReviewSummary.status === "needs_rework"
        && failedAuthenticationReviewSummary.rows.some((item: string) => item.includes("登录态浏览器验收") && item.includes("1 项未通过"))
        && !/PRIVATE_TEST_LOGIN|PRIVATE_TEST_PASSWORD|credentialEnvNames|storageState|cookie|token|sha/i.test(JSON.stringify(failedAuthenticationReviewSummary)),
      blockedAuthenticationNeedsUserWithoutLeakingCredentials: blockedAuthenticationReceipt.status === "blocked"
        && blockedAuthenticationReceipt.testAgentReport?.verdict?.canAccept === false
        && blockedAuthenticationReceipt.testAgentReport?.verdict?.needsHuman === true
        && blockedAuthenticationReviewSummary.status === "needs_user"
        && blockedAuthenticationReviewSummary.rows.some((item: string) => item.includes("测试账号或登录条件"))
        && !/PRIVATE_TEST_LOGIN|PRIVATE_TEST_PASSWORD|credentialEnvNames|storageState|cookie|token|sha/i.test(JSON.stringify(blockedAuthenticationReviewSummary)),
      nativeTestAgentReceiptIncludesMultiSessionBrowserSummary: nativeTestAgentReceipt.verification.some((item: string) => item.includes("多人协作浏览器验收") && item.includes("2 个通过"))
        && nativeTestAgentReceipt.testAgentReport?.verdict?.browserMultiSessionSummary?.total === 2
        && nativeTestAgentReceipt.testAgentReport?.browserMultiSessionSummary?.parallelGroupCount === 2
        && failedNativeTestAgentReceipt.status === "failed"
        && failedNativeTestAgentReceipt.testAgentReport?.verdict?.canAccept === false
        && failedNativeTestAgentReceipt.testAgentReport?.verdict?.needsRework === true
        && failedNativeTestAgentReceipt.blockers.some((item: string) => item.includes("观察方") && item.includes("未通过")),
      nativeTestAgentReviewSummaryReadyForGroupCard: nativeTestAgentReviewSummary.status === "passed"
        && nativeTestAgentReviewSummary.rows.some((item: string) => item.includes("登录态浏览器验收"))
        && nativeTestAgentReviewSummary.rows.some((item: string) => item.includes("真实浏览器验收"))
        && nativeTestAgentReviewSummary.rows.some((item: string) => item.includes("多人协作浏览器验收"))
        && failedNativeTestAgentReviewSummary.status === "needs_rework"
        && failedNativeTestAgentReviewSummary.rows.some((item: string) => item.includes("表单流程") && item.includes("未通过"))
        && failedNativeTestAgentReviewSummary.rows.some((item: string) => item.includes("观察方") && item.includes("未通过"))
        && !/acceptance_form_flow|assert:networkNoErrors|session:observer|#raw-observer|locator|browserMultiSessionSummary|ccm-test-agent/i.test(JSON.stringify(failedNativeTestAgentReviewSummary.rows)),
      configuredMultiSessionBrowserCheckAddsRequiredCoverage: hasConfiguredTestAgentMultiSessionBrowserCheck([{
        sessions: [{ name: "sender" }, { name: "receiver" }],
        sessionSteps: [{ session: "sender", action: "click" }],
      }]) && !hasConfiguredTestAgentMultiSessionBrowserCheck([{
        sessions: [{ name: "single" }],
        sessionSteps: [{ session: "single", action: "click" }],
      }]),
      nativeTestAgentPlanSummaryShowsMultiSessionWork: nativePlanSummary.includes("6 个跨会话步骤")
        && nativePlanSummary.includes("2 组并行动作"),
      nativeTestAgentReceiptIncludesUploadDownloadEvidenceSummary: nativeTestAgentReceipt.verification.some((item: string) => item.includes("文件上传") && item.includes("notes.txt") && item.includes("meta.json"))
        && nativeTestAgentReceipt.verification.some((item: string) => item.includes("文件下载") && item.includes("tasks.csv")),
      nativeTestAgentReceiptIncludesTableEvidenceSummary: nativeTestAgentReceipt.verification.some((item: string) => item.includes("表格验证") && item.includes("3 项表格")),
      nativeTestAgentVisibleOutputIncludesBrowserEvidenceSummary: nativeTestAgentVisibleOutput.includes("浏览器证据")
        && nativeTestAgentVisibleOutput.includes("多人协作浏览器验收")
        && nativeTestAgentVisibleOutput.includes("浏览器交互")
        && nativeTestAgentVisibleOutput.includes("浏览器网络")
        && !/session:observer|#raw-observer|locator|browserMultiSessionSummary|networkLogPath|network\.log|127\.0\.0\.1:5173|C:\/tmp/i.test(nativeTestAgentVisibleOutput),
      nativeTestAgentVisibleOutputIncludesUploadDownloadEvidenceSummary: nativeTestAgentVisibleOutput.includes("文件上传")
        && nativeTestAgentVisibleOutput.includes("notes.txt")
        && nativeTestAgentVisibleOutput.includes("meta.json")
        && nativeTestAgentVisibleOutput.includes("文件下载")
        && nativeTestAgentVisibleOutput.includes("tasks.csv")
        && !/browser-artifacts|downloads|C:\/tmp/i.test(nativeTestAgentVisibleOutput),
      nativeTestAgentVisibleOutputIncludesTableEvidenceSummary: nativeTestAgentVisibleOutput.includes("表格验证")
        && nativeTestAgentVisibleOutput.includes("3 项表格")
        && !/#orders|A-100|B-200|column=Status|column=Total/i.test(nativeTestAgentVisibleOutput),
      nativeTestAgentTableFailureSummaryHidesLocatorDetails: failedTableEvidenceSummary.includes("表格验证")
        && failedTableEvidenceSummary.includes("表格断言未通过")
        && failedTableEvidenceSummary.includes("技术详情")
        && !/#orders|B-200|column=Status|actual=Draft/i.test(failedTableEvidenceSummary),
      nativeTestAgentPlanSummaryIsUserReadable: nativePlanSummary.includes("TestAgent 复核计划")
        && nativePlanSummary.includes("1 个命令")
        && !/ccm-test-agent-execution-plan-v1|raw payload|trace_id/i.test(nativePlanSummary),
      nativeTestAgentPlanSummaryUsesFriendlyArtifactLabels: nativePlanSummary.includes("结构化报告")
        && nativePlanSummary.includes("报告文档")
        && nativePlanSummary.includes("证据清单")
        && nativePlanSummary.includes("网络记录")
        && !/report_json|report_markdown|artifact_manifest|browser_har/i.test(nativePlanSummary),
      nativeTestAgentInvalidPlanBlocksBeforeExecution: nativePlanBlockedReceipt.status === "blocked"
        && nativePlanBlockedReceipt.filesChanged.length === 0
        && nativePlanBlockedReceipt.blockers.some((item: string) => item.includes("missing_work_dir"))
        && nativePlanBlockedOutput.includes("CCM_AGENT_RECEIPT")
        && nativePlanBlockedOutput.includes("复核计划未通过"),
      nativeTestAgentRunnerBypassesThirdPartyToolSync: nativeTestAgentRuntimeContext.dispatchBlocked === false
        && nativeTestAgentRuntimeContext.audit.runtime === "test-agent-native"
        && nativeTestAgentRuntimeContext.audit.mode === "native-test-agent-runner",
      independentReviewGateCreatesFollowUp: independentGateFollowUps.length === 1
        && independentGateFollowUps[0].targetName === "web-app"
        && independentGateFollowUps[0].rework_kind === "independent_review_gate"
        && independentGateFollowUps[0].message.includes("非原实现者")
        && independentGateFollowUps[0].independentReviewGate?.required === true,
      independentReviewGateRoutesToTestAgent: independentGateRoutedFollowUp?.targetName === "test-agent"
        && independentGateRoutedFollowUp?.reviewSubject === "web-app"
        && independentGateRoutedFollowUp?.message.includes("独立复核对象：web-app"),
      failedIndependentReviewCreatesImplementationRework: failedReviewReworkFollowUps.length === 1
        && failedReviewReworkFollowUps[0].targetName === "web-app"
        && failedReviewReworkFollowUps[0].rework_kind === "test_agent_failed_review_rework"
        && failedReviewReworkFollowUps[0].reviewFailed === true
        && failedReviewReworkFollowUps[0].message.includes("修复后重新提交")
        && failedReviewReworkFollowUps[0].message.includes("重新运行 TestAgent 复核"),
      failedIndependentReviewRoutesBackToImplementationWorker: failedReviewRoutedFollowUp?.targetName === "web-app"
        && failedReviewRoutedFollowUp?.project === "web-app"
        && failedReviewRoutedFollowUp?.continuationOf === "web-app"
        && failedReviewRoutedFollowUp?.reworkRoute?.strategy === "continue_same_worker"
        && failedReviewRoutedFollowUp?.continuationStrategy === "same_worker_scratchpad",
      failedIndependentReviewDoesNotSpawnVerifierAgain: failedReviewRoutedFollowUp?.targetName !== "test-agent"
        && !failedReviewRoutedFollowUp?.testAgentHandoff
        && !failedReviewRoutedFollowUp?.test_agent_handoff
        && failedReviewRoutedFollowUp?.userTaskPreview.includes("返工 web-app"),
      independentReworkBlocksWithoutVerifier: blockedIndependentFollowUp.dispatchBlocked === true
        && blockedIndependentFollowUp.verifierSelection?.available === false
        && !blockedIndependentFollowUp.message
        && blockedIndependentFollowUp.userTaskPreview.includes("缺少独立验证 Agent"),
      wrongDirectionRequestsStop: wrongDirectionRoute.strategy === "stop_wrong_direction_then_continue" && wrongDirectionRoute.requires_stop === true,
      wrongDirectionContinuationInterruptsOldRun: wrongDirectionContinuation?.interrupt_current_run === true
        && wrongDirectionContinuation.replan_required === true
        && wrongDirectionContinuation.instructions?.some((item: string) => item.includes("旧方向"))
        && wrongDirectionContinuation.avoid?.some((item: string) => item.includes("旧方向"))
        && wrongDirectionContinuation.preserved_context?.some((item: string) => item.includes("终止 1 个进程")),
      routeLabelsAreUserFriendly: [failedRoute, independentRoute, wrongDirectionRoute].every((route: any) => /子 Agent|验证|方向|继续|复核/.test(String(route.user_label || "")) && !/scratchpad|trace_id|session_id|CCM_AGENT_RECEIPT/i.test(String(route.user_label || ""))),
    }
  );
}
