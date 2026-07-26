export const LOCAL_MUSIC_QUOTES = [
  '风经过耳边，旋律替你留住了这一刻。',
  '有些心事不必说，交给这一首歌就好。',
  '愿此刻的旋律，刚好接住你的情绪。',
  '音乐响起时，时间也愿意慢一点。',
  '把未说完的话，藏进今晚的旋律里。',
  '这一程不必赶路，先听完喜欢的歌。',
  '耳机里的世界，永远为你留一盏灯。',
  '让旋律穿过夜色，也穿过所有沉默。',
  '今天的故事，适合用这首歌来收藏。',
  '愿你在某段旋律里，重新遇见自己。',
  '声音落进心里，便有了温柔的回响。',
  '歌会结束，但被照亮的瞬间不会。',
  '此刻无需答案，音乐正在陪你经过。',
  '把疲惫交给夜晚，把心情交给音乐。',
  '有些远方，闭上眼睛就能随歌抵达。',
  '当旋律恰好响起，平凡也有了光。',
  '愿这一首歌，成为今天的小小纪念。',
  '听见喜欢的声音，世界便柔软了一点。',
  '让这一段旋律，替你拥抱此刻的自己。',
  '夜色很长，好在音乐一直没有离场。',
]

export function pickLocalMusicQuote(exclude = '', random = Math.random) {
  const candidates = LOCAL_MUSIC_QUOTES.filter(quote => quote !== exclude)
  const pool = candidates.length ? candidates : LOCAL_MUSIC_QUOTES
  const index = Math.min(pool.length - 1, Math.max(0, Math.floor(random() * pool.length)))
  return pool[index] || '让音乐陪你经过此刻。'
}
