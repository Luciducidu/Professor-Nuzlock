import { useMemo, useState } from 'react'
import { db } from '../lib/db'
import { getPlayerName } from '../lib/soullink'
import { validateEncounterSelection } from '../lib/rules'
import type { Encounter, EncounterOutcome, EncounterType, PlayerId, PokemonIndexEntry, Project } from '../lib/types'
import { PokemonSearch } from './PokemonSearch'

type SoullinkEncounterPairModalProps = {
  project: Project
  projectId: string
  locationId: string
  encountersInProject: Encounter[]
  initialPair?: { p1?: Encounter | null; p2?: Encounter | null }
  onClose: () => void
  onSaved: () => void
}

type EncounterFormState = {
  selectedPokemon: PokemonIndexEntry | null
  nickname: string
  encounterType: EncounterType
  outcome: EncounterOutcome
  isDead: boolean
  notes: string
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

function toState(encounter?: Encounter | null): EncounterFormState {
  return {
    selectedPokemon: encounter
      ? {
          id: encounter.pokemonId,
          slug: encounter.slug,
          nameDe: encounter.nameDe,
          evolution_chain_id: encounter.evolution_chain_id,
        }
      : null,
    nickname: encounter?.nickname ?? '',
    encounterType: encounter?.encounterType ?? 'normal',
    outcome: encounter?.outcome ?? 'caught',
    isDead: encounter?.isDead ?? false,
    notes: encounter?.notes ?? '',
  }
}

export function SoullinkEncounterPairModal({
  project,
  projectId,
  locationId,
  encountersInProject,
  initialPair,
  onClose,
  onSaved,
}: SoullinkEncounterPairModalProps) {
  const [player1, setPlayer1] = useState<EncounterFormState>(toState(initialPair?.p1))
  const [player2, setPlayer2] = useState<EncounterFormState>(toState(initialPair?.p2))
  const [saving, setSaving] = useState(false)

  const validationP1 = useMemo(() => {
    if (!player1.selectedPokemon) return null
    return validateEncounterSelection({
      project,
      pokemon: player1.selectedPokemon,
      encounterType: player1.encounterType,
      encounters: encountersInProject,
      currentEncounterId: initialPair?.p1?.id,
      currentEncounterIds: [initialPair?.p1?.id, initialPair?.p2?.id].filter(Boolean) as string[],
      currentLinkGroupId: initialPair?.p1?.linkGroupId ?? initialPair?.p2?.linkGroupId ?? null,
      currentCreatedAt: initialPair?.p1?.createdAt ?? initialPair?.p2?.createdAt,
      playerId: 'p1',
    })
  }, [
    encountersInProject,
    initialPair?.p1?.createdAt,
    initialPair?.p1?.id,
    initialPair?.p1?.linkGroupId,
    initialPair?.p2?.createdAt,
    initialPair?.p2?.id,
    initialPair?.p2?.linkGroupId,
    player1.encounterType,
    player1.selectedPokemon,
    project,
  ])

  const validationP2 = useMemo(() => {
    if (!player2.selectedPokemon) return null
    return validateEncounterSelection({
      project,
      pokemon: player2.selectedPokemon,
      encounterType: player2.encounterType,
      encounters: encountersInProject,
      currentEncounterId: initialPair?.p2?.id,
      currentEncounterIds: [initialPair?.p1?.id, initialPair?.p2?.id].filter(Boolean) as string[],
      currentLinkGroupId: initialPair?.p1?.linkGroupId ?? initialPair?.p2?.linkGroupId ?? null,
      currentCreatedAt: initialPair?.p1?.createdAt ?? initialPair?.p2?.createdAt,
      playerId: 'p2',
    })
  }, [
    encountersInProject,
    initialPair?.p1?.createdAt,
    initialPair?.p1?.id,
    initialPair?.p1?.linkGroupId,
    initialPair?.p2?.createdAt,
    initialPair?.p2?.id,
    initialPair?.p2?.linkGroupId,
    player2.encounterType,
    player2.selectedPokemon,
    project,
  ])

  const canSave =
    Boolean(player1.selectedPokemon) &&
    Boolean(player2.selectedPokemon) &&
    Boolean(validationP1?.allowed) &&
    Boolean(validationP2?.allowed) &&
    !saving

  const handleSave = async () => {
    if (!player1.selectedPokemon || !player2.selectedPokemon || !canSave) return

    setSaving(true)

    const linkGroupId = initialPair?.p1?.linkGroupId ?? initialPair?.p2?.linkGroupId ?? crypto.randomUUID()
    const id1 = initialPair?.p1?.id ?? crypto.randomUUID()
    const id2 = initialPair?.p2?.id ?? crypto.randomUUID()
    const sharedDead =
      player1.outcome === 'caught' && player2.outcome === 'caught' ? player1.isDead || player2.isDead : false

    const payloads: Encounter[] = [
      buildPayload('p1', player1, id1, id2, linkGroupId, projectId, locationId, initialPair?.p1?.createdAt, sharedDead),
      buildPayload('p2', player2, id2, id1, linkGroupId, projectId, locationId, initialPair?.p2?.createdAt, sharedDead),
    ]

    await db.transaction('rw', db.encounters, async () => {
      await db.encounters.bulkPut(payloads)
    })

    setSaving(false)
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-6xl rounded-xl bg-white p-5 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-900">
          {initialPair?.p1 || initialPair?.p2 ? 'Soullink-Paar bearbeiten' : 'Soullink-Paar hinzufügen'}
        </h2>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <PlayerEncounterForm
            title={getPlayerName(project, 'p1')}
            state={player1}
            onChange={setPlayer1}
            validation={validationP1}
          />
          <PlayerEncounterForm
            title={getPlayerName(project, 'p2')}
            state={player2}
            onChange={setPlayer2}
            validation={validationP2}
          />
        </div>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {saving ? 'Speichert...' : 'Beide speichern'}
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
  )
}

function PlayerEncounterForm({
  title,
  state,
  onChange,
  validation,
}: {
  title: string
  state: EncounterFormState
  onChange: (next: EncounterFormState) => void
  validation: { allowed: boolean; message: string; warning?: string } | null
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <div className="mt-4 space-y-4">
        <PokemonSearch onSelect={(pokemon) => onChange({ ...state, selectedPokemon: pokemon })} />

        {state.selectedPokemon ? (
          <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
            Ausgewählt: {state.selectedPokemon.nameDe} ({state.selectedPokemon.slug})
          </div>
        ) : (
          <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500">
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
          <label className="mb-2 block text-sm font-medium text-slate-700">Spitzname (optional)</label>
          <input
            value={state.nickname}
            onChange={(event) => onChange({ ...state, nickname: event.target.value })}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-sky-500 transition focus:ring-2"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Begegnungstyp</label>
          <select
            value={state.encounterType}
            onChange={(event) => onChange({ ...state, encounterType: event.target.value as EncounterType })}
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
                className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              >
                <input
                  type="radio"
                  checked={state.outcome === option.value}
                  onChange={() =>
                    onChange({
                      ...state,
                      outcome: option.value,
                      isDead: option.value === 'caught' ? state.isDead : false,
                    })
                  }
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {state.outcome === 'caught' ? (
          <label className="flex items-center justify-between gap-4 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
            <span>Verstorben</span>
            <input
              type="checkbox"
              checked={state.isDead}
              onChange={(event) => onChange({ ...state, isDead: event.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
            />
          </label>
        ) : null}

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Notiz (optional)</label>
          <textarea
            value={state.notes}
            onChange={(event) => onChange({ ...state, notes: event.target.value })}
            rows={3}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-sky-500 transition focus:ring-2"
          />
        </div>
      </div>
    </section>
  )
}

function buildPayload(
  playerId: PlayerId,
  state: EncounterFormState,
  id: string,
  linkedEncounterId: string,
  linkGroupId: string,
  projectId: string,
  locationId: string,
  createdAt: number | undefined,
  sharedDead: boolean,
): Encounter {
  if (!state.selectedPokemon) {
    throw new Error('Soullink-Encounter ohne Pokémon kann nicht gespeichert werden.')
  }

  return {
    id,
    projectId,
    locationId,
    createdAt: createdAt ?? Date.now(),
    playerId,
    linkedEncounterId,
    linkGroupId,
    pokemonId: state.selectedPokemon.id,
    slug: state.selectedPokemon.slug,
    nameDe: state.selectedPokemon.nameDe,
    evolution_chain_id: state.selectedPokemon.evolution_chain_id,
    nickname: state.nickname.trim(),
    encounterType: state.encounterType,
    outcome: state.outcome,
    isDead: state.outcome === 'caught' ? sharedDead : false,
    notes: state.notes.trim(),
  }
}
