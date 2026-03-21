import { getDisplayFormForPokemon } from './pokedex'
import type { Encounter, EncounterDraftEntry, TeamSlot } from './types'

type BaseDisplay = {
  pokemonId: number
  slug: string
  nameDe: string
  evolution_chain_id: number | null
  formKey?: string
  formName?: string
  formSlug?: string
  formPokemonId?: number | null
}

function normalizeFormName(formName?: string) {
  if (!formName) return ''
  return formName.trim().toLowerCase()
}

export function isDefaultFormName(formName?: string) {
  return ['', 'standardform', 'standard', 'normalform'].includes(normalizeFormName(formName))
}

export function buildDisplayFromStoredPokemon(entry: BaseDisplay): BaseDisplay {
  const form = getDisplayFormForPokemon(entry.pokemonId, entry.formKey)

  if (!form) {
    return entry
  }

  return {
    pokemonId: form.pokemonId,
    slug: form.slug,
    nameDe: form.nameDe,
    evolution_chain_id: entry.evolution_chain_id,
    formKey: form.key,
    formName: form.nameDe,
    formSlug: form.slug,
    formPokemonId: form.pokemonId,
  }
}

export function getEncounterDisplay(encounter: Encounter) {
  return buildDisplayFromStoredPokemon({
    pokemonId: encounter.pokemonId,
    slug: encounter.slug,
    nameDe: encounter.nameDe,
    evolution_chain_id: encounter.evolution_chain_id,
    formKey: encounter.formKey,
    formName: encounter.formName,
    formSlug: encounter.formSlug,
    formPokemonId: encounter.formPokemonId,
  })
}

export function getDraftDisplay(entry: EncounterDraftEntry) {
  return buildDisplayFromStoredPokemon({
    pokemonId: entry.pokemonId ?? 0,
    slug: entry.slug,
    nameDe: entry.nameDe,
    evolution_chain_id: entry.evolution_chain_id,
    formKey: entry.formKey,
    formName: entry.formName,
    formSlug: entry.formSlug,
    formPokemonId: entry.formPokemonId,
  })
}

export function getTeamSlotDisplay(slot: TeamSlot) {
  return buildDisplayFromStoredPokemon({
    pokemonId: slot.pokemonId,
    slug: slot.slug,
    nameDe: slot.nameDe,
    evolution_chain_id: slot.evolution_chain_id,
    formKey: slot.formKey,
    formName: slot.formName,
    formSlug: slot.formSlug,
    formPokemonId: slot.formPokemonId,
  })
}
