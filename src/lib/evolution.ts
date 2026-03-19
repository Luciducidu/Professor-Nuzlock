import pokemonIndex from '../data/pokemonIndex.json'
import { db } from './db'
import type { EvolutionOption, PokemonIndexEntry } from './types'

const POKEMON_INDEX = pokemonIndex as PokemonIndexEntry[]

const bySlug = new Map<string, PokemonIndexEntry>(POKEMON_INDEX.map((entry) => [entry.slug, entry]))

function parseChainId(evolutionChainUrl: string): number | null {
  const match = evolutionChainUrl.match(/\/evolution-chain\/(\d+)\/?$/)
  return match ? Number(match[1]) : null
}

function collectSpeciesSlugs(node: unknown, out: Set<string>) {
  if (!node || typeof node !== 'object') return

  const chainNode = node as {
    species?: { name?: string }
    evolves_to?: unknown[]
  }

  const name = chainNode.species?.name
  if (typeof name === 'string' && name.trim().length > 0) {
    out.add(name)
  }

  if (Array.isArray(chainNode.evolves_to)) {
    for (const next of chainNode.evolves_to) {
      collectSpeciesSlugs(next, out)
    }
  }
}

async function resolveOptionFromSlug(slug: string, chainId: number): Promise<EvolutionOption | null> {
  const fromIndex = bySlug.get(slug)
  if (fromIndex) {
    return {
      pokemonId: fromIndex.id,
      slug: fromIndex.slug,
      nameDe: fromIndex.nameDe,
      evolution_chain_id: fromIndex.evolution_chain_id,
    }
  }

  try {
    const pokemonRes = await fetch(`https://pokeapi.co/api/v2/pokemon/${slug}/`)
    if (!pokemonRes.ok) return null
    const pokemonJson = (await pokemonRes.json()) as { id?: number; name?: string }
    const fallbackId = Number(pokemonJson.id)
    if (!Number.isFinite(fallbackId)) return null
    const fallbackSlug = String(pokemonJson.name ?? slug)

    return {
      pokemonId: fallbackId,
      slug: fallbackSlug,
      nameDe: fallbackSlug,
      evolution_chain_id: chainId,
    }
  } catch {
    return null
  }
}

export async function getEvolutionOptions(pokemonId: number): Promise<EvolutionOption[]> {
  const speciesRes = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${pokemonId}/`)
  if (!speciesRes.ok) {
    throw new Error(`Pokémon-Spezies konnte nicht geladen werden (${speciesRes.status}).`)
  }

  const speciesJson = (await speciesRes.json()) as { evolution_chain?: { url?: string } }
  const chainUrl = speciesJson.evolution_chain?.url
  if (!chainUrl) {
    const fallback = POKEMON_INDEX.find((entry) => entry.id === pokemonId)
    return fallback
      ? [
          {
            pokemonId: fallback.id,
            slug: fallback.slug,
            nameDe: fallback.nameDe,
            evolution_chain_id: fallback.evolution_chain_id,
          },
        ]
      : []
  }

  const chainId = parseChainId(chainUrl)
  if (!chainId) {
    throw new Error('Evolutionskette konnte nicht erkannt werden.')
  }

  const cached = await db.evoCache.get(chainId)
  if (cached?.options?.length) {
    return cached.options
  }

  const chainRes = await fetch(chainUrl)
  if (!chainRes.ok) {
    throw new Error(`Evolutionskette konnte nicht geladen werden (${chainRes.status}).`)
  }

  const chainJson = (await chainRes.json()) as { chain?: unknown }
  const slugs = new Set<string>()
  collectSpeciesSlugs(chainJson.chain, slugs)

  const options: EvolutionOption[] = []
  for (const slug of slugs) {
    const resolved = await resolveOptionFromSlug(slug, chainId)
    if (resolved) options.push(resolved)
  }

  options.sort((a, b) => a.pokemonId - b.pokemonId)

  await db.evoCache.put({
    chainId,
    options,
    updatedAt: Date.now(),
  })

  return options
}
