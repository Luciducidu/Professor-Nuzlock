export type NatureStatKey = 'atk' | 'def' | 'spa' | 'spd' | 'spe'

export const NATURE_PLUS_LABELS: Record<NatureStatKey, string> = {
  atk: '+ Angr.',
  def: '+ Vert.',
  spa: '+ Sp.Angr.',
  spd: '+ Sp.Vert.',
  spe: '+ Init.',
}

export const NATURE_MINUS_LABELS: Record<NatureStatKey, string> = {
  atk: '- Angr.',
  def: '- Vert.',
  spa: '- Sp.Angr.',
  spd: '- Sp.Vert.',
  spe: '- Init.',
}

export const NATURE_STAT_ORDER: NatureStatKey[] = ['atk', 'def', 'spa', 'spd', 'spe']

export const NATURE_MATRIX_DE: Record<NatureStatKey, Record<NatureStatKey, string>> = {
  atk: {
    atk: 'Robust',
    def: 'Kühn',
    spa: 'Mäßig',
    spd: 'Still',
    spe: 'Scheu',
  },
  def: {
    atk: 'Solo',
    def: 'Sanft',
    spa: 'Mild',
    spd: 'Zart',
    spe: 'Hastig',
  },
  spa: {
    atk: 'Hart',
    def: 'Pfiffig',
    spa: 'Zaghaft',
    spd: 'Sacht',
    spe: 'Froh',
  },
  spd: {
    atk: 'Frech',
    def: 'Lasch',
    spa: 'Hitzig',
    spd: 'Kauzig',
    spe: 'Naiv',
  },
  spe: {
    atk: 'Mutig',
    def: 'Locker',
    spa: 'Ruhig',
    spd: 'Forsch',
    spe: 'Ernst',
  },
}
