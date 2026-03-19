import { db } from './db'
import { normalizeProject, normalizeProjectSettings } from './projectSettings'
import type { Encounter, EncounterOutcome, EncounterType, Location, LocationType, Project } from './types'

type BackupV1 = {
  version: 1
  exportedAt: number
  project: Project
  locations: Location[]
  encounters: Encounter[]
}

const BACKUP_VERSION = 1

const sanitizeFileName = (value: string): string => {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
}

const readFileAsText = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('JSON konnte nicht gelesen werden'))
    reader.readAsText(file, 'utf8')
  })
}

const normalizeLocationType = (value: unknown): LocationType => {
  if (value === 'route' || value === 'city' || value === 'other') return value
  return 'other'
}

const normalizeEncounterType = (value: unknown): EncounterType => {
  if (value === 'normal' || value === 'shiny' || value === 'static') return value
  return 'normal'
}

const normalizeEncounterOutcome = (value: unknown): EncounterOutcome => {
  if (value === 'caught' || value === 'not_caught') return value
  return 'not_caught'
}

const ensureUniqueImportName = async (baseName: string): Promise<string> => {
  let counter = 0
  while (true) {
    const candidate = counter === 0 ? `${baseName} (Import)` : `${baseName} (Import ${counter + 1})`
    const exists = await db.projects.where('name').equals(candidate).count()
    if (exists === 0) return candidate
    counter += 1
  }
}

export async function exportProject(projectId: string): Promise<void> {
  const [project, locations, encounters] = await Promise.all([
    db.projects.get(projectId),
    db.locations.where('projectId').equals(projectId).toArray(),
    db.encounters.where('projectId').equals(projectId).toArray(),
  ])

  if (!project) {
    throw new Error('Projekt nicht gefunden')
  }

  const backup: BackupV1 = {
    version: 1,
    exportedAt: Date.now(),
    project,
    locations,
    encounters,
  }

  const payload = JSON.stringify(backup, null, 2)
  const blob = new Blob([payload], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const safeName = sanitizeFileName(project.name) || 'Projekt'
  a.href = url
  a.download = `ProfessorNuzlock_${safeName}_Backup.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export async function importProjectBackup(file: File): Promise<{ projectId: string }> {
  const raw = await readFileAsText(file)

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('JSON konnte nicht gelesen werden')
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Ungültige Datei')
  }

  const data = parsed as Partial<BackupV1>
  if (data.version !== BACKUP_VERSION) {
    throw new Error('Backup-Format wird nicht unterstützt')
  }

  if (!data.project || typeof data.project !== 'object') {
    throw new Error('Ungültige Datei')
  }

  const locations = Array.isArray(data.locations) ? data.locations : []
  const encounters = Array.isArray(data.encounters) ? data.encounters : []

  const sourceProject = normalizeProject(data.project as Project)
  const projectName = await ensureUniqueImportName(sourceProject.name || 'Projekt')
  const newProjectId = crypto.randomUUID()

  const importedProject: Project = {
    id: newProjectId,
    name: projectName,
    game: sourceProject.game ?? 'platinum',
    createdAt: Date.now(),
    settings: normalizeProjectSettings(sourceProject.settings),
    challengeType: sourceProject.challengeType,
    players: sourceProject.players,
    selectedEvolutionByPokemonId: sourceProject.selectedEvolutionByPokemonId ?? {},
  }

  const locationIdMap = new Map<string, string>()
  const importedLocations: Location[] = locations.map((item, index) => {
    const oldId = String((item as Location).id ?? `location_${index}`)
    const newId = crypto.randomUUID()
    locationIdMap.set(oldId, newId)

    return {
      id: newId,
      projectId: newProjectId,
      name: String((item as Location).name ?? 'Unbenannter Ort'),
      type: normalizeLocationType((item as Location).type),
      order: Number.isFinite(Number((item as Location).order)) ? Number((item as Location).order) : index + 1,
      createdAt: Number((item as Location).createdAt) || Date.now(),
      notes: typeof (item as Location).notes === 'string' ? (item as Location).notes : '',
    }
  })

  const encounterIdMap = new Map<string, string>()
  for (const item of encounters) {
    const oldId = String((item as Encounter).id ?? crypto.randomUUID())
    encounterIdMap.set(oldId, crypto.randomUUID())
  }

  const importedEncounters: Encounter[] = encounters
    .map((item): Encounter | null => {
      const oldLocationId = String((item as Encounter).locationId ?? '')
      const mappedLocationId = locationIdMap.get(oldLocationId)
      if (!mappedLocationId) return null

      const oldEncounterId = String((item as Encounter).id ?? '')
      const mappedEncounterId = encounterIdMap.get(oldEncounterId)
      if (!mappedEncounterId) return null

      const pokemonId = Number((item as Encounter).pokemonId)
      if (!Number.isFinite(pokemonId)) return null

      const linkedEncounterId =
        typeof (item as Encounter).linkedEncounterId === 'string'
          ? encounterIdMap.get((item as Encounter).linkedEncounterId ?? '') ?? null
          : null

      const mappedEncounter: Encounter = {
        id: mappedEncounterId,
        projectId: newProjectId,
        locationId: mappedLocationId,
        createdAt: Number((item as Encounter).createdAt) || Date.now(),
        playerId:
          (item as Encounter).playerId === 'p1' || (item as Encounter).playerId === 'p2'
            ? (item as Encounter).playerId
            : undefined,
        linkedEncounterId,
        linkGroupId: typeof (item as Encounter).linkGroupId === 'string' ? String((item as Encounter).linkGroupId) : null,
        pokemonId,
        slug: String((item as Encounter).slug ?? ''),
        nameDe: String((item as Encounter).nameDe ?? ''),
        evolution_chain_id:
          (item as Encounter).evolution_chain_id === null ||
          (item as Encounter).evolution_chain_id === undefined
            ? null
            : Number((item as Encounter).evolution_chain_id),
        nickname: typeof (item as Encounter).nickname === 'string' ? (item as Encounter).nickname : '',
        encounterType: normalizeEncounterType((item as Encounter).encounterType),
        outcome: normalizeEncounterOutcome((item as Encounter).outcome),
        isDead: Boolean((item as Encounter).isDead),
        notes: typeof (item as Encounter).notes === 'string' ? (item as Encounter).notes : '',
      }

      return mappedEncounter
    })
    .filter((entry): entry is Encounter => entry !== null)

  await db.transaction('rw', db.projects, db.locations, db.encounters, async () => {
    await db.projects.add(importedProject)
    if (importedLocations.length > 0) await db.locations.bulkAdd(importedLocations)
    if (importedEncounters.length > 0) await db.encounters.bulkAdd(importedEncounters)
  })

  return { projectId: newProjectId }
}



