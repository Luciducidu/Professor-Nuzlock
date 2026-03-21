import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const projectRoot = process.cwd()
const dataDir = path.resolve(projectRoot, 'src', 'data')
const pokemonIndexOutput = path.resolve(dataDir, 'pokemonIndex.json')
const pokedexIndexOutput = path.resolve(dataDir, 'pokedexIndex.json')
const evolutionDataOutput = path.resolve(dataDir, 'evolutionData.json')
const MAX_ID = 649

const resourceCache = new Map()
const localizedNameCache = new Map()

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function pickLocalizedName(resource, lang = 'de') {
  return resource.names?.find((entry) => entry.language?.name === lang)?.name ?? null
}

function extractIdFromUrl(url, resourceName) {
  const match = url.match(new RegExp(`${resourceName}/(\\d+)/?$`))
  return match ? Number(match[1]) : null
}

function prettifySlug(slug) {
  return slug
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

async function fetchJson(url) {
  if (resourceCache.has(url)) {
    return resourceCache.get(url)
  }

  const promise = (async () => {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText} for ${url}`)
    }
    return response.json()
  })()

  resourceCache.set(url, promise)
  return promise
}

async function getLocalizedResourceName(url, fallback) {
  if (!url) return fallback
  if (localizedNameCache.has(url)) {
    return localizedNameCache.get(url)
  }

  const resource = await fetchJson(url)
  const localized =
    pickLocalizedName(resource, 'de') ??
    (typeof resource.name === 'string' ? prettifySlug(resource.name) : fallback) ??
    fallback

  localizedNameCache.set(url, localized)
  return localized
}

function joinGerman(parts) {
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0]
  if (parts.length === 2) return `${parts[0]} und ${parts[1]}`
  return `${parts.slice(0, -1).join(', ')} und ${parts.at(-1)}`
}

async function formatEvolutionDetail(detail) {
  const fragments = []
  const trigger = detail.trigger?.name ?? 'other'

  if (trigger === 'level-up') {
    if (detail.min_level != null) {
      fragments.push(`ab Level ${detail.min_level}`)
    } else {
      fragments.push('durch Levelaufstieg')
    }
  } else if (trigger === 'trade') {
    fragments.push('durch Tausch')
  } else if (trigger === 'use-item') {
    const itemName = detail.item ? await getLocalizedResourceName(detail.item.url, prettifySlug(detail.item.name)) : 'einem Entwicklungsitem'
    fragments.push(`mit ${itemName}`)
  } else if (trigger === 'shed') {
    fragments.push('unter besonderen Bedingungen')
  } else {
    fragments.push('auf besondere Weise')
  }

  if (detail.min_happiness != null) {
    fragments.push('durch Freundschaft')
  }

  if (detail.min_affection != null) {
    fragments.push('durch Zuneigung')
  }

  if (detail.min_beauty != null) {
    fragments.push(`mit Schönheit ${detail.min_beauty}`)
  }

  if (detail.item && trigger !== 'use-item') {
    const itemName = await getLocalizedResourceName(detail.item.url, prettifySlug(detail.item.name))
    fragments.push(`mit ${itemName}`)
  }

  if (detail.held_item) {
    const heldItemName = await getLocalizedResourceName(detail.held_item.url, prettifySlug(detail.held_item.name))
    fragments.push(`mit getragenem ${heldItemName}`)
  }

  if (detail.time_of_day) {
    fragments.push(detail.time_of_day === 'day' ? 'nur tagsüber' : detail.time_of_day === 'night' ? 'nur nachts' : `nur ${detail.time_of_day}`)
  }

  if (detail.gender === 1) fragments.push('nur weiblich')
  if (detail.gender === 2) fragments.push('nur männlich')

  if (detail.known_move) {
    const moveName = await getLocalizedResourceName(detail.known_move.url, prettifySlug(detail.known_move.name))
    fragments.push(`mit der Attacke ${moveName}`)
  }

  if (detail.known_move_type) {
    const typeName = await getLocalizedResourceName(detail.known_move_type.url, prettifySlug(detail.known_move_type.name))
    fragments.push(`mit einer Attacke vom Typ ${typeName}`)
  }

  if (detail.location) {
    const locationName = await getLocalizedResourceName(detail.location.url, prettifySlug(detail.location.name))
    fragments.push(`an ${locationName}`)
  }

  if (detail.needs_overworld_rain) {
    fragments.push('bei Regen')
  }

  if (detail.party_species) {
    const speciesName = await getLocalizedResourceName(detail.party_species.url, prettifySlug(detail.party_species.name))
    fragments.push(`mit ${speciesName} im Team`)
  }

  if (detail.party_type) {
    const typeName = await getLocalizedResourceName(detail.party_type.url, prettifySlug(detail.party_type.name))
    fragments.push(`mit einem Pokémon vom Typ ${typeName} im Team`)
  }

  if (detail.relative_physical_stats === 1) fragments.push('wenn Angriff höher als Verteidigung ist')
  if (detail.relative_physical_stats === 0) fragments.push('wenn Angriff und Verteidigung gleich hoch sind')
  if (detail.relative_physical_stats === -1) fragments.push('wenn Angriff niedriger als Verteidigung ist')

  if (detail.trade_species) {
    const tradeName = await getLocalizedResourceName(detail.trade_species.url, prettifySlug(detail.trade_species.name))
    fragments.push(`im Tausch gegen ${tradeName}`)
  }

  if (detail.turn_upside_down) {
    fragments.push('bei umgedrehter Konsole')
  }

  return `Entwickelt sich ${joinGerman(fragments)}`
}

async function formatEvolutionDetails(details) {
  if (!Array.isArray(details) || details.length === 0) {
    return ['Besondere Entwicklung']
  }

  const lines = []
  for (const detail of details) {
    lines.push(await formatEvolutionDetail(detail))
  }
  return lines
}

async function buildPokedexData() {
  const entries = []
  const byId = new Map()
  const chainIds = new Set()

  console.log(`Pokédex-Daten werden bis #${MAX_ID} aufgebaut...`)

  for (let id = 1; id <= MAX_ID; id += 1) {
    const [pokemon, species] = await Promise.all([
      fetchJson(`https://pokeapi.co/api/v2/pokemon/${id}/`),
      fetchJson(`https://pokeapi.co/api/v2/pokemon-species/${id}/`),
    ])

    const chainId = species.evolution_chain?.url ? extractIdFromUrl(species.evolution_chain.url, 'evolution-chain') : null
    if (chainId) chainIds.add(chainId)

    const entry = {
      id,
      slug: pokemon.name,
      nameEn: prettifySlug(pokemon.name),
      nameDe: pickLocalizedName(species, 'de') ?? prettifySlug(pokemon.name),
      spriteId: id,
      types: [...pokemon.types].sort((a, b) => a.slot - b.slot).map((typeEntry) => typeEntry.type.name),
      evolution_chain_id: chainId,
    }

    entries.push(entry)
    byId.set(id, entry)

    if (id % 25 === 0 || id === MAX_ID) {
      console.log(`Pokémon-Basisdaten: ${id}/${MAX_ID}`)
    }
    await sleep(35)
  }

  const evolutionChains = []
  const sortedChainIds = Array.from(chainIds).sort((a, b) => a - b)

  async function buildChainNode(chainNode) {
    const pokemonId = extractIdFromUrl(chainNode.species.url, 'pokemon-species')
    const entry = pokemonId ? byId.get(pokemonId) : null

    if (!entry) {
      return null
    }

    const branches = []
    for (const target of chainNode.evolves_to ?? []) {
      const builtTarget = await buildChainNode(target)
      if (!builtTarget) continue

      branches.push({
        conditions: await formatEvolutionDetails(target.evolution_details),
        target: builtTarget,
      })
    }

    return {
      pokemonId: entry.id,
      slug: entry.slug,
      nameEn: entry.nameEn,
      nameDe: entry.nameDe,
      spriteId: entry.spriteId,
      types: entry.types,
      branches,
    }
  }

  for (const chainId of sortedChainIds) {
    const chain = await fetchJson(`https://pokeapi.co/api/v2/evolution-chain/${chainId}/`)
    const root = await buildChainNode(chain.chain)
    if (!root) continue

    evolutionChains.push({
      chainId,
      root,
    })
    if (chainId % 20 === 0 || chainId === sortedChainIds.at(-1)) {
      console.log(`Evolutionsketten: ${evolutionChains.length}/${sortedChainIds.length}`)
    }
    await sleep(35)
  }

  const pokemonIndex = entries.map(({ id, slug, nameDe, evolution_chain_id }) => ({
    id,
    slug,
    nameDe,
    evolution_chain_id,
  }))

  await mkdir(dataDir, { recursive: true })
  await writeFile(pokemonIndexOutput, `${JSON.stringify(pokemonIndex, null, 2)}\n`, 'utf8')
  await writeFile(pokedexIndexOutput, `${JSON.stringify(entries, null, 2)}\n`, 'utf8')
  await writeFile(evolutionDataOutput, `${JSON.stringify(evolutionChains, null, 2)}\n`, 'utf8')

  console.log(`pokemonIndex.json geschrieben: ${pokemonIndexOutput}`)
  console.log(`pokedexIndex.json geschrieben: ${pokedexIndexOutput}`)
  console.log(`evolutionData.json geschrieben: ${evolutionDataOutput}`)
  console.log(`Pokémon gesamt: ${entries.length}`)
  console.log(`Evolutionsketten gesamt: ${evolutionChains.length}`)
}

buildPokedexData().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
