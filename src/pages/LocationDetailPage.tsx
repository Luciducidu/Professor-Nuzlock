import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { EncounterFormModal } from '../components/EncounterFormModal'
import { PokemonLabel } from '../components/PokemonLabel'
import { SoullinkEncounterPairModal } from '../components/SoullinkEncounterPairModal'
import { ProjectLayout } from '../components/ProjectLayout'
import { db, ensureDatabaseReady } from '../lib/db'
import { isSoulLinkProject } from '../lib/projectSettings'
import {
  deleteEncounterWithPartner,
  getPlayerName,
  getPrimarySoullinkPair,
  getSoullinkExtraPairs,
  type SoullinkEncounterPair,
} from '../lib/soullink'
import type { Encounter, EncounterType, Location, LocationType, Project } from '../lib/types'

const LOCATION_TYPE_OPTIONS: Array<{ value: LocationType; label: string }> = [
  { value: 'route', label: 'Route' },
  { value: 'city', label: 'Stadt' },
  { value: 'other', label: 'Sonstiges' },
]

const LOCATION_TYPE_LABELS: Record<LocationType, string> = {
  route: 'Route',
  city: 'Stadt',
  other: 'Sonstiges',
}

const ENCOUNTER_TYPE_LABELS: Record<EncounterType, string> = {
  normal: 'Normal',
  shiny: 'Shiny',
  static: 'Static',
  gift: 'Geschenk',
}

type PairModalMode = 'main' | 'extra' | null

export function LocationDetailPage() {
  return (
    <ProjectLayout>
      {({ project, projectId }) => <LocationDetailContent project={project} projectId={projectId} />}
    </ProjectLayout>
  )
}

function LocationDetailContent({ project, projectId }: { project: Project; projectId: string }) {
  const { locationId } = useParams<{ locationId: string }>()
  const navigate = useNavigate()

  const [location, setLocation] = useState<Location | null>(null)
  const [encountersAtLocation, setEncountersAtLocation] = useState<Encounter[]>([])
  const [projectEncounters, setProjectEncounters] = useState<Encounter[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [editMode, setEditMode] = useState(false)
  const [showLocationDeleteModal, setShowLocationDeleteModal] = useState(false)
  const [encounterModalOpen, setEncounterModalOpen] = useState(false)
  const [pairModalMode, setPairModalMode] = useState<PairModalMode>(null)
  const [editingEncounter, setEditingEncounter] = useState<Encounter | undefined>(undefined)
  const [editingPair, setEditingPair] = useState<SoullinkEncounterPair | null>(null)
  const [deleteEncounterTarget, setDeleteEncounterTarget] = useState<Encounter | null>(null)

  const [name, setName] = useState('')
  const [type, setType] = useState<LocationType>('route')
  const [orderValue, setOrderValue] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!locationId) return

    let active = true

    const loadData = async () => {
      try {
        await ensureDatabaseReady()

        const [loadedLocation, loadedLocationEncounters, loadedProjectEncounters] = await Promise.all([
          db.locations.get(locationId),
          getEncountersForLocation(projectId, locationId),
          db.encounters.where('projectId').equals(projectId).toArray(),
        ])

        if (!active) return

        if (!loadedLocation || loadedLocation.projectId !== projectId) {
          setLocation(null)
          setLoading(false)
          return
        }

        setLocation(loadedLocation)
        setEncountersAtLocation(loadedLocationEncounters)
        setProjectEncounters(loadedProjectEncounters)
        setName(loadedLocation.name)
        setType(loadedLocation.type)
        setOrderValue(String(loadedLocation.order))
        setNotes(loadedLocation.notes ?? '')
        setError('')
      } catch (loadError) {
        console.error(loadError)
        if (!active) return
        setError('Ort konnte nicht geladen werden.')
      } finally {
        if (!active) return
        setLoading(false)
      }
    }

    void loadData()

    return () => {
      active = false
    }
  }, [projectId, locationId])

  const refreshEncounters = async () => {
    if (!locationId) return

    try {
      await ensureDatabaseReady()
      const [loadedLocationEncounters, loadedProjectEncounters] = await Promise.all([
        getEncountersForLocation(projectId, locationId),
        db.encounters.where('projectId').equals(projectId).toArray(),
      ])

      setEncountersAtLocation(loadedLocationEncounters)
      setProjectEncounters(loadedProjectEncounters)
      setError('')
    } catch (refreshError) {
      console.error(refreshError)
      setError('Begegnungen konnten nicht aktualisiert werden.')
    }
  }

  const handleSaveLocation = async () => {
    if (!location) return

    const parsedOrder = Number(orderValue)
    await db.locations.update(location.id, {
      name: name.trim(),
      type,
      order: Number.isFinite(parsedOrder) ? parsedOrder : location.order,
      notes: notes.trim(),
    })

    const refreshed = await db.locations.get(location.id)
    if (refreshed) {
      setLocation(refreshed)
      setName(refreshed.name)
      setType(refreshed.type)
      setOrderValue(String(refreshed.order))
      setNotes(refreshed.notes ?? '')
    }

    setEditMode(false)
  }

  const handleDeleteLocation = async () => {
    if (!location) return

    const encountersToDelete = await getEncountersForLocation(projectId, location.id)
    if (encountersToDelete.length > 0) {
      await db.encounters.bulkDelete(encountersToDelete.map((entry) => entry.id))
    }
    await db.locations.delete(location.id)
    navigate(`/project/${projectId}/orte`)
  }

  const handleDeleteEncounter = async () => {
    if (!deleteEncounterTarget) return
    await deleteEncounterWithPartner(project, deleteEncounterTarget)
    setDeleteEncounterTarget(null)
    await refreshEncounters()
  }

  if (loading) return <InfoCard text="Ort wird geladen..." />
  if (error) return <InfoCard text={error} />
  if (!location) return <InfoCard text="Der Ort existiert nicht oder gehört zu einem anderen Projekt." />

  const soulLinkMode = isSoulLinkProject(project)
  const soulLinkPair = getPrimarySoullinkPair(encountersAtLocation)
  const soulLinkExtraPairs = getSoullinkExtraPairs(encountersAtLocation)

  return (
    <>
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-2xl font-bold text-slate-900">{location.name}</h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEditMode((prev) => !prev)}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Bearbeiten
            </button>
            <button
              type="button"
              onClick={() => setShowLocationDeleteModal(true)}
              className="rounded-md bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-500"
            >
              Löschen
            </button>
          </div>
        </div>

        {!editMode ? (
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <InfoItem label="Name" value={location.name} />
            <InfoItem label="Typ" value={LOCATION_TYPE_LABELS[location.type]} />
            <InfoItem label="Sortierung" value={String(location.order)} />
            <InfoItem label="Notiz" value={location.notes?.trim() ? location.notes : 'Keine Notiz'} />
          </dl>
        ) : (
          <div className="space-y-4">
            <div>
              <label htmlFor="edit-name" className="mb-2 block text-sm font-medium text-slate-700">
                Name
              </label>
              <input
                id="edit-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-sky-500 transition focus:ring-2"
              />
            </div>
            <div>
              <label htmlFor="edit-type" className="mb-2 block text-sm font-medium text-slate-700">
                Typ
              </label>
              <select
                id="edit-type"
                value={type}
                onChange={(event) => setType(event.target.value as LocationType)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-sky-500 transition focus:ring-2"
              >
                {LOCATION_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="edit-order" className="mb-2 block text-sm font-medium text-slate-700">
                Sortierung
              </label>
              <input
                id="edit-order"
                value={orderValue}
                onChange={(event) => setOrderValue(event.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-sky-500 transition focus:ring-2"
              />
            </div>
            <div>
              <label htmlFor="edit-notes" className="mb-2 block text-sm font-medium text-slate-700">
                Notiz
              </label>
              <textarea
                id="edit-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={4}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-sky-500 transition focus:ring-2"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSaveLocation}
                disabled={name.trim().length === 0}
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                Speichern
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditMode(false)
                  setName(location.name)
                  setType(location.type)
                  setOrderValue(String(location.order))
                  setNotes(location.notes ?? '')
                }}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Abbrechen
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="mt-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-2xl font-bold text-slate-900">Begegnungen</h2>
          <div className="flex flex-wrap gap-2">
            {soulLinkMode ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setEditingPair(null)
                    setPairModalMode('main')
                  }}
                  className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                >
                  Hauptbegegnung erfassen
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingPair(null)
                    setPairModalMode('extra')
                  }}
                  className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Extra-Begegnung hinzufügen
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setEditingEncounter(undefined)
                  setEncounterModalOpen(true)
                }}
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Begegnung hinzufügen
              </button>
            )}
          </div>
        </div>

        {soulLinkMode ? (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Hauptbegegnung</h3>
              <div className="mt-3 grid gap-4 lg:grid-cols-2">
                <SoullinkEncounterCard
                  title={getPlayerName(project, 'p1')}
                  encounter={soulLinkPair.p1}
                  onEdit={() => {
                    setEditingPair(
                      soulLinkPair.p1 && soulLinkPair.p2
                        ? { linkGroupId: soulLinkPair.p1.linkGroupId ?? '', p1: soulLinkPair.p1, p2: soulLinkPair.p2 }
                        : null,
                    )
                    setPairModalMode('main')
                  }}
                  onDelete={() => soulLinkPair.p1 && setDeleteEncounterTarget(soulLinkPair.p1)}
                />
                <SoullinkEncounterCard
                  title={getPlayerName(project, 'p2')}
                  encounter={soulLinkPair.p2}
                  onEdit={() => {
                    setEditingPair(
                      soulLinkPair.p1 && soulLinkPair.p2
                        ? { linkGroupId: soulLinkPair.p1.linkGroupId ?? '', p1: soulLinkPair.p1, p2: soulLinkPair.p2 }
                        : null,
                    )
                    setPairModalMode('main')
                  }}
                  onDelete={() => soulLinkPair.p2 && setDeleteEncounterTarget(soulLinkPair.p2)}
                />
              </div>
            </div>

            <div>
              <h3 className="text-base font-semibold text-slate-900">Extra-Begegnungen</h3>
              {soulLinkExtraPairs.length === 0 ? (
                <p className="mt-2 text-sm text-slate-600">Keine Extra-Begegnungen gespeichert.</p>
              ) : (
                <div className="mt-3 space-y-4">
                  {soulLinkExtraPairs.map((pair) => (
                    <div key={pair.linkGroupId} className="grid gap-4 lg:grid-cols-2">
                      <SoullinkEncounterCard
                        title={getPlayerName(project, 'p1')}
                        encounter={pair.p1}
                        onEdit={() => {
                          setEditingPair(pair)
                          setPairModalMode('extra')
                        }}
                        onDelete={() => setDeleteEncounterTarget(pair.p1)}
                      />
                      <SoullinkEncounterCard
                        title={getPlayerName(project, 'p2')}
                        encounter={pair.p2}
                        onEdit={() => {
                          setEditingPair(pair)
                          setPairModalMode('extra')
                        }}
                        onDelete={() => setDeleteEncounterTarget(pair.p2)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : encountersAtLocation.length === 0 ? (
          <p className="text-sm text-slate-600">Noch keine Begegnungen gespeichert.</p>
        ) : (
          <div className="space-y-3">
            {encountersAtLocation.map((encounter) => (
              <EncounterArticle
                key={encounter.id}
                encounter={encounter}
                onEdit={() => {
                  setEditingEncounter(encounter)
                  setEncounterModalOpen(true)
                }}
                onDelete={() => setDeleteEncounterTarget(encounter)}
              />
            ))}
          </div>
        )}
      </section>

      {pairModalMode ? (
        <SoullinkEncounterPairModal
          project={project}
          projectId={projectId}
          locationId={location.id}
          encountersInProject={projectEncounters}
          initialPair={
            pairModalMode === 'main'
              ? { p1: editingPair?.p1 ?? soulLinkPair.p1, p2: editingPair?.p2 ?? soulLinkPair.p2 }
              : { p1: editingPair?.p1 ?? null, p2: editingPair?.p2 ?? null }
          }
          title={pairModalMode === 'main' ? 'Soullink-Hauptbegegnung' : 'Soullink-Extra-Begegnung'}
          allowedEncounterTypes={pairModalMode === 'main' ? ['normal'] : ['shiny', 'static', 'gift']}
          defaultEncounterType={pairModalMode === 'main' ? 'normal' : 'shiny'}
          onClose={() => {
            setPairModalMode(null)
            setEditingPair(null)
          }}
          onSaved={refreshEncounters}
        />
      ) : null}

      {encounterModalOpen ? (
        <EncounterFormModal
          key={editingEncounter?.id ?? 'new'}
          project={project}
          projectId={projectId}
          locationId={location.id}
          encountersInProject={projectEncounters}
          initialEncounter={editingEncounter}
          onClose={() => {
            setEncounterModalOpen(false)
            setEditingEncounter(undefined)
          }}
          onSaved={refreshEncounters}
        />
      ) : null}

      {showLocationDeleteModal ? (
        <ConfirmModal
          title="Ort löschen"
          text="Möchtest du diesen Ort wirklich löschen?"
          onConfirm={handleDeleteLocation}
          onCancel={() => setShowLocationDeleteModal(false)}
        />
      ) : null}

      {deleteEncounterTarget ? (
        <ConfirmModal
          title="Begegnung löschen"
          text={`Möchtest du die Begegnung mit ${deleteEncounterTarget.nameDe} wirklich löschen?`}
          onConfirm={handleDeleteEncounter}
          onCancel={() => setDeleteEncounterTarget(null)}
        />
      ) : null}
    </>
  )
}

function ConfirmModal({
  title,
  text,
  onConfirm,
  onCancel,
}: {
  title: string
  text: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <p className="mt-2 text-sm text-slate-600">{text}</p>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-md bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-500"
          >
            Löschen
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  )
}

function EncounterArticle({
  encounter,
  onEdit,
  onDelete,
  titlePrefix = '',
}: {
  encounter: Encounter
  onEdit: () => void
  onDelete: () => void
  titlePrefix?: string
}) {
  const isFailedOrDead = encounter.outcome === 'not_caught' || (encounter.outcome === 'caught' && encounter.isDead)

  return (
    <article className="rounded-lg border border-slate-200 px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {titlePrefix ? <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{titlePrefix}</p> : null}
          <PokemonLabel
            pokemonId={encounter.pokemonId}
            nameDe={encounter.nameDe}
            slug={encounter.slug}
            isDead={isFailedOrDead}
            size="lg"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge>{ENCOUNTER_TYPE_LABELS[encounter.encounterType]}</Badge>
            <Badge>{encounter.outcome === 'caught' ? 'Gefangen' : 'Nicht gefangen'}</Badge>
            {isFailedOrDead ? <Badge tone="danger">Verstorben</Badge> : null}
            {encounter.linkedEncounterId ? <Badge>Mit Partner verknüpft</Badge> : null}
          </div>
          {encounter.nickname ? <p className="mt-2 text-sm text-slate-700">Spitzname: {encounter.nickname}</p> : null}
          {encounter.notes ? <p className="mt-1 text-sm text-slate-600">Notiz: {encounter.notes}</p> : null}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Bearbeiten
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-md bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-rose-500"
          >
            Löschen
          </button>
        </div>
      </div>
    </article>
  )
}

function SoullinkEncounterCard({
  title,
  encounter,
  onEdit,
  onDelete,
}: {
  title: string
  encounter: Encounter | null
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Bearbeiten
          </button>
          {encounter ? (
            <button
              type="button"
              onClick={onDelete}
              className="rounded-md bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-rose-500"
            >
              Löschen
            </button>
          ) : null}
        </div>
      </div>
      {encounter ? (
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-4">
          <PokemonLabel
            pokemonId={encounter.pokemonId}
            nameDe={encounter.nameDe}
            slug={encounter.slug}
            isDead={encounter.outcome === 'not_caught' || (encounter.outcome === 'caught' && encounter.isDead)}
            size="lg"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge>{ENCOUNTER_TYPE_LABELS[encounter.encounterType]}</Badge>
            <Badge>{encounter.outcome === 'caught' ? 'Gefangen' : 'Nicht gefangen'}</Badge>
            {encounter.outcome === 'not_caught' || encounter.isDead ? <Badge tone="danger">Verstorben</Badge> : null}
            {encounter.linkedEncounterId ? <Badge>Mit Partner verknüpft</Badge> : null}
          </div>
          {encounter.nickname ? <p className="mt-2 text-sm text-slate-700">Spitzname: {encounter.nickname}</p> : null}
          {encounter.notes ? <p className="mt-1 text-sm text-slate-600">Notiz: {encounter.notes}</p> : null}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-4 text-sm text-slate-500">
          Keine Begegnung
        </div>
      )}
    </div>
  )
}

function InfoCard({ text }: { text: string }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">{text}</div>
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 px-3 py-2">
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 font-medium text-slate-900">{value}</dd>
    </div>
  )
}

function Badge({ children, tone = 'neutral' }: { children: string; tone?: 'neutral' | 'danger' }) {
  const cls = tone === 'danger' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${cls}`}>{children}</span>
}

async function getEncountersForLocation(projectId: string, locationId: string): Promise<Encounter[]> {
  const rows = await db.encounters
    .where('locationId')
    .equals(locationId)
    .filter((encounter) => encounter.projectId === projectId)
    .toArray()

  rows.sort((a, b) => a.createdAt - b.createdAt)
  return rows
}
