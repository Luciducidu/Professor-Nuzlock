import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ProjectLayout } from '../components/ProjectLayout'
import { exportProject, importProjectBackup } from '../lib/backup'

export function ProjectBackupPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [exportMessage, setExportMessage] = useState('')

  const [file, setFile] = useState<File | null>(null)
  const [importError, setImportError] = useState('')
  const [importing, setImporting] = useState(false)

  const initialMode = searchParams.get('mode')

  return (
    <ProjectLayout>
      {({ project, projectId }) => {
        const handleExport = async () => {
          setExportMessage('')
          try {
            await exportProject(projectId)
            setExportMessage('Backup erstellt.')
          } catch (error) {
            setExportMessage(error instanceof Error ? error.message : 'Export fehlgeschlagen')
          }
        }

        const handleImport = async () => {
          if (!file) {
            setImportError('Ungültige Datei')
            return
          }

          const confirmed = window.confirm('Es wird ein neues Projekt aus dem Backup erstellt. Fortfahren?')
          if (!confirmed) return

          setImportError('')
          setImporting(true)

          try {
            const result = await importProjectBackup(file)
            window.alert('Backup importiert.')
            navigate(`/project/${result.projectId}`)
          } catch (error) {
            setImportError(error instanceof Error ? error.message : 'Import fehlgeschlagen')
            setImporting(false)
          }
        }

        return (
          <>
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900">Backup exportieren</h2>
              <p className="mt-2 text-sm text-slate-600">Erstellt eine JSON-Datei mit Projekt, Orten und Begegnungen.</p>
              <button
                type="button"
                onClick={handleExport}
                className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Backup exportieren
              </button>
              {exportMessage ? <p className="mt-3 text-sm text-slate-700">{exportMessage}</p> : null}
            </section>

            <section className="mt-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900">Backup importieren</h2>
              <p className="mt-2 text-sm text-slate-600">
                Importiert ein Backup als neues Projekt. Bestehende Projekte werden nicht überschrieben.
              </p>

              <div className="mt-4 space-y-3">
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={(event) => {
                    setImportError('')
                    setFile(event.target.files?.[0] ?? null)
                  }}
                  className="block w-full text-sm text-slate-700"
                />

                <button
                  type="button"
                  onClick={handleImport}
                  disabled={!file || importing}
                  className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {importing ? 'Importiert...' : 'Import starten'}
                </button>

                {importError ? <p className="text-sm text-rose-700">{importError}</p> : null}
              </div>
            </section>

            {initialMode === 'export' ? (
              <p className="mt-4 text-sm text-slate-600">Tipp: Der Export-Bereich ist oben bereits bereit.</p>
            ) : null}
            {initialMode === 'import' ? (
              <p className="mt-4 text-sm text-slate-600">Tipp: Wähle unten eine Backup-Datei und starte den Import.</p>
            ) : null}

            <p className="mt-4 text-xs text-slate-500">Aktives Projekt: {project.name}</p>
          </>
        )
      }}
    </ProjectLayout>
  )
}



