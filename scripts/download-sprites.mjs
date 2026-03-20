import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const pokemonIndexPath = path.join(rootDir, 'src', 'data', 'pokemonIndex.json')
const spritesDir = path.join(rootDir, 'public', 'sprites')
const MAX_ID = 649
const PAUSE_MS = 75
const PROGRESS_EVERY = 25

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const exists = async (filePath) => {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

async function loadPokemonList() {
  const raw = await readFile(pokemonIndexPath, 'utf8')
  const parsed = JSON.parse(raw)
  if (!Array.isArray(parsed)) {
    throw new Error('pokemonIndex.json muss ein Array sein.')
  }

  return parsed
    .map((entry) => Number(entry?.id))
    .filter((id) => Number.isInteger(id) && id >= 1 && id <= MAX_ID)
    .sort((a, b) => a - b)
}

async function downloadSprites() {
  await mkdir(spritesDir, { recursive: true })

  const ids = await loadPokemonList()
  let downloaded = 0
  let skippedExisting = 0
  let skippedMissing = 0
  let errors = 0

  console.log(`Starte Sprite-Download für ${ids.length} Pokémon (IDs 1-${MAX_ID})...`)

  for (let index = 0; index < ids.length; index += 1) {
    const id = ids[index]
    const targetPath = path.join(spritesDir, `${id}.png`)

    if (await exists(targetPath)) {
      skippedExisting += 1
    } else {
      try {
        const pokemonRes = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}/`)
        if (!pokemonRes.ok) {
          errors += 1
          console.error(`[${id}] API Fehler: ${pokemonRes.status}`)
          await sleep(PAUSE_MS)
          continue
        }

        const pokemonJson = await pokemonRes.json()
        const spriteUrl = pokemonJson?.sprites?.front_default

        if (!spriteUrl) {
          skippedMissing += 1
          await sleep(PAUSE_MS)
          continue
        }

        const spriteRes = await fetch(spriteUrl)
        if (!spriteRes.ok) {
          errors += 1
          console.error(`[${id}] Sprite-Download fehlgeschlagen: ${spriteRes.status}`)
          await sleep(PAUSE_MS)
          continue
        }

        const buffer = Buffer.from(await spriteRes.arrayBuffer())
        await writeFile(targetPath, buffer)
        downloaded += 1
      } catch (error) {
        errors += 1
        console.error(`[${id}] Fehler:`, error instanceof Error ? error.message : String(error))
      }
    }

    const processed = index + 1
    if (processed % PROGRESS_EVERY === 0 || processed === ids.length) {
      console.log(`Fortschritt: ${processed}/${ids.length}`)
    }

    await sleep(PAUSE_MS)
  }

  console.log('\nFertig.')
  console.log(`Heruntergeladen: ${downloaded}`)
  console.log(`Bereits vorhanden: ${skippedExisting}`)
  console.log(`Ohne Sprite übersprungen: ${skippedMissing}`)
  console.log(`Fehler: ${errors}`)
}

downloadSprites().catch((error) => {
  console.error('Sprite-Download konnte nicht gestartet werden:', error)
  process.exitCode = 1
})
