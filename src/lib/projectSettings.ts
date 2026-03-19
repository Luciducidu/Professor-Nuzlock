import { PLATINUM_LEVEL_CAPS_DE } from '../data/platinumLevelCaps.de'
import type { DupesMode, ProjectGame, ProjectSettings } from './types'

export const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  dupesMode: 'species',
  shinyClauseEnabled: true,
  staticClauseEnabled: true,
  shinyBypassesDupes: true,
  staticBypassesDupes: true,
  levelCapsEnabled: false,
  levelCapsProgressKey: 'gym1',
}

export const DUPES_MODE_OPTIONS: Array<{ value: DupesMode; label: string }> = [
  { value: 'none', label: 'Duplikate erlaubt' },
  { value: 'species', label: 'Nur exakt dasselbe Pokémon verboten' },
  { value: 'evolution', label: 'Ganze Entwicklungsreihe verboten' },
]

export const GAME_OPTIONS: Array<{ value: ProjectGame; label: string }> = [
  { value: 'platinum', label: 'Pokémon Platin' },
]

export const LEVEL_CAP_OPTIONS = PLATINUM_LEVEL_CAPS_DE.map((entry) => ({
  value: entry.key,
  label: entry.label,
}))

export const formatGameName = (game: ProjectGame): string => {
  if (game === 'platinum') return 'Pokémon Platin'
  return game
}

export function normalizeProjectSettings(settings: Partial<ProjectSettings> | undefined | null): ProjectSettings {
  return {
    ...DEFAULT_PROJECT_SETTINGS,
    ...(settings ?? {}),
  }
}

export function getLevelCapByKey(key: string) {
  return PLATINUM_LEVEL_CAPS_DE.find((entry) => entry.key === key) ?? PLATINUM_LEVEL_CAPS_DE[0]
}
