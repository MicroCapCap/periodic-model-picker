/**
 * Host half of the periodic model picker.
 *
 * Generates one-sentence descriptions for catalog models with the configured
 * LLM and serves them at `/model-picker/descriptions` for the picker. The
 * catalog's own description wins; generation fills only the gaps. Results are
 * cached under `$DSH_HOME/model-picker/descriptions.json`, keyed by
 * provider/model and invalidated when a model's name changes.
 *
 * Nothing here reads sessions or stores credentials; the route returns display
 * text only.
 */
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export const name = 'periodic-model-picker'
export const inject = ['webServer', 'llm']

const HOME = process.env.DSH_HOME || path.join(os.homedir(), '.dsh')
const CACHE_PATH = path.join(HOME, 'model-picker', 'descriptions.json')
const MAX_GENERATIONS = 8
const MAX_TEXT = 240

const keyOf = (provider, model) => provider + '/' + model

async function readCache() {
  try {
    const parsed = JSON.parse(await fs.readFile(CACHE_PATH, 'utf8'))
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

async function writeCache(cache) {
  try {
    await fs.mkdir(path.dirname(CACHE_PATH), { recursive: true })
    await fs.writeFile(CACHE_PATH, JSON.stringify(cache, null, 2), 'utf8')
  } catch {
    // A read-only home still serves this process's in-memory cache.
  }
}

async function listModels(ctx) {
  const providers = ctx.llm.listProviders()
  const entries = []
  for (const provider of providers) {
    try {
      const models = await ctx.llm.listModels(provider.id)
      for (const model of models) {
        entries.push({
          provider: provider.id,
          providerName: provider.name,
          model: model.id,
          name: model.name,
          description: typeof model.description === 'string' ? model.description.trim() : '',
        })
      }
    } catch {
      // One broken provider does not hide the others.
    }
  }
  return entries
}

function clean(text) {
  let value = String(text || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/^["'“”‘’\s]+|["'“”‘’\s]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (value.length > MAX_TEXT) value = value.slice(0, MAX_TEXT - 1).replace(/\s+\S*$/, '') + '…'
  if (value && !/[.!?。！？]$/.test(value)) value += '.'
  return value
}

async function generateOne(ctx, entry, target) {
  const prompt = [
    'You write concise model descriptions for a model picker.',
    `In one sentence of at most 28 words, say what the model "${entry.name}" (id: ${entry.model}) is best at.`,
    'Do not use marketing adjectives such as powerful, cutting-edge, or state-of-the-art.',
    'Do not repeat the model name. Return only the sentence.',
  ].join(' ')
  let text = ''
  const options = {
    provider: target.provider,
    model: target.model,
    maxTokens: 600,
    messages: [{ role: 'user', content: [{ type: 'text', text: prompt }] }],
    signal: AbortSignal.timeout(20000),
  }
  for await (const chunk of ctx.llm.stream(options)) {
    if (chunk && chunk.type === 'text-delta' && typeof chunk.text === 'string') text += chunk.text
  }
  return clean(text)
}

let warming = null

function warn(ctx, message) {
  if (ctx.logger && typeof ctx.logger.warn === 'function') ctx.logger.warn(message)
  else if (typeof console !== 'undefined') console.warn(message)
}

async function warm(ctx, provided) {
  if (warming !== null) return warming
  warming = (async () => {
    const cache = await readCache()
    // The route passes the list it just served so a provider whose listing
    // resolves late is not skipped by an earlier, partial snapshot.
    const entries = provided || await listModels(ctx)
    const missing = entries
      .filter((entry) => !entry.description && !(cache[keyOf(entry.provider, entry.model)] || {}).text)
      .slice(0, MAX_GENERATIONS)
    for (const entry of missing) {
      const sameProvider = entries.filter((candidate) => candidate.provider === entry.provider)
      // Prefer a sibling so a model is not asked to describe itself; fall back
      // to itself only when it is the provider's only route.
      const target = sameProvider.find((candidate) => candidate.model !== entry.model)
        || sameProvider[0]
        || entries[0]
      if (!target) break
      try {
        let text = await generateOne(ctx, entry, target)
        if (!text) text = await generateOne(ctx, entry, { provider: entry.provider, model: entry.model })
        if (text) {
          cache[keyOf(entry.provider, entry.model)] = {
            name: entry.name,
            text,
            at: Date.now(),
          }
        } else {
          warn(ctx, `periodic-model-picker: empty description for ${entry.provider}/${entry.model}`)
        }
      } catch (error) {
        warn(ctx, `periodic-model-picker: description failed for ${entry.provider}/${entry.model}: ${error && error.message ? error.message : String(error)}`)
      }
    }
    if (missing.length > 0) await writeCache(cache)
    return cache
  })().finally(() => { warming = null })
  return warming
}

function json(body) {
  return new Response(JSON.stringify(body), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}

export function apply(ctx) {
  const dispose = ctx.webServer.register({
    kind: 'exact',
    path: '/model-picker/descriptions',
    resource: async (request) => {
      try {
        const entries = await listModels(ctx)
        const cache = await warm(ctx, entries)
        const descriptions = {}
        for (const entry of entries) {
          const cached = cache[keyOf(entry.provider, entry.model)]
          descriptions[keyOf(entry.provider, entry.model)] =
            (cached && cached.name === entry.name ? cached.text : '') || entry.description || ''
        }
        const debug = new URL(request.url).searchParams.get('debug') === '1'
        return json(debug ? { descriptions, models: entries } : { descriptions })
      } catch (error) {
        warn(ctx, `periodic-model-picker: descriptions failed: ${error && error.message}`)
        return json({ descriptions: {} })
      }
    },
  })
  ctx.effect(() => dispose, 'periodic-model-picker: descriptions route')
}
