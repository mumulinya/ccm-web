import { ref } from 'vue'

/** Behavior-freeze extraction: danmaku load/draw for MusicPlayer. */
export function useMusicDanmaku(deps) {
  const { danmakuCanvas, currentTime, isPlaying } = deps

  const danmakuItems = ref([])
  const danmakuEnabled = ref(true)
  const activeDanmaku = ref([])
  let danmakuFrame = null

  const toggleDanmaku = () => {
    danmakuEnabled.value = !danmakuEnabled.value
  }

  const loadDanmaku = async (bvid, title = '', artist = '') => {
    if (!bvid && !title) return
    try {
      let url = ''
      if (bvid) {
        url = `/api/music/danmaku?bvid=${bvid}`
      } else {
        url = `/api/music/danmaku?title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}`
      }
      const res = await fetch(url)
      const data = await res.json()
      danmakuItems.value = (data.danmaku || []).map(d => ({ ...d, shown: false }))
    } catch { danmakuItems.value = [] }
  }

  const drawDanmaku = () => {
    if (!danmakuCanvas.value) return
    const ctx = danmakuCanvas.value.getContext('2d')
    const draw = () => {
      danmakuFrame = requestAnimationFrame(draw)
      const w = danmakuCanvas.value.parentElement.clientWidth
      const h = danmakuCanvas.value.parentElement.clientHeight
      if (danmakuCanvas.value.width !== w || danmakuCanvas.value.height !== h) {
        danmakuCanvas.value.width = w
        danmakuCanvas.value.height = h
      }
      ctx.clearRect(0, 0, w, h)
      if (!danmakuEnabled.value || !isPlaying.value) return
      const now = currentTime.value
      // 添加新弹幕
      for (const item of danmakuItems.value) {
        if (Math.abs(item.time - now) < 0.5 && !activeDanmaku.value.find(d => d.content === item.content && Math.abs(d.startTime - item.time) < 1)) {
          activeDanmaku.value.push({
            ...item,
            x: w,
            y: 15 + Math.random() * (h - 35),
            speed: 1.2 + Math.random() * 1.5,
            startTime: item.time
          })
        }
      }
      // 绘制和移动
      activeDanmaku.value = activeDanmaku.value.filter(d => {
        d.x -= d.speed
        ctx.font = '13px "JetBrains Mono", monospace'
        ctx.fillStyle = d.color || '#6feee1'
        ctx.globalAlpha = 0.85
        ctx.shadowColor = 'rgba(0,0,0,0.6)'
        ctx.shadowBlur = 3
        ctx.fillText(d.content, d.x, d.y)
        ctx.shadowBlur = 0
        ctx.globalAlpha = 1
        return d.x > -250
      })
    }
    draw()
  }


  const stopDanmaku = () => {
    if (danmakuFrame) {
      cancelAnimationFrame(danmakuFrame)
      danmakuFrame = null
    }
  }

  return {
    danmakuItems,
    danmakuEnabled,
    activeDanmaku,
    toggleDanmaku,
    loadDanmaku,
    drawDanmaku,
    stopDanmaku,
  }
}
