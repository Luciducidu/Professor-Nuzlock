import { useMemo, useState } from 'react'
import pokemonIndex from '../data/pokemonIndex.json'
import type { PokemonIndexEntry } from '../lib/types'

type PokemonSearchProps = {
  onSelect: (pokemon: PokemonIndexEntry) => void
}

const POKEMON_INDEX = pokemonIndex as PokemonIndexEntry[]
const MAX_RESULTS = 20

export function PokemonSearch({ onSelect }: PokemonSearchProps) {
  const [query, setQuery] = useState('')

  const results = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return POKEMON_INDEX.slice(0, MAX_RESULTS)

    return POKEMON_INDEX.filter((pokemon) => {
      const de = pokemon.nameDe.toLowerCase()
      const en = pokemon.slug.toLowerCase()
      return de.includes(normalizedQuery) || en.includes(normalizedQuery)
    }).slice(0, MAX_RESULTS)
  }, [query])

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <label htmlFor="pokemon-search" className="block text-sm font-medium text-slate-700">
        Pokémon suchen (Deutsch oder Englisch)
      </label>
      <input
        id="pokemon-search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Name eingeben..."
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-sky-500 transition focus:ring-2"
      />

      <ul className="max-h-64 space-y-2 overflow-auto">
        {results.map((pokemon) => (
          <li key={pokemon.id}>
            <button
              type="button"
              onClick={() => onSelect(pokemon)}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-800 transition hover:bg-slate-50"
            >
              {pokemon.nameDe} ({pokemon.slug})
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
