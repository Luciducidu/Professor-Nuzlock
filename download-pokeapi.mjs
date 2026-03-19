import { mkdir, writeFile } from "node:fs/promises";

const OUT_DIR = "./pokedata";
const MAX_ID = 493;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function evoIdFromUrl(url) {
  const m = url.match(/evolution-chain\/(\d+)\//);
  return m ? Number(m[1]) : null;
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.json();
}

console.log("Start Download...");

await mkdir(OUT_DIR, { recursive: true });

for (let id = 1; id <= MAX_ID; id++) {
  const speciesUrl = `https://pokeapi.co/api/v2/pokemon-species/${id}/`;
  const species = await fetchJson(speciesUrl);

  const evoUrl = species.evolution_chain?.url ?? null;

  const minimal = {
    id,
    name: species.name,
    evolution_chain_id: evoUrl ? evoIdFromUrl(evoUrl) : null
  };

  await writeFile(
    `${OUT_DIR}/${id}-${species.name}.json`,
    JSON.stringify(minimal, null, 2),
    "utf8"
  );

  if (id % 25 === 0) console.log(`...${id}/${MAX_ID}`);
  await sleep(80);
}

console.log("Fertig. Daten liegen in:", OUT_DIR);