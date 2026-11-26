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
let rejection

const connection = { requestRejection: () => rejection }

const ctx = {
  webServer: {
    register(candidate) { route = candidate; return () => {} },
  },
  connection,
  get(name) {
    return name === 'connection' ? this.connection : undefined
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
check(route && route.auth === 'required', 'route requires host authentication')
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

  // Fence: a refused request never reaches the model list or a generation.
  {
    rejection = 403
    const before = generated
    const refused = await route.resource(new Request('http://local/model-picker/descriptions'))
    rejection = undefined
    check(refused.status === 403, 'connection rejection is honoured')
    check(generated === before, 'rejected request does no generation')
  }
  // Token-provider admission (DSH 0.2.3+): the service exists but has no
  // requestRejection; the route's auth: 'required' already did the check.
  {
    const saved = ctx.connection
    ctx.connection = {}
    const served = await route.resource(new Request('http://local/model-picker/descriptions'))
    ctx.connection = saved
    check(served.status === 200, 'token-provider admission serves the route')
  }
  // No admission service at all: refuse rather than leave the route open.
  {
    const saved = ctx.get
    delete ctx.get
    const refused = await route.resource(new Request('http://local/model-picker/descriptions'))
    ctx.get = saved
    check(refused.status === 403, 'missing connection service is refused')
  }
}

fs.rmSync(tempHome, { recursive: true, force: true })

for (const line of ok) console.log('ok   ' + line)
for (const line of fail) console.log('FAIL ' + line)
console.log(fail.length ? 'HOST FAILED (' + fail.length + ')' : 'HOST OK')
process.exit(fail.length ? 1 : 0)
