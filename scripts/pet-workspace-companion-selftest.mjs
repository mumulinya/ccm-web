import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const root = process.cwd()
const read = file => fs.readFile(path.join(root, file), 'utf8')
const coordinatorModule = await import(pathToFileURL(path.join(root, 'ccm-package', 'dist', 'modules', 'pets', 'pet-activity-coordinator.js')).href)
const generationModule = await import(pathToFileURL(path.join(root, 'ccm-package', 'dist', 'modules', 'pets', 'pet-generation.js')).href)

const [server, menu, v2, electronMain, electronRenderer] = await Promise.all([
  read('backend/server.ts'),
  read('frontend/src/components/pets/PetMenu.vue'),
  read('frontend/src/components/pets/PetV2Sprite.vue'),
  read('ccm-package/pet/main.js'),
  read('ccm-package/pet/renderer/pet.js'),
])

const activity = coordinatorModule.runPetActivityCoordinatorSelfTest()
const generation = generationModule.runPetGenerationContractSelfTest()
const serverList = server.match(/function getPetAgents\(\)[\s\S]*?\n\}/)?.[0] || ''
const requiredStates = ['planning', 'building', 'debugging', 'reviewing', 'waiting', 'happy']

const checks = {
  coordinatorConcurrency: activity.pass === true,
  generatedPackageContract: generation.pass === true,
  exactlyTwoSystemPets: /return \[getGlobalPetAgent\(\), getMusicPetAgent\(\)\]/.test(serverList),
  frontendFiltersToSystemPets: /props\.agents\.filter\(agent => systemPetNames\.has\(agent\.name\)\)/.test(menu),
  noIndependentCustomPetCreation: !/custom-pet-|createCustomPet|PetCreateModal/.test(menu),
  imageGenerationUiConnected: /PetGenerationModal/.test(menu) && /generation-jobs/.test(await read('frontend/src/components/pets/PetGenerationModal.vue')),
  webHasEveryWorkState: requiredStates.every(state => v2.includes(`${state}:`)),
  electronHasEveryWorkState: requiredStates.every(state => electronRenderer.includes(`${state}:`)),
  electronReceivesV2Metadata: /skin: getPetTypeMetadata\(petType\)/.test(electronMain),
  webAndElectronUseV2Grid: v2.includes("backgroundSize: '800% 1100%'") && electronRenderer.includes('background-size:800% 1100%'),
  lifecycleUsesGlobalPet: /setPetGenerationLifecycleNotifier/.test(server) && /GLOBAL_PET_AGENT_NAME/.test(server),
}

const report = {
  schema: 'ccm-pet-workspace-companion-selftest-v1',
  pass: Object.values(checks).every(Boolean),
  checks,
  activity,
  generation,
}
console.log(JSON.stringify(report, null, 2))
if (!report.pass) process.exitCode = 1
