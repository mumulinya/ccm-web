export const formatTrackLabel = (track) => {
  if (!track) return '等待播放'
  return [track.title, track.artist].filter(Boolean).join(' - ') || track.filename || '未知曲目'
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

export const splitMusicKeywordTokens = (keyword) => normalizeTrackSearchText(keyword)
  .replace(/\b(feat|ft|cover|live|伴奏|纯音乐|歌词版|完整版|官方|mv)\b/g, ' ')
  .split(/[\s的]+/)
  .map(token => token.trim())
  .filter(token => token.length >= 2)

export const findLocalTrackByKeyword = (keyword, tracks = []) => {
  const normalizedKeyword = normalizeTrackSearchText(keyword)
  const tokens = splitMusicKeywordTokens(keyword)
  if (!normalizedKeyword && !tokens.length) return null
  return tracks.find(track => {
    const haystack = buildTrackSearchText(track)
    if (!haystack) return false
    if (normalizedKeyword && haystack.includes(normalizedKeyword)) return true
    return tokens.length > 0 && tokens.every(token => haystack.includes(token))
  }) || null
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
