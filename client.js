/**
 * periodic-model-picker — client half.
 *
 * Replaces the composer's model seat with a periodic-table picker and adds a
 * "Model table" page to DSH settings.
 *
 * - Settings: big heading, per-element model assignment, category and
 *   per-element colors, per-model display names and brand icons, custom icons,
 *   badges.
 * - Picker: elements without a model are gray and inert; elements with a model
 *   use the configured color. Selecting a tile only previews it; one button
 *   switches the session's model. Nothing sends a message.
 *
 * The host half generates descriptions and serves them at
 * /model-picker/descriptions.
 *
 * Settings from the retired @local/claude-model-look plugin are imported once
 * from dsh.claude-model-look.v1.
 */
window.__ModuleLoader__.load({
  id: '@local/periodic-model-picker',
  factory(require) {
    const React = require('react');
    const ReactDOM = require('react-dom');
    const h = React.createElement;
    const { useState, useEffect, useMemo } = React;

    const STORAGE_KEY = 'dsh.periodic-model-picker.v1';
    const LOOK_STORAGE_KEY = 'dsh.claude-model-look.v1';

    const CATEGORY_COLORS = {
      alkali: '#fae3e1',
      alkaline: '#fbead8',
      transition: '#e5e9f4',
      post: '#e2efe4',
      metalloid: '#f2e8d8',
      nonmetal: '#eae5f8',
      halogen: '#dcefe1',
      noble: '#d9f0ea',
      lanthanide: '#f7e2eb',
      actinide: '#f1e2f4',
      unknown: '#eef0f3',
    };

    const CATEGORY_LABELS = {
      alkali: 'Alkali metal',
      alkaline: 'Alkaline earth',
      transition: 'Transition metal',
      post: 'Post-transition',
      metalloid: 'Metalloid',
      nonmetal: 'Nonmetal',
      halogen: 'Halogen',
      noble: 'Noble gas',
      lanthanide: 'Lanthanide',
      actinide: 'Actinide',
    };

    const DEFAULT_CONFIG = {
      heading: 'Model 4',
      mapping: {},
      colors: { category: {}, element: {} },
      names: {},
      icons: {},
      marks: {},
      meta: {},
    };

    // ------------------------------------------------------------- elements --

    const SYMBOLS = ['', 'H', 'He', 'Li', 'Be', 'B', 'C', 'N', 'O', 'F', 'Ne', 'Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl', 'Ar', 'K', 'Ca', 'Sc', 'Ti', 'V', 'Cr', 'Mn', 'Fe', 'Co', 'Ni', 'Cu', 'Zn', 'Ga', 'Ge', 'As', 'Se', 'Br', 'Kr', 'Rb', 'Sr', 'Y', 'Zr', 'Nb', 'Mo', 'Tc', 'Ru', 'Rh', 'Pd', 'Ag', 'Cd', 'In', 'Sn', 'Sb', 'Te', 'I', 'Xe', 'Cs', 'Ba', 'La', 'Ce', 'Pr', 'Nd', 'Pm', 'Sm', 'Eu', 'Gd', 'Tb', 'Dy', 'Ho', 'Er', 'Tm', 'Yb', 'Lu', 'Hf', 'Ta', 'W', 'Re', 'Os', 'Ir', 'Pt', 'Au', 'Hg', 'Tl', 'Pb', 'Bi', 'Po', 'At', 'Rn', 'Fr', 'Ra', 'Ac', 'Th', 'Pa', 'U', 'Np', 'Pu', 'Am', 'Cm', 'Bk', 'Cf', 'Es', 'Fm', 'Md', 'No', 'Lr', 'Rf', 'Db', 'Sg', 'Bh', 'Hs', 'Mt', 'Ds', 'Rg', 'Cn', 'Nh', 'Fl', 'Mc', 'Lv', 'Ts', 'Og'];

    const NAMES = ['', 'Hydrogen', 'Helium', 'Lithium', 'Beryllium', 'Boron', 'Carbon', 'Nitrogen', 'Oxygen', 'Fluorine', 'Neon', 'Sodium', 'Magnesium', 'Aluminium', 'Silicon', 'Phosphorus', 'Sulfur', 'Chlorine', 'Argon', 'Potassium', 'Calcium', 'Scandium', 'Titanium', 'Vanadium', 'Chromium', 'Manganese', 'Iron', 'Cobalt', 'Nickel', 'Copper', 'Zinc', 'Gallium', 'Germanium', 'Arsenic', 'Selenium', 'Bromine', 'Krypton', 'Rubidium', 'Strontium', 'Yttrium', 'Zirconium', 'Niobium', 'Molybdenum', 'Technetium', 'Ruthenium', 'Rhodium', 'Palladium', 'Silver', 'Cadmium', 'Indium', 'Tin', 'Antimony', 'Tellurium', 'Iodine', 'Xenon', 'Caesium', 'Barium', 'Lanthanum', 'Cerium', 'Praseodymium', 'Neodymium', 'Promethium', 'Samarium', 'Europium', 'Gadolinium', 'Terbium', 'Dysprosium', 'Holmium', 'Erbium', 'Thulium', 'Ytterbium', 'Lutetium', 'Hafnium', 'Tantalum', 'Tungsten', 'Rhenium', 'Osmium', 'Iridium', 'Platinum', 'Gold', 'Mercury', 'Thallium', 'Lead', 'Bismuth', 'Polonium', 'Astatine', 'Radon', 'Francium', 'Radium', 'Actinium', 'Thorium', 'Protactinium', 'Uranium', 'Neptunium', 'Plutonium', 'Americium', 'Curium', 'Berkelium', 'Californium', 'Einsteinium', 'Fermium', 'Mendelevium', 'Nobelium', 'Lawrencium', 'Rutherfordium', 'Dubnium', 'Seaborgium', 'Bohrium', 'Hassium', 'Meitnerium', 'Darmstadtium', 'Roentgenium', 'Copernicium', 'Nihonium', 'Flerovium', 'Moscovium', 'Livermorium', 'Tennessine', 'Oganesson'];

    function category(n) {
      if ([3, 11, 19, 37, 55, 87].includes(n)) return 'alkali';
      if ([4, 12, 20, 38, 56, 88].includes(n)) return 'alkaline';
      if ([9, 17, 35, 53, 85, 117].includes(n)) return 'halogen';
      if ([2, 10, 18, 36, 54, 86, 118].includes(n)) return 'noble';
      if ([5, 14, 32, 33, 51, 52].includes(n)) return 'metalloid';
      if ([1, 6, 7, 8, 15, 16, 34].includes(n)) return 'nonmetal';
      if ([13, 31, 49, 50, 81, 82, 83, 84, 113, 114, 115, 116].includes(n)) return 'post';
      if ((n >= 21 && n <= 30) || (n >= 39 && n <= 48) || (n >= 72 && n <= 80) || (n >= 104 && n <= 112)) return 'transition';
      if (n >= 57 && n <= 71) return 'lanthanide';
      if (n >= 89 && n <= 103) return 'actinide';
      return 'unknown';
    }

    function position(n) {
      if (n === 1) return { col: 1, row: 1 };
      if (n === 2) return { col: 18, row: 1 };
      if (n <= 4) return { col: n - 2, row: 2 };
      if (n <= 10) return { col: n + 8, row: 2 };
      if (n <= 12) return { col: n - 10, row: 3 };
      if (n <= 18) return { col: n, row: 3 };
      if (n <= 36) return { col: n - 18, row: 4 };
      if (n <= 54) return { col: n - 36, row: 5 };
      if (n === 55) return { col: 1, row: 6 };
      if (n === 56) return { col: 2, row: 6 };
      if (n <= 71) return { col: n - 57 + 3, row: 9 };
      if (n <= 86) return { col: n - 72 + 4, row: 6 };
      if (n === 87) return { col: 1, row: 7 };
      if (n === 88) return { col: 2, row: 7 };
      if (n <= 103) return { col: n - 89 + 3, row: 10 };
      return { col: n - 104 + 4, row: 7 };
    }

    const ELEMENTS = [];
    for (let n = 1; n <= 118; n += 1) {
      const pos = position(n);
      ELEMENTS.push({ n, sym: SYMBOLS[n], name: NAMES[n], cat: category(n), col: pos.col, row: pos.row });
    }

    // ----------------------------------------------------------------- utils --

    const elementKey = (n) => String(n);

    const modelKeyOf = (model) => model.provider + '/' + model.id;

    function flattenCatalog(catalog) {
      const out = [];
      for (const group of (catalog && catalog.groups) || []) {
        for (const model of group.models || []) {
          out.push({
            key: group.id + '/' + model.id,
            provider: group.id,
            providerName: group.name,
            id: model.id,
            name: model.name,
            description: model.description || '',
            reasoning: model.reasoning,
            badge: model.badge,
          });
        }
      }
      return out;
    }

    // Explicit mapping wins. `__none__` pins an element as empty. Without an
    // override the first N elements take the N catalog models in order; the
    // rest stay empty (gray), like the reference table.
    function modelForElement(config, models, n) {
      const override = config && config.mapping ? config.mapping[elementKey(n)] : undefined;
      if (override === '__none__') return null;
      if (typeof override === 'string' && override) {
        const found = models.find((model) => model.key === override);
        return found || null;
      }
      if (!models.length) return null;
      return n <= models.length ? models[n - 1] : null;
    }

    function nameFor(config, model) {
      if (!model) return '';
      return (config && config.names && config.names[model.key]) || model.name;
    }

    function inferBrand(model) {
      if (!model) return '';
      const hay = [model.provider, model.providerName, model.id, model.name].join(' ').toLowerCase();
      if (hay.includes('claude') || hay.includes('anthropic')) return 'claude';
      if (hay.includes('chatgpt') || hay.includes('openai') || hay.includes('gpt')) return 'openai';
      if (hay.includes('gemini') || hay.includes('google')) return 'gemini';
      if (hay.includes('deepseek')) return 'deepseek';
      if (hay.includes('qwen') || hay.includes('tongyi')) return 'qwen';
      if (hay.includes('mistral')) return 'mistral';
      if (hay.includes('grok') || hay.includes('xai')) return 'grok';
      return '';
    }

    function iconFor(config, model) {
      if (!model) return '';
      const configured = config && config.icons ? config.icons[model.key] : '';
      return configured || inferBrand(model);
    }

    function customColor(config, element) {
      const colors = (config && config.colors) || {};
      const own = colors.element && colors.element[elementKey(element.n)];
      if (own) return own;
      return (colors.category && colors.category[element.cat]) || '';
    }

    // The settings page edits one row per model: which element it occupies and
    // its color. These invert the element→model mapping for that view.
    function elementForModel(config, models, model) {
      if (!model) return 0;
      for (let n = 1; n <= 118; n += 1) {
        const found = modelForElement(config, models, n);
        if (found && found.key === model.key) return n;
      }
      return 0;
    }

    // Move a model to an element (0 = no element). The model keeps exactly one
    // element: old explicit slots are cleared, and the model's default slot is
    // pinned empty when the model moves away from it.
    function assignElementTo(config, models, model, n) {
      const mapping = Object.assign({}, config.mapping || {});
      for (const [key, value] of Object.entries(mapping)) {
        if (value === model.key) delete mapping[key];
      }
      const index = models.findIndex((candidate) => candidate.key === model.key);
      const defaultN = index >= 0 && index < 118 ? index + 1 : 0;
      if (defaultN && defaultN !== n) {
        const current = modelForElement({ mapping }, models, defaultN);
        if (current && current.key === model.key) mapping[elementKey(defaultN)] = '__none__';
      }
      if (n > 0) mapping[elementKey(n)] = model.key;
      return mapping;
    }

    function modelColor(config, models, model) {
      if (!model) return '';
      const own = config.colors && config.colors.models && config.colors.models[model.key];
      if (own) return own;
      // Colors saved by the per-element editor still apply to the model that
      // occupies that element.
      const n = elementForModel(config, models, model);
      const legacy = n && config.colors && config.colors.element && config.colors.element[elementKey(n)];
      return legacy || '';
    }

    function effectiveModelColor(config, models, model) {
      if (!model) return CATEGORY_COLORS.unknown;
      const own = modelColor(config, models, model);
      if (own) return own;
      const n = elementForModel(config, models, model);
      const element = n ? ELEMENTS[n - 1] : null;
      return (element && CATEGORY_COLORS[element.cat]) || CATEGORY_COLORS.unknown;
    }

    function effectiveColor(config, element) {
      return customColor(config, element) || CATEGORY_COLORS[element.cat] || CATEGORY_COLORS.unknown;
    }

    function inkFor(hex) {
      const match = /^#?([0-9a-f]{6})$/i.exec(String(hex || ''));
      if (!match) return '';
      const value = parseInt(match[1], 16);
      const red = (value >> 16) & 255;
      const green = (value >> 8) & 255;
      const blue = value & 255;
      return (0.299 * red + 0.587 * green + 0.114 * blue) > 150 ? '#111827' : '#ffffff';
    }

    function descriptionFor(model, config, ai) {
      if (!model) return '';
      const override = config.meta[model.key] && config.meta[model.key].description;
      return override || (ai && ai[model.key]) || model.description || '';
    }

    // ----------------------------------------------------------------- store --

    function stringMap(value) {
      const out = {};
      if (value && typeof value === 'object') {
        for (const [key, entry] of Object.entries(value)) {
          if (typeof entry === 'string' && entry) out[key] = entry;
        }
      }
      return out;
    }

    function readLegacyLook() {
      try {
        const raw = JSON.parse(localStorage.getItem(LOOK_STORAGE_KEY) || 'null');
        return raw && typeof raw === 'object' ? raw : null;
      } catch {
        return null;
      }
    }

    function normalizeConfig(raw) {
      const source = raw && typeof raw === 'object' ? raw : {};
      const config = {
        heading: typeof source.heading === 'string' && source.heading.trim() ? source.heading.trim() : DEFAULT_CONFIG.heading,
        mapping: stringMap(source.mapping),
        colors: {
          category: stringMap(source.colors && source.colors.category),
          element: stringMap(source.colors && source.colors.element),
          models: stringMap(source.colors && source.colors.models),
        },
        names: stringMap(source.names),
        icons: stringMap(source.icons),
        marks: stringMap(source.marks),
        meta: source.meta && typeof source.meta === 'object' && !Array.isArray(source.meta) ? source.meta : {},
        migratedLook: source.migratedLook === true,
      };
      // Import display names and icons from the retired model-look plugin once.
      if (!config.migratedLook) {
        const legacy = readLegacyLook();
        if (legacy) {
          const models = legacy.models && typeof legacy.models === 'object' ? legacy.models : {};
          for (const [key, entry] of Object.entries(models)) {
            if (!entry || typeof entry !== 'object') continue;
            if (typeof entry.name === 'string' && entry.name.trim() && !config.names[key]) {
              config.names[key] = entry.name.trim();
            }
            if (typeof entry.brand === 'string' && entry.brand && !config.icons[key]) {
              config.icons[key] = entry.brand;
            }
          }
          const marks = legacy.brands && typeof legacy.brands === 'object' ? legacy.brands : {};
          for (const [id, content] of Object.entries(marks)) {
            if (typeof content === 'string' && content && !config.marks[id]) config.marks[id] = content;
          }
        }
        config.migratedLook = true;
      }
      return config;
    }

    const listeners = new Set();

    function emit() {
      for (const listener of Array.from(listeners)) {
        try { listener(); } catch {}
      }
    }

    function subscribe(listener) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    }

    function readConfig() {
      let raw = null;
      try {
        raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      } catch {
        raw = null;
      }
      const config = normalizeConfig(raw);
      // Persist the migration result the first time, so it is not repeated.
      if (!raw || raw.migratedLook !== true) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(config)); } catch {}
      }
      return config;
    }

    function writeConfig(config) {
      // Writes always count as migrated; otherwise a reset would re-import the
      // retired model-look settings from localStorage.
      const next = normalizeConfig(Object.assign({}, config, { migratedLook: true }));
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      emit();
      return next;
    }

    function useConfig() {
      const [config, setConfig] = useState(readConfig);
      useEffect(() => {
        const off = subscribe(() => setConfig(readConfig()));
        setConfig(readConfig());
        return off;
      }, []);
      return config;
    }

    // ----------------------------------------------------------------- brands --

    // Marks from Simple Icons (CC0); the marks belong to their owners.
    const BRANDS = {
      claude: {
        label: 'Claude', color: '#D97757',
        path: 'm4.7144 15.9555 4.7174-2.6471.079-.2307-.079-.1275h-.2307l-.7893-.0486-2.6956-.0729-2.3375-.0971-2.2646-.1214-.5707-.1215-.5343-.7042.0546-.3522.4797-.3218.686.0608 1.5179.1032 2.2767.1578 1.6514.0972 2.4468.255h.3886l.0546-.1579-.1336-.0971-.1032-.0972L6.973 9.8356l-2.55-1.6879-1.3356-.9714-.7225-.4918-.3643-.4614-.1578-1.0078.6557-.7225.8803.0607.2246.0607.8925.686 1.9064 1.4754 2.4893 1.8336.3643.3035.1457-.1032.0182-.0728-.164-.2733-1.3539-2.4467-1.445-2.4893-.6435-1.032-.17-.6194c-.0607-.255-.1032-.4674-.1032-.7285L6.287.1335 6.6997 0l.9957.1336.419.3642.6192 1.4147 1.0018 2.2282 1.5543 3.0296.4553.8985.2429.8318.091.255h.1579v-.1457l.1275-1.706.2368-2.0947.2307-2.6957.0789-.7589.3764-.9107.7468-.4918.5828.2793.4797.686-.0668.4433-.2853 1.8517-.5586 2.9021-.3643 1.9429h.2125l.2429-.2429.9835-1.3053 1.6514-2.0643.7286-.8196.85-.9046.5464-.4311h1.0321l.759 1.1293-.34 1.1657-1.0625 1.3478-.8804 1.1414-1.2628 1.7-.7893 1.36.0729.1093.1882-.0183 2.8535-.607 1.5421-.2794 1.8396-.3157.8318.3886.091.3946-.3278.8075-1.967.4857-2.3072.4614-3.4364.8136-.0425.0304.0486.0607 1.5482.1457.6618.0364h1.621l3.0175.2247.7892.522.4736.6376-.079.4857-1.2142.6193-1.6393-.3886-3.825-.9107-1.3113-.3279h-.1822v.1093l1.0929 1.0686 2.0035 1.8092 2.5075 2.3314.1275.5768-.3218.4554-.34-.0486-2.2039-1.6575-.85-.7468-1.9246-1.621h-.1275v.17l.4432.6496 2.3436 3.5214.1214 1.0807-.17.3521-.6071.2125-.6679-.1214-1.3721-1.9246L14.38 17.959l-1.1414-1.9428-.1397.079-.674 7.2552-.3156.3703-.7286.2793-.6071-.4614-.3218-.7468.3218-1.4753.3886-1.9246.3157-1.53.2853-1.9004.17-.6314-.0121-.0425-.1397.0182-1.4328 1.9672-2.1796 2.9446-1.7243 1.8456-.4128.164-.7164-.3704.0667-.6618.4008-.5889 2.386-3.0357 1.4389-1.882.929-1.0868-.0062-.1579h-.0546l-6.3385 4.1164-1.1293.1457-.4857-.4554.0608-.7467.2307-.2429 1.9064-1.3114Z',
      },
      openai: {
        label: 'ChatGPT', color: '#10A37F',
        path: 'M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z',
      },
      gemini: {
        label: 'Gemini', color: '#8E75B2',
        path: 'M11.04 19.32Q12 21.51 12 24q0-2.49.93-4.68.96-2.19 2.58-3.81t3.81-2.55Q21.51 12 24 12q-2.49 0-4.68-.93a12.3 12.3 0 0 1-3.81-2.58 12.3 12.3 0 0 1-2.58-3.81Q12 2.49 12 0q0 2.49-.96 4.68-.93 2.19-2.55 3.81a12.3 12.3 0 0 1-3.81 2.58Q2.49 12 0 12q2.49 0 4.68.96 2.19.93 3.81 2.55t2.55 3.81',
      },
      deepseek: {
        label: 'DeepSeek', color: '#4D6BFE',
        path: 'M23.748 4.651c-.254-.124-.364.113-.512.233-.051.04-.094.09-.137.137-.372.397-.806.657-1.373.626-.829-.046-1.537.214-2.163.848-.133-.782-.575-1.248-1.247-1.548-.352-.155-.708-.311-.955-.65-.172-.24-.219-.509-.305-.774-.055-.16-.11-.323-.293-.35-.2-.031-.278.136-.356.276-.313.572-.434 1.202-.422 1.84.027 1.436.633 2.58 1.838 3.393.137.094.172.187.129.323-.082.28-.18.553-.266.833-.055.179-.137.218-.328.14a5.5 5.5 0 0 1-1.737-1.179c-.857-.828-1.631-1.743-2.597-2.46a12 12 0 0 0-.689-.47c-.985-.957.13-1.743.387-1.836.27-.098.094-.433-.778-.428-.872.003-1.67.295-2.687.685a3 3 0 0 1-.465.136 9.6 9.6 0 0 0-2.883-.101c-1.885.21-3.39 1.1-4.497 2.622C.082 8.776-.231 10.854.152 13.02c.403 2.284 1.568 4.175 3.36 5.653 1.857 1.533 3.997 2.284 6.438 2.14 1.482-.085 3.132-.284 4.994-1.86.47.234.962.328 1.78.398.629.058 1.235-.031 1.705-.129.735-.155.684-.836.418-.961-2.155-1.004-1.682-.595-2.112-.926 1.095-1.295 2.768-3.598 3.284-6.733.05-.346.115-.834.108-1.114-.004-.171.035-.238.23-.257a4.2 4.2 0 0 0 1.545-.475c1.397-.763 1.96-2.016 2.093-3.517.02-.23-.004-.467-.247-.588M11.58 18.168c-2.088-1.642-3.101-2.183-3.52-2.16-.39.024-.32.472-.234.763.09.288.207.487.371.74.114.167.192.416-.113.603-.673.416-1.842-.14-1.897-.168-1.361-.801-2.5-1.86-3.301-3.306-.775-1.393-1.225-2.888-1.299-4.482-.02-.385.094-.522.477-.592a4.7 4.7 0 0 1 1.53-.038c2.131.311 3.946 1.264 5.467 2.774.868.86 1.525 1.887 2.202 2.89.72 1.066 1.494 2.082 2.48 2.915.348.291.626.513.892.677-.802.09-2.14.109-3.055-.615zm1.001-6.44a.306.306 0 0 1 .415-.287.3.3 0 0 1 .113.074.3.3 0 0 1 .086.214c0 .17-.136.307-.308.307a.303.303 0 0 1-.306-.307m3.11 1.596c-.2.081-.4.151-.591.16a1.25 1.25 0 0 1-.798-.254c-.274-.23-.47-.358-.551-.758a1.7 1.7 0 0 1 .015-.588c.07-.327-.007-.537-.238-.727-.188-.156-.426-.199-.689-.199a.6.6 0 0 1-.254-.078.253.253 0 0 1-.114-.358 1.2 1.2 0 0 1 .192-.21c.356-.202.767-.136 1.146.016.352.144.618.408 1.001.782.392.451.462.576.685.915.176.264.336.536.446.848.066.194-.02.353-.25.45',
      },
      qwen: {
        label: 'Qwen', color: '#6950EF',
        path: 'M23.919 14.545 20.817 9.17l1.47-2.544a.56.56 0 0 0 0-.566l-1.633-2.83a.57.57 0 0 0-.49-.283h-6.207L12.487.402a.57.57 0 0 0-.49-.284H8.732a.56.56 0 0 0-.49.284L5.139 5.775h-2.94a.56.56 0 0 0-.49.284L.077 8.887a.56.56 0 0 0 0 .567L3.18 14.83l-1.47 2.545a.56.56 0 0 0 0 .566l1.634 2.83a.57.57 0 0 0 .49.283h6.205l1.47 2.545a.57.57 0 0 0 .49.284h3.266a.57.57 0 0 0 .49-.284l3.104-5.375h2.94a.57.57 0 0 0 .49-.283l1.634-2.828a.55.55 0 0 0-.004-.568M8.733.686l1.634 2.828-1.634 2.828H21.8L20.164 9.17H7.425L5.63 6.06Zm1.306 19.801-6.205-.002 1.634-2.83h3.265L2.201 6.344h3.267q3.182 5.517 6.367 11.032zm10.124-5.66L18.53 12l-6.532 11.315-1.634-2.83c2.129-3.673 4.25-7.351 6.373-11.028h3.592l3.102 5.374z',
      },
      mistral: {
        label: 'Mistral', color: '#FA520F',
        path: 'M17.143 3.429v3.428h-3.429v3.429h-3.428V6.857H6.857V3.43H3.43v13.714H0v3.428h10.286v-3.428H6.857v-3.429h3.429v3.429h3.429v-3.429h3.428v3.429h-3.428v3.428H24v-3.428h-3.43V3.429z',
      },
      grok: {
        label: 'Grok', color: null,
        path: 'M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z',
      },
    };

    const GENERIC_PATH = 'M12 3.1a8.9 8.9 0 1 0 0 17.8 8.9 8.9 0 0 0 0-17.8Zm0 3.1a5.8 5.8 0 1 1 0 11.6 5.8 5.8 0 0 1 0-11.6Z';

    const ALIAS = {
      chatgpt: 'openai', gpt: 'openai', 'chat-gpt': 'openai', anthropic: 'claude',
      google: 'gemini', 'google-gemini': 'gemini', xai: 'grok', mistralai: 'mistral',
    };

    function brandKey(value) {
      const key = String(value == null ? '' : value).trim().toLowerCase();
      return ALIAS[key] || key;
    }

    function brandChoices(marks) {
      const ids = Object.keys(BRANDS);
      for (const id of Object.keys(marks || {})) if (!ids.includes(id)) ids.push(id);
      return ids;
    }

    // ------------------------------------------------------------- svg hygiene --

    const svgCache = new Map();

    function sanitizeSvg(source) {
      if (typeof DOMParser !== 'function' || typeof XMLSerializer !== 'function') return null;
      if (svgCache.has(source)) return svgCache.get(source);
      let out = null;
      try {
        const doc = new DOMParser().parseFromString(source, 'image/svg+xml');
        const svg = doc && doc.documentElement;
        if (svg && String(svg.nodeName).toLowerCase() === 'svg' && !doc.querySelector('parsererror')) {
          for (const node of Array.from(svg.querySelectorAll('script,foreignObject,iframe,object,embed'))) node.remove();
          for (const node of Array.from(svg.querySelectorAll('*'))) {
            for (const attribute of Array.from(node.attributes)) {
              const name = String(attribute.name).toLowerCase();
              const value = String(attribute.value || '');
              if (name.startsWith('on') || /javascript:/i.test(value)) node.removeAttribute(attribute.name);
            }
          }
          if (!svg.getAttribute('viewBox')) {
            const width = parseFloat(svg.getAttribute('width') || '');
            const height = parseFloat(svg.getAttribute('height') || '');
            if (width > 0 && height > 0) svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
          }
          out = new XMLSerializer().serializeToString(svg);
        }
      } catch {
        out = null;
      }
      if (svgCache.size > 64) svgCache.clear();
      svgCache.set(source, out);
      return out;
    }

    function BrandMark(props) {
      const id = props.id;
      if (!id) return null;
      const size = props.size || 12;
      const marks = props.marks || {};
      const style = {
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        flex: '0 0 auto', width: size, height: size, lineHeight: 1,
      };
      const className = 'pmp-mark' + (props.className ? ' ' + props.className : '');
      const custom = marks[id];
      if (typeof custom === 'string' && custom) {
        if (custom.indexOf('text:') === 0) {
          return h('span', {
            className: className + ' pmp-mark-text',
            style: Object.assign({}, style, { fontSize: size }),
            'aria-hidden': true,
          }, custom.slice(5));
        }
        const svg = sanitizeSvg(custom);
        if (svg) {
          return h('span', {
            className: className + ' pmp-mark-custom',
            style,
            'aria-hidden': true,
            dangerouslySetInnerHTML: { __html: svg },
          });
        }
      }
      const brand = BRANDS[brandKey(id)];
      const path = brand ? brand.path : GENERIC_PATH;
      const fill = brand && brand.color ? brand.color : 'currentColor';
      return h('span', { className, style, 'aria-hidden': true },
        h('svg', { viewBox: '0 0 24 24', width: size, height: size, focusable: 'false' },
          h('path', { d: path, fill })));
    }

    // ----------------------------------------------------------------- styles --

    const CSS = [
      // modal
      '.pmp-overlay{position:fixed;inset:0;z-index:2140;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(15,23,42,.28);backdrop-filter:blur(2px)}',
      '.pmp-card{width:min(620px,96vw);max-height:90vh;overflow:auto;background:var(--dsw-alias-bg-primary,#fff);color:var(--dsw-alias-label-primary,#111827);border-radius:12px;box-shadow:0 16px 48px rgba(15,23,42,.26);padding:11px 13px 13px}',
      '.pmp-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px}',
      '.pmp-title{font-size:11px;font-weight:650;letter-spacing:.01em}',
      '.pmp-icon-btn{width:20px;height:20px;border-radius:6px;border:1px solid transparent;background:transparent;color:var(--dsw-alias-label-secondary,#6b7280);font-size:12px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center}',
      '.pmp-icon-btn:hover{background:var(--dsw-alias-bg-secondary,rgba(127,127,127,.08))}',
      '.pmp-icon-btn:focus-visible{outline:2px solid var(--dsw-alias-accent-primary,#2f6fd0);outline-offset:2px}',
      '.pmp-search{display:flex;align-items:center;gap:5px;border:1px solid var(--dsw-alias-border-secondary,rgba(127,127,127,.28));border-radius:7px;padding:4px 7px;margin-bottom:7px;color:var(--dsw-alias-label-secondary,#6b7280)}',
      '.pmp-search svg{width:10px;height:10px;flex:none}',
      '.pmp-search input{flex:1;min-width:0;border:0;outline:0;background:transparent;color:inherit;font:inherit;font-size:9.5px}',
      '.pmp-chips{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:7px}',
      '.pmp-chip{border:1px solid var(--dsw-alias-border-secondary,rgba(127,127,127,.28));border-radius:999px;background:transparent;color:var(--dsw-alias-label-primary,#111827);font:inherit;font-size:8px;padding:2.5px 7px;cursor:pointer}',
      '.pmp-chip[data-on="true"]{background:var(--dsw-alias-bg-inverse,#111827);color:var(--dsw-alias-label-inverse,#fff);border-color:transparent}',
      '.pmp-chip:focus-visible{outline:2px solid var(--dsw-alias-accent-primary,#2f6fd0);outline-offset:2px}',
      '.pmp-table-wrap{border:1px solid var(--dsw-alias-border-secondary,rgba(127,127,127,.22));border-radius:8px;padding:6px;overflow-x:auto;background:var(--dsw-alias-bg-primary,#fff)}',
      '.pmp-grid{display:grid;grid-template-columns:repeat(18,minmax(0,1fr));grid-template-rows:repeat(7,auto) 6px repeat(2,auto);gap:2px;min-width:560px}',
      '.pmp-title-block{grid-column:5 / 13;grid-row:1 / 4;display:flex;flex-direction:column;justify-content:center;padding:2px 4px 2px 10px;min-width:0}',
      '.pmp-kicker{font-size:5px;letter-spacing:.16em;color:var(--dsw-alias-label-secondary,#6b7280);font-weight:600}',
      '.pmp-big-title{font-size:clamp(13px,2.4vw,21px);line-height:1.02;font-weight:750;letter-spacing:-.02em;margin-top:1px;overflow-wrap:anywhere}',
      '.pmp-tile{position:relative;aspect-ratio:1/.96;border:1px solid transparent;border-radius:3px;padding:1px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0;cursor:pointer;color:var(--dsw-alias-label-primary,#111827);font:inherit;min-width:0}',
      '.pmp-tile[data-cat="alkali"]{background:#fae3e1}',
      '.pmp-tile[data-cat="alkaline"]{background:#fbead8}',
      '.pmp-tile[data-cat="transition"]{background:#e5e9f4}',
      '.pmp-tile[data-cat="post"]{background:#e2efe4}',
      '.pmp-tile[data-cat="metalloid"]{background:#f2e8d8}',
      '.pmp-tile[data-cat="nonmetal"]{background:#eae5f8}',
      '.pmp-tile[data-cat="halogen"]{background:#dcefe1}',
      '.pmp-tile[data-cat="noble"]{background:#d9f0ea}',
      '.pmp-tile[data-cat="lanthanide"]{background:#f7e2eb}',
      '.pmp-tile[data-cat="actinide"]{background:#f1e2f4}',
      '.pmp-tile[data-cat="unknown"]{background:#eef0f3}',
      '.pmp-tile[data-empty="true"]{background:var(--dsw-alias-bg-secondary,#f1f2f4);color:var(--dsw-alias-label-secondary,#a0a6b0);border-color:transparent;cursor:default}',
      '.pmp-tile[data-empty="true"]:hover{border-color:transparent}',
      '.pmp-detail-tile[data-cat="alkali"]{background:#fae3e1}.pmp-detail-tile[data-cat="alkaline"]{background:#fbead8}.pmp-detail-tile[data-cat="transition"]{background:#e5e9f4}.pmp-detail-tile[data-cat="post"]{background:#e2efe4}.pmp-detail-tile[data-cat="metalloid"]{background:#f2e8d8}.pmp-detail-tile[data-cat="nonmetal"]{background:#eae5f8}.pmp-detail-tile[data-cat="halogen"]{background:#dcefe1}.pmp-detail-tile[data-cat="noble"]{background:#d9f0ea}.pmp-detail-tile[data-cat="lanthanide"]{background:#f7e2eb}.pmp-detail-tile[data-cat="actinide"]{background:#f1e2f4}.pmp-detail-tile[data-cat="unknown"]{background:#eef0f3}',
      '.pmp-detail-tile[data-empty="true"]{background:var(--dsw-alias-bg-secondary,#f1f2f4);color:var(--dsw-alias-label-secondary,#a0a6b0)}',
      '.pmp-tile[data-dim="true"]{opacity:.26}',
      '.pmp-tile[data-selected="true"]{border-color:var(--dsw-alias-accent-primary,#2f6fd0);box-shadow:0 0 0 1px var(--dsw-alias-accent-primary,#2f6fd0),0 2px 8px rgba(47,111,208,.18)}',
      '.pmp-tile:hover{border-color:var(--dsw-alias-accent-primary,#2f6fd0)}',
      '.pmp-tile:focus-visible{outline:2px solid var(--dsw-alias-accent-primary,#2f6fd0);outline-offset:1px}',
      '.pmp-num{position:absolute;top:1px;left:2px;font-size:4.5px;line-height:1;color:var(--dsw-alias-label-secondary,#6b7280)}',
      '.pmp-sym{font-size:8.5px;font-weight:650;line-height:1.05}',
      '.pmp-name{display:none}',
      '.pmp-tile-mark{position:absolute;top:1px;right:1px;opacity:.8;display:inline-flex}',
      '.pmp-placeholder{aspect-ratio:1/.96;border:1px dashed var(--dsw-alias-border-secondary,rgba(127,127,127,.35));border-radius:3px;display:flex;align-items:center;justify-content:center;font-size:4.5px;color:var(--dsw-alias-label-secondary,#6b7280)}',
      '.pmp-fblock-label{display:flex;align-items:center;font-size:4.5px;color:var(--dsw-alias-label-secondary,#6b7280);padding-left:2px}',
      '.pmp-detail{margin-top:7px;border:1px solid var(--dsw-alias-border-secondary,rgba(127,127,127,.22));border-radius:8px;padding:6px 9px;display:flex;gap:7px;align-items:flex-start}',
      '.pmp-detail-tile{flex:0 0 26px;width:26px;height:26px;border-radius:4px;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;border:1px solid transparent}',
      '.pmp-detail-tile .pmp-num{font-size:4.5px}',
      '.pmp-detail-sym{font-size:9px;font-weight:650;line-height:1.05}',
      '.pmp-detail-sub{font-size:4.5px;color:var(--dsw-alias-label-secondary,#6b7280);max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.pmp-detail-body{flex:1;min-width:0}',
      '.pmp-detail-name{font-size:10px;font-weight:650;display:inline-flex;align-items:center;gap:4px;max-width:100%;min-width:0}',
      '.pmp-detail-name-text{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.pmp-detail-id{font-size:7.5px;color:var(--dsw-alias-label-secondary,#6b7280);margin-left:4px}',
      '.pmp-detail-desc{font-size:8.5px;line-height:1.45;margin-top:3px;color:var(--dsw-alias-label-primary,#111827)}',
      '.pmp-badges{display:flex;flex-wrap:wrap;gap:3px;margin-top:4px}',
      '.pmp-badge{border:1px solid var(--dsw-alias-border-secondary,rgba(127,127,127,.28));border-radius:4px;padding:1.5px 4px;font-size:6.5px;color:var(--dsw-alias-label-secondary,#6b7280);display:inline-flex;align-items:center;gap:3px}',
      '.pmp-actions{display:flex;align-items:center;gap:5px;margin-top:5px;flex-wrap:wrap}',
      '.pmp-primary{border:0;border-radius:5px;background:var(--dsw-alias-accent-primary,#2f6fd0);color:#fff;font:inherit;font-size:8px;font-weight:600;padding:3.5px 7px;cursor:pointer}',
      '.pmp-primary:disabled{opacity:.5;cursor:default}',
      '.pmp-secondary{border:1px solid var(--dsw-alias-border-secondary,rgba(127,127,127,.28));border-radius:5px;background:transparent;color:var(--dsw-alias-label-primary,#111827);font:inherit;font-size:8px;padding:3.5px 6px;cursor:pointer}',
      '.pmp-select{border:1px solid var(--dsw-alias-border-secondary,rgba(127,127,127,.28));border-radius:4px;background:transparent;color:inherit;font:inherit;font-size:8px;padding:2px 4px;max-width:130px}',
      '.pmp-error{color:var(--dsw-alias-status-danger,#c04141);font-size:8px;margin-top:4px}',
      '.pmp-hint{font-size:7.5px;color:var(--dsw-alias-label-secondary,#6b7280)}',
      '.pmp-trigger{display:inline-flex;align-items:center;gap:6px;border:0;border-radius:999px;background:transparent;box-shadow:none;color:var(--dsw-alias-label-primary,#111827);font:inherit;font-size:13px;font-weight:500;padding:6px 13px;cursor:pointer;max-width:220px;min-width:0;transition:background .15s ease,box-shadow .15s ease}',
      '.pmp-trigger:hover{background:var(--dsw-alias-bg-secondary,rgba(127,127,127,.08));color:var(--dsw-alias-label-primary,#111827)}',
      '.pmp-trigger:active,.pmp-trigger[data-open="true"]{background:transparent;color:var(--dsw-alias-label-primary,#111827);box-shadow:0 2px 10px rgba(15,23,42,.18)}',
      '.pmp-trigger:focus-visible{outline:2px solid var(--dsw-alias-accent-primary,#2f6fd0);outline-offset:2px}',
      '.pmp-trigger:disabled{opacity:.55;cursor:default;box-shadow:none}',
      '.pmp-trigger-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.pmp-mark svg{display:block}',
      '.pmp-mark-custom svg{width:100%;height:100%;display:block}',
      '@media (prefers-color-scheme:dark){.pmp-tile[data-cat="alkali"]{background:#3a2a2a}.pmp-tile[data-cat="alkaline"]{background:#3b3226}.pmp-tile[data-cat="transition"]{background:#252b3a}.pmp-tile[data-cat="post"]{background:#26352a}.pmp-tile[data-cat="metalloid"]{background:#362f24}.pmp-tile[data-cat="nonmetal"]{background:#2d2740}.pmp-tile[data-cat="halogen"]{background:#24362b}.pmp-tile[data-cat="noble"]{background:#223630}.pmp-tile[data-cat="lanthanide"]{background:#382731}.pmp-tile[data-cat="actinide"]{background:#342638}.pmp-tile[data-cat="unknown"]{background:#2a2d33}}',
      '@media (prefers-color-scheme:dark){.pmp-detail-tile[data-cat="alkali"]{background:#3a2a2a}.pmp-detail-tile[data-cat="alkaline"]{background:#3b3226}.pmp-detail-tile[data-cat="transition"]{background:#252b3a}.pmp-detail-tile[data-cat="post"]{background:#26352a}.pmp-detail-tile[data-cat="metalloid"]{background:#362f24}.pmp-detail-tile[data-cat="nonmetal"]{background:#2d2740}.pmp-detail-tile[data-cat="halogen"]{background:#24362b}.pmp-detail-tile[data-cat="noble"]{background:#223630}.pmp-detail-tile[data-cat="lanthanide"]{background:#382731}.pmp-detail-tile[data-cat="actinide"]{background:#342638}.pmp-detail-tile[data-cat="unknown"]{background:#2a2d33}}',
      '@media (prefers-reduced-motion:reduce){.pmp-tile{transition:none}}',

      // settings page
      '.pmp-cfg{display:flex;flex-direction:column;gap:14px;font-size:13px;color:var(--dsw-alias-label-primary,#111827);max-width:840px}',
      '.pmp-cfg h3{margin:0;font-size:15px;font-weight:600}',
      '.pmp-cfg p{margin:0;font-size:12.5px;line-height:1.6;color:var(--dsw-alias-label-secondary,#6b6660)}',
      '.pmp-cfg-group{display:flex;flex-direction:column;gap:8px;border:1px solid var(--dsw-alias-border-secondary,rgba(127,127,127,.24));border-radius:10px;padding:10px 12px}',
      '.pmp-cfg-head{font-size:12px;font-weight:600;color:var(--dsw-alias-label-secondary,#6b6660);letter-spacing:.03em;text-transform:uppercase}',
      '.pmp-cfg-row{display:flex;align-items:center;gap:8px;min-width:0}',
      '.pmp-cfg-label{flex:0 0 110px;font-size:12px;color:var(--dsw-alias-label-secondary,#6b6660)}',
      '.pmp-cfg-input{flex:1;min-width:0;height:28px;padding:0 8px;border:1px solid var(--dsw-alias-border-secondary,rgba(127,127,127,.28));border-radius:6px;background:transparent;color:inherit;font:inherit;font-size:12px;outline:0}',
      '.pmp-cfg-input:focus{border-color:var(--dsw-alias-accent-primary,#2f6fd0);box-shadow:0 0 0 2px rgba(47,111,208,.14)}',
      '.pmp-cfg-icon{flex:0 0 130px}',
      '.pmp-cfg-key{flex:0 0 170px;font-size:10.5px;color:var(--dsw-alias-label-secondary,#6b6660);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.pmp-cfg-mini{flex:none;height:24px;min-width:24px;padding:0 6px;border:1px solid var(--dsw-alias-border-secondary,rgba(127,127,127,.28));border-radius:5px;background:transparent;color:var(--dsw-alias-label-secondary,#6b6660);font:inherit;font-size:11px;cursor:pointer}',
      '.pmp-cfg-mini:hover{background:var(--dsw-alias-bg-secondary,rgba(127,127,127,.08));color:var(--dsw-alias-label-primary,#111827)}',
      '.pmp-cfg-models{display:flex;flex-direction:column;gap:4px}',
      '.pmp-cfg-modelhead{display:grid;grid-template-columns:18px minmax(110px,1.3fr) 90px 170px 30px 24px;gap:7px;align-items:center;padding-bottom:4px;font-size:10.5px;letter-spacing:.03em;text-transform:uppercase;color:var(--dsw-alias-label-secondary,#6b6660)}',
      '.pmp-cfg-model{display:grid;grid-template-columns:18px minmax(110px,1.3fr) 90px 170px 30px 24px;gap:7px;align-items:center;padding-top:4px;border-top:1px solid var(--dsw-alias-border-secondary,rgba(127,127,127,.14));min-width:0}',
      '.pmp-cfg-model:first-child{border-top:0;padding-top:0}',
      '.pmp-cfg-select{width:100%;height:28px;padding:0 6px;border:1px solid var(--dsw-alias-border-secondary,rgba(127,127,127,.28));border-radius:6px;background:transparent;color:inherit;font:inherit;font-size:12px;outline:0}',
      '.pmp-cfg-mark{flex:none;width:18px;height:18px;display:inline-flex;align-items:center;justify-content:center;color:var(--dsw-alias-label-secondary,#6b6660)}',
      '.pmp-cfg-swatches{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:6px}',
      '.pmp-cfg-swatch{display:flex;align-items:center;gap:6px;font-size:11.5px;color:var(--dsw-alias-label-secondary,#6b6660);min-width:0}',
      '.pmp-cfg-swatch span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.pmp-cfg-color{flex:none;width:30px;height:24px;padding:0;border:1px solid var(--dsw-alias-border-secondary,rgba(127,127,127,.28));border-radius:5px;background:none;cursor:pointer}',
      '.pmp-cfg-elements{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px 14px;max-height:52vh;overflow:auto;padding:6px;border:1px solid var(--dsw-alias-border-secondary,rgba(127,127,127,.22));border-radius:8px}',
      '.pmp-cfg-element{display:flex;align-items:center;gap:5px;min-width:0}',
      '.pmp-cfg-elementsym{flex:0 0 52px;font-size:11px;color:var(--dsw-alias-label-secondary,#6b6660);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.pmp-cfg-element select{flex:1;min-width:0;height:24px;padding:0 4px;border:1px solid var(--dsw-alias-border-secondary,rgba(127,127,127,.28));border-radius:5px;background:transparent;color:inherit;font:inherit;font-size:11px}',
      '.pmp-cfg-textarea{flex:1;min-height:44px;min-width:0;padding:6px 8px;border:1px solid var(--dsw-alias-border-secondary,rgba(127,127,127,.28));border-radius:6px;background:transparent;color:inherit;font:inherit;font-size:11px;line-height:1.45;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;resize:vertical}',
      '.pmp-cfg-mark-row{display:flex;align-items:flex-start;gap:7px}',
      '.pmp-cfg-mark-id{flex:0 0 90px}',
      '.pmp-cfg-actions{display:flex;gap:8px;flex-wrap:wrap}',
      '.pmp-cfg-button{height:28px;padding:0 12px;border:1px solid var(--dsw-alias-border-secondary,rgba(127,127,127,.28));border-radius:6px;background:transparent;color:var(--dsw-alias-label-primary,#111827);font:inherit;font-size:12px;cursor:pointer}',
      '.pmp-cfg-button:hover{background:var(--dsw-alias-bg-secondary,rgba(127,127,127,.08))}',
      '.pmp-cfg-error{color:var(--dsw-alias-status-danger,#c04141);font-size:11.5px}',
      '.pmp-cfg-note{font-size:11.5px;color:var(--dsw-alias-label-secondary,#6b6660)}',
    ].join('');

    function StyleTag() {
      return h('style', { key: 'pmp-style' }, CSS);
    }

    // ------------------------------------------------------------------ icons --

    function Chevron(props) {
      const size = props && props.size ? props.size : 10;
      return h('svg', { width: size, height: size, viewBox: '0 0 10 10', fill: 'none', 'aria-hidden': true },
        h('path', { d: 'M2 3.5L5 6.5L8 3.5', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round', strokeLinejoin: 'round' }));
    }

    function SearchIcon() {
      return h('svg', { width: 15, height: 15, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': true },
        h('circle', { cx: 7, cy: 7, r: 4.6, stroke: 'currentColor', strokeWidth: 1.4 }),
        h('path', { d: 'M10.5 10.5L14 14', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round' }));
    }

    // ----------------------------------------------------------------- catalog --

    function useCatalog(remote) {
      const [catalog, setCatalog] = useState(null);
      const [error, setError] = useState('');
      useEffect(() => {
        let alive = true;
        if (!remote || !remote.session || typeof remote.session.modelCatalog !== 'function') {
          setError('The model catalogue is unavailable in this window.');
          return () => { alive = false; };
        }
        remote.session.modelCatalog().then(
          (result) => {
            if (!alive) return;
            if (result && result.ok) setCatalog(result.value);
            else if (result && result.ok === false) {
              setError((result.error && result.error.message) || 'The model catalogue is unavailable.');
            } else {
              setCatalog(result || null);
            }
          },
          (failure) => { if (alive) setError(failure && failure.message ? failure.message : String(failure)); },
        );
        return () => { alive = false; };
      }, [remote]);
      return { catalog, error };
    }

    // ---------------------------------------------------------------- trigger --

    function ModelSeat(props) {
      const remote = props.remote;
      const config = useConfig();
      const { catalog } = useCatalog(remote);
      const [open, setOpen] = useState(false);
      const [error, setError] = useState('');

      const projection = typeof props.useProjection === 'function' ? props.useProjection('modelSelection') : undefined;
      const selection = (projection && (projection.next || projection.lastUsed)) || (catalog && catalog.default) || null;

      const models = useMemo(() => flattenCatalog(catalog), [catalog]);
      const current = selection
        ? models.find((model) => model.provider === selection.provider && model.id === selection.model)
        : null;
      const label = current ? nameFor(config, current) : (selection ? selection.model : 'Select model');
      const icon = current ? iconFor(config, current) : '';

      return h(React.Fragment, null,
        h(StyleTag),
        h('button', {
          type: 'button',
          className: 'pmp-trigger',
          disabled: props.locked === true,
          'data-open': open ? 'true' : undefined,
          'aria-label': 'Model selection: ' + label,
          title: current ? current.providerName + ' · ' + current.id : 'Model selection',
          onClick: () => { setError(''); setOpen(true); },
        },
          icon ? h(BrandMark, { id: icon, marks: config.marks, size: 15 }) : null,
          h('span', { className: 'pmp-trigger-name' }, label),
          h(Chevron, { size: 12 })),
        open ? h(PickerModal, {
          remote,
          sessionId: props.sessionId,
          locked: props.locked,
          catalog,
          models,
          selection,
          initialError: error,
          onClose: () => setOpen(false),
          onSelected: () => setOpen(false),
          onError: (message) => setError(message),
        }) : null);
    }

    // ------------------------------------------------------------------ modal --

    function PickerModal(props) {
      const { remote, sessionId, catalog, models, selection, locked } = props;
      const config = useConfig();
      const [query, setQuery] = useState('');
      const [filter, setFilter] = useState('all');
      const currentKey = selection ? selection.provider + '/' + selection.model : '';
      const firstMapped = useMemo(() => {
        for (let n = 1; n <= 118; n += 1) if (modelForElement(config, models, n)) return n;
        return 1;
      }, [config, models]);
      const [selected, setSelected] = useState(() => {
        for (let n = 1; n <= 118; n += 1) {
          const model = modelForElement(config, models, n);
          if (model && model.key === currentKey) return n;
        }
        return 1;
      });
      const selectedModel = modelForElement(config, models, selected);
      const [effort, setEffort] = useState('');
      const [ai, setAi] = useState({});
      const [busy, setBusy] = useState(false);
      const [error, setError] = useState(props.initialError || '');

      const selectedDescription = descriptionFor(selectedModel, config, ai);

      useEffect(() => {
        const onKey = (event) => { if (event.key === 'Escape') props.onClose(); };
        document.addEventListener('keydown', onKey);
        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
          document.removeEventListener('keydown', onKey);
          document.body.style.overflow = previous;
        };
      }, [props.onClose]);

      useEffect(() => {
        let alive = true;
        fetch('/model-picker/descriptions', { credentials: 'same-origin' })
          .then((response) => (response.ok ? response.json() : null))
          .then((value) => { if (alive && value && value.descriptions) setAi(value.descriptions); })
          .catch(() => {});
        return () => { alive = false; };
      }, []);

      // Keep the preview on an element that still has a model.
      useEffect(() => {
        if (modelForElement(config, models, selected)) return;
        setSelected(firstMapped);
      }, [config, models, selected, firstMapped]);

      useEffect(() => {
        const model = modelForElement(config, models, selected);
        setEffort((model && model.reasoning && model.reasoning.defaultEffort) || '');
      }, [selected, models, config]);

      const featured = useMemo(() => {
        const set = new Set();
        for (const group of (catalog && catalog.groups) || []) {
          if (group.models && group.models[0]) set.add(group.id + '/' + group.models[0].id);
        }
        return set;
      }, [catalog]);

      const providers = useMemo(() => {
        const seen = new Map();
        for (const model of models) if (!seen.has(model.provider)) seen.set(model.provider, model.providerName);
        return Array.from(seen.entries());
      }, [models]);

      const matches = (model) => {
        if (!model) return false;
        if (filter === 'featured' && !featured.has(model.key)) return false;
        if (filter === 'reasoning' && !(model.reasoning && model.reasoning.efforts && model.reasoning.efforts.length)) return false;
        if (filter.indexOf('provider:') === 0 && model.provider !== filter.slice(9)) return false;
        const needle = query.trim().toLowerCase();
        if (!needle) return true;
        return [nameFor(config, model), model.name, model.id, model.providerName, model.description]
          .some((value) => typeof value === 'string' && value.toLowerCase().includes(needle));
      };

      const choose = (number) => {
        setSelected(number);
        setError('');
      };

      const useModel = () => {
        const model = selectedModel;
        if (!model || !remote || !remote.session || locked) return;
        setBusy(true);
        setError('');
        const request = {
          sessionId,
          provider: model.provider,
          model: model.id,
          ...(effort ? { reasoningEffort: effort } : {}),
        };
        remote.session.selectModel(request).then((result) => {
          setBusy(false);
          if (result && result.ok === false) {
            setError((result.error && result.error.message) || 'Model selection failed.');
            return;
          }
          props.onSelected();
        }, (failure) => {
          setBusy(false);
          setError(failure && failure.message ? failure.message : String(failure));
        });
      };

      const heading = config.heading || DEFAULT_CONFIG.heading;
      const selectedElement = ELEMENTS[selected - 1];
      const selectedColor = selectedModel ? modelColor(config, models, selectedModel) : '';
      const detailStyle = selectedColor ? { background: selectedColor, color: inkFor(selectedColor) } : undefined;

      const nameLine = selectedModel
        ? h('div', null,
            h('span', { className: 'pmp-detail-name' },
              iconFor(config, selectedModel)
                ? h(BrandMark, { id: iconFor(config, selectedModel), marks: config.marks, size: 13 })
                : null,
              h('span', { className: 'pmp-detail-name-text' }, nameFor(config, selectedModel))),
            h('span', { className: 'pmp-detail-id' }, selectedModel.id),
            currentKey === selectedModel.key
              ? h('span', { className: 'pmp-badge', style: { marginLeft: 6 } }, 'current')
              : null)
        : null;

      const effortSelect = selectedModel
        && selectedModel.reasoning
        && selectedModel.reasoning.efforts
        && selectedModel.reasoning.efforts.length > 0
        ? h('label', { style: { display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 8, color: 'var(--dsw-alias-label-secondary, #6b7280)' } },
            'Effort',
            h('select', {
              className: 'pmp-select',
              value: effort,
              onChange: (event) => setEffort(event.target.value),
            }, selectedModel.reasoning.efforts.map((option) => h('option', { key: option.id, value: option.id }, option.name))))
        : null;

      let detailBody;
      if (selectedModel) {
        detailBody = h(React.Fragment, null,
          nameLine,
          h('div', { className: 'pmp-detail-desc' },
            selectedDescription || 'No description yet. The host generates one from the catalog when it can.'),
          h('div', { className: 'pmp-badges' }, metaBadges(config, selectedModel.key)),
          h('div', { className: 'pmp-actions' },
            effortSelect,
            h('button', {
              type: 'button',
              className: 'pmp-primary',
              disabled: busy || locked || currentKey === selectedModel.key,
              onClick: useModel,
            }, busy ? 'Selecting…' : (currentKey === selectedModel.key ? 'Current model' : 'Use this model'))));
      } else {
        detailBody = h('div', { className: 'pmp-detail-desc' },
          models.length === 0
            ? 'No models are available in this session. Sign in or add an API key, then reopen the picker.'
            : 'No model is assigned to this element. Add one in Settings → Model table.');
      }
      if (error) detailBody = h(React.Fragment, null, detailBody, h('div', { className: 'pmp-error' }, error));

      const detail = h('div', { className: 'pmp-detail' },
        h('div', {
          className: 'pmp-detail-tile',
          'data-cat': selectedModel && selectedElement ? selectedElement.cat : 'unknown',
          'data-empty': selectedModel ? undefined : 'true',
          style: detailStyle,
        },
          h('span', { className: 'pmp-num' }, selected),
          h('span', { className: 'pmp-detail-sym' }, SYMBOLS[selected] || '?'),
          h('span', { className: 'pmp-detail-sub' }, NAMES[selected] || '')),
        h('div', { className: 'pmp-detail-body' }, detailBody));

      return ReactDOM.createPortal(
        h('div', {
          className: 'pmp-overlay',
          onMouseDown: (event) => { if (event.target === event.currentTarget) props.onClose(); },
        },
          h(StyleTag),
          h('div', {
            className: 'pmp-card',
            role: 'dialog',
            'aria-modal': 'true',
            'aria-label': 'Model selection',
          },
            h('div', { className: 'pmp-head' },
              h('div', { className: 'pmp-title' }, 'Model selection'),
              h('button', {
                type: 'button',
                className: 'pmp-icon-btn',
                'aria-label': 'Close model selection',
                onClick: props.onClose,
              }, '×')),

            h('label', { className: 'pmp-search' },
              h(SearchIcon),
              h('input', {
                type: 'search',
                value: query,
                placeholder: 'Search for a model or agent',
                autoFocus: true,
                onChange: (event) => setQuery(event.target.value),
              })),
            h('div', { className: 'pmp-chips' },
              chip('All', filter === 'all', () => setFilter('all')),
              chip('Featured', filter === 'featured', () => setFilter('featured')),
              chip('Reasoning', filter === 'reasoning', () => setFilter('reasoning')),
              providers.map(([id, name]) => chip(name, filter === 'provider:' + id, () => setFilter('provider:' + id)))),
            h('div', { className: 'pmp-table-wrap' },
              h('div', { className: 'pmp-grid' },
                h('div', { className: 'pmp-title-block' },
                  h('div', { className: 'pmp-kicker' }, 'THE PERIODIC TABLE OF'),
                  h('div', { className: 'pmp-big-title' }, heading)),
                h('div', { className: 'pmp-placeholder', style: { gridColumn: 3, gridRow: 6 } }, '57–71'),
                h('div', { className: 'pmp-placeholder', style: { gridColumn: 3, gridRow: 7 } }, '89–103'),
                h('div', { className: 'pmp-fblock-label', style: { gridColumn: '1 / 3', gridRow: 9 } }, 'Lanthanides'),
                h('div', { className: 'pmp-fblock-label', style: { gridColumn: '1 / 3', gridRow: 10 } }, 'Actinides'),
                ELEMENTS.map((element) => {
                  const model = modelForElement(config, models, element.n);
                  const empty = !model;
                  const color = empty ? '' : modelColor(config, models, model);
                  const icon = model ? iconFor(config, model) : '';
                  const dim = !empty && filter !== 'all' && !matches(model);
                  return h('button', {
                    key: element.n,
                    type: 'button',
                    className: 'pmp-tile',
                    'data-cat': element.cat,
                    'data-empty': empty ? 'true' : undefined,
                    'data-dim': dim ? 'true' : undefined,
                    'data-selected': element.n === selected ? 'true' : undefined,
                    disabled: empty,
                    style: Object.assign(
                      { gridColumn: element.col, gridRow: element.row },
                      color ? { background: color, color: inkFor(color) } : null,
                    ),
                    title: model ? element.name + ' — ' + nameFor(config, model) : element.name + ' — no model',
                    'aria-label': element.name + ' (' + element.sym + (model ? ', ' + nameFor(config, model) : ', no model') + ')',
                    onClick: () => choose(element.n),
                  },
                    h('span', { className: 'pmp-num' }, element.n),
                    h('span', { className: 'pmp-sym' }, element.sym),
                    h('span', { className: 'pmp-name' }, element.name),
                    icon ? h('span', { className: 'pmp-tile-mark' },
                      h(BrandMark, { id: icon, marks: config.marks, size: 6 })) : null);
                }))),

            detail)),
        document.body);
    }

    function chip(label, on, onClick) {
      return h('button', {
        key: label,
        type: 'button',
        className: 'pmp-chip',
        'data-on': on ? 'true' : undefined,
        'aria-pressed': on,
        onClick,
      }, label);
    }

    function metaBadges(config, key) {
      const meta = (config.meta && config.meta[key]) || {};
      const badges = [];
      if (meta.context) badges.push(h('span', { key: 'context', className: 'pmp-badge' }, '◷ ' + meta.context));
      if (meta.price) badges.push(h('span', { key: 'price', className: 'pmp-badge' }, '$ ' + meta.price));
      if (meta.released) badges.push(h('span', { key: 'released', className: 'pmp-badge' }, '◫ ' + meta.released));
      return badges;
    }

    // --------------------------------------------------------------- settings --

    function SettingsPanel(props) {
      const remote = props.remote;
      const config = useConfig();
      const { catalog, error: catalogError } = useCatalog(remote);
      const models = useMemo(() => flattenCatalog(props.catalog || catalog), [props.catalog, catalog]);
      const [metaText, setMetaText] = useState(() => JSON.stringify(config.meta || {}, null, 2));
      const [metaError, setMetaError] = useState('');

      const groups = useMemo(() => {
        const map = new Map();
        for (const model of models) {
          const label = model.providerName || model.provider;
          if (!map.has(label)) map.set(label, []);
          map.get(label).push(model);
        }
        return Array.from(map.entries());
      }, [models]);

      const update = (patch) => { writeConfig(Object.assign({}, config, patch)); };

      const setHeading = (value) => update({ heading: value });
      const setModelElement = (model, n) => {
        update({ mapping: assignElementTo(config, models, model, n) });
      };
      const setModelColor = (model, value) => {
        const modelsColor = Object.assign({}, config.colors.models);
        if (value) modelsColor[model.key] = value;
        else delete modelsColor[model.key];
        update({ colors: Object.assign({}, config.colors, { models: modelsColor }) });
      };
      const setModelName = (key, value) => {
        const names = Object.assign({}, config.names);
        if (value.trim()) names[key] = value;
        else delete names[key];
        update({ names });
      };
      const setModelIcon = (key, value) => {
        const icons = Object.assign({}, config.icons);
        if (value.trim()) icons[key] = value.trim();
        else delete icons[key];
        update({ icons });
      };
      const resetModel = (model) => {
        const names = Object.assign({}, config.names);
        const icons = Object.assign({}, config.icons);
        const modelsColor = Object.assign({}, config.colors.models);
        delete names[model.key];
        delete icons[model.key];
        delete modelsColor[model.key];
        update({ names, icons, colors: Object.assign({}, config.colors, { models: modelsColor }) });
      };
      const setMark = (id, content) => {
        const marks = Object.assign({}, config.marks);
        if (content) marks[id] = content;
        else delete marks[id];
        update({ marks });
      };
      const addMark = () => {
        let index = 1;
        while (config.marks['brand' + index] !== undefined) index += 1;
        setMark('brand' + index, 'text:✦');
      };
      const applyMeta = () => {
        try {
          const meta = metaText.trim() ? JSON.parse(metaText) : {};
          if (!meta || typeof meta !== 'object' || Array.isArray(meta)) throw new Error('Meta must be a JSON object.');
          setMetaError('');
          update({ meta });
        } catch (failure) {
          setMetaError('Meta JSON: ' + (failure && failure.message ? failure.message : String(failure)));
        }
      };
      const resetAll = () => {
        writeConfig({
          heading: DEFAULT_CONFIG.heading,
          mapping: {},
          colors: { category: {}, element: {}, models: {} },
          names: {},
          icons: {},
          marks: {},
          meta: {},
        });
        setMetaText('{}');
        setMetaError('');
      };

      return h('div', { className: 'pmp-cfg' },
        h(StyleTag),
        h('div', null,
          h('h3', null, 'Periodic model picker'),
          h('p', null, 'The composer model button opens a periodic table. One row per model sets its display name, icon, element and color. Elements without an assigned model stay gray.')),

        h('div', { className: 'pmp-cfg-group' },
          h('div', { className: 'pmp-cfg-head' }, 'Table'),
          h('div', { className: 'pmp-cfg-row' },
            h('span', { className: 'pmp-cfg-label' }, 'Big heading'),
            h('input', {
              className: 'pmp-cfg-input',
              value: config.heading,
              placeholder: DEFAULT_CONFIG.heading,
              onChange: (event) => setHeading(event.target.value),
            })),
          h('p', { className: 'pmp-cfg-note' }, 'Shown over the table: “THE PERIODIC TABLE OF …”.')),

        h('div', { className: 'pmp-cfg-group' },
          h('div', { className: 'pmp-cfg-head' }, 'Models'),
          catalogError ? h('p', { className: 'pmp-cfg-error' }, catalogError) : null,
          models.length === 0 && !catalogError
            ? h('p', { className: 'pmp-cfg-note' }, 'Loading the model catalogue…')
            : h(React.Fragment, null,
                h('div', { className: 'pmp-cfg-modelhead' },
                  h('span', null, ''),
                  h('span', null, 'Model'),
                  h('span', null, 'Icon'),
                  h('span', null, 'Element'),
                  h('span', null, 'Color'),
                  h('span', null, '')),
                groups.map(([label, rows]) => h('div', { key: label, className: 'pmp-cfg-group', style: { border: 0, padding: 0 } },
                  h('div', { className: 'pmp-cfg-head', style: { fontSize: 11 } }, label),
                  h('div', { className: 'pmp-cfg-models' },
                    rows.map((model) => {
                      const icon = config.icons[model.key] || inferBrand(model);
                      const elementNumber = elementForModel(config, models, model);
                      return h('div', { key: model.key, className: 'pmp-cfg-model', title: model.key },
                        h('span', { className: 'pmp-cfg-mark' }, h(BrandMark, { id: icon, marks: config.marks, size: 16 })),
                        h('input', {
                          className: 'pmp-cfg-input',
                          value: config.names[model.key] || '',
                          placeholder: model.name,
                          'aria-label': 'Display name for ' + model.name,
                          onChange: (event) => setModelName(model.key, event.target.value),
                        }),
                        h('input', {
                          className: 'pmp-cfg-input',
                          value: config.icons[model.key] || '',
                          placeholder: inferBrand(model) || 'auto',
                          list: 'pmp-brand-list',
                          'aria-label': 'Icon id for ' + model.name,
                          onChange: (event) => setModelIcon(model.key, event.target.value),
                        }),
                        h('select', {
                          className: 'pmp-cfg-select',
                          value: elementNumber ? String(elementNumber) : '0',
                          'aria-label': 'Element for ' + model.name,
                          onChange: (event) => setModelElement(model, Number(event.target.value)),
                        },
                          h('option', { value: '0' }, 'No element'),
                          ELEMENTS.map((element) => h('option', { key: element.n, value: String(element.n) }, element.n + ' ' + element.sym + ' · ' + element.name))),
                        h('input', {
                          type: 'color',
                          className: 'pmp-cfg-color',
                          value: effectiveModelColor(config, models, model),
                          title: 'Color for ' + nameFor(config, model),
                          'aria-label': 'Color for ' + model.name,
                          onChange: (event) => setModelColor(model, event.target.value),
                        }),
                        h('button', {
                          type: 'button',
                          className: 'pmp-cfg-mini',
                          title: 'Reset name, icon and color',
                          onClick: () => resetModel(model),
                        }, '↺'));
                    }))))),
          h('datalist', { id: 'pmp-brand-list' },
            brandChoices(config.marks).map((id) => h('option', { key: id, value: id }))),
          h('p', { className: 'pmp-cfg-note' }, 'Leave the icon empty to use the brand inferred from the model id. Built-in ids: ' + Object.keys(BRANDS).join(', ') + '.')),

        h('div', { className: 'pmp-cfg-group' },
          h('div', { className: 'pmp-cfg-head' }, 'Custom icons'),
          h('p', { className: 'pmp-cfg-note' }, 'Paste an SVG (with a viewBox) or use text:✨ for a glyph. Then use the id as a model icon.'),
          Object.keys(config.marks).map((id) => h('div', { key: id, className: 'pmp-cfg-mark-row' },
            h('span', { className: 'pmp-cfg-mark' }, h(BrandMark, { id, marks: config.marks, size: 18 })),
            h('input', { className: 'pmp-cfg-input pmp-cfg-mark-id', value: id, readOnly: true, 'aria-label': 'Custom icon id' }),
            h('textarea', {
              className: 'pmp-cfg-textarea',
              value: config.marks[id],
              spellCheck: false,
              'aria-label': 'Custom icon content',
              onChange: (event) => setMark(id, event.target.value),
            }),
            h('button', {
              type: 'button',
              className: 'pmp-cfg-mini',
              title: 'Remove icon',
              onClick: () => setMark(id, ''),
            }, '✕'))),
          h('div', null,
            h('button', { type: 'button', className: 'pmp-cfg-button', onClick: addMark }, 'Add custom icon'))),

        h('div', { className: 'pmp-cfg-group' },
          h('div', { className: 'pmp-cfg-head' }, 'Badges'),
          h('p', { className: 'pmp-cfg-note' }, 'Optional. Keys are provider/model; fields: context, price, released, description.'),
          h('textarea', {
            className: 'pmp-cfg-textarea',
            style: { minHeight: 110 },
            value: metaText,
            spellCheck: false,
            onChange: (event) => setMetaText(event.target.value),
          }),
          metaError ? h('p', { className: 'pmp-cfg-error' }, metaError) : null,
          h('div', null,
            h('button', { type: 'button', className: 'pmp-cfg-button', onClick: applyMeta }, 'Apply badges'))),

        h('div', { className: 'pmp-cfg-actions' },
          h('button', { type: 'button', className: 'pmp-cfg-button', onClick: resetAll }, 'Reset all settings')));
    }

    // expose pure helpers for a local test and for debugging
    window.__PeriodicModelPicker = {
      ELEMENTS,
      position,
      category,
      modelForElement,
      flattenCatalog,
      nameFor,
      iconFor,
      inferBrand,
      elementForModel,
      assignElementTo,
      modelColor,
      effectiveModelColor,
      customColor,
      effectiveColor,
      brandChoices,
      readConfig: () => readConfig(),
      CATEGORY_COLORS,
      DEFAULT_CONFIG,
      components: { ModelSeat, PickerModal, SettingsPanel },
    };

    return {
      inject: ['slots'],
      apply(ctx) {
        // The model RPCs live on the scoped remote.session service, so resolve
        // them inside its own inject scope rather than reaching through the
        // root remote from apply().
        ctx.inject(['remote', 'remote.session'], (scope) => {
          const remote = scope.remote;
          ctx.slots.inject('conversation.input.model', () => ctx.slots.register({
            name: 'conversation.input.model',
            // A single slot keeps the lowest priority; the shipped selector
            // registered at 0, so -1 shadows it.
            priority: -1,
          }, (props) => h(ModelSeat, Object.assign({ remote }, props))));

          ctx.slots.inject('settings.section', () => ctx.slots.register({
            name: 'settings.section',
            id: 'periodic-model-picker',
            order: 324,
            label: () => 'Model table',
          }, (props) => h(SettingsPanel, Object.assign({ remote }, props))));
        });
      },
    };
  },
});
