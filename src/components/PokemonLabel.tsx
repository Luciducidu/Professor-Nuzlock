import { useMemo, useState } from 'react'

type PokemonLabelSize = 'sm' | 'md' | 'lg'

type PokemonLabelProps = {
  pokemonId: number
  nameDe: string
  slug: string
  isDead?: boolean
  size?: PokemonLabelSize
  onOpenPokedex?: (pokemonId: number) => void
}

const SIZE_CLASSES: Record<PokemonLabelSize, string> = {
  sm: 'h-8 w-8',
  md: 'h-12 w-12',
  lg: 'h-16 w-16',
}

export function PokemonLabel({
  pokemonId,
  nameDe,
  slug,
  isDead = false,
  size = 'md',
  onOpenPokedex,
}: PokemonLabelProps) {
  const [hidden, setHidden] = useState(false)
  const spriteSizeClass = SIZE_CLASSES[size]
  const textClassName = useMemo(
    () => (isDead ? 'line-through text-slate-400' : 'text-slate-900'),
    [isDead],
  )

  return (
    <div className="flex min-w-0 items-start gap-3">
      {hidden ? (
        <span className={`${spriteSizeClass} shrink-0 rounded bg-slate-100`} aria-hidden="true" />
      ) : (
        <img
          src={`${import.meta.env.BASE_URL}sprites/${pokemonId}.png`}
          alt={nameDe}
          className={`${spriteSizeClass} shrink-0`}
          loading="lazy"
          onError={() => setHidden(true)}
        />
      )}

      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <span className={`truncate font-medium ${textClassName}`}>
            {nameDe} ({slug})
          </span>
          {isDead ? (
            <span className="text-xl font-bold leading-none text-red-600" aria-label="Verstorben">
              ✖
            </span>
          ) : null}
        </div>

        {onOpenPokedex ? (
          <button
            type="button"
            onClick={() => onOpenPokedex(pokemonId)}
            className="mt-1 rounded-md border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-800 transition hover:bg-sky-100"
          >
            Pokédexeintrag
          </button>
        ) : null}
      </div>
    </div>
  )
}
