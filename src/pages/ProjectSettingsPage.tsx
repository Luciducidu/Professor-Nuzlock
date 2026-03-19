import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AppShell } from '../components/AppShell'
import { ProjectSettingsForm } from '../components/ProjectSettingsForm'
import { db } from '../lib/db'
import { normalizeProjectSettings } from '../lib/projectSettings'
import type { ProjectSettings } from '../lib/types'

export function ProjectSettingsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [projectName, setProjectName] = useState('')
  const [settings, setSettings] = useState<ProjectSettings | null>(null)
  const [saving, setSaving] = useState(false)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) return

    let active = true

    const loadProject = async () => {
      const project = await db.projects.get(id)
      if (!active) return

      if (!project) {
        setNotFound(true)
        return
      }

      setProjectName(project.name)
      setSettings(normalizeProjectSettings(project.settings))
    }

    void loadProject()

    return () => {
      active = false
    }
  }, [id])

  const handleSave = async () => {
    if (!id || !settings || saving) return

    setSaving(true)
    await db.projects.update(id, { settings })
    navigate(`/project/${id}`)
  }

  if (notFound || !id) {
    return (
      <AppShell title="Projekt nicht gefunden" actions={<BackButton to="/" />}>
        <InfoCard text="Einstellungen konnten nicht geladen werden." />
      </AppShell>
    )
  }

  if (!settings) {
    return (
      <AppShell title="Einstellungen" actions={<BackButton to="/" />}>
        <InfoCard text="Einstellungen werden geladen..." />
      </AppShell>
    )
  }

  return (
    <AppShell title="Einstellungen" subtitle={projectName} actions={<BackButton to={`/project/${id}`} />}>
      <ProjectSettingsForm
        value={settings}
        onChange={setSettings}
        onSubmit={handleSave}
        submitLabel={saving ? 'Speichert...' : 'Speichern'}
        disabled={saving}
      />
    </AppShell>
  )
}

function BackButton({ to }: { to: string }) {
  return (
    <Link
      to={to}
      className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
    >
      Zurück
    </Link>
  )
}

function InfoCard({ text }: { text: string }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">{text}</div>
}
