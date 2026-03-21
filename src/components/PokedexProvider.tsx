import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { ProjectGame } from '../lib/types'

type PokedexContextValue = {
  isOpen: boolean
  query: string
  selectedPokemonId: number | null
  selectedFormKey: string | null
  currentGame: ProjectGame
  openPokedex: (pokemonId?: number | null, formKey?: string | null) => void
  openPanel: () => void
  closePanel: () => void
  togglePanel: () => void
  setQuery: (query: string) => void
  selectPokemon: (pokemonId: number, formKey?: string | null) => void
  selectForm: (formKey: string | null) => void
  setCurrentGame: (game: ProjectGame) => void
  backToResults: () => void
}

const STORAGE_KEY = 'professor-nuzlock:pokedex-state'

const PokedexContext = createContext<PokedexContextValue | null>(null)

export function PokedexProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedPokemonId, setSelectedPokemonId] = useState<number | null>(null)
  const [selectedFormKey, setSelectedFormKey] = useState<string | null>(null)
  const [currentGame, setCurrentGame] = useState<ProjectGame>('platinum')

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) return

      const parsed = JSON.parse(raw) as {
        isOpen?: boolean
        query?: string
        selectedPokemonId?: number | null
        selectedFormKey?: string | null
        currentGame?: ProjectGame
      }

      setIsOpen(Boolean(parsed.isOpen))
      setQuery(typeof parsed.query === 'string' ? parsed.query : '')
      setSelectedPokemonId(typeof parsed.selectedPokemonId === 'number' ? parsed.selectedPokemonId : null)
      setSelectedFormKey(typeof parsed.selectedFormKey === 'string' ? parsed.selectedFormKey : null)
      setCurrentGame(parsed.currentGame === 'bw2' ? 'bw2' : 'platinum')
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
        selectedFormKey,
        currentGame,
      }),
    )
  }, [currentGame, isOpen, query, selectedFormKey, selectedPokemonId])

  const value = useMemo<PokedexContextValue>(
    () => ({
      isOpen,
      query,
      selectedPokemonId,
      selectedFormKey,
      currentGame,
      openPokedex: (pokemonId, formKey) => {
        if (typeof pokemonId === 'number') {
          setSelectedPokemonId(pokemonId)
          setSelectedFormKey(formKey ?? null)
          setQuery('')
        }
        setIsOpen(true)
      },
      openPanel: () => setIsOpen(true),
      closePanel: () => setIsOpen(false),
      togglePanel: () => setIsOpen((current) => !current),
      setQuery,
      selectPokemon: (pokemonId, formKey) => {
        setSelectedPokemonId(pokemonId)
        setSelectedFormKey(formKey ?? null)
        setQuery('')
        setIsOpen(true)
      },
      selectForm: (formKey) => setSelectedFormKey(formKey),
      setCurrentGame,
      backToResults: () => {
        setSelectedPokemonId(null)
        setSelectedFormKey(null)
      },
    }),
    [currentGame, isOpen, query, selectedFormKey, selectedPokemonId],
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
