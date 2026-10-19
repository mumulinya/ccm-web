const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

// 新版播放地址使用 xeapi。服务先监听，只有需要公钥的请求等待单次初始化。
function createNeteaseBootstrap({ root, directory, timeoutMs = 12000, loadKey }) {
  const file = path.join(directory, 'xeapi_public_key');
  let pending = null, ready = false, failedAt = 0;
  function readKey() { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return {}; } }
  async function requestKey(current) {
    if (loadKey) return loadKey(current);
    const { generateDeviceId } = require(path.join(root, 'util/index.js'));
    global.deviceId ||= generateDeviceId();
    const axios = require('node:module').createRequire(path.join(root, 'package.json'))('axios').default;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const interceptor = axios.interceptors.request.use(config => {
      if (config.url === 'https://interface.music.163.com/api/gorilla/anti/crawler/security/key/get') {
        config.signal = controller.signal; config.timeout = timeoutMs;
      }
      return config;
    });
    try { return await require(path.join(root, 'util/xeapiKey.js')).getXeapiPublicKey(current, global.deviceId); }
    finally { clearTimeout(timer); axios.interceptors.request.eject(interceptor); }
  }
  function ensure() {
    if (ready) return Promise.resolve();
    if (pending) return pending;
    if (failedAt && Date.now() - failedAt < 5000) return Promise.reject(Error('网易云播放初始化暂不可用，请稍后重试'));
    pending = (async () => {
      const existing = readKey();
      // 跨进程保留设备标识，但首次使用仍让 SDK 校验/更新公钥版本。
      if (typeof existing.deviceId === 'string' && existing.deviceId) global.deviceId = existing.deviceId;
      let temporary;
      try {
        const key = await requestKey(existing);
        if (!key || typeof key.sk !== 'string' || !key.sk) throw Error('Missing xeapi key');
        fs.mkdirSync(directory, { recursive: true });
        temporary = file + '.' + crypto.randomUUID() + '.tmp';
        fs.writeFileSync(temporary, JSON.stringify(key), { mode: 0o600, flag: 'wx' });
        fs.renameSync(temporary, file); ready = true;
      } catch {
        failedAt = Date.now();
        throw Error('网易云播放初始化失败，请检查平台网络后重试');
      } finally { if (temporary) fs.rmSync(temporary, { force: true }); }
    })().finally(() => { pending = null; });
    return pending;
  }
  return { ensure };
}
module.exports = { createNeteaseBootstrap };
