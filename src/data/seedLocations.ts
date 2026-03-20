import type { LocationType } from '../lib/types'

export type SeedLocation = {
  name: string
  type: LocationType
  order: number
  notes?: string
}
