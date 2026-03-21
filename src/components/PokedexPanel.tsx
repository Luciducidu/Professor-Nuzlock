import { useMemo, useState } from 'react'
import {
  getEvolutionChain,
  getImmediateEvolutionOptions,
  getPokedexEntry,
  getPreEvolution,
  getSpriteUrl,
  getTypeMeta,
  searchPokedex,
  type EvolutionChainNode,
} from '../lib/pokedex'
import { usePokedex } from './PokedexProvider'

const POKEDEX_ICON_URL = `${import.meta.env.BASE_URL}ui/pokedex-cover.jpg`

export function PokedexPanel() {
  const { isOpen, query, selectedPokemonId, setQuery, selectPokemon, backToResults, togglePanel, closePanel } =
    usePokedex()
  const [hiddenSprites, setHiddenSprites] = useState<Record<number, boolean>>({})
  const [hiddenTypeIcons, setHiddenTypeIcons] = useState<Record<string, boolean>>({})

  const results = useMemo(() => searchPokedex(query), [query])
  const selectedEntry = getPokedexEntry(selectedPokemonId)
  const selectedChain = getEvolutionChain(selectedEntry?.evolution_chain_id)
  const preEvolution = selectedEntry ? getPreEvolution(selectedChain, selectedEntry.id) : null
  const nextEvolutions = selectedEntry ? getImmediateEvolutionOptions(selectedChain, selectedEntry.id) : []

  return (
    <>
      <button
        type="button"
        onClick={togglePanel}
        className={`fixed left-3 top-1/2 z-30 -translate-y-1/2 rounded-2xl border border-slate-300 bg-white/95 p-3 shadow-2xl transition hover:scale-[1.02] hover:bg-white ${
          isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        aria-label="Pokédex öffnen"
      >
        <img src={POKEDEX_ICON_URL} alt="Pokédex" className="h-20 w-20 sm:h-24 sm:w-24" />
      </button>

      {isOpen ? <div className="fixed inset-0 z-30 bg-slate-950/30 lg:hidden" onClick={closePanel} aria-hidden="true" /> : null}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[min(48vw,860px)] min-w-[360px] max-w-[92vw] flex-col border-r border-slate-300 bg-white shadow-[10px_0_40px_rgba(15,23,42,0.18)] transition-transform duration-200 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <img src={POKEDEX_ICON_URL} alt="Pokédex" className="h-14 w-14 shrink-0" />
              <div>
                <p className="text-2xl font-bold text-slate-900">Pokédex</p>
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

          <div className="mt-5">
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

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {selectedEntry ? (
            <div className="space-y-6">
              <button
                type="button"
                onClick={backToResults}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Zurück zur Trefferliste
              </button>

              <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex flex-wrap items-start gap-5">
                  <Sprite
                    pokemonId={selectedEntry.spriteId}
                    alt={selectedEntry.nameDe}
                    hidden={Boolean(hiddenSprites[selectedEntry.spriteId])}
                    onHide={() => setHiddenSprites((current) => ({ ...current, [selectedEntry.spriteId]: true }))}
                    size="h-32 w-32"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-3xl font-bold text-slate-900">{selectedEntry.nameDe}</p>
                    <p className="mt-1 text-base text-slate-500">({selectedEntry.nameEn})</p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      {selectedEntry.types.map((type) => (
                        <TypeBadge
                          key={type}
                          typeKey={type}
                          hidden={Boolean(hiddenTypeIcons[type])}
                          onHide={() => setHiddenTypeIcons((current) => ({ ...current, [type]: true }))}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <section className="grid gap-4 xl:grid-cols-2">
                <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
                  <h3 className="text-lg font-semibold text-slate-900">Vorentwicklung</h3>
                  {preEvolution ? (
                    <MiniPokemonCard node={preEvolution} onSelect={selectPokemon} />
                  ) : (
                    <p className="text-sm text-slate-500">Keine Vorentwicklung</p>
                  )}
                </div>

                <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
                  <h3 className="text-lg font-semibold text-slate-900">Weiterentwicklung</h3>
                  {nextEvolutions.length > 0 ? (
                    <div className="space-y-3">
                      {nextEvolutions.map((branch) => (
                        <div key={`${selectedEntry.id}-${branch.target.pokemonId}`} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                          <MiniPokemonCard node={branch.target} onSelect={selectPokemon} />
                          <ul className="mt-3 space-y-1 text-sm text-slate-700">
                            {branch.conditions.map((condition) => (
                              <li key={condition}>{condition}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">Keine weitere Entwicklung</p>
                  )}
                </div>
              </section>

              <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
                <h3 className="text-lg font-semibold text-slate-900">Entwicklungsreihe</h3>
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
            </div>
          ) : (
            <div className="grid gap-3 xl:grid-cols-2">
              {results.map((pokemon) => (
                <button
                  key={pokemon.id}
                  type="button"
                  onClick={() => selectPokemon(pokemon.id)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left transition hover:bg-slate-50"
                >
                  <div className="flex items-center gap-4">
                    <Sprite
                      pokemonId={pokemon.spriteId}
                      alt={pokemon.nameDe}
                      hidden={Boolean(hiddenSprites[pokemon.spriteId])}
                      onHide={() => setHiddenSprites((current) => ({ ...current, [pokemon.spriteId]: true }))}
                      size="h-16 w-16"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-semibold text-slate-900">{pokemon.nameDe}</p>
                      <p className="truncate text-sm text-slate-500">({pokemon.nameEn})</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {pokemon.types.map((type) => (
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
              ))}
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
  onSelect: (pokemonId: number) => void
  hiddenTypeIcons: Record<string, boolean>
  onHideTypeIcon: (typeKey: string) => void
  depth?: number
}) {
  return (
    <div className={depth === 0 ? 'space-y-4' : 'ml-6 space-y-4 border-l border-slate-200 pl-5'}>
      <button
        type="button"
        onClick={() => onSelect(node.pokemonId)}
        className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
          node.pokemonId === selectedPokemonId
            ? 'border-sky-300 bg-sky-50'
            : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
        }`}
      >
        <div className="flex items-center gap-4">
          <img src={getSpriteUrl(node.spriteId)} alt={node.nameDe} className="h-16 w-16 shrink-0" loading="lazy" />
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-slate-900">{node.nameDe}</p>
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

function MiniPokemonCard({
  node,
  onSelect,
}: {
  node: Pick<EvolutionChainNode, 'pokemonId' | 'spriteId' | 'nameDe' | 'nameEn' | 'types'>
  onSelect: (pokemonId: number) => void
}) {
  const [hiddenTypeIcons, setHiddenTypeIcons] = useState<Record<string, boolean>>({})

  return (
    <button
      type="button"
      onClick={() => onSelect(node.pokemonId)}
      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-left transition hover:bg-slate-100"
    >
      <div className="flex items-center gap-4">
        <img src={getSpriteUrl(node.spriteId)} alt={node.nameDe} className="h-16 w-16 shrink-0" loading="lazy" />
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-slate-900">{node.nameDe}</p>
          <p className="truncate text-sm text-slate-500">({node.nameEn})</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {node.types.map((type) => (
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
        <img src={iconUrl} alt={meta.label} className={compact ? 'h-4 w-4' : 'h-5 w-5'} loading="lazy" onError={onHide} />
      ) : (
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/60 text-[11px] font-bold">
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
