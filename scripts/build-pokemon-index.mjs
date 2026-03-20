import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const projectRoot = process.cwd()
const sourceDir = path.resolve(projectRoot, 'pokedata')
const outputFile = path.resolve(projectRoot, 'src', 'data', 'pokemonIndex.json')
const MAX_ID = 649

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const toNumberOrNull = (value) => {
  if (value === null || value === undefined) return null
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

async function fetchJson(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`)
  return res.json()
}

function pickLocalizedName(speciesJson, lang = 'de') {
  const entry = speciesJson.names?.find((item) => item.language?.name === lang)
  return entry?.name ?? null
}

async function loadRawEntries() {
  const files = await readdir(sourceDir, { withFileTypes: true })
  const entries = []
  let skipped = 0

  for (const item of files) {
    if (!item.isFile() || !item.name.toLowerCase().endsWith('.json')) continue

    const filePath = path.join(sourceDir, item.name)

    try {
      const raw = await readFile(filePath, 'utf8')
      const parsed = JSON.parse(raw)

      const id = Number(parsed?.id)
      const slug = typeof parsed?.name === 'string' ? parsed.name.trim() : ''
      const evolutionChainId = toNumberOrNull(parsed?.evolution_chain_id)

      if (!Number.isInteger(id) || id < 1 || id > MAX_ID || !slug) {
        skipped += 1
        continue
      }

      entries.push({
        id,
        slug,
        evolution_chain_id: evolutionChainId,
      })
    } catch {
      skipped += 1
    }
  }

  return { entries, skipped }
}

async function buildPokemonIndex() {
  const { entries: rawEntries, skipped } = await loadRawEntries()
  const uniqueEntries = rawEntries
    .sort((a, b) => a.id - b.id)
    .filter((entry, index, list) => index === 0 || list[index - 1].id !== entry.id)

  const loaded = []
  let localized = 0

  for (const entry of uniqueEntries) {
    const species = await fetchJson(`https://pokeapi.co/api/v2/pokemon-species/${entry.id}/`)
    const nameDe = pickLocalizedName(species, 'de') ?? entry.slug

    loaded.push({
      id: entry.id,
      slug: entry.slug,
      nameDe,
      evolution_chain_id: entry.evolution_chain_id,
    })

    localized += 1
    if (localized % 25 === 0 || localized === uniqueEntries.length) {
      console.log(`Namensdaten: ${localized}/${uniqueEntries.length}`)
    }
    await sleep(60)
  }

  await mkdir(path.dirname(outputFile), { recursive: true })
  await writeFile(outputFile, `${JSON.stringify(loaded, null, 2)}\n`, 'utf8')

  console.log(`pokemonIndex.json generated: ${outputFile}`)
  console.log(`Loaded raw entries: ${rawEntries.length}`)
  console.log(`Localized entries: ${loaded.length}`)
  console.log(`Skipped raw files: ${skipped}`)
  console.log(`Range: 1-${loaded.at(-1)?.id ?? 0}`)
}

buildPokemonIndex().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
