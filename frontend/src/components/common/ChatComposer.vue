<script setup>
import { computed, ref, useSlots } from 'vue'
import { Paperclip, Send, Square } from '@lucide/vue'
import AttachmentChips from './AttachmentChips.vue'
import SlashCommandMenu from './SlashCommandMenu.vue'
import SlashCommandPanel from './SlashCommandPanel.vue'
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
  if (props.disabled || (props.busy && !props.allowInputWhileBusy)) return
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
    <input ref="fileInput" type="file" multiple class="hidden-file-input" :accept="props.accept" @change="onFilesSelected">
    <div class="chat-input-wrap has-inline-footer">
      <div v-if="slots.prefix" class="composer-prefix-slot"><slot name="prefix" /></div>
      <AttachmentChips :files="props.files" @remove="emit('remove-file', $event)" />
      <OnlineDocumentReferences :text="props.modelValue" compact />
      <div class="composer-input-row">
        <button
          class="composer-button"
          type="button"
          :disabled="props.disabled || (props.busy && !props.allowInputWhileBusy)"
          :title="props.attachTitle"
          :aria-label="props.attachTitle"
          @click="chooseFiles"
        ><Paperclip :size="19" aria-hidden="true" /></button>
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
      </div>
      <SlashCommandMenu
        v-if="props.slash"
        :open="!!slashState.open"
        :commands="slashState.filtered || []"
        :active-index="slashState.activeIndex || 0"
        :loading="!!slashState.loading"
        :query="slashState.query || ''"
        @select="slashState.select"
      />
      <SlashCommandPanel
        v-if="props.slash"
        :panel="slashState.panel"
        @close="slashState.closePanel?.()"
        @action="slashState.runPanelAction?.($event)"
      />
      <slot name="overlays" />
      <div class="composer-inline-footer">
        <div v-if="slots.toolbar" class="composer-toolbar-slot"><slot name="toolbar" /></div>
        <span class="composer-footer-spacer" />
        <div v-if="slots.context" class="composer-context-slot"><slot name="context" /></div>
        <button :class="['send-button', { stopping: props.busy && !props.allowInputWhileBusy }]" type="button" :disabled="props.disabled || (props.busy && props.allowInputWhileBusy && !props.modelValue.trim() && !props.files.length)" @click="emit(props.busy && !props.allowInputWhileBusy ? 'stop' : 'send')">
          <Square v-if="props.busy && !props.allowInputWhileBusy" :size="13" aria-hidden="true" />
          <Send v-else :size="14" aria-hidden="true" />
          <span>{{ props.busy && !props.allowInputWhileBusy ? '停止' : props.sendLabel }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-composer {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 6px;
  width: 100%;
  padding: 10px 16px 12px;
  border-top: 1px solid var(--border-color);
  background: var(--surface);
}

.hidden-file-input {
  display: none;
}

.composer-button,
.send-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 32px;
  border: 1px solid var(--border-color);
  border-radius: 7px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.composer-button {
  width: 32px;
  min-width: 32px;
  padding: 0;
  background: transparent;
  color: var(--text-secondary);
}

.composer-button:hover {
  border-color: color-mix(in srgb, var(--accent-blue) 32%, var(--border-color));
  background: var(--accent-soft);
  color: var(--accent-blue);
}

.send-button {
  min-width: 68px;
  padding: 0 12px;
  border-color: transparent;
  background: var(--accent-blue, #2563eb);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  gap: 5px;
}

.send-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.send-button.stopping { background:var(--surface-raised); border-color:var(--accent-red); color:var(--accent-red); }

.chat-input-wrap {
  position: relative;
  display: flex;
  width: 100%;
  min-width: 0;
  flex-direction: column;
  gap: 0;
}

.composer-input-row {
  display: flex;
  align-items: flex-start;
  min-width: 0;
  padding: 4px 7px 0;
}

textarea {
  flex: 1;
  width: auto;
  min-width: 0;
  min-height: 36px;
  max-height: 120px;
  box-sizing: border-box;
  field-sizing: content;
  padding: 8px 6px;
  resize: none;
  overflow-y: auto;
  border: 0;
  border-radius: 0;
  outline: none;
  background: transparent;
  color: var(--text-primary);
  font-size: 13.5px;
  line-height: 1.5;
}

.composer-prefix-slot {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  min-width: 0;
  padding: 7px 9px 0;
}

.chat-input-wrap.has-inline-footer {
  overflow: visible;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--surface);
  transition: border-color .15s ease, box-shadow .15s ease;
}

.chat-input-wrap.has-inline-footer:focus-within {
  border-color: color-mix(in srgb, var(--accent-blue) 52%, var(--border-color));
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-blue) 12%, transparent);
}

.chat-input-wrap.has-inline-footer textarea {
  min-height: 36px;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.composer-inline-footer {
  display: flex;
  align-items: center;
  min-height: 32px;
  gap: 6px;
  padding: 3px 7px 6px 9px;
}

.composer-toolbar-slot {
  display: flex;
  align-items: center;
  min-width: 0;
}

.composer-context-slot {
  display: flex;
  align-items: center;
  z-index: 7;
}

.composer-footer-spacer {
  flex: 1;
  min-width: 8px;
}

textarea:focus {
  border-color: transparent;
  box-shadow: none;
}

.chat-input-wrap.has-inline-footer textarea:focus {
  border-color: transparent;
  box-shadow: none;
}

:global([data-theme="dark"] .chat-composer){
  border-top-color: var(--border-color);
  background: var(--surface);
}

:global([data-theme="dark"] .chat-input-wrap){
  border-color: var(--border-color);
  background: var(--surface);
}

@media (max-width: 720px) {
  .chat-composer {
    padding: 8px 10px 10px;
  }

  .composer-inline-footer {
    flex-wrap: wrap;
  }

  .composer-footer-spacer {
    display: none;
  }

  .composer-context-slot {
    margin-left: auto;
  }

  .send-button {
    margin-left: 0;
  }
}
</style>
