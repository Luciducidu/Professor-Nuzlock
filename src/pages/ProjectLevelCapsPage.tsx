import { useEffect, useMemo, useState } from 'react'
import { ProjectLayout } from '../components/ProjectLayout'
import { db } from '../lib/db'
import {
  getLevelCapByKey,
  getLevelCapOptions,
  getLevelCapsForGame,
  normalizeProjectSettings,
} from '../lib/projectSettings'
import type { ProjectGame, ProjectSettings } from '../lib/types'

type LevelCapEntry = {
  key: string
  label: string
  cap: number
}

export function ProjectLevelCapsPage() {
  return (
    <ProjectLayout>
      {({ project, projectId }) => (
        <ProjectLevelCapsContent
          projectId={projectId}
          game={project.game}
          initialSettings={normalizeProjectSettings(project.settings, project.game)}
        />
      )}
    </ProjectLayout>
  )
}

function ProjectLevelCapsContent({
  projectId,
  game,
  initialSettings,
}: {
  projectId: string
  game: ProjectGame
  initialSettings: ProjectSettings
}) {
  const [settings, setSettings] = useState<ProjectSettings>(initialSettings)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    setSettings(initialSettings)
  }, [initialSettings])

  const levelCaps = useMemo(() => getLevelCapsForGame(game), [game])
  const levelCapOptions = useMemo(() => getLevelCapOptions(game), [game])
  const currentCap = useMemo(
    () => getLevelCapByKey(game, settings.levelCapsProgressKey),
    [game, settings.levelCapsProgressKey],
  )

  const gymCaps = useMemo(() => levelCaps.filter((entry) => entry.key.startsWith('gym')), [levelCaps])
  const e4Caps = useMemo(() => levelCaps.filter((entry) => entry.key.startsWith('e4-')), [levelCaps])
  const champCap = useMemo(() => levelCaps.filter((entry) => entry.key === 'champ'), [levelCaps])

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
              onChange={(event) => setSettings((prev) => ({ ...prev, levelCapsEnabled: event.target.checked }))}
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
              onChange={(event) => setSettings((prev) => ({ ...prev, levelCapsProgressKey: event.target.value }))}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-sky-500 transition focus:ring-2"
            >
              {levelCapOptions.map((option) => (
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

      <LevelCapGroup title="Arenaleiter" entries={gymCaps} currentKey={currentCap.key} />
      <LevelCapGroup title="Top 4" entries={e4Caps} currentKey={currentCap.key} />
      <LevelCapGroup title="Champ" entries={champCap} currentKey={currentCap.key} />
    </div>
  )
}

function LevelCapGroup({
  title,
  entries,
  currentKey,
}: {
  title: string
  entries: readonly LevelCapEntry[]
  currentKey: string
}) {
  if (entries.length === 0) return null

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <div className="mt-3 divide-y divide-slate-200 rounded-md border border-slate-200">
        {entries.map((entry) => {
          const isCurrent = entry.key === currentKey
          return (
            <div
              key={entry.key}
              className={`flex items-center justify-between px-3 py-4 text-base ${isCurrent ? 'bg-sky-50' : 'bg-white'}`}
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
