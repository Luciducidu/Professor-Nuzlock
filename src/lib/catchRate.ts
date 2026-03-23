import type { ProjectGame } from './types'

export type CatchBall =
  | 'poke-ball'
  | 'great-ball'
  | 'ultra-ball'
  | 'quick-ball'
  | 'dusk-ball'
  | 'timer-ball'
  | 'repeat-ball'
  | 'net-ball'
  | 'dive-ball'
  | 'nest-ball'
  | 'master-ball'

export type CatchStatus = 'none' | 'sleep' | 'freeze' | 'paralysis' | 'poison' | 'burn'

export type CatchRateInput = {
  game: ProjectGame
  catchRate: number
  level: number
  currentHp: number
  maxHp: number
  ball: CatchBall
  status: CatchStatus
  isFirstTurn: boolean
  turnsPassed: number
  alreadyOwned: boolean
  isDarkArea: boolean
  isWaterEncounter: boolean
  targetTypes: string[]
}

export type CatchRateResult = {
  ballModifier: number
  statusModifier: number
  chancePerBall: number
  chanceAfter5: number
  chanceAfter10: number
  chanceAfter20: number
}

export function calculateCatchRate(input: CatchRateInput): CatchRateResult {
  const normalized = normalizeInput(input)
  const ballModifier = getBallModifier(normalized)
  const statusModifier = getStatusModifier(normalized.game, normalized.status)

  const chancePerBall =
    normalized.ball === 'master-ball'
      ? 1
      : normalized.game === 'bw2'
        ? calculateCatchChanceGen5(normalized, ballModifier, statusModifier)
        : calculateCatchChanceGen4(normalized, ballModifier, statusModifier)

  return {
    ballModifier,
    statusModifier,
    chancePerBall,
    chanceAfter5: cumulativeCatchChance(chancePerBall, 5),
    chanceAfter10: cumulativeCatchChance(chancePerBall, 10),
    chanceAfter20: cumulativeCatchChance(chancePerBall, 20),
  }
}

function normalizeInput(input: CatchRateInput): CatchRateInput {
  return {
    ...input,
    level: Math.max(1, Math.floor(input.level || 1)),
    currentHp: Math.max(1, Math.floor(input.currentHp || 1)),
    maxHp: Math.max(1, Math.floor(input.maxHp || 1)),
    turnsPassed: Math.max(1, Math.floor(input.turnsPassed || 1)),
    targetTypes: input.targetTypes ?? [],
  }
}

function getStatusModifier(game: ProjectGame, status: CatchStatus) {
  if (status === 'sleep' || status === 'freeze') {
    return game === 'bw2' ? 2.5 : 2
  }
  if (status === 'paralysis' || status === 'poison' || status === 'burn') {
    return 1.5
  }
  return 1
}

function getBallModifier(input: CatchRateInput) {
  switch (input.ball) {
    case 'great-ball':
      return 1.5
    case 'ultra-ball':
      return 2
    case 'quick-ball':
      return input.isFirstTurn ? (input.game === 'bw2' ? 5 : 4) : 1
    case 'dusk-ball':
      return input.isDarkArea ? 3.5 : 1
    case 'timer-ball':
      return input.game === 'bw2'
        ? Math.min(1 + (input.turnsPassed * 1229) / 4096, 4)
        : Math.min(1 + input.turnsPassed * 0.1, 4)
    case 'repeat-ball':
      return input.alreadyOwned ? 3 : 1
    case 'net-ball':
      return input.targetTypes.includes('water') || input.targetTypes.includes('bug') ? 3 : 1
    case 'dive-ball':
      return input.isWaterEncounter ? 3.5 : 1
    case 'nest-ball':
      return getNestBallModifier(input.game, input.level)
    case 'master-ball':
      return Number.POSITIVE_INFINITY
    default:
      return 1
  }
}

function getNestBallModifier(game: ProjectGame, level: number) {
  if (level >= 30) return 1
  if (game === 'bw2') {
    return Math.max(1, Math.floor((((41 - level) * 4096) / 10)) / 4096)
  }
  return Math.max(1, (40 - level) / 10)
}

function calculateCatchChanceGen4(input: CatchRateInput, ballModifier: number, statusModifier: number) {
  const modifiedRate = Math.floor(
    ((((3 * input.maxHp - 2 * input.currentHp) * input.catchRate * ballModifier) / (3 * input.maxHp)) * statusModifier),
  )

  if (modifiedRate >= 255) return 1
  if (modifiedRate <= 0) return 0

  const shakeRate = Math.floor(1048560 / Math.sqrt(Math.sqrt(16711680 / modifiedRate)))
  return Math.min(1, Math.max(0, Math.pow(shakeRate / 65536, 4)))
}

function calculateCatchChanceGen5(input: CatchRateInput, ballModifier: number, statusModifier: number) {
  const hpFactor = Math.floor((((3 * input.maxHp - 2 * input.currentHp) * 4096) / (3 * input.maxHp)))
  const modifiedRate = Math.floor(hpFactor * input.catchRate * ballModifier * statusModifier)

  if (modifiedRate >= 1044480) return 1
  if (modifiedRate <= 0) return 0

  return Math.min(1, Math.max(0, Math.pow(modifiedRate / 1044480, 0.75)))
}

function cumulativeCatchChance(chancePerBall: number, tries: number) {
  return 1 - Math.pow(1 - chancePerBall, tries)
}
