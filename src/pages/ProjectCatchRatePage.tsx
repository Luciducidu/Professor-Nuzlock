import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import pokemonIndex from '../data/pokemonIndex.json'
import { ProjectLayout } from '../components/ProjectLayout'
import { calculateCatchRate, type CatchBall, type CatchStatus } from '../lib/catchRate'
import { getDefaultForm, getFormByKey, getPokedexEntry, getSpriteUrl, getTypeMeta } from '../lib/pokedex'
import { formatGameName } from '../lib/projectSettings'
import type { PokemonIndexEntry, Project } from '../lib/types'

const POKEMON_INDEX = pokemonIndex as PokemonIndexEntry[]

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

  const [query, setQuery] = useState('')
  const [selectedPokemon, setSelectedPokemon] = useState<PokemonIndexEntry | null>(null)
  const [formKey, setFormKey] = useState('')
  const [level, setLevel] = useState('10')
  const [ball, setBall] = useState<CatchBall>('poke-ball')
  const [status, setStatus] = useState<CatchStatus>('none')
  const [hpPercent, setHpPercent] = useState(100)
  const [maxHp, setMaxHp] = useState('100')
  const [currentHp, setCurrentHp] = useState('100')
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

  const searchResults = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return POKEMON_INDEX.slice(0, 12)
    return POKEMON_INDEX.filter((pokemon) => {
      const de = pokemon.nameDe.toLowerCase()
      const en = pokemon.slug.toLowerCase()
      return de.includes(normalized) || en.includes(normalized)
    }).slice(0, 12)
  }, [query])

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

  useEffect(() => {
    const nextCurrentHp = Math.max(1, Math.round((parsedMaxHp * hpPercent) / 100))
    setCurrentHp(String(nextCurrentHp))
  }, [hpPercent, parsedMaxHp])

  useEffect(() => {
    const nextPercent = Math.max(1, Math.min(100, Math.round((parsedCurrentHp / parsedMaxHp) * 100)))
    setHpPercent((current) => (current === nextPercent ? current : nextPercent))
  }, [parsedCurrentHp, parsedMaxHp])

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

  const resultMessage = !selectedPokemon
    ? 'Bitte ein Pokémon auswählen.'
    : !selectedEntry
      ? 'Für dieses Pokémon fehlen Pokédexdaten.'
      : selectedEntry.catchRate == null
        ? 'Für dieses Pokémon fehlen Fangdaten.'
        : null

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Fangratenrechner</h2>
            <p className="mt-1 text-sm text-slate-600">Berechnung für {formatGameName(project.game)}</p>
          </div>
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
            Version 1 berücksichtigt keine kritischen Fänge, dark grass oder Pass Powers.
          </span>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-3">
            <label htmlFor="catch-pokemon-query" className="block text-sm font-medium text-slate-700">
              Pokémon auswählen
            </label>
            <input
              id="catch-pokemon-query"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Pokémon suchen..."
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base text-slate-900 outline-none ring-sky-500 transition focus:ring-2"
            />
            <div className="grid gap-2 sm:grid-cols-2">
              {searchResults.map((pokemon) => (
                <button
                  key={pokemon.id}
                  type="button"
                  onClick={() => setSelectedPokemon(pokemon)}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${
                    selectedPokemon?.id === pokemon.id
                      ? 'border-sky-300 bg-sky-50'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <img src={getSpriteUrl(pokemon.id)} alt={pokemon.nameDe} className="h-12 w-12 shrink-0" loading="lazy" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{pokemon.nameDe}</p>
                    <p className="truncate text-xs text-slate-500">({pokemon.slug})</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            {selectedEntry ? (
              <div className="flex gap-4">
                <img
                  src={getSpriteUrl(activeForm?.spriteId ?? selectedEntry.spriteId)}
                  alt={activeForm?.nameDe ?? selectedEntry.nameDe}
                  className="h-24 w-24 shrink-0"
                  loading="lazy"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-semibold text-slate-900">{activeForm?.nameDe ?? selectedEntry.nameDe}</p>
                  <p className="text-sm text-slate-500">({activeForm?.nameEn ?? selectedEntry.nameEn})</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(activeForm?.types ?? selectedEntry.types).map((type) => (
                      <TypeChip key={type} typeKey={type} />
                    ))}
                  </div>
                  <p className="mt-3 text-sm text-slate-700">
                    Fangrate: <span className="font-semibold text-slate-900">{selectedEntry.catchRate ?? 'Keine Daten verfügbar'}</span>
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
                </div>
              </div>
            ) : (
              <div className="flex min-h-[132px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-4 text-sm text-slate-500">
                Noch kein Pokémon ausgewählt.
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <SelectField label="Poké Ball" value={ball} onChange={(value) => setBall(value as CatchBall)} options={BALL_OPTIONS} />
          <SelectField label="Status" value={status} onChange={(value) => setStatus(value as CatchStatus)} options={STATUS_OPTIONS} />
          <NumberField label="Level" value={level} onChange={setLevel} min={1} />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">KP-Leiste</h3>
            <p className="mt-1 text-sm text-slate-600">
              Aktuell: {parsedCurrentHp} / {parsedMaxHp} KP ({hpPercent}%)
            </p>
          </div>
          <button
            type="button"
            onClick={() => setHpPercent(1)}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Auf 1 KP setzen
          </button>
        </div>

        <div className="mt-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className={`text-lg font-semibold ${getHpTextClass(hpPercent)}`}>{hpPercent} % HP</p>
            <p className="text-sm text-slate-500">{parsedCurrentHp} / {parsedMaxHp} KP</p>
          </div>
          <input
            type="range"
            min={1}
            max={100}
            value={hpPercent}
            onChange={(event) => setHpPercent(Number(event.target.value))}
            aria-label="Aktuelle KP in Prozent"
            className={`h-4 w-full cursor-grab appearance-none rounded-full active:cursor-grabbing ${getHpSliderClass(hpPercent)}`}
            style={getHpSliderStyle(hpPercent)}
          />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Ergebnis</h3>
        {result && !resultMessage ? (
          <div className="mt-4 space-y-4">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <p className="text-sm font-medium text-emerald-800">Fangchance pro Ball</p>
              <p className="mt-2 text-4xl font-bold text-emerald-900">{formatPercent(result.chancePerBall)}</p>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/80">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-[width] duration-200"
                  style={{ width: `${Math.max(2, result.chancePerBall * 100)}%` }}
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <ResultCard label="Chance nach 5 Bällen" value={formatPercent(result.chanceAfter5)} />
              <ResultCard label="Chance nach 10 Bällen" value={formatPercent(result.chanceAfter10)} />
              <ResultCard label="Chance nach 20 Bällen" value={formatPercent(result.chanceAfter20)} />
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">Verwendete Eingaben</p>
              <ul className="mt-2 grid gap-1 md:grid-cols-2">
                <li>Spiel: {formatGameName(project.game)}</li>
                <li>Pokémon: {selectedEntry?.nameDe}</li>
                <li>Level: {parsedLevel}</li>
                <li>Ball: {BALL_OPTIONS.find((option) => option.value === ball)?.label ?? ball}</li>
                <li>Status: {STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status}</li>
                <li>KP: {parsedCurrentHp} / {parsedMaxHp}</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            {resultMessage ?? 'Bitte gültige Fangdaten angeben.'}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Erweiterte Fangbedingungen</h3>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <ToggleField label="Erster Zug" checked={isFirstTurn} onChange={setIsFirstTurn} />
            <ToggleField label="Bereits im Pokédex gefangen" checked={alreadyOwned} onChange={setAlreadyOwned} />
            <ToggleField label="Nacht oder Höhle" checked={isDarkArea} onChange={setIsDarkArea} />
            <ToggleField label="Surfen / Angeln / Wasser" checked={isWaterEncounter} onChange={setIsWaterEncounter} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField label="Züge vergangen" value={turnsPassed} onChange={setTurnsPassed} min={1} />
            <NumberField label="Maximale KP" value={maxHp} onChange={setMaxHp} min={1} />
            <NumberField label="Aktuelle KP" value={currentHp} onChange={setCurrentHp} min={1} max={parsedMaxHp} />
          </div>
        </div>
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
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm text-slate-600">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  )
}

function TypeChip({ typeKey }: { typeKey: string }) {
  const meta = getTypeMeta(typeKey as Parameters<typeof getTypeMeta>[0])
  const iconUrl = `${import.meta.env.BASE_URL}type-icons/${typeKey}.svg`

  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${meta.classes}`}>
      <img src={iconUrl} alt={meta.label} className="h-4 w-4" loading="lazy" />
      <span>{meta.label}</span>
    </span>
  )
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1).replace('.', ',')} %`
}

function getHpSliderClass(hpPercent: number) {
  if (hpPercent <= 20) {
    return '[&::-webkit-slider-thumb]:mt-[-6px] [&::-webkit-slider-thumb]:h-7 [&::-webkit-slider-thumb]:w-7 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-4 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-red-500 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-runnable-track]:h-4 [&::-webkit-slider-runnable-track]:rounded-full [&::-moz-range-thumb]:h-7 [&::-moz-range-thumb]:w-7 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-4 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-red-500 [&::-moz-range-thumb]:shadow-lg [&::-moz-range-track]:h-4 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-transparent'
  }

  if (hpPercent <= 50) {
    return '[&::-webkit-slider-thumb]:mt-[-6px] [&::-webkit-slider-thumb]:h-7 [&::-webkit-slider-thumb]:w-7 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-4 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-amber-400 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-runnable-track]:h-4 [&::-webkit-slider-runnable-track]:rounded-full [&::-moz-range-thumb]:h-7 [&::-moz-range-thumb]:w-7 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-4 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-amber-400 [&::-moz-range-thumb]:shadow-lg [&::-moz-range-track]:h-4 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-transparent'
  }

  return '[&::-webkit-slider-thumb]:mt-[-6px] [&::-webkit-slider-thumb]:h-7 [&::-webkit-slider-thumb]:w-7 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-4 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-emerald-500 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-runnable-track]:h-4 [&::-webkit-slider-runnable-track]:rounded-full [&::-moz-range-thumb]:h-7 [&::-moz-range-thumb]:w-7 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-4 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-emerald-500 [&::-moz-range-thumb]:shadow-lg [&::-moz-range-track]:h-4 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-transparent'
}

function getHpTextClass(hpPercent: number) {
  if (hpPercent <= 20) {
    return 'text-red-600'
  }

  if (hpPercent <= 50) {
    return 'text-amber-600'
  }

  return 'text-emerald-600'
}

function getHpSliderStyle(hpPercent: number) {
  const fillColor = hpPercent <= 20 ? '#ef4444' : hpPercent <= 50 ? '#fbbf24' : '#10b981'
  return {
    background: `linear-gradient(to right, ${fillColor} 0%, ${fillColor} ${hpPercent}%, #e2e8f0 ${hpPercent}%, #e2e8f0 100%)`,
  }
}
