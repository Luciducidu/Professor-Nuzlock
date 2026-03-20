import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AppShell } from '../components/AppShell'
import { ProjectSettingsForm } from '../components/ProjectSettingsForm'
import { db } from '../lib/db'
import { getLevelCapOptions, normalizeProject } from '../lib/projectSettings'
import type { ChallengeType, ProjectGame, ProjectSettings, SoulLinkPlayer } from '../lib/types'

export function ProjectSettingsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [projectName, setProjectName] = useState('')
  const [projectGame, setProjectGame] = useState<ProjectGame>('platinum')
  const [settings, setSettings] = useState<ProjectSettings | null>(null)
  const [challengeType, setChallengeType] = useState<ChallengeType>('nuzlocke')
  const [players, setPlayers] = useState<[SoulLinkPlayer, SoulLinkPlayer]>([
    { id: 'p1', name: '' },
    { id: 'p2', name: '' },
  ])
  const [saving, setSaving] = useState(false)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) return

    let active = true

    const loadProject = async () => {
      const loadedProject = await db.projects.get(id)
      if (!active) return

      if (!loadedProject) {
        setNotFound(true)
        return
      }

      const project = normalizeProject(loadedProject)
      setProjectName(project.name)
      setProjectGame(project.game)
      setSettings(project.settings)
      setChallengeType(project.challengeType ?? 'nuzlocke')
      setPlayers([
        project.players?.find((player) => player.id === 'p1') ?? { id: 'p1', name: '' },
        project.players?.find((player) => player.id === 'p2') ?? { id: 'p2', name: '' },
      ])
    }

    void loadProject()

    return () => {
      active = false
    }
  }, [id])

  const soulLinkPlayersValid = useMemo(() => players.every((player) => player.name.trim().length > 0), [players])
  const submitDisabled = challengeType === 'soullink' && !soulLinkPlayersValid

  const handleSave = async () => {
    if (!id || !settings || saving) return
    if (challengeType === 'soullink' && !soulLinkPlayersValid) return

    setSaving(true)
    await db.projects.update(id, {
      settings,
      challengeType,
      players:
        challengeType === 'soullink'
          ? players.map((player) => ({ ...player, name: player.name.trim() }))
          : undefined,
    })
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
        challengeType={challengeType}
        onChallengeTypeChange={setChallengeType}
        players={players}
        onPlayersChange={setPlayers}
        levelCapOptions={getLevelCapOptions(projectGame)}
        onSubmit={handleSave}
        submitLabel={saving ? 'Speichert...' : 'Speichern'}
        disabled={saving}
        submitDisabled={submitDisabled}
      />
      {submitDisabled ? (
        <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          Bitte beide Spielernamen für die Soullink Challenge eintragen.
        </div>
      ) : null}
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
