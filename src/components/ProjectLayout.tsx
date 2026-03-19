import { useEffect, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { db, ensureDatabaseReady, resetDatabase } from '../lib/db'
import { normalizeProjectSettings } from '../lib/projectSettings'
import type { Project } from '../lib/types'
import { AppShell } from './AppShell'
import { ProjectNav } from './ProjectNav'

type ProjectLayoutChildren = (context: { project: Project; projectId: string }) => ReactNode

type ProjectLayoutProps = {
  children: ProjectLayoutChildren
  actions?: ReactNode
  showBackupNav?: boolean
}

export function ProjectLayout({ children, actions, showBackupNav = true }: ProjectLayoutProps) {
  const { id: projectId } = useParams<{ id: string }>()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dbResetNotice, setDbResetNotice] = useState('')

  useEffect(() => {
    if (!projectId) return

    let active = true

    const loadProject = async () => {
      try {
        const ready = await ensureDatabaseReady()
        const loadedProject = await db.projects.get(projectId)
        if (!active) return

        setProject(
          loadedProject
            ? {
                ...loadedProject,
                settings: normalizeProjectSettings(loadedProject.settings),
              }
            : null,
        )
        setError('')
        setDbResetNotice(
          ready.resetPerformed
            ? 'Datenbank wurde aktualisiert. Alte Daten konnten nicht übernommen werden.'
            : '',
        )
      } catch (loadError) {
        console.error(loadError)
        if (!active) return
        setError('Projektdaten konnten nicht geladen werden.')
      }

      if (!active) return
      setLoading(false)
    }

    void loadProject()

    return () => {
      active = false
    }
  }, [projectId])

  if (!projectId) {
    return (
      <AppShell title="Professor Nuzlock">
        <InfoCard text="Projekt nicht gefunden." />
      </AppShell>
    )
  }

  if (loading) {
    return (
      <AppShell title="Professor Nuzlock">
        <InfoCard text="Projekt wird geladen..." />
      </AppShell>
    )
  }

  if (error) {
    return (
      <AppShell title="Professor Nuzlock">
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 shadow-sm">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => void resetDatabase()}
            className="mt-3 rounded-md bg-rose-600 px-3 py-1.5 font-semibold text-white transition hover:bg-rose-500"
          >
            Datenbank Zurücksetzen
          </button>
        </div>
      </AppShell>
    )
  }

  if (!project) {
    return (
      <AppShell title="Professor Nuzlock" actions={<HomeLink />}>
        <InfoCard text="Projekt nicht gefunden." />
      </AppShell>
    )
  }

  return (
    <AppShell title="Professor Nuzlock" subtitle={project.name} actions={actions}>
      {dbResetNotice ? (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 shadow-sm">
          {dbResetNotice}
        </div>
      ) : null}
      <ProjectNav projectId={projectId} showBackup={showBackupNav} />
      {children({ project, projectId })}
    </AppShell>
  )
}

function HomeLink() {
  return (
    <Link
      to="/"
      className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
    >
      Zur Startseite
    </Link>
  )
}

function InfoCard({ text }: { text: string }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">{text}</div>
}



