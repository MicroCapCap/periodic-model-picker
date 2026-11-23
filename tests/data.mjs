/**
 * Data and mapping check for the periodic picker.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const source = fs.readFileSync(path.join(here, '..', 'client.js'), 'utf8')

let entry = null
globalThis.window = {
  __ModuleLoader__: { load(spec) { entry = spec } },
}
globalThis.localStorage = { getItem: () => null, setItem: () => {} }
new Function(source)()

entry.factory((spec) => {
  if (spec === 'react') {
    return { createElement() {}, useState() {}, useEffect() {}, useMemo() {}, Fragment: 'Fragment' }
  }
  if (spec === 'react-dom') return { createPortal() {} }
  throw new Error('unexpected require(' + spec + ')')
})

const api = globalThis.window.__PeriodicModelPicker
const fail = []
const ok = []
const check = (condition, message) => { if (condition) ok.push(message); else fail.push(message) }

check(Boolean(api), 'helpers exposed')
if (api) {
  const elements = api.ELEMENTS
  check(elements.length === 118, '118 elements')
  check(elements[0].sym === 'H' && elements[0].name === 'Hydrogen', 'first element is H')
  check(elements[117].sym === 'Og' && elements[117].name === 'Oganesson', 'last element is Og')

  const seen = new Set()
  let unique = true
  let inRange = true
  for (const element of elements) {
    const key = element.col + ',' + element.row
    if (seen.has(key)) unique = false
    seen.add(key)
    if (element.col < 1 || element.col > 18 || element.row < 1 || element.row > 10) inRange = false
  }
  check(unique, 'every element has its own grid cell')
  check(inRange, 'every element is inside the 18x10 grid')

  const byNumber = (n) => elements.find((element) => element.n === n)
  check(byNumber(2).col === 18 && byNumber(2).row === 1, 'He sits at column 18, row 1')
  check(byNumber(57).row === 9 && byNumber(57).col === 3, 'La starts the lanthanide row')
  check(byNumber(89).row === 10 && byNumber(89).col === 3, 'Ac starts the actinide row')
  check(byNumber(118).col === 18 && byNumber(118).row === 7, 'Og closes row 7')

  check(api.category(1) === 'nonmetal', 'H is a nonmetal')
  check(api.category(2) === 'noble', 'He is a noble gas')
  check(api.category(26) === 'transition', 'Fe is a transition metal')
  check(api.category(57) === 'lanthanide', 'La is a lanthanide')
  check(api.category(92) === 'actinide', 'U is an actinide')
  check(api.category(17) === 'halogen', 'Cl is a halogen')

  const models = [
    { key: 'p/a', provider: 'p', id: 'a', name: 'A' },
    { key: 'p/b', provider: 'p', id: 'b', name: 'B' },
  ]
  check(api.modelForElement({ mapping: {} }, models, 1).key === 'p/a', 'first element takes the first model')
  check(api.modelForElement({ mapping: {} }, models, 2).key === 'p/b', 'second element takes the second model')
  check(api.modelForElement({ mapping: {} }, models, 3) === null, 'elements past the catalogue stay empty')
  check(api.modelForElement({ mapping: { 3: 'p/a' } }, models, 3).key === 'p/a', 'an element override wins')
  check(api.modelForElement({ mapping: { 1: '__none__' } }, models, 1) === null, 'No model pins an element empty')
  check(api.modelForElement({ mapping: {} }, [], 1) === null, 'no models resolves to null')

  const config = {
    names: { 'p/a': 'Alpha' },
    icons: { 'p/b': 'claude' },
    colors: { category: { nonmetal: '#123456' }, element: { 1: '#abcdef' }, models: { 'p/b': '#101010' } },
    marks: {},
  }
  check(api.nameFor(config, models[0]) === 'Alpha', 'custom display name wins')
  check(api.nameFor(config, models[1]) === 'B', 'catalogue name is the fallback')
  check(api.iconFor(config, models[1]) === 'claude', 'custom icon wins')
  check(api.inferBrand({ provider: 'deepseek', providerName: 'DeepSeek', id: 'chat', name: 'DeepSeek Chat' }) === 'deepseek', 'brand is inferred from the model')
  check(api.elementForModel({ mapping: {} }, models, models[0]) === 1, 'the first model occupies the first element')
  check(api.elementForModel({ mapping: {} }, models, models[1]) === 2, 'the second model occupies the second element')
  check(api.modelColor(config, models, models[1]) === '#101010', 'per-model color wins')
  check(api.modelColor(config, models, models[0]) === '#abcdef', 'a legacy element color follows the model on that element')
  check(api.modelColor({ colors: { models: {}, element: {} } }, models, models[0]) === '', 'unset model colors have no override')
  check(api.effectiveModelColor({ colors: { models: {}, element: {} } }, models, models[0]) === api.CATEGORY_COLORS.nonmetal, 'the default color comes from the element category')

  const moved = api.assignElementTo({ mapping: {} }, models, models[0], 5)
  check(moved['1'] === '__none__' && moved['5'] === 'p/a', 'moving a model pins its old slot empty')
  check(api.modelForElement({ mapping: moved }, models, 5).key === 'p/a', 'the moved model appears on its new element')
  check(api.elementForModel({ mapping: moved }, models, models[0]) === 5, 'elementForModel follows the move')

  const taken = api.assignElementTo({ mapping: {} }, models, models[1], 1)
  check(taken['1'] === 'p/b' && taken['2'] === '__none__', 'moving onto an element frees the old default slot')
  check(api.elementForModel({ mapping: taken }, models, models[1]) === 1, 'the second model took the first element')
  check(api.elementForModel({ mapping: taken }, models, models[0]) === 0, 'the displaced model has no element')

  const cleared = api.assignElementTo({ mapping: {} }, models, models[1], 0)
  check(cleared['2'] === '__none__' && api.elementForModel({ mapping: cleared }, models, models[1]) === 0, 'No element clears the model')

  check(api.brandChoices({ mine: 'text:✦' }).includes('mine'), 'custom marks join the icon choices')

  const flat = api.flattenCatalog({
    groups: [{ id: 'p', name: 'Provider', models: [{ id: 'a', name: 'A', description: 'd' }] }],
  })
  check(flat.length === 1 && flat[0].key === 'p/a' && flat[0].providerName === 'Provider', 'catalog flattening')

  // Retired model-look settings are imported once.
  globalThis.localStorage = {
    getItem(key) {
      if (key === 'dsh.claude-model-look.v1') {
        return JSON.stringify({ models: { 'p/a': { name: 'Alpha', brand: 'claude' } }, brands: { mine: 'text:✦' } })
      }
      return null
    },
    setItem() {},
  }
  const migrated = api.readConfig()
  check(migrated.names['p/a'] === 'Alpha', 'model-look names are imported')
  check(migrated.icons['p/a'] === 'claude', 'model-look icons are imported')
  check(migrated.marks.mine === 'text:✦', 'model-look custom icons are imported')
}

for (const line of ok) console.log('ok   ' + line)
for (const line of fail) console.log('FAIL ' + line)
console.log(fail.length ? 'DATA FAILED (' + fail.length + ')' : 'DATA OK')
process.exit(fail.length ? 1 : 0)
