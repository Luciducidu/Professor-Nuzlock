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

export function checkDupesClauseForPokemon(params: {
  project: Project
  pokemon: PokemonIndexEntry
  encounters: Encounter[]
  currentEncounterId?: string
}): DupesCheckResult {
  const { project, pokemon, encounters, currentEncounterId } = params

  // "Nicht gefangen" zählt ebenfalls als verbraucht und blockiert damit weitere Fänge.
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

export function validateEncounterSelection(params: {
  project: Project
  pokemon: PokemonIndexEntry
  encounterType: EncounterType
  encounters: Encounter[]
  currentEncounterId?: string
}): RuleValidationResult {
  const { project, pokemon, encounterType, encounters, currentEncounterId } = params

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

  if (project.settings.dupesMode === 'none' || bypassDupes) {
    return { allowed: true, message: 'Erlaubt', warning }
  }

  const dupesCheck = checkDupesClauseForPokemon({
    project,
    pokemon,
    encounters,
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

  return { allowed: true, message: 'Erlaubt', warning }
}
