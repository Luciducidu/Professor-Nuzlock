import Dexie from 'dexie'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AppShell } from '../components/AppShell'
import { db } from '../lib/db'
import type { LocationType, Project } from '../lib/types'

const TYPE_OPTIONS: Array<{ value: LocationType; label: string }> = [
  { value: 'route', label: 'Route' },
  { value: 'city', label: 'Stadt' },
  { value: 'other', label: 'Sonstiges' },
]

export function NewLocationPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [project, setProject] = useState<Project | null>(null)
  const [name, setName] = useState('')
  const [type, setType] = useState<LocationType>('route')
  const [orderInput, setOrderInput] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!projectId) return

    let active = true

    const loadProject = async () => {
      const loadedProject = await db.projects.get(projectId)
      if (!active) return
      setProject(loadedProject ?? null)
    }

    void loadProject()

    return () => {
      active = false
    }
  }, [projectId])

  const handleSave = async () => {
    if (!projectId || !name.trim() || saving) return

    setSaving(true)

    const projectLocations = await db.locations
      .where('[projectId+order]')
      .between([projectId, Dexie.minKey], [projectId, Dexie.maxKey])
      .toArray()

    const maxOrder = projectLocations.reduce((max, location) => Math.max(max, location.order), 0)
    const trimmedOrder = orderInput.trim()
    const parsedOrder = Number(trimmedOrder)
    const order =
      trimmedOrder.length > 0 && Number.isFinite(parsedOrder) ? parsedOrder : maxOrder + 1

    await db.locations.add({
      id: crypto.randomUUID(),
      projectId,
      name: name.trim(),
      type,
      order,
      createdAt: Date.now(),
      notes: notes.trim(),
    })

    navigate(`/project/${projectId}/orte`)
  }

  if (!projectId || !project) {
    return (
      <AppShell title="Ort hinzufügen" actions={<BackButton to={projectId ? `/project/${projectId}/orte` : '/'} />}>
        <InfoCard text="Projekt wird geladen oder existiert nicht." />
      </AppShell>
    )
  }

  return (
    <AppShell
      title="Ort hinzufügen"
      subtitle={project.name}
      actions={<BackButton to={`/project/${project.id}/orte`} />}
    >
      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <label htmlFor="location-name" className="mb-2 block text-sm font-medium text-slate-700">
            Name
          </label>
          <input
            id="location-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-sky-500 transition focus:ring-2"
          />
        </div>

        <div>
          <label htmlFor="location-type" className="mb-2 block text-sm font-medium text-slate-700">
            Typ
          </label>
          <select
            id="location-type"
            value={type}
            onChange={(event) => setType(event.target.value as LocationType)}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-sky-500 transition focus:ring-2"
          >
            {TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="location-order" className="mb-2 block text-sm font-medium text-slate-700">
            Sortierung (optional)
          </label>
          <input
            id="location-order"
            value={orderInput}
            onChange={(event) => setOrderInput(event.target.value)}
            placeholder="Leer fur automatische Sortierung"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-sky-500 transition focus:ring-2"
          />
        </div>

        <div>
          <label htmlFor="location-notes" className="mb-2 block text-sm font-medium text-slate-700">
            Notiz (optional)
          </label>
          <textarea
            id="location-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={4}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-sky-500 transition focus:ring-2"
          />
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || name.trim().length === 0}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            Speichern
          </button>
          <BackButton to={`/project/${project.id}/orte`} label="Abbrechen" />
        </div>
      </div>
    </AppShell>
  )
}

function BackButton({ to, label = 'Zurück' }: { to: string; label?: string }) {
  return (
    <Link
      to={to}
      className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
    >
      {label}
    </Link>
  )
}

function InfoCard({ text }: { text: string }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">{text}</div>
}



