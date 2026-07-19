<script setup>
import { computed } from 'vue'
import { useChatIdentity } from '../../composables/useChatIdentity.js'

const props = defineProps({
  role: { type: String, default: 'agent' },
  size: { type: Number, default: 34 },
})

const { userAvatar, agentAvatar } = useChatIdentity()
const avatar = computed(() => props.role === 'user' ? userAvatar.value : agentAvatar.value)
const label = computed(() => props.role === 'user' ? '用户头像' : 'Agent 头像')
const avatarStyle = computed(() => ({ '--chat-avatar-size': `${Math.max(24, Math.min(64, props.size))}px` }))
</script>

<template>
  <span
    class="chat-identity-avatar"
    :class="[`role-${role}`, `kind-${avatar.type}`]"
    :style="avatarStyle"
    :aria-label="label"
    role="img"
  >
    <img v-if="avatar.type === 'image'" :src="avatar.value" alt="">
    <span v-else aria-hidden="true">{{ avatar.value }}</span>
  </span>
</template>

<style scoped>
.chat-identity-avatar {
  width: var(--chat-avatar-size);
  height: var(--chat-avatar-size);
  flex: 0 0 var(--chat-avatar-size);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--border-color) 82%, transparent);
  border-radius: 50%;
  background: var(--surface, #fff);
  color: var(--text-primary);
  font-size: calc(var(--chat-avatar-size) * .52);
  line-height: 1;
  box-shadow: 0 3px 10px rgba(15, 23, 42, .07);
}
.chat-identity-avatar.role-user { background: color-mix(in srgb, var(--accent-blue) 10%, var(--surface, #fff)); }
.chat-identity-avatar.role-agent { background: color-mix(in srgb, var(--accent-green) 8%, var(--surface, #fff)); }
.chat-identity-avatar img { width: 100%; height: 100%; display: block; object-fit: cover; }
.chat-identity-avatar.kind-image { background: var(--surface, #fff); }
</style>
