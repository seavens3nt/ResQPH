import { spawnSync } from 'node:child_process'
import assert from 'node:assert/strict'
import { test } from 'node:test'

const safe = {
  ...process.env,
  RESQPH_DEPLOY_ENVIRONMENT: 'staging',
  RENDER_API_ORIGIN: 'https://resqph-api-staging.onrender.com',
  VITE_API_URL: '/api/v1',
  VERCEL_ENV: 'preview',
}
function evaluate(overrides = {}) {
  return spawnSync(process.execPath, ['--input-type=module', '-e',
    "import {config} from './vercel.mjs'; console.log(JSON.stringify(config))"], {
    cwd: new URL('../', import.meta.url), env: { ...safe, ...overrides }, encoding: 'utf8',
  })
}
test('API proxy precedes SPA fallback and private endpoints cannot be cached', () => {
  const result = evaluate()
  assert.equal(result.status, 0, result.stderr)
  const config = JSON.parse(result.stdout)
  assert.equal(config.rewrites[0].destination, `${safe.RENDER_API_ORIGIN}/api/:path*`)
  assert.deepEqual(config.git.deploymentEnabled, { '**': false, main: true })
  assert.equal(config.outputDirectory, 'frontend/dist')
  assert.equal(config.headers[0].headers[0].value, 'private, no-store')
})
test('Git settings are static and identical across deployment environments', () => {
  const result = evaluate({ RESQPH_DEPLOY_ENVIRONMENT: 'production', VERCEL_ENV: 'production' })
  assert.equal(result.status, 0, result.stderr)
  const production = JSON.parse(result.stdout)
  assert.deepEqual(production.git, JSON.parse(evaluate().stdout).git)
  assert.equal(production.ignoreCommand, 'node deployment/ignore-vercel-build.mjs')
})
for (const [environment, branch, target, status] of [
  ['staging', 'main', 'production', 1],
  ['production', 'main', 'production', 0],
  ['staging', 'setup/example', 'preview', 0],
  ['', 'main', 'production', 0],
  ['staging', 'main', 'preview', 0],
]) {
  test(`automatic build gate: ${environment}/${branch}/${target}`, () => {
    const result = spawnSync(process.execPath, ['deployment/ignore-vercel-build.mjs'], {
      cwd: new URL('../', import.meta.url), encoding: 'utf8',
      env: { ...safe, RESQPH_DEPLOY_ENVIRONMENT: environment,
        VERCEL_GIT_COMMIT_REF: branch, VERCEL_ENV: target },
    })
    assert.equal(result.status, status, result.stderr)
  })
}
for (const overrides of [
  { RENDER_API_ORIGIN: '' }, { RENDER_API_ORIGIN: 'http://localhost:8000' },
  { RENDER_API_ORIGIN: 'https://example.com/path' }, { VITE_API_URL: 'https://example.com/api/v1' },
  { RESQPH_DEPLOY_ENVIRONMENT: '' }, { RESQPH_DEPLOY_ENVIRONMENT: 'production' },
]) {
  test(`reject unsafe or missing hosted configuration: ${JSON.stringify(overrides)}`, () => {
    assert.notEqual(evaluate(overrides).status, 0)
  })
}
