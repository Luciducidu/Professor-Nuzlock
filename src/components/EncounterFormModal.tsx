import { useEffect, useMemo, useState } from 'react'
import { db } from '../lib/db'
import {
  discardEncounterDraft,
  getEncounterDraft,
  saveSingleEncounterDraft,
  toDraftEntry,
  toPokemonFromDraft,
} from '../lib/encounterDrafts'
import { getDefaultForm, getFormByKey, getPokedexEntry } from '../lib/pokedex'
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
import { EncounterDraftBox, EncounterValidBox, EncounterWarningBox } from './EncounterFeedback'
import { PokemonSearch } from './PokemonSearch'

type EncounterFormModalProps = {
  project: Project
  projectId: string
  locationId: string
  encountersInProject: Encounter[]
  initialEncounter?: Encounter
  playerId?: PlayerId
  onClose: () => void
  onSaved: () => void
  onDraftChanged?: () => void
}

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

export function EncounterFormModal({
  project,
  projectId,
  locationId,
  encountersInProject,
  initialEncounter,
  playerId,
  onClose,
  onSaved,
  onDraftChanged,
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
  const [formKey, setFormKey] = useState(initialEncounter?.formKey ?? '')
  const [encounterType, setEncounterType] = useState<EncounterType>(initialEncounter?.encounterType ?? 'normal')
  const [outcome, setOutcome] = useState<EncounterOutcome>(initialEncounter?.outcome ?? 'caught')
  const [isDead, setIsDead] = useState(initialEncounter?.isDead ?? false)
  const [notes, setNotes] = useState(initialEncounter?.notes ?? '')
  const [selectedPlayerId, setSelectedPlayerId] = useState<PlayerId>(initialEncounter?.playerId ?? playerId ?? 'p1')
  const [saving, setSaving] = useState(false)
  const [draftSaving, setDraftSaving] = useState(false)
  const [hasDraft, setHasDraft] = useState(false)
  const [draftLoaded, setDraftLoaded] = useState(Boolean(initialEncounter))
  const [draftNotice, setDraftNotice] = useState('')

  useEffect(() => {
    if (initialEncounter) return

    let active = true

    const loadDraft = async () => {
      const draft = await getEncounterDraft(projectId, locationId, 'single')
      if (!active) return

      if (draft?.entry) {
        setSelectedPokemon(toPokemonFromDraft(draft.entry))
        setNickname(draft.entry.nickname)
        setFormKey(draft.entry.formKey ?? '')
        setEncounterType(draft.entry.encounterType)
        setOutcome(draft.entry.outcome)
        setIsDead(draft.entry.isDead)
        setNotes(draft.entry.notes)
        setSelectedPlayerId(draft.playerId ?? playerId ?? 'p1')
        setHasDraft(true)
      }

      setDraftLoaded(true)
    }

    void loadDraft()

    return () => {
      active = false
    }
  }, [initialEncounter, locationId, playerId, projectId])

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

  const selectedPokedexEntry = useMemo(
    () => (selectedPokemon ? getPokedexEntry(selectedPokemon.id) : null),
    [selectedPokemon],
  )
  const availableForms = selectedPokedexEntry?.forms ?? []
  const activeForm =
    getFormByKey(selectedPokedexEntry, formKey) ?? getDefaultForm(selectedPokedexEntry)

  useEffect(() => {
    if (!selectedPokedexEntry) return
    if (availableForms.length === 0) return

    const nextDefaultKey = activeForm?.key ?? availableForms[0]?.key ?? ''
    if (!formKey || !availableForms.some((form) => form.key === formKey)) {
      setFormKey(nextDefaultKey)
    }
  }, [activeForm?.key, availableForms, formKey, selectedPokedexEntry])

  const draftEntry = useMemo(
    () =>
      toDraftEntry({
        selectedPokemon,
        formKey: activeForm?.key,
        formName: activeForm?.nameDe,
        formSlug: activeForm?.slug,
        formPokemonId: activeForm?.pokemonId ?? null,
        nickname,
        encounterType,
        outcome,
        isDead: outcome === 'caught' ? isDead : false,
        notes,
      }),
    [activeForm?.key, activeForm?.nameDe, activeForm?.pokemonId, activeForm?.slug, encounterType, isDead, nickname, notes, outcome, selectedPokemon],
  )

  const finalSaveAllowed = Boolean(selectedPokemon) && Boolean(validation?.allowed)
  const canSave = finalSaveAllowed && !saving

  useEffect(() => {
    if (initialEncounter || !draftLoaded) return

    const timeoutId = window.setTimeout(async () => {
      setDraftSaving(true)

      await saveSingleEncounterDraft({
        projectId,
        locationId,
        challengeType: project.challengeType ?? 'nuzlocke',
        playerId: isSoulLinkProject(project) ? selectedPlayerId : undefined,
        entry: draftEntry,
        finalSaveAllowed,
      })

      setHasDraft(Boolean(draftEntry))
      setDraftSaving(false)
      onDraftChanged?.()
    }, 350)

    return () => window.clearTimeout(timeoutId)
  }, [
    draftEntry,
    draftLoaded,
    finalSaveAllowed,
    initialEncounter,
    locationId,
    onDraftChanged,
    project,
    projectId,
    selectedPlayerId,
  ])

  const handleSaveDraft = async () => {
    if (initialEncounter) return

    setDraftSaving(true)
    await saveSingleEncounterDraft({
      projectId,
      locationId,
      challengeType: project.challengeType ?? 'nuzlocke',
      playerId: isSoulLinkProject(project) ? selectedPlayerId : undefined,
      entry: draftEntry,
      finalSaveAllowed,
    })
    setHasDraft(Boolean(draftEntry))
    setDraftSaving(false)
    setDraftNotice('Entwurf wurde gespeichert.')
    onDraftChanged?.()
  }

  const handleDiscardDraft = async () => {
    if (initialEncounter) return

    await discardEncounterDraft(projectId, locationId, 'single')
    setSelectedPokemon(null)
    setNickname('')
    setFormKey('')
    setEncounterType('normal')
    setOutcome('caught')
    setIsDead(false)
    setNotes('')
    setSelectedPlayerId(playerId ?? 'p1')
    setHasDraft(false)
    setDraftNotice('')
    onDraftChanged?.()
  }

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
      formKey: activeForm?.key,
      formName: activeForm?.nameDe,
      formSlug: activeForm?.slug,
      formPokemonId: activeForm?.pokemonId ?? null,
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

    if (!initialEncounter) {
      await discardEncounterDraft(projectId, locationId, 'single')
      onDraftChanged?.()
    }

    setSaving(false)
    onSaved()
    onClose()
  }

  const errorMessage = !selectedPokemon
    ? 'Dieses Pokémon kann nicht gespeichert werden. Bitte wähle zuerst ein Pokémon aus.'
    : validation && !validation.allowed
      ? validation.message
      : ''

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white p-5 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-900">
          {initialEncounter ? 'Begegnung bearbeiten' : 'Begegnung hinzufügen'}
        </h2>

        <div className="mt-4 space-y-4">
          {!initialEncounter && hasDraft ? (
            <EncounterDraftBox
              title="Du bearbeitest gerade einen Entwurf."
              message="Der Entwurf bleibt erhalten, bis du ihn final speicherst oder verwirfst."
            />
          ) : null}

          {errorMessage ? (
            <EncounterWarningBox title="Dieses Pokémon kann nicht gespeichert werden." message={errorMessage} />
          ) : validation?.allowed ? (
            <EncounterValidBox />
          ) : null}

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

          {availableForms.length > 1 ? (
            <div>
              <label htmlFor="encounter-form" className="mb-2 block text-sm font-medium text-slate-700">
                Form
              </label>
              <select
                id="encounter-form"
                value={activeForm?.key ?? ''}
                onChange={(event) => setFormKey(event.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-sky-500 transition focus:ring-2"
              >
                {availableForms.map((form) => (
                  <option key={form.key} value={form.key}>
                    {form.nameDe}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {validation?.warning ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {validation.warning}
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

          {errorMessage ? (
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
              disabled={!canSave}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-50"
            >
              {saving ? 'Speichert...' : initialEncounter ? 'Final speichern' : 'Final speichern'}
            </button>
            {!initialEncounter ? (
              <>
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
                  disabled={!hasDraft}
                  className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                >
                  Entwurf verwerfen
                </button>
              </>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Schließen
            </button>
          </div>

          {errorMessage ? (
            <p className="text-sm text-rose-700">Speichern nicht möglich, solange ein Regelverstoß vorliegt.</p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
