#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

const binDirectory = __dirname
const executableFiles = ['ccm.js', 'legacy-project-cli.js', 'setup.js']
const failures = []

for (const fileName of executableFiles) {
  const filePath = path.join(binDirectory, fileName)
  if (!fs.existsSync(filePath)) continue
  try {
    fs.chmodSync(filePath, 0o755)
  } catch (error) {
    failures.push(`${fileName}: ${error?.message || error}`)
  }
}

if (failures.length) {
  console.warn(`[CCM] CLI executable permission repair skipped: ${failures.join('; ')}`)
} else if (process.platform !== 'win32') {
  console.log('[CCM] CLI executable permissions ready.')
}
