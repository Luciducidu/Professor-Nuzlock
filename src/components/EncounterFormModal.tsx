import { useMemo, useState } from 'react'
import { PokemonSearch } from './PokemonSearch'
import { db } from '../lib/db'
import { isSoulLinkProject } from '../lib/projectSettings'
import { validateEncounterSelection } from '../lib/rules'
import type {
  Encounter,
  EncounterOutcome,
  EncounterType,
  PlayerId,
  PokemonIndexEntry,
  Project,
} from '../lib/types'

type EncounterFormModalProps = {
  project: Project
  projectId: string
  locationId: string
  encountersInProject: Encounter[]
  initialEncounter?: Encounter
  playerId?: PlayerId
  onClose: () => void
  onSaved: () => void
}

const ENCOUNTER_TYPE_OPTIONS: Array<{ value: EncounterType; label: string }> = [
  { value: 'normal', label: 'Normal' },
  { value: 'shiny', label: 'Shiny' },
  { value: 'static', label: 'Static' },
]

const OUTCOME_OPTIONS: Array<{ value: EncounterOutcome; label: string }> = [
  { value: 'caught', label: 'Gefangen' },
  { value: 'not_caught', label: 'Nicht gefangen' },
]

export function EncounterFormModal({
  project,
  projectId,
  locationId,
  encountersInProject,
  initialEncounter,
  playerId,
  onClose,
  onSaved,
}: EncounterFormModalProps) {
  const [selectedPokemon, setSelectedPokemon] = useState<PokemonIndexEntry | null>(
    initialEncounter
      ? {
          id: initialEncounter.pokemonId,
          slug: initialEncounter.slug,
          nameDe: initialEncounter.nameDe,
          evolution_chain_id: initialEncounter.evolution_chain_id,
        }
      : null,
  )
  const [nickname, setNickname] = useState(initialEncounter?.nickname ?? '')
  const [encounterType, setEncounterType] = useState<EncounterType>(initialEncounter?.encounterType ?? 'normal')
  const [outcome, setOutcome] = useState<EncounterOutcome>(initialEncounter?.outcome ?? 'caught')
  const [isDead, setIsDead] = useState(initialEncounter?.isDead ?? false)
  const [notes, setNotes] = useState(initialEncounter?.notes ?? '')
  const [selectedPlayerId, setSelectedPlayerId] = useState<PlayerId>(initialEncounter?.playerId ?? playerId ?? 'p1')
  const [saving, setSaving] = useState(false)

  const validation = useMemo(() => {
    if (!selectedPokemon) return null

    return validateEncounterSelection({
      project,
      pokemon: selectedPokemon,
      encounterType,
      encounters: encountersInProject,
      currentEncounterId: initialEncounter?.id,
      currentEncounterIds: initialEncounter ? [initialEncounter.id] : [],
      currentLinkGroupId: initialEncounter?.linkGroupId ?? null,
      currentCreatedAt: initialEncounter?.createdAt,
      playerId: selectedPlayerId,
    })
  }, [
    project,
    selectedPokemon,
    encounterType,
    encountersInProject,
    initialEncounter?.createdAt,
    initialEncounter?.id,
    initialEncounter?.linkGroupId,
    selectedPlayerId,
  ])

  const canSave = Boolean(selectedPokemon) && !saving && (validation ? validation.allowed : false)

  const handleSave = async () => {
    if (!selectedPokemon || !canSave) return

    setSaving(true)

    const payload: Encounter = {
      id: initialEncounter?.id ?? crypto.randomUUID(),
      projectId,
      locationId,
      createdAt: initialEncounter?.createdAt ?? Date.now(),
      playerId: isSoulLinkProject(project) ? selectedPlayerId : undefined,
      linkedEncounterId: initialEncounter?.linkedEncounterId ?? null,
      linkGroupId: initialEncounter?.linkGroupId ?? null,
      pokemonId: selectedPokemon.id,
      slug: selectedPokemon.slug,
      nameDe: selectedPokemon.nameDe,
      evolution_chain_id: selectedPokemon.evolution_chain_id,
      nickname: nickname.trim(),
      encounterType,
      outcome,
      isDead: outcome === 'caught' ? isDead : false,
      notes: notes.trim(),
    }

    if (isSoulLinkProject(project) && payload.linkedEncounterId) {
      await db.transaction('rw', db.encounters, async () => {
        await db.encounters.put(payload)
        await db.encounters.update(payload.linkedEncounterId!, { isDead: payload.isDead })
      })
    } else {
      await db.encounters.put(payload)
    }
    setSaving(false)
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white p-5 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-900">
          {initialEncounter ? 'Begegnung bearbeiten' : 'Begegnung hinzufügen'}
        </h2>

        <div className="mt-4 space-y-4">
          {isSoulLinkProject(project) ? (
            <div>
              <label htmlFor="encounter-player" className="mb-2 block text-sm font-medium text-slate-700">
                Spieler
              </label>
              <select
                id="encounter-player"
                value={selectedPlayerId}
                onChange={(event) => setSelectedPlayerId(event.target.value as PlayerId)}
                disabled={Boolean(playerId)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-sky-500 transition focus:ring-2 disabled:bg-slate-100"
              >
                <option value="p1">Spieler 1</option>
                <option value="p2">Spieler 2</option>
              </select>
            </div>
          ) : null}

          <PokemonSearch onSelect={setSelectedPokemon} />

          {selectedPokemon ? (
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              Ausgewählt: {selectedPokemon.nameDe} ({selectedPokemon.slug})
            </div>
          ) : (
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
              Bitte ein Pokémon wählen.
            </div>
          )}

          {validation ? (
            <div className="space-y-1 text-sm">
              <p className={validation.allowed ? 'text-emerald-700' : 'text-rose-700'}>{validation.message}</p>
              {validation.warning ? <p className="text-amber-700">{validation.warning}</p> : null}
            </div>
          ) : null}

          <div>
            <label htmlFor="encounter-nickname" className="mb-2 block text-sm font-medium text-slate-700">
              Spitzname (optional)
            </label>
            <input
              id="encounter-nickname"
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-sky-500 transition focus:ring-2"
            />
          </div>

          <div>
            <label htmlFor="encounter-type" className="mb-2 block text-sm font-medium text-slate-700">
              Begegnungstyp
            </label>
            <select
              id="encounter-type"
              value={encounterType}
              onChange={(event) => setEncounterType(event.target.value as EncounterType)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-sky-500 transition focus:ring-2"
            >
              {ENCOUNTER_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <fieldset>
            <legend className="mb-2 block text-sm font-medium text-slate-700">Ergebnis</legend>
            <div className="flex flex-wrap gap-3">
              {OUTCOME_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700"
                >
                  <input
                    type="radio"
                    checked={outcome === option.value}
                    onChange={() => {
                      setOutcome(option.value)
                      if (option.value !== 'caught') setIsDead(false)
                    }}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {outcome === 'caught' ? (
            <label className="flex items-center justify-between gap-4 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700">
              <span>Verstorben</span>
              <input
                type="checkbox"
                checked={isDead}
                onChange={(event) => setIsDead(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
              />
            </label>
          ) : null}

          <div>
            <label htmlFor="encounter-notes" className="mb-2 block text-sm font-medium text-slate-700">
              Notiz (optional)
            </label>
            <textarea
              id="encounter-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-sky-500 transition focus:ring-2"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {saving ? 'Speichert...' : 'Speichern'}
            </button>
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
    </div>
  )
}



