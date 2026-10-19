const fs = require('node:fs');
const path = require('node:path');
// 网易云 CLI 启动会等待公网匿名登录和版本查询；嵌入服务先监听，登录由显式接口完成。
const root = process.env.CCM_FOLIA_PROVIDER_ROOT;
if (!root || !path.isAbsolute(root)) throw new Error('Missing managed provider root');
if (process.env.CCM_FOLIA_PROVIDER_ID === 'netease') {
  const token = path.join(require('node:os').tmpdir(), 'anonymous_token');
  if (!fs.existsSync(token)) fs.writeFileSync(token, '', { mode: 0o600 });
  const { createNeteaseBootstrap } = require('./netease-bootstrap.cjs');
  const bootstrap = createNeteaseBootstrap({ root, directory: require('node:os').tmpdir() });
  global.cnIp = require(path.join(root, 'util/index.js')).generateRandomChineseIP();
  const server = require(path.join(root, 'server.js'));
  // 包装模块注册前的请求，不等待公网初始化才监听，也不让 SDK 将缺公钥伪装成 404。
  void server.getModulesDefinitions(path.join(root, 'module'), {
    'daily_signin.js': '/daily_signin', 'fm_trash.js': '/fm_trash', 'personal_fm.js': '/personal_fm',
  }).then(moduleDefs => {
    // 固定 SDK 中使用 xeapi 的模块必须先初始化，避免其他入口提前缓存旧公钥。
    const xeapiModules = new Set(['song_url_v1', 'register_anonimous', 'like_v1', 'share_resource', 'comment_add', 'comment_delete', 'comment_reply', 'ad_get', 'ad_listening_rights', 'ad_listening_rights_gain', 'vip_growthpoint_getall', 'vip_tasks_v1', 'yunbei_sign']);
    for (const item of moduleDefs) if (xeapiModules.has(item.identifier)) {
      const original = item.module;
      item.module = async (...args) => {
        try { await bootstrap.ensure(); }
        catch (error) { throw { status: 503, body: { code: 503, message: error.message }, cookie: [] }; }
        return original(...args);
      };
    }
    return server.serveNcmApi({ checkVersion: false, moduleDefs });
  }).catch(() => { console.error('网易云服务初始化失败'); process.exit(1); });
} else if (process.env.CCM_FOLIA_PROVIDER_ID === 'qq') {
  // 使用当前固定 SDK 的登录通道声明，兼容早期缺少该路由的版本。
  const capabilities = require(path.join(root, 'dist/src/services/auth/qrLogin.js')).NODE_RUNTIME_CAPABILITIES;
  if (!Array.isArray(capabilities?.channels) || !capabilities.channels.every(value => typeof value === 'string')) throw new Error('Missing QQ login capabilities');
  const app = require(path.join(root, 'dist/src/app.js')).default;
  app.use(async (ctx, next) => {
    if (ctx.method === 'GET' && ctx.path === '/login/channels') { ctx.status = 200; ctx.body = { code: 200, data: capabilities }; return; }
    await next();
  });
} else throw new Error('Unsupported managed provider entry');
