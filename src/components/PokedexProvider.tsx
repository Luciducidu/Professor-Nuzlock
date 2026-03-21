import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

type PokedexContextValue = {
  isOpen: boolean
  query: string
  selectedPokemonId: number | null
  openPanel: () => void
  closePanel: () => void
  togglePanel: () => void
  setQuery: (query: string) => void
  selectPokemon: (pokemonId: number) => void
  backToResults: () => void
}

const STORAGE_KEY = 'professor-nuzlock:pokedex-state'

const PokedexContext = createContext<PokedexContextValue | null>(null)

export function PokedexProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedPokemonId, setSelectedPokemonId] = useState<number | null>(null)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) return

      const parsed = JSON.parse(raw) as {
        isOpen?: boolean
        query?: string
        selectedPokemonId?: number | null
      }

      setIsOpen(Boolean(parsed.isOpen))
      setQuery(typeof parsed.query === 'string' ? parsed.query : '')
      setSelectedPokemonId(typeof parsed.selectedPokemonId === 'number' ? parsed.selectedPokemonId : null)
    } catch (error) {
      console.error(error)
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        isOpen,
        query,
        selectedPokemonId,
      }),
    )
  }, [isOpen, query, selectedPokemonId])

  const value = useMemo<PokedexContextValue>(
    () => ({
      isOpen,
      query,
      selectedPokemonId,
      openPanel: () => setIsOpen(true),
      closePanel: () => setIsOpen(false),
      togglePanel: () => setIsOpen((current) => !current),
      setQuery,
      selectPokemon: (pokemonId) => {
        setSelectedPokemonId(pokemonId)
        setIsOpen(true)
      },
      backToResults: () => setSelectedPokemonId(null),
    }),
    [isOpen, query, selectedPokemonId],
  )

  return <PokedexContext.Provider value={value}>{children}</PokedexContext.Provider>
}

export function usePokedex() {
  const context = useContext(PokedexContext)
  if (!context) {
    throw new Error('usePokedex muss innerhalb des PokedexProvider verwendet werden.')
  }
  return context
}
