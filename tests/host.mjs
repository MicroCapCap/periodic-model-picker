/**
 * Host half: route shape and description generation.
 *
 * Sets DSH_HOME to a temporary directory before importing index.js so the
 * description cache never touches the real harness home.
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'pmp-home-'))
process.env.DSH_HOME = tempHome

const fail = []
const ok = []
const check = (condition, message) => { if (condition) ok.push(message); else fail.push(message) }

let route = null
let effectLabel = ''
let generated = 0
let lastOptions = null

const ctx = {
  webServer: {
    register(candidate) { route = candidate; return () => {} },
  },
  effect(factory, label) {
    effectLabel = label
    const dispose = factory()
    if (typeof dispose !== 'function') fail.push('effect factory did not return a disposer')
  },
  llm: {
    listProviders: () => [{ id: 'p', name: 'Provider' }],
    listModels: async () => [
      { id: 'm', name: 'Model M' },
      { id: 'n', name: 'Model N', description: 'Catalog text.' },
    ],
    async *stream(options) {
      generated += 1
      lastOptions = options
      yield { type: 'text-delta', text: 'A concise test description.' }
    },
  },
  logger: { warn() {} },
}

const mod = await import(pathToFileURL(path.join(here, '..', 'index.js')).href + '?v=' + Date.now())
mod.apply(ctx)

check(route !== null, 'route registered')
check(route && route.kind === 'exact', 'route is exact')
check(route && route.path === '/model-picker/descriptions', 'route path')
check(typeof route?.resource === 'function', 'route exposes a GET resource')
check(effectLabel.includes('periodic-model-picker'), 'route disposer owned by ctx.effect')

if (route) {
  const response = await route.resource(new Request('http://local/model-picker/descriptions'))
  check(response instanceof Response, 'resource returns a Response')
  check(response.headers.get('content-type')?.includes('application/json'), 'resource is JSON')
  const body = await response.json()
  check(body.descriptions['p/m'] === 'A concise test description.', 'generates a missing description')
  check(body.descriptions['p/n'] === 'Catalog text.', 'catalog description wins')
  check(generated === 1, 'only the missing description is generated')
  check(lastOptions && lastOptions.provider === 'p' && lastOptions.model === 'n', 'generation prefers a sibling model')
}

fs.rmSync(tempHome, { recursive: true, force: true })

for (const line of ok) console.log('ok   ' + line)
for (const line of fail) console.log('FAIL ' + line)
console.log(fail.length ? 'HOST FAILED (' + fail.length + ')' : 'HOST OK')
process.exit(fail.length ? 1 : 0)
