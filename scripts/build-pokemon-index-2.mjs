// scripts/build-pokemon-index.mjs
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const POKEDATA_DIR = "./pokedata";
const OUT_FILE = "./src/data/pokemonIndex.json";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.json();
}

function pickLocalizedName(speciesJson, lang = "de") {
  const entry = speciesJson.names?.find((n) => n.language?.name === lang);
  return entry?.name ?? null;
}

async function main() {
  const files = await readdir(POKEDATA_DIR);
  const jsonFiles = files.filter((f) => f.endsWith(".json"));

  const loaded = [];
  let skipped = 0;

  for (const f of jsonFiles) {
    try {
      const raw = await readFile(path.join(POKEDATA_DIR, f), "utf8");
      const obj = JSON.parse(raw);

      if (typeof obj.id !== "number") throw new Error("missing id");
      const slug = String(obj.name ?? "").trim();
      const evo = obj.evolution_chain_id ?? null;

      // Deutscher Name aus pokemon-species holen
      const species = await fetchJson(`https://pokeapi.co/api/v2/pokemon-species/${obj.id}/`);
      const nameDe = pickLocalizedName(species, "de") ?? slug;

      loaded.push({
        id: obj.id,
        slug,               // englischer Schlüssel
        nameDe,             // deutscher Anzeigename
        evolution_chain_id: evo,
      });

      if (obj.id % 25 === 0) console.log(`...${obj.id}`);
      await sleep(60);
    } catch {
      skipped++;
    }
  }

  loaded.sort((a, b) => a.id - b.id);

  await mkdir(path.dirname(OUT_FILE), { recursive: true });
  await writeFile(OUT_FILE, JSON.stringify(loaded, null, 2), "utf8");

  console.log(`Fertig: ${loaded.length} geladen, ${skipped} übersprungen -> ${OUT_FILE}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

