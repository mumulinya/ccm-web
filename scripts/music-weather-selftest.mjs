import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { runMusicWeatherSelfTest } = require('../ccm-package/dist/modules/music/weather.js')

const report = runMusicWeatherSelfTest()
console.log(JSON.stringify(report, null, 2))
if (!report.pass) process.exitCode = 1
