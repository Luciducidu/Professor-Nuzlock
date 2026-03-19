import { DUPES_MODE_OPTIONS, LEVEL_CAP_OPTIONS } from '../lib/projectSettings'
import type { ProjectSettings } from '../lib/types'

type ProjectSettingsFormProps = {
  value: ProjectSettings
  onChange: (next: ProjectSettings) => void
  onSubmit: () => void
  submitLabel: string
  disabled?: boolean
  submitDisabled?: boolean
}

export function ProjectSettingsForm({
  value,
  onChange,
  onSubmit,
  submitLabel,
  disabled = false,
  submitDisabled = false,
}: ProjectSettingsFormProps) {
  const setField = <K extends keyof ProjectSettings>(key: K, nextValue: ProjectSettings[K]) => {
    onChange({ ...value, [key]: nextValue })
  }

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="dupes-mode">
          Duplikate (Dupes Clause)
        </label>
        <p className="mb-2 text-xs text-slate-500">Legt fest, ob du Pokémon erneut fangen darfst.</p>
        <select
          id="dupes-mode"
          value={value.dupesMode}
          onChange={(event) => setField('dupesMode', event.target.value as ProjectSettings['dupesMode'])}
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-sky-500 focus:ring-2"
          disabled={disabled}
        >
          {DUPES_MODE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <ToggleRow
        label="Shiny-Regel aktiviert"
        checked={value.shinyClauseEnabled}
        disabled={disabled}
        onChange={(checked) => setField('shinyClauseEnabled', checked)}
      />

      {value.shinyClauseEnabled ? (
        <ToggleRow
          label="Shiny umgeht Dupes"
          checked={value.shinyBypassesDupes}
          disabled={disabled}
          onChange={(checked) => setField('shinyBypassesDupes', checked)}
        />
      ) : null}

      <ToggleRow
        label="Static-Regel aktiviert"
        checked={value.staticClauseEnabled}
        disabled={disabled}
        onChange={(checked) => setField('staticClauseEnabled', checked)}
      />

      {value.staticClauseEnabled ? (
        <ToggleRow
          label="Static umgeht Dupes"
          checked={value.staticBypassesDupes}
          disabled={disabled}
          onChange={(checked) => setField('staticBypassesDupes', checked)}
        />
      ) : null}

      <ToggleRow
        label="Levelbegrenzung (Level Cap) aktiv"
        checked={value.levelCapsEnabled}
        disabled={disabled}
        onChange={(checked) => setField('levelCapsEnabled', checked)}
      />

      {value.levelCapsEnabled ? (
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="level-cap-progress">
            Nächster Boss
          </label>
          <select
            id="level-cap-progress"
            value={value.levelCapsProgressKey}
            onChange={(event) => setField('levelCapsProgressKey', event.target.value)}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-sky-500 focus:ring-2"
            disabled={disabled}
          >
            {LEVEL_CAP_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="pt-1">
        <button
          type="button"
          onClick={onSubmit}
          disabled={disabled || submitDisabled}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {submitLabel}
        </button>
      </div>
    </div>
  )
}

type ToggleRowProps = {
  label: string
  checked: boolean
  disabled: boolean
  onChange: (checked: boolean) => void
}

function ToggleRow({ label, checked, disabled, onChange }: ToggleRowProps) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
      />
    </label>
  )
}
