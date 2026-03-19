export type ProjectGame = 'platinum'

export type DupesMode = 'none' | 'species' | 'evolution'

export type ProjectSettings = {
  dupesMode: DupesMode
  shinyClauseEnabled: boolean
  staticClauseEnabled: boolean
  shinyBypassesDupes: boolean
  staticBypassesDupes: boolean
  levelCapsEnabled: boolean
  levelCapsProgressKey: string
}

export type Project = {
  id: string
  name: string
  game: ProjectGame
  createdAt: number
  settings: ProjectSettings
  selectedEvolutionByPokemonId?: Record<number, number>
}

export type LocationType = 'route' | 'city' | 'other'

export type Location = {
  id: string
  projectId: string
  name: string
  type: LocationType
  order: number
  createdAt: number
  notes?: string
}

export type EncounterType = 'normal' | 'shiny' | 'static'

export type EncounterOutcome = 'caught' | 'not_caught'

export type Encounter = {
  id: string
  projectId: string
  locationId: string
  createdAt: number
  pokemonId: number
  slug: string
  nameDe: string
  evolution_chain_id: number | null
  nickname?: string
  encounterType: EncounterType
  outcome: EncounterOutcome
  isDead: boolean
  notes?: string
}

export type PokemonIndexEntry = {
  id: number
  slug: string
  nameDe: string
  evolution_chain_id: number | null
}

export type TeamSlotNumber = 1 | 2 | 3 | 4 | 5 | 6

export type TeamSlot = {
  slot: TeamSlotNumber
  pokemonId: number
  slug: string
  nameDe: string
  evolution_chain_id: number | null
  sourcePokemonId?: number
}

export type Team = {
  id: string
  projectId: string
  slots: TeamSlot[]
  selectedEvolutionByPokemonId?: Record<number, number>
  updatedAt: number
}

export type EvolutionOption = {
  pokemonId: number
  slug: string
  nameDe: string
  evolution_chain_id: number | null
}

export type EvolutionCacheEntry = {
  chainId: number
  options: EvolutionOption[]
  updatedAt: number
}



