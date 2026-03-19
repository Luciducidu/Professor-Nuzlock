import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const projectRoot = process.cwd()
const sourceDir = path.resolve(projectRoot, 'pokedata')
const outputFile = path.resolve(projectRoot, 'src', 'data', 'pokemonIndex.json')

const toNumberOrNull = (value) => {
  if (value === null || value === undefined) return null
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

const run = async () => {
  let files

  try {
    files = await readdir(sourceDir, { withFileTypes: true })
  } catch (error) {
    console.error(`Could not read directory: ${sourceDir}`)
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }

  const entries = []
  let loaded = 0
  let skipped = 0

  for (const item of files) {
    if (!item.isFile() || !item.name.toLowerCase().endsWith('.json')) continue

    const filePath = path.join(sourceDir, item.name)

    try {
      const raw = await readFile(filePath, 'utf8')
      const parsed = JSON.parse(raw)

      const id = Number(parsed?.id)
      const name = typeof parsed?.name === 'string' ? parsed.name.trim() : ''
      const evolutionChainId = toNumberOrNull(parsed?.evolution_chain_id)

      if (!Number.isFinite(id) || !name) {
        skipped += 1
        continue
      }

      entries.push({
        id,
        name,
        evolution_chain_id: evolutionChainId,
      })
      loaded += 1
    } catch {
      skipped += 1
    }
  }

  entries.sort((a, b) => a.id - b.id)

  await mkdir(path.dirname(outputFile), { recursive: true })
  await writeFile(outputFile, JSON.stringify(entries), 'utf8')

  console.log(`pokemonIndex.json generated: ${outputFile}`)
  console.log(`Loaded: ${loaded}`)
  console.log(`Skipped: ${skipped}`)
  console.log(`Total output entries: ${entries.length}`)
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
