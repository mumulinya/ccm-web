/** 列表/标签展示用短标题：去掉音质标签与多余分隔符 */
export const formatDisplayTitle = (title) => {
  let text = String(title || '').trim()
  if (!text) return ''
  // 花体/全角字母折成 ASCII，便于匹配 Hi-Res 等标签
  text = text.replace(/[\uFF21-\uFF3A]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0))
    .replace(/[\uFF41-\uFF5A]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0))
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
  // 去掉所有【标签】/ [标签]（含花体 Hi-Res、无损等）
  text = text
    .replace(/【[^】]{0,40}】/g, ' ')
    .replace(/\[[^\]]{0,40}\]/g, ' ')
    .replace(/[|｜]+/g, ' ')
    .replace(/[《》「」『』]/g, '')
    .replace(/\s*[-–—]\s*/g, ' - ')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s\-–—·:：]+|[\s\-–—·:：]+$/g, '')
    .trim()
  return text || String(title || '').trim()
}

export const formatTrackLabel = (track) => {
  if (!track) return '等待播放'
  const title = formatDisplayTitle(track.title) || track.title
  return [title, track.artist].filter(Boolean).join(' - ') || track.filename || '未知曲目'
}

export const normalizeTrackSearchText = (value) => String(value || '')
  .toLowerCase()
  .replace(/\.[a-z0-9]{2,5}$/i, '')
  .replace(/[《》「」『』()[\]（）【】"'`~!@#$%^&*_+=|\\:;，。,.?？!！、/\-]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

export const buildTrackSearchText = (track) => normalizeTrackSearchText([
  track?.title,
  track?.artist,
  track?.album,
  track?.filename
].filter(Boolean).join(' '))

const isCjkToken = (token) => /^[\u4e00-\u9fff]+$/.test(token)

/** Keep single CJK chars (e.g. 瞬); latin/digits still need length >= 2. */
export const splitMusicKeywordTokens = (keyword) => normalizeTrackSearchText(keyword)
  .replace(/\b(feat|ft|cover|live|伴奏|纯音乐|歌词版|完整版|官方|mv)\b/g, ' ')
  .split(/[\s的]+/)
  .map(token => token.trim())
  .filter(token => {
    if (!token) return false
    if (isCjkToken(token)) return true
    return token.length >= 2
  })

/** Parse "歌手的歌名" / "歌手 歌名" into artist + title when possible. */
export const parseArtistTitleKeyword = (keyword) => {
  const raw = String(keyword || '').trim()
  if (!raw) return { artist: '', title: '', tokens: [] }
  const deMatch = raw.match(/^(.+?)的(.+)$/)
  if (deMatch) {
    const artist = normalizeTrackSearchText(deMatch[1])
    const title = normalizeTrackSearchText(deMatch[2])
    return {
      artist,
      title,
      tokens: splitMusicKeywordTokens(raw),
    }
  }
  const tokens = splitMusicKeywordTokens(raw)
  if (tokens.length >= 2) {
    return {
      artist: normalizeTrackSearchText(tokens.slice(0, -1).join(' ')),
      title: tokens[tokens.length - 1],
      tokens,
    }
  }
  return { artist: '', title: '', tokens }
}

/** Minimum score to accept a local/cloud match. Artist-only matches stay below this. */
export const MUSIC_MATCH_MIN_SCORE = 80

/**
 * Score a candidate with separate title/artist fields.
 * Title token must match when the user named a song (e.g. 郑润泽的瞬 → 瞬).
 */
export const scoreMusicCandidate = (keyword, fields = {}) => {
  const titleText = normalizeTrackSearchText(fields.title || fields.name || '')
  const artistText = normalizeTrackSearchText(fields.artist || fields.author || fields.singer || '')
  const haystack = normalizeTrackSearchText([
    fields.title,
    fields.name,
    fields.artist,
    fields.author,
    fields.singer,
    fields.album,
    fields.filename,
  ].filter(Boolean).join(' '))
  if (!haystack) return 0

  const normalizedKeyword = normalizeTrackSearchText(keyword)
  const { artist: artistKw, title: titleKw, tokens } = parseArtistTitleKeyword(keyword)
  if (!normalizedKeyword && !tokens.length) return 0

  // Exact-ish full keyword containment
  if (normalizedKeyword && haystack.includes(normalizedKeyword)) return 100

  // "歌手的歌名"：歌名必须命中标题；点了歌手时不能只因歌名短词撞车就播（如「瞬」）
  if (titleKw) {
    const shortTitle = titleKw.length <= 2
    const titleHit = shortTitle
      ? titleText.includes(titleKw)
      : (titleText.includes(titleKw) || haystack.includes(titleKw))
    if (!titleHit) {
      // Artist-only → too weak (fixes 瞬 → 12.31)
      if (artistKw && (artistText.includes(artistKw) || haystack.includes(artistKw))) return 40
      return 0
    }
    if (artistKw) {
      const artistHit = artistText.includes(artistKw) || haystack.includes(artistKw)
      // 用户点了歌手：必须歌手也对得上，否则低于入选线
      return artistHit ? 100 : 50
    }
    return 85
  }

  if (tokens.length > 0 && tokens.every(token => haystack.includes(token))) return 80
  if (tokens.length > 0) {
    const hit = tokens.filter(token => haystack.includes(token)).length
    if (!hit) return 0
    return Math.round(40 * (hit / tokens.length))
  }
  return 0
}

export const scoreKeywordAgainstText = (keyword, text) => {
  return scoreMusicCandidate(keyword, { title: text })
}

export const scoreTrackAgainstKeyword = (keyword, track) => {
  return scoreMusicCandidate(keyword, {
    title: track?.title,
    artist: track?.artist,
    album: track?.album,
    filename: track?.filename,
  })
}

export const findLocalTrackByKeyword = (keyword, tracks = []) => {
  const normalizedKeyword = normalizeTrackSearchText(keyword)
  const tokens = splitMusicKeywordTokens(keyword)
  if (!normalizedKeyword && !tokens.length) return null
  let best = null
  let bestScore = 0
  for (const track of tracks) {
    const score = scoreTrackAgainstKeyword(keyword, track)
    if (score > bestScore) {
      bestScore = score
      best = track
    }
  }
  if (bestScore < MUSIC_MATCH_MIN_SCORE) return null
  return best
}

/** Rank local tracks for LLM / rule selection (includes softer matches for the model). */
export const listLocalTrackCandidates = (keyword, tracks = [], options = {}) => {
  const minScore = Number(options.minScore ?? 40)
  const limit = Math.max(1, Number(options.limit || 8))
  return (tracks || [])
    .map(track => ({ track, score: scoreTrackAgainstKeyword(keyword, track) }))
    .filter(row => row.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

/** Pick best cloud/netease search row; returns null if below threshold. */
export const pickBestSearchResult = (keyword, results = [], mapItem = null) => {
  if (!Array.isArray(results) || !results.length) return null
  let best = null
  let bestScore = 0
  for (const item of results) {
    const mapped = typeof mapItem === 'function' ? mapItem(item) : item
    const score = scoreMusicCandidate(keyword, {
      title: mapped?.title || mapped?.name,
      artist: mapped?.artist || mapped?.author || mapped?.singer,
      album: mapped?.album,
      filename: mapped?.filename,
    })
    if (score > bestScore) {
      bestScore = score
      best = item
    }
  }
  if (bestScore < MUSIC_MATCH_MIN_SCORE) return null
  return best
}

export const toPetTrack = (track) => {
  if (!track) return null
  return {
    filename: track.filename || '',
    title: track.title || track.filename || '未知曲目',
    artist: track.artist || '未知艺术家',
    bvid: track.bvid || ''
  }
}

const RECENT_PLAYED_STORAGE_KEY = 'ccm-music-recent-played-v1'
const RECENT_PLAYED_LIMIT = 12

/** Stable id for local/cloud tracks used by recent-play dedupe. */
export const trackPlayIdentity = (track = {}) => {
  const filename = String(track.filename || track.file || '').trim()
  if (filename) return `file:${filename}`
  const bvid = String(track.bvid || track.bvId || '').trim()
  if (bvid) return `bvid:${bvid}`
  const songId = String(track.songId || track.song_id || track.id || '').trim()
  if (songId) return `song:${songId}`
  const title = normalizeTrackSearchText(track.title || track.name || '')
  const artist = normalizeTrackSearchText(track.artist || track.author || track.singer || '')
  if (title || artist) return `meta:${artist}|${title}`
  return ''
}

export const loadRecentlyPlayedIds = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(RECENT_PLAYED_STORAGE_KEY) || '[]')
    return Array.isArray(raw) ? raw.map(String).filter(Boolean).slice(0, RECENT_PLAYED_LIMIT) : []
  } catch {
    return []
  }
}

export const rememberPlayedTrack = (track, limit = RECENT_PLAYED_LIMIT) => {
  const id = trackPlayIdentity(track)
  if (!id || typeof localStorage === 'undefined') return loadRecentlyPlayedIds()
  const next = [id, ...loadRecentlyPlayedIds().filter(item => item !== id)].slice(0, Math.max(1, Number(limit) || RECENT_PLAYED_LIMIT))
  try { localStorage.setItem(RECENT_PLAYED_STORAGE_KEY, JSON.stringify(next)) } catch {}
  return next
}

export const filterOutRecentlyPlayed = (tracks = [], options = {}) => {
  const recent = new Set(options.recentIds || loadRecentlyPlayedIds())
  const list = Array.isArray(tracks) ? tracks.filter(Boolean) : []
  if (!list.length || !recent.size) return list
  const filtered = list.filter(track => !recent.has(trackPlayIdentity(track)))
  return filtered.length ? filtered : list
}

/** Pick one track from pool, preferring not-recent; avoids current when possible. */
export const pickRandomTrack = (tracks = [], options = {}) => {
  const list = Array.isArray(tracks) ? tracks.filter(track => track?.filename || trackPlayIdentity(track)) : []
  if (!list.length) return null
  const currentId = trackPlayIdentity(options.excludeTrack || {})
  let pool = filterOutRecentlyPlayed(list, options)
  if (currentId && pool.length > 1) {
    const withoutCurrent = pool.filter(track => trackPlayIdentity(track) !== currentId)
    if (withoutCurrent.length) pool = withoutCurrent
  }
  return pool[Math.floor(Math.random() * pool.length)] || list[0]
}

const CLOUD_RANDOM_QUERY_ROTATIONS = {
  netease: ['热门歌曲', '华语流行', '轻音乐', '经典老歌', '摇滚'],
  cloud: ['热门流行音乐', '华语流行', '轻音乐', '经典老歌', '摇滚精选'],
}

export const nextCloudRandomQuery = (mode = 'cloud') => {
  const key = mode === 'netease' ? 'netease' : 'cloud'
  const queries = CLOUD_RANDOM_QUERY_ROTATIONS[key]
  const storageKey = `ccm-music-cloud-random-query-${key}`
  let index = 0
  try { index = Number(localStorage.getItem(storageKey) || 0) || 0 } catch {}
  const query = queries[Math.abs(index) % queries.length]
  try { localStorage.setItem(storageKey, String(index + 1)) } catch {}
  return query
}
