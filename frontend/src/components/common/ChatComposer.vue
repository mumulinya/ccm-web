<script setup>
import { computed, ref, useSlots } from 'vue'
import AttachmentChips from './AttachmentChips.vue'
import SlashCommandMenu from './SlashCommandMenu.vue'
import OnlineDocumentReferences from './OnlineDocumentReferences.vue'
import {
  countNewAttachmentFiles,
  extractClipboardAttachmentFiles,
  mergeUniqueAttachmentFiles,
} from '../../utils/clipboardAttachments.js'

const props = defineProps({
  modelValue: { type: String, default: '' },
  files: { type: Array, default: () => [] },
  inputId: { type: String, default: '' },
  placeholder: { type: String, default: '输入消息...' },
  rows: { type: Number, default: 1 },
  slash: { type: Object, default: null },
  disabled: { type: Boolean, default: false },
  busy: { type: Boolean, default: false },
  allowInputWhileBusy: { type: Boolean, default: false },
  sendLabel: { type: String, default: '发送' },
  attachTitle: { type: String, default: '添加附件' },
  accept: { type: String, default: 'image/*,.txt,.md,.json,.csv,.pdf,.docx,.pptx,.xlsx' },
})

const emit = defineEmits([
  'update:modelValue',
  'keydown',
  'input',
  'files-selected',
  'files-pasted',
  'remove-file',
  'send',
  'stop',
])

const fileInput = ref(null)
const slots = useSlots()
const slashState = computed(() => props.slash || {})

const chooseFiles = () => {
  fileInput.value?.click()
}

const onFilesSelected = (event) => {
  const files = Array.from(event.target.files || [])
  const additions = mergeUniqueAttachmentFiles(props.files, files).slice(props.files.length)
  if (additions.length) emit('files-selected', additions)
  event.target.value = ''
}

const onPaste = (event) => {
  if (props.disabled || props.busy) return
  const files = extractClipboardAttachmentFiles(event)
  if (!files.length) return

  event.preventDefault()
  if (countNewAttachmentFiles(props.files, files) === 0) return
  const additions = mergeUniqueAttachmentFiles(props.files, files).slice(props.files.length)
  emit('files-selected', additions)
  emit('files-pasted', additions)
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
    <div class="chat-input-wrap" :class="{ 'has-context-usage': !!slots.context }">
      <AttachmentChips :files="props.files" @remove="emit('remove-file', $event)" />
      <OnlineDocumentReferences :text="props.modelValue" compact />
      <textarea
        :id="props.inputId"
        :value="props.modelValue"
        :placeholder="props.placeholder"
        :rows="props.rows"
        :disabled="props.disabled || (props.busy && !props.allowInputWhileBusy)"
        @input="onInput"
        @keydown="emit('keydown', $event)"
        @paste="onPaste"
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
      <div v-if="slots.context" class="composer-context-slot">
        <slot name="context" />
      </div>
    </div>
    <button :class="['send-button', { stopping: props.busy && !props.allowInputWhileBusy }]" type="button" :disabled="props.disabled || (props.busy && props.allowInputWhileBusy && !props.modelValue.trim())" @click="emit(props.busy && !props.allowInputWhileBusy ? 'stop' : 'send')">
      {{ props.busy && !props.allowInputWhileBusy ? '停止' : props.sendLabel }}
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
  border-top: 1px solid var(--border-color);
  background: var(--surface-translucent);
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
  border: 1px solid var(--border-color);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.composer-button {
  width: 44px;
  min-width: 44px;
  padding: 0;
  background: var(--control-bg);
  color: var(--text-secondary);
  font-size: 16px;
}

.composer-button:hover {
  border-color: color-mix(in srgb, var(--accent-blue) 32%, var(--border-color));
  background: var(--accent-soft);
  color: var(--accent-blue);
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

.send-button.stopping { background:var(--surface-raised); border-color:var(--accent-red); color:var(--accent-red); }

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
  border: 1px solid var(--border-color);
  border-radius: 12px;
  outline: none;
  background: var(--control-bg);
  color: var(--text-primary);
  font-size: 13.5px;
  line-height: 1.5;
}

.chat-input-wrap.has-context-usage textarea {
  padding-right: 76px;
}

.composer-context-slot {
  position: absolute;
  right: 7px;
  bottom: 7px;
  z-index: 7;
}

textarea:focus {
  border-color: color-mix(in srgb, var(--accent-blue) 52%, var(--border-color));
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-blue) 12%, transparent);
}

:global([data-theme="dark"] .chat-composer){
  border-top-color: var(--border-color);
  background: var(--surface-translucent);
}

:global([data-theme="dark"] .composer-button),
:global([data-theme="dark"] textarea){
  border-color: var(--border-color);
  background: var(--control-bg);
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
