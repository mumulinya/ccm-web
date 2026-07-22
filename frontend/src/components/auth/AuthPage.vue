<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { ArrowUpRight, Check, ChevronDown, Eye, EyeOff, KeyRound, LockKeyhole, LogIn, Palette, ShieldCheck, UserPlus, UserRound } from '@lucide/vue'
import { AUTH_THEMES, normalizeAuthTheme, readLocalAuthTheme, saveLocalAuthTheme } from '../../utils/authAppearance.js'

const props = defineProps({
  registrationEnabled: { type: Boolean, default: false },
  firstInstall: { type: Boolean, default: false },
  defaultTheme: { type: String, default: 'command' },
})
const emit = defineEmits(['authenticated'])

const mode = ref('login')
const username = ref('')
const password = ref('')
const confirmPassword = ref('')
const revealPassword = ref(false)
const loading = ref(false)
const error = ref('')
const themeOpen = ref(false)
const currentTheme = ref(readLocalAuthTheme() || normalizeAuthTheme(props.defaultTheme))
const capsLock = ref(false)
const isOnline = ref(typeof navigator === 'undefined' ? true : navigator.onLine)

const isRegister = computed(() => mode.value === 'register')
const activeTheme = computed(() => AUTH_THEMES.find(theme => theme.id === currentTheme.value) || AUTH_THEMES[0])
const passwordStrength = computed(() => {
  const value = password.value
  let score = 0
  if (value.length >= 8) score++
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score++
  if (/\d/.test(value)) score++
  if (/[^\p{L}\p{N}]/u.test(value)) score++
  const labels = ['请输入至少 8 个字符', '较弱', '一般', '较强', '强']
  return { score, label: value ? labels[score] : labels[0] }
})

watch(() => props.registrationEnabled, enabled => {
  if (!enabled && !props.firstInstall && mode.value === 'register') mode.value = 'login'
})
watch(() => props.defaultTheme, value => {
  if (!readLocalAuthTheme()) currentTheme.value = normalizeAuthTheme(value)
})

const selectTheme = value => {
  currentTheme.value = saveLocalAuthTheme(value)
  themeOpen.value = false
}
const updateCapsLock = event => { capsLock.value = event.getModifierState?.('CapsLock') === true }
const updateOnlineState = () => { isOnline.value = navigator.onLine }

const switchMode = next => {
  if (next === 'register' && !props.registrationEnabled && !props.firstInstall) return
  mode.value = next
  password.value = ''
  confirmPassword.value = ''
  error.value = ''
}

const submit = async () => {
  error.value = ''
  if (!isOnline.value) {
    error.value = '当前网络不可用，请恢复连接后重试'
    return
  }
  if (!username.value.trim() || !password.value) {
    error.value = '请输入用户名和密码'
    return
  }
  if (isRegister.value && password.value !== confirmPassword.value) {
    error.value = '两次输入的密码不一致'
    return
  }
  loading.value = true
  try {
    const endpoint = isRegister.value ? '/api/auth/register' : '/api/auth/login'
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.value.trim(), password: password.value }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok || !data.success) throw new Error(data.error || (isRegister.value ? '注册失败' : '登录失败'))
    emit('authenticated', { user: data.user, registration_enabled: data.registration_enabled, first_install: data.first_install, login_theme: data.login_theme })
  } catch (cause) {
    error.value = cause?.message || '暂时无法连接 CCM 服务'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  window.addEventListener('online', updateOnlineState)
  window.addEventListener('offline', updateOnlineState)
})
onUnmounted(() => {
  window.removeEventListener('online', updateOnlineState)
  window.removeEventListener('offline', updateOnlineState)
})
</script>

<template>
  <main class="auth-page" :data-auth-theme="currentTheme">
    <div class="auth-image" aria-hidden="true"></div>
    <div class="auth-shade" aria-hidden="true"></div>
    <header class="auth-brand">
      <span class="auth-brand-mark"><img src="/favicon.svg" alt="" /></span>
      <div><strong>CCM</strong><small>CONNECTED CONTROL MATRIX</small></div>
    </header>
    <div class="auth-theme-picker">
      <button type="button" class="auth-theme-trigger" :aria-expanded="themeOpen" aria-label="切换登录页主题" @click="themeOpen = !themeOpen">
        <Palette :size="15" /><span>{{ activeTheme.label }}</span><ChevronDown :size="13" />
      </button>
      <div v-if="themeOpen" class="auth-theme-menu">
        <button v-for="theme in AUTH_THEMES" :key="theme.id" type="button" :class="{ active: currentTheme === theme.id }" @click="selectTheme(theme.id)">
          <i :data-preview-theme="theme.id"></i><span><strong>{{ theme.label }}</strong><small>{{ theme.description }}</small></span><Check v-if="currentTheme === theme.id" :size="14" />
        </button>
      </div>
    </div>

    <div class="auth-layout">
      <section class="auth-hero" aria-label="CCM 工作区">
        <div class="auth-hero-copy">
          <span class="auth-kicker">AI · AGENT · COLLABORATION</span>
          <h1>让每一次协作<br /><em>都有上下文。</em></h1>
          <p>CCM 连接全局 Agent、群聊、项目会话与记忆系统，让复杂协作保持清晰。</p>
        </div>
        <div class="auth-hero-line"><span>LOCAL AGENT WORKSPACE</span><i></i></div>
      </section>

      <section class="auth-shell" aria-labelledby="auth-title">
        <div class="auth-form-panel">
          <div class="auth-form-topline"><span><i></i> SECURE CHANNEL</span><code>LOCAL / AUTH</code></div>
          <div class="auth-copy">
            <span class="auth-kicker">WELCOME BACK</span>
            <h2 id="auth-title">{{ isRegister ? '创建本地账户' : '欢迎回来' }}</h2>
            <p>{{ isRegister ? '创建账户后即可开始使用 CCM。' : '登录你的 CCM 工作区，继续智能协作。' }}</p>
            <div v-if="firstInstall" class="auth-first-install"><span>首次安装</span><small>可使用初始管理员登录，或创建普通账户。</small></div>
            <div v-if="!isOnline" class="auth-offline"><ShieldCheck :size="14" /><span>当前网络不可用，登录暂时不可用。</span></div>
          </div>

          <div v-if="registrationEnabled || firstInstall" class="auth-modes" role="tablist" aria-label="账户操作">
            <button type="button" :class="{ active: mode === 'login' }" role="tab" :aria-selected="mode === 'login'" @click="switchMode('login')"><LogIn :size="15" />账户登录</button>
            <button type="button" :class="{ active: mode === 'register' }" role="tab" :aria-selected="mode === 'register'" @click="switchMode('register')"><UserPlus :size="15" />注册账户</button>
          </div>

          <form class="auth-form" @submit.prevent="submit">
            <label>
              <span>用户名 / 账户</span>
              <div class="auth-input-wrap"><UserRound :size="16" /><input v-model="username" name="username" autocomplete="username" maxlength="32" autofocus placeholder="请输入用户名" /></div>
            </label>
            <label>
              <span>密码</span>
              <div class="auth-input-wrap">
                <KeyRound :size="16" />
                <input v-model="password" name="password" :type="revealPassword ? 'text' : 'password'" :autocomplete="isRegister ? 'new-password' : 'current-password'" maxlength="128" placeholder="请输入密码" @keydown="updateCapsLock" @keyup="updateCapsLock" @blur="capsLock = false" />
                <button type="button" class="password-toggle" :title="revealPassword ? '隐藏密码' : '显示密码'" :aria-label="revealPassword ? '隐藏密码' : '显示密码'" @click="revealPassword = !revealPassword"><EyeOff v-if="revealPassword" :size="16" /><Eye v-else :size="16" /></button>
              </div>
            </label>
            <p v-if="capsLock" class="auth-caps-hint">大写锁定已开启</p>
            <div v-if="isRegister" class="auth-password-strength" :data-strength="passwordStrength.score">
              <div><i v-for="index in 4" :key="index" :class="{ active: index <= passwordStrength.score }"></i></div><span>密码强度：{{ passwordStrength.label }}</span>
            </div>
            <label v-if="isRegister">
              <span>确认密码</span>
              <div class="auth-input-wrap"><KeyRound :size="16" /><input v-model="confirmPassword" name="confirm-password" :type="revealPassword ? 'text' : 'password'" autocomplete="new-password" maxlength="128" placeholder="请再次输入密码" /></div>
            </label>
            <p v-if="error" class="auth-error" role="alert"><ShieldCheck :size="15" />{{ error }}</p>
            <button class="auth-submit" type="submit" :disabled="loading || !isOnline">
              <component :is="isRegister ? UserPlus : LogIn" :size="17" />
              {{ loading ? '正在连接' : (isRegister ? '创建账户' : '登录工作区') }}
              <ArrowUpRight class="auth-submit-arrow" :size="16" />
            </button>
          </form>
          <div class="auth-persist"><LockKeyhole :size="14" /><span>登录状态安全保存 7 天</span><span class="auth-persist-line"></span><small>HTTPONLY</small></div>
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>
.auth-page { position: relative; width: 100%; min-height: 100%; display: grid; place-items: center; overflow: auto; padding: 28px 42px; box-sizing: border-box; background: #03090f; color: #f4fbff; }
.auth-image { position: absolute; inset: 0; background: url('/auth-command-center-bg.png') center / cover no-repeat; transform: scale(1.015); }
.auth-shade { position: absolute; inset: 0; background: linear-gradient(90deg, rgba(2, 8, 13, .22) 0%, rgba(2, 8, 13, .18) 39%, rgba(2, 7, 12, .68) 62%, rgba(2, 7, 12, .94) 100%), linear-gradient(0deg, rgba(2, 7, 12, .52), transparent 42%, rgba(2, 7, 12, .28)); }
.auth-brand { position: absolute; z-index: 3; top: 34px; left: 44px; display: flex; align-items: center; gap: 11px; }
.auth-brand-mark { width: 38px; height: 38px; display: block; overflow: hidden; border-radius: 10px; box-shadow: 0 0 22px rgba(27, 191, 190, .16); }.auth-brand-mark img { width: 100%; height: 100%; display: block; }
.auth-brand div { display: grid; gap: 3px; }.auth-brand strong { color: #f0fbff; font-size: 16px; letter-spacing: .08em; }.auth-brand small { color: #8ea6ad; font-family: var(--font-mono, monospace); font-size: 7px; letter-spacing: .13em; }
.auth-theme-picker { position: absolute; z-index: 5; top: 34px; right: 42px; }.auth-theme-trigger { height: 34px; display: inline-flex; align-items: center; gap: 7px; padding: 0 10px; border: 1px solid rgba(126, 187, 199, .25); border-radius: 7px; background: rgba(4, 15, 23, .72); color: #a5bdc2; font-size: 10px; cursor: pointer; backdrop-filter: blur(14px); }.auth-theme-trigger:hover { border-color: rgba(92, 225, 192, .48); color: #6fe3c5; }.auth-theme-menu { position: absolute; top: 42px; right: 0; width: 246px; display: grid; gap: 3px; padding: 6px; border: 1px solid rgba(126, 187, 199, .24); border-radius: 9px; background: rgba(5, 15, 23, .96); box-shadow: 0 18px 42px rgba(0, 0, 0, .38); backdrop-filter: blur(18px); }.auth-theme-menu button { min-width: 0; display: grid; grid-template-columns: 34px minmax(0, 1fr) 16px; align-items: center; gap: 9px; padding: 8px; border: 0; border-radius: 6px; background: transparent; color: #91a8ae; text-align: left; cursor: pointer; }.auth-theme-menu button:hover, .auth-theme-menu button.active { background: rgba(76, 213, 180, .09); color: #6ce2c3; }.auth-theme-menu button > i { width: 34px; height: 28px; border: 1px solid rgba(122, 176, 187, .25); border-radius: 4px; background: #07141e; }.auth-theme-menu button > i[data-preview-theme="command"] { background: linear-gradient(135deg, #06101a, #13536b); }.auth-theme-menu button > i[data-preview-theme="minimal"] { background: #0b1116; }.auth-theme-menu button > i[data-preview-theme="light"] { background: #edf4f1; }.auth-theme-menu button > span { min-width: 0; display: grid; gap: 2px; }.auth-theme-menu strong { color: inherit; font-size: 10px; }.auth-theme-menu small { overflow: hidden; color: #6e898f; font-size: 8px; text-overflow: ellipsis; white-space: nowrap; }
.auth-layout { position: relative; z-index: 2; width: min(1240px, 100%); min-height: 650px; display: grid; grid-template-columns: minmax(0, 1fr) 432px; align-items: center; gap: 76px; }
.auth-hero { align-self: stretch; display: flex; flex-direction: column; justify-content: space-between; padding: 164px 0 34px 26px; }.auth-hero-copy { max-width: 600px; }.auth-kicker { color: #55dfbf; font-family: var(--font-mono, monospace); font-size: 9px; font-weight: 700; letter-spacing: .16em; }.auth-hero h1 { margin: 18px 0 17px; color: #f5fbff; font-size: 58px; font-weight: 700; line-height: 1.08; letter-spacing: -.04em; text-shadow: 0 5px 26px rgba(0, 0, 0, .28); }.auth-hero h1 em { color: #5ce1c0; font-style: normal; }.auth-hero p { max-width: 385px; margin: 0; color: #bdcdd0; font-size: 13px; line-height: 1.8; }.auth-hero-line { display: flex; align-items: center; gap: 12px; color: rgba(181, 215, 219, .64); font-family: var(--font-mono, monospace); font-size: 8px; letter-spacing: .16em; }.auth-hero-line i { width: 92px; height: 1px; background: linear-gradient(90deg, #5bdcc0, transparent); }
.auth-shell { width: 432px; border: 1px solid rgba(121, 195, 213, .28); border-radius: 14px; background: rgba(5, 15, 23, .82); color-scheme: dark; box-shadow: 0 24px 70px rgba(0, 0, 0, .42), inset 0 1px rgba(210, 246, 255, .10); backdrop-filter: blur(18px); }
.auth-form-panel { padding: 36px 38px 29px; }.auth-form-topline { display: flex; align-items: center; justify-content: space-between; margin-bottom: 35px; color: #7da0a7; font-family: var(--font-mono, monospace); font-size: 8px; letter-spacing: .12em; }.auth-form-topline span { display: inline-flex; align-items: center; gap: 7px; }.auth-form-topline i { width: 5px; height: 5px; display: inline-block; border-radius: 50%; background: #5ce1c0; box-shadow: 0 0 0 3px rgba(92, 225, 192, .12), 0 0 10px #5ce1c0; }.auth-form-topline code { color: #66828b; font-size: 8px; }
.auth-copy { padding: 0 0 22px; }.auth-copy h2 { margin: 10px 0 8px; color: #f2fbff; font-size: 27px; font-weight: 700; letter-spacing: -.03em; }.auth-copy p { margin: 0; color: #9db3b8; font-size: 12px; line-height: 1.6; }.auth-first-install { display: flex; align-items: center; gap: 8px; margin-top: 14px; padding: 9px 10px; border: 1px solid rgba(87, 222, 191, .22); border-radius: 7px; background: rgba(41, 166, 139, .09); color: #a5e8d6; }.auth-first-install span { padding: 3px 6px; border-radius: 4px; background: rgba(75, 218, 180, .16); color: #69dfbd; font-size: 9px; font-weight: 800; white-space: nowrap; }.auth-first-install small { color: #9fc0bd; font-size: 10px; line-height: 1.45; }
.auth-modes { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-bottom: 20px; border-bottom: 1px solid rgba(127, 198, 210, .16); }.auth-modes button { position: relative; height: 36px; display: inline-flex; align-items: center; justify-content: center; gap: 7px; border: 0; background: transparent; color: #799198; font-size: 11px; font-weight: 700; cursor: pointer; }.auth-modes button.active { color: #64dfc1; }.auth-modes button.active::after { content: ''; position: absolute; right: 23%; bottom: -1px; left: 23%; height: 2px; background: #52dcbc; box-shadow: 0 0 12px rgba(82, 220, 188, .66); }
.auth-form { display: grid; gap: 15px; }.auth-form label { display: grid; gap: 7px; }.auth-form label > span { color: #9eb5b9; font-size: 10px; font-weight: 700; }.auth-input-wrap { min-height: 45px; display: grid; grid-template-columns: 20px minmax(0, 1fr) auto; align-items: center; gap: 8px; padding: 0 11px; border: 1px solid rgba(130, 180, 193, .24); border-radius: 7px; background: #06121b; color: #7998a0; transition: border-color .18s ease, box-shadow .18s ease, transform .18s ease; }.auth-input-wrap:focus-within { border-color: #42d2b1; background: #071721; box-shadow: 0 0 0 3px rgba(66, 210, 177, .12), 0 0 18px rgba(45, 185, 184, .10); transform: translateY(-1px); }.auth-input-wrap > input:not([type="checkbox"]):not([type="radio"]):not([type="range"]) { width: 100%; min-width: 0; min-height: 0 !important; height: 43px !important; padding: 0 !important; border: 0 !important; border-radius: 0 !important; outline: 0 !important; background: transparent !important; color: #e9f7fb !important; box-shadow: none !important; font: inherit; font-size: 12px; caret-color: #5ce1c0; }.auth-input-wrap > input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):focus { border: 0 !important; background: transparent !important; box-shadow: none !important; }.auth-input-wrap > input::placeholder { color: #638087 !important; opacity: 1; }.auth-input-wrap > input:-webkit-autofill, .auth-input-wrap > input:-webkit-autofill:hover, .auth-input-wrap > input:-webkit-autofill:focus { -webkit-text-fill-color: #e9f7fb !important; caret-color: #5ce1c0; -webkit-box-shadow: 0 0 0 1000px #071721 inset !important; box-shadow: 0 0 0 1000px #071721 inset !important; border: 0 !important; transition: background-color 9999s ease-out 0s; }.password-toggle { width: 28px; height: 28px; display: grid; place-items: center; padding: 0; border: 0; border-radius: 5px; background: transparent; color: #78949b; cursor: pointer; }.password-toggle:hover { background: rgba(70, 208, 177, .10); color: #6de3c2; }
.auth-error { display: flex; align-items: center; gap: 7px; margin: -2px 0 0; padding: 9px 10px; border: 1px solid rgba(224, 91, 108, .34); border-radius: 7px; background: rgba(141, 32, 48, .18); color: #ffabb5; font-size: 10px; line-height: 1.45; }.auth-error svg { flex: 0 0 auto; }
.auth-offline { display: flex; align-items: center; gap: 7px; margin-top: 12px; padding: 8px 9px; border: 1px solid rgba(226, 160, 71, .32); border-radius: 6px; background: rgba(151, 93, 25, .14); color: #eec288; font-size: 9px; }.auth-caps-hint { margin: -8px 0 -4px; color: #e8b66c; font-size: 9px; }.auth-password-strength { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: -6px; color: #718c92; font-size: 9px; }.auth-password-strength > div { flex: 1; display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; }.auth-password-strength i { height: 3px; border-radius: 2px; background: rgba(126, 174, 183, .18); }.auth-password-strength i.active { background: #d55b68; }.auth-password-strength[data-strength="2"] i.active { background: #d49a42; }.auth-password-strength[data-strength="3"] i.active { background: #54b697; }.auth-password-strength[data-strength="4"] i.active { background: #53dfb9; }
.auth-submit { height: 45px; margin-top: 2px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; border: 0; border-radius: 7px; background: linear-gradient(90deg, #0aa686, #149bb5); color: #f4ffff; font-size: 12px; font-weight: 800; cursor: pointer; box-shadow: 0 10px 22px rgba(0, 135, 150, .23); transition: filter .18s ease, transform .18s ease, box-shadow .18s ease; }.auth-submit:hover { filter: brightness(1.12); box-shadow: 0 13px 28px rgba(0, 155, 165, .30); transform: translateY(-1px); }.auth-submit:disabled { opacity: .62; cursor: wait; transform: none; }.auth-submit-arrow { margin-left: 4px; }
.auth-persist { display: flex; align-items: center; gap: 7px; padding-top: 19px; color: #789096; font-family: var(--font-mono, monospace); font-size: 8px; }.auth-persist svg { color: #5cdbbc; }.auth-persist-line { height: 1px; flex: 1; background: rgba(133, 188, 196, .16); }.auth-persist small { color: #6c858c; font-size: 7px; }
[data-auth-theme="minimal"] { background: #070b0f; }.auth-page[data-auth-theme="minimal"] .auth-image { display: none; }.auth-page[data-auth-theme="minimal"] .auth-shade { background: linear-gradient(rgba(85, 221, 190, .035) 1px, transparent 1px), linear-gradient(90deg, rgba(85, 221, 190, .035) 1px, transparent 1px), #070b0f; background-size: 42px 42px; }.auth-page[data-auth-theme="minimal"] .auth-shell { background: #0d151b; border-color: #25363d; }.auth-page[data-auth-theme="minimal"] .auth-hero h1 { color: #f2f6f7; }.auth-page[data-auth-theme="minimal"] .auth-hero p { color: #97a8ac; }.auth-page[data-auth-theme="minimal"] .auth-theme-trigger, .auth-page[data-auth-theme="minimal"] .auth-theme-menu { background: #0d151b; }
.auth-page[data-auth-theme="light"] { background: #eef4f1; color: #17241f; }.auth-page[data-auth-theme="light"] .auth-image { opacity: .17; filter: grayscale(.25) brightness(1.5); }.auth-page[data-auth-theme="light"] .auth-shade { background: linear-gradient(90deg, rgba(244, 249, 246, .72), rgba(244, 249, 246, .82) 55%, rgba(237, 244, 241, .96)); }.auth-page[data-auth-theme="light"] .auth-brand-mark { border-color: #8bd8c0; background: rgba(255,255,255,.72); color: #147a5d; box-shadow: none; }.auth-page[data-auth-theme="light"] .auth-brand strong { color: #14241d; }.auth-page[data-auth-theme="light"] .auth-brand small { color: #71847b; }.auth-page[data-auth-theme="light"] .auth-hero h1 { color: #17251f; text-shadow: none; }.auth-page[data-auth-theme="light"] .auth-hero h1 em, .auth-page[data-auth-theme="light"] .auth-kicker { color: #147a5d; }.auth-page[data-auth-theme="light"] .auth-hero p, .auth-page[data-auth-theme="light"] .auth-hero-line { color: #62766c; }.auth-page[data-auth-theme="light"] .auth-shell { color-scheme: light; border-color: #c8d9d1; background: rgba(255,255,255,.90); box-shadow: 0 24px 65px rgba(32, 62, 48, .15), inset 0 1px #fff; }.auth-page[data-auth-theme="light"] .auth-form-topline { color: #678078; }.auth-page[data-auth-theme="light"] .auth-copy h2 { color: #14241d; }.auth-page[data-auth-theme="light"] .auth-copy p, .auth-page[data-auth-theme="light"] .auth-form label > span { color: #62766d; }.auth-page[data-auth-theme="light"] .auth-input-wrap { border-color: #c8d8d0; background: #f7faf8; color: #6d8177; }.auth-page[data-auth-theme="light"] .auth-input-wrap:focus-within { border-color: #219371; background: #fff; box-shadow: 0 0 0 3px rgba(33,147,113,.12); }.auth-page[data-auth-theme="light"] .auth-input-wrap > input:not([type="checkbox"]):not([type="radio"]):not([type="range"]) { color: #17251f !important; }.auth-page[data-auth-theme="light"] .auth-input-wrap > input::placeholder { color: #92a29a !important; }.auth-page[data-auth-theme="light"] .auth-input-wrap > input:-webkit-autofill, .auth-page[data-auth-theme="light"] .auth-input-wrap > input:-webkit-autofill:hover, .auth-page[data-auth-theme="light"] .auth-input-wrap > input:-webkit-autofill:focus { -webkit-text-fill-color: #17251f !important; -webkit-box-shadow: 0 0 0 1000px #fff inset !important; box-shadow: 0 0 0 1000px #fff inset !important; }.auth-page[data-auth-theme="light"] .password-toggle { color: #687d73; }.auth-page[data-auth-theme="light"] .auth-persist { color: #6e8178; }.auth-page[data-auth-theme="light"] .auth-persist-line { background: #d6e1dc; }.auth-page[data-auth-theme="light"] .auth-theme-trigger { border-color: #c5d8cf; background: rgba(255,255,255,.82); color: #426257; }.auth-page[data-auth-theme="light"] .auth-theme-menu { border-color: #cadbd3; background: rgba(255,255,255,.97); box-shadow: 0 18px 42px rgba(34,62,50,.16); }.auth-page[data-auth-theme="light"] .auth-theme-menu button { color: #5f756a; }.auth-page[data-auth-theme="light"] .auth-theme-menu button:hover, .auth-page[data-auth-theme="light"] .auth-theme-menu button.active { background: #eef7f2; color: #147a5d; }
@media (max-width: 980px) { .auth-page { padding: 24px; }.auth-layout { grid-template-columns: minmax(0, 1fr) 400px; gap: 34px; }.auth-hero { padding-left: 4px; }.auth-hero h1 { font-size: 48px; }.auth-shell { width: 400px; }.auth-form-panel { padding-right: 30px; padding-left: 30px; } }
@media (max-width: 760px) { .auth-page { min-height: 100%; padding: 0; place-items: stretch; }.auth-image { background-position: 62% center; }.auth-shade { background: linear-gradient(180deg, rgba(2, 8, 13, .66), rgba(2, 7, 12, .92) 38%, rgba(2, 7, 12, .98)); }.auth-brand { top: 24px; left: 24px; }.auth-theme-picker { top: 25px; right: 18px; }.auth-theme-trigger span { display: none; }.auth-theme-menu { width: min(246px, calc(100vw - 36px)); }.auth-layout { width: 100%; min-height: 100%; display: block; padding: 104px 18px 24px; }.auth-hero { display: none; }.auth-shell { width: min(432px, 100%); margin: 0 auto; border-radius: 12px; background: rgba(5, 15, 23, .88); }.auth-form-panel { padding: 30px 24px 25px; }.auth-form-topline { margin-bottom: 29px; }.auth-page[data-auth-theme="light"] .auth-shade { background: rgba(239,246,242,.9); }.auth-page[data-auth-theme="light"] .auth-shell { background: rgba(255,255,255,.94); } }
@media (prefers-reduced-motion: reduce) { .auth-input-wrap, .auth-submit { transition: none; } }
</style>
