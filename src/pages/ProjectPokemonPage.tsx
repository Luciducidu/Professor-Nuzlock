import { useEffect, useMemo, useState } from 'react'
import { EncounterFormModal } from '../components/EncounterFormModal'
import { PokemonLabel } from '../components/PokemonLabel'
import { usePokedex } from '../components/PokedexProvider'
import { PokemonSearch } from '../components/PokemonSearch'
import { SoullinkEncounterPairModal } from '../components/SoullinkEncounterPairModal'
import { ProjectLayout } from '../components/ProjectLayout'
import { db } from '../lib/db'
import { resolveEvolutionOptionById } from '../lib/evolution'
import { isSoulLinkProject } from '../lib/projectSettings'
import { checkDupesClauseForPokemon } from '../lib/rules'
import { deleteEncounterWithPartner, updateEncounterDeathState } from '../lib/soullink'
import type { Encounter, EncounterType, PokemonIndexEntry, Project } from '../lib/types'

type TabKey = 'caught' | 'deathbox' | 'check'

const ENCOUNTER_TYPE_LABELS: Record<EncounterType, string> = {
  normal: 'Normal',
  shiny: 'Shiny',
  static: 'Static',
  gift: 'Geschenk',
}

export function ProjectPokemonPage() {
  return (
    <ProjectLayout>
      {({ project, projectId }) => <ProjectPokemonContent project={project} projectId={projectId} />}
    </ProjectLayout>
  )
}

function ProjectPokemonContent({ project, projectId }: { project: Project; projectId: string }) {
  const { openPokedex } = usePokedex()
  const [encounters, setEncounters] = useState<Encounter[]>([])
  const [locationNameById, setLocationNameById] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  const [activeTab, setActiveTab] = useState<TabKey>('caught')
  const [search, setSearch] = useState('')
  const [selectedPokemon, setSelectedPokemon] = useState<PokemonIndexEntry | null>(null)

  const [editingEncounter, setEditingEncounter] = useState<Encounter | undefined>(undefined)
  const [encounterModalOpen, setEncounterModalOpen] = useState(false)
  const [editingPairLead, setEditingPairLead] = useState<Encounter | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Encounter | null>(null)

  useEffect(() => {
    let active = true

    const loadData = async () => {
      const [loadedEncounters, loadedLocations] = await Promise.all([
        db.encounters.where('projectId').equals(projectId).toArray(),
        db.locations.where('projectId').equals(projectId).toArray(),
      ])

      if (!active) return

      const locationMap: Record<string, string> = {}
      for (const location of loadedLocations) {
        locationMap[location.id] = location.name
      }

      setEncounters(loadedEncounters)
      setLocationNameById(locationMap)
      setLoading(false)
    }

    void loadData()

    return () => {
      active = false
    }
  }, [projectId])

  const refreshData = async () => {
    const loadedEncounters = await db.encounters.where('projectId').equals(projectId).toArray()
    setEncounters(loadedEncounters)
  }

  const resolveEncounterDisplay = (encounter: Encounter) => {
    const selectedEvolutionId = project.selectedEvolutionByPokemonId?.[encounter.pokemonId]
    return (selectedEvolutionId ? resolveEvolutionOptionById(selectedEvolutionId) : null) ?? {
      pokemonId: encounter.pokemonId,
      slug: encounter.slug,
      nameDe: encounter.nameDe,
      evolution_chain_id: encounter.evolution_chain_id,
    }
  }

  const caughtEncounters = useMemo(
    () => encounters.filter((encounter) => encounter.outcome === 'caught').sort((a, b) => b.createdAt - a.createdAt),
    [encounters],
  )

  const deathboxEncounters = useMemo(() => caughtEncounters.filter((encounter) => encounter.isDead), [caughtEncounters])

  const filteredCaught = useMemo(() => {
    const normalized = search.trim().toLowerCase()
    if (!normalized) return caughtEncounters

    return caughtEncounters.filter((encounter) => {
      const resolved = resolveEncounterDisplay(encounter)
      return (
        encounter.nameDe.toLowerCase().includes(normalized) ||
        encounter.slug.toLowerCase().includes(normalized) ||
        (encounter.nickname ?? '').toLowerCase().includes(normalized) ||
        resolved.nameDe.toLowerCase().includes(normalized) ||
        resolved.slug.toLowerCase().includes(normalized)
      )
    })
  }, [caughtEncounters, project.selectedEvolutionByPokemonId, search])

  const filteredDeathbox = useMemo(() => {
    const normalized = search.trim().toLowerCase()
    if (!normalized) return deathboxEncounters

    return deathboxEncounters.filter((encounter) => {
      const resolved = resolveEncounterDisplay(encounter)
      return (
        encounter.nameDe.toLowerCase().includes(normalized) ||
        encounter.slug.toLowerCase().includes(normalized) ||
        (encounter.nickname ?? '').toLowerCase().includes(normalized) ||
        resolved.nameDe.toLowerCase().includes(normalized) ||
        resolved.slug.toLowerCase().includes(normalized)
      )
    })
  }, [deathboxEncounters, project.selectedEvolutionByPokemonId, search])

  const checkResult = useMemo(() => {
    if (!selectedPokemon) return null

    return checkDupesClauseForPokemon({
      project,
      pokemon: selectedPokemon,
      encounters,
    })
  }, [project, selectedPokemon, encounters])

  const handleToggleDead = async (encounter: Encounter) => {
    if (isSoulLinkProject(project)) {
      await updateEncounterDeathState(project, encounter.id, !encounter.isDead)
    } else {
      await db.encounters.update(encounter.id, { isDead: !encounter.isDead })
    }
    await refreshData()
  }

  const handleDeleteEncounter = async () => {
    if (!deleteTarget) return
    if (isSoulLinkProject(project)) {
      await deleteEncounterWithPartner(project, deleteTarget)
    } else {
      await db.encounters.delete(deleteTarget.id)
    }
    setDeleteTarget(null)
    await refreshData()
  }

  const editingPair = useMemo(() => {
    if (!editingPairLead?.linkedEncounterId) return null
    const partner = encounters.find((entry) => entry.id === editingPairLead.linkedEncounterId)
    if (!partner) return null
    return editingPairLead.playerId === 'p1'
      ? { p1: editingPairLead, p2: partner }
      : { p1: partner, p2: editingPairLead }
  }, [editingPairLead, encounters])

  if (loading) return <InfoCard text="Daten werden geladen..." />

  return (
    <>
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Pokémon</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <TabButton active={activeTab === 'caught'} onClick={() => setActiveTab('caught')} label="Gefangen" />
          <TabButton active={activeTab === 'deathbox'} onClick={() => setActiveTab('deathbox')} label="Deathbox" />
          <TabButton active={activeTab === 'check'} onClick={() => setActiveTab('check')} label="Check (Dupes Clause)" />
        </div>

        {activeTab === 'caught' || activeTab === 'deathbox' ? (
          <div className="mt-4">
            <label htmlFor="pokemon-search-list" className="mb-2 block text-sm font-medium text-slate-700">
              Pokémon suchen (Deutsch oder Englisch)
            </label>
            <input
              id="pokemon-search-list"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Suchen"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-sky-500 transition focus:ring-2"
            />
          </div>
        ) : null}
      </section>

      {activeTab === 'caught' ? (
        <section className="mt-4 space-y-3">
          {filteredCaught.length === 0 ? (
            <InfoCard text="Keine gefangenen Pokémon gefunden." />
          ) : (
            filteredCaught.map((encounter) => {
              const display = resolveEncounterDisplay(encounter)
              return (
                <article key={encounter.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <PokemonLabel
                        pokemonId={display.pokemonId}
                        nameDe={display.nameDe}
                        slug={display.slug}
                        isDead={encounter.isDead}
                        size="lg"
                        onOpenPokedex={openPokedex}
                      />
                      {encounter.nickname ? <p className="mt-1 text-sm text-slate-700">Spitzname: {encounter.nickname}</p> : null}
                      <p className="mt-1 text-sm text-slate-600">Ort: {locationNameById[encounter.locationId] ?? 'Unbekannter Ort'}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge>{ENCOUNTER_TYPE_LABELS[encounter.encounterType]}</Badge>
                        <Badge>Gefangen</Badge>
                        {encounter.isDead ? <Badge tone="danger">Verstorben</Badge> : null}
                        {isSoulLinkProject(project) && encounter.linkedEncounterId ? <Badge>Mit Partner verknüpft</Badge> : null}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {isSoulLinkProject(project) && encounter.linkedEncounterId ? (
                        <button
                          type="button"
                          onClick={() => setEditingPairLead(encounter)}
                          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          Paar bearbeiten
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingEncounter(encounter)
                            setEncounterModalOpen(true)
                          }}
                          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          Bearbeiten
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleToggleDead(encounter)}
                        className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        {encounter.isDead ? 'Wiederbeleben' : 'Als verstorben markieren'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(encounter)}
                        className="rounded-md bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-rose-500"
                      >
                        Löschen
                      </button>
                    </div>
                  </div>
                </article>
              )
            })
          )}
        </section>
      ) : null}

      {activeTab === 'deathbox' ? (
        <section className="mt-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Deathbox: {deathboxEncounters.length}</h2>

          <div className="mt-4 space-y-3">
            {filteredDeathbox.length === 0 ? (
              <p className="text-sm text-slate-600">Keine Einträge in der Deathbox.</p>
            ) : (
              filteredDeathbox.map((encounter) => (
                <div
                  key={encounter.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-3"
                >
                  {(() => {
                    const display = resolveEncounterDisplay(encounter)
                    return (
                      <div>
                        <PokemonLabel
                          pokemonId={display.pokemonId}
                          nameDe={display.nameDe}
                          slug={display.slug}
                          isDead
                          size="lg"
                          onOpenPokedex={openPokedex}
                        />
                        {isSoulLinkProject(project) && encounter.linkedEncounterId ? (
                          <p className="mt-1 text-xs text-slate-500">Mit Partner verknüpft</p>
                        ) : null}
                        {encounter.nickname ? <p className="text-sm text-slate-700">Spitzname: {encounter.nickname}</p> : null}
                        <p className="text-sm text-slate-600">Ort: {locationNameById[encounter.locationId] ?? 'Unbekannter Ort'}</p>
                      </div>
                    )
                  })()}

                  <button
                    type="button"
                    onClick={() => handleToggleDead(encounter)}
                    className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Wiederbeleben
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      ) : null}

      {activeTab === 'check' ? (
        <section className="mt-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Darf ich das fangen?</h2>
          <p className="mt-1 text-sm text-slate-600">
            Hier kannst du prüfen, ob ein Pokémon nach deinen Dupes-Regeln bereits als gefangen zählt.
          </p>

          <div className="mt-4">
            <PokemonSearch onSelect={setSelectedPokemon} />
          </div>

          {selectedPokemon ? (
            <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              Ausgewählt: {selectedPokemon.nameDe} ({selectedPokemon.slug})
            </div>
          ) : null}

          {checkResult ? (
            <div className="mt-3 space-y-2 text-sm">
              <p className={checkResult.allowed ? 'text-emerald-700' : 'text-rose-700'}>{checkResult.message}</p>
              {checkResult.duplicateEncounter ? (
                <p className="text-slate-700">
                  Auslöser: {checkResult.duplicateEncounter.nameDe} ({checkResult.duplicateEncounter.slug}) in{' '}
                  {locationNameById[checkResult.duplicateEncounter.locationId] ?? 'Unbekannter Ort'}
                </p>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      {editingPairLead && editingPair ? (
        <SoullinkEncounterPairModal
          project={project}
          projectId={projectId}
          locationId={editingPair.p1.locationId}
          encountersInProject={encounters}
          initialPair={editingPair}
          title={editingPair.p1.encounterType === 'normal' ? 'Soullink-Hauptbegegnung' : 'Soullink-Extra-Begegnung'}
          allowedEncounterTypes={editingPair.p1.encounterType === 'normal' ? ['normal'] : ['shiny', 'static', 'gift']}
          defaultEncounterType={editingPair.p1.encounterType === 'normal' ? 'normal' : editingPair.p1.encounterType}
          onClose={() => setEditingPairLead(null)}
          onSaved={async () => {
            setEditingPairLead(null)
            await refreshData()
          }}
        />
      ) : null}

      {encounterModalOpen && editingEncounter ? (
        <EncounterFormModal
          key={editingEncounter.id}
          project={project}
          projectId={projectId}
          locationId={editingEncounter.locationId}
          encountersInProject={encounters}
          initialEncounter={editingEncounter}
          onClose={() => {
            setEncounterModalOpen(false)
            setEditingEncounter(undefined)
          }}
          onSaved={async () => {
            setEncounterModalOpen(false)
            setEditingEncounter(undefined)
            await refreshData()
          }}
        />
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-900">Begegnung löschen</h2>
            <p className="mt-2 text-sm text-slate-600">Möchtest du die Begegnung mit {deleteTarget.nameDe} wirklich löschen?</p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => void handleDeleteEncounter()}
                className="rounded-md bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-500"
              >
                Löschen
              </button>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
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

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
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
