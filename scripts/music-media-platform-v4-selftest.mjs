import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'

const root = path.resolve(import.meta.dirname, '..')
const dist = path.join(root, 'ccm-package', 'dist')
const source = file => fs.readFileSync(path.join(root, file), 'utf8')
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ccm-music-v4-'))
const childScript = `
  const persistence = require(${JSON.stringify(path.join(dist, 'modules', 'music', 'music-persistence.js'))});
  persistence.replacePersistedMusicCommandsForTest([]);
  const first = persistence.enqueuePersistedMusicCommand({ type:'play', keyword:'first', request_text:'first' });
  const claimed = persistence.claimPersistedMusicCommand({ id:first.id, generation:first.generation });
  const second = persistence.enqueuePersistedMusicCommand({ type:'play', keyword:'second', request_text:'second' });
  const staleHeartbeat = persistence.heartbeatPersistedMusicCommand({
    id:first.id, generation:first.generation, lease_id:claimed.lease_id, fencing_token:claimed.fencing_token, status:'playing'
  });
  const claimedSecond = persistence.claimPersistedMusicCommand({ id:second.id, generation:second.generation });
  const completed = persistence.completePersistedMusicCommand({
    id:second.id, generation:second.generation, lease_id:claimedSecond.lease_id,
    fencing_token:claimedSecond.fencing_token, status:'completed'
  });
  const overwrite = persistence.completePersistedMusicCommand({
    id:second.id, generation:second.generation, status:'failed'
  });
  const state = persistence.readPersistedLibraryState();
  const changed = persistence.mutatePersistedLibraryState(value => ({ ...value, playMode:'random' }), state.revision);
  let drift = false;
  try { persistence.mutatePersistedLibraryState(value => value, state.revision); } catch (error) { drift = error.code === 'state_drift'; }
  process.stdout.write(JSON.stringify({
    latestWins: staleHeartbeat.success === false,
    claimHasFence: !!claimedSecond.lease_id && claimedSecond.fencing_token > 0,
    completed: completed.success === true && completed.command.status === 'completed',
    terminalImmutable: overwrite.success === false,
    revisionAdvanced: changed.revision === state.revision + 1,
    drift
  }));
`
const child = spawnSync(process.execPath, ['-e', childScript], {
  cwd: root,
  env: { ...process.env, CCM_TASK_STORE_DIR: temp },
  encoding: 'utf8',
  timeout: 30_000,
})
assert.equal(child.status, 0, child.stderr)
const runtime = JSON.parse(child.stdout)
for (const [name, passed] of Object.entries(runtime)) assert.equal(passed, true, name)

const abortSafetyScript = `
  const http = require('node:http');
  const { musicPlatformRequest } = require(${JSON.stringify(path.join(dist, 'modules', 'music', 'platform-http.js'))});
  const server = http.createServer((req, res) => {
    if (req.url === '/redirect') {
      res.writeHead(302, { location: '/ok' });
      res.end('redirect body');
      return;
    }
    if (req.url === '/oversize') {
      res.writeHead(200, { 'content-type': 'application/octet-stream' });
      res.end(Buffer.alloc(4096, 1));
      return;
    }
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end('ok');
  });
  server.listen(0, '127.0.0.1', async () => {
    const port = server.address().port;
    let oversizeRejected = false;
    try {
      const redirected = await musicPlatformRequest({
        url: 'http://127.0.0.1:' + port + '/redirect',
        allowedHosts: ['127.0.0.1'],
        retries: 0,
      });
      try {
        await musicPlatformRequest({
          url: 'http://127.0.0.1:' + port + '/oversize',
          allowedHosts: ['127.0.0.1'],
          maxBytes: 1024,
          retries: 0,
        });
      } catch (error) {
        oversizeRejected = error && error.status === 'rejected';
      }
      await new Promise(resolve => setTimeout(resolve, 100));
      process.stdout.write(JSON.stringify({
        redirectCompleted: redirected.text === 'ok',
        oversizeRejected,
        processStayedAlive: true,
      }));
      server.close();
    } catch (error) {
      console.error(error);
      server.close(() => process.exit(1));
    }
  });
`
const abortSafety = spawnSync(process.execPath, ['-e', abortSafetyScript], {
  cwd: root,
  env: { ...process.env, CCM_TASK_STORE_DIR: temp },
  encoding: 'utf8',
  timeout: 30_000,
})
assert.equal(abortSafety.status, 0, abortSafety.stderr)
const abortRuntime = JSON.parse(abortSafety.stdout)
for (const [name, passed] of Object.entries(abortRuntime)) assert.equal(passed, true, name)

const catalog = source('backend/modules/music/music-catalog.ts')
const downloads = source('backend/modules/music/download-jobs.ts')
const platform = source('backend/modules/music/platform-http.ts')
const bili = source('backend/modules/music/bilibili.ts')
const api = source('backend/modules/music/music.ts')
const player = source('frontend/src/components/music/useMusicPlayer.js')
const playerTemplate = source('frontend/src/components/music/MusicPlayer.template.html')
const playerPanel = source('frontend/src/components/music/MusicPlayerPanel.vue')
const playerPanelsCss = source('frontend/src/components/music/MusicPlayerPanels.css')
const libraryState = source('frontend/src/composables/useMusicLibraryState.js')

assert.match(catalog, /activeMusicCatalogGeneration/)
assert.match(catalog, /Promise\.all/)
assert.match(catalog, /lstatSync/)
assert.match(catalog, /ensureMusicCatalogTrackReady/)
assert.match(catalog, /A second generation closes that race deterministically/)
assert.match(catalog, /ensureMusicCatalogTrackRemoved/)
assert.match(catalog, /歌曲文件已删除，但未能从本地曲库索引移除/)
assert.match(downloads, /actualQuality/)
assert.match(downloads, /ccm-backup/)
assert.match(downloads, /terminateManagedProcessTree/)
assert.match(downloads, /await ensureMusicCatalogTrackReady/)
assert.match(downloads, /checkpoint = "indexing"/)
assert.match(platform, /ProxyAgent/)
assert.doesNotMatch(bili, /process\.env\.(HTTP_PROXY|HTTPS_PROXY)\s*=/)
assert.match(api, /parseSecureMultipartRequest/)
assert.match(api, /maxTotalFileBytes:\s*MUSIC_UPLOAD_MAX_BYTES/)
assert.match(api, /await ensureMusicCatalogTrackRemoved/)
assert.match(api, /index_receipt:\s*indexReceipt/)
assert.match(player, /trackLoadGeneration/)
assert.match(player, /scheduleTrackLoadRetry/)
assert.match(player, /recoverMusicLibraryAfterServiceInterruption/)
assert.match(player, /waitForDownloadedTrack/)
assert.match(player, /tracks\.value = tracks\.value\.filter\(candidate => candidate\.filename !== track\.filename\)/)
assert.doesNotMatch(player, /下载完成，但歌曲没有出现在本地曲库/)
assert.match(player, /\['indexing', 'index_building'\]/)
assert.doesNotMatch(player, /catch \(error\) \{\s*if \(error\?\.name === 'AbortError'\) return\s*tracks\.value = \[\]/)
assert.match(libraryState, /expected_revision/)
assert.match(playerTemplate, /class="qi-action qi-action-next"/)
assert.match(playerTemplate, /<ListPlus v-else/)
assert.match(playerPanel, /nextQueueFeedbackFilename/)
assert.match(playerPanelsCss, /\.qi-action-next\s*\{[\s\S]*?min-width:\s*28px/)
assert.doesNotMatch(playerTemplate, /class="qi-action"[^>]*>下一首<\/button>/)

fs.rmSync(temp, { recursive: true, force: true })
console.log(JSON.stringify({
  pass: true,
  runtime,
  abortRuntime,
  checks: 41,
  paidProviderCalls: 0,
}, null, 2))
