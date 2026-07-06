<script setup>
defineProps({
  petTypes: { type: Array, default: () => [] },
  actionPetType: { type: String, default: '' },
  rows: { type: Array, default: () => [] },
  imageErrors: { type: Object, default: () => ({}) },
  uploadingAsset: { type: String, default: '' },
  assetUrl: { type: Function, required: true },
  assetFileName: { type: Function, required: true },
  canUploadAsset: { type: Function, required: true },
  setUploadInput: { type: Function, required: true }
})

const emit = defineEmits(['update:actionPetType', 'reset-errors', 'image-error', 'choose-file', 'upload-file'])
</script>

<template>
  <div class="assets-tab-pane">
    <div class="asset-toolbar">
      <div class="asset-select-wrap">
        <label>宠物外观</label>
        <select
          :value="actionPetType"
          @change="emit('update:actionPetType', $event.target.value); emit('reset-errors')"
        >
          <option v-for="petType in petTypes" :key="petType.id" :value="petType.id">{{ petType.name }}</option>
        </select>
      </div>
      <div class="asset-count">{{ rows.length }} 个动作资源</div>
    </div>

    <div class="asset-grid">
      <div v-for="row in rows" :key="row.key" class="asset-card">
        <div class="asset-preview">
          <img
            :src="assetUrl(row.assetPath)"
            alt=""
            aria-hidden="true"
            :class="{ missing: imageErrors[row.assetPath] }"
            @error="emit('image-error', row)"
          >
        </div>
        <div class="asset-info">
          <div class="asset-title-row">
            <span class="asset-title">{{ row.label }}</span>
            <span class="asset-group">{{ row.group }}</span>
          </div>
          <div class="asset-path" :title="row.assetPath">{{ row.assetPath }}</div>
          <div class="asset-file">{{ assetFileName(row.assetPath) }}</div>
        </div>
        <div class="asset-actions">
          <button
            v-if="canUploadAsset(row)"
            class="btn btn-outline btn-sm"
            :disabled="uploadingAsset === row.assetPath"
            @click="emit('choose-file', row)"
          >
            {{ uploadingAsset === row.assetPath ? '上传中' : (row.assetPath.toLowerCase().endsWith('.png') ? '上传图片' : '上传 SVG') }}
          </button>
          <span v-else class="asset-readonly">只读</span>
          <input
            v-if="canUploadAsset(row)"
            class="hidden-file-input"
            type="file"
            accept=".svg,.png,image/svg+xml,image/png"
            :ref="el => setUploadInput(row.assetPath, el)"
            @change="emit('upload-file', row, $event)"
          >
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.assets-tab-pane { display: flex; flex-direction: column; gap: 16px; }
.asset-toolbar { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; padding: 16px 18px; background: rgba(255, 255, 255, 0.42); border: 1px solid rgba(0, 0, 0, 0.04); border-radius: 14px; }
.asset-select-wrap { display: flex; flex-direction: column; gap: 8px; min-width: 220px; }
.asset-select-wrap label { font-size: 12px; color: var(--text-muted); font-weight: 600; }
.asset-select-wrap select { width: 240px; padding: 9px 12px; border-radius: 8px; border: 1px solid rgba(0, 0, 0, 0.08); background: rgba(255, 255, 255, 0.85); color: var(--text-primary); outline: none; }
.asset-count { padding: 6px 10px; border-radius: 999px; background: rgba(59, 130, 246, 0.08); color: var(--accent-blue); font-size: 12px; font-weight: 700; }
.asset-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
.asset-card { display: grid; grid-template-columns: 68px minmax(0, 1fr); gap: 12px; align-items: center; padding: 14px; background: rgba(255, 255, 255, 0.42); border: 1px solid rgba(0, 0, 0, 0.045); border-radius: 14px; min-width: 0; }
.asset-preview { width: 68px; height: 68px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.7); border-radius: 12px; border: 1px solid rgba(0,0,0,0.04); }
.asset-preview img { max-width: 56px; max-height: 56px; object-fit: contain; }
.asset-preview img.missing { opacity: 0.25; filter: grayscale(1); }
.asset-info { min-width: 0; }
.asset-title-row { display: flex; align-items: center; gap: 8px; }
.asset-title { color: var(--text-primary); font-weight: 800; font-size: 13px; }
.asset-group { padding: 2px 6px; border-radius: 999px; background: rgba(100,116,139,0.1); color: var(--text-muted); font-size: 10px; font-weight: 800; }
.asset-path, .asset-file { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px; }
.asset-path { color: var(--text-secondary); margin-top: 4px; }
.asset-file { color: var(--text-muted); margin-top: 2px; }
.asset-actions { grid-column: 2; display: flex; align-items: center; gap: 8px; }
.asset-readonly { color: var(--text-muted); font-size: 11px; }
.hidden-file-input { display: none; }
.btn { padding: 8px 16px; border-radius: 8px; border: none; cursor: pointer; font-size: 13px; transition: all 0.2s; }
.btn-sm { padding: 5px 10px; font-size: 12px; }
.btn-outline { background: transparent; border: 1px solid rgba(0, 0, 0, 0.08); color: var(--text-secondary); }
:global([data-theme="dark"]) .asset-toolbar, :global([data-theme="dark"]) .asset-card, :global([data-theme="dark"]) .asset-preview { background: rgba(10, 10, 20, 0.38); border-color: rgba(255,255,255,0.06); }
@media (max-width: 768px) {
  .asset-toolbar { align-items: stretch; flex-direction: column; }
  .asset-select-wrap, .asset-select-wrap select { width: 100%; }
}
</style>
