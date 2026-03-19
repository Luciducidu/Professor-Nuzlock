export const PLATINUM_LEVEL_CAPS_DE = [
  { key: 'gym1', label: '1. Arenaleiter Veit', cap: 14 },
  { key: 'gym2', label: '2. Arenaleiter Silvana', cap: 22 },
  { key: 'gym3', label: '3. Arenaleiter Lamina', cap: 26 },
  { key: 'gym4', label: '4. Arenaleiter Hilda', cap: 32 },
  { key: 'gym5', label: '5. Arenaleiter Marinus', cap: 37 },
  { key: 'gym6', label: '6. Arenaleiter Adam', cap: 41 },
  { key: 'gym7', label: '7. Arenaleiter Frieda', cap: 44 },
  { key: 'gym8', label: '8. Arenaleiter Volkner', cap: 50 },
  { key: 'e4-1', label: 'Top 4 Herbaro', cap: 53 },
  { key: 'e4-2', label: 'Top 4 Teresa', cap: 55 },
  { key: 'e4-3', label: 'Top 4 Ignaz', cap: 57 },
  { key: 'e4-4', label: 'Top 4 Lucian', cap: 59 },
  { key: 'champ', label: 'Champ Cynthia', cap: 62 },
] as const

export type PlatinumLevelCapKey = (typeof PLATINUM_LEVEL_CAPS_DE)[number]['key']
