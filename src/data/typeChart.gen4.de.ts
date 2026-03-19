export type TypeKey =
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

export const TYPE_NAMES_DE: Record<TypeKey, string> = {
  normal: 'Normal',
  fire: 'Feuer',
  water: 'Wasser',
  electric: 'Elektro',
  grass: 'Pflanze',
  ice: 'Eis',
  fighting: 'Kampf',
  poison: 'Gift',
  ground: 'Boden',
  flying: 'Flug',
  psychic: 'Psycho',
  bug: 'Käfer',
  rock: 'Gestein',
  ghost: 'Geist',
  dragon: 'Drache',
  dark: 'Unlicht',
  steel: 'Stahl',
}

export const TYPE_EFFECTIVENESS_GEN4: Record<
  TypeKey,
  { x2: TypeKey[]; x05: TypeKey[]; x0: TypeKey[] }
> = {
  normal: {
    x2: [],
    x05: ['rock', 'steel'],
    x0: ['ghost'],
  },
  fire: {
    x2: ['grass', 'ice', 'bug', 'steel'],
    x05: ['fire', 'water', 'rock', 'dragon'],
    x0: [],
  },
  water: {
    x2: ['fire', 'ground', 'rock'],
    x05: ['water', 'grass', 'dragon'],
    x0: [],
  },
  electric: {
    x2: ['water', 'flying'],
    x05: ['electric', 'grass', 'dragon'],
    x0: ['ground'],
  },
  grass: {
    x2: ['water', 'ground', 'rock'],
    x05: ['fire', 'grass', 'poison', 'flying', 'bug', 'dragon', 'steel'],
    x0: [],
  },
  ice: {
    x2: ['grass', 'ground', 'flying', 'dragon'],
    x05: ['fire', 'water', 'ice', 'steel'],
    x0: [],
  },
  fighting: {
    x2: ['normal', 'ice', 'rock', 'dark', 'steel'],
    x05: ['poison', 'flying', 'psychic', 'bug'],
    x0: ['ghost'],
  },
  poison: {
    x2: ['grass'],
    x05: ['poison', 'ground', 'rock', 'ghost'],
    x0: ['steel'],
  },
  ground: {
    x2: ['fire', 'electric', 'poison', 'rock', 'steel'],
    x05: ['grass', 'bug'],
    x0: ['flying'],
  },
  flying: {
    x2: ['grass', 'fighting', 'bug'],
    x05: ['electric', 'rock', 'steel'],
    x0: [],
  },
  psychic: {
    x2: ['fighting', 'poison'],
    x05: ['psychic', 'steel'],
    x0: ['dark'],
  },
  bug: {
    x2: ['grass', 'psychic', 'dark'],
    x05: ['fire', 'fighting', 'poison', 'flying', 'ghost', 'steel'],
    x0: [],
  },
  rock: {
    x2: ['fire', 'ice', 'flying', 'bug'],
    x05: ['fighting', 'ground', 'steel'],
    x0: [],
  },
  ghost: {
    x2: ['psychic', 'ghost'],
    x05: ['dark', 'steel'],
    x0: ['normal'],
  },
  dragon: {
    x2: ['dragon'],
    x05: ['steel'],
    x0: [],
  },
  dark: {
    x2: ['psychic', 'ghost'],
    x05: ['fighting', 'dark', 'steel'],
    x0: [],
  },
  steel: {
    x2: ['ice', 'rock'],
    x05: ['fire', 'water', 'electric', 'steel'],
    x0: [],
  },
}
