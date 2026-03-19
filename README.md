# Professor Nuzlock

Lokale Website-App als Basis für einen Nuzlocke-Tracker.

## Stack

- Vite
- React + TypeScript
- Dexie (IndexedDB)
- react-router-dom
- Tailwind CSS
- Lokale Datenhaltung im Browser (persistente Runs/Settings)

## Voraussetzungen

- Node.js 20+
- npm

## Installation

```bash
npm install
```

## Pokémon-Index bauen

Liest alle JSON-Dateien aus `./pokedata` und erzeugt `src/data/pokemonIndex.json`.

```bash
npm run build:pokemon
```

Das Script:
- übernimmt `id`, `name`, `evolution_chain_id`
- sortiert nach `id`
- überspringt kaputte/ungültige Dateien
- loggt eine Zusammenfassung (`Loaded`, `Skipped`, `Total output entries`)

## Sprites lokal herunterladen (offline)

Lädt Front-Sprites für Pokémon 1–493 und speichert sie unter `public/sprites/`.

```bash
npm run sprites:download
```

Hinweis: Der Download dauert ein paar Minuten. Bereits vorhandene Dateien werden übersprungen.

## Dev-Server starten

```bash
npm run dev
```

## Production Build

```bash
npm run build
npm run preview
```

## PWA / Offline testen

- Die App ist als PWA konfiguriert und installierbar.
- Teste Service Worker und Offline-Funktion am besten mit `npm run preview` (nicht nur `npm run dev`).
- Für den Offline-Test:
  1. App einmal online öffnen
  2. Danach Internet deaktivieren
  3. App neu laden/neu öffnen
  4. Navigation, Pokémon-Suche und Sprites sollten weiter funktionieren
