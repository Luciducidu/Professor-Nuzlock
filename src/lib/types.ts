export type ProjectGame = 'platinum' | 'bw2'

export type DupesMode = 'none' | 'species' | 'evolution'
export type ChallengeType = 'nuzlocke' | 'soullink'
export type SoulLinkPartnerDupesMode = 'none' | 'species' | 'evolution'

export type SoulLinkPlayer = {
  id: 'p1' | 'p2'
  name: string
}

export type PlayerId = SoulLinkPlayer['id']

export type ProjectSettings = {
  dupesMode: DupesMode
  soulLinkPartnerDupesMode: SoulLinkPartnerDupesMode
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
  challengeType?: ChallengeType
  players?: SoulLinkPlayer[]
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
  playerId?: PlayerId
  linkedEncounterId?: string | null
  linkGroupId?: string | null
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
  playerId?: PlayerId
  sourceEncounterId?: string
  linkedEncounterId?: string | null
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



