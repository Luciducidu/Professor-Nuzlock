import Dexie from 'dexie'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PokemonLabel } from '../components/PokemonLabel'
import { ProjectLayout } from '../components/ProjectLayout'
import { PLATINUM_LOCATIONS_DE } from '../data/platinumLocations.de'
import { db } from '../lib/db'
import { ensureStarterLocation } from '../lib/locations'
import type { Encounter, Location, LocationType } from '../lib/types'

const TYPE_LABELS: Record<LocationType, string> = {
  route: 'Route',
  city: 'Stadt',
  other: 'Sonstiges',
}

type LocationFilter = 'all' | 'without' | 'with' | 'routes' | 'cities'

type LocationSummary = {
  primary: Encounter | null
  extras: number
}

export function LocationsPage() {
  return (
    <ProjectLayout>
      {({ project, projectId }) => (
        <LocationsContent projectId={projectId} projectName={project.name} />
      )}
    </ProjectLayout>
  )
}

function LocationsContent({ projectId, projectName }: { projectId: string; projectName: string }) {
  const [locations, setLocations] = useState<Location[]>([])
  const [encounters, setEncounters] = useState<Encounter[]>([])
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<LocationFilter>('all')
  const [loading, setLoading] = useState(true)
  const [showImportModal, setShowImportModal] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    let active = true

    const loadData = async () => {
      await ensureStarterLocation(projectId)

      const [loadedLocations, loadedEncounters] = await Promise.all([
        db.locations
          .where('[projectId+order]')
          .between([projectId, Dexie.minKey], [projectId, Dexie.maxKey])
          .toArray(),
        db.encounters.where('projectId').equals(projectId).toArray(),
      ])

      if (!active) return

      const sortedLocations = loadedLocations
        .slice()
        .sort((a, b) => {
          if (a.name === 'Starter' && b.name !== 'Starter') return -1
          if (b.name === 'Starter' && a.name !== 'Starter') return 1
          if (a.order !== b.order) return a.order - b.order
          return a.name.localeCompare(b.name, 'de')
        })

      setLocations(sortedLocations)
      setEncounters(loadedEncounters)
      setLoading(false)
    }

    void loadData()

    return () => {
      active = false
    }
  }, [projectId, reloadToken])

  const summariesByLocation = useMemo(() => {
    const grouped = new Map<string, Encounter[]>()

    for (const encounter of encounters) {
      const list = grouped.get(encounter.locationId)
      if (list) {
        list.push(encounter)
      } else {
        grouped.set(encounter.locationId, [encounter])
      }
    }

    const summary = new Map<string, LocationSummary>()
    for (const [locationId, list] of grouped.entries()) {
      list.sort((a, b) => a.createdAt - b.createdAt)
      summary.set(locationId, {
        primary: list[0] ?? null,
        extras: Math.max(0, list.length - 1),
      })
    }

    return summary
  }, [encounters])

  const filteredLocations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return locations.filter((location) => {
      const matchesSearch =
        normalizedQuery.length === 0 || location.name.toLowerCase().includes(normalizedQuery)
      if (!matchesSearch) return false

      const hasEncounter = Boolean(summariesByLocation.get(location.id)?.primary)

      if (filter === 'without') return !hasEncounter
      if (filter === 'with') return hasEncounter
      if (filter === 'routes') return location.type === 'route'
      if (filter === 'cities') return location.type === 'city'

      return true
    })
  }, [locations, query, filter, summariesByLocation])

  const handleImportClick = async () => {
    const count = await db.locations.where('projectId').equals(projectId).count()
    if (count === 0) {
      await importSeedItems(projectId, false)
      setLoading(true)
      setReloadToken((value) => value + 1)
      return
    }

    setShowImportModal(true)
  }

  if (loading) {
    return <InfoCard text="Orte werden geladen..." />
  }

  return (
    <>
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Orte - {projectName}</h2>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleImportClick}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            Standardliste (Platin) importieren
          </button>
          <Link
            to={`/project/${projectId}/orte/neu`}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
          >
            Ort hinzufügen
          </Link>
        </div>

        <div className="mt-4">
          <label htmlFor="location-search" className="mb-2 block text-sm font-medium text-slate-700">
            Ort suchen...
          </label>
          <input
            id="location-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name eingeben"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-sky-500 transition focus:ring-2"
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <FilterButton label="Alle" active={filter === 'all'} onClick={() => setFilter('all')} />
          <FilterButton label="Ohne Begegnung" active={filter === 'without'} onClick={() => setFilter('without')} />
          <FilterButton label="Mit Begegnung" active={filter === 'with'} onClick={() => setFilter('with')} />
          <FilterButton label="Nur Routen" active={filter === 'routes'} onClick={() => setFilter('routes')} />
          <FilterButton label="Nur Städte" active={filter === 'cities'} onClick={() => setFilter('cities')} />
        </div>
      </section>

      <section className="mt-4 space-y-3">
        {filteredLocations.length === 0 ? (
          <InfoCard text="Keine Orte für die aktuelle Filterung gefunden." />
        ) : (
          filteredLocations.map((location) => {
            const summary = summariesByLocation.get(location.id)
            const primary = summary?.primary ?? null
            const extras = summary?.extras ?? 0
            const isFailedOrDead =
              primary?.outcome === 'not_caught' || (primary?.outcome === 'caught' && Boolean(primary.isDead))

            return (
              <Link
                key={location.id}
                to={`/project/${projectId}/orte/${location.id}`}
                className="block cursor-pointer select-none rounded-xl border border-slate-200 bg-white px-4 py-4 transition-colors hover:bg-slate-50"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xl font-bold text-slate-900">{location.name}</p>
                    <span className="mt-2 inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      {TYPE_LABELS[location.type]}
                    </span>
                  </div>

                  <div className="min-w-[280px] text-sm text-slate-700">
                    {primary ? (
                      <>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Begegnung</p>
                        <PokemonLabel
                          pokemonId={primary.pokemonId}
                          nameDe={primary.nameDe}
                          slug={primary.slug}
                          isDead={isFailedOrDead}
                          size="md"
                        />
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge>{primary.outcome === 'caught' ? 'Gefangen' : 'Nicht gefangen'}</Badge>
                          {isFailedOrDead ? (
                            <Badge tone="danger">Verstorben</Badge>
                          ) : null}
                        </div>
                        {extras > 0 ? <p className="mt-2 text-xs text-slate-500">+{extras} extra</p> : null}
                      </>
                    ) : (
                      <p className="text-slate-500">Keine Begegnung</p>
                    )}
                  </div>
                </div>
              </Link>
            )
          })
        )}
      </section>

      {showImportModal ? (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-900">Standardliste importieren</h2>
            <p className="mt-2 text-sm text-slate-600">Es existieren bereits Orte. Soll nur ergänzt werden?</p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={async () => {
                  await importSeedItems(projectId, true)
                  setLoading(true)
                  setReloadToken((value) => value + 1)
                  setShowImportModal(false)
                }}
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
              >
                Nur fehlende hinzufügen
              </button>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

async function importSeedItems(projectId: string, onlyMissing: boolean) {
  const existing = await db.locations.where('projectId').equals(projectId).toArray()
  const existingNames = new Set(existing.map((location) => location.name))

  const candidates = onlyMissing
    ? PLATINUM_LOCATIONS_DE.filter((seed) => !existingNames.has(seed.name))
    : PLATINUM_LOCATIONS_DE

  if (candidates.length === 0) return

  const now = Date.now()
  const rows: Location[] = candidates.map((seed) => ({
    id: crypto.randomUUID(),
    projectId,
    name: seed.name,
    type: seed.type,
    order: seed.order,
    createdAt: now,
    notes: '',
  }))

  await db.locations.bulkPut(rows)
}

function FilterButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
        active ? 'bg-slate-900 text-white' : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
      }`}
    >
      {label}
    </button>
  )
}

function InfoCard({ text }: { text: string }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">{text}</div>
}

function Badge({ children, tone = 'neutral' }: { children: string; tone?: 'neutral' | 'danger' }) {
  const cls = tone === 'danger' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${cls}`}>{children}</span>
}
