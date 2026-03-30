import evolutionData from '../data/evolutionData.json'
import moveIndex from '../data/moveIndex.json'
import pokedexIndex from '../data/pokedexIndex.json'
import { TYPE_META, type PokemonTypeKey } from '../data/typeMeta'
import type { ProjectGame } from './types'

export type PokedexFormAbility = {
  nameDe: string
  nameEn: string
  isHidden: boolean
}

export type PokedexFormStats = {
  hp: number
  attack: number
  defense: number
  specialAttack: number
  specialDefense: number
  speed: number
  total: number
}

export type LearnsetGenerationKey = 'gen4' | 'gen5'

export type PokedexLevelUpMove = {
  level: number
  moveSlug: string
}

export type PokedexMoveEntry = {
  slug: string
  nameDe: string
  nameEn: string
  type: PokemonTypeKey | null
  power: number | null
  accuracy: number | null
  damageClass: 'physical' | 'special' | 'status'
}

export type PokedexFormEntry = {
  key: string
  pokemonId: number
  slug: string
  nameEn: string
  nameDe: string
  spriteId: number
  types: PokemonTypeKey[]
  abilities: PokedexFormAbility[]
  stats: PokedexFormStats
  levelUpMovesByGeneration: Record<LearnsetGenerationKey, PokedexLevelUpMove[]>
  isDefault: boolean
}

export type PokedexEntry = {
  id: number
  slug: string
  nameEn: string
  nameDe: string
  spriteId: number
  types: PokemonTypeKey[]
  catchRate: number | null
  evolution_chain_id: number | null
  forms: PokedexFormEntry[]
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

const POKEDEX_INDEX = (Array.isArray(pokedexIndex) ? pokedexIndex : []) as PokedexEntry[]
const EVOLUTION_CHAINS = (Array.isArray(evolutionData) ? evolutionData : []) as EvolutionChain[]
const MOVE_INDEX = (Array.isArray(moveIndex) ? moveIndex : []) as PokedexMoveEntry[]

const POKEDEX_BY_ID = new Map(POKEDEX_INDEX.map((entry) => [entry.id, entry]))
const EVOLUTION_BY_CHAIN_ID = new Map(EVOLUTION_CHAINS.map((entry) => [entry.chainId, entry]))
const MOVE_BY_SLUG = new Map(MOVE_INDEX.map((entry) => [entry.slug, entry]))

export function getPokedexEntry(pokemonId: number | null | undefined) {
  if (!pokemonId) return null
  return POKEDEX_BY_ID.get(pokemonId) ?? null
}

export function getDefaultForm(entry: PokedexEntry | null) {
  if (!entry) return null
  return entry.forms.find((form) => form.isDefault) ?? entry.forms[0] ?? null
}

export function getFormByKey(entry: PokedexEntry | null, formKey?: string | null) {
  if (!entry) return null
  if (!formKey) return getDefaultForm(entry)
  return entry.forms.find((form) => form.key === formKey) ?? getDefaultForm(entry)
}

export function getDisplayFormForPokemon(pokemonId: number, formKey?: string | null) {
  const entry = getPokedexEntry(pokemonId)
  if (!entry) return null
  return getFormByKey(entry, formKey)
}

export function searchPokedex(query: string, maxResults = 30): SearchResult[] {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return POKEDEX_INDEX.slice(0, maxResults)

  return POKEDEX_INDEX.filter((entry) => {
    const de = entry.nameDe.toLowerCase()
    const en = entry.nameEn.toLowerCase()
    const slug = entry.slug.toLowerCase()
    const formMatch = entry.forms.some((form) => {
      const formDe = form.nameDe.toLowerCase()
      const formEn = form.nameEn.toLowerCase()
      const formSlug = form.slug.toLowerCase()
      return formDe.includes(normalizedQuery) || formEn.includes(normalizedQuery) || formSlug.includes(normalizedQuery)
    })
    return de.includes(normalizedQuery) || en.includes(normalizedQuery) || slug.includes(normalizedQuery) || formMatch
  }).slice(0, maxResults)
}

export function queryMatchesPokedexEntry(query: string, entry: PokedexEntry, formKey?: string | null) {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return true

  const form = getFormByKey(entry, formKey)
  return [
    entry.nameDe,
    entry.nameEn,
    entry.slug,
    form?.nameDe,
    form?.nameEn,
    form?.slug,
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(normalizedQuery))
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

export function getTypeMeta(type: PokemonTypeKey) {
  return TYPE_META[type]
}

export function getSpriteUrl(spriteId: number) {
  return `${import.meta.env.BASE_URL}sprites/${spriteId}.png`
}

export function getLearnsetGenerationForGame(game: ProjectGame): LearnsetGenerationKey {
  return game === 'bw2' ? 'gen5' : 'gen4'
}

export function getLevelUpMovesForForm(form: PokedexFormEntry | null, game: ProjectGame) {
  if (!form) return []
  return form.levelUpMovesByGeneration[getLearnsetGenerationForGame(game)] ?? []
}

export function getMoveBySlug(moveSlug: string | null | undefined) {
  if (!moveSlug) return null
  return MOVE_BY_SLUG.get(moveSlug) ?? null
}
