import evolutionData from '../data/evolutionData.json'
import pokedexIndex from '../data/pokedexIndex.json'
import { TYPE_META, type PokemonTypeKey } from '../data/typeMeta'

export type PokedexEntry = {
  id: number
  slug: string
  nameEn: string
  nameDe: string
  spriteId: number
  types: PokemonTypeKey[]
  evolution_chain_id: number | null
}

export type EvolutionChainNode = {
  pokemonId: number
  slug: string
  nameEn: string
  nameDe: string
  spriteId: number
  types: PokemonTypeKey[]
  branches: Array<{
    conditions: string[]
    target: EvolutionChainNode
  }>
}

export type EvolutionChain = {
  chainId: number
  root: EvolutionChainNode
}

type SearchResult = PokedexEntry

const POKEDEX_INDEX = pokedexIndex as PokedexEntry[]
const EVOLUTION_CHAINS = evolutionData as EvolutionChain[]

const POKEDEX_BY_ID = new Map(POKEDEX_INDEX.map((entry) => [entry.id, entry]))
const EVOLUTION_BY_CHAIN_ID = new Map(EVOLUTION_CHAINS.map((entry) => [entry.chainId, entry]))

export function getPokedexEntry(pokemonId: number | null | undefined) {
  if (!pokemonId) return null
  return POKEDEX_BY_ID.get(pokemonId) ?? null
}

export function searchPokedex(query: string, maxResults = 30): SearchResult[] {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return POKEDEX_INDEX.slice(0, maxResults)

  return POKEDEX_INDEX.filter((entry) => {
    const de = entry.nameDe.toLowerCase()
    const en = entry.nameEn.toLowerCase()
    const slug = entry.slug.toLowerCase()
    return de.includes(normalizedQuery) || en.includes(normalizedQuery) || slug.includes(normalizedQuery)
  }).slice(0, maxResults)
}

export function getEvolutionChain(chainId: number | null | undefined) {
  if (!chainId) return null
  return EVOLUTION_BY_CHAIN_ID.get(chainId) ?? null
}

export function findEvolutionPath(
  node: EvolutionChainNode,
  pokemonId: number,
  path: EvolutionChainNode[] = [],
): EvolutionChainNode[] | null {
  const nextPath = [...path, node]
  if (node.pokemonId === pokemonId) return nextPath

  for (const branch of node.branches) {
    const result = findEvolutionPath(branch.target, pokemonId, nextPath)
    if (result) return result
  }

  return null
}

export function getImmediateEvolutionOptions(chain: EvolutionChain | null, pokemonId: number) {
  if (!chain) return []

  const path = findEvolutionPath(chain.root, pokemonId)
  const currentNode = path?.at(-1)
  if (!currentNode) return []

  return currentNode.branches
}

export function getPreEvolution(chain: EvolutionChain | null, pokemonId: number) {
  if (!chain) return null

  const path = findEvolutionPath(chain.root, pokemonId)
  if (!path || path.length < 2) return null
  return path[path.length - 2]
}

export function getTypeMeta(type: PokemonTypeKey) {
  return TYPE_META[type]
}

export function getSpriteUrl(spriteId: number) {
  return `${import.meta.env.BASE_URL}sprites/${spriteId}.png`
}
