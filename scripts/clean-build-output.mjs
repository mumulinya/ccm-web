import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
for (const relative of ['ccm-package/dist', 'ccm-package/public']) {
  const target = path.resolve(root, relative)
  if (!target.startsWith(`${root}${path.sep}`)) throw new Error(`Unsafe build output: ${target}`)
  fs.rmSync(target, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
}
