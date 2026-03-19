import Dexie, { type Table } from 'dexie'
import type { Encounter, EvolutionCacheEntry, Location, Project, Team } from './types'

class ProfessorNuzlockDB extends Dexie {
  projects!: Table<Project, string>
  locations!: Table<Location, string>
  encounters!: Table<Encounter, string>
  teams!: Table<Team, string>
  evoCache!: Table<EvolutionCacheEntry, number>

  constructor() {
    super('ProfessorNuzlockDB')

    this.version(1).stores({
      projects: 'id, createdAt, game, name',
      locations: '++id, projectId',
      encounters: '++id, projectId, locationId',
    })

    this.version(2).stores({
      projects: 'id, createdAt, game, name',
      locations: 'id, projectId, [projectId+order], [projectId+name], type, order, createdAt',
      encounters: '++id, projectId, locationId',
    })

    this.version(3).stores({
      projects: 'id, createdAt, game, name',
      locations: 'id, projectId, [projectId+order], [projectId+name], type, order, createdAt',
      encounters:
        'id, projectId, locationId, [projectId+locationId], [projectId+pokemonId], [projectId+evolution_chain_id], createdAt, outcome',
    })

    this.version(4).stores({
      projects: 'id, createdAt, game, name',
      locations: 'id, projectId, [projectId+order], [projectId+name], type, order, createdAt',
      encounters:
        'id, projectId, locationId, [projectId+locationId], [projectId+pokemonId], [projectId+evolution_chain_id], createdAt, outcome',
      teams: 'id, &projectId, updatedAt',
      evoCache: 'chainId, updatedAt',
    })
  }
}

export const db = new ProfessorNuzlockDB()

let dbReadyPromise: Promise<{ resetPerformed: boolean }> | null = null

export async function ensureDatabaseReady(): Promise<{ resetPerformed: boolean }> {
  if (dbReadyPromise) return dbReadyPromise

  dbReadyPromise = (async () => {
    try {
      await db.open()
      return { resetPerformed: false }
    } catch (openError) {
      console.error('Dexie-Initialisierung fehlgeschlagen, versuche Reset', openError)
      await db.delete()
      await db.open()
      return { resetPerformed: true }
    }
  })()

  return dbReadyPromise
}

export async function resetDatabase(): Promise<void> {
  await db.delete()
  window.location.reload()
}



