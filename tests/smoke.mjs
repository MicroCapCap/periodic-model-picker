/**
 * Load smoke test: the client registers the model-seat replacement and the
 * "Model table" settings page.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const source = fs.readFileSync(path.join(here, '..', 'client.js'), 'utf8')

let entry = null
globalThis.window = {
  __ModuleLoader__: {
    load(spec) { entry = spec },
  },
}
globalThis.document = { documentElement: { getAttribute: () => 'en' } }
globalThis.localStorage = { getItem: () => null, setItem: () => {} }

new Function(source)()

const fail = []
const ok = []

if (!entry) fail.push('module never called window.__ModuleLoader__.load')
else if (entry.id !== '@local/periodic-model-picker') fail.push('unexpected module id: ' + entry.id)
else ok.push('module id ' + entry.id)

const React = {
  createElement() {},
  useState() {},
  useEffect() {},
  useMemo() {},
  useCallback() {},
  Fragment: 'Fragment',
}
const mod = entry && entry.factory((spec) => {
  if (spec === 'react') return React
  if (spec === 'react-dom') return { createPortal() {} }
  throw new Error('unexpected require(' + spec + ')')
})
if (!mod || typeof mod.apply !== 'function') fail.push('factory did not return an apply()')
else ok.push('factory returned apply()')

const registered = []
if (mod && typeof mod.apply === 'function') {
  const ctx = {
    remote: { session: {} },
    inject(services, callback) {
      for (const service of services) {
        if (!['remote', 'remote.session'].includes(service)) fail.push('unexpected inject: ' + service)
      }
      callback({ remote: ctx.remote })
    },
    slots: {
      inject(name, install) {
        if (!['conversation.input.model', 'settings.section'].includes(name)) fail.push('wrong slot: ' + name)
        const dispose = install()
        if (typeof dispose !== 'function') fail.push('register() must return a disposer')
      },
      register(options, component) {
        registered.push({ options, component })
        return () => {}
      },
    },
  }
  try { mod.apply(ctx) } catch (error) { fail.push('apply() threw: ' + error.message) }
}

const seat = registered.find((item) => item.options.name === 'conversation.input.model')
const settings = registered.find((item) => item.options.name === 'settings.section')

if (registered.length !== 2) fail.push('expected two registrations, got ' + registered.length)
if (!seat) fail.push('missing conversation.input.model registration')
else {
  if (seat.options.priority !== -1) fail.push('model seat must shadow the shipped selector at priority -1')
  if (typeof seat.component !== 'function') fail.push('model seat is not a component')
  else ok.push('conversation.input.model seat registered at priority -1')
}
if (!settings) fail.push('missing settings.section registration')
else {
  if (settings.options.id !== 'periodic-model-picker') fail.push('wrong settings id')
  if (typeof settings.options.label !== 'function' || typeof settings.options.label() !== 'string') fail.push('settings label must be a function returning a string')
  if (typeof settings.component !== 'function') fail.push('settings panel is not a component')
  else ok.push('settings.section "Model table" registered')
}

for (const line of ok) console.log('ok   ' + line)
for (const line of fail) console.log('FAIL ' + line)
console.log(fail.length ? 'SMOKE FAILED (' + fail.length + ')' : 'SMOKE OK')
process.exit(fail.length ? 1 : 0)
