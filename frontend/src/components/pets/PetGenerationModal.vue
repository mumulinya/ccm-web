<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { toast } from '../../utils/toast.js'

const emit = defineEmits(['close', 'completed'])

const file = ref(null)
const previewUrl = ref('')
const name = ref('')
const description = ref('')
const style = ref('auto')
const targetAgent = ref('global-agent')
const submitting = ref(false)
const jobs = ref([])
let pollTimer = null

const activeJobs = computed(() => jobs.value.filter(job => !['completed', 'failed', 'cancelled'].includes(job.status)))
const stageLabels = {
  queued: '排队中', preparing: '准备角色', generating: '生成动作', validating: '校验动作',
  installing: '安装皮肤', completed: '已完成', failed: '失败', cancelled: '已取消',
}

function chooseFile(event) {
  const next = event.target.files?.[0] || null
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  file.value = next
  previewUrl.value = next ? URL.createObjectURL(next) : ''
  if (next && !name.value) name.value = next.name.replace(/\.[^.]+$/, '').slice(0, 40)
}

async function loadJobs() {
  try {
    const res = await fetch('/api/pets/generation-jobs')
    const data = await res.json()
    if (data.success) {
      const previous = new Map(jobs.value.map(job => [job.id, job.status]))
      jobs.value = data.jobs || []
      if (jobs.value.some(job => job.status === 'completed' && previous.get(job.id) && previous.get(job.id) !== 'completed')) {
        emit('completed')
      }
    }
  } catch {}
}

async function submit() {
  if (!file.value) return toast.warning('请先选择一张参考图片')
  if (!name.value.trim()) return toast.warning('请给宠物起个名字')
  submitting.value = true
  try {
    const form = new FormData()
    form.append('reference', file.value)
    form.append('name', name.value.trim())
    form.append('description', description.value.trim())
    form.append('style', style.value)
    form.append('targetAgent', targetAgent.value)
    const res = await fetch('/api/pets/generation-jobs', { method: 'POST', body: form })
    const data = await res.json()
    if (!data.success) throw new Error(data.error || '创建失败')
    toast.success('已开始生成宠物，动作制作和校验会在后台继续')
    file.value = null
    if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = ''
    await loadJobs()
  } catch (error) {
    toast.error(error.message || '创建失败')
  } finally {
    submitting.value = false
  }
}

async function control(job, operation) {
  try {
    const res = await fetch(`/api/pets/generation-jobs/${operation}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: job.id }),
    })
    const data = await res.json()
    if (!data.success) throw new Error(data.error || '操作失败')
    await loadJobs()
  } catch (error) {
    toast.error(error.message || '操作失败')
  }
}

function close() {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  emit('close')
}

onMounted(async () => {
  await loadJobs()
  pollTimer = setInterval(loadJobs, 3000)
})
onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
})
</script>

<template>
  <div class="modal-backdrop" @click.self="close">
    <section class="generator-modal" role="dialog" aria-modal="true" aria-labelledby="pet-generator-title">
      <header>
        <div>
          <h2 id="pet-generator-title">用参考图创建宠物</h2>
          <p>角色生成、完整动作和图集校验会自动完成。</p>
        </div>
        <button class="icon-button" title="关闭" aria-label="关闭" @click="close">×</button>
      </header>

      <div class="generator-body">
        <div class="form-column">
          <label class="image-picker">
            <img v-if="previewUrl" :src="previewUrl" alt="参考图片预览">
            <span v-else>选择 PNG、JPG 或 WebP 图片</span>
            <input type="file" accept="image/png,image/jpeg,image/webp" @change="chooseFile">
          </label>
          <label>宠物名称<input v-model="name" maxlength="40" placeholder="例如：小橘"></label>
          <label>角色补充<textarea v-model="description" maxlength="300" rows="3" placeholder="可选：希望保留的特征或性格"></textarea></label>
          <div class="form-row">
            <label>风格
              <select v-model="style">
                <option value="auto">自动匹配</option><option value="pixel">像素</option><option value="plush">毛绒</option>
                <option value="clay">黏土</option><option value="sticker">贴纸</option><option value="flat-vector">扁平插画</option>
                <option value="3d-toy">3D 玩具</option><option value="painterly">绘画</option>
              </select>
            </label>
            <label>应用到
              <select v-model="targetAgent"><option value="global-agent">全局 Agent</option><option value="music-agent">音乐 Agent</option></select>
            </label>
          </div>
          <button class="primary-button" :disabled="submitting" @click="submit">{{ submitting ? '正在提交...' : '开始创建' }}</button>
        </div>

        <div class="jobs-column">
          <div class="jobs-title"><strong>生成记录</strong><span v-if="activeJobs.length">{{ activeJobs.length }} 个进行中</span></div>
          <div v-if="jobs.length" class="job-list">
            <article v-for="job in jobs.slice(0, 8)" :key="job.id" class="job-card">
              <div class="job-head"><strong>{{ job.name }}</strong><span :class="`status-${job.status}`">{{ stageLabels[job.status] || job.status }}</span></div>
              <p>{{ job.stageLabel }}</p>
              <div class="progress"><span :style="{ width: `${job.progress || 0}%` }"></span></div>
              <small v-if="job.error" class="job-error">{{ job.error }}</small>
              <div class="job-actions">
                <button v-if="!['completed','failed','cancelled'].includes(job.status)" @click="control(job, 'cancel')">取消</button>
                <button v-if="['failed','cancelled'].includes(job.status)" @click="control(job, 'retry')">重试</button>
              </div>
            </article>
          </div>
          <div v-else class="empty-jobs">还没有生成记录</div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.modal-backdrop { position: fixed; inset: 0; z-index: 1000; display: grid; place-items: center; padding: 24px; background: rgba(15,23,42,.58); }
.generator-modal { width: min(900px, 100%); max-height: min(760px, 92vh); overflow: hidden; background: var(--bg-primary, #fff); color: var(--text-primary); border: 1px solid rgba(148,163,184,.28); border-radius: 8px; box-shadow: 0 24px 70px rgba(15,23,42,.28); }
header { display: flex; justify-content: space-between; gap: 20px; padding: 20px 22px; border-bottom: 1px solid rgba(148,163,184,.2); }
h2 { margin: 0; font-size: 20px; } header p { margin: 5px 0 0; color: var(--text-muted); font-size: 13px; }
.icon-button { width: 32px; height: 32px; border: 0; background: transparent; color: var(--text-secondary); font-size: 24px; cursor: pointer; }
.generator-body { display: grid; grid-template-columns: minmax(0, 1fr) minmax(300px, .9fr); max-height: calc(92vh - 86px); overflow: auto; }
.form-column, .jobs-column { padding: 22px; } .jobs-column { border-left: 1px solid rgba(148,163,184,.2); background: rgba(148,163,184,.06); }
label { display: grid; gap: 7px; margin-bottom: 14px; font-size: 13px; font-weight: 600; }
input, textarea, select { width: 100%; box-sizing: border-box; padding: 9px 10px; color: inherit; background: var(--bg-secondary, #fff); border: 1px solid rgba(148,163,184,.4); border-radius: 6px; font: inherit; resize: vertical; }
.image-picker { height: 150px; place-items: center; overflow: hidden; border: 1px dashed rgba(59,130,246,.55); border-radius: 6px; color: var(--accent-blue); cursor: pointer; }
.image-picker img { width: 100%; height: 100%; object-fit: contain; } .image-picker input { display: none; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.primary-button { width: 100%; padding: 10px; border: 0; border-radius: 6px; color: white; background: #2563eb; font-weight: 700; cursor: pointer; }
.primary-button:disabled { opacity: .55; cursor: wait; }
.jobs-title, .job-head { display: flex; justify-content: space-between; gap: 12px; align-items: center; } .jobs-title { margin-bottom: 12px; } .jobs-title span { color: var(--accent-blue); font-size: 12px; }
.job-list { display: grid; gap: 10px; } .job-card { padding: 12px; border: 1px solid rgba(148,163,184,.24); border-radius: 6px; background: var(--bg-primary, #fff); }
.job-head span { font-size: 11px; color: var(--text-muted); } .status-completed { color: #16a34a !important; } .status-failed { color: #dc2626 !important; }
.job-card p, .job-card small { display: block; margin: 7px 0; color: var(--text-muted); font-size: 12px; } .job-error { color: #dc2626 !important; }
.progress { height: 5px; overflow: hidden; background: rgba(148,163,184,.2); border-radius: 3px; } .progress span { display: block; height: 100%; background: #2563eb; transition: width .25s; }
.job-actions { display: flex; justify-content: flex-end; margin-top: 8px; } .job-actions button { padding: 4px 9px; border: 1px solid rgba(148,163,184,.35); border-radius: 5px; background: transparent; color: inherit; cursor: pointer; }
.empty-jobs { padding: 48px 10px; text-align: center; color: var(--text-muted); font-size: 13px; }
@media (max-width: 720px) { .modal-backdrop { padding: 10px; } .generator-body { grid-template-columns: 1fr; } .jobs-column { border-left: 0; border-top: 1px solid rgba(148,163,184,.2); } }
</style>
