<script setup>
import { computed, ref } from 'vue'
import AttachmentChips from './AttachmentChips.vue'
import SlashCommandMenu from './SlashCommandMenu.vue'
import TemplatePicker from './TemplatePicker.vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  files: { type: Array, default: () => [] },
  inputId: { type: String, default: '' },
  placeholder: { type: String, default: '输入消息...' },
  rows: { type: Number, default: 1 },
  slash: { type: Object, default: null },
  templatesOpen: { type: Boolean, default: false },
  templates: { type: Array, default: () => [] },
  templateSearchQuery: { type: String, default: '' },
  activeTemplateIndex: { type: Number, default: 0 },
  recommendedTemplate: { type: Object, default: null },
  disabled: { type: Boolean, default: false },
  busy: { type: Boolean, default: false },
  sendLabel: { type: String, default: '发送' },
  attachTitle: { type: String, default: '添加附件' },
  accept: { type: String, default: 'image/*,.txt,.md,.json,.csv,.pdf,.docx,.pptx,.xlsx' },
  templateTitle: { type: String, default: '插入对话模板' },
})

const emit = defineEmits([
  'update:modelValue',
  'keydown',
  'input',
  'files-selected',
  'remove-file',
  'open-template',
  'update:template-search-query',
  'select-template',
  'apply-recommendation',
  'send',
  'stop',
])

const fileInput = ref(null)
const slashState = computed(() => props.slash || {})

const chooseFiles = () => {
  fileInput.value?.click()
}

const onFilesSelected = (event) => {
  emit('files-selected', Array.from(event.target.files || []))
  event.target.value = ''
}

const onInput = (event) => {
  emit('update:modelValue', event.target.value)
  emit('input', event)
}
</script>

<template>
  <div class="chat-composer">
    <slot name="prefix" />
    <input ref="fileInput" type="file" multiple class="hidden-file-input" :accept="props.accept" @change="onFilesSelected">
    <button class="composer-button" type="button" :disabled="props.disabled || props.busy" :title="props.attachTitle" @click="chooseFiles">📎</button>
    <button class="composer-button" type="button" :disabled="props.disabled || props.busy" :title="props.templateTitle" @click="emit('open-template')">📚</button>
    <div class="chat-input-wrap">
      <div
        v-if="props.recommendedTemplate"
        class="recommendation-bubble"
        @click="emit('apply-recommendation')"
      >
        <span class="bulb">💡</span>
        <span class="text">意图检测：建议使用模板 <strong>{{ props.recommendedTemplate.name }}</strong></span>
        <span class="action">一键格式化提示词</span>
      </div>
      <AttachmentChips :files="props.files" @remove="emit('remove-file', $event)" />
      <textarea
        :id="props.inputId"
        :value="props.modelValue"
        :placeholder="props.placeholder"
        :rows="props.rows"
        :disabled="props.disabled || props.busy"
        @input="onInput"
        @keydown="emit('keydown', $event)"
      ></textarea>
      <SlashCommandMenu
        v-if="props.slash"
        :open="!!slashState.open"
        :commands="slashState.filtered || []"
        :active-index="slashState.activeIndex || 0"
        :loading="!!slashState.loading"
        :query="slashState.query || ''"
        @select="slashState.select"
      />
      <slot name="overlays" />
      <TemplatePicker
        :open="props.templatesOpen"
        :templates="props.templates"
        :search-query="props.templateSearchQuery"
        :active-index="props.activeTemplateIndex"
        @update:search-query="emit('update:template-search-query', $event)"
        @select="emit('select-template', $event)"
      />
    </div>
    <button :class="['send-button', { stopping: props.busy }]" type="button" :disabled="props.disabled && !props.busy" @click="emit(props.busy ? 'stop' : 'send')">
      {{ props.busy ? '停止' : props.sendLabel }}
    </button>
  </div>
</template>

<style scoped>
.chat-composer {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  width: 100%;
  padding: 12px 14px;
  border-top: 1px solid rgba(15, 23, 42, 0.08);
  background: color-mix(in srgb, var(--surface, #fff) 86%, transparent);
}

.hidden-file-input {
  display: none;
}

.composer-button,
.send-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 44px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.composer-button {
  width: 44px;
  min-width: 44px;
  padding: 0;
  background: rgba(255, 255, 255, 0.84);
  font-size: 16px;
}

.composer-button:hover {
  border-color: rgba(59, 130, 246, 0.2);
  background: rgba(59, 130, 246, 0.06);
}

.send-button {
  min-width: 74px;
  padding: 0 16px;
  border-color: transparent;
  background: var(--accent-blue, #2563eb);
  color: #fff;
  font-size: 13px;
  font-weight: 800;
}

.send-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.send-button.stopping { background:#fff; border-color:#dc2626; color:#dc2626; }

.chat-input-wrap {
  position: relative;
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  gap: 8px;
}

textarea {
  width: 100%;
  min-height: 44px;
  max-height: 160px;
  padding: 11px 14px;
  resize: none;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  outline: none;
  background: rgba(255, 255, 255, 0.86);
  color: var(--text-primary);
  font-size: 13.5px;
  line-height: 1.5;
}

textarea:focus {
  border-color: rgba(59, 130, 246, 0.32);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.08);
}

.recommendation-bubble {
  display: flex;
  align-items: center;
  gap: 8px;
  width: fit-content;
  max-width: 100%;
  padding: 7px 10px;
  border: 1px solid rgba(245, 158, 11, 0.28);
  border-radius: 9px;
  background: rgba(245, 158, 11, 0.12);
  color: #92400e;
  cursor: pointer;
  font-size: 12px;
  line-height: 1.4;
}

.recommendation-bubble .text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recommendation-bubble .action {
  flex: 0 0 auto;
  padding: 2px 7px;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.38);
  font-weight: 700;
}

:global([data-theme="dark"] .chat-composer){
  border-top-color: rgba(255, 255, 255, 0.08);
  background: rgba(15, 23, 42, 0.78);
}

:global([data-theme="dark"] .composer-button),
:global([data-theme="dark"] textarea){
  border-color: rgba(255, 255, 255, 0.08);
  background: rgba(15, 23, 42, 0.82);
}

@media (max-width: 720px) {
  .chat-composer {
    flex-wrap: wrap;
  }

  .chat-input-wrap {
    order: -1;
    flex-basis: 100%;
  }
}
</style>
