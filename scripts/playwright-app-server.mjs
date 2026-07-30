import path from 'node:path'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'

const require = createRequire(import.meta.url)

export async function startPlaywrightAppServer(root, options = {}) {
  const frontendDir = path.join(root, 'frontend')
  const port = Number(options.port || 3082)
  const viteEntry = require.resolve('vite', { paths: [frontendDir] })
  const { createServer } = await import(pathToFileURL(viteEntry).href)
  const server = await createServer({
    root: frontendDir,
    server: { host: '127.0.0.1', port, strictPort: true },
    logLevel: 'error',
  })
  await server.listen()
  return { server, baseUrl: `http://127.0.0.1:${port}` }
}
