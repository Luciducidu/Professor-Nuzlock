import { useEffect, useMemo, useState } from 'react'
import { db } from '../lib/db'
import {
  discardEncounterDraft,
  getEncounterDraft,
  saveSoullinkEncounterDraft,
  toDraftEntry,
  toPokemonFromDraft,
} from '../lib/encounterDrafts'
import { getPlayerName } from '../lib/soullink'
import { validateEncounterSelection } from '../lib/rules'
import type {
  Encounter,
  EncounterDraftEntry,
  EncounterOutcome,
  EncounterType,
  PlayerId,
  PokemonIndexEntry,
  Project,
} from '../lib/types'
import { EncounterDraftBox, EncounterValidBox, EncounterWarningBox } from './EncounterFeedback'
import { PokemonSearch } from './PokemonSearch'

type SoullinkEncounterPairModalProps = {
  project: Project
  projectId: string
  locationId: string
  encountersInProject: Encounter[]
  initialPair?: { p1?: Encounter | null; p2?: Encounter | null }
  title?: string
  allowedEncounterTypes?: EncounterType[]
  defaultEncounterType?: EncounterType
  draftType?: 'main' | 'extra'
  onClose: () => void
  onSaved: () => void
  onDraftChanged?: () => void
}

type EncounterFormState = {
  selectedPokemon: PokemonIndexEntry | null
  nickname: string
  encounterType: EncounterType
  outcome: EncounterOutcome
  isDead: boolean
  notes: string
}

type RuleValidation = { allowed: boolean; message: string; warning?: string } | null

const ENCOUNTER_TYPE_OPTIONS: Array<{ value: EncounterType; label: string }> = [
  { value: 'normal', label: 'Normal' },
  { value: 'shiny', label: 'Shiny' },
  { value: 'static', label: 'Static' },
  { value: 'gift', label: 'Geschenk' },
]

const OUTCOME_OPTIONS: Array<{ value: EncounterOutcome; label: string }> = [
  { value: 'caught', label: 'Gefangen' },
  { value: 'not_caught', label: 'Nicht gefangen' },
]

function toState(encounter: Encounter | null | undefined, defaultEncounterType: EncounterType): EncounterFormState {
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
    encounterType: encounter?.encounterType ?? defaultEncounterType,
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
  title,
  allowedEncounterTypes = ['normal', 'shiny', 'static'],
  defaultEncounterType = 'normal',
  draftType = 'main',
  onClose,
  onSaved,
  onDraftChanged,
}: SoullinkEncounterPairModalProps) {
  const [player1, setPlayer1] = useState<EncounterFormState>(toState(initialPair?.p1, defaultEncounterType))
  const [player2, setPlayer2] = useState<EncounterFormState>(toState(initialPair?.p2, defaultEncounterType))
  const [saving, setSaving] = useState(false)
  const [draftSaving, setDraftSaving] = useState(false)
  const [hasDraft, setHasDraft] = useState(false)
  const [draftLoaded, setDraftLoaded] = useState(Boolean(initialPair?.p1 || initialPair?.p2))
  const [draftNotice, setDraftNotice] = useState('')

  useEffect(() => {
    if (initialPair?.p1 || initialPair?.p2) return

    let active = true

    const loadDraft = async () => {
      const draft = await getEncounterDraft(projectId, locationId, draftType)
      if (!active) return

      if (draft?.pair) {
        if (draft.pair.p1) {
          setPlayer1(fromDraftEntry(draft.pair.p1, defaultEncounterType))
        }
        if (draft.pair.p2) {
          setPlayer2(fromDraftEntry(draft.pair.p2, defaultEncounterType))
        }
        setHasDraft(true)
      }

      setDraftLoaded(true)
    }

    void loadDraft()

    return () => {
      active = false
    }
  }, [defaultEncounterType, draftType, initialPair?.p1, initialPair?.p2, locationId, projectId])

  const validationP1 = useMemo(
    () => buildValidation(project, encountersInProject, initialPair, player1, 'p1'),
    [encountersInProject, initialPair, player1, project],
  )
  const validationP2 = useMemo(
    () => buildValidation(project, encountersInProject, initialPair, player2, 'p2'),
    [encountersInProject, initialPair, player2, project],
  )

  const draftEntryP1 = useMemo(() => toDraftEntryFromState(player1), [player1])
  const draftEntryP2 = useMemo(() => toDraftEntryFromState(player2), [player2])

  const isComplete = Boolean(player1.selectedPokemon) && Boolean(player2.selectedPokemon)
  const finalSaveAllowed =
    isComplete && Boolean(validationP1?.allowed) && Boolean(validationP2?.allowed)

  useEffect(() => {
    if ((initialPair?.p1 || initialPair?.p2) || !draftLoaded) return

    const timeoutId = window.setTimeout(async () => {
      setDraftSaving(true)
      await saveSoullinkEncounterDraft({
        projectId,
        locationId,
        draftType,
        pair: { p1: draftEntryP1, p2: draftEntryP2 },
        finalSaveAllowed,
      })
      setHasDraft(Boolean(draftEntryP1 || draftEntryP2))
      setDraftSaving(false)
      onDraftChanged?.()
    }, 350)

    return () => window.clearTimeout(timeoutId)
  }, [
    draftEntryP1,
    draftEntryP2,
    draftLoaded,
    draftType,
    finalSaveAllowed,
    initialPair?.p1,
    initialPair?.p2,
    locationId,
    onDraftChanged,
    projectId,
  ])

  const handleSaveDraft = async () => {
    setDraftSaving(true)
    await saveSoullinkEncounterDraft({
      projectId,
      locationId,
      draftType,
      pair: { p1: draftEntryP1, p2: draftEntryP2 },
      finalSaveAllowed,
    })
    setHasDraft(Boolean(draftEntryP1 || draftEntryP2))
    setDraftSaving(false)
    setDraftNotice('Entwurf wurde gespeichert.')
    onDraftChanged?.()
  }

  const handleDiscardDraft = async () => {
    await discardEncounterDraft(projectId, locationId, draftType)
    setPlayer1(toState(null, defaultEncounterType))
    setPlayer2(toState(null, defaultEncounterType))
    setHasDraft(false)
    setDraftNotice('')
    onDraftChanged?.()
  }

  const handleSave = async () => {
    if (!player1.selectedPokemon || !player2.selectedPokemon || !finalSaveAllowed || saving) return

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

    if (!initialPair?.p1 && !initialPair?.p2) {
      await discardEncounterDraft(projectId, locationId, draftType)
      onDraftChanged?.()
    }

    setSaving(false)
    onSaved()
    onClose()
  }

  const pairError = !isComplete
    ? 'Soullink-Fehler: Beide Seiten müssen ausgefüllt sein.'
    : validationP1 && !validationP1.allowed
      ? validationP1.message
      : validationP2 && !validationP2.allowed
        ? validationP2.message
        : ''

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-6xl rounded-xl bg-white p-5 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-900">
          {title ?? (initialPair?.p1 || initialPair?.p2 ? 'Soullink-Paar bearbeiten' : 'Soullink-Paar hinzufügen')}
        </h2>

        <div className="mt-4 space-y-4">
          {(hasDraft || (!initialPair?.p1 && !initialPair?.p2 && (draftEntryP1 || draftEntryP2))) ? (
            <EncounterDraftBox
              title="Du bearbeitest gerade einen Entwurf."
              message={
                isComplete
                  ? 'Beide Seiten sind als Entwurf gespeichert und können später finalisiert werden.'
                  : 'Unvollständiger Soullink-Entwurf. Finales Speichern bleibt blockiert, bis beide Seiten befüllt sind.'
              }
            />
          ) : null}

          {pairError ? (
            <EncounterWarningBox title="Dieses Paar kann nicht gespeichert werden." message={pairError} />
          ) : (
            <EncounterValidBox />
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <PlayerEncounterForm
              title={getPlayerName(project, 'p1')}
              state={player1}
              onChange={setPlayer1}
              validation={validationP1}
              allowedEncounterTypes={allowedEncounterTypes}
            />
            <PlayerEncounterForm
              title={getPlayerName(project, 'p2')}
              state={player2}
              onChange={setPlayer2}
              validation={validationP2}
              allowedEncounterTypes={allowedEncounterTypes}
            />
          </div>

          {pairError ? (
            <EncounterWarningBox
              title="Speichern aktuell blockiert"
              message="Speichern nicht möglich, solange ein Regelverstoß vorliegt."
            />
          ) : null}

          {draftNotice ? (
            <div className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-700">
              {draftNotice}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={!finalSaveAllowed || saving}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-50"
            >
              {saving ? 'Speichert...' : 'Final speichern'}
            </button>
            <button
              type="button"
              onClick={() => void handleSaveDraft()}
              disabled={draftSaving}
              className="rounded-md border border-sky-300 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-800 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {draftSaving ? 'Entwurf wird gespeichert...' : hasDraft ? 'Entwurf aktualisieren' : 'Als Entwurf speichern'}
            </button>
            <button
              type="button"
              onClick={() => void handleDiscardDraft()}
              disabled={!hasDraft && !draftEntryP1 && !draftEntryP2}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
            >
              Entwurf verwerfen
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Schließen
            </button>
          </div>

          {pairError ? (
            <p className="text-sm text-rose-700">Speichern nicht möglich, solange ein Regelverstoß vorliegt.</p>
          ) : null}
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
  allowedEncounterTypes,
}: {
  title: string
  state: EncounterFormState
  onChange: (next: EncounterFormState) => void
  validation: RuleValidation
  allowedEncounterTypes: EncounterType[]
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

        {state.selectedPokemon && validation?.allowed ? <EncounterValidBox /> : null}
        {state.selectedPokemon && validation && !validation.allowed ? (
          <EncounterWarningBox title="Seite nicht final speicherbar" message={validation.message} />
        ) : null}
        {validation?.warning ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {validation.warning}
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
            {ENCOUNTER_TYPE_OPTIONS.filter((option) => allowedEncounterTypes.includes(option.value)).map((option) => (
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

function fromDraftEntry(entry: EncounterDraftEntry, defaultEncounterType: EncounterType): EncounterFormState {
  return {
    selectedPokemon: toPokemonFromDraft(entry),
    nickname: entry.nickname,
    encounterType: entry.encounterType ?? defaultEncounterType,
    outcome: entry.outcome,
    isDead: entry.isDead,
    notes: entry.notes,
  }
}

function toDraftEntryFromState(state: EncounterFormState): EncounterDraftEntry | null {
  return toDraftEntry({
    selectedPokemon: state.selectedPokemon,
    nickname: state.nickname,
    encounterType: state.encounterType,
    outcome: state.outcome,
    isDead: state.outcome === 'caught' ? state.isDead : false,
    notes: state.notes,
  })
}

function buildValidation(
  project: Project,
  encountersInProject: Encounter[],
  initialPair: { p1?: Encounter | null; p2?: Encounter | null } | undefined,
  state: EncounterFormState,
  playerId: PlayerId,
): RuleValidation {
  if (!state.selectedPokemon) return null

  return validateEncounterSelection({
    project,
    pokemon: state.selectedPokemon,
    encounterType: state.encounterType,
    encounters: encountersInProject,
    currentEncounterId: playerId === 'p1' ? initialPair?.p1?.id : initialPair?.p2?.id,
    currentEncounterIds: [initialPair?.p1?.id, initialPair?.p2?.id].filter(Boolean) as string[],
    currentLinkGroupId: initialPair?.p1?.linkGroupId ?? initialPair?.p2?.linkGroupId ?? null,
    currentCreatedAt: initialPair?.p1?.createdAt ?? initialPair?.p2?.createdAt,
    playerId,
  })
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
