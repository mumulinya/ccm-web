import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const root = process.cwd()
const read = file => fs.readFile(path.join(root, file), 'utf8')
const coordinatorModule = await import(pathToFileURL(path.join(root, 'ccm-package', 'dist', 'modules', 'pets', 'pet-activity-coordinator.js')).href)

const [server, menu, menuTemplate, agentList, skinGrid, petRoutes, toolStore, v2, electronMain, electronRenderer] = await Promise.all([
  read('backend/server-pet-activity.ts'),
  read('frontend/src/components/pets/usePetMenu.js'),
  read('frontend/src/components/pets/PetMenu.template.html'),
  read('frontend/src/components/pets/PetAgentList.vue'),
  read('frontend/src/components/pets/PetSkinGrid.vue'),
  read('backend/modules/pets/pets.ts'),
  read('backend/agents/global/global-agent-run-store.ts'),
  read('frontend/src/components/pets/PetV2Sprite.vue'),
  read('ccm-package/pet/main.js'),
  read('ccm-package/pet/renderer/pet.js'),
])

const activity = coordinatorModule.runPetActivityCoordinatorSelfTest()
const serverList = server.match(/function getPetAgents\(\)[\s\S]*?\n\}/)?.[0] || ''
const requiredStates = ['planning', 'building', 'debugging', 'reviewing', 'waiting', 'happy']

const checks = {
  coordinatorConcurrency: activity.pass === true,
  exactlyTwoSystemPets: /return \[getGlobalPetAgent\(\), getMusicPetAgent\(\)\]/.test(serverList),
  frontendFiltersToSystemPets: /props\.agents\.filter\(agent => systemPetNames\.has\(agent\.name\)\)/.test(menu),
  noIndependentCustomPetCreation: !/custom-pet-|createCustomPet|PetCreateModal/.test(menu),
  imageGenerationUiRemoved: !/PetGenerationModal|showGenerationModal|generation-jobs/.test(`${menu}\n${menuTemplate}`)
    && !/从图片创建|create-pet/.test(agentList)
    && !/新建宠物皮肤|create-skin/.test(skinGrid),
  imageGenerationApiRemoved: !/generation-jobs|createPetGenerationJob/.test(petRoutes),
  imageGenerationAgentToolRemoved: !/create_pet_from_image/.test(toolStore),
  webHasEveryWorkState: requiredStates.every(state => v2.includes(`${state}:`)),
  electronHasEveryWorkState: requiredStates.every(state => electronRenderer.includes(`${state}:`)),
  electronReceivesV2Metadata: /skin: getPetTypeMetadata\(petType\)/.test(electronMain),
  webAndElectronUseV2Grid: v2.includes("backgroundSize: '800% 1100%'") && electronRenderer.includes('background-size:800% 1100%'),
}

const report = {
  schema: 'ccm-pet-workspace-companion-selftest-v2',
  pass: Object.values(checks).every(Boolean),
  checks,
  activity,
}
console.log(JSON.stringify(report, null, 2))
if (!report.pass) process.exitCode = 1
