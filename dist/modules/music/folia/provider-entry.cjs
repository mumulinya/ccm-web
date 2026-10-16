const fs = require('node:fs');
const path = require('node:path');
// 网易云 CLI 启动会等待公网匿名登录和版本查询；嵌入服务先监听，登录由显式接口完成。
const root = process.env.CCM_FOLIA_PROVIDER_ROOT;
if (!root || !path.isAbsolute(root)) throw new Error('Missing managed provider root');
if (process.env.CCM_FOLIA_PROVIDER_ID === 'netease') {
  const token = path.join(require('node:os').tmpdir(), 'anonymous_token');
  if (!fs.existsSync(token)) fs.writeFileSync(token, '', { mode: 0o600 });
  require(path.join(root, 'server.js')).serveNcmApi({ checkVersion: false });
} else if (process.env.CCM_FOLIA_PROVIDER_ID === 'qq') {
  // 3.1.4 的 Node 路由漏导出 /login/channels；直接使用同版本登录服务声明，避免猜测可用通道。
  const capabilities = require(path.join(root, 'dist/src/services/auth/qrLogin.js')).NODE_RUNTIME_CAPABILITIES;
  if (!Array.isArray(capabilities?.channels) || !capabilities.channels.every(value => typeof value === 'string')) throw new Error('Missing QQ login capabilities');
  const app = require(path.join(root, 'dist/src/app.js')).default;
  app.use(async (ctx, next) => {
    if (ctx.method === 'GET' && ctx.path === '/login/channels') { ctx.status = 200; ctx.body = { code: 200, data: capabilities }; return; }
    await next();
  });
} else throw new Error('Unsupported managed provider entry');
