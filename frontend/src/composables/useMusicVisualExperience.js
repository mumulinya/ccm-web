import { computed, ref, watch } from 'vue'

const DEFAULT_PALETTE = {
  primary: [34, 112, 136],
  accent: [68, 215, 232],
  secondary: [154, 124, 255],
}

const clampChannel = value => Math.max(28, Math.min(228, Math.round(value)))

const colorDistance = (a, b) => Math.sqrt(
  ((a[0] - b[0]) ** 2) + ((a[1] - b[1]) ** 2) + ((a[2] - b[2]) ** 2)
)

const saturationScore = ([r, g, b]) => {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const lightness = (max + min) / 2
  return (max - min) * (1 - Math.abs((lightness / 127.5) - 1))
}

const normalizeColor = color => color.map(clampChannel)

const fallbackPalette = (seed) => {
  let hash = 0
  for (const char of String(seed || 'Aura Music')) hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0
  const hue = Math.abs(hash) % 360
  const toRgb = (offset, saturation = 0.58, lightness = 0.5) => {
    const h = ((hue + offset) % 360) / 360
    const hueToRgb = (p, q, t) => {
      let next = t
      if (next < 0) next += 1
      if (next > 1) next -= 1
      if (next < 1 / 6) return p + ((q - p) * 6 * next)
      if (next < 1 / 2) return q
      if (next < 2 / 3) return p + ((q - p) * (2 / 3 - next) * 6)
      return p
    }
    const q = lightness < 0.5 ? lightness * (1 + saturation) : lightness + saturation - (lightness * saturation)
    const p = (2 * lightness) - q
    return normalizeColor([hueToRgb(p, q, h + 1 / 3) * 255, hueToRgb(p, q, h) * 255, hueToRgb(p, q, h - 1 / 3) * 255])
  }
  return { primary: toRgb(0, 0.48, 0.42), accent: toRgb(48, 0.72, 0.58), secondary: toRgb(168, 0.6, 0.56) }
}

const extractPalette = (image) => {
  const canvas = document.createElement('canvas')
  canvas.width = 32
  canvas.height = 32
  const context = canvas.getContext('2d', { willReadFrequently: true })
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
  const colors = []
  for (let index = 0; index < pixels.length; index += 16) {
    if (pixels[index + 3] < 180) continue
    const color = [pixels[index], pixels[index + 1], pixels[index + 2]]
    const luminance = (color[0] * 0.2126) + (color[1] * 0.7152) + (color[2] * 0.0722)
    if (luminance < 18 || luminance > 238) continue
    colors.push(color)
  }
  if (colors.length < 8) throw new Error('cover palette has too few usable pixels')
  const vivid = [...colors].sort((a, b) => saturationScore(b) - saturationScore(a))
  const accent = normalizeColor(vivid[0])
  const secondary = normalizeColor(vivid.find(color => colorDistance(color, accent) > 92) || vivid[Math.floor(vivid.length / 3)] || accent)
  const primaryPool = vivid.slice(0, Math.max(6, Math.floor(vivid.length * 0.22)))
  const primary = normalizeColor(primaryPool.reduce((sum, color) => [sum[0] + color[0], sum[1] + color[1], sum[2] + color[2]], [0, 0, 0]).map(value => value / primaryPool.length))
  return { primary, accent, secondary }
}

export function useMusicVisualExperience({ currentTrack, sessionAnimeCover }) {
  const palette = ref(DEFAULT_PALETTE)
  const coverUrl = computed(() => currentTrack.value?.pic || sessionAnimeCover.value || '')
  const trackVisualKey = computed(() => [currentTrack.value?.filename, currentTrack.value?.title, coverUrl.value].filter(Boolean).join('|') || 'aura-empty')
  let paletteRequest = 0

  watch(coverUrl, (url) => {
    const request = ++paletteRequest
    const fallback = fallbackPalette(trackVisualKey.value)
    if (!url || typeof Image === 'undefined') {
      palette.value = fallback
      return
    }
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => {
      if (request !== paletteRequest) return
      try { palette.value = extractPalette(image) } catch { palette.value = fallback }
    }
    image.onerror = () => {
      if (request === paletteRequest) palette.value = fallback
    }
    image.src = url
  }, { immediate: true })

  const visualCssVars = computed(() => ({
    '--cover-primary': palette.value.primary.join(', '),
    '--cover-accent': palette.value.accent.join(', '),
    '--cover-secondary': palette.value.secondary.join(', '),
  }))

  const trackBackdropStyle = computed(() => coverUrl.value ? { backgroundImage: `url(${JSON.stringify(coverUrl.value)})` } : {})

  return { coverUrl, trackBackdropStyle, trackVisualKey, visualCssVars }
}
