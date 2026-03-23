import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { PokemonSearch } from '../components/PokemonSearch'
import { ProjectLayout } from '../components/ProjectLayout'
import { getDefaultForm, getFormByKey, getPokedexEntry } from '../lib/pokedex'
import { formatGameName } from '../lib/projectSettings'
import { calculateCatchRate, type CatchBall, type CatchStatus } from '../lib/catchRate'
import type { PokemonIndexEntry, Project } from '../lib/types'

const BALL_OPTIONS: Array<{ value: CatchBall; label: string }> = [
  { value: 'poke-ball', label: 'Poké Ball' },
  { value: 'great-ball', label: 'Great Ball' },
  { value: 'ultra-ball', label: 'Ultra Ball' },
  { value: 'quick-ball', label: 'Quick Ball' },
  { value: 'dusk-ball', label: 'Dusk Ball' },
  { value: 'timer-ball', label: 'Timer Ball' },
  { value: 'repeat-ball', label: 'Repeat Ball' },
  { value: 'net-ball', label: 'Net Ball' },
  { value: 'dive-ball', label: 'Dive Ball' },
  { value: 'nest-ball', label: 'Nest Ball' },
  { value: 'master-ball', label: 'Master Ball' },
]

const STATUS_OPTIONS: Array<{ value: CatchStatus; label: string }> = [
  { value: 'none', label: 'Kein Status' },
  { value: 'sleep', label: 'Schlaf' },
  { value: 'freeze', label: 'Frost' },
  { value: 'paralysis', label: 'Paralyse' },
  { value: 'poison', label: 'Gift' },
  { value: 'burn', label: 'Verbrennung' },
]

type CatchRateLocationState = {
  pokemonId?: number
  formKey?: string | null
}

export function ProjectCatchRatePage() {
  return (
    <ProjectLayout>
      {({ project }) => <ProjectCatchRateContent project={project} />}
    </ProjectLayout>
  )
}

function ProjectCatchRateContent({ project }: { project: Project }) {
  const location = useLocation()
  const routeState = (location.state as CatchRateLocationState | null) ?? null

  const [selectedPokemon, setSelectedPokemon] = useState<PokemonIndexEntry | null>(null)
  const [formKey, setFormKey] = useState('')
  const [level, setLevel] = useState('10')
  const [maxHp, setMaxHp] = useState('30')
  const [currentHp, setCurrentHp] = useState('30')
  const [ball, setBall] = useState<CatchBall>('poke-ball')
  const [status, setStatus] = useState<CatchStatus>('none')
  const [isFirstTurn, setIsFirstTurn] = useState(true)
  const [turnsPassed, setTurnsPassed] = useState('1')
  const [alreadyOwned, setAlreadyOwned] = useState(false)
  const [isDarkArea, setIsDarkArea] = useState(false)
  const [isWaterEncounter, setIsWaterEncounter] = useState(false)

  useEffect(() => {
    if (!routeState?.pokemonId) return
    const entry = getPokedexEntry(routeState.pokemonId)
    if (!entry) return

    setSelectedPokemon({
      id: entry.id,
      slug: entry.slug,
      nameDe: entry.nameDe,
      evolution_chain_id: entry.evolution_chain_id,
    })
    setFormKey(routeState.formKey ?? '')
  }, [routeState?.formKey, routeState?.pokemonId])

  const selectedEntry = useMemo(
    () => (selectedPokemon ? getPokedexEntry(selectedPokemon.id) : null),
    [selectedPokemon],
  )
  const availableForms = selectedEntry?.forms ?? []
  const activeForm = getFormByKey(selectedEntry, formKey) ?? getDefaultForm(selectedEntry)

  useEffect(() => {
    if (!selectedEntry || availableForms.length === 0) return
    const nextKey = activeForm?.key ?? availableForms[0]?.key ?? ''
    if (!formKey || !availableForms.some((form) => form.key === formKey)) {
      setFormKey(nextKey)
    }
  }, [activeForm?.key, availableForms, formKey, selectedEntry])

  const parsedLevel = Math.max(1, Number(level) || 1)
  const parsedMaxHp = Math.max(1, Number(maxHp) || 1)
  const parsedCurrentHp = Math.min(parsedMaxHp, Math.max(1, Number(currentHp) || 1))
  const parsedTurns = Math.max(1, Number(turnsPassed) || 1)

  const result = useMemo(() => {
    if (!selectedEntry || selectedEntry.catchRate == null) return null

    return calculateCatchRate({
      game: project.game,
      catchRate: selectedEntry.catchRate,
      level: parsedLevel,
      currentHp: parsedCurrentHp,
      maxHp: parsedMaxHp,
      ball,
      status,
      isFirstTurn,
      turnsPassed: parsedTurns,
      alreadyOwned,
      isDarkArea,
      isWaterEncounter,
      targetTypes: activeForm?.types ?? selectedEntry.types,
    })
  }, [
    activeForm?.types,
    alreadyOwned,
    ball,
    isDarkArea,
    isFirstTurn,
    isWaterEncounter,
    parsedCurrentHp,
    parsedLevel,
    parsedMaxHp,
    parsedTurns,
    project.game,
    selectedEntry,
    status,
  ])

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Fangratenrechner</h2>
            <p className="mt-1 text-sm text-slate-600">Berechnung für {formatGameName(project.game)}</p>
          </div>
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
            Version 1 berücksichtigt keine kritischen Fänge, dark grass oder Pass Powers.
          </span>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <PokemonSearch onSelect={setSelectedPokemon} />

          {selectedPokemon ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-base font-semibold text-slate-900">
                {selectedPokemon.nameDe} ({selectedPokemon.slug})
              </p>
              {availableForms.length > 1 ? (
                <div className="mt-3">
                  <label htmlFor="catch-form" className="mb-2 block text-sm font-medium text-slate-700">
                    Form
                  </label>
                  <select
                    id="catch-form"
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
              <p className="mt-3 text-sm text-slate-600">Fangrate: {selectedEntry?.catchRate ?? 'Keine Daten verfügbar'}</p>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              Bitte zuerst ein Pokémon auswählen.
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <NumberField label="Level" value={level} onChange={setLevel} min={1} />
            <SelectField label="Status" value={status} onChange={(value) => setStatus(value as CatchStatus)} options={STATUS_OPTIONS} />
            <NumberField label="Maximale KP" value={maxHp} onChange={setMaxHp} min={1} />
            <div>
              <NumberField label="Aktuelle KP" value={currentHp} onChange={setCurrentHp} min={1} max={parsedMaxHp} />
              <button
                type="button"
                onClick={() => setCurrentHp('1')}
                className="mt-2 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Auf 1 KP setzen
              </button>
            </div>
            <SelectField label="Poké Ball" value={ball} onChange={(value) => setBall(value as CatchBall)} options={BALL_OPTIONS} />
            <NumberField label="Züge vergangen" value={turnsPassed} onChange={setTurnsPassed} min={1} />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <ToggleField label="Erster Zug" checked={isFirstTurn} onChange={setIsFirstTurn} />
            <ToggleField label="Bereits im Pokédex als gefangen" checked={alreadyOwned} onChange={setAlreadyOwned} />
            <ToggleField label="Nacht oder Höhle" checked={isDarkArea} onChange={setIsDarkArea} />
            <ToggleField label="Surfen / Angeln / Wasser" checked={isWaterEncounter} onChange={setIsWaterEncounter} />
          </div>
        </div>

        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Ergebnis</h3>
          {selectedEntry && result ? (
            <>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-600">Fangchance pro Ball</p>
                <p className="mt-1 text-3xl font-bold text-slate-900">{formatPercent(result.chancePerBall)}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <ResultCard label="Nach 5 Bällen" value={formatPercent(result.chanceAfter5)} />
                <ResultCard label="Nach 10 Bällen" value={formatPercent(result.chanceAfter10)} />
                <ResultCard label="Nach 20 Bällen" value={formatPercent(result.chanceAfter20)} />
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <p className="font-semibold text-slate-900">Zusammenfassung</p>
                <ul className="mt-2 space-y-1">
                  <li>Spiel: {formatGameName(project.game)}</li>
                  <li>Pokémon: {selectedEntry.nameDe}</li>
                  <li>Level: {parsedLevel}</li>
                  <li>KP: {parsedCurrentHp} / {parsedMaxHp}</li>
                  <li>Ball: {BALL_OPTIONS.find((option) => option.value === ball)?.label ?? ball}</li>
                  <li>Status: {STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status}</li>
                </ul>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">
                <p>Ball-Multiplikator: {formatMultiplier(result.ballModifier)}</p>
                <p className="mt-1">Status-Multiplikator: {formatMultiplier(result.statusModifier)}</p>
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              Keine Daten verfügbar. Bitte ein Pokémon auswählen, damit die Fangchance berechnet werden kann.
            </div>
          )}
        </section>
      </section>
    </div>
  )
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  min?: number
  max?: number
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">{label}</label>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-sky-500 transition focus:ring-2"
      />
    </div>
  )
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string }>
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">{label}</label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-sky-500 transition focus:ring-2"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}

function ToggleField({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
      />
    </label>
  )
}

function ResultCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm text-slate-600">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-900">{value}</p>
    </div>
  )
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1).replace('.', ',')} %`
}

function formatMultiplier(value: number) {
  if (!Number.isFinite(value)) return 'Garantiert'
  return `${value.toFixed(2).replace('.', ',')}×`
}
