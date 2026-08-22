import assert from 'node:assert/strict'
import fs from 'node:fs'

const transcript = fs.readFileSync('frontend/src/components/common/AgentExecutionTranscript.vue', 'utf8')

assert.doesNotMatch(transcript, /executionDensityOptions|executionDensity\.value|执行展示密度/)
assert.match(transcript, /localStorage\.removeItem\(LEGACY_EXECUTION_DENSITY_KEY\)/)
assert.match(transcript, /if \(stage\.status === '失败'\) return true/)
assert.match(transcript, /if \(!isLivePresentation\.value\) return false/)
assert.match(transcript, /stage\.active === true \|\| stageLifecycleStatus\(stage\.kind\) === 'running'/)
assert.match(transcript, /if \(normalizedSearchQuery\.value && stageMatchesSearch\(stage\.kind\)\) return true/)
assert.match(transcript, /if \(normalizedSearchQuery\.value && batchMatchesSearch\(batch\)\) return true/)
assert.match(transcript, /return batchNeedsAttention\(batch\)/)
assert.match(transcript, /const completedProjectionVisible = computed\(\(\) => isTerminal\.value \|\| isQueryCompletion\.value\)/)
assert.match(transcript, /const planHeaderSummary = computed\(\(\) => `\$\{effectivePlanSteps\.value\.length\} 个工作项 · \$\{planStatusLabel\.value\}`\)/)
assert.match(transcript, /const compactPlanActionTitle = value =>/)
assert.match(transcript, /<details v-if="planStepDescription/)
assert.match(transcript, /class="cc-execution-stage-meta"/)
assert.match(transcript, /requirementPlanExpanded\.value = completedRecord \? false/)
assert.doesNotMatch(transcript, />预期结果</)
assert.doesNotMatch(transcript, /!isIncompleteTerminal/)
assert.doesNotMatch(transcript, /cc-execution-timing/)

console.log('execution adaptive density self-test passed')
