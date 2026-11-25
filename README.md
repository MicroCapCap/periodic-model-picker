# Periodic Model Picker

Replaces the composer's model seat with a periodic table and adds a **Model
table** page to DSH settings. Like the table it imitates, only elements that
have a model are active; the rest stay gray.

- **Elements without a model are gray and inert.**
- Each model is assigned to one element and has its own color; the model's row
  in settings controls all four properties (name, icon, element, color).
- Every model can have a custom display name and a brand icon (Claude, ChatGPT,
  Gemini, DeepSeek, Qwen, Mistral, Grok, a neutral circle, a glyph, or your own
  SVG). These come from `@local/claude-model-look`, which this plugin replaces.
- The big heading (`Model 4` by default) is editable.
- Descriptions come from the catalog when it has one; otherwise the host half
  generates a one-sentence description with the configured LLM and caches it
  under `$DSH_HOME/model-picker/descriptions.json`.
- Clicking a tile previews its model. **Use this model** switches the session;
  clicking a tile or opening the picker never sends a message.

## Settings → Model table

Everything is edited here; the picker itself has no configuration UI.

1. **Table** — the big heading shown over the table.
2. **Models** — one row per catalog model with four columns:
   **Model** (display name), **Icon** (brand id, or empty to infer it),
   **Element** (which element it occupies), **Color**. Setting an element
   already taken by another model moves it away. “No element” leaves the model
   off the table. Elements that no model occupies stay gray.
3. **Custom icons** — paste an SVG (a `viewBox` helps) or `text:✨` for a glyph,
   then use that id in a model row.
4. **Badges** — optional JSON keyed by `provider/model`; fields `context`,
   `price`, `released`, `description`.
5. **Reset all settings** clears everything.

The first time a catalogue is seen, model *i* is assigned element *i* (H, He,
Li, …); the rest of the table is gray. Move a model with its **Element** cell
to rearrange the table.

## Picker

- Search filters by display name, catalogue name, id, provider, or description.
- Chips: **All**, **Featured** (first model per provider), **Reasoning** (models
  with effort levels), and one chip per provider.
- The detail card shows the element, the model icon and name, the id, the
  description, the configured badges, the reasoning effort selector when the
  model advertises efforts, and the selection button.
- The modal is deliberately compact (roughly half the linear size of the first
  version).
- `Esc`, the close button, or a click on the backdrop closes the picker.

## Configuration

Stored in `localStorage` under `dsh.periodic-model-picker.v1`:

```json
{
  "heading": "Model 4",
  "mapping": { "3": "provider/model-id", "4": "__none__" },
  "colors": { "models": { "provider/model-id": "#ffd400" } },
  "names": { "provider/model-id": "My Model" },
  "icons": { "provider/model-id": "claude" },
  "marks": { "brand1": "text:✦" },
  "meta": {
    "provider/model-id": {
      "context": "1M input · 64K output",
      "price": "Input $1.50 / Output $7.50",
      "released": "Released Nov 12, 2026",
      "description": "Optional manual description override."
    }
  }
}
```

- `mapping` values are `provider/model`, or `__none__` for an empty element.
  The settings Element column writes this map for you.
- `colors.models` is keyed by `provider/model`; unset colors fall back to the
  palette of the element the model occupies. Colors saved by the older
  per-element editor (`colors.element`, `colors.category`) still apply to
  whichever model sits on that element.
- `names` and `icons` are keyed by `provider/model`; empty falls back to the
  catalogue name and the inferred brand.
- `marks` holds custom icon sources: raw SVG or `text:<glyph>`.
- On first load, display names and icons stored by `@local/claude-model-look`
  (`dsh.claude-model-look.v1`) are imported once.

## Host half

`index.js` registers an exact HTTP route:

```
GET /model-picker/descriptions
→ { "descriptions": { "provider/model": "One sentence." } }
```

- The catalog's own description wins and is never regenerated.
- Missing descriptions are generated once per model with `ctx.llm.stream()`, one
  sentence, no marketing adjectives, and cached by provider/model plus model name.
- Generation is capped at eight models per request, each call has a 20-second
  timeout, and a failure is ignored rather than shown as an error.
- The route returns display text only; it reads no sessions and no credentials.
- Every request passes the host's own trust fence first
  (`connection.requestRejection`, the same Host/Origin + login-token gate the
  shipped routes use); a composition without that service refuses the route, so
  a web page cannot use it to trigger model calls.

## Install

1. Add this directory to the active profile through the plugin manager (or the
   profile's `dsh.profile.bundles`).
2. Do not also install `@local/claude-model-look` — its names and icons are part
   of this plugin now.
3. Restart the Host (the route, the seat replacement and the settings page are
   read at boot).
4. The composer model button is replaced by the periodic-table trigger; the
   settings page appears as **Model table**.

## Development

Node 20.11 or newer.

```sh
node --check index.js
node --check client.js
node tests/host.mjs    # route shape, generation, cache, catalog precedence
node tests/smoke.mjs   # module protocol, model seat, settings page
node tests/data.mjs    # elements, grid, mapping, names, icons, colors
node tests/render.mjs  # seat, modal and settings render without crashing
```

## License

MIT. See [LICENSE](LICENSE).
