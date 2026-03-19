import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AppShell } from '../components/AppShell'
import { importProjectBackup } from '../lib/backup'
import { db, ensureDatabaseReady, resetDatabase } from '../lib/db'
import { formatGameName, normalizeProject } from '../lib/projectSettings'
import type { Project } from '../lib/types'

export function ProjectListPage() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dbResetNotice, setDbResetNotice] = useState('')

  const [importFile, setImportFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState('')

  useEffect(() => {
    let active = true

    const loadProjects = async () => {
      try {
        const ready = await ensureDatabaseReady()
        const list = await db.projects.orderBy('createdAt').reverse().toArray()
        if (!active) return

        setProjects(list.map(normalizeProject))
        setError('')
        setDbResetNotice(
          ready.resetPerformed
            ? 'Datenbank wurde aktualisiert. Alte Daten konnten nicht übernommen werden.'
            : '',
        )
      } catch (loadError) {
        console.error(loadError)
        if (!active) return
        setError('Projekte konnten nicht geladen werden.')
      }

      if (!active) return
      setLoading(false)
    }

    void loadProjects()

    return () => {
      active = false
    }
  }, [])

  const handleImport = async () => {
    if (!importFile) {
      setImportError('Ungültige Datei')
      return
    }

    const confirmed = window.confirm('Es wird ein neues Projekt aus dem Backup erstellt. Fortfahren?')
    if (!confirmed) return

    setImporting(true)
    setImportError('')

    try {
      const result = await importProjectBackup(importFile)
      navigate(`/project/${result.projectId}`)
    } catch (importFailure) {
      console.error(importFailure)
      setImportError(importFailure instanceof Error ? importFailure.message : 'Import fehlgeschlagen')
      setImporting(false)
    }
  }

  return (
    <AppShell
      title="Professor Nuzlock"
      subtitle="Lokale Runs und Regeln. Alles bleibt in deinem Browser gespeichert."
      actions={
        <Link
          to="/new"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          Neues Projekt
        </Link>
      }
    >
      <section className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Projekt importieren</h2>
        <p className="mt-1 text-sm text-slate-600">Importiert ein Backup als neues Projekt.</p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            type="file"
            accept=".json,application/json"
            onChange={(event) => {
              setImportError('')
              setImportFile(event.target.files?.[0] ?? null)
            }}
            className="block text-sm text-slate-700"
          />
          <button
            type="button"
            onClick={() => void handleImport()}
            disabled={!importFile || importing}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100"
          >
            {importing ? 'Importiert...' : 'Import starten'}
          </button>
        </div>

        {importError ? <p className="mt-2 text-sm text-rose-700">{importError}</p> : null}
      </section>

      {error ? (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 shadow-sm">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => void resetDatabase()}
            className="mt-3 rounded-md bg-rose-600 px-3 py-1.5 font-semibold text-white transition hover:bg-rose-500"
          >
            Datenbank zurücksetzen
          </button>
        </div>
      ) : null}

      {dbResetNotice ? (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 shadow-sm">
          {dbResetNotice}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          Projekte werden geladen...
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600 shadow-sm">
          Noch keine Projekte vorhanden. Lege dein erstes Projekt an.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {projects.map((project) => (
            <Link
              key={project.id}
              to={`/project/${project.id}`}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow"
            >
              <h2 className="text-lg font-semibold text-slate-900">{project.name}</h2>
              <p className="mt-1 text-sm text-slate-600">{formatGameName(project.game)}</p>
              <p className="mt-3 text-xs text-slate-500">
                Erstellt: {new Date(project.createdAt).toLocaleString()}
              </p>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  )
}
