import { db } from './db'
import type { Location } from './types'

export function compareLocations(a: Location, b: Location): number {
  if (a.name === 'Starter' && b.name !== 'Starter') return -1
  if (b.name === 'Starter' && a.name !== 'Starter') return 1

  const orderA = Number.isFinite(a.order) && a.order > 0 ? a.order : Number.MAX_SAFE_INTEGER
  const orderB = Number.isFinite(b.order) && b.order > 0 ? b.order : Number.MAX_SAFE_INTEGER
  if (orderA !== orderB) return orderA - orderB

  return a.name.localeCompare(b.name, 'de')
}

export async function ensureStarterLocation(projectId: string): Promise<void> {
  await db.transaction('rw', db.locations, db.encounters, async () => {
    const locations = await db.locations.where('projectId').equals(projectId).toArray()
    const starterCandidates = locations.filter(
      (location) => location.name.trim().toLowerCase() === 'starter',
    )

    if (starterCandidates.length === 0) {
      const starter: Location = {
        id: crypto.randomUUID(),
        projectId,
        name: 'Starter',
        type: 'other',
        order: 0,
        createdAt: Date.now(),
        notes: '',
      }
      await db.locations.add(starter)
      return
    }

    const encounterCounts = new Map<string, number>()
    for (const candidate of starterCandidates) {
      const count = await db.encounters.where('locationId').equals(candidate.id).count()
      encounterCounts.set(candidate.id, count)
    }

    const sorted = starterCandidates
      .slice()
      .sort((a, b) => {
        const countDiff = (encounterCounts.get(b.id) ?? 0) - (encounterCounts.get(a.id) ?? 0)
        if (countDiff !== 0) return countDiff
        return a.createdAt - b.createdAt
      })

    const keeper = sorted[0]
    const duplicates = sorted.slice(1)

    if (keeper.name !== 'Starter' || keeper.order !== 0 || keeper.type !== 'other') {
      await db.locations.update(keeper.id, { name: 'Starter', order: 0, type: 'other' })
    }

    for (const duplicate of duplicates) {
      const duplicateEncounters = await db.encounters.where('locationId').equals(duplicate.id).toArray()
      for (const encounter of duplicateEncounters) {
        await db.encounters.update(encounter.id, { locationId: keeper.id })
      }
      await db.locations.delete(duplicate.id)
    }
  })
}



