import { db } from './db'
import type {
  ChallengeType,
  EncounterDraft,
  EncounterDraftEntry,
  EncounterDraftType,
  PlayerId,
  PokemonIndexEntry,
} from './types'

export function buildEncounterDraftId(projectId: string, locationId: string, draftType: EncounterDraftType) {
  return `${projectId}:${locationId}:${draftType}`
}

export function toDraftEntry(params: {
  selectedPokemon: PokemonIndexEntry | null
  formKey?: string
  formName?: string
  formSlug?: string
  formPokemonId?: number | null
  nickname: string
  encounterType: EncounterDraftEntry['encounterType']
  outcome: EncounterDraftEntry['outcome']
  isDead: boolean
  notes: string
}): EncounterDraftEntry | null {
  const { selectedPokemon, formKey, formName, formSlug, formPokemonId, nickname, encounterType, outcome, isDead, notes } = params
  const hasText = nickname.trim().length > 0 || notes.trim().length > 0

  if (!selectedPokemon && !hasText && outcome === 'caught' && !isDead && encounterType === 'normal') {
    return null
  }

  return {
    pokemonId: selectedPokemon?.id ?? null,
    slug: selectedPokemon?.slug ?? '',
    nameDe: selectedPokemon?.nameDe ?? '',
    evolution_chain_id: selectedPokemon?.evolution_chain_id ?? null,
    formKey,
    formName,
    formSlug,
    formPokemonId: formPokemonId ?? null,
    nickname,
    encounterType,
    outcome,
    isDead,
    notes,
  }
}

export function toPokemonFromDraft(entry: EncounterDraftEntry | null | undefined): PokemonIndexEntry | null {
  if (!entry || entry.pokemonId === null) return null

  return {
    id: entry.pokemonId,
    slug: entry.slug,
    nameDe: entry.nameDe,
    evolution_chain_id: entry.evolution_chain_id,
  }
}

export async function getEncounterDraft(
  projectId: string,
  locationId: string,
  draftType: EncounterDraftType,
): Promise<EncounterDraft | undefined> {
  return db.encounterDrafts.get(buildEncounterDraftId(projectId, locationId, draftType))
}

export async function getEncounterDraftsForProject(projectId: string): Promise<EncounterDraft[]> {
  return db.encounterDrafts.where('projectId').equals(projectId).toArray()
}

export async function saveSingleEncounterDraft(params: {
  projectId: string
  locationId: string
  challengeType: ChallengeType
  playerId?: PlayerId
  draftType?: 'single'
  entry: EncounterDraftEntry | null
  finalSaveAllowed: boolean
}) {
  const { projectId, locationId, challengeType, playerId, entry, finalSaveAllowed } = params
  const id = buildEncounterDraftId(projectId, locationId, 'single')

  if (!entry) {
    await db.encounterDrafts.delete(id)
    return
  }

  const draft: EncounterDraft = {
    id,
    projectId,
    locationId,
    challengeType,
    draftType: 'single',
    playerId,
    status: 'draft',
    updatedAt: Date.now(),
    isComplete: entry.pokemonId !== null,
    finalSaveAllowed,
    entry,
  }

  await db.encounterDrafts.put(draft)
}

export async function saveSoullinkEncounterDraft(params: {
  projectId: string
  locationId: string
  draftType: 'main' | 'extra'
  linkGroupId?: string | null
  pair: { p1: EncounterDraftEntry | null; p2: EncounterDraftEntry | null }
  finalSaveAllowed: boolean
}) {
  const { projectId, locationId, draftType, linkGroupId, pair, finalSaveAllowed } = params
  const id = buildEncounterDraftId(projectId, locationId, draftType)

  if (!pair.p1 && !pair.p2) {
    await db.encounterDrafts.delete(id)
    return
  }

  const draft: EncounterDraft = {
    id,
    projectId,
    locationId,
    challengeType: 'soullink',
    draftType,
    linkGroupId: linkGroupId ?? null,
    status: 'draft',
    updatedAt: Date.now(),
    isComplete: Boolean(pair.p1?.pokemonId) && Boolean(pair.p2?.pokemonId),
    finalSaveAllowed,
    pair,
  }

  await db.encounterDrafts.put(draft)
}

export async function discardEncounterDraft(projectId: string, locationId: string, draftType: EncounterDraftType) {
  await db.encounterDrafts.delete(buildEncounterDraftId(projectId, locationId, draftType))
}
