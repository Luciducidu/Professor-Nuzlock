import { isSoulLinkProject } from './projectSettings'
import type { Encounter, EncounterType, PokemonIndexEntry, Project } from './types'

type RuleValidationResult = {
  allowed: boolean
  message: string
  warning?: string
}

type DupesCheckResult = {
  allowed: boolean
  reason: 'none' | 'species' | 'evolution' | 'no_chain'
  message: string
  duplicateEncounter?: Encounter
}

type SoulLinkPartnerDupesCheckResult = {
  allowed: boolean
  reason: 'none' | 'species' | 'evolution' | 'no_chain'
}

type SuccessfulSoulLinkPair = {
  linkGroupId: string
  p1: Encounter
  p2: Encounter
}

export function checkDupesClauseForPokemon(params: {
  project: Project
  pokemon: PokemonIndexEntry
  encounters: Encounter[]
  currentEncounterId?: string
}): DupesCheckResult {
  const { project, pokemon, encounters, currentEncounterId } = params

  const lockedEncounters = encounters.filter(
    (encounter) =>
      (encounter.outcome === 'caught' || encounter.outcome === 'not_caught') &&
      encounter.id !== currentEncounterId,
  )

  if (project.settings.dupesMode === 'none') {
    return {
      allowed: true,
      reason: 'none',
      message: 'Ja, erlaubt. Dupes-Regel ist ausgeschaltet.',
    }
  }

  if (project.settings.dupesMode === 'species') {
    const duplicate = lockedEncounters.find((encounter) => encounter.pokemonId === pokemon.id)
    if (duplicate) {
      return {
        allowed: false,
        reason: 'species',
        message: 'Nein. Dupes Clause: Dieses Pokémon wurde bereits registriert.',
        duplicateEncounter: duplicate,
      }
    }
  }

  if (project.settings.dupesMode === 'evolution') {
    if (pokemon.evolution_chain_id === null) {
      return {
        allowed: true,
        reason: 'no_chain',
        message: 'Ja, erlaubt.',
      }
    }

    const duplicate = lockedEncounters.find(
      (encounter) =>
        encounter.evolution_chain_id !== null &&
        encounter.evolution_chain_id === pokemon.evolution_chain_id,
    )

    if (duplicate) {
      return {
        allowed: false,
        reason: 'evolution',
        message: 'Nein. Dupes Clause: Diese Evolutionslinie wurde bereits registriert.',
        duplicateEncounter: duplicate,
      }
    }
  }

  return {
    allowed: true,
    reason: project.settings.dupesMode === 'species' ? 'species' : 'evolution',
    message: 'Ja, erlaubt.',
  }
}

function buildSuccessfulSoulLinkPairs(
  encounters: Encounter[],
  currentEncounterIds: string[],
  currentLinkGroupId?: string | null,
  currentCreatedAt?: number,
): SuccessfulSoulLinkPair[] {
  const byId = new Map(encounters.map((encounter) => [encounter.id, encounter]))
  const pairs = new Map<string, SuccessfulSoulLinkPair>()

  for (const encounter of encounters) {
    if (encounter.playerId !== 'p1' && encounter.playerId !== 'p2') continue
    if (encounter.outcome !== 'caught' || !encounter.linkGroupId || !encounter.linkedEncounterId) continue
    if (currentEncounterIds.includes(encounter.id)) continue
    if (currentLinkGroupId && encounter.linkGroupId === currentLinkGroupId) continue
    if (currentCreatedAt !== undefined && encounter.createdAt >= currentCreatedAt) continue

    const partner = byId.get(encounter.linkedEncounterId)
    if (!partner) continue
    if (partner.outcome !== 'caught') continue
    if (partner.linkGroupId !== encounter.linkGroupId || partner.linkedEncounterId !== encounter.id) continue
    if (currentEncounterIds.includes(partner.id)) continue
    if (currentCreatedAt !== undefined && partner.createdAt >= currentCreatedAt) continue

    if (pairs.has(encounter.linkGroupId)) continue

    const p1 = encounter.playerId === 'p1' ? encounter : partner.playerId === 'p1' ? partner : null
    const p2 = encounter.playerId === 'p2' ? encounter : partner.playerId === 'p2' ? partner : null
    if (!p1 || !p2) continue

    pairs.set(encounter.linkGroupId, { linkGroupId: encounter.linkGroupId, p1, p2 })
  }

  return Array.from(pairs.values())
}

function checkSoulLinkPartnerDupesForPokemon(params: {
  project: Project
  pokemon: PokemonIndexEntry
  encounters: Encounter[]
  currentEncounterId?: string
  currentEncounterIds?: string[]
  currentLinkGroupId?: string | null
  currentCreatedAt?: number
}): SoulLinkPartnerDupesCheckResult {
  const { project, pokemon, encounters, currentEncounterId, currentEncounterIds, currentLinkGroupId, currentCreatedAt } =
    params

  if (!isSoulLinkProject(project)) {
    return { allowed: true, reason: 'none' }
  }

  const mode = project.settings.soulLinkPartnerDupesMode
  if (mode === 'none') {
    return { allowed: true, reason: 'none' }
  }

  const excludedIds = currentEncounterIds ?? (currentEncounterId ? [currentEncounterId] : [])
  const successfulPairs = buildSuccessfulSoulLinkPairs(encounters, excludedIds, currentLinkGroupId, currentCreatedAt)

  if (mode === 'species') {
    const blocked = successfulPairs.some((pair) => pair.p1.pokemonId === pokemon.id || pair.p2.pokemonId === pokemon.id)
    if (blocked) return { allowed: false, reason: 'species' }
    return { allowed: true, reason: 'species' }
  }

  if (pokemon.evolution_chain_id === null) {
    return { allowed: true, reason: 'no_chain' }
  }

  const blocked = successfulPairs.some(
    (pair) =>
      (pair.p1.evolution_chain_id !== null && pair.p1.evolution_chain_id === pokemon.evolution_chain_id) ||
      (pair.p2.evolution_chain_id !== null && pair.p2.evolution_chain_id === pokemon.evolution_chain_id),
  )

  if (blocked) return { allowed: false, reason: 'evolution' }
  return { allowed: true, reason: 'evolution' }
}

export function validateEncounterSelection(params: {
  project: Project
  pokemon: PokemonIndexEntry
  encounterType: EncounterType
  encounters: Encounter[]
  currentEncounterId?: string
  currentEncounterIds?: string[]
  currentLinkGroupId?: string | null
  currentCreatedAt?: number
  playerId?: 'p1' | 'p2'
}): RuleValidationResult {
  const {
    project,
    pokemon,
    encounterType,
    encounters,
    currentEncounterId,
    currentEncounterIds,
    currentLinkGroupId,
    currentCreatedAt,
    playerId,
  } = params

  let bypassDupes = false
  let warning: string | undefined

  if (encounterType === 'shiny') {
    if (!project.settings.shinyClauseEnabled) {
      warning = 'Shiny-Regel ist deaktiviert.'
    } else if (project.settings.shinyBypassesDupes) {
      bypassDupes = true
    }
  }

  if (encounterType === 'static') {
    if (!project.settings.staticClauseEnabled) {
      warning = 'Static-Regel ist deaktiviert.'
    } else if (project.settings.staticBypassesDupes) {
      bypassDupes = true
    }
  }

  if (bypassDupes) {
    return { allowed: true, message: 'Erlaubt', warning }
  }

  if (project.settings.dupesMode !== 'none') {
    const dupesCheck = checkDupesClauseForPokemon({
      project,
      pokemon,
      encounters:
        project.challengeType === 'soullink' && playerId
          ? encounters.filter((encounter) => encounter.playerId === playerId)
          : encounters,
      currentEncounterId,
    })

    if (!dupesCheck.allowed) {
      return {
        allowed: false,
        message:
          dupesCheck.reason === 'species'
            ? 'Dupes Clause: Dieses Pokémon wurde bereits registriert.'
            : 'Dupes Clause: Diese Evolutionslinie wurde bereits registriert.',
        warning,
      }
    }
  }

  const soulLinkCheck = checkSoulLinkPartnerDupesForPokemon({
    project,
    pokemon,
    encounters,
    currentEncounterId,
    currentEncounterIds,
    currentLinkGroupId,
    currentCreatedAt,
  })

  if (!soulLinkCheck.allowed) {
    return {
      allowed: false,
      message:
        soulLinkCheck.reason === 'species'
          ? 'Soullink-Regel: Dieses Pokémon ist für beide Spieler bereits gesperrt.'
          : 'Soullink-Regel: Diese Entwicklungsreihe ist für beide Spieler bereits gesperrt.',
      warning,
    }
  }

  return { allowed: true, message: 'Erlaubt', warning }
}
