import type { ReactNode } from 'react'
import {
  CHALLENGE_TYPE_OPTIONS,
  DUPES_MODE_OPTIONS,
  LEVEL_CAP_OPTIONS,
  SOULLINK_PARTNER_DUPES_OPTIONS,
} from '../lib/projectSettings'
import type { ChallengeType, ProjectSettings, SoulLinkPlayer } from '../lib/types'

type ProjectSettingsFormProps = {
  value: ProjectSettings
  onChange: (next: ProjectSettings) => void
  challengeType?: ChallengeType
  onChallengeTypeChange?: (next: ChallengeType) => void
  players?: [SoulLinkPlayer, SoulLinkPlayer]
  onPlayersChange?: (next: [SoulLinkPlayer, SoulLinkPlayer]) => void
  onSubmit: () => void
  submitLabel: string
  disabled?: boolean
  submitDisabled?: boolean
}

export function ProjectSettingsForm({
  value,
  onChange,
  challengeType,
  onChallengeTypeChange,
  players,
  onPlayersChange,
  onSubmit,
  submitLabel,
  disabled = false,
  submitDisabled = false,
}: ProjectSettingsFormProps) {
  const setField = <K extends keyof ProjectSettings>(key: K, nextValue: ProjectSettings[K]) => {
    onChange({ ...value, [key]: nextValue })
  }

  const isSoullink = challengeType === 'soullink'

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      {challengeType && onChallengeTypeChange ? (
        <Section title="Challenge">
          <div className="grid gap-3 sm:grid-cols-2">
            {CHALLENGE_TYPE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onChallengeTypeChange(option.value)}
                disabled={disabled}
                className={`rounded-xl border px-4 py-4 text-left transition ${
                  challengeType === option.value
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <p className="text-sm font-semibold">{option.label}</p>
              </button>
            ))}
          </div>
        </Section>
      ) : null}

      {isSoullink && players && onPlayersChange ? (
        <Section title="Spieler">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="soullink-player-1" className="mb-2 block text-sm font-medium text-slate-700">
                Spieler 1
              </label>
              <input
                id="soullink-player-1"
                value={players[0].name}
                onChange={(event) => onPlayersChange([{ ...players[0], name: event.target.value }, players[1]])}
                placeholder="Spieler 1"
                disabled={disabled}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-sky-500 transition focus:ring-2 disabled:bg-slate-100"
              />
            </div>
            <div>
              <label htmlFor="soullink-player-2" className="mb-2 block text-sm font-medium text-slate-700">
                Spieler 2
              </label>
              <input
                id="soullink-player-2"
                value={players[1].name}
                onChange={(event) => onPlayersChange([players[0], { ...players[1], name: event.target.value }])}
                placeholder="Spieler 2"
                disabled={disabled}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-sky-500 transition focus:ring-2 disabled:bg-slate-100"
              />
            </div>
          </div>
        </Section>
      ) : null}

      <Section title={isSoullink ? 'Soullink-Regeln' : 'Regeln'}>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="dupes-mode">
            Dupes-Regel
          </label>
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

        {isSoullink ? (
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="soullink-partner-dupes-mode">
              Soullink-Paare sperren für beide Spieler
            </label>
            <p className="mb-2 text-xs text-slate-500">
              Wenn ein Soullink-Paar gefangen wurde, können diese Arten oder Reihen für beide Spieler gesperrt werden.
            </p>
            <select
              id="soullink-partner-dupes-mode"
              value={value.soulLinkPartnerDupesMode}
              onChange={(event) =>
                setField(
                  'soulLinkPartnerDupesMode',
                  event.target.value as ProjectSettings['soulLinkPartnerDupesMode'],
                )
              }
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-sky-500 focus:ring-2"
              disabled={disabled}
            >
              {SOULLINK_PARTNER_DUPES_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <ToggleRow
          label="Shiny-Regel"
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
          label="Static-Regel"
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
      </Section>

      <Section title="Levelbegrenzung">
        <ToggleRow
          label="Levelbegrenzung aktiv"
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
      </Section>

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

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
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
    <label className="flex items-center justify-between gap-4 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
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
