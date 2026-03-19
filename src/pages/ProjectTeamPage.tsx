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
import type {
  Encounter,
  EvolutionOption,
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

function InfoCard({ text }: { text: string }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">{text}</div>
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
