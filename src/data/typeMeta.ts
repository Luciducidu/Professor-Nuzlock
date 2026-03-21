export type PokemonTypeKey =
  | 'normal'
  | 'fire'
  | 'water'
  | 'electric'
  | 'grass'
  | 'ice'
  | 'fighting'
  | 'poison'
  | 'ground'
  | 'flying'
  | 'psychic'
  | 'bug'
  | 'rock'
  | 'ghost'
  | 'dragon'
  | 'dark'
  | 'steel'
  | 'fairy'

export const TYPE_META: Record<
  PokemonTypeKey,
  {
    label: string
    shortLabel: string
    classes: string
  }
> = {
  normal: { label: 'Normal', shortLabel: 'N', classes: 'bg-stone-200 text-stone-800 border-stone-300' },
  fire: { label: 'Feuer', shortLabel: 'F', classes: 'bg-orange-100 text-orange-800 border-orange-300' },
  water: { label: 'Wasser', shortLabel: 'W', classes: 'bg-sky-100 text-sky-800 border-sky-300' },
  electric: { label: 'Elektro', shortLabel: 'E', classes: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  grass: { label: 'Pflanze', shortLabel: 'P', classes: 'bg-green-100 text-green-800 border-green-300' },
  ice: { label: 'Eis', shortLabel: 'I', classes: 'bg-cyan-100 text-cyan-800 border-cyan-300' },
  fighting: { label: 'Kampf', shortLabel: 'K', classes: 'bg-red-100 text-red-800 border-red-300' },
  poison: { label: 'Gift', shortLabel: 'G', classes: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300' },
  ground: { label: 'Boden', shortLabel: 'B', classes: 'bg-amber-100 text-amber-800 border-amber-300' },
  flying: { label: 'Flug', shortLabel: 'Fl', classes: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
  psychic: { label: 'Psycho', shortLabel: 'Ps', classes: 'bg-pink-100 text-pink-800 border-pink-300' },
  bug: { label: 'Käfer', shortLabel: 'Kf', classes: 'bg-lime-100 text-lime-800 border-lime-300' },
  rock: { label: 'Gestein', shortLabel: 'Ge', classes: 'bg-yellow-200 text-yellow-900 border-yellow-400' },
  ghost: { label: 'Geist', shortLabel: 'Gh', classes: 'bg-violet-100 text-violet-800 border-violet-300' },
  dragon: { label: 'Drache', shortLabel: 'D', classes: 'bg-purple-100 text-purple-800 border-purple-300' },
  dark: { label: 'Unlicht', shortLabel: 'U', classes: 'bg-slate-200 text-slate-800 border-slate-400' },
  steel: { label: 'Stahl', shortLabel: 'S', classes: 'bg-zinc-200 text-zinc-800 border-zinc-400' },
  fairy: { label: 'Fee', shortLabel: 'Fe', classes: 'bg-rose-100 text-rose-800 border-rose-300' },
}
