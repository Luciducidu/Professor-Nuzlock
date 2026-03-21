import Dexie, { type Table } from 'dexie'
import type { Encounter, EncounterDraft, EvolutionCacheEntry, Location, Project, Team } from './types'

class ProfessorNuzlockDB extends Dexie {
  projects!: Table<Project, string>
  locations!: Table<Location, string>
  encounters!: Table<Encounter, string>
  encounterDrafts!: Table<EncounterDraft, string>
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

    this.version(5).stores({
      projects: 'id, createdAt, game, name',
      locations: 'id, projectId, [projectId+order], [projectId+name], type, order, createdAt',
      encounters:
        'id, projectId, locationId, playerId, linkGroupId, linkedEncounterId, [projectId+locationId], [projectId+playerId], [projectId+pokemonId], [projectId+evolution_chain_id], createdAt, outcome',
      teams: 'id, &projectId, updatedAt',
      evoCache: 'chainId, updatedAt',
    })

    this.version(6).stores({
      projects: 'id, createdAt, game, name',
      locations: 'id, projectId, [projectId+order], [projectId+name], type, order, createdAt',
      encounters:
        'id, projectId, locationId, playerId, linkGroupId, linkedEncounterId, [projectId+locationId], [projectId+playerId], [projectId+pokemonId], [projectId+evolution_chain_id], createdAt, outcome',
      encounterDrafts: 'id, projectId, locationId, [projectId+locationId], updatedAt, draftType, status',
      teams: 'id, &projectId, updatedAt',
      evoCache: 'chainId, updatedAt',
    })
  }
}

export const db = new ProfessorNuzlockDB()

const LOCATION_NAME_MIGRATIONS: Record<string, string> = {
  'PokÃ©mon-Liga': 'Pokémon-Liga',
  'Floccesy Ranch': 'Dausing-Hof',
  'Virbank Complex': 'Virbank-Komplex',
  'Castelia Sewers': 'Stratos-Kanalisation',
  'Desert Resort': 'Wüstenresort',
  'Relic Castle': 'Alter Palast',
  'Lostlorn Forest': 'Hain der Täuschung',
  'Driftveil Drawbridge': 'Marea-Zugbrücke',
  'Relic Passage': 'Alter Fluchtweg',
  'Mistralton Cave': 'Panaero-Höhle',
  'Chargestone Cave': 'Elektrolithhöhle',
  'Celestial Tower': 'Turm des Himmels',
  'Strange House': 'Bizarro-Haus',
  'Reversal Mountain': 'Umkehrberg',
  'Undella Bay': 'Bucht von Ondula',
  'Village Bridge': 'Dorfbrücke',
  'Seaside Cave': 'Strandgrotte',
  'Giant Chasm': 'Riesengrotte',
  'Victory Road': 'Siegesstraße (S2/W2)',
  'Cave of Being': 'Beschwörungshöhle',
  'Clay Tunnel': 'Lehmtunnel',
  'Underground Ruins': 'Unterirdische Ruine',
  'Abundant Shrine': 'Schrein der Ernte',
  'Moor of Icirrus': 'Moor von Nevaio',
  'Dragonspiral Tower': 'Drachenstiege',
  'Pinwheel Forest': 'Ewigenwald',
  'Wellspring Cave': 'Höhle der Schulung',
  Dreamyard: 'Traumbrache',
  'P2 Laboratory': 'P2-Labor',
  'Twist Mountain': 'Wendelberg',
  'Nature Preserve': 'Naturschutzgebiet',
  'Route 2 Hidden Grotto': 'Route 2 Versteckte Lichtung',
  'Route 3 Hidden Grotto (Dunkelgras)': 'Route 3 Versteckte Lichtung (Dunkelgras)',
  'Route 3 Hidden Grotto (Teich)': 'Route 3 Versteckte Lichtung (Teich)',
  'Route 5 Hidden Grotto': 'Route 5 Versteckte Lichtung',
  'Route 6 Hidden Grotto (beim ZÃ¼chter)': 'Route 6 Versteckte Lichtung (beim Züchter)',
  'Route 6 Hidden Grotto (bei Mistralton Cave)': 'Route 6 Versteckte Lichtung (bei der Panaero-Höhle)',
  'Route 7 Hidden Grotto': 'Route 7 Versteckte Lichtung',
  'Route 9 Hidden Grotto': 'Route 9 Versteckte Lichtung',
  'Route 13 Hidden Grotto (bei den zerschneidbaren BÃ¤umen)':
    'Route 13 Versteckte Lichtung (bei den zerschneidbaren Bäumen)',
  'Route 13 Hidden Grotto (bei Giant Chasm)':
    'Route 13 Versteckte Lichtung (bei der Riesengrotte)',
  'Route 18 Hidden Grotto': 'Route 18 Versteckte Lichtung',
  'Route 22 Hidden Grotto': 'Route 22 Versteckte Lichtung',
  'Route 23 Hidden Grotto': 'Route 23 Versteckte Lichtung',
  'Pinwheel Forest Hidden Grotto (Innenbereich)': 'Ewigenwald Versteckte Lichtung (Innenbereich)',
  'Pinwheel Forest Hidden Grotto (AuÃŸenbereich)': 'Ewigenwald Versteckte Lichtung (Außenbereich)',
  'Giant Chasm Hidden Grotto': 'Riesengrotte Versteckte Lichtung',
  'Abundant Shrine Hidden Grotto (bei Youngster Wes)':
    'Schrein der Ernte Versteckte Lichtung (bei Youngster Wes)',
  'Abundant Shrine Hidden Grotto (rechts vom Schrein)':
    'Schrein der Ernte Versteckte Lichtung (rechts vom Schrein)',
  'Lostlorn Forest Hidden Grotto': 'Hain der Täuschung Versteckte Lichtung',
  'Floccesy Ranch Hidden Grotto': 'Dausing-Hof Versteckte Lichtung',
}

let dbReadyPromise: Promise<{ resetPerformed: boolean }> | null = null

export async function ensureDatabaseReady(): Promise<{ resetPerformed: boolean }> {
  if (dbReadyPromise) return dbReadyPromise

  dbReadyPromise = (async () => {
    try {
      await db.open()
      await migrateLocationNamesToGerman()
      return { resetPerformed: false }
    } catch (openError) {
      console.error('Dexie-Initialisierung fehlgeschlagen, versuche Reset', openError)
      await db.delete()
      await db.open()
      await migrateLocationNamesToGerman()
      return { resetPerformed: true }
    }
  })()

  return dbReadyPromise
}

export async function resetDatabase(): Promise<void> {
  await db.delete()
  window.location.reload()
}

async function migrateLocationNamesToGerman(): Promise<void> {
  const locations = await db.locations.toArray()
  const renamedLocations = locations
    .map((location) => {
      const translatedName = LOCATION_NAME_MIGRATIONS[location.name]
      if (!translatedName || translatedName === location.name) return null
      return { ...location, name: translatedName }
    })
    .filter((location): location is NonNullable<typeof location> => location !== null)

  if (renamedLocations.length === 0) return

  await db.locations.bulkPut(renamedLocations)
}

export async function deleteProjectCascade(projectId: string): Promise<void> {
  await db.transaction('rw', [db.projects, db.locations, db.encounters, db.encounterDrafts, db.teams], async () => {
    await db.encounters.where('projectId').equals(projectId).delete()
    await db.encounterDrafts.where('projectId').equals(projectId).delete()
    await db.locations.where('projectId').equals(projectId).delete()
    await db.teams.where('projectId').equals(projectId).delete()
    await db.projects.delete(projectId)
  })
}



