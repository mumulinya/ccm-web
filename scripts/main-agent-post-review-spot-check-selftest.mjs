import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const {
  buildPostReviewSpotCheckSummary,
  runMainAgentPostReviewSpotCheck,
  runPostReviewSpotCheckContractSelfTest,
} = require('../ccm-package/dist/agents/post-review-spot-check.js')

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ccm-post-review-spot-check-'))

try {
  const baseReport = {
    schema: 'ccm-test-agent-report-v1',
    agent: 'test-agent',
    id: 'spot-check-selftest-report',
    workOrderId: 'spot-check-selftest-work-order',
    taskId: 'spot-check-selftest-task',
    groupId: 'spot-check-selftest-group',
    status: 'passed',
    recommendation: 'accept',
    summary: 'TestAgent passed command verification.',
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    durationMs: 1,
    artifactDir: root,
    requiredChecks: ['commands'],
    devServerResults: [],
    httpResults: [],
    browserResults: [],
    browserToolCalls: [],
    browserNetworkSummary: [],
    browserInteractionSummary: [],
    browserProviderSummary: { requested: 'none', resolved: 'none', attempts: [] },
    browserProviderGaps: [],
    failureSummary: [],
    requiredCheckCoverage: [{ check: 'commands', status: 'verified', evidence: ['node --version'] }],
    acceptanceCoverage: [{ criterion: 'verification passes', status: 'verified', evidence: ['node --version'] }],
    evidence: [],
    risks: [],
    blockedReasons: [],
    issues: [],
    metadata: {},
  }

  const passingReport = {
    ...baseReport,
    commandResults: [{
      project: 'selftest',
      command: 'node --version',
      cwd: root,
      status: 'passed',
      exitCode: 0,
      signal: null,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 1,
      stdout: `${process.version}\n`,
      stderr: '',
      output: `${process.version}\n`,
    }],
  }
  const passed = await runMainAgentPostReviewSpotCheck({
    report: passingReport,
    taskId: 'spot-check-selftest-pass',
    projectRoot: root,
    timeoutMs: 30_000,
  })
  assert.equal(passed.pass, true)
  assert.equal(passed.status, 'passed')
  assert.equal(passed.executed_count, 1)
  assert.equal(passed.passed_count, 1)
  assert.equal(passed.checks[0].observed_exit_code, 0)
  assert.match(passed.checks[0].observed_output_preview, /^v\d+/)

  const mismatchReport = {
    ...baseReport,
    id: 'spot-check-selftest-mismatch-report',
    commandResults: [{
      ...passingReport.commandResults[0],
      command: 'node -e "process.exit(3)"',
      stdout: 'claimed pass\n',
      output: 'claimed pass\n',
    }],
  }
  const mismatch = await runMainAgentPostReviewSpotCheck({
    report: mismatchReport,
    taskId: 'spot-check-selftest-mismatch',
    projectRoot: root,
    timeoutMs: 30_000,
  })
  assert.equal(mismatch.pass, false)
  assert.equal(mismatch.status, 'needs_recheck')
  assert.equal(mismatch.mismatch_count, 1)
  assert.equal(mismatch.checks[0].matches_review, false)

  const missingCommands = await runMainAgentPostReviewSpotCheck({
    report: { ...baseReport, id: 'spot-check-selftest-missing-report', commandResults: [] },
    taskId: 'spot-check-selftest-missing',
    projectRoot: root,
  })
  assert.equal(missingCommands.pass, false)
  assert.equal(missingCommands.status, 'needs_recheck')
  assert.match(missingCommands.headline, /没有可抽查的命令记录/)

  const incompleteCommand = await runMainAgentPostReviewSpotCheck({
    report: {
      ...baseReport,
      id: 'spot-check-selftest-incomplete-report',
      commandResults: [{
        project: 'selftest',
        command: 'node --version',
        cwd: root,
        status: 'passed',
        exitCode: 0,
        stdout: `${process.version}\n`,
      }],
    },
    taskId: 'spot-check-selftest-incomplete',
    projectRoot: root,
  })
  assert.equal(incompleteCommand.pass, false)
  assert.equal(incompleteCommand.incomplete_command_block_count, 1)
  assert.equal(incompleteCommand.checks[0].command_block_complete, false)

  const outsideRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ccm-post-review-outside-'))
  try {
    const outsideDirectory = await runMainAgentPostReviewSpotCheck({
      report: {
        ...passingReport,
        id: 'spot-check-selftest-outside-report',
        commandResults: [{
          ...passingReport.commandResults[0],
          cwd: outsideRoot,
        }],
      },
      taskId: 'spot-check-selftest-outside',
      projectRoot: root,
    })
    assert.equal(outsideDirectory.pass, false)
    assert.equal(outsideDirectory.unavailable_command_count, 1)
    assert.equal(outsideDirectory.checks[0].observed_status, 'blocked')
  } finally {
    fs.rmSync(outsideRoot, { recursive: true, force: true })
  }

  const contradictoryExit = await runMainAgentPostReviewSpotCheck({
    report: {
      ...passingReport,
      id: 'spot-check-selftest-contradictory-exit-report',
      commandResults: [{
        ...passingReport.commandResults[0],
        exitCode: 3,
      }],
    },
    taskId: 'spot-check-selftest-contradictory-exit',
    projectRoot: root,
  })
  assert.equal(contradictoryExit.pass, false)
  assert.equal(contradictoryExit.mismatch_count, 1)
  assert.match(contradictoryExit.checks[0].error, /退出状态不一致/)

  const visibleSummary = buildPostReviewSpotCheckSummary(mismatch)
  assert.match(visibleSummary.headline, /我已抽查/)
  assert.doesNotMatch(JSON.stringify(visibleSummary), /主 Agent/)
  assert.doesNotMatch(JSON.stringify(visibleSummary), /node -e|process\.exit|exitCode|stdout|stderr|[A-Za-z]:[\\/]/)

  const contract = runPostReviewSpotCheckContractSelfTest()
  assert.equal(contract.pass, true)

  console.log(JSON.stringify({
    pass: true,
    passed: {
      executed: passed.executed_count,
      matched: passed.passed_count,
      status: passed.status,
    },
    mismatch: {
      executed: mismatch.executed_count,
      mismatches: mismatch.mismatch_count,
      status: mismatch.status,
    },
    missing: missingCommands.status,
    incomplete: incompleteCommand.status,
    contradictoryExit: contradictoryExit.status,
    contract: contract.pass,
  }, null, 2))
} finally {
  fs.rmSync(root, { recursive: true, force: true })
}
