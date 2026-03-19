import { useEffect, useMemo, useState } from 'react'
import { PLATINUM_LEVEL_CAPS_DE } from '../data/platinumLevelCaps.de'
import { ProjectLayout } from '../components/ProjectLayout'
import { db } from '../lib/db'
import {
  LEVEL_CAP_OPTIONS,
  getLevelCapByKey,
  normalizeProjectSettings,
} from '../lib/projectSettings'
import type { ProjectSettings } from '../lib/types'

const GYM_CAPS = PLATINUM_LEVEL_CAPS_DE.filter((entry) => entry.key.startsWith('gym'))
const E4_CAPS = PLATINUM_LEVEL_CAPS_DE.filter((entry) => entry.key.startsWith('e4-'))
const CHAMP_CAP = PLATINUM_LEVEL_CAPS_DE.filter((entry) => entry.key === 'champ')

export function ProjectLevelCapsPage() {
  return (
    <ProjectLayout>
      {({ project, projectId }) => (
        <ProjectLevelCapsContent
          projectId={projectId}
          initialSettings={normalizeProjectSettings(project.settings)}
        />
      )}
    </ProjectLayout>
  )
}

function ProjectLevelCapsContent({
  projectId,
  initialSettings,
}: {
  projectId: string
  initialSettings: ProjectSettings
}) {
  const [settings, setSettings] = useState<ProjectSettings>(initialSettings)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    setSettings(initialSettings)
  }, [initialSettings])

  const currentCap = useMemo(
    () => getLevelCapByKey(settings.levelCapsProgressKey),
    [settings.levelCapsProgressKey],
  )

  const handleSave = async () => {
    setSaving(true)
    setSaveMessage('')
    setError('')

    try {
      await db.projects.update(projectId, { settings })
      setSaveMessage('Gespeichert.')
    } catch (saveError) {
      console.error(saveError)
      setError('Konnte nicht gespeichert werden.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Fortschritt</h2>

        <div className="mt-4 grid gap-3 lg:grid-cols-[auto,1fr,auto] lg:items-end">
          <label className="flex items-center justify-between gap-4 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700">
            <span>Levelbegrenzung aktiv</span>
            <input
              type="checkbox"
              checked={settings.levelCapsEnabled}
              onChange={(event) =>
                setSettings((prev) => ({ ...prev, levelCapsEnabled: event.target.checked }))
              }
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
            />
          </label>

          <div>
            <label htmlFor="levelcaps-progress" className="mb-2 block text-sm font-medium text-slate-700">
              Nächster Boss
            </label>
            <select
              id="levelcaps-progress"
              value={settings.levelCapsProgressKey}
              onChange={(event) =>
                setSettings((prev) => ({ ...prev, levelCapsProgressKey: event.target.value }))
              }
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-sky-500 transition focus:ring-2"
            >
              {LEVEL_CAP_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {saving ? 'Speichert...' : 'Speichern'}
          </button>
        </div>

        {saveMessage ? <p className="mt-3 text-sm text-emerald-700">{saveMessage}</p> : null}
        {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}
      </section>

      {settings.levelCapsEnabled ? (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Aktuelle Levelbegrenzung</h2>
          <div className="mt-3 flex items-center justify-between rounded-md border border-sky-200 bg-sky-50 px-3 py-3 text-base">
            <span className="font-medium text-slate-900">{currentCap.label}</span>
            <span className="font-semibold text-slate-900">Level {currentCap.cap}</span>
          </div>
        </section>
      ) : null}

      <LevelCapGroup title="Arenaleiter" entries={GYM_CAPS} currentKey={currentCap.key} />
      <LevelCapGroup title="Top 4" entries={E4_CAPS} currentKey={currentCap.key} />
      <LevelCapGroup title="Champ" entries={CHAMP_CAP} currentKey={currentCap.key} />
    </div>
  )
}

function LevelCapGroup({
  title,
  entries,
  currentKey,
}: {
  title: string
  entries: ReadonlyArray<{ key: string; label: string; cap: number }>
  currentKey: string
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <div className="mt-3 divide-y divide-slate-200 rounded-md border border-slate-200">
        {entries.map((entry) => {
          const isCurrent = entry.key === currentKey
          return (
            <div
              key={entry.key}
              className={`flex items-center justify-between px-3 py-4 text-base ${
                isCurrent ? 'bg-sky-50' : 'bg-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-slate-900">{entry.label}</span>
                {isCurrent ? (
                  <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-700">
                    Aktuell
                  </span>
                ) : null}
              </div>
              <span className="font-semibold text-slate-900">Level {entry.cap}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
