import { ref } from 'vue'

/** Behavior-freeze extraction: audio spectrum rendering for MusicPlayer. */
export function useMusicSpectrum(deps) {
  const {
    audioEl,
    isPlaying,
    leftCanvasRef,
    rightCanvasRef,
    headerCanvasRef,
  } = deps

  const audioCtx = ref(null)
  const analyser = ref(null)
  const canvasRef = ref(null)
  const dataArray = ref(null)
  const leftCaps = ref([])
  const rightCaps = ref([])
  let spectrumFrameId = null
  let paletteReadFrame = 0
  let spectrumPalette = {
    primary: 'rgb(46, 91, 108)',
    accent: 'rgb(92, 184, 198)',
    secondary: 'rgb(116, 139, 148)',
  }

  const readCoverColor = (playerEl, property, fallback) => {
    const raw = getComputedStyle(playerEl).getPropertyValue(property).trim()
    const channels = raw.split(',').map(value => Number.parseInt(value.trim(), 10))
    return channels.length === 3 && channels.every(Number.isFinite) ? `rgb(${channels.join(', ')})` : fallback
  }

  const getSpectrumPalette = (playerEl) => {
    if (playerEl && paletteReadFrame++ % 20 === 0) {
      spectrumPalette = {
        primary: readCoverColor(playerEl, '--cover-primary', spectrumPalette.primary),
        accent: readCoverColor(playerEl, '--cover-accent', spectrumPalette.accent),
        secondary: readCoverColor(playerEl, '--cover-secondary', spectrumPalette.secondary),
      }
    }
    return spectrumPalette
  }

  const initAnalyser = () => {
    if (audioCtx.value) {
      if (audioCtx.value.state === 'suspended') {
        audioCtx.value.resume()
      }
      return
    }
    try {
      audioCtx.value = new (window.AudioContext || window.webkitAudioContext)()
      analyser.value = audioCtx.value.createAnalyser()
      analyser.value.fftSize = 128
      const source = audioCtx.value.createMediaElementSource(audioEl.value)
      source.connect(analyser.value)
      analyser.value.connect(audioCtx.value.destination)
      dataArray.value = new Uint8Array(analyser.value.frequencyBinCount)
      
      if (audioCtx.value.state === 'suspended') {
        audioCtx.value.resume()
      }
    } catch {}
  }


  const drawSpectrums = () => {
    spectrumFrameId = requestAnimationFrame(drawSpectrums)
    const playerEl = document.querySelector('.aura-player')
    const palette = getSpectrumPalette(playerEl)
    
    let hasData = false
    if (analyser.value && dataArray.value) {
      analyser.value.getByteFrequencyData(dataArray.value)
      hasData = true
    }

    // 提取低音 (Bass) 和高音 (Treble) 能量值并绑定至容器 CSS 变量
    if (hasData) {
      let bassSum = 0
      const bassCount = Math.min(6, dataArray.value.length)
      for (let i = 0; i < bassCount; i++) {
        bassSum += dataArray.value[i]
      }
      const bassNormalized = bassSum / (bassCount * 255.0)

      let trebleSum = 0
      const len = dataArray.value.length
      const trebleStart = Math.floor(len * 0.6)
      const trebleCount = len - trebleStart
      for (let i = trebleStart; i < len; i++) {
        trebleSum += dataArray.value[i]
      }
      const trebleNormalized = trebleSum / (trebleCount * 255.0)

      if (playerEl) {
        playerEl.style.setProperty('--audio-bass', bassNormalized.toFixed(3))
        playerEl.style.setProperty('--audio-treble', trebleNormalized.toFixed(3))
      }
    } else {
      if (playerEl) {
        playerEl.style.setProperty('--audio-bass', '0')
        playerEl.style.setProperty('--audio-treble', '0')
      }
    }
    
    // 0. 绘制页眉中间紫色对称频谱
    if (headerCanvasRef.value) {
      const canvas = headerCanvasRef.value
      const ctx = canvas.getContext('2d')
      if (canvas.parentElement) {
        const w = canvas.width = canvas.parentElement.clientWidth
        const h = canvas.height = canvas.parentElement.clientHeight
        ctx.clearRect(0, 0, w, h)
        
        const barCount = 75
        const gap = 2
        const barWidth = (w - (barCount - 1) * gap) / barCount
        const dataLen = hasData ? dataArray.value.length : 0
        
        const grad = ctx.createLinearGradient(0, 0, w, 0)
        grad.addColorStop(0, palette.primary)
        grad.addColorStop(0.35, palette.accent)
        grad.addColorStop(0.5, palette.secondary)
        grad.addColorStop(0.65, palette.accent)
        grad.addColorStop(1, palette.primary)
        
        ctx.fillStyle = grad
        
        for (let i = 0; i < barCount; i++) {
          const mappingIdx = i < barCount / 2 ? i : (barCount - 1 - i)
          const val = dataLen > 0 ? dataArray.value[mappingIdx % dataLen] / 255.0 : 0
          const barHeight = isPlaying.value ? val * (h * 0.72) + 1 : 1
          
          const x = i * (barWidth + gap)
          const y = (h / 2) - (barHeight / 2)
          
          ctx.fillRect(x, y, barWidth, barHeight)
        }
      }
    }
    
    // 1. 绘制左侧对称渐变密集音柱 (左紫右青)
    if (leftCanvasRef.value) {
      const canvas = leftCanvasRef.value
      const ctx = canvas.getContext('2d')
      if (canvas.parentElement) {
        const w = canvas.width = canvas.parentElement.clientWidth
        const h = canvas.height = canvas.parentElement.clientHeight
        ctx.clearRect(0, 0, w, h)
        
        const barCount = 45
        const gap = 1.5
        const barWidth = (w - (barCount - 1) * gap) / barCount
        const dataLen = hasData ? dataArray.value.length : 0
        
        const grad = ctx.createLinearGradient(0, 0, w, 0)
        grad.addColorStop(0, palette.primary)
        grad.addColorStop(0.65, palette.secondary)
        grad.addColorStop(1, palette.accent)
        
        ctx.fillStyle = grad
        ctx.shadowBlur = isPlaying.value ? 5 : 2
        ctx.shadowColor = palette.accent
        
        if (leftCaps.value.length !== barCount) {
          leftCaps.value = new Array(barCount).fill(0).map(() => ({ y1: h / 2, y2: h / 2, speed1: 0, speed2: 0 }))
        }
        
        for (let i = 0; i < barCount; i++) {
          // 左侧频谱：靠近右侧低频振幅大，所以进行倒序映射
          const dataIdx = barCount - 1 - i
          const val = dataLen > 0 ? dataArray.value[dataIdx % dataLen] / 255.0 : 0
          const barHeight = isPlaying.value ? val * (h * 0.78) + 2 : 2
          
          const x = i * (barWidth + gap)
          const y = (h / 2) - (barHeight / 2)
          if (barWidth <= 0 || barHeight <= 0) continue
          
          // 绘制圆角音柱
          const radius = Math.max(0, Math.min(barWidth / 2, barHeight / 2, 2))
          ctx.beginPath()
          ctx.roundRect(x, y, barWidth, barHeight, radius)
          ctx.fill()

          // 更新粒子状态
          const cap = leftCaps.value[i]
          const y_top = y
          const y_bottom = y + barHeight
          
          if (y_top < cap.y1) {
            cap.y1 = y_top
            cap.speed1 = 0
          } else {
            cap.speed1 += 0.12
            cap.y1 += cap.speed1
            if (cap.y1 > h / 2) cap.y1 = h / 2
          }
          
          if (y_bottom > cap.y2) {
            cap.y2 = y_bottom
            cap.speed2 = 0
          } else {
            cap.speed2 += 0.12
            cap.y2 -= cap.speed2
            if (cap.y2 < h / 2) cap.y2 = h / 2
          }
        }

        // 绘制粒子
        ctx.fillStyle = '#6feee1'
        ctx.shadowColor = '#6feee1'
        for (let i = 0; i < barCount; i++) {
          const x = i * (barWidth + gap)
          const cap = leftCaps.value[i]
          if (cap.y1 < h / 2 - 2) {
            const val = dataLen > 0 ? dataArray.value[(barCount - 1 - i) % dataLen] / 255.0 : 0
            ctx.shadowBlur = isPlaying.value ? val * 10 + 2 : 2
            ctx.fillRect(x, cap.y1, barWidth, 1.5)
          }
          if (cap.y2 > h / 2 + 2) {
            const val = dataLen > 0 ? dataArray.value[(barCount - 1 - i) % dataLen] / 255.0 : 0
            ctx.shadowBlur = isPlaying.value ? val * 10 + 2 : 2
            ctx.fillRect(x, cap.y2 - 1.5, barWidth, 1.5)
          }
        }
        ctx.shadowBlur = 0
      }
    }
    
    // 2. 绘制右侧对称渐变密集音柱 (左青右紫)
    if (rightCanvasRef.value) {
      const canvas = rightCanvasRef.value
      const ctx = canvas.getContext('2d')
      if (canvas.parentElement) {
        const w = canvas.width = canvas.parentElement.clientWidth
        const h = canvas.height = canvas.parentElement.clientHeight
        ctx.clearRect(0, 0, w, h)
        
        const barCount = 45
        const gap = 1.5
        const barWidth = (w - (barCount - 1) * gap) / barCount
        const dataLen = hasData ? dataArray.value.length : 0
        
        const grad = ctx.createLinearGradient(0, 0, w, 0)
        grad.addColorStop(0, palette.accent)
        grad.addColorStop(0.35, palette.secondary)
        grad.addColorStop(1, palette.primary)
        
        ctx.fillStyle = grad
        ctx.shadowBlur = isPlaying.value ? 5 : 2
        ctx.shadowColor = palette.accent
        
        if (rightCaps.value.length !== barCount) {
          rightCaps.value = new Array(barCount).fill(0).map(() => ({ y1: h / 2, y2: h / 2, speed1: 0, speed2: 0 }))
        }
        
        for (let i = 0; i < barCount; i++) {
          const val = dataLen > 0 ? dataArray.value[i % dataLen] / 255.0 : 0
          const barHeight = isPlaying.value ? val * (h * 0.78) + 2 : 2
          
          const x = i * (barWidth + gap)
          const y = (h / 2) - (barHeight / 2)
          if (barWidth <= 0 || barHeight <= 0) continue
          
          // 绘制圆角音柱
          const radius = Math.max(0, Math.min(barWidth / 2, barHeight / 2, 2))
          ctx.beginPath()
          ctx.roundRect(x, y, barWidth, barHeight, radius)
          ctx.fill()

          // 更新粒子状态
          const cap = rightCaps.value[i]
          const y_top = y
          const y_bottom = y + barHeight
          
          if (y_top < cap.y1) {
            cap.y1 = y_top
            cap.speed1 = 0
          } else {
            cap.speed1 += 0.12
            cap.y1 += cap.speed1
            if (cap.y1 > h / 2) cap.y1 = h / 2
          }
          
          if (y_bottom > cap.y2) {
            cap.y2 = y_bottom
            cap.speed2 = 0
          } else {
            cap.speed2 += 0.12
            cap.y2 -= cap.speed2
            if (cap.y2 < h / 2) cap.y2 = h / 2
          }
        }

        // 绘制粒子
        ctx.fillStyle = '#6feee1'
        ctx.shadowColor = '#6feee1'
        for (let i = 0; i < barCount; i++) {
          const x = i * (barWidth + gap)
          const cap = rightCaps.value[i]
          if (cap.y1 < h / 2 - 2) {
            const val = dataLen > 0 ? dataArray.value[i % dataLen] / 255.0 : 0
            ctx.shadowBlur = isPlaying.value ? val * 10 + 2 : 2
            ctx.fillRect(x, cap.y1, barWidth, 1.5)
          }
          if (cap.y2 > h / 2 + 2) {
            const val = dataLen > 0 ? dataArray.value[i % dataLen] / 255.0 : 0
            ctx.shadowBlur = isPlaying.value ? val * 10 + 2 : 2
            ctx.fillRect(x, cap.y2 - 1.5, barWidth, 1.5)
          }
        }
        ctx.shadowBlur = 0
      }
    }
  }


  const stopSpectrum = () => {
    if (spectrumFrameId) {
      cancelAnimationFrame(spectrumFrameId)
      spectrumFrameId = null
    }
  }

  return {
    audioCtx,
    analyser,
    canvasRef,
    dataArray,
    leftCaps,
    rightCaps,
    initAnalyser,
    drawSpectrums,
    stopSpectrum,
  }
}
