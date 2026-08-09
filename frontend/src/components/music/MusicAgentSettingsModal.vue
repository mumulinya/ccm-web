<script setup>
import { Bot, Download, Globe2, LogIn, LogOut, Moon, RefreshCw, Settings2, Sparkles, Volume2, X } from '@lucide/vue'

defineProps({
  config: { type: Object, required: true },
  playbackSettings: { type: Object, required: true },
  aiSongQuoteEnabled: { type: Boolean, default: false },
  douyinLoginBusy: { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'save', 'update-proxy', 'update-weather-location', 'update-setting', 'update-douyin-field', 'toggle-ai-quote', 'douyin-login', 'douyin-logout', 'douyin-refresh', 'douyin-prepare'])
</script>

<template>
  <div class="settings-overlay" @click.self="emit('close')">
    <div class="settings-modal">
      <div class="settings-header">
        <span><Settings2 :size="17" />音乐与 Agent 设置</span>
        <button class="close-btn" title="关闭" @click="emit('close')"><X :size="17" /></button>
      </div>
      <div class="settings-body">
        <div class="config-summary">
          <div class="summary-title">统一大模型配置</div>
          <div class="summary-row">
            <span>来源</span>
            <strong>{{ config.sourceLabel || '系统设置 / 统一大模型配置' }}</strong>
          </div>
          <div class="summary-row">
            <span>状态</span>
            <strong>{{ config.enabled ? (config.hasKey && config.model ? '已就绪' : '待完善') : '已关闭' }}</strong>
          </div>
          <div class="summary-row">
            <span>模型</span>
            <strong>{{ config.model || '未配置' }}</strong>
          </div>
          <div class="summary-row">
            <span>接口</span>
            <strong>{{ config.apiUrl || '未配置' }}</strong>
          </div>
          <span class="hint">音乐 Agent 与群聊主 Agent 共用系统设置里的统一大模型配置。需要修改 API Key、模型或接口地址时，请到“系统设置 → 统一大模型配置”。</span>
        </div>
        <div class="field">
          <label>音乐网络代理（可选）</label>
          <input :value="config.proxy" placeholder="http://127.0.0.1:7890" @input="emit('update-proxy', $event.target.value)" />
          <span class="hint">B站搜索被封时配置代理，支持 http/socks5</span>
        </div>
        <section class="settings-section douyin-settings">
          <div class="section-heading"><Globe2 :size="16" /><div><strong>抖音音乐来源</strong><span>开启兼容通道即可搜索公开内容，登录后可访问更多内容</span></div></div>
          <label class="setting-row switch-row">
            <span><strong>网页兼容通道</strong><small>使用独立浏览器会话搜索抖音公开内容，不登录也可搜索</small></span>
            <input type="checkbox" :checked="config.douyinCompatibilityEnabled !== false" @change="emit('update-douyin-field', 'douyinCompatibilityEnabled', $event.target.checked)" />
          </label>
          <div class="setting-row douyin-status-row">
            <span>
              <strong>抖音账号（可选）</strong>
              <small>{{ config.douyin?.browser?.authenticated ? '已登录，搜索范围增强' : config.douyin?.browser?.loginState === 'waiting' ? '等待扫码登录' : '未登录，仅可访问公开内容' }}</small>
            </span>
            <div class="inline-actions">
              <button type="button" title="刷新状态" @click="emit('douyin-refresh')"><RefreshCw :size="13" /></button>
              <button v-if="!config.douyin?.browser?.authenticated" type="button" :disabled="douyinLoginBusy || config.douyin?.browser?.loginState === 'waiting'" @click="emit('douyin-login')"><LogIn :size="13" />{{ douyinLoginBusy ? '正在打开' : config.douyin?.browser?.loginState === 'waiting' ? '等待登录' : '登录' }}</button>
              <button v-else type="button" @click="emit('douyin-logout')"><LogOut :size="13" />退出</button>
            </div>
          </div>
          <div class="setting-row douyin-status-row">
            <span><strong>下载转码解析器</strong><small>{{ config.douyin?.runtime?.ready ? `已就绪 · ${config.douyin.runtime.version}` : '播放/下载抖音歌曲前需要准备，搜索不依赖此项' }}</small></span>
            <button v-if="!config.douyin?.runtime?.ready" type="button" class="inline-command" @click="emit('douyin-prepare')"><Download :size="13" />准备</button>
          </div>
          <div class="douyin-official-fields">
            <label><span>官方 Client Key（可选）</span><input :value="config.douyinOfficialClientKey" autocomplete="off" @input="emit('update-douyin-field', 'douyinOfficialClientKey', $event.target.value)" /></label>
            <label><span>官方 Client Secret（可选）</span><input type="password" :placeholder="config.douyin?.official?.secretProtected ? '已加密保存，留空不修改' : '仅在已开通视频搜索能力时填写'" autocomplete="new-password" @input="emit('update-douyin-field', 'douyinOfficialClientSecret', $event.target.value)" /></label>
          </div>
          <p class="model-note">开启兼容通道即可搜索公开内容；官方接口未普遍开放。下载抖音歌曲前需准备"下载转码解析器"，搜索本身无需准备。</p>
        </section>
        <div class="field">
          <label>天气城市（可选）</label>
          <input
            :value="config.weatherLocation"
            maxlength="80"
            placeholder="例如：杭州、上海浦东"
            @input="emit('update-weather-location', $event.target.value)"
          />
          <span class="hint">优先使用浏览器当前位置；定位不可用时使用这里配置的城市。留空才会按 IP 近似定位，VPN 环境可能不准。</span>
        </div>
        <section class="settings-section">
          <div class="section-heading"><Volume2 :size="16" /><div><strong>播放设置</strong><span>作用于本地播放和后续网络歌曲下载</span></div></div>
          <label class="setting-row">
            <span><strong>下载音质</strong><small>已经下载的文件不会重复转码</small></span>
            <select :value="playbackSettings.quality" @change="emit('update-setting', 'quality', $event.target.value)">
              <option value="standard">标准 128 kbps</option>
              <option value="high">高 192 kbps</option>
              <option value="very_high">极高 320 kbps</option>
              <option value="source">源音质优先</option>
            </select>
          </label>
          <label class="setting-row vertical">
            <span><strong>淡入淡出</strong><small>{{ Number(playbackSettings.fadeSeconds || 0).toFixed(1) }} 秒</small></span>
            <input type="range" min="0" max="8" step="0.5" :value="playbackSettings.fadeSeconds" @input="emit('update-setting', 'fadeSeconds', Number($event.target.value))" />
          </label>
          <label class="setting-row switch-row">
            <span><strong>音量均衡</strong><small>使用动态压缩器平衡歌曲响度</small></span>
            <input type="checkbox" :checked="playbackSettings.volumeNormalization" @change="emit('update-setting', 'volumeNormalization', $event.target.checked)" />
          </label>
          <label class="setting-row switch-row">
            <span><strong>记住播放进度</strong><small>刷新或重新进入音乐页时续播；主动切歌会从头播放</small></span>
            <input type="checkbox" :checked="playbackSettings.rememberProgress" @change="emit('update-setting', 'rememberProgress', $event.target.checked)" />
          </label>
          <label class="setting-row">
            <span><strong><Moon :size="13" />睡眠定时</strong><small>保存后立即开始计时</small></span>
            <select :value="playbackSettings.sleepTimerMinutes" @change="emit('update-setting', 'sleepTimerMinutes', Number($event.target.value))">
              <option :value="0">关闭</option><option :value="15">15 分钟</option><option :value="30">30 分钟</option><option :value="45">45 分钟</option><option :value="60">60 分钟</option><option :value="90">90 分钟</option>
            </select>
          </label>
        </section>

        <section class="settings-section">
          <div class="section-heading"><Bot :size="16" /><div><strong>AI 功能开关</strong><span>带“调用模型”的功能会产生一次大模型请求</span></div></div>
          <label class="setting-row switch-row model-call">
            <span><strong><Sparkles :size="13" />AI 文案</strong><small>切歌或刷新文案时调用模型</small></span>
            <input type="checkbox" :checked="aiSongQuoteEnabled" @change="emit('toggle-ai-quote')" />
          </label>
          <label class="setting-row switch-row model-call">
            <span><strong>AI 推荐</strong><small>全局或快捷点歌理解“心情不好”等模糊意图时调用模型</small></span>
            <input type="checkbox" :checked="playbackSettings.aiRecommendationEnabled" @change="emit('update-setting', 'aiRecommendationEnabled', $event.target.checked)" />
          </label>
          <label class="setting-row switch-row model-call">
            <span><strong>情绪识别</strong><small>切换歌曲时识别歌曲情绪并调用模型</small></span>
            <input type="checkbox" :checked="playbackSettings.aiEmotionEnabled" @change="emit('update-setting', 'aiEmotionEnabled', $event.target.checked)" />
          </label>
          <label class="setting-row switch-row model-call">
            <span><strong>自动选歌</strong><small>从多个候选中选择歌曲时调用模型</small></span>
            <input type="checkbox" :checked="playbackSettings.aiAutoSelectEnabled" @change="emit('update-setting', 'aiAutoSelectEnabled', $event.target.checked)" />
          </label>
          <p class="model-note">统一搜索、播放控制、歌词、队列和本地筛选不会调用模型。音乐助手对话本身会调用统一大模型，不受这些功能开关影响。</p>
        </section>
      </div>
      <div class="settings-footer">
        <button class="btn-aura" @click="emit('close')">取消</button>
        <button class="btn-aura btn-primary" @click="emit('save')">保存</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-overlay {
  position: fixed;
  inset: 0;
  z-index: 10020;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(3, 2, 10, 0.7);
  backdrop-filter: blur(16px);
}

.settings-modal {
  width: min(640px, 92vw);
  max-height: 92vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid rgba(165, 139, 255, 0.22);
  border-radius: 18px;
  background: rgba(17, 13, 32, 0.96);
  color: #e2d8ff;
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.55), 0 0 36px rgba(123, 97, 255, 0.16);
}

.settings-header,
.settings-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px;
  border-bottom: 1px solid rgba(165, 139, 255, 0.14);
}

.settings-header span {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 800;
}

.close-btn {
  width: 30px;
  height: 30px;
  cursor: pointer;
  border: 1px solid rgba(165, 139, 255, 0.18);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  color: #d8ccff;
  font-size: 18px;
}

.settings-body {
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 18px;
}

.config-summary {
  display: grid;
  gap: 9px;
  padding: 14px;
  border: 1px solid rgba(165, 139, 255, 0.14);
  border-radius: 14px;
  background: rgba(165, 139, 255, 0.06);
}

.summary-title {
  color: #d8ccff;
  font-size: 13px;
  font-weight: 800;
}

.summary-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  font-size: 12px;
}

.summary-row span,
.hint {
  color: #a58bff;
}

.summary-row strong {
  color: #f5f0ff;
  text-align: right;
  font-weight: 700;
  word-break: break-all;
}

.field {
  display: grid;
  gap: 8px;
}

.field label {
  color: #d8ccff;
  font-size: 12px;
  font-weight: 700;
}

.field input {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  border: 1px solid rgba(165, 139, 255, 0.18);
  border-radius: 10px;
  outline: none;
  background: rgba(7, 5, 16, 0.72);
  color: #f5f0ff;
  font-size: 13px;
}

.settings-section { display: grid; gap: 2px; overflow: hidden; border: 1px solid rgba(165,139,255,.14); border-radius: 8px; background: rgba(255,255,255,.018); }
.section-heading { padding: 12px; display: flex; align-items: center; gap: 9px; border-bottom: 1px solid rgba(165,139,255,.12); color: #cfc2fb; }
.section-heading > div { display: flex; flex-direction: column; gap: 2px; }.section-heading strong { font-size: 12px; }.section-heading span { color: #897ca5; font-size: 10px; }
.setting-row { min-height: 54px; padding: 8px 12px; display: flex; align-items: center; justify-content: space-between; gap: 14px; border-bottom: 1px solid rgba(165,139,255,.07); }
.setting-row:last-of-type { border-bottom: 0; }.setting-row > span { min-width: 0; display: flex; flex-direction: column; gap: 3px; }.setting-row strong { display: inline-flex; align-items: center; gap: 5px; color: #ddd4f5; font-size: 11px; }.setting-row small { color: #837799; font-size: 9px; line-height: 1.45; }
.setting-row select { max-width: 170px; height: 31px; border: 1px solid rgba(165,139,255,.18); border-radius: 5px; color: #ded4f6; background: #100d1d; font-size: 10px; }
.setting-row.vertical { align-items: stretch; flex-direction: column; gap: 7px; }.setting-row input[type="range"] { width: 100%; accent-color: #7fdce5; }
.switch-row input[type="checkbox"] { width: 34px; height: 18px; accent-color: #65d6df; cursor: pointer; }
.model-call { box-shadow: inset 2px 0 0 rgba(83,205,215,.3); }.model-note { margin: 0; padding: 9px 12px; color: #6f8794; background: rgba(83,205,215,.035); font-size: 9px; line-height: 1.55; }
.inline-actions { display: flex; align-items: center; gap: 6px; }.inline-actions button, .inline-command { min-height: 30px; padding: 0 9px; display: inline-flex; align-items: center; justify-content: center; gap: 5px; border: 1px solid rgba(165,139,255,.2); border-radius: 5px; color: #d8ccff; background: rgba(165,139,255,.05); cursor: pointer; }.inline-actions button:first-child { width: 30px; padding: 0; }.douyin-official-fields { padding: 10px 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }.douyin-official-fields label { min-width: 0; display: grid; gap: 5px; color: #9488aa; font-size: 9px; }.douyin-official-fields input { min-width: 0; height: 32px; padding: 0 9px; border: 1px solid rgba(165,139,255,.16); border-radius: 5px; color: #e9e2fa; background: #0d0a18; }

.hint {
  font-size: 11px;
  line-height: 1.55;
}

.settings-footer {
  justify-content: flex-end;
  gap: 10px;
  border-top: 1px solid rgba(165, 139, 255, 0.14);
  border-bottom: none;
}

.btn-aura {
  padding: 8px 14px;
  cursor: pointer;
  border: 1px solid rgba(165, 139, 255, 0.18);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  color: #d8ccff;
  font-size: 12px;
  font-weight: 800;
}

.btn-primary {
  border-color: rgba(165, 139, 255, 0.5);
  background: #d8ccff;
  color: #10091f;
}

@media (max-width: 600px) {
  .settings-overlay {
    align-items: flex-end;
  }

  .settings-modal {
    width: 100%;
    max-height: 92vh;
    border-right: 0;
    border-bottom: 0;
    border-left: 0;
    border-radius: 8px 8px 0 0;
  }

  .settings-footer .btn-aura {
    flex: 1;
  }
  .douyin-official-fields { grid-template-columns: 1fr; }
}
</style>

