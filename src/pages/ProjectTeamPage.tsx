import {
  DndContext,
  DragOverlay,
  type DragEndEvent,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useEffect, useMemo, useState } from 'react'
import { PokemonLabel } from '../components/PokemonLabel'
import { ProjectLayout } from '../components/ProjectLayout'
import { db, ensureDatabaseReady } from '../lib/db'
import { getEvolutionOptions, resolveEvolutionOptionById } from '../lib/evolution'
import { isSoulLinkProject } from '../lib/projectSettings'
import { getPlayerName } from '../lib/soullink'
import type {
  Encounter,
  EvolutionOption,
  PlayerId,
  Project,
  Team,
  TeamSlot,
  TeamSlotNumber,
} from '../lib/types'

const SLOT_NUMBERS: TeamSlotNumber[] = [1, 2, 3, 4, 5, 6]

type BoxPokemonEntry = {
  pokemonId: number
  slug: string
  nameDe: string
  evolution_chain_id: number | null
  count: number
}

type DragData = {
  type: 'box' | 'team'
  slot?: TeamSlotNumber
  pokemon: {
    pokemonId: number
    slug: string
    nameDe: string
    evolution_chain_id: number | null
  }
}

const toSlotId = (slot: TeamSlotNumber) => `slot-${slot}`
const toBoxId = (pokemonId: number) => `box-${pokemonId}`

function parseSlotId(id: string | number | null | undefined): TeamSlotNumber | null {
  if (!id) return null
  const str = String(id)
  const match = str.match(/^slot-(\d)$/)
  if (!match) return null
  const value = Number(match[1])
  return value >= 1 && value <= 6 ? (value as TeamSlotNumber) : null
}

export function ProjectTeamPage() {
  return (
    <ProjectLayout>
      {({ project, projectId }) => <ProjectTeamContent project={project} projectId={projectId} />}
    </ProjectLayout>
  )
}

function ProjectTeamContent({ project, projectId }: { project: Project; projectId: string }) {
  if (isSoulLinkProject(project)) {
    return <SoullinkTeamContent project={project} projectId={projectId} />
  }

  return <SoloTeamContent project={project} projectId={projectId} />
}

function SoloTeamContent({ project, projectId }: { project: Project; projectId: string }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [encounters, setEncounters] = useState<Encounter[]>([])
  const [team, setTeam] = useState<Team | null>(null)
  const [activeSlot, setActiveSlot] = useState<TeamSlotNumber>(1)
  const [search, setSearch] = useState('')

  const [dragPreview, setDragPreview] = useState<DragData | null>(null)

  const [expandedPokemonId, setExpandedPokemonId] = useState<number | null>(null)
  const [evolutionOptionsByPokemonId, setEvolutionOptionsByPokemonId] = useState<Record<number, EvolutionOption[]>>({})
  const [selectedEvolutionByPokemonId, setSelectedEvolutionByPokemonId] = useState<Record<number, number>>(
    project.selectedEvolutionByPokemonId ?? {},
  )
  const [loadingEvolutionsByPokemonId, setLoadingEvolutionsByPokemonId] = useState<Record<number, boolean>>({})

  useEffect(() => {
    setSelectedEvolutionByPokemonId(project.selectedEvolutionByPokemonId ?? {})
  }, [project.selectedEvolutionByPokemonId])

  useEffect(() => {
    let active = true

    const loadData = async () => {
      try {
        await ensureDatabaseReady()
        const [caughtEncounters, loadedTeam] = await Promise.all([
          db.encounters.where('projectId').equals(projectId).filter((entry) => entry.outcome === 'caught').toArray(),
          db.teams.where('projectId').equals(projectId).first(),
        ])

        if (!active) return
        const alivePokemonIds = new Set(
          caughtEncounters.filter((entry) => !entry.isDead).map((entry) => entry.pokemonId),
        )
        const sanitizedSlots = sanitizeTeamSlots(loadedTeam?.slots ?? [], alivePokemonIds)
        const teamChanged =
          Boolean(loadedTeam) &&
          (sanitizedSlots.length !== (loadedTeam?.slots.length ?? 0) ||
            sanitizedSlots.some(
              (slot, index) =>
                loadedTeam?.slots[index]?.slot !== slot.slot ||
                loadedTeam?.slots[index]?.pokemonId !== slot.pokemonId,
            ))

        if (loadedTeam && teamChanged) {
          const nextTeam: Team = {
            ...loadedTeam,
            slots: sanitizedSlots,
            updatedAt: Date.now(),
          }
          await db.teams.put(nextTeam)
          if (!active) return
          setTeam(nextTeam)
        } else {
          setTeam(loadedTeam ?? null)
        }

        setEncounters(caughtEncounters)
        setError('')
      } catch (loadError) {
        console.error(loadError)
        if (!active) return
        setError('Teamdaten konnten nicht geladen werden.')
      } finally {
        if (!active) return
        setLoading(false)
      }
    }

    void loadData()

    return () => {
      active = false
    }
  }, [projectId])

  const boxEntries = useMemo(() => {
    const grouped = new Map<number, BoxPokemonEntry>()

    for (const encounter of encounters) {
      if (encounter.isDead) continue

      const existing = grouped.get(encounter.pokemonId)
      if (existing) {
        existing.count += 1
      } else {
        grouped.set(encounter.pokemonId, {
          pokemonId: encounter.pokemonId,
          slug: encounter.slug,
          nameDe: encounter.nameDe,
          evolution_chain_id: encounter.evolution_chain_id,
          count: 1,
        })
      }
    }

    return Array.from(grouped.values()).sort((a, b) => a.pokemonId - b.pokemonId)
  }, [encounters])

  const filteredBoxEntries = useMemo(() => {
    const normalized = search.trim().toLowerCase()
    if (!normalized) return boxEntries

    return boxEntries.filter(
      (entry) => {
        const resolved = resolveSelectedEvolution(entry)
        return (
          entry.nameDe.toLowerCase().includes(normalized) ||
          entry.slug.toLowerCase().includes(normalized) ||
          resolved.nameDe.toLowerCase().includes(normalized) ||
          resolved.slug.toLowerCase().includes(normalized)
        )
      },
    )
  }, [boxEntries, search, selectedEvolutionByPokemonId])

  const slotsByNumber = useMemo(() => {
    const map = new Map<TeamSlotNumber, TeamSlot>()
    for (const slot of team?.slots ?? []) {
      map.set(slot.slot, slot)
    }
    return map
  }, [team])

  const persistTeam = async (nextSlots: TeamSlot[]) => {
    const nextTeam: Team = {
      id: team?.id ?? crypto.randomUUID(),
      projectId,
      slots: nextSlots.sort((a, b) => a.slot - b.slot),
      updatedAt: Date.now(),
    }

    await db.teams.put(nextTeam)
    setTeam(nextTeam)
  }

  const persistSelectedEvolution = async (pokemonId: number, evolutionId: number) => {
    const nextSelectedEvolutionByPokemonId = {
      ...selectedEvolutionByPokemonId,
      [pokemonId]: evolutionId,
    }

    setSelectedEvolutionByPokemonId(nextSelectedEvolutionByPokemonId)
    await db.projects.update(projectId, { selectedEvolutionByPokemonId: nextSelectedEvolutionByPokemonId })

    const resolvedEvolution = resolveEvolutionOptionById(evolutionId)
    if (!resolvedEvolution) return

    const updatedSlots = (team?.slots ?? []).map((slot) => {
      const basePokemonId = slot.sourcePokemonId ?? slot.pokemonId
      if (basePokemonId !== pokemonId) return slot
      return {
        ...slot,
        pokemonId: resolvedEvolution.pokemonId,
        slug: resolvedEvolution.slug,
        nameDe: resolvedEvolution.nameDe,
        evolution_chain_id: resolvedEvolution.evolution_chain_id,
        sourcePokemonId: basePokemonId,
      }
    })

    if (!team || updatedSlots.every((slot, index) => slot === team.slots[index])) return
    await persistTeam(updatedSlots)
  }

  const resolveSelectedEvolution = (entry: Pick<BoxPokemonEntry, 'pokemonId' | 'slug' | 'nameDe' | 'evolution_chain_id'>) => {
    const selectedId = selectedEvolutionByPokemonId[entry.pokemonId]
    return (
      (selectedId ? resolveEvolutionOptionById(selectedId) : null) ?? {
        pokemonId: entry.pokemonId,
        slug: entry.slug,
        nameDe: entry.nameDe,
        evolution_chain_id: entry.evolution_chain_id,
      }
    )
  }

  const assignPokemonToSlot = async (
    slot: TeamSlotNumber,
    pokemon: { pokemonId: number; slug: string; nameDe: string; evolution_chain_id: number | null },
    sourcePokemonId?: number,
  ) => {
    const nextSlot: TeamSlot = {
      slot,
      pokemonId: pokemon.pokemonId,
      slug: pokemon.slug,
      nameDe: pokemon.nameDe,
      evolution_chain_id: pokemon.evolution_chain_id,
      sourcePokemonId,
    }

    const withoutSlot = (team?.slots ?? []).filter(
      (entry) =>
        entry.slot !== slot && (entry.sourcePokemonId ?? entry.pokemonId) !== (sourcePokemonId ?? pokemon.pokemonId),
    )
    await persistTeam([...withoutSlot, nextSlot])
  }

  const swapSlots = async (from: TeamSlotNumber, to: TeamSlotNumber) => {
    if (from === to) return

    const fromSlot = slotsByNumber.get(from)
    const toSlot = slotsByNumber.get(to)
    const rest = (team?.slots ?? []).filter((entry) => entry.slot !== from && entry.slot !== to)
    const next: TeamSlot[] = [...rest]

    if (fromSlot) next.push({ ...fromSlot, slot: to })
    if (toSlot) next.push({ ...toSlot, slot: from })

    await persistTeam(next)
  }

  const clearSlot = async (slotNumber: TeamSlotNumber) => {
    const nextSlots = (team?.slots ?? []).filter((slot) => slot.slot !== slotNumber)
    await persistTeam(nextSlots)
  }

  const loadEvolutionOptionsForEntry = async (entry: BoxPokemonEntry) => {
    if (evolutionOptionsByPokemonId[entry.pokemonId]?.length) return

    setLoadingEvolutionsByPokemonId((prev) => ({ ...prev, [entry.pokemonId]: true }))
    try {
      const options = await getEvolutionOptions(entry.pokemonId)
      const normalized = options.length
        ? options
        : [
            {
              pokemonId: entry.pokemonId,
              slug: entry.slug,
              nameDe: entry.nameDe,
              evolution_chain_id: entry.evolution_chain_id,
            },
          ]

      setEvolutionOptionsByPokemonId((prev) => ({ ...prev, [entry.pokemonId]: normalized }))

      const defaultOption = normalized.find((option) => option.pokemonId === entry.pokemonId) ?? normalized[0]
      setSelectedEvolutionByPokemonId((prev) => ({
        ...prev,
        [entry.pokemonId]: prev[entry.pokemonId] ?? project.selectedEvolutionByPokemonId?.[entry.pokemonId] ?? defaultOption.pokemonId,
      }))
    } catch (loadError) {
      console.error(loadError)
      setEvolutionOptionsByPokemonId((prev) => ({
        ...prev,
        [entry.pokemonId]: [
          {
            pokemonId: entry.pokemonId,
            slug: entry.slug,
            nameDe: entry.nameDe,
            evolution_chain_id: entry.evolution_chain_id,
          },
        ],
      }))
      setSelectedEvolutionByPokemonId((prev) => ({
        ...prev,
        [entry.pokemonId]: prev[entry.pokemonId] ?? project.selectedEvolutionByPokemonId?.[entry.pokemonId] ?? entry.pokemonId,
      }))
    } finally {
      setLoadingEvolutionsByPokemonId((prev) => ({ ...prev, [entry.pokemonId]: false }))
    }
  }

  const toggleExpand = async (entry: BoxPokemonEntry) => {
    if (expandedPokemonId === entry.pokemonId) {
      setExpandedPokemonId(null)
      return
    }

    setExpandedPokemonId(entry.pokemonId)
    await loadEvolutionOptionsForEntry(entry)
  }

  const assignSelectedEvolutionFromEntry = async (entry: BoxPokemonEntry) => {
    const selectedId = selectedEvolutionByPokemonId[entry.pokemonId] ?? entry.pokemonId
    const options = evolutionOptionsByPokemonId[entry.pokemonId] ?? []
    const selected =
      options.find((option) => option.pokemonId === selectedId) ??
      options[0] ?? {
        pokemonId: entry.pokemonId,
        slug: entry.slug,
        nameDe: entry.nameDe,
        evolution_chain_id: entry.evolution_chain_id,
      }

    await assignPokemonToSlot(
      activeSlot,
      {
        pokemonId: selected.pokemonId,
        slug: selected.slug,
        nameDe: selected.nameDe,
        evolution_chain_id: selected.evolution_chain_id,
      },
      entry.pokemonId,
    )
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const overSlot = parseSlotId(event.over?.id)
    const activeData = event.active.data.current as DragData | undefined
    setDragPreview(null)

    if (!overSlot || !activeData) return

    if (activeData.type === 'box') {
      const resolvedPokemon = resolveSelectedEvolution(activeData.pokemon)
      await assignPokemonToSlot(overSlot, resolvedPokemon, activeData.pokemon.pokemonId)
      setActiveSlot(overSlot)
      return
    }

    if (activeData.type === 'team' && activeData.slot) {
      await swapSlots(activeData.slot, overSlot)
      setActiveSlot(overSlot)
    }
  }

  if (loading) return <InfoCard text="Team wird geladen..." />
  if (error) return <InfoCard text={error} />

  return (
    <DndContext
      onDragStart={(event) => setDragPreview((event.active.data.current as DragData | undefined) ?? null)}
      onDragEnd={(event) => void handleDragEnd(event)}
      onDragCancel={() => setDragPreview(null)}
    >
      <>
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Team-Editor ({project.name})</h2>
          <p className="mt-1 text-sm text-slate-600">
            Ziehe Pokémon aus der Box in einen Slot oder tausche belegte Slots per Drag & Drop.
          </p>

          <SortableContext items={SLOT_NUMBERS.map((slot) => toSlotId(slot))} strategy={rectSortingStrategy}>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {SLOT_NUMBERS.map((slotNumber) => (
                <TeamSlotCard
                  key={slotNumber}
                  slotNumber={slotNumber}
                  slot={slotsByNumber.get(slotNumber)}
                  isActive={activeSlot === slotNumber}
                  onSelect={setActiveSlot}
                  onClear={() => void clearSlot(slotNumber)}
                />
              ))}
            </div>
          </SortableContext>
        </section>

        <section className="mt-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">Box (Gefangen)</h2>
            <div className="w-full max-w-sm">
              <label htmlFor="team-box-search" className="mb-1 block text-sm font-medium text-slate-700">
                Pokémon suchen (Deutsch oder Englisch)
              </label>
              <input
                id="team-box-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Name eingeben..."
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-sky-500 transition focus:ring-2"
              />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredBoxEntries.map((entry) => (
              <BoxGridItem
                key={entry.pokemonId}
                entry={entry}
                displayEntry={resolveSelectedEvolution(entry)}
                expanded={expandedPokemonId === entry.pokemonId}
                loadingOptions={Boolean(loadingEvolutionsByPokemonId[entry.pokemonId])}
                options={evolutionOptionsByPokemonId[entry.pokemonId] ?? []}
                selectedEvolutionId={selectedEvolutionByPokemonId[entry.pokemonId] ?? entry.pokemonId}
                onToggleExpand={() => void toggleExpand(entry)}
                onSelectedEvolutionChange={(nextId) => void persistSelectedEvolution(entry.pokemonId, nextId)}
                onAssign={() => void assignSelectedEvolutionFromEntry(entry)}
              />
            ))}
          </div>

          {filteredBoxEntries.length === 0 ? (
            <p className="mt-4 text-sm text-slate-600">Keine gefangenen Pokémon für die aktuelle Suche gefunden.</p>
          ) : null}
        </section>
      </>

      <DragOverlay>
        {dragPreview ? (
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
            <PokemonLabel
              pokemonId={dragPreview.pokemon.pokemonId}
              nameDe={dragPreview.pokemon.nameDe}
              slug={dragPreview.pokemon.slug}
              size="md"
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

function TeamSlotCard({
  slotNumber,
  slot,
  isActive,
  onSelect,
  onClear,
}: {
  slotNumber: TeamSlotNumber
  slot?: TeamSlot
  isActive: boolean
  onSelect: (slot: TeamSlotNumber) => void
  onClear: () => void
}) {
  const { isOver, setNodeRef } = useDroppable({ id: toSlotId(slotNumber) })

  const draggable = useDraggable({
    id: toSlotId(slotNumber),
    disabled: !slot,
    data: slot
      ? {
          type: 'team',
          slot: slotNumber,
          pokemon: {
            pokemonId: slot.pokemonId,
            slug: slot.slug,
            nameDe: slot.nameDe,
            evolution_chain_id: slot.evolution_chain_id,
          },
        }
      : undefined,
  })

  const style = {
    transform: CSS.Translate.toString(draggable.transform),
    opacity: draggable.isDragging ? 0.6 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      role="button"
      tabIndex={0}
      onClick={() => onSelect(slotNumber)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') onSelect(slotNumber)
      }}
      className={`rounded-xl border bg-white p-3 transition-colors ${
        isOver
          ? 'border-sky-500 bg-sky-50'
          : isActive
            ? 'border-slate-900'
            : 'border-slate-200 hover:bg-slate-50'
      }`}
      style={style}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Slot {slotNumber}</p>
      <div
        className="mt-2 min-h-[96px]"
        ref={slot ? draggable.setNodeRef : undefined}
        {...draggable.listeners}
        {...draggable.attributes}
      >
        {slot ? (
          <PokemonLabel pokemonId={slot.pokemonId} nameDe={slot.nameDe} slug={slot.slug} size="lg" />
        ) : (
          <div className="flex h-16 items-center justify-center rounded-md bg-slate-100 text-sm text-slate-500">Leer</div>
        )}
      </div>

      {slot ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onClear()
          }}
          className="mt-2 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
        >
          Entfernen
        </button>
      ) : null}
    </div>
  )
}

function BoxGridItem({
  entry,
  displayEntry,
  expanded,
  loadingOptions,
  options,
  selectedEvolutionId,
  onToggleExpand,
  onSelectedEvolutionChange,
  onAssign,
}: {
  entry: BoxPokemonEntry
  displayEntry: EvolutionOption
  expanded: boolean
  loadingOptions: boolean
  options: EvolutionOption[]
  selectedEvolutionId: number
  onToggleExpand: () => void
  onSelectedEvolutionChange: (nextId: number) => void
  onAssign: () => void
}) {
  const draggable = useDraggable({
    id: toBoxId(entry.pokemonId),
    data: {
      type: 'box',
        pokemon: {
          pokemonId: entry.pokemonId,
          slug: entry.slug,
          nameDe: entry.nameDe,
          evolution_chain_id: entry.evolution_chain_id,
        },
      },
  })

  const style = {
    transform: CSS.Translate.toString(draggable.transform),
    opacity: draggable.isDragging ? 0.6 : 1,
  }

  return (
    <div ref={draggable.setNodeRef} style={style} className="rounded-xl border border-slate-200 bg-white p-3">
      <PokemonLabel
        pokemonId={displayEntry.pokemonId}
        nameDe={displayEntry.nameDe}
        slug={displayEntry.slug}
        size="md"
      />

      <div className="mt-2 flex items-center gap-2 text-xs text-slate-600">
        {entry.count > 1 ? <span className="rounded-full bg-slate-100 px-2 py-0.5">x{entry.count}</span> : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onToggleExpand}
          className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
        >
          {expanded ? 'Zurück' : 'Entwicklung wählen'}
        </button>
        <button
          type="button"
          {...draggable.listeners}
          {...draggable.attributes}
          className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
        >
          Ziehen
        </button>
      </div>

      {expanded ? (
        <div className="mt-3 space-y-2 rounded-md border border-slate-200 bg-slate-50 p-2">
          <label className="block text-xs font-semibold text-slate-700" htmlFor={`evo-${entry.pokemonId}`}>
            Entwicklung
          </label>
          <select
            id={`evo-${entry.pokemonId}`}
            value={selectedEvolutionId}
            onChange={(event) => onSelectedEvolutionChange(Number(event.target.value))}
            disabled={loadingOptions}
            className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none ring-sky-500 focus:ring-2 disabled:bg-slate-100"
          >
            {(options.length > 0 ? options : [{
              pokemonId: entry.pokemonId,
              slug: entry.slug,
              nameDe: entry.nameDe,
              evolution_chain_id: entry.evolution_chain_id,
            }]).map((option) => (
              <option key={option.pokemonId} value={option.pokemonId}>
                {option.nameDe} ({option.slug})
              </option>
            ))}
          </select>

          {loadingOptions ? <p className="text-xs text-slate-500">Entwicklungen werden geladen...</p> : null}

          <button
            type="button"
            onClick={onAssign}
            disabled={loadingOptions}
            className="w-full rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            In aktiven Slot setzen
          </button>
        </div>
      ) : null}
    </div>
  )
}

type SoullinkPairEntry = {
  linkGroupId: string
  p1: Encounter
  p2: Encounter
}

type SoullinkNotice = {
  type: 'success' | 'error'
  text: string
}

function SoullinkTeamContent({ project, projectId }: { project: Project; projectId: string }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [encounters, setEncounters] = useState<Encounter[]>([])
  const [team, setTeam] = useState<Team | null>(null)
  const [search, setSearch] = useState('')
  const [notice, setNotice] = useState<SoullinkNotice | null>(null)
  const [slotPickerPair, setSlotPickerPair] = useState<SoullinkPairEntry | null>(null)
  const [slotOverwriteTarget, setSlotOverwriteTarget] = useState<{
    pair: SoullinkPairEntry
    slotNumber: TeamSlotNumber
  } | null>(null)

  useEffect(() => {
    let active = true

    const loadData = async () => {
      try {
        await ensureDatabaseReady()
        const [caughtEncounters, loadedTeam] = await Promise.all([
          db.encounters.where('projectId').equals(projectId).filter((entry) => entry.outcome === 'caught').toArray(),
          db.teams.where('projectId').equals(projectId).first(),
        ])

        if (!active) return

        const validPairs = buildSoullinkPairEntries(caughtEncounters)
        const sanitizedSlots = sanitizeSoullinkTeamSlots(loadedTeam?.slots ?? [], validPairs)
        const teamChanged =
          Boolean(loadedTeam) &&
          (sanitizedSlots.length !== (loadedTeam?.slots.length ?? 0) ||
            sanitizedSlots.some((slot, index) => serializeSoulLinkTeamSlot(slot) !== serializeSoulLinkTeamSlot(loadedTeam!.slots[index])))

        if (loadedTeam && teamChanged) {
          const nextTeam: Team = { ...loadedTeam, slots: sanitizedSlots, updatedAt: Date.now() }
          await db.teams.put(nextTeam)
          if (!active) return
          setTeam(nextTeam)
        } else {
          setTeam(loadedTeam ?? null)
        }

        setEncounters(caughtEncounters)
        setError('')
      } catch (loadError) {
        console.error(loadError)
        if (!active) return
        setError('Teamdaten konnten nicht geladen werden.')
      } finally {
        if (!active) return
        setLoading(false)
      }
    }

    void loadData()

    return () => {
      active = false
    }
  }, [projectId])

  const pairEntries = useMemo(() => buildSoullinkPairEntries(encounters), [encounters])
  const filteredPairs = useMemo(() => {
    const normalized = search.trim().toLowerCase()
    if (!normalized) return pairEntries
    return pairEntries.filter((pair) => {
      const p1Display = resolveEncounterDisplayForProject(project, pair.p1)
      const p2Display = resolveEncounterDisplayForProject(project, pair.p2)
      return (
        p1Display.nameDe.toLowerCase().includes(normalized) ||
        p1Display.slug.toLowerCase().includes(normalized) ||
        p2Display.nameDe.toLowerCase().includes(normalized) ||
        p2Display.slug.toLowerCase().includes(normalized) ||
        (pair.p1.nickname ?? '').toLowerCase().includes(normalized) ||
        (pair.p2.nickname ?? '').toLowerCase().includes(normalized)
      )
    })
  }, [pairEntries, project, search])

  const slotsByPlayer = useMemo(() => {
    const p1 = new Map<TeamSlotNumber, TeamSlot>()
    const p2 = new Map<TeamSlotNumber, TeamSlot>()
    for (const slot of team?.slots ?? []) {
      if (slot.playerId === 'p2') {
        p2.set(slot.slot, slot)
      } else {
        p1.set(slot.slot, slot)
      }
    }
    return { p1, p2 }
  }, [team])

  const pairSlotByGroupId = useMemo(() => {
    const map = new Map<string, TeamSlotNumber>()
    for (const slot of team?.slots ?? []) {
      if (slot.linkedEncounterId && slot.sourceEncounterId) {
        const encounter = encounters.find((entry) => entry.id === slot.sourceEncounterId)
        if (encounter?.linkGroupId) map.set(encounter.linkGroupId, slot.slot)
      }
    }
    return map
  }, [encounters, team])

  const persistTeam = async (nextSlots: TeamSlot[]) => {
    const nextTeam: Team = {
      id: team?.id ?? crypto.randomUUID(),
      projectId,
      slots: nextSlots.sort(compareTeamSlots),
      updatedAt: Date.now(),
    }

    await db.teams.put(nextTeam)
    setTeam(nextTeam)
  }

  const setLinkedPairToSlot = async (pair: SoullinkPairEntry, slotNumber: TeamSlotNumber) => {
    const p1Display = resolveEncounterDisplayForProject(project, pair.p1)
    const p2Display = resolveEncounterDisplayForProject(project, pair.p2)
    const currentSlot = findCurrentPairSlot(pair, pairSlotByGroupId)

    const nextSlots = (team?.slots ?? []).filter((slot) => {
      if (slot.slot === slotNumber) return false
      return slot.sourceEncounterId !== pair.p1.id && slot.sourceEncounterId !== pair.p2.id
    })

    nextSlots.push(
      {
        slot: slotNumber,
        playerId: 'p1',
        sourceEncounterId: pair.p1.id,
        linkedEncounterId: pair.p2.id,
        pokemonId: p1Display.pokemonId,
        slug: p1Display.slug,
        nameDe: p1Display.nameDe,
        evolution_chain_id: p1Display.evolution_chain_id,
      },
      {
        slot: slotNumber,
        playerId: 'p2',
        sourceEncounterId: pair.p2.id,
        linkedEncounterId: pair.p1.id,
        pokemonId: p2Display.pokemonId,
        slug: p2Display.slug,
        nameDe: p2Display.nameDe,
        evolution_chain_id: p2Display.evolution_chain_id,
      },
    )

    await persistTeam(nextSlots)
    setNotice({
      type: 'success',
      text:
        currentSlot && currentSlot !== slotNumber
          ? `Paar wurde nach Slot ${slotNumber} verschoben.`
          : `Paar wurde in Slot ${slotNumber} gesetzt.`,
    })
  }

  const clearSlot = async (slotNumber: TeamSlotNumber) => {
    await persistTeam((team?.slots ?? []).filter((slot) => slot.slot !== slotNumber))
  }

  const handleAutoAssign = async (pair: SoullinkPairEntry) => {
    const currentSlot = findCurrentPairSlot(pair, pairSlotByGroupId)
    const freeSlot = findFirstFreeLinkedSlot(slotsByPlayer.p1, slotsByPlayer.p2, currentSlot ?? undefined)

    if (!freeSlot) {
      setNotice({ type: 'error', text: 'Kein freier Team-Slot mehr verfügbar.' })
      return
    }

    await setLinkedPairToSlot(pair, freeSlot)
  }

  const handleChooseSlot = (pair: SoullinkPairEntry, slotNumber: TeamSlotNumber) => {
    const currentSlot = findCurrentPairSlot(pair, pairSlotByGroupId)
    if (currentSlot === slotNumber) {
      setSlotPickerPair(null)
      setNotice({ type: 'success', text: `Paar wurde in Slot ${slotNumber} gesetzt.` })
      return
    }

    const slotOccupied = slotsByPlayer.p1.has(slotNumber) || slotsByPlayer.p2.has(slotNumber)
    if (slotOccupied) {
      setSlotOverwriteTarget({ pair, slotNumber })
      return
    }

    void setLinkedPairToSlot(pair, slotNumber)
    setSlotPickerPair(null)
  }

  const confirmOverwrite = async () => {
    if (!slotOverwriteTarget) return
    await setLinkedPairToSlot(slotOverwriteTarget.pair, slotOverwriteTarget.slotNumber)
    setSlotOverwriteTarget(null)
    setSlotPickerPair(null)
  }

  if (loading) return <InfoCard text="Team wird geladen..." />
  if (error) return <InfoCard text={error} />

  return (
    <>
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Soullink-Team ({project.name})</h2>
        <p className="mt-1 text-sm text-slate-600">
          Beide Seiten bleiben gekoppelt. Ein Paar wird immer im selben Slot für beide Spieler gesetzt oder entfernt.
        </p>

        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <SoullinkTeamColumn
            title={getPlayerName(project, 'p1')}
            slots={slotsByPlayer.p1}
            onClearSlot={(slot) => void clearSlot(slot)}
          />
          <SoullinkTeamColumn
            title={getPlayerName(project, 'p2')}
            slots={slotsByPlayer.p2}
            onClearSlot={(slot) => void clearSlot(slot)}
          />
        </div>
      </section>

      <section className="mt-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Soullink-Box</h2>
          <div className="w-full max-w-sm">
            <label htmlFor="soullink-team-search" className="mb-1 block text-sm font-medium text-slate-700">
              Pokémon suchen
            </label>
            <input
              id="soullink-team-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Name eingeben..."
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-sky-500 transition focus:ring-2"
            />
          </div>
        </div>

        <div className="mt-3 min-h-[44px]">
          {notice ? (
            <div
              className={`rounded-md px-3 py-2 text-sm ${
                notice.type === 'success'
                  ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border border-rose-200 bg-rose-50 text-rose-700'
              }`}
            >
              {notice.text}
            </div>
          ) : null}
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <SoullinkBoxColumn
            title={getPlayerName(project, 'p1')}
            playerId="p1"
            pairs={filteredPairs}
            pairSlotByGroupId={pairSlotByGroupId}
            project={project}
            onAutoAssign={(pair) => void handleAutoAssign(pair)}
            onChooseSlot={setSlotPickerPair}
          />
          <SoullinkBoxColumn
            title={getPlayerName(project, 'p2')}
            playerId="p2"
            pairs={filteredPairs}
            pairSlotByGroupId={pairSlotByGroupId}
            project={project}
            onAutoAssign={(pair) => void handleAutoAssign(pair)}
            onChooseSlot={setSlotPickerPair}
          />
        </div>

        {filteredPairs.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">Keine gültigen Soullink-Paare für die aktuelle Suche gefunden.</p>
        ) : null}
      </section>

      {slotPickerPair ? (
        <SoullinkSlotPickerModal
          currentSlot={findCurrentPairSlot(slotPickerPair, pairSlotByGroupId)}
          occupiedSlots={new Set([...slotsByPlayer.p1.keys(), ...slotsByPlayer.p2.keys()])}
          onChooseSlot={(slotNumber) => handleChooseSlot(slotPickerPair, slotNumber)}
          onClose={() => {
            setSlotPickerPair(null)
            setSlotOverwriteTarget(null)
          }}
        />
      ) : null}

      {slotOverwriteTarget ? (
        <ConfirmModal
          title="Slot wählen"
          text={`Slot ${slotOverwriteTarget.slotNumber} ist bereits belegt. Überschreiben?`}
          confirmLabel="Überschreiben"
          onConfirm={() => void confirmOverwrite()}
          onCancel={() => setSlotOverwriteTarget(null)}
        />
      ) : null}
    </>
  )
}

function InfoCard({ text }: { text: string }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">{text}</div>
}

function SoullinkTeamColumn({
  title,
  slots,
  onClearSlot,
}: {
  title: string
  slots: Map<TeamSlotNumber, TeamSlot>
  onClearSlot: (slot: TeamSlotNumber) => void
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {SLOT_NUMBERS.map((slotNumber) => (
          <SoullinkTeamSlotCard
            key={`${title}-${slotNumber}`}
            slotNumber={slotNumber}
            slot={slots.get(slotNumber)}
            onClear={() => onClearSlot(slotNumber)}
          />
        ))}
      </div>
    </div>
  )
}

function SoullinkTeamSlotCard({
  slotNumber,
  slot,
  onClear,
}: {
  slotNumber: TeamSlotNumber
  slot?: TeamSlot
  onClear: () => void
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Slot {slotNumber}</p>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">Verlinkt</span>
      </div>
      <div className="mt-2 min-h-[96px]">
        {slot ? (
          <PokemonLabel pokemonId={slot.pokemonId} nameDe={slot.nameDe} slug={slot.slug} size="lg" />
        ) : (
          <div className="flex h-16 items-center justify-center rounded-md bg-slate-100 text-sm text-slate-500">Leer</div>
        )}
      </div>
      {slot ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onClear()
          }}
          className="mt-2 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
        >
          Entfernen
        </button>
      ) : null}
    </div>
  )
}

function SoullinkBoxColumn({
  title,
  playerId,
  pairs,
  pairSlotByGroupId,
  project,
  onAutoAssign,
  onChooseSlot,
}: {
  title: string
  playerId: PlayerId
  pairs: SoullinkPairEntry[]
  pairSlotByGroupId: Map<string, TeamSlotNumber>
  project: Project
  onAutoAssign: (pair: SoullinkPairEntry) => void
  onChooseSlot: (pair: SoullinkPairEntry) => void
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <div className="mt-3 space-y-3">
        {pairs.map((pair) => {
          const encounter = playerId === 'p1' ? pair.p1 : pair.p2
          const display = resolveEncounterDisplayForProject(project, encounter)
          const partnerEncounter = playerId === 'p1' ? pair.p2 : pair.p1
          const assignedSlot = findCurrentPairSlot(pair, pairSlotByGroupId)

          return (
            <div key={`${playerId}-${pair.linkGroupId}`} className="rounded-xl border border-slate-200 bg-white p-3">
              <PokemonLabel pokemonId={display.pokemonId} nameDe={display.nameDe} slug={display.slug} size="md" />
              <div className="mt-2 space-y-2 text-sm text-slate-700">
                <p>
                  <span className="font-semibold">Partner:</span> {partnerEncounter.nameDe}
                </p>
                {encounter.nickname ? (
                  <p>
                    <span className="font-semibold">Spitzname:</span> {encounter.nickname}
                  </p>
                ) : null}
                <p>
                  <span className="font-semibold">Status:</span>{' '}
                  {assignedSlot ? `In Slot ${assignedSlot}` : 'Nicht im Team'}
                </p>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => onAutoAssign(pair)}
                  className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                >
                  {assignedSlot ? 'Verschieben' : 'Ins Team setzen'}
                </button>
                <button
                  type="button"
                  onClick={() => onChooseSlot(pair)}
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Slot wählen
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SoullinkSlotPickerModal({
  currentSlot,
  occupiedSlots,
  onChooseSlot,
  onClose,
}: {
  currentSlot: TeamSlotNumber | null
  occupiedSlots: Set<TeamSlotNumber>
  onChooseSlot: (slotNumber: TeamSlotNumber) => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-900">Slot wählen</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {SLOT_NUMBERS.map((slotNumber) => {
            const isCurrent = currentSlot === slotNumber
            const isOccupied = occupiedSlots.has(slotNumber) && !isCurrent
            return (
              <button
                key={slotNumber}
                type="button"
                onClick={() => onChooseSlot(slotNumber)}
                className={`rounded-lg border px-3 py-3 text-sm font-semibold transition ${
                  isCurrent
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                    : isOccupied
                      ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div>Slot {slotNumber}</div>
                <div className="mt-1 text-xs font-medium">
                  {isCurrent ? 'Aktuell' : isOccupied ? 'Belegt' : 'Frei'}
                </div>
              </button>
            )
          })}
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  )
}

function ConfirmModal({
  title,
  text,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  title: string
  text: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <p className="mt-2 text-sm text-slate-600">{text}</p>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            {confirmLabel}
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

function findFirstFreeLinkedSlot(
  teamLeft: Map<TeamSlotNumber, TeamSlot>,
  teamRight: Map<TeamSlotNumber, TeamSlot>,
  excludeSlot?: TeamSlotNumber,
): TeamSlotNumber | null {
  for (const slotNumber of SLOT_NUMBERS) {
    if (excludeSlot === slotNumber) continue
    if (!teamLeft.has(slotNumber) && !teamRight.has(slotNumber)) return slotNumber
  }

  return null
}

function findCurrentPairSlot(
  pair: SoullinkPairEntry,
  pairSlotByGroupId: Map<string, TeamSlotNumber>,
): TeamSlotNumber | null {
  return pairSlotByGroupId.get(pair.linkGroupId) ?? null
}

function sanitizeTeamSlots(slots: TeamSlot[], alivePokemonIds: Set<number>): TeamSlot[] {
  const seen = new Set<number>()
  const sorted = slots.slice().sort((a, b) => a.slot - b.slot)
  const next: TeamSlot[] = []

  for (const slot of sorted) {
    const basePokemonId = slot.sourcePokemonId ?? slot.pokemonId
    if (!alivePokemonIds.has(basePokemonId)) continue
    if (seen.has(basePokemonId)) continue
    seen.add(basePokemonId)
    next.push(slot)
  }

  return next
}

function buildSoullinkPairEntries(encounters: Encounter[]): SoullinkPairEntry[] {
  const byId = new Map(encounters.map((encounter) => [encounter.id, encounter]))
  const pairs = new Map<string, SoullinkPairEntry>()

  for (const encounter of encounters) {
    if (encounter.playerId !== 'p1' && encounter.playerId !== 'p2') continue
    if (encounter.isDead || !encounter.linkedEncounterId || !encounter.linkGroupId) continue

    const partner = byId.get(encounter.linkedEncounterId)
    if (!partner || partner.isDead || partner.outcome !== 'caught') continue
    if (partner.linkedEncounterId !== encounter.id || partner.linkGroupId !== encounter.linkGroupId) continue
    if (encounter.outcome !== 'caught') continue

    const p1 = encounter.playerId === 'p1' ? encounter : partner.playerId === 'p1' ? partner : null
    const p2 = encounter.playerId === 'p2' ? encounter : partner.playerId === 'p2' ? partner : null
    if (!p1 || !p2) continue

    pairs.set(encounter.linkGroupId, { linkGroupId: encounter.linkGroupId, p1, p2 })
  }

  return Array.from(pairs.values()).sort((a, b) => a.p1.createdAt - b.p1.createdAt)
}

function sanitizeSoullinkTeamSlots(slots: TeamSlot[], validPairs: SoullinkPairEntry[]): TeamSlot[] {
  const validByGroup = new Map(validPairs.map((pair) => [pair.linkGroupId, pair]))
  const validEncounterToGroup = new Map<string, string>()
  for (const pair of validPairs) {
    validEncounterToGroup.set(pair.p1.id, pair.linkGroupId)
    validEncounterToGroup.set(pair.p2.id, pair.linkGroupId)
  }

  const result: TeamSlot[] = []
  for (const slotNumber of SLOT_NUMBERS) {
    const p1 = slots.find((slot) => slot.slot === slotNumber && (slot.playerId ?? 'p1') === 'p1')
    const p2 = slots.find((slot) => slot.slot === slotNumber && slot.playerId === 'p2')
    if (!p1 || !p2 || !p1.sourceEncounterId || !p2.sourceEncounterId) continue

    const group1 = validEncounterToGroup.get(p1.sourceEncounterId)
    const group2 = validEncounterToGroup.get(p2.sourceEncounterId)
    if (!group1 || group1 !== group2) continue

    const pair = validByGroup.get(group1)
    if (!pair) continue
    if (pair.p1.id !== p1.sourceEncounterId || pair.p2.id !== p2.sourceEncounterId) continue

    result.push(p1, p2)
  }

  return result.sort(compareTeamSlots)
}

function compareTeamSlots(a: TeamSlot, b: TeamSlot) {
  if (a.slot !== b.slot) return a.slot - b.slot
  return (a.playerId ?? 'p1').localeCompare(b.playerId ?? 'p1')
}

function serializeSoulLinkTeamSlot(slot: TeamSlot | undefined) {
  if (!slot) return ''
  return [
    slot.slot,
    slot.playerId ?? 'p1',
    slot.sourceEncounterId ?? '',
    slot.linkedEncounterId ?? '',
    slot.pokemonId,
    slot.slug,
    slot.nameDe,
  ].join(':')
}

function resolveEncounterDisplayForProject(project: Project, encounter: Encounter) {
  const selectedEvolutionId = project.selectedEvolutionByPokemonId?.[encounter.pokemonId]
  return (selectedEvolutionId ? resolveEvolutionOptionById(selectedEvolutionId) : null) ?? {
    pokemonId: encounter.pokemonId,
    slug: encounter.slug,
    nameDe: encounter.nameDe,
    evolution_chain_id: encounter.evolution_chain_id,
  }
}
