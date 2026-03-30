import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  getDefaultForm,
  getEvolutionChain,
  getFormByKey,
  getLevelUpMovesForForm,
  getMoveBySlug,
  getPokedexEntry,
  getSpriteUrl,
  getTypeMeta,
  queryMatchesPokedexEntry,
  searchPokedex,
  type EvolutionChainNode,
  type PokedexFormAbility,
} from '../lib/pokedex'
import { formatGameName } from '../lib/projectSettings'
import { usePokedex } from './PokedexProvider'

const POKEDEX_ICON_URL = `${import.meta.env.BASE_URL}ui/pokedex-cover.jpg`

export function PokedexPanel() {
  const navigate = useNavigate()
  const { id: projectId } = useParams<{ id: string }>()
  const {
    isOpen,
    query,
    selectedPokemonId,
    selectedFormKey,
    currentGame,
    setQuery,
    selectPokemon,
    selectForm,
    backToResults,
    togglePanel,
    closePanel,
  } = usePokedex()
  const [hiddenSprites, setHiddenSprites] = useState<Record<number, boolean>>({})
  const [hiddenTypeIcons, setHiddenTypeIcons] = useState<Record<string, boolean>>({})

  const results = useMemo(() => searchPokedex(query), [query])
  const selectedEntry = getPokedexEntry(selectedPokemonId)
  const activeForm = getFormByKey(selectedEntry, selectedFormKey) ?? getDefaultForm(selectedEntry)
  const selectedChain = getEvolutionChain(selectedEntry?.evolution_chain_id)
  const levelUpMoves = getLevelUpMovesForForm(activeForm, currentGame)
  const searchResultsActive =
    query.trim().length > 0 && (!selectedEntry || !queryMatchesPokedexEntry(query, selectedEntry, activeForm?.key))

  return (
    <>
      {isOpen ? <div className="fixed inset-0 z-30 bg-slate-950/30 lg:hidden" onClick={closePanel} aria-hidden="true" /> : null}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[clamp(20rem,42vw,58rem)] max-w-[calc(100vw-0.75rem)] flex-col border-r border-slate-300 bg-white shadow-[14px_0_50px_rgba(15,23,42,0.18)] transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-[calc(-100%+60px)] xl:translate-x-[calc(-100%+88px)]'
        }`}
      >
        <button
          type="button"
          onClick={togglePanel}
          aria-label={isOpen ? 'Pokédex schließen' : 'Pokédex öffnen'}
          className="absolute right-[-30px] top-1/2 z-50 flex h-[96px] w-[60px] -translate-y-1/2 items-center justify-center overflow-hidden rounded-r-full border-y border-r border-slate-300 bg-white shadow-[12px_0_26px_rgba(15,23,42,0.16)] transition hover:bg-slate-50 xl:right-[-44px] xl:h-[132px] xl:w-[88px]"
        >
          <img src={POKEDEX_ICON_URL} alt="Pokédex" className="h-16 w-16 rounded-xl object-cover" />
        </button>

        <div className="border-b border-slate-200 bg-slate-50 px-4 py-5 sm:px-6 xl:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <img src={POKEDEX_ICON_URL} alt="Pokédex" className="h-16 w-16 rounded-2xl object-cover shadow-sm" />
              <div>
                <p className="text-2xl font-bold text-slate-900 xl:text-3xl">Pokédex</p>
                <p className="text-sm text-slate-600">Suche auf Deutsch und Englisch</p>
              </div>
            </div>
            <button
              type="button"
              onClick={togglePanel}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Schließen
            </button>
          </div>

          <div className="mt-6">
            <label htmlFor="pokedex-query" className="mb-2 block text-sm font-medium text-slate-700">
              Pokémon suchen
            </label>
            <input
              id="pokedex-query"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Name eingeben..."
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base text-slate-900 outline-none ring-sky-500 transition focus:ring-2"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 xl:px-8 xl:py-8">
          {selectedEntry && !searchResultsActive ? (
            <div className="space-y-6">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={backToResults}
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Zurück zur Trefferliste
                </button>
                {query.trim() ? (
                  <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">
                    Tipp: Neue Suche startet sofort beim Tippen.
                  </span>
                ) : null}
              </div>

              <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:gap-6">
                  <Sprite
                    pokemonId={activeForm?.spriteId ?? selectedEntry.spriteId}
                    alt={activeForm?.nameDe ?? selectedEntry.nameDe}
                    hidden={Boolean(hiddenSprites[activeForm?.spriteId ?? selectedEntry.spriteId])}
                    onHide={() =>
                      setHiddenSprites((current) => ({
                        ...current,
                        [activeForm?.spriteId ?? selectedEntry.spriteId]: true,
                      }))
                    }
                    size="h-44 w-44"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-2xl font-bold text-slate-900 sm:text-3xl xl:text-4xl">{activeForm?.nameDe ?? selectedEntry.nameDe}</p>
                    <p className="mt-1 break-words text-sm text-slate-500 sm:text-base xl:text-lg">({activeForm?.nameEn ?? selectedEntry.nameEn})</p>
                    <div className="mt-5 flex flex-wrap gap-3">
                      {(activeForm?.types ?? selectedEntry.types).map((type) => (
                        <TypeBadge
                          key={type}
                          typeKey={type}
                          hidden={Boolean(hiddenTypeIcons[type])}
                          onHide={() => setHiddenTypeIcons((current) => ({ ...current, [type]: true }))}
                        />
                      ))}
                    </div>
                    {projectId ? (
                      <button
                        type="button"
                        onClick={() =>
                          navigate(`/project/${projectId}/fangrate`, {
                            state: { pokemonId: selectedEntry.id, formKey: activeForm?.key ?? null },
                          })
                        }
                        className="mt-5 rounded-md border border-sky-300 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-800 transition hover:bg-sky-100"
                      >
                        Im Fangratenrechner öffnen
                      </button>
                    ) : null}
                  </div>
                </div>
              </section>

              {selectedEntry.forms.length > 1 ? (
                <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
                  <h3 className="text-xl font-semibold text-slate-900">Formen</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedEntry.forms.map((form) => {
                      const active = form.key === activeForm?.key
                      return (
                        <button
                          key={form.key}
                          type="button"
                          onClick={() => selectForm(form.key)}
                          className={`rounded-full border px-3 py-2 text-sm font-semibold transition ${
                            active
                              ? 'border-sky-300 bg-sky-50 text-sky-800'
                              : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {form.nameDe}
                        </button>
                      )
                    })}
                  </div>
                </section>
              ) : null}

              {activeForm ? (
                <>
                  <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
                    <h3 className="text-xl font-semibold text-slate-900">Basiswerte</h3>
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                      <StatRow label="KP" value={activeForm.stats.hp} />
                      <StatRow label="Angriff" value={activeForm.stats.attack} />
                      <StatRow label="Verteidigung" value={activeForm.stats.defense} />
                      <StatRow label="Spezial-Angriff" value={activeForm.stats.specialAttack} />
                      <StatRow label="Spezial-Verteidigung" value={activeForm.stats.specialDefense} />
                      <StatRow label="Initiative" value={activeForm.stats.speed} />
                      <StatRow label="Gesamt" value={activeForm.stats.total} max={720} />
                    </div>
                  </section>

                  <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
                    <h3 className="text-xl font-semibold text-slate-900">Fähigkeiten</h3>
                    <AbilityList title="Fähigkeiten" abilities={activeForm.abilities.filter((ability) => !ability.isHidden)} />
                    <AbilityList
                      title="Versteckte Fähigkeit"
                      abilities={activeForm.abilities.filter((ability) => ability.isHidden)}
                      emptyText="Keine versteckte Fähigkeit"
                    />
                  </section>
                </>
              ) : null}

              <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
                <h3 className="text-xl font-semibold text-slate-900">Entwicklungsreihe</h3>
                {selectedChain ? (
                  <EvolutionTree
                    node={selectedChain.root}
                    selectedPokemonId={selectedEntry.id}
                    onSelect={selectPokemon}
                    hiddenTypeIcons={hiddenTypeIcons}
                    onHideTypeIcon={(typeKey) => setHiddenTypeIcons((current) => ({ ...current, [typeKey]: true }))}
                  />
                ) : (
                  <p className="text-sm text-slate-500">Keine Entwicklungsdaten verfügbar.</p>
                )}
              </section>

              <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-xl font-semibold text-slate-900">Level-Up-Attacken</h3>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    Learnset für {formatGameName(currentGame)}
                  </span>
                </div>
                {levelUpMoves.length > 0 ? (
                  <div className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-50">
                    <div className="min-w-[760px]">
                    <div className="grid grid-cols-[110px_1.6fr_130px_140px_100px_120px] gap-4 border-b border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700">
                      <span>Level</span>
                      <span>Attacke</span>
                      <span>Typ</span>
                      <span>Kategorie</span>
                      <span>Stärke</span>
                      <span>Genauigkeit</span>
                    </div>
                    {levelUpMoves.map((move) => {
                      const moveMeta = getMoveBySlug(move.moveSlug)
                      return (
                        <div
                          key={`${move.level}-${move.moveSlug}`}
                          className="grid grid-cols-[110px_1.6fr_130px_140px_100px_120px] gap-4 border-b border-slate-200 px-5 py-3 text-sm text-slate-800 last:border-b-0"
                        >
                          <span className="font-semibold text-slate-900">Level {move.level}</span>
                          <div className="min-w-0">
                            <div className="font-medium text-slate-900">{moveMeta?.nameDe ?? move.moveSlug}</div>
                            <div className="truncate text-xs text-slate-500">{moveMeta?.nameEn ?? '—'}</div>
                          </div>
                          <MoveTypeBadge typeKey={moveMeta?.type} />
                          <MoveCategoryBadge damageClass={moveMeta?.damageClass} />
                          <span className="font-medium text-slate-900">{moveMeta?.power ?? '—'}</span>
                          <span className="font-medium text-slate-900">{moveMeta?.accuracy ?? '—'}</span>
                        </div>
                      )
                    })}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">Keine Level-Up-Attacken gefunden.</p>
                )}
              </section>
            </div>
          ) : (
            <div className="grid gap-3 2xl:grid-cols-2">
              {results.map((pokemon) => {
                const previewForm = getFormByKey(pokemon, selectedPokemonId === pokemon.id ? selectedFormKey : null) ?? getDefaultForm(pokemon)
                return (
                  <button
                    key={pokemon.id}
                    type="button"
                    onClick={() => selectPokemon(pokemon.id, previewForm?.key)}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left transition hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-4">
                      <Sprite
                        pokemonId={previewForm?.spriteId ?? pokemon.spriteId}
                        alt={previewForm?.nameDe ?? pokemon.nameDe}
                        hidden={Boolean(hiddenSprites[previewForm?.spriteId ?? pokemon.spriteId])}
                        onHide={() =>
                          setHiddenSprites((current) => ({
                            ...current,
                            [previewForm?.spriteId ?? pokemon.spriteId]: true,
                          }))
                        }
                        size="h-20 w-20"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-semibold text-slate-900">{pokemon.nameDe}</p>
                        <p className="truncate text-sm text-slate-500">({pokemon.nameEn})</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {(previewForm?.types ?? pokemon.types).map((type) => (
                            <TypeBadge
                              key={type}
                              typeKey={type}
                              compact
                              hidden={Boolean(hiddenTypeIcons[type])}
                              onHide={() => setHiddenTypeIcons((current) => ({ ...current, [type]: true }))}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </aside>
    </>
  )
}

function EvolutionTree({
  node,
  selectedPokemonId,
  onSelect,
  hiddenTypeIcons,
  onHideTypeIcon,
  depth = 0,
}: {
  node: EvolutionChainNode
  selectedPokemonId: number
  onSelect: (pokemonId: number, formKey?: string | null) => void
  hiddenTypeIcons: Record<string, boolean>
  onHideTypeIcon: (typeKey: string) => void
  depth?: number
}) {
  return (
    <div className={depth === 0 ? 'space-y-4' : 'ml-3 space-y-4 border-l border-slate-200 pl-3 sm:ml-6 sm:pl-5'}>
      <button
        type="button"
        onClick={() => onSelect(node.pokemonId)}
        className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
          node.pokemonId === selectedPokemonId
            ? 'border-sky-300 bg-sky-50 shadow-sm'
            : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
        }`}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <img src={getSpriteUrl(node.spriteId)} alt={node.nameDe} className="h-20 w-20 shrink-0 sm:h-24 sm:w-24" loading="lazy" />
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-slate-900">{node.nameDe}</p>
            <p className="truncate text-sm text-slate-500">({node.nameEn})</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {node.types.map((type) => (
                <TypeBadge
                  key={type}
                  typeKey={type}
                  compact
                  hidden={Boolean(hiddenTypeIcons[type])}
                  onHide={() => onHideTypeIcon(type)}
                />
              ))}
            </div>
          </div>
        </div>
      </button>

      {node.branches.map((branch) => (
        <div key={`${node.pokemonId}-${branch.target.pokemonId}`} className="space-y-2">
          <ul className="rounded-xl bg-amber-50 px-3 py-3 text-sm text-amber-900">
            {branch.conditions.map((condition) => (
              <li key={condition}>{condition}</li>
            ))}
          </ul>
          <EvolutionTree
            node={branch.target}
            selectedPokemonId={selectedPokemonId}
            onSelect={onSelect}
            hiddenTypeIcons={hiddenTypeIcons}
            onHideTypeIcon={onHideTypeIcon}
            depth={depth + 1}
          />
        </div>
      ))}
    </div>
  )
}

function TypeBadge({
  typeKey,
  compact = false,
  hidden,
  onHide,
}: {
  typeKey: Parameters<typeof getTypeMeta>[0]
  compact?: boolean
  hidden: boolean
  onHide: () => void
}) {
  const meta = getTypeMeta(typeKey)
  const iconUrl = `${import.meta.env.BASE_URL}type-icons/${typeKey}.svg`

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-semibold ${meta.classes} ${
        compact ? 'text-xs' : 'text-sm'
      }`}
    >
      {!hidden ? (
        <img src={iconUrl} alt={meta.label} className={compact ? 'h-5 w-5' : 'h-7 w-7'} loading="lazy" onError={onHide} />
      ) : (
        <span
          className={`inline-flex items-center justify-center rounded-full bg-white/60 font-bold ${
            compact ? 'h-5 w-5 text-[11px]' : 'h-7 w-7 text-xs'
          }`}
        >
          {meta.shortLabel}
        </span>
      )}
      <span>{meta.label}</span>
    </span>
  )
}

function Sprite({
  pokemonId,
  alt,
  hidden,
  onHide,
  size,
}: {
  pokemonId: number
  alt: string
  hidden: boolean
  onHide: () => void
  size: string
}) {
  if (hidden) {
    return <span className={`${size} shrink-0 rounded-lg bg-slate-100`} aria-hidden="true" />
  }

  return <img src={getSpriteUrl(pokemonId)} alt={alt} className={`${size} shrink-0`} loading="lazy" onError={onHide} />
}

function StatRow({ label, value, max = 255 }: { label: string; value: number; max?: number }) {
  const width = Math.max(6, Math.min(100, Math.round((value / max) * 100)))

  return (
    <div className="grid gap-3 border-b border-slate-200 px-4 py-4 last:border-b-0 sm:grid-cols-[minmax(0,180px)_72px_1fr] sm:items-center sm:gap-4 sm:px-5">
      <span className="text-base font-semibold text-slate-800">{label}</span>
      <span className="text-lg font-bold text-slate-900">{value}</span>
      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-sky-500 transition-[width] duration-200" style={{ width: `${width}%` }} />
      </div>
    </div>
  )
}

function AbilityList({
  title,
  abilities,
  emptyText = 'Keine Daten verfügbar',
}: {
  title: string
  abilities: PokedexFormAbility[]
  emptyText?: string
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      {abilities.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {abilities.map((ability) => (
            <span key={`${ability.nameEn}-${ability.isHidden}`} className="rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-700">
              {ability.nameDe}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500">{emptyText}</p>
      )}
    </div>
  )
}

function MoveCategoryBadge({
  damageClass,
}: {
  damageClass: 'physical' | 'special' | 'status' | null | undefined
}) {
  const normalized = damageClass ?? 'status'
  const iconUrl = `${import.meta.env.BASE_URL}ui/move-category/${normalized}.svg`
  const label = normalized === 'physical' ? 'Physisch' : normalized === 'special' ? 'Speziell' : 'Status'
  const [hidden, setHidden] = useState(false)

  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700"
      title={label}
    >
      {!hidden ? (
        <img src={iconUrl} alt={label} className="h-5 w-10 shrink-0 rounded-full" loading="lazy" onError={() => setHidden(true)} />
      ) : (
        <span>{label}</span>
      )}
      {!hidden ? <span>{label}</span> : null}
    </span>
  )
}

function MoveTypeBadge({ typeKey }: { typeKey: Parameters<typeof getTypeMeta>[0] | null | undefined }) {
  const [hidden, setHidden] = useState(false)

  if (!typeKey) {
    return <span className="font-medium text-slate-500">—</span>
  }

  const meta = getTypeMeta(typeKey)
  const iconUrl = `${import.meta.env.BASE_URL}type-icons/${typeKey}.svg`

  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold ${meta.classes}`}>
      {!hidden ? (
        <img src={iconUrl} alt={meta.label} className="h-4 w-4 shrink-0" loading="lazy" onError={() => setHidden(true)} />
      ) : (
        <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-white/60 text-[10px] font-bold">
          {meta.shortLabel}
        </span>
      )}
      <span>{meta.label}</span>
    </span>
  )
}
