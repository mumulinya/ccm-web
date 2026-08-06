import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const root = path.resolve(import.meta.dirname, '..')
const dist = path.join(root, 'ccm-package', 'dist', 'modules', 'music')
const source = file => fs.readFileSync(path.join(root, file), 'utf8')

const douyin = source('backend/modules/music/douyin.ts')
const searchResults = source('backend/modules/music/search-results.ts')
const downloads = source('backend/modules/music/download-jobs.ts')
const routes = source('backend/modules/music/music.ts')
const decision = source('backend/modules/music/playback-decision.ts')
const agent = source('backend/modules/music/agent.ts')
const platformHttp = source('backend/modules/music/platform-http.ts')
const unifiedSearch = source('frontend/src/components/music/MusicUnifiedSearch.vue')
const settingsModal = source('frontend/src/components/music/MusicAgentSettingsModal.vue')
const player = source('frontend/src/components/music/useMusicPlayer.js')
const playerPanel = source('frontend/src/components/music/MusicPlayerPanel.vue')
const playerTemplate = source('frontend/src/components/music/MusicPlayer.template.html')
const downloadJobsUi = source('frontend/src/composables/useMusicDownloadJobs.js')
const downloadCenter = source('frontend/src/components/music/MusicDownloadCenter.vue')

// ---------------------------------------------------------------------------
// Runtime behaviour: exercise the built module in an isolated child process so
// no real network, browser or yt-dlp binary is ever touched.
// ---------------------------------------------------------------------------
const childScript = `
  const douyin = require(${JSON.stringify(path.join(dist, 'douyin.js'))});
  const search = require(${JSON.stringify(path.join(dist, 'search-results.js'))});

  const selfTest = douyin.runDouyinMusicSelfTest();

  // canonical aweme id boundary: only bare numeric platform ids are accepted
  const accepted = douyin.douyinVideoUrl('7471252140422401337');
  const rejects = [];
  for (const bad of [
    'https://www.douyin.com/video/7471252140422401337',
    'https://evil.example/video/7471252140422401337',
    '7471252140422401337/../../etc/passwd',
    'abc123',
    '',
    '  ',
    '7471252140422401337?redirect=https://evil.example',
  ]) {
    let threw = false;
    try { douyin.douyinVideoUrl(bad); } catch { threw = true; }
    rejects.push(threw);
  }

  // status projection must never expose secrets, cookies or media urls
  const status = douyin.douyinPlatformStatus();
  const statusJson = JSON.stringify(status);

  // download tokens are bound to their source
  const signed = search.signSearchResults('douyin', 'test keyword', [
    { awemeId: '7471252140422401337', title: '测试歌曲', author: '测试作者', duration: '1:05' },
  ]);
  const token = signed[0] && signed[0].downloadToken;
  const sameSource = search.verifyDownloadToken(token, 'douyin');
  let crossSource = null;
  try { crossSource = search.verifyDownloadToken(token, 'bilibili'); } catch { crossSource = null; }
  let tamperedResult = null;
  try {
    const [encoded, signature] = String(token).split('.');
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf-8'));
    payload.sourceId = '1111111111111111111';
    const forged = Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64url') + '.' + signature;
    tamperedResult = search.verifyDownloadToken(forged, 'douyin');
  } catch { tamperedResult = null; }
  const issued = search.issueDownloadToken('douyin', '7471252140422401337', '测试歌曲', '测试作者');
  const issuedPayload = search.verifyDownloadToken(issued, 'douyin');

  process.stdout.write(JSON.stringify({
    selfTestOk: selfTest.ok === true && selfTest.source === 'douyin',
    runtimeVersionPinned: /^\\d{4}\\.\\d{2}\\.\\d{2}$/.test(String(selfTest.runtimeVersion || '')),
    canonicalAccepts: accepted === 'https://www.douyin.com/video/7471252140422401337',
    canonicalRejectsAll: rejects.every(Boolean),
    statusSchema: status.schema === 'ccm-douyin-music-status-v1',
    statusHasPreparation: typeof status.runtime.preparation === 'object' && status.runtime.preparation !== null,
    statusSecretProtectedOnly: typeof status.official.secretProtected === 'boolean' && !('clientSecret' in status.official) && !('officialClientSecret' in status.official),
    statusNoCookies: !/cookie|storageState|sessionid|msToken|clientSecret/i.test(statusJson),
    tokenIssued: typeof token === 'string' && token.split('.').length === 2,
    tokenVerifies: !!sameSource && sameSource.source === 'douyin' && sameSource.sourceId === '7471252140422401337',
    tokenRoundTrips: !!issuedPayload && issuedPayload.sourceId === '7471252140422401337',
    tokenRejectsCrossSource: !crossSource,
    tokenRejectsTampering: !tamperedResult,
  }));
`

const child = spawnSync(process.execPath, ['-e', childScript], {
  cwd: root,
  encoding: 'utf8',
  timeout: 30_000,
})
assert.equal(child.status, 0, child.stderr)
const runtime = JSON.parse(child.stdout)
for (const [name, passed] of Object.entries(runtime)) assert.equal(passed, true, `runtime check failed: ${name}`)

// ---------------------------------------------------------------------------
// Pinned yt-dlp runtime: every platform asset must carry a real sha256 and the
// binary must never be resolved from an unverified PATH lookup.
// ---------------------------------------------------------------------------
const assetBlock = douyin.slice(douyin.indexOf('const YTDLP_ASSETS'))
const assetSection = assetBlock.slice(0, assetBlock.indexOf('\n}'))
const checksums = [...assetSection.matchAll(/checksum:\s*"([a-f0-9]+)"/g)].map(match => match[1])
assert.ok(checksums.length >= 5, 'yt-dlp asset map should cover windows, linux and macOS targets')
for (const checksum of checksums) assert.match(checksum, /^[a-f0-9]{64}$/, 'each yt-dlp asset needs a full sha256 checksum')
for (const target of ['win32-x64', 'win32-arm64', 'linux-x64', 'linux-arm64', 'darwin-x64', 'darwin-arm64']) {
  assert.ok(assetSection.includes(`"${target}"`), `yt-dlp asset map should declare ${target}`)
}
assert.match(douyin, /const YTDLP_VERSION = "\d{4}\.\d{2}\.\d{2}"/, 'yt-dlp version must be pinned, never latest')
assert.ok(!/refreshEnvPath/.test(douyin), 'yt-dlp must not be discovered through a PATH scan')
assert.ok(!/which yt-dlp|where yt-dlp/i.test(douyin), 'yt-dlp must not be resolved from an unverified system lookup')
assert.match(douyin, /sha256\(response\.buffer\) !== asset\.checksum/, 'downloaded yt-dlp must be checksum verified before use')
assert.match(douyin, /shell: false/, 'managed media processes must never spawn through a shell')
assert.ok(!/--exec|--load-plugins/.test(douyin), 'yt-dlp must not be allowed to execute arbitrary post-processing commands')
assert.match(douyin, /--ignore-config/, 'yt-dlp must ignore ambient user configuration')
assert.match(douyin, /--no-playlist/, 'yt-dlp must stay in single-video mode')

// Cookie handling: owner-only temp file, always removed.
assert.match(douyin, /music-runtime/, 'runtime cookies belong under the private music runtime directory')
assert.match(douyin, /0o600|"600"/, 'cookie files must be owner-readable only')
assert.match(douyin, /finally[\s\S]{0,400}(rmSync|unlinkSync)/, 'cookie files must be deleted in a finally block')

// Only public, non-live content is convertible.
assert.match(douyin, /availability/, 'availability must be inspected before conversion')
assert.match(douyin, /const browser = await launchBrowser\(true\);[\s\S]{0,300}storage && hasAuthenticatedCookie\(storage\)/, 'public search must start without requiring stored login cookies')
assert.match(douyin, /login_required/, 'login is only a fallback state when public access is blocked')
assert.match(douyin, /pageState\.title/, 'captcha titles must be reported as risk control instead of empty results')
assert.match(douyin, /is_live|isLive|live_status/, 'live streams must be rejected')

// ---------------------------------------------------------------------------
// Cancellation: a douyin resolve must be abortable, not just the ffmpeg stage.
// ---------------------------------------------------------------------------
assert.match(downloads, /abortControllers = new Map<string, AbortController>\(\)/, 'download jobs must track abort controllers')
const cancelIndex = downloads.indexOf('this.abortControllers.get(id)?.abort()')
assert.ok(cancelIndex > 0, 'cancel must abort the in-flight controller')
assert.match(downloads, /resolveDouyinMediaInput\([\s\S]{0,200}signal/, 'the douyin resolver must receive the abort signal')
assert.match(downloads, /abortControllers\.delete\(job\.id\)/, 'abort controllers must be released when a job settles')
assert.match(douyin, /options: \{ signal\?: AbortSignal \} = \{\}/, 'resolveDouyinMediaInput must accept an abort signal')
assert.match(douyin, /signal/, 'managed processes must honour cancellation')

// Browser login cannot hang forever in "waiting".
assert.match(douyin, /failActiveLogin/, 'a stuck browser login must be able to fail explicitly')
assert.match(douyin, /lastBrowserLoginError/, 'the last login error must be surfaceable to the UI')
assert.match(douyin, /if \(browserLoginStartPromise\) return browserLoginStartPromise/, 'concurrent login requests must share one browser launch')
assert.match(douyin, /timeout\?: NodeJS\.Timeout/, 'login timeout handles must be tracked and cleared')

// ---------------------------------------------------------------------------
// Four-source contract across search, playback decision and the agent.
// ---------------------------------------------------------------------------
assert.match(searchResults, /export type MusicSource = "netease" \| "bilibili" \| "douyin"/, 'douyin must be a first-class music source')
assert.match(decision, /douyin/, 'the playback decision must consider douyin candidates')
assert.match(decision, /Promise\.allSettled/, 'candidate search must tolerate a single failing source')
assert.match(agent, /douyin/, 'the music agent intent must understand the douyin source mode')
assert.match(routes, /\/search-douyin/, 'a dedicated douyin search route must exist')
for (const route of ['douyin/status', 'douyin/auth/start', 'douyin/runtime/prepare']) {
  assert.ok(routes.includes(route), `douyin route ${route} must be registered`)
}
assert.match(routes, /Promise\.allSettled/, 'unified search must keep partial results when one platform fails')

// Server-side url construction only: clients may never submit a download url.
// The route accepts a signed token, and the job runner resolves the real media
// url from the verified aweme id at execution time.
assert.match(routes, /musicDownloadJobs\.create\(source, String\(body\.downloadToken/, 'download jobs must be created from a signed token, never a client supplied url')
assert.ok(!/body\.(url|mediaUrl|playUrl|downloadUrl)/.test(routes), 'the download route must never accept a client supplied media url')
assert.match(downloads, /resolveDouyinMediaInput\(job\.sourceId/, 'the douyin media url must be resolved server-side from the stored aweme id')
assert.ok(!/cdn|aweme\.snssdk|douyinvod/i.test(downloads), 'short lived cdn urls must not be persisted on the job')

// Platform errors must never masquerade as "no results".
assert.match(platformHttp, /login_required/, 'login failures must be a distinct platform state')
assert.match(platformHttp, /risk_controlled/, 'platform risk control must be a distinct state')
assert.match(platformHttp, /capability_unavailable/, 'missing official capability must be a distinct state')

// ---------------------------------------------------------------------------
// Frontend surface.
// ---------------------------------------------------------------------------
for (const source of ['local', 'netease', 'bilibili', 'douyin']) {
  assert.match(unifiedSearch, new RegExp(`id: '${source}'`), `${source} must be selectable in unified search`)
}
assert.match(settingsModal, /抖音/, 'settings must expose the douyin platform section')
assert.match(unifiedSearch, /登录抖音/, 'unified search must offer douyin login when the source requires authentication')
assert.match(unifiedSearch, /source_statuses/, 'unified search must render structured per-source failures')
assert.match(unifiedSearch, /douyinLoginBusy/, 'unified search must disable repeated douyin login clicks')
assert.match(settingsModal, /douyinLoginBusy/, 'settings must disable repeated douyin login clicks')
assert.match(player, /if \(douyinLoginStarting\.value/, 'the player must deduplicate repeated login actions')
assert.match(playerTemplate, /@douyin-login="startDouyinLogin"/, 'the search and settings views must wire the douyin login action')
for (const method of ['startDouyinLogin', 'refreshDouyinStatus', 'clearDouyinLogin', 'prepareDouyinRuntime']) {
  assert.match(playerPanel, new RegExp(`\\b${method},`), `${method} must be exposed to the external player template`)
}
assert.match(player, /convertDouyinAndPlay/, 'the player must convert a douyin video before playing it')
assert.match(player, /startDouyinLogin/, 'the player must be able to start douyin login')
assert.match(player, /clearDouyinLogin/, 'the player must be able to clear douyin login')
assert.match(player, /prepareDouyinRuntime/, 'the player must be able to prepare the media runtime')
assert.match(downloadJobsUi, /douyin/, 'the download centre must label douyin jobs')

console.log('music douyin platform selftest passed')


