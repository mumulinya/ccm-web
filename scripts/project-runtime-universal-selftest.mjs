import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { detectProjectRuntimeProfilesAt } from '../ccm-package/dist/modules/projects/project-runtime.js'

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ccm-runtime-universal-'))
const write = (relative, content = '') => {
  const file = path.join(root, relative)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, content)
}

try {
  write('python-service/pyproject.toml', '[project]\nname = "service"\n')
  write('python-service/main.py', 'from fastapi import FastAPI\napp = FastAPI()\n')
  write('php-service/composer.json', JSON.stringify({ scripts: { start: 'php -S 127.0.0.1:8000' } }))
  write('ruby-service/Gemfile', 'gem "rack"\n')
  write('ruby-service/config.ru', 'run ->(_env) { [200, {}, ["ok"]] }\n')
  write('elixir-service/mix.exs', 'def project, do: [app: :demo, deps: [{:phoenix, "~> 1.7"}]]\n')
  write('dart-service/pubspec.yaml', 'name: demo\n')
  write('dart-service/lib/main.dart', 'void main() {}\n')
  write('deno-service/deno.json', JSON.stringify({ tasks: { dev: 'deno run main.ts' } }))
  write('docker-service/compose.yaml', 'services: {}\n')
  write('cmake-service/CMakeLists.txt', 'cmake_minimum_required(VERSION 3.20)\nproject(demo)\n')
  write('make-service/Makefile', 'run:\n\t@echo run\nbuild:\n\t@echo build\n')

  const cases = [
    ['python-service', 'python'], ['php-service', 'php'], ['ruby-service', 'ruby'],
    ['elixir-service', 'elixir'], ['dart-service', 'dart'], ['deno-service', 'deno'],
    ['docker-service', 'docker'], ['cmake-service', 'cmake'], ['make-service', 'make'],
  ]
  const checks = {}
  for (const [folder, type] of cases) {
    const profiles = detectProjectRuntimeProfilesAt(`selftest-${type}`, path.join(root, folder))
    checks[type] = profiles.some(profile => profile.projectType === type)
  }
  const failed = Object.entries(checks).filter(([, passed]) => !passed).map(([name]) => name)
  if (failed.length) throw new Error(`未识别运行类型: ${failed.join(', ')}`)
  console.log(JSON.stringify({ success: true, checks }, null, 2))
} finally {
  fs.rmSync(root, { recursive: true, force: true })
}
