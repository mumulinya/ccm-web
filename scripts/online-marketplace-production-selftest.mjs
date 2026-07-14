#!/usr/bin/env node
import assert from 'node:assert/strict'

const baseUrl = String(process.env.CCM_BASE_URL || 'http://127.0.0.1:3082').replace(/\/+$/, '')

const request = async (pathname, options = {}) => {
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  })
  const payload = await response.json().catch(() => ({}))
  return { response, payload }
}

const list = async params => {
  const query = new URLSearchParams(params)
  const { response, payload } = await request(`/api/marketplace/list?${query.toString()}`)
  assert.equal(response.ok, true, `marketplace list failed: ${JSON.stringify(payload)}`)
  assert.equal(payload.success, true, `marketplace list rejected: ${JSON.stringify(payload)}`)
  return payload
}

const post = async (pathname, body) => {
  const { response, payload } = await request(pathname, { method: 'POST', body: JSON.stringify(body) })
  assert.equal(response.ok, true, `${pathname} failed: ${JSON.stringify(payload)}`)
  assert.equal(payload.success, true, `${pathname} rejected: ${JSON.stringify(payload)}`)
  return payload
}

const checks = {}
const skills = await list({ source: 'skills-sh', query: 'react', page: '1', pageSize: '6', category: 'all', sort: 'popular' })
assert.ok(skills.items.length > 0, 'Skills.sh returned no real results')
assert.ok(skills.items.every(item => item.type === 'skill' && item.source?.id === 'skills-sh'))
assert.equal(skills.sourceStatus?.anonymous, true)
assert.equal(skills.pagination?.pageSize, 6)
checks.skillsShRealSearch = true
checks.skillsShPagination = skills.pagination?.schema === 'ccm-marketplace-pagination-v1' && skills.pagination.total >= skills.items.length
checks.skillsShSourceStatus = skills.sourceStatus?.schema === 'ccm-marketplace-source-status-v1' && /Skills\.sh/i.test(skills.sourceStatus.label)

const exactSkills = await list({ source: 'skills-sh', query: 'web-design-guidelines', page: '1', pageSize: '10', sort: 'relevance' })
const previewCandidate = exactSkills.items.find(item => /web-design-guidelines/i.test(item.id)) || exactSkills.items[0]
assert.ok(previewCandidate, 'no Skills.sh preview candidate found')
const skillPreview = await post('/api/marketplace/preview', previewCandidate)
assert.equal(skillPreview.preview?.sourceProof?.schema, 'ccm-marketplace-source-proof-v1')
assert.ok(String(skillPreview.preview?.content || '').includes('---'), 'Skills.sh preview did not return real SKILL.md content')
assert.ok(Number(skillPreview.preview?.packageStats?.files || 0) >= 1, 'Skills.sh preview did not validate package files')
checks.skillsShRealPackagePreview = true

const smitheryPage1 = await list({ source: 'smithery', query: 'github', page: '1', pageSize: '4', sort: 'popular' })
const smitheryPage2 = await list({ source: 'smithery', query: 'github', page: '2', pageSize: '4', sort: 'popular' })
assert.ok(smitheryPage1.items.length > 0, 'Smithery returned no real results')
assert.ok(smitheryPage1.items.every(item => item.type === 'mcp' && item.source?.id === 'smithery'))
assert.equal(smitheryPage1.needKey, false)
assert.equal(smitheryPage1.sourceStatus?.anonymous, true)
assert.notEqual(smitheryPage1.items[0]?.id, smitheryPage2.items[0]?.id, 'Smithery server-side pagination did not advance')
checks.smitheryAnonymousSearch = true
checks.smitheryServerPagination = smitheryPage1.pagination?.totalPages > 1 && smitheryPage2.pagination?.page === 2
checks.smitheryRegistryMetadata = smitheryPage1.items.some(item => item.verified || Number(item.useCount || 0) > 0)

const smitheryPreview = await post('/api/marketplace/preview', smitheryPage1.items[0])
assert.equal(smitheryPreview.preview?.sourceProof?.schema, 'ccm-marketplace-source-proof-v1')
assert.equal(smitheryPreview.preview?.transport, 'http')
assert.match(String(smitheryPreview.preview?.url || ''), /^https:\/\//)
checks.smitheryDetailRevalidation = true

const smitheryConfig = await request('/api/smithery/config')
assert.equal(smitheryConfig.payload?.key, '')
checks.smitheryCredentialNeverReturned = true

assert.ok(Object.values(checks).every(Boolean), `online marketplace checks failed: ${JSON.stringify(checks)}`)
console.log(JSON.stringify({ ok: true, baseUrl, checks, samples: { skill: previewCandidate.id, smithery: smitheryPage1.items[0]?.id } }, null, 2))
