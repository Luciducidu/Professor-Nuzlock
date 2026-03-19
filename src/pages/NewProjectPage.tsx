import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AppShell } from '../components/AppShell'
import { ProjectSettingsForm } from '../components/ProjectSettingsForm'
import { db, ensureDatabaseReady } from '../lib/db'
import { ensureStarterLocation } from '../lib/locations'
import { DEFAULT_PROJECT_SETTINGS, GAME_OPTIONS } from '../lib/projectSettings'
import type { ProjectGame, ProjectSettings } from '../lib/types'

export function NewProjectPage() {
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [game, setGame] = useState<ProjectGame>('platinum')
  const [settings, setSettings] = useState<ProjectSettings>(DEFAULT_PROJECT_SETTINGS)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const canSubmit = useMemo(() => name.trim().length > 0 && !saving, [name, saving])

  const handleCreateProject = async () => {
    if (!canSubmit) return

    setError('')
    setSaving(true)

    try {
      await ensureDatabaseReady()

      const trimmedName = name.trim()
      if (!trimmedName) {
        throw new Error('Projektname fehlt')
      }

      const id = crypto.randomUUID()

      await db.projects.add({
        id,
        name: trimmedName,
        game,
        createdAt: Date.now(),
        settings,
      })

      try {
        await ensureStarterLocation(id)
      } catch (starterError) {
        console.error('Starter-Location konnte nicht erstellt werden', starterError)
      }

      navigate(`/project/${id}`)
    } catch (saveError) {
      console.error(saveError)
      setError('Speichern fehlgeschlagen. Bitte öffne die Konsole für Details.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppShell
      title="Neues Projekt"
      subtitle="Lege einen neuen Nuzlocke-Run mit eigenen Regeln an."
      actions={
        <Link
          to="/"
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Zurück
        </Link>
      }
    >
      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <label htmlFor="project-name" className="mb-2 block text-sm font-medium text-slate-700">
            Projektname
          </label>
          <input
            id="project-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="z. B. Platin Hardcore"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-sky-500 transition focus:ring-2"
          />
        </div>

        <div>
          <label htmlFor="project-game" className="mb-2 block text-sm font-medium text-slate-700">
            Spiel
          </label>
          <select
            id="project-game"
            value={game}
            onChange={(event) => setGame(event.target.value as ProjectGame)}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-sky-500 transition focus:ring-2"
          >
            {GAME_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4">
        <ProjectSettingsForm
          value={settings}
          onChange={setSettings}
          onSubmit={handleCreateProject}
          submitLabel={saving ? 'Speichert...' : 'Speichern'}
          disabled={saving}
          submitDisabled={!canSubmit}
        />
        {error ? (
          <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        ) : null}
      </div>
    </AppShell>
  )
}
