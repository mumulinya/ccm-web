import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { runMusicAgentIntentSelfTest } = require('../ccm-package/dist/modules/music/agent.js')

const report = runMusicAgentIntentSelfTest()
console.log(JSON.stringify(report, null, 2))
if (!report.pass) process.exitCode = 1
