import Dexie from 'dexie'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PokemonLabel } from '../components/PokemonLabel'
import { ProjectLayout } from '../components/ProjectLayout'
import { BW2_HIDDEN_GROTTO_LOCATIONS_DE } from '../data/bw2HiddenGrottoLocations.de'
import type { SeedLocation } from '../data/seedLocations'
import { db } from '../lib/db'
import { getEncounterDraftsForProject } from '../lib/encounterDrafts'
import { compareLocations, ensureStarterLocation } from '../lib/locations'
import { formatGameName, getLocationSeedsForGame, isSoulLinkProject } from '../lib/projectSettings'
import { getPlayerName, getPrimarySoullinkPair, getSoullinkExtraPairs, isSoullinkEncounterDead } from '../lib/soullink'
import type { Encounter, EncounterDraft, Location, LocationType, Project } from '../lib/types'

const TYPE_LABELS: Record<LocationType, string> = {
  route: 'Route',
  city: 'Stadt',
  other: 'Sonstiges',
}

type LocationFilter = 'all' | 'without' | 'with' | 'routes' | 'cities'

export function LocationsPage() {
  return (
    <ProjectLayout>
      {({ project, projectId }) => <LocationsContent project={project} projectId={projectId} projectName={project.name} />}
    </ProjectLayout>
  )
}

function LocationsContent({ project, projectId, projectName }: { project: Project; projectId: string; projectName: string }) {
  const [locations, setLocations] = useState<Location[]>([])
  const [encounters, setEncounters] = useState<Encounter[]>([])
  const [drafts, setDrafts] = useState<EncounterDraft[]>([])
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<LocationFilter>('all')
  const [loading, setLoading] = useState(true)
  const [showImportModal, setShowImportModal] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)
  const [importNotice, setImportNotice] = useState('')

  useEffect(() => {
    let active = true

    const loadData = async () => {
      await ensureStarterLocation(projectId)

      const [loadedLocations, loadedEncounters, loadedDrafts] = await Promise.all([
        db.locations
          .where('[projectId+order]')
          .between([projectId, Dexie.minKey], [projectId, Dexie.maxKey])
          .toArray(),
        db.encounters.where('projectId').equals(projectId).toArray(),
        getEncounterDraftsForProject(projectId),
      ])

      if (!active) return

      const sortedLocations = loadedLocations.slice().sort(compareLocations)

      setLocations(sortedLocations)
      setEncounters(loadedEncounters)
      setDrafts(loadedDrafts)
      setLoading(false)
    }

    void loadData()

    return () => {
      active = false
    }
  }, [projectId, reloadToken])

  const encountersByLocation = useMemo(() => {
    const grouped = new Map<string, Encounter[]>()

    for (const encounter of encounters) {
      const list = grouped.get(encounter.locationId)
      if (list) {
        list.push(encounter)
      } else {
        grouped.set(encounter.locationId, [encounter])
      }
    }

    for (const list of grouped.values()) {
      list.sort((a, b) => a.createdAt - b.createdAt)
    }

    return grouped
  }, [encounters])

  const draftsByLocation = useMemo(() => {
    const grouped = new Map<string, EncounterDraft[]>()

    for (const draft of drafts) {
      const list = grouped.get(draft.locationId)
      if (list) {
        list.push(draft)
      } else {
        grouped.set(draft.locationId, [draft])
      }
    }

    for (const list of grouped.values()) {
      list.sort((a, b) => a.updatedAt - b.updatedAt)
    }

    return grouped
  }, [drafts])

  const filteredLocations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return locations.filter((location) => {
      const matchesSearch =
        normalizedQuery.length === 0 || location.name.toLowerCase().includes(normalizedQuery)
      if (!matchesSearch) return false

      const hasEncounter = (encountersByLocation.get(location.id) ?? []).length > 0

      if (filter === 'without') return !hasEncounter
      if (filter === 'with') return hasEncounter
      if (filter === 'routes') return location.type === 'route'
      if (filter === 'cities') return location.type === 'city'

      return true
    })
  }, [encountersByLocation, filter, locations, query])

  const handleImportClick = async () => {
    const count = await db.locations.where('projectId').equals(projectId).count()
    if (count === 0) {
      const imported = await importSeedItems(projectId, getLocationSeedsForGame(project.game), false)
      setImportNotice(imported > 0 ? `${imported} Orte wurden importiert.` : 'Keine neuen Orte importiert.')
      setLoading(true)
      setReloadToken((value) => value + 1)
      return
    }

    setShowImportModal(true)
  }

  const handleHiddenGrottoImport = async () => {
    const imported = await importSeedItems(projectId, BW2_HIDDEN_GROTTO_LOCATIONS_DE, true)
    setImportNotice(
      imported > 0 ? `${imported} Hidden Grottoes wurden importiert.` : 'Keine neuen Hidden Grottoes importiert.',
    )
    setLoading(true)
    setReloadToken((value) => value + 1)
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
            Standardliste ({formatGameName(project.game)}) importieren
          </button>
          {project.game === 'bw2' ? (
            <button
              type="button"
              onClick={() => void handleHiddenGrottoImport()}
              className="rounded-md border border-sky-300 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-800 transition-colors hover:bg-sky-100"
            >
              Hidden Grottoes importieren
            </button>
          ) : null}
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

        {importNotice ? (
          <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {importNotice}
          </div>
        ) : null}
      </section>

      <section className="mt-4 space-y-3">
        {filteredLocations.length === 0 ? (
          <InfoCard text="Keine Orte für die aktuelle Filterung gefunden." />
        ) : (
          filteredLocations.map((location) => {
            const locationEncounters = encountersByLocation.get(location.id) ?? []
            const locationDrafts = draftsByLocation.get(location.id) ?? []
            const primary = locationEncounters[0] ?? null
            const extras = Math.max(0, locationEncounters.length - 1)
            const soulLinkPair = getPrimarySoullinkPair(locationEncounters)
            const soulLinkExtras = getSoullinkExtraPairs(locationEncounters)
            const hasDraft = locationDrafts.length > 0
            const hasIncompleteDraft = locationDrafts.some((draft) => !draft.isComplete)
            const hasInvalidDraft = locationDrafts.some((draft) => draft.isComplete && !draft.finalSaveAllowed)
            const mainDraft = locationDrafts.find((draft) => draft.draftType === 'main') ?? null
            const extraDraft = locationDrafts.find((draft) => draft.draftType === 'extra') ?? null
            const singleDraft = locationDrafts.find((draft) => draft.draftType === 'single') ?? null
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
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                        {TYPE_LABELS[location.type]}
                      </span>
                      {location.name.includes('Versteckte Lichtung') ? (
                        <span className="inline-block rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">
                          BW2 Spezial
                        </span>
                      ) : null}
                      {hasDraft ? <Badge tone="info">Entwurf vorhanden</Badge> : null}
                      {hasIncompleteDraft ? <Badge tone="warning">Unvollständig</Badge> : null}
                      {!hasIncompleteDraft && hasInvalidDraft ? <Badge tone="danger">Nicht final speicherbar</Badge> : null}
                    </div>
                  </div>

                  <div className="min-w-[280px] text-sm text-slate-700">
                    {isSoulLinkProject(project) ? (
                      <div className="grid gap-3 lg:grid-cols-2">
                        <PlayerLocationSummary
                          title={getPlayerName(project, 'p1')}
                          encounter={soulLinkPair.p1}
                          hasDraft={Boolean(mainDraft?.pair?.p1 || extraDraft?.pair?.p1)}
                        />
                        <PlayerLocationSummary
                          title={getPlayerName(project, 'p2')}
                          encounter={soulLinkPair.p2}
                          hasDraft={Boolean(mainDraft?.pair?.p2 || extraDraft?.pair?.p2)}
                        />
                        {soulLinkExtras.length > 0 ? (
                          <p className="text-xs text-slate-500 lg:col-span-2">+{soulLinkExtras.length} Extra-Begegnungen</p>
                        ) : null}
                      </div>
                    ) : primary ? (
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
                          {isFailedOrDead ? <Badge tone="danger">Verstorben</Badge> : null}
                          {singleDraft ? <Badge tone="info">Entwurf vorhanden</Badge> : null}
                        </div>
                        {extras > 0 ? <p className="mt-2 text-xs text-slate-500">+{extras} extra</p> : null}
                      </>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-slate-500">Keine Begegnung</p>
                        {singleDraft ? <Badge tone="info">Entwurf vorhanden</Badge> : null}
                      </div>
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
                  const imported = await importSeedItems(projectId, getLocationSeedsForGame(project.game), true)
                  setImportNotice(imported > 0 ? `${imported} Orte wurden importiert.` : 'Keine neuen Orte importiert.')
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

async function importSeedItems(projectId: string, seeds: readonly SeedLocation[], onlyMissing: boolean) {
  const existing = await db.locations.where('projectId').equals(projectId).toArray()
  const existingNames = new Set(existing.map((location) => location.name))

  const candidates = onlyMissing
    ? seeds.filter((seed) => !existingNames.has(seed.name))
    : seeds.filter((seed) => !existingNames.has(seed.name))

  if (candidates.length === 0) return 0

  const now = Date.now()
  const rows: Location[] = candidates.map((seed) => ({
    id: crypto.randomUUID(),
    projectId,
    name: seed.name,
    type: seed.type,
    order: seed.order,
    createdAt: now,
    notes: seed.notes ?? '',
  }))

  await db.locations.bulkPut(rows)
  return rows.length
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

function PlayerLocationSummary({
  title,
  encounter,
  hasDraft,
}: {
  title: string
  encounter: Encounter | null
  hasDraft: boolean
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      {encounter ? (
        <>
          <PokemonLabel
            pokemonId={encounter.pokemonId}
            nameDe={encounter.nameDe}
            slug={encounter.slug}
            isDead={isSoullinkEncounterDead(encounter)}
            size="md"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge>{encounter.outcome === 'caught' ? 'Gefangen' : 'Nicht gefangen'}</Badge>
            {isSoullinkEncounterDead(encounter) ? <Badge tone="danger">Verstorben</Badge> : null}
            {encounter.linkedEncounterId ? <Badge>Mit Partner verknüpft</Badge> : null}
            {hasDraft ? <Badge tone="info">Entwurf</Badge> : null}
          </div>
        </>
      ) : (
        <div className="space-y-2">
          <p className="text-slate-500">Keine Begegnung</p>
          {hasDraft ? <Badge tone="info">Entwurf</Badge> : null}
        </div>
      )}
    </div>
  )
}

function InfoCard({ text }: { text: string }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">{text}</div>
}

function Badge({
  children,
  tone = 'neutral',
}: {
  children: string
  tone?: 'neutral' | 'danger' | 'info' | 'warning'
}) {
  const cls =
    tone === 'danger'
      ? 'bg-rose-100 text-rose-700'
      : tone === 'info'
        ? 'bg-sky-100 text-sky-700'
        : tone === 'warning'
          ? 'bg-amber-100 text-amber-800'
          : 'bg-slate-100 text-slate-700'
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${cls}`}>{children}</span>
}
