import path from 'node:path'
import { createRequire } from 'node:module'

if (process.env.CCM_LIVE_CACHE_PROBE !== '1') {
  console.error('Live cache probe is disabled. Set CCM_LIVE_CACHE_PROBE=1 to allow at most two paid Provider calls.')
  process.exit(2)
}

const root = path.resolve(import.meta.dirname, '..')
const require = createRequire(import.meta.url)
const { loadOrchestratorConfig } = require(path.join(root, 'ccm-package', 'dist', 'modules', 'collaboration', 'group-orchestrator-config.js'))
const { probeProviderCacheCapability } = require(path.join(root, 'ccm-package', 'dist', 'system', 'provider-cache-capability-probe.js'))

const result = await probeProviderCacheCapability(loadOrchestratorConfig())
console.log(JSON.stringify({
  success: result.success,
  connection: result.connection,
  receipt: result.receipt,
  capability: result.capability,
}, null, 2))
if (!result.connection?.success) process.exitCode = 1
