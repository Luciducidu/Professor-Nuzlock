import { BW2_LEVEL_CAPS_DE } from '../data/bw2LevelCaps.de'
import { BW2_LOCATIONS_DE } from '../data/bw2Locations.de'
import { PLATINUM_LEVEL_CAPS_DE } from '../data/platinumLevelCaps.de'
import { PLATINUM_LOCATIONS_DE } from '../data/platinumLocations.de'
import type { SeedLocation } from '../data/seedLocations'
import type {
  ChallengeType,
  DupesMode,
  Project,
  ProjectGame,
  ProjectSettings,
  SoulLinkPlayer,
  SoulLinkPartnerDupesMode,
} from './types'

type LevelCapEntry = {
  key: string
  label: string
  cap: number
}

const LEVEL_CAPS_BY_GAME: Record<ProjectGame, readonly LevelCapEntry[]> = {
  platinum: PLATINUM_LEVEL_CAPS_DE,
  bw2: BW2_LEVEL_CAPS_DE,
}

const LOCATION_SEEDS_BY_GAME: Record<ProjectGame, readonly SeedLocation[]> = {
  platinum: PLATINUM_LOCATIONS_DE,
  bw2: BW2_LOCATIONS_DE,
}

export const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  dupesMode: 'species',
  soulLinkPartnerDupesMode: 'evolution',
  shinyClauseEnabled: true,
  staticClauseEnabled: true,
  shinyBypassesDupes: true,
  staticBypassesDupes: true,
  levelCapsEnabled: false,
  levelCapsProgressKey: PLATINUM_LEVEL_CAPS_DE[0]?.key ?? 'gym1',
}

export const DUPES_MODE_OPTIONS: Array<{ value: DupesMode; label: string }> = [
  { value: 'none', label: 'Duplikate erlaubt' },
  { value: 'species', label: 'Nur exakt dasselbe Pokémon verboten' },
  { value: 'evolution', label: 'Ganze Entwicklungsreihe verboten' },
]

export const SOULLINK_PARTNER_DUPES_OPTIONS: Array<{ value: SoulLinkPartnerDupesMode; label: string }> = [
  { value: 'none', label: 'Keine zusätzliche Sperre' },
  { value: 'species', label: 'Nur exakt dieselben Pokémon sperren' },
  { value: 'evolution', label: 'Ganze Entwicklungsreihen für beide sperren' },
]

export const GAME_OPTIONS: Array<{ value: ProjectGame; label: string }> = [
  { value: 'platinum', label: 'Pokémon Platin' },
  { value: 'bw2', label: 'Pokémon Schwarz/Weiß 2' },
]

export const CHALLENGE_TYPE_OPTIONS: Array<{ value: ChallengeType; label: string }> = [
  { value: 'nuzlocke', label: 'Nuzlocke Challenge' },
  { value: 'soullink', label: 'Soullink Challenge' },
]

export const formatGameName = (game: ProjectGame): string => {
  if (game === 'bw2') return 'Pokémon Schwarz/Weiß 2'
  return 'Pokémon Platin'
}

export function getLocationSeedsForGame(game: ProjectGame): readonly SeedLocation[] {
  return LOCATION_SEEDS_BY_GAME[game] ?? LOCATION_SEEDS_BY_GAME.platinum
}

export function getLevelCapsForGame(game: ProjectGame): readonly LevelCapEntry[] {
  return LEVEL_CAPS_BY_GAME[game] ?? LEVEL_CAPS_BY_GAME.platinum
}

export function getLevelCapOptions(game: ProjectGame): Array<{ value: string; label: string }> {
  return getLevelCapsForGame(game).map((entry) => ({
    value: entry.key,
    label: entry.label,
  }))
}

export function getDefaultLevelCapProgressKey(game: ProjectGame): string {
  return getLevelCapsForGame(game)[0]?.key ?? DEFAULT_PROJECT_SETTINGS.levelCapsProgressKey
}

export function createDefaultProjectSettings(game: ProjectGame): ProjectSettings {
  return {
    ...DEFAULT_PROJECT_SETTINGS,
    levelCapsProgressKey: getDefaultLevelCapProgressKey(game),
  }
}

export function normalizeProjectSettings(
  settings: Partial<ProjectSettings> | undefined | null,
  game: ProjectGame = 'platinum',
): ProjectSettings {
  const merged = {
    ...createDefaultProjectSettings(game),
    ...(settings ?? {}),
  }

  const validKeys = new Set(getLevelCapsForGame(game).map((entry) => entry.key))
  if (!validKeys.has(merged.levelCapsProgressKey)) {
    merged.levelCapsProgressKey = getDefaultLevelCapProgressKey(game)
  }

  return merged
}

function normalizeSoulLinkPlayers(players: Project['players']): SoulLinkPlayer[] | undefined {
  if (!Array.isArray(players)) return undefined

  const player1 = players.find((player) => player?.id === 'p1')
  const player2 = players.find((player) => player?.id === 'p2')
  if (!player1 || !player2) return undefined

  return [
    { id: 'p1', name: String(player1.name ?? '').trim() },
    { id: 'p2', name: String(player2.name ?? '').trim() },
  ]
}

export function normalizeProject(project: Project): Project {
  const game = project.game ?? 'platinum'

  return {
    ...project,
    game,
    settings: normalizeProjectSettings(project.settings, game),
    challengeType: project.challengeType ?? 'nuzlocke',
    players: normalizeSoulLinkPlayers(project.players),
    selectedEvolutionByPokemonId: project.selectedEvolutionByPokemonId ?? {},
  }
}

export function isSoulLinkProject(project: Project): boolean {
  return normalizeProject(project).challengeType === 'soullink'
}

export function getSoulLinkPlayers(project: Project): [SoulLinkPlayer, SoulLinkPlayer] | null {
  const normalized = normalizeProject(project)
  if (normalized.challengeType !== 'soullink' || !normalized.players || normalized.players.length !== 2) return null
  return [normalized.players[0], normalized.players[1]]
}

export function formatChallengeType(challengeType: ChallengeType): string {
  if (challengeType === 'soullink') return 'Soullink Challenge'
  return 'Nuzlocke Challenge'
}

export function formatSoulLinkPartnerDupesMode(mode: SoulLinkPartnerDupesMode): string {
  if (mode === 'species') return 'Exakte Pokémon'
  if (mode === 'evolution') return 'Entwicklungsreihen'
  return 'Keine'
}

export function getLevelCapByKey(game: ProjectGame, key: string) {
  const caps = getLevelCapsForGame(game)
  return caps.find((entry) => entry.key === key) ?? caps[0]
}
