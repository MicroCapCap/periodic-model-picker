/**
 * DOM-free render check.
 *
 * Runs the seat, the picker modal and the settings panel through a stand-in
 * React that executes hooks eagerly, then walks the returned element tree. It
 * catches plain objects rendered as children, missing components, and the tile
 * rules: only elements with a model are enabled.
 *
 * Usage: node tests/render.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const source = fs.readFileSync(path.join(here, '..', 'client.js'), 'utf8')

let entry = null
globalThis.window = { __ModuleLoader__: { load(spec) { entry = spec } } }
globalThis.localStorage = { getItem: () => null, setItem() {} }
globalThis.document = {
  body: { style: {} },
  addEventListener() {},
  removeEventListener() {},
}

new Function(source)()

function h(type, props, ...children) {
  const merged = Object.assign({}, props || {})
  if (children.length > 0) merged.children = children.length > 1 ? children : children[0]
  return { type, props: merged }
}

const fakeReact = {
  createElement: h,
  Fragment: 'Fragment',
  useState(initial) { return [typeof initial === 'function' ? initial() : initial, () => {}] },
  useEffect() {},
  useMemo(factory) { return factory() },
  useCallback(fn) { return fn },
}

const registrations = []
const fakeCtx = {
  inject(_services, callback) { callback({ remote: fakeRemote }) },
  slots: {
    inject(_name, callback) { return callback() },
    register(options, component) { registrations.push({ options, component }); return () => {} },
  },
}
const fakeRemote = { session: { modelCatalog: async () => ({ ok: false }) } }

const mod = entry.factory((spec) => {
  if (spec === 'react') return fakeReact
  if (spec === 'react-dom') return { createPortal: (children) => children }
  throw new Error('unexpected require(' + spec + ')')
})
mod.apply(fakeCtx)

const api = globalThis.window.__PeriodicModelPicker
const fail = []
const ok = []
const check = (condition, message) => { if (condition) ok.push(message); else fail.push(message) }

function walk(node, treePath) {
  if (node === null || node === undefined || typeof node === 'boolean') return
  if (typeof node === 'string' || typeof node === 'number') return
  if (Array.isArray(node)) {
    node.forEach((child, index) => walk(child, treePath + '[' + index + ']'))
    return
  }
  if (typeof node === 'object' && 'type' in node && 'props' in node) {
    const { type, props } = node
    if (typeof type === 'function') {
      walk(type(props), treePath + '<' + (type.name || 'function') + '>')
    } else {
      walk(props.children, treePath + '<' + String(type) + '>')
    }
    return
  }
  throw new Error(treePath + ': plain object rendered as a child (keys: ' + Object.keys(node).join(', ') + ')')
}

function collect(node, predicate, out = []) {
  if (node === null || node === undefined || typeof node !== 'object') return out
  if (Array.isArray(node)) {
    for (const child of node) collect(child, predicate, out)
    return out
  }
  if ('type' in node && 'props' in node) {
    if (typeof node.type === 'function') collect(node.type(node.props), predicate, out)
    else {
      if (predicate(node)) out.push(node)
      collect(node.props.children, predicate, out)
    }
  }
  return out
}

function text(node) {
  if (node === null || node === undefined || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(text).join(' ')
  if (typeof node === 'object' && 'props' in node) {
    if (typeof node.type === 'function') return text(node.type(node.props))
    return text(node.props.children)
  }
  return ''
}

check(registrations.length === 2, 'two registrations captured')
check(api && api.components, 'components exposed for tests')

const catalog = {
  groups: [
    { id: 'p', name: 'Provider', models: [
      { id: 'a', name: 'Model A', description: 'First model.' },
      { id: 'b', name: 'Model B', description: 'Second model.', reasoning: { efforts: [{ id: 'low', name: 'Low' }], defaultEffort: 'low' } },
    ] },
  ],
}
const models = api.flattenCatalog(catalog)

// Seat -----------------------------------------------------------------------
const seatTree = api.components.ModelSeat({ remote: fakeRemote, locked: false, sessionId: 's' })
walk(seatTree, 'seat')
check(text(seatTree).includes('Select model'), 'seat renders its label')

// Picker modal ---------------------------------------------------------------
const modalTree = api.components.PickerModal({
  remote: fakeRemote,
  sessionId: 's',
  locked: false,
  catalog,
  models,
  selection: null,
  onClose() {},
  onSelected() {},
  onError() {},
})
walk(modalTree, 'modal')
const modalText = text(modalTree)
check(modalText.includes('THE PERIODIC TABLE OF'), 'modal renders the table kicker')
check(modalText.includes('Model 4'), 'modal renders the default heading')
check(/Use this model|Current model/.test(modalText), 'modal renders the selection button')

const tiles = collect(modalTree, (node) => typeof node.type === 'string' && node.type === 'button'
  && String(node.props.className || '').includes('pmp-tile'))
check(tiles.length === 118, '118 element tiles render')
const filled = tiles.filter((tile) => tile.props['data-empty'] !== 'true')
const empty = tiles.filter((tile) => tile.props['data-empty'] === 'true')
check(filled.length === 2, 'only elements with a model are filled')
check(empty.length === 116, 'the rest are gray')
check(empty.every((tile) => tile.props.disabled === true), 'gray elements are inert')
check(filled.every((tile) => tile.props.disabled !== true), 'filled elements are selectable')

// Settings panel -------------------------------------------------------------
const settingsTree = api.components.SettingsPanel({ remote: fakeRemote, catalog })
walk(settingsTree, 'settings')
const settingsText = text(settingsTree)
check(settingsText.includes('Periodic model picker'), 'settings panel renders')
check(settingsText.includes('Element'), 'settings rows expose an element column')
check(settingsText.includes('Color'), 'settings rows expose a color column')
check(settingsText.includes('Custom icons'), 'settings expose custom icons')
const headingInputs = collect(settingsTree, (node) => typeof node.type === 'string' && node.type === 'input'
  && node.props.value === 'Model 4')
check(headingInputs.length === 1, 'settings expose the big heading')
const elementSelects = collect(settingsTree, (node) => typeof node.type === 'string' && node.type === 'select'
  && String(node.props['aria-label'] || '').startsWith('Element for '))
check(elementSelects.length === 2, 'settings expose one element picker per model')
const colorInputs = collect(settingsTree, (node) => typeof node.type === 'string' && node.type === 'input'
  && node.props.type === 'color')
check(colorInputs.length === 2, 'settings expose one color input per model')
const nameInputs = collect(settingsTree, (node) => typeof node.type === 'string' && node.type === 'input'
  && String(node.props['aria-label'] || '').startsWith('Display name for '))
check(nameInputs.length === 2, 'settings expose one display name per model')

for (const line of ok) console.log('ok   ' + line)
for (const line of fail) console.log('FAIL ' + line)
console.log(fail.length ? 'RENDER FAILED (' + fail.length + ')' : 'RENDER OK')
process.exit(fail.length ? 1 : 0)
