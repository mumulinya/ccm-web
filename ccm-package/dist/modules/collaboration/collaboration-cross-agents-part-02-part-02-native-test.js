"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.runNativeTestAgentDispatchBranch = runNativeTestAgentDispatchBranch;
// Behavior-freeze helper extracted from collaboration-cross-agents-part-02-part-02.ts.
const crypto = __importStar(require("crypto"));
async function runNativeTestAgentDispatchBranch(input) {
    const { mention, deps, ctx, targetName, groupId, taskId, streamRes, testAgentHandoffPayload, testAgentWorkDirPolicy, runtimeAttemptTimeoutMs, laneExecutionId, sourceTask, executionOrder, activeTaskSession, testAgentProjectWorkDir, tWorkDir, state, } = input;
    const { addTaskLog, appendTaskTimelineEvent, writeSse, runTestAgentCliJob, compactMemoryText, summarizeNativeTestAgentExecutionPlan, buildNativeTestAgentPlanBlockedReceipt, formatNativeTestAgentPlanBlockedOutput, transitionExecution, buildNativeTestAgentReceipt, uniqueStrings, runMainAgentPostReviewSpotCheck, buildPostReviewSpotCheckSummary, buildNativeTestAgentReviewSummary, formatNativeTestAgentOutput, getTestAgentHandoffReviewSubject, } = deps;
    let { testAgentPlanDispatch, testAgentExecutionPlan, targetReceipt, tOutput, targetSessionSucceeded, targetSessionError, testAgentInvocationResult, testAgentCliDispatch, testAgentNativeReport, testAgentReviewSummary, targetWorkEvents, } = state;
    const testAgentActivityKey = "TestAgent";
    const reviewSubjectLabel = getTestAgentHandoffReviewSubject(testAgentHandoffPayload) || targetName || "原实现 Agent";
    ctx.setAgentActivity(testAgentActivityKey, "planning", `正在生成 ${reviewSubjectLabel} 的独立复核计划`, { tab: "groups", groupId }, 150000, {
        actorKind: "test-agent",
        displayName: "TestAgent",
        detail: `复核对象：${reviewSubjectLabel}`,
        source: "test-agent",
    });
    ctx.broadcastPetSpeech(testAgentActivityKey, { role: "status", text: `正在为 ${reviewSubjectLabel} 生成独立复核计划...`, source: "test-agent" });
    if (taskId) {
        addTaskLog(taskId, "info", `${targetName} 开始通过 TestAgent CLI 执行独立复核`);
        appendTaskTimelineEvent(taskId, {
            type: "test_agent_native_execution_start",
            title: `${targetName} 开始原生复核`,
            detail: `复核对象：${getTestAgentHandoffReviewSubject(testAgentHandoffPayload) || "原实现 Agent"}`,
            status: "active",
            phase: "executing",
            agent: targetName,
            data: { test_agent_handoff: testAgentHandoffPayload },
        });
    }
    writeSse(streamRes, { type: "status", text: `${targetName} 正在生成 TestAgent 复核计划...`, agent: targetName });
    const testAgentPlanRun = await runTestAgentCliJob({
        mode: "plan",
        handoff: testAgentHandoffPayload,
        taskId,
        groupId,
        timeoutMs: 120000,
        allowedWorkDirs: testAgentWorkDirPolicy.allowedWorkDirs,
        idempotencyKey: `${taskId || groupId}:${testAgentHandoffPayload?.id || "handoff"}:plan`,
    });
    testAgentPlanDispatch = {
        schema: "ccm-test-agent-cli-plan-dispatch-v2",
        plan: testAgentPlanRun.plan,
        runnerRecord: testAgentPlanRun.record,
        handoffPath: testAgentPlanRun.record.handoffPath,
        exitCode: testAgentPlanRun.record.exitCode,
        signal: testAgentPlanRun.record.signal,
        error: testAgentPlanRun.record.error,
        stdout: testAgentPlanRun.stdout,
        stderr: testAgentPlanRun.stderr,
        reused: testAgentPlanRun.reused,
    };
    testAgentExecutionPlan = testAgentPlanDispatch.plan;
    if (!testAgentExecutionPlan) {
        throw new Error([
            "TestAgent CLI --plan-only 未返回可解析的 ccm-test-agent-execution-plan-v1",
            testAgentPlanDispatch.error ? `error=${testAgentPlanDispatch.error}` : "",
            testAgentPlanDispatch.stderr ? `stderr=${compactMemoryText(testAgentPlanDispatch.stderr, 500)}` : "",
            testAgentPlanDispatch.stdout ? `stdout=${compactMemoryText(testAgentPlanDispatch.stdout, 500)}` : "",
        ].filter(Boolean).join("；"));
    }
    const planSummary = summarizeNativeTestAgentExecutionPlan(testAgentExecutionPlan);
    if (taskId) {
        addTaskLog(taskId, testAgentExecutionPlan.valid ? "info" : "warning", `${targetName} ${planSummary}`);
        appendTaskTimelineEvent(taskId, {
            type: "test_agent_execution_plan_ready",
            title: `${targetName} 复核计划已生成`,
            detail: planSummary,
            status: testAgentExecutionPlan.valid ? "ok" : "warn",
            phase: "planning",
            agent: targetName,
            data: {
                test_agent_execution_plan: testAgentExecutionPlan,
                test_agent_plan_dispatch: {
                    cliPath: testAgentPlanDispatch.cliPath,
                    handoffPath: testAgentPlanDispatch.handoffPath,
                    exitCode: testAgentPlanDispatch.exitCode,
                    signal: testAgentPlanDispatch.signal,
                    stderr: compactMemoryText(testAgentPlanDispatch.stderr, 4000),
                },
            },
        });
    }
    writeSse(streamRes, {
        type: "test_agent_execution_plan_ready",
        taskId,
        task_id: taskId,
        agent: targetName,
        detail: planSummary,
        status: testAgentExecutionPlan.valid ? "ok" : "warn",
        testAgentExecutionPlan,
        test_agent_execution_plan: testAgentExecutionPlan,
        testAgentExecutionPlanSummary: planSummary,
        test_agent_execution_plan_summary: planSummary,
        technical: {
            test_agent_execution_plan: testAgentExecutionPlan,
            test_agent_plan_dispatch: {
                cliPath: testAgentPlanDispatch.cliPath,
                handoffPath: testAgentPlanDispatch.handoffPath,
                exitCode: testAgentPlanDispatch.exitCode,
                signal: testAgentPlanDispatch.signal,
                stderr: compactMemoryText(testAgentPlanDispatch.stderr, 4000),
            },
        },
    });
    writeSse(streamRes, { type: "status", text: testAgentExecutionPlan.valid ? planSummary : `${targetName} 复核计划预检未通过，主 Agent 将修复交接信息后再执行。`, agent: targetName });
    if (!testAgentExecutionPlan.valid) {
        ctx.setAgentActivity(testAgentActivityKey, "debugging", `${reviewSubjectLabel} 复核计划预检未通过，正在修复交接信息`, { tab: "groups", groupId }, 90000, {
            actorKind: "test-agent",
            displayName: "TestAgent",
            detail: `复核对象：${reviewSubjectLabel}`,
            source: "test-agent",
        });
        targetReceipt = buildNativeTestAgentPlanBlockedReceipt(targetName, testAgentExecutionPlan, testAgentPlanDispatch, testAgentHandoffPayload);
        tOutput = formatNativeTestAgentPlanBlockedOutput(targetName, testAgentExecutionPlan, targetReceipt, testAgentHandoffPayload);
        targetSessionSucceeded = false;
        targetSessionError = (targetReceipt.blockers || []).join("；");
    }
    else {
        ctx.setAgentActivity(testAgentActivityKey, "reviewing", `正在复核 ${reviewSubjectLabel}`, { tab: "groups", groupId }, Math.max(runtimeAttemptTimeoutMs, 900000) + 30000, {
            actorKind: "test-agent",
            displayName: "TestAgent",
            detail: `复核对象：${reviewSubjectLabel}`,
            source: "test-agent",
        });
        ctx.broadcastPetSpeech(testAgentActivityKey, { role: "status", text: `正在对 ${reviewSubjectLabel} 进行独立测试和浏览器验证...`, source: "test-agent" });
        writeSse(streamRes, { type: "status", text: `${targetName} 正在用 TestAgent CLI 执行独立复核...`, agent: targetName });
        if (laneExecutionId)
            transitionExecution(laneExecutionId, "running", `${targetName} 正在执行 TestAgent 原生复核`, {
                name: "test_agent.native_runner",
                status: "active",
                data: { work_order_id: testAgentExecutionPlan?.workOrderId || "", handoff_id: testAgentHandoffPayload?.id || "", execution_plan: testAgentExecutionPlan },
            });
        const invocationRun = await runTestAgentCliJob({
            mode: "invocation",
            handoff: testAgentHandoffPayload,
            taskId,
            groupId,
            timeoutMs: Math.max(runtimeAttemptTimeoutMs, 900000),
            allowedWorkDirs: testAgentWorkDirPolicy.allowedWorkDirs,
            idempotencyKey: [
                taskId || groupId,
                testAgentHandoffPayload?.id || "handoff",
                typeof mention === "string" ? "direct" : mention.assignmentId || mention.assignment_id || mention.rework_kind || mention.kind || "review",
                sourceTask?.followup_revision || 0,
                executionOrder,
            ].join(":"),
        });
        testAgentInvocationResult = invocationRun.invocation;
        testAgentCliDispatch = {
            schema: "ccm-test-agent-cli-dispatch-v2",
            invocationResult: testAgentInvocationResult,
            runnerRecord: invocationRun.record,
            handoffPath: invocationRun.record.handoffPath,
            exitCode: invocationRun.record.exitCode,
            signal: invocationRun.record.signal,
            error: invocationRun.record.error,
            stdout: invocationRun.stdout,
            stderr: invocationRun.stderr,
            reused: invocationRun.reused,
        };
        testAgentNativeReport = testAgentInvocationResult?.report || null;
        const invocationContractPassed = testAgentInvocationResult?.schema === "ccm-test-agent-invocation-result-v1"
            && testAgentInvocationResult.status === "completed"
            && testAgentInvocationResult.outputValidation?.valid === true
            && testAgentInvocationResult.artifactVerification?.status === "passed";
        if (!invocationContractPassed || !testAgentNativeReport) {
            throw new Error([
                "TestAgent invocation 未返回通过输出与证据校验的结果",
                testAgentInvocationResult?.status ? `status=${testAgentInvocationResult.status}` : "",
                testAgentInvocationResult?.error ? `invocation=${testAgentInvocationResult.error}` : "",
                testAgentCliDispatch.error ? `error=${testAgentCliDispatch.error}` : "",
                testAgentCliDispatch.stderr ? `stderr=${compactMemoryText(testAgentCliDispatch.stderr, 500)}` : "",
                testAgentCliDispatch.stdout ? `stdout=${compactMemoryText(testAgentCliDispatch.stdout, 500)}` : "",
            ].filter(Boolean).join("；"));
        }
        targetReceipt = buildNativeTestAgentReceipt(targetName, testAgentNativeReport, testAgentHandoffPayload, testAgentExecutionPlan?.metadata?.normalizedWorkOrder || testAgentHandoffPayload, testAgentInvocationResult);
        targetReceipt.testAgentHandoff = testAgentHandoffPayload;
        targetReceipt.test_agent_handoff = testAgentHandoffPayload;
        targetReceipt.testAgentInvocation = {
            schema: testAgentInvocationResult.schema,
            invocationId: testAgentInvocationResult.invocationId,
            status: testAgentInvocationResult.status,
            outcome: testAgentInvocationResult.outcome,
            canAccept: testAgentInvocationResult.canAccept === true,
            inputValidation: testAgentInvocationResult.inputValidation,
            outputValidation: testAgentInvocationResult.outputValidation,
            artifactVerification: testAgentInvocationResult.artifactVerification,
            runner: testAgentCliDispatch.runnerRecord,
        };
        targetReceipt.test_agent_invocation = targetReceipt.testAgentInvocation;
        if (testAgentCliDispatch.runnerRecord?.sourceStable !== true) {
            targetReceipt.status = "blocked";
            targetReceipt.summary = "TestAgent 复核期间源码发生变化，需要基于最新版本重新复验。";
            targetReceipt.blockers = uniqueStrings(["复核开始和结束时的源码指纹不一致，本轮证据不能用于最终验收", ...(targetReceipt.blockers || [])]);
            targetReceipt.needs = uniqueStrings(["等待当前代码状态稳定后，沿用原工作单重新运行 TestAgent", ...(targetReceipt.needs || [])]);
            if (targetReceipt.independentReview?.[0])
                targetReceipt.independentReview[0].verdict = "needs_recheck";
            if (targetReceipt.testAgentReport?.verdict)
                targetReceipt.testAgentReport.verdict.canAccept = false;
        }
        else if (testAgentInvocationResult.canAccept !== true && targetReceipt.status === "done") {
            targetReceipt.status = "blocked";
            targetReceipt.blockers = uniqueStrings(["TestAgent invocation 明确返回 canAccept=false", ...(targetReceipt.blockers || [])]);
            if (targetReceipt.independentReview?.[0])
                targetReceipt.independentReview[0].verdict = "needs_recheck";
        }
        if (targetReceipt.status === "done") {
            writeSse(streamRes, { type: "status", text: "TestAgent 已通过，我正在抽查关键验证...", agent: targetName });
            if (taskId) {
                appendTaskTimelineEvent(taskId, {
                    type: "post_review_spot_check_start",
                    title: "开始完成前抽查",
                    detail: "TestAgent 已通过，主 Agent 正在重跑关键验证",
                    status: "active",
                    phase: "reviewing",
                    agent: "main-agent",
                    data: { report_id: testAgentNativeReport.id, work_order_id: testAgentNativeReport.workOrderId },
                });
            }
            const postReviewSpotCheck = await runMainAgentPostReviewSpotCheck({
                report: testAgentNativeReport,
                taskId,
                projectRoot: testAgentProjectWorkDir || tWorkDir,
                required: true,
                maxCommands: 3,
                timeoutMs: 300000,
            });
            const postReviewSpotCheckSummary = buildPostReviewSpotCheckSummary(postReviewSpotCheck);
            targetReceipt.postReviewSpotCheck = postReviewSpotCheck;
            targetReceipt.post_review_spot_check = postReviewSpotCheck;
            targetReceipt.postReviewSpotCheckSummary = postReviewSpotCheckSummary;
            targetReceipt.post_review_spot_check_summary = postReviewSpotCheckSummary;
            if (taskId) {
                appendTaskTimelineEvent(taskId, {
                    type: "post_review_spot_check_ready",
                    title: "完成前抽查已返回",
                    detail: postReviewSpotCheckSummary?.headline || postReviewSpotCheck.headline,
                    status: postReviewSpotCheck.pass ? "ok" : "warn",
                    phase: "reviewing",
                    agent: "main-agent",
                    data: {
                        post_review_spot_check_summary: postReviewSpotCheckSummary,
                        post_review_spot_check: postReviewSpotCheck,
                    },
                });
            }
            writeSse(streamRes, {
                type: "post_review_spot_check_ready",
                taskId,
                task_id: taskId,
                task_agent_session_id: activeTaskSession?.id || "",
                agent: "main-agent",
                detail: postReviewSpotCheckSummary?.headline || postReviewSpotCheck.headline,
                status: postReviewSpotCheck.pass ? "ok" : "warn",
                postReviewSpotCheckSummary,
                post_review_spot_check_summary: postReviewSpotCheckSummary,
                technical: { post_review_spot_check: postReviewSpotCheck },
            });
        }
        testAgentReviewSummary = buildNativeTestAgentReviewSummary(targetName, testAgentNativeReport, targetReceipt);
        ctx.setAgentActivity(testAgentActivityKey, targetReceipt.status === "done" ? "reviewing" : "debugging", targetReceipt.status === "done"
            ? `${reviewSubjectLabel} 独立复核已通过，主 Agent 正在完成最终验收`
            : `${reviewSubjectLabel} 独立复核发现问题，主 Agent 正在安排返工`, { tab: "groups", groupId }, 90000, { actorKind: "test-agent", displayName: "TestAgent", detail: `复核对象：${reviewSubjectLabel}`, source: "test-agent" });
        ctx.broadcastPetSpeech(testAgentActivityKey, {
            role: targetReceipt.status === "done" ? "status" : "error",
            text: targetReceipt.status === "done"
                ? `${reviewSubjectLabel} 独立复核已通过，正在等待主 Agent 最终验收。`
                : `${reviewSubjectLabel} 复核发现问题，正在安排返工。`,
            source: "test-agent",
        });
        tOutput = formatNativeTestAgentOutput(targetName, testAgentNativeReport, targetReceipt, testAgentHandoffPayload);
        targetSessionSucceeded = targetReceipt.status === "done";
        targetSessionError = targetSessionSucceeded ? "" : (targetReceipt.blockers || []).join("；");
        targetWorkEvents = [...targetWorkEvents, {
                id: "we" + Date.now().toString(36) + crypto.randomBytes(2).toString("hex"),
                time: new Date().toISOString(),
                agent: targetName,
                kind: targetSessionSucceeded ? "tool" : "error",
                text: targetReceipt.summary,
                testAgentReport: {
                    id: testAgentNativeReport.id,
                    workOrderId: testAgentNativeReport.workOrderId,
                    status: testAgentNativeReport.status,
                    recommendation: testAgentNativeReport.recommendation,
                    artifactDir: testAgentNativeReport.artifactDir,
                    artifactFiles: testAgentNativeReport.metadata?.artifactFiles || null,
                },
            }].slice(-80);
        if (taskId) {
            addTaskLog(taskId, targetSessionSucceeded ? "success" : "warning", `${targetName} TestAgent 原生复核完成：${testAgentNativeReport.status} / ${testAgentNativeReport.recommendation}`);
            appendTaskTimelineEvent(taskId, {
                type: "test_agent_native_execution_done",
                title: `${targetName} 原生复核完成`,
                detail: targetReceipt.summary,
                status: targetSessionSucceeded ? "ok" : "warn",
                phase: "executing",
                agent: targetName,
                data: {
                    receipt: targetReceipt,
                    test_agent_report: testAgentNativeReport,
                    test_agent_review_summary: testAgentReviewSummary,
                    test_agent_execution_plan: testAgentExecutionPlan,
                    test_agent_cli_dispatch: {
                        cliPath: testAgentCliDispatch.cliPath,
                        handoffPath: testAgentCliDispatch.handoffPath,
                        exitCode: testAgentCliDispatch.exitCode,
                        signal: testAgentCliDispatch.signal,
                        stderr: compactMemoryText(testAgentCliDispatch.stderr, 4000),
                    },
                },
            });
        }
        writeSse(streamRes, {
            type: "test_agent_review_ready",
            taskId,
            task_id: taskId,
            agent: targetName,
            detail: testAgentReviewSummary?.headline || targetReceipt.summary,
            status: targetSessionSucceeded ? "ok" : "warn",
            receipt: targetReceipt,
            testAgentReport: testAgentNativeReport,
            test_agent_report: testAgentNativeReport,
            testAgentVerdict: targetReceipt?.testAgentReport?.verdict || null,
            test_agent_verdict: targetReceipt?.testAgentReport?.verdict || null,
            testAgentReviewSummary: testAgentReviewSummary,
            test_agent_review_summary: testAgentReviewSummary,
            independentReviewSummary: testAgentReviewSummary,
            independent_review_summary: testAgentReviewSummary,
            independentReview: testAgentReviewSummary?.rows || [],
            independent_review: testAgentReviewSummary?.rows || [],
            postReviewSpotCheckSummary: targetReceipt?.postReviewSpotCheckSummary || null,
            post_review_spot_check_summary: targetReceipt?.post_review_spot_check_summary || null,
            testAgentExecutionPlan: testAgentExecutionPlan,
            test_agent_execution_plan: testAgentExecutionPlan,
            technical: {
                receipt: targetReceipt,
                test_agent_report: testAgentNativeReport,
                test_agent_verdict: targetReceipt?.testAgentReport?.verdict || null,
                test_agent_invocation: targetReceipt?.test_agent_invocation || null,
                test_agent_review_summary: testAgentReviewSummary,
                test_agent_execution_plan: testAgentExecutionPlan,
                post_review_spot_check: targetReceipt?.post_review_spot_check || null,
                failure_step_screenshots: testAgentReviewSummary?.technical?.failure_step_screenshots || [],
                failure_step_screenshot_rows: testAgentReviewSummary?.technical?.failure_step_screenshot_rows || [],
                test_agent_environment_prep: testAgentReviewSummary?.test_agent_environment_prep
                    || testAgentReviewSummary?.testAgentEnvironmentPrep
                    || null,
                test_agent_cli_dispatch: testAgentCliDispatch ? {
                    cliPath: testAgentCliDispatch.cliPath,
                    handoffPath: testAgentCliDispatch.handoffPath,
                    exitCode: testAgentCliDispatch.exitCode,
                    signal: testAgentCliDispatch.signal,
                    stderr: compactMemoryText(testAgentCliDispatch.stderr, 4000),
                } : null,
            },
        });
    }
    state.testAgentPlanDispatch = testAgentPlanDispatch;
    state.testAgentExecutionPlan = testAgentExecutionPlan;
    state.targetReceipt = targetReceipt;
    state.tOutput = tOutput;
    state.targetSessionSucceeded = targetSessionSucceeded;
    state.targetSessionError = targetSessionError;
    state.testAgentInvocationResult = testAgentInvocationResult;
    state.testAgentCliDispatch = testAgentCliDispatch;
    state.testAgentNativeReport = testAgentNativeReport;
    state.testAgentReviewSummary = testAgentReviewSummary;
    state.targetWorkEvents = targetWorkEvents;
}
//# sourceMappingURL=collaboration-cross-agents-part-02-part-02-native-test.js.map