/**
 * Behavior-freeze split of MusicPlayer.vue into shell + composables/panels.
 * Keeps public path MusicPlayer.vue stable.
 */
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../frontend/src/components/music');
const composablesDir = path.join(__dirname, '../frontend/src/composables');
const srcPath = path.join(dir, 'MusicPlayer.vue');
const raw = fs.readFileSync(srcPath, 'utf8');
const lines = raw.split(/\r?\n/);

if (lines.length < 2000) {
  console.log('MusicPlayer.vue already looks split (', lines.length, 'lines). Aborting.');
  process.exit(0);
}

let scriptStart = -1, scriptEnd = -1, templateStart = -1, templateEnd = -1, styleStart = -1, styleEnd = -1;
for (let i = 0; i < lines.length; i++) {
  const l = lines[i].trim();
  if (l === '<script setup>' && scriptStart < 0) scriptStart = i;
  else if (l === '</script>' && scriptEnd < 0) scriptEnd = i;
  else if (l === '<template>' && templateStart < 0) templateStart = i;
  else if (l.startsWith('<style') && styleStart < 0) styleStart = i;
  else if (l === '</style>' && styleEnd < 0) styleEnd = i;
}
if (templateStart >= 0 && styleStart > templateStart) {
  for (let i = styleStart - 1; i > templateStart; i--) {
    if (lines[i].trim() === '</template>') {
      templateEnd = i;
      break;
    }
  }
}
if ([scriptStart, scriptEnd, templateStart, templateEnd, styleStart, styleEnd].some((x) => x < 0)) {
  throw new Error('Could not locate SFC sections');
}

const scriptBody = lines.slice(scriptStart + 1, scriptEnd);
const templateBody = lines.slice(templateStart + 1, templateEnd);
const styleBody = lines.slice(styleStart + 1, styleEnd);

const findLine = (re, from = 0) => {
  for (let i = from; i < scriptBody.length; i++) {
    if (re.test(scriptBody[i])) return i;
  }
  return -1;
};

const findBlockEnd = (arr, start) => {
  for (let i = start + 1; i < arr.length; i++) {
    if (/^(const |let |watch\(|onMounted|onUnmounted|\/\/ ===|async function|function )/.test(arr[i])) {
      return i;
    }
  }
  return arr.length;
};

const indent = (block, n = 2) => {
  const pad = ' '.repeat(n);
  return block.map((l) => (l.length ? pad + l : ''));
};

const spectrumComment = findLine(/^\/\/ === 频谱 ===/);
const danmakuComment = findLine(/^\/\/ === 弹幕 ===/);
const prevVolumeLine = findLine(/^const prevVolume = ref/);
const onMountedLine = findLine(/^onMounted\(/);
const startAudioLine = findLine(/^const startAudioPlayback =/);
const controlsComment = findLine(/^\/\/ === 播放控制 ===/);
const toggleDanmakuLine = findLine(/^const toggleDanmaku =/);

if ([spectrumComment, danmakuComment, prevVolumeLine, onMountedLine, startAudioLine, controlsComment, toggleDanmakuLine].some((x) => x < 0)) {
  throw new Error(`Required markers missing: spectrum=${spectrumComment} danmaku=${danmakuComment} prevVol=${prevVolumeLine} mounted=${onMountedLine} startAudio=${startAudioLine} controls=${controlsComment} toggleDanmaku=${toggleDanmakuLine}`);
}

const startAudioEnd = findBlockEnd(scriptBody, startAudioLine);
const toggleDanmakuEnd = findBlockEnd(scriptBody, toggleDanmakuLine);

// Precise slices
const startAudioBlock = scriptBody.slice(startAudioLine, startAudioEnd);
const controlsBlock = scriptBody.slice(controlsComment + 1, spectrumComment); // play..onEnded only
const spectrumBlock = scriptBody.slice(spectrumComment + 1, prevVolumeLine);
const muteBlock = scriptBody.slice(prevVolumeLine, danmakuComment);
const danmakuBlock = scriptBody.slice(danmakuComment + 1, onMountedLine);

console.log('block sizes', {
  startAudio: startAudioBlock.length,
  controls: controlsBlock.length,
  spectrum: spectrumBlock.length,
  mute: muteBlock.length,
  danmaku: danmakuBlock.length,
});

const spectrumComposable = [
  "import { ref } from 'vue'",
  '',
  '/** Behavior-freeze extraction: audio spectrum rendering for MusicPlayer. */',
  'export function useMusicSpectrum(deps) {',
  '  const {',
  '    audioEl,',
  '    isPlaying,',
  '    leftCanvasRef,',
  '    rightCanvasRef,',
  '    headerCanvasRef,',
  '  } = deps',
  '',
  '  const audioCtx = ref(null)',
  '  const analyser = ref(null)',
  '  const canvasRef = ref(null)',
  '  const dataArray = ref(null)',
  '  const leftCaps = ref([])',
  '  const rightCaps = ref([])',
  '  let spectrumFrameId = null',
  '',
  ...indent(spectrumBlock.filter((l) => !/^let spectrumFrameId = null/.test(l))),
  '',
  '  const stopSpectrum = () => {',
  '    if (spectrumFrameId) {',
  '      cancelAnimationFrame(spectrumFrameId)',
  '      spectrumFrameId = null',
  '    }',
  '  }',
  '',
  '  return {',
  '    audioCtx,',
  '    analyser,',
  '    canvasRef,',
  '    dataArray,',
  '    leftCaps,',
  '    rightCaps,',
  '    initAnalyser,',
  '    drawSpectrums,',
  '    stopSpectrum,',
  '  }',
  '}',
  '',
].join('\n');

const danmakuComposable = [
  "import { ref } from 'vue'",
  '',
  '/** Behavior-freeze extraction: danmaku load/draw for MusicPlayer. */',
  'export function useMusicDanmaku(deps) {',
  '  const { danmakuCanvas, currentTime, isPlaying } = deps',
  '',
  '  const danmakuItems = ref([])',
  '  const danmakuEnabled = ref(true)',
  '  const activeDanmaku = ref([])',
  '  let danmakuFrame = null',
  '',
  '  const toggleDanmaku = () => {',
  '    danmakuEnabled.value = !danmakuEnabled.value',
  '  }',
  '',
  ...indent(danmakuBlock),
  '',
  '  const stopDanmaku = () => {',
  '    if (danmakuFrame) {',
  '      cancelAnimationFrame(danmakuFrame)',
  '      danmakuFrame = null',
  '    }',
  '  }',
  '',
  '  return {',
  '    danmakuItems,',
  '    danmakuEnabled,',
  '    activeDanmaku,',
  '    toggleDanmaku,',
  '    loadDanmaku,',
  '    drawDanmaku,',
  '    stopDanmaku,',
  '  }',
  '}',
  '',
].join('\n');

const playbackComposable = [
  "import { ref } from 'vue'",
  "import { toast } from '../utils/toast.js'",
  "import { formatTrackLabel } from '../utils/musicTrackHelpers.js'",
  '',
  '/** Behavior-freeze extraction: core audio playback controls for MusicPlayer. */',
  'export function useMusicPlayback(deps) {',
  '  const {',
  '    audioEl,',
  '    audioCtx,',
  '    playlist,',
  '    currentIndex,',
  '    currentTrack,',
  '    isPlaying,',
  '    currentTime,',
  '    duration,',
  '    volume,',
  '    playMode,',
  '    nextRecommendTrack,',
  '    loadLyrics,',
  '    resetLyrics,',
  '    resetPetLyricIndex,',
  '    updateCurrentLyrics,',
  '    notifyMusicPetPlaying,',
  '    notifyMusicPetIdle,',
  '    notifyMusicPet,',
  '    updatePreselectedTrack,',
  '    loadDanmaku,',
  '    initAnalyser,',
  '    drawSpectrums,',
  '    drawDanmaku,',
  '    danmakuItems,',
  '    addBubbleComment,',
  '  } = deps',
  '',
  '  const prevVolume = ref(0.7)',
  '',
  ...indent(startAudioBlock),
  '',
  ...indent(controlsBlock),
  '',
  ...indent(muteBlock.filter((l) => !/^const prevVolume = ref/.test(l))),
  '',
  '  return {',
  '    prevVolume,',
  '    startAudioPlayback,',
  '    play,',
  '    togglePlay,',
  '    stopPlayback,',
  '    nextTrack,',
  '    prevTrack,',
  '    seekTo,',
  '    setVolume,',
  '    onTimeUpdate,',
  '    onEnded,',
  '    toggleMute,',
  '  }',
  '}',
  '',
].join('\n');

// Remove extracted ranges from remaining script (end -> start)
const removeRanges = [
  [startAudioLine, startAudioEnd],
  [toggleDanmakuLine, toggleDanmakuEnd],
  [controlsComment, spectrumComment],
  [spectrumComment, danmakuComment],
  [danmakuComment, onMountedLine],
].sort((a, b) => b[0] - a[0]);

let remaining = scriptBody.slice();
for (const [a, b] of removeRanges) {
  remaining = [...remaining.slice(0, a), ...remaining.slice(b)];
}

remaining = remaining.filter((l) => !(
  /^\/\/ === 弹幕与频谱状态 ===/.test(l)
  || /^const audioCtx = ref/.test(l)
  || /^const analyser = ref/.test(l)
  || /^const canvasRef = ref/.test(l)
  || /^const dataArray = ref/.test(l)
  || /^const danmakuCanvas = ref/.test(l)
  || /^const danmakuItems = ref/.test(l)
  || /^const danmakuEnabled = ref/.test(l)
  || /^const activeDanmaku = ref/.test(l)
  || /^const leftCaps = ref/.test(l)
  || /^const rightCaps = ref/.test(l)
  || /^let animFrame = null/.test(l)
  || /^let danmakuFrame = null/.test(l)
  || /^let spectrumFrameId = null/.test(l)
  || /^\/\/ 频谱与弹幕控制器/.test(l)
));

const atmEnd = remaining.findIndex((l) => /^\} = useMusicAtmosphere/.test(l));
if (atmEnd < 0) throw new Error('useMusicAtmosphere destructure end not found');

const spectrumWire = [
  '',
  'const danmakuCanvas = ref(null)',
  '',
  'const {',
  '  audioCtx,',
  '  analyser,',
  '  canvasRef,',
  '  dataArray,',
  '  leftCaps,',
  '  rightCaps,',
  '  initAnalyser,',
  '  drawSpectrums,',
  '  stopSpectrum,',
  '} = useMusicSpectrum({',
  '  audioEl,',
  '  isPlaying,',
  '  leftCanvasRef,',
  '  rightCanvasRef,',
  '  headerCanvasRef,',
  '})',
  '',
  'const {',
  '  danmakuItems,',
  '  danmakuEnabled,',
  '  activeDanmaku,',
  '  toggleDanmaku,',
  '  loadDanmaku,',
  '  drawDanmaku,',
  '  stopDanmaku,',
  '} = useMusicDanmaku({',
  '  danmakuCanvas,',
  '  currentTime,',
  '  isPlaying,',
  '})',
  '',
];
remaining = [...remaining.slice(0, atmEnd + 1), ...spectrumWire, ...remaining.slice(atmEnd + 1)];

const delPlaylist = remaining.findIndex((l) => /^const deleteActivePlaylist =/.test(l));
let wireAt = remaining.findIndex((l) => /^onMounted\(/.test(l));
if (delPlaylist >= 0) {
  for (let i = delPlaylist + 1; i < remaining.length; i++) {
    if (/^(const |let |watch\(|onMounted|onUnmounted|\/\/ ===)/.test(remaining[i])) {
      wireAt = i;
      break;
    }
  }
}

const playbackWire = [
  '',
  'const {',
  '  prevVolume,',
  '  startAudioPlayback,',
  '  play,',
  '  togglePlay,',
  '  stopPlayback,',
  '  nextTrack,',
  '  prevTrack,',
  '  seekTo,',
  '  setVolume,',
  '  onTimeUpdate,',
  '  onEnded,',
  '  toggleMute,',
  '} = useMusicPlayback({',
  '  audioEl,',
  '  audioCtx,',
  '  playlist,',
  '  currentIndex,',
  '  currentTrack,',
  '  isPlaying,',
  '  currentTime,',
  '  duration,',
  '  volume,',
  '  playMode,',
  '  nextRecommendTrack,',
  '  loadLyrics,',
  '  resetLyrics,',
  '  resetPetLyricIndex,',
  '  updateCurrentLyrics,',
  '  notifyMusicPetPlaying,',
  '  notifyMusicPetIdle,',
  '  notifyMusicPet,',
  '  updatePreselectedTrack,',
  '  loadDanmaku,',
  '  initAnalyser,',
  '  drawSpectrums,',
  '  drawDanmaku,',
  '  danmakuItems,',
  '  addBubbleComment,',
  '})',
  '',
];
remaining = [...remaining.slice(0, wireAt), ...playbackWire, ...remaining.slice(wireAt)];

for (let i = 0; i < remaining.length; i++) {
  if (/spectrumFrameId/.test(remaining[i]) && /cancelAnimationFrame/.test(remaining[i])) {
    remaining[i] = remaining[i].replace(/if\s*\(\s*spectrumFrameId\s*\)\s*cancelAnimationFrame\(\s*spectrumFrameId\s*\)/, 'stopSpectrum()');
    if (/spectrumFrameId/.test(remaining[i])) remaining[i] = '    stopSpectrum()';
  }
  if (/danmakuFrame/.test(remaining[i]) && /cancelAnimationFrame/.test(remaining[i])) {
    remaining[i] = remaining[i].replace(/if\s*\(\s*danmakuFrame\s*\)\s*cancelAnimationFrame\(\s*danmakuFrame\s*\)/, 'stopDanmaku()');
    if (/danmakuFrame/.test(remaining[i])) remaining[i] = '    stopDanmaku()';
  }
}

const importLines = [];
const bodyLines = [];
for (const line of remaining) {
  if (/^\s*import\s/.test(line)) importLines.push(line);
  else bodyLines.push(line);
}
importLines.push("import { useMusicPlayback } from '../../composables/useMusicPlayback.js'");
importLines.push("import { useMusicSpectrum } from '../../composables/useMusicSpectrum.js'");
importLines.push("import { useMusicDanmaku } from '../../composables/useMusicDanmaku.js'");

let body = bodyLines.join('\n');
body = body.replace(
  /const props = defineProps\(\{\s*agentLabel: \{ type: String, default: '乖乖' \}\s*\}\)/,
  "const props = { agentLabel: options.agentLabel }"
);

const bindings = new Set();
for (const line of body.split('\n')) {
  const m = line.match(/^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)|^(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/);
  if (m) bindings.add(m[1] || m[2]);
}
let inDestructure = false;
for (const line of body.split('\n')) {
  if (/^const \{/.test(line)) { inDestructure = true; continue; }
  if (inDestructure) {
    if (/^\} =/.test(line)) { inDestructure = false; continue; }
    const m = line.match(/^\s*([A-Za-z_$][\w$]*)/);
    if (m) bindings.add(m[1]);
  }
}

const vueInternals = new Set([
  'ref', 'computed', 'onMounted', 'onUnmounted', 'watch', 'watchEffect', 'nextTick',
  'reactive', 'toRef', 'toRefs', 'shallowRef', 'defineProps', 'defineEmits', 'defineExpose', 'props', 'options',
]);
const returnNames = [...bindings].filter((n) => !vueInternals.has(n)).sort();
const templateText = templateBody.join('\n');
for (const name of ['MusicAgentSettingsModal', 'MusicDownloadCenter']) {
  if (templateText.includes(name) && !returnNames.includes(name)) returnNames.push(name);
}

// Sanity: no duplicate play/const declarations of extracted names at top level
for (const dup of ['play', 'togglePlay', 'startAudioPlayback', 'initAnalyser', 'drawSpectrums', 'loadDanmaku', 'drawDanmaku']) {
  const re = new RegExp(`^  const ${dup} =`, 'm');
  const count = (body.match(new RegExp(`^const ${dup} =`, 'gm')) || []).length;
  if (count > 0) {
    console.warn(`WARNING: leftover declaration of ${dup} in remaining body (${count})`);
  }
}

const useMusicPlayer = [
  ...importLines,
  '',
  'export function useMusicPlayer(options = {}) {',
  ...body.split('\n').map((l) => (l.length ? '  ' + l : '')),
  '',
  '  return {',
  ...returnNames.map((n, i) => `    ${n}${i < returnNames.length - 1 ? ',' : ''}`),
  '  }',
  '}',
  '',
].join('\n');

const cssSplitHint = styleBody.findIndex((l, i) => i > 700 && i < 1000 && /\/\* 4\. 本地歌曲库/.test(l));
const cssSplitAt = cssSplitHint > 0 ? cssSplitHint : Math.floor(styleBody.length / 2);

fs.writeFileSync(path.join(composablesDir, 'useMusicSpectrum.js'), spectrumComposable);
fs.writeFileSync(path.join(composablesDir, 'useMusicDanmaku.js'), danmakuComposable);
fs.writeFileSync(path.join(composablesDir, 'useMusicPlayback.js'), playbackComposable);
fs.writeFileSync(path.join(dir, 'useMusicPlayer.js'), useMusicPlayer);
fs.writeFileSync(path.join(dir, 'MusicPlayer.template.html'), templateBody.join('\n') + '\n');
fs.writeFileSync(path.join(dir, 'MusicPlayer.css'), styleBody.slice(0, cssSplitAt).join('\n') + '\n');
fs.writeFileSync(path.join(dir, 'MusicPlayerPanels.css'), styleBody.slice(cssSplitAt).join('\n') + '\n');

const panel = `<script setup>
import { useMusicPlayer } from './useMusicPlayer.js'

const props = defineProps({
  agentLabel: { type: String, default: '乖乖' }
})

const {
${returnNames.map((n) => `  ${n},`).join('\n')}
} = useMusicPlayer({ agentLabel: props.agentLabel })
</script>

<template src="./MusicPlayer.template.html"></template>

<style scoped src="./MusicPlayer.css"></style>
<style scoped src="./MusicPlayerPanels.css"></style>
`;
fs.writeFileSync(path.join(dir, 'MusicPlayerPanel.vue'), panel);

const shell = `<script setup>
import MusicPlayerPanel from './MusicPlayerPanel.vue'

const props = defineProps({
  agentLabel: { type: String, default: '乖乖' }
})
</script>

<template>
  <MusicPlayerPanel :agent-label="props.agentLabel" />
</template>
`;
fs.writeFileSync(srcPath, shell);

const count = (p) => fs.readFileSync(p, 'utf8').split(/\r?\n/).length;
const report = [
  ['MusicPlayer.vue', path.join(dir, 'MusicPlayer.vue')],
  ['MusicPlayerPanel.vue', path.join(dir, 'MusicPlayerPanel.vue')],
  ['useMusicPlayer.js', path.join(dir, 'useMusicPlayer.js')],
  ['useMusicPlayback.js', path.join(composablesDir, 'useMusicPlayback.js')],
  ['useMusicSpectrum.js', path.join(composablesDir, 'useMusicSpectrum.js')],
  ['useMusicDanmaku.js', path.join(composablesDir, 'useMusicDanmaku.js')],
  ['MusicPlayer.template.html', path.join(dir, 'MusicPlayer.template.html')],
  ['MusicPlayer.css', path.join(dir, 'MusicPlayer.css')],
  ['MusicPlayerPanels.css', path.join(dir, 'MusicPlayerPanels.css')],
];
console.log('MusicPlayer split complete:');
for (const [name, p] of report) console.log(String(count(p)).padStart(6), name);
