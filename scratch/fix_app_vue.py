import sys

with open('C:/Users/admin/.cc-connect/ccm/frontend/src/App.vue', 'r', encoding='utf-8') as f:
    lines = f.readlines()

correct_top = """<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch, provide } from 'vue'
import ProjectManager from './components/ProjectManager.vue'
import GroupChat from './components/GroupChat.vue'
import ToolsConfig from './components/ToolsConfig.vue'
import TaskManager from './components/TaskManager.vue'
import AutoDevOps from './components/AutoDevOps.vue'
import Terminal from './components/Terminal.vue'
import Settings from './components/Settings.vue'
import CodeChanges from './components/CodeChanges.vue'
import CronJobs from './components/CronJobs.vue'
import Templates from './components/Templates.vue'
import Dashboard from './components/Dashboard.vue'
import AgentMetrics from './components/AgentMetrics.vue'
import SearchHistory from './components/SearchHistory.vue'
import MusicPlayer from './components/MusicPlayer.vue'
import MenuManager from './components/MenuManager.vue'
import PetMenu from './components/pets/PetMenu.vue'
import GlobalAgent from './components/GlobalAgent.vue'
import KnowledgeBase from './components/KnowledgeBase.vue'
import MemoryCenter from './components/MemoryCenter.vue'
import SystemDiagnostics from './components/SystemDiagnostics.vue'

const currentTab = ref('')
const projects = ref([])
const MUSIC_PET_AGENT_NAME = 'music-agent'
const DEFAULT_MUSIC_PET_LABEL = '乖乖'
const musicPetLabel = ref(DEFAULT_MUSIC_PET_LABEL)
const musicPetAgent = computed(() => ({
  name: MUSIC_PET_AGENT_NAME,
  displayName: musicPetLabel.value,
  petLabel: musicPetLabel.value,
  virtual: true,
  type: 'music'
}))
"""

idx = 0
for i, line in enumerate(lines):
    if line.startswith('const petAgents'):
        idx = i
        break

with open('C:/Users/admin/.cc-connect/ccm/frontend/src/App.vue', 'w', encoding='utf-8') as f:
    f.write(correct_top)
    f.writelines(lines[idx:])
