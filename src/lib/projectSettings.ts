import { PLATINUM_LEVEL_CAPS_DE } from '../data/platinumLevelCaps.de'
import type {
  ChallengeType,
  DupesMode,
  Project,
  ProjectGame,
  ProjectSettings,
  SoulLinkPlayer,
  SoulLinkPartnerDupesMode,
} from './types'

export const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  dupesMode: 'species',
  soulLinkPartnerDupesMode: 'evolution',
  shinyClauseEnabled: true,
  staticClauseEnabled: true,
  shinyBypassesDupes: true,
  staticBypassesDupes: true,
  levelCapsEnabled: false,
  levelCapsProgressKey: 'gym1',
}

export const DUPES_MODE_OPTIONS: Array<{ value: DupesMode; label: string }> = [
  { value: 'none', label: 'Duplikate erlaubt' },
  { value: 'species', label: 'Nur exakt dasselbe Pokemon verboten' },
  { value: 'evolution', label: 'Ganze Entwicklungsreihe verboten' },
]

export const SOULLINK_PARTNER_DUPES_OPTIONS: Array<{ value: SoulLinkPartnerDupesMode; label: string }> = [
  { value: 'none', label: 'Keine zusaetzliche Sperre' },
  { value: 'species', label: 'Nur exakt dieselben Pokemon sperren' },
  { value: 'evolution', label: 'Ganze Entwicklungsreihen fuer beide sperren' },
]

export const GAME_OPTIONS: Array<{ value: ProjectGame; label: string }> = [
  { value: 'platinum', label: 'Pokemon Platin' },
]

export const LEVEL_CAP_OPTIONS = PLATINUM_LEVEL_CAPS_DE.map((entry) => ({
  value: entry.key,
  label: entry.label,
}))

export const CHALLENGE_TYPE_OPTIONS: Array<{ value: ChallengeType; label: string }> = [
  { value: 'nuzlocke', label: 'Nuzlocke Challenge' },
  { value: 'soullink', label: 'Soullink Challenge' },
]

export const formatGameName = (game: ProjectGame): string => {
  if (game === 'platinum') return 'Pokemon Platin'
  return game
}

export function normalizeProjectSettings(settings: Partial<ProjectSettings> | undefined | null): ProjectSettings {
  return {
    ...DEFAULT_PROJECT_SETTINGS,
    ...(settings ?? {}),
  }
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
  return {
    ...project,
    settings: normalizeProjectSettings(project.settings),
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
  if (mode === 'species') return 'Exakte Pokemon'
  if (mode === 'evolution') return 'Entwicklungsreihen'
  return 'Keine'
}

export function getLevelCapByKey(key: string) {
  return PLATINUM_LEVEL_CAPS_DE.find((entry) => entry.key === key) ?? PLATINUM_LEVEL_CAPS_DE[0]
}
