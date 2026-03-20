import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ProjectLayout } from '../components/ProjectLayout'
import { db } from '../lib/db'
import {
  DUPES_MODE_OPTIONS,
  formatChallengeType,
  formatGameName,
  formatSoulLinkPartnerDupesMode,
  getSoulLinkPlayers,
  getLevelCapByKey,
  normalizeProjectSettings,
} from '../lib/projectSettings'
import type { Encounter, Location, Project, ProjectSettings } from '../lib/types'

const DUPES_LABELS: Record<string, string> = Object.fromEntries(
  DUPES_MODE_OPTIONS.map((option) => [option.value, option.label]),
)

type ProjectStats = {
  caught: number
  notCaught: number
  dead: number
  locationsWithEncounter: number
  locationsTotal: number
}

const EMPTY_STATS: ProjectStats = {
  caught: 0,
  notCaught: 0,
  dead: 0,
  locationsWithEncounter: 0,
  locationsTotal: 0,
}

export function ProjectDashboardPage() {
  const [stats, setStats] = useState<ProjectStats>(EMPTY_STATS)

  return (
    <ProjectLayout
      actions={
        <Link
          to="settings"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          Einstellungen
        </Link>
      }
    >
      {({ project, projectId }) => (
        <DashboardContent
          project={project}
          projectId={projectId}
          gameLabel={formatGameName(project.game)}
          settings={normalizeProjectSettings(project.settings, project.game)}
          stats={stats}
          onStatsChange={setStats}
        />
      )}
    </ProjectLayout>
  )
}

function DashboardContent({
  project,
  projectId,
  gameLabel,
  settings,
  stats,
  onStatsChange,
}: {
  project: Project
  projectId: string
  gameLabel: string
  settings: ProjectSettings
  stats: ProjectStats
  onStatsChange: (stats: ProjectStats) => void
}) {
  useEffect(() => {
    let active = true

    const loadStats = async () => {
      const [encounters, locations] = await Promise.all([
        db.encounters.where('projectId').equals(projectId).toArray(),
        db.locations.where('projectId').equals(projectId).toArray(),
      ])

      if (!active) return
      onStatsChange(buildStats(encounters, locations))
    }

    void loadStats()

    return () => {
      active = false
    }
  }, [projectId, onStatsChange])

  const statItems = useMemo(
    () => [
      { label: 'Gefangen', value: stats.caught },
      { label: 'Nicht gefangen', value: stats.notCaught },
      { label: 'Verstorben', value: stats.dead },
      { label: 'Orte mit Begegnung', value: stats.locationsWithEncounter },
      { label: 'Orte gesamt', value: stats.locationsTotal },
    ],
    [stats],
  )

  const currentCap = getLevelCapByKey(project.game, settings.levelCapsProgressKey)
  const soulLinkPlayers = getSoulLinkPlayers(project)

  return (
    <>
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Regelzusammenfassung</h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <SummaryRow label="Spiel" value={gameLabel} />
          <SummaryRow label="Challenge-Typ" value={formatChallengeType(project.challengeType ?? 'nuzlocke')} />
          {soulLinkPlayers ? <SummaryRow label="Spieler 1" value={soulLinkPlayers[0].name || 'Spieler 1'} /> : null}
          {soulLinkPlayers ? <SummaryRow label="Spieler 2" value={soulLinkPlayers[1].name || 'Spieler 2'} /> : null}
          <SummaryRow label="Dupes-Regel" value={DUPES_LABELS[settings.dupesMode] ?? settings.dupesMode} />
          {soulLinkPlayers ? (
            <SummaryRow
              label="Soullink-Sperre"
              value={formatSoulLinkPartnerDupesMode(settings.soulLinkPartnerDupesMode)}
            />
          ) : null}
          <SummaryRow label="Shiny-Regel" value={settings.shinyClauseEnabled ? 'Aktiviert' : 'Deaktiviert'} />
          <SummaryRow label="Static-Regel" value={settings.staticClauseEnabled ? 'Aktiviert' : 'Deaktiviert'} />
          <SummaryRow
            label="Shiny umgeht Dupes"
            value={settings.shinyClauseEnabled ? (settings.shinyBypassesDupes ? 'Ja' : 'Nein') : 'Nicht aktiv'}
          />
          <SummaryRow
            label="Static umgeht Dupes"
            value={settings.staticClauseEnabled ? (settings.staticBypassesDupes ? 'Ja' : 'Nein') : 'Nicht aktiv'}
          />
        </dl>
      </section>

      <section className="mt-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-slate-900">Aktuelle Levelbegrenzung</h2>
          <Link
            to={`/project/${projectId}/levelcaps`}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Anzeigen
          </Link>
        </div>

        {settings.levelCapsEnabled ? (
          <div className="mt-3 rounded-md border border-slate-200 px-3 py-2">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="font-medium text-slate-900">{currentCap.label}</span>
              <span className="font-semibold text-slate-900">Level {currentCap.cap}</span>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-600">Levelbegrenzung ist deaktiviert.</p>
        )}
      </section>

      <section className="mt-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Projektstatistik</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {statItems.map((item) => (
            <div key={item.label} className="rounded-md border border-slate-200 px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-slate-500">{item.label}</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{item.value}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}

function buildStats(encounters: Encounter[], locations: Location[]): ProjectStats {
  const caught = encounters.filter((encounter) => encounter.outcome === 'caught')
  const notCaught = encounters.filter((encounter) => encounter.outcome === 'not_caught')
  const dead = caught.filter((encounter) => encounter.isDead)

  const locationIds = new Set(encounters.map((encounter) => encounter.locationId))

  return {
    caught: caught.length,
    notCaught: notCaught.length,
    dead: dead.length,
    locationsWithEncounter: locationIds.size,
    locationsTotal: locations.length,
  }
}

type SummaryRowProps = {
  label: string
  value: string
}

function SummaryRow({ label, value }: SummaryRowProps) {
  return (
    <div className="rounded-md border border-slate-200 px-3 py-2">
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 font-medium text-slate-900">{value}</dd>
    </div>
  )
}
