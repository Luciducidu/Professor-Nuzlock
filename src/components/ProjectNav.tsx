import { Link, NavLink } from 'react-router-dom'

type ProjectNavProps = {
  projectId: string
  showBackup?: boolean
}

export function ProjectNav({ projectId, showBackup = true }: ProjectNavProps) {
  return (
    <nav className="mb-6">
      <div className="mb-3 flex justify-end">
        <Link
          to="/"
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Startseite
        </Link>
      </div>
      <div className="border-b border-slate-200">
        <ul className="flex flex-wrap gap-2">
          <li>
            <NavItem to={`/project/${projectId}`} label="Übersicht" end />
          </li>
          <li>
            <NavItem to={`/project/${projectId}/orte`} label="Orte" />
          </li>
          <li>
            <NavItem to={`/project/${projectId}/pokemon`} label="Pokémon" />
          </li>
          <li>
            <NavItem to={`/project/${projectId}/team`} label="Team" />
          </li>
          <li>
            <NavItem to={`/project/${projectId}/levelcaps`} label="Levelbegrenzung" />
          </li>
          <li>
            <NavItem to={`/project/${projectId}/typen`} label="Typen" />
          </li>
          <li>
            <NavItem to={`/project/${projectId}/fangrate`} label="Fangratenrechner" />
          </li>
          <li>
            <NavItem to={`/project/${projectId}/wesen`} label="Wesen" />
          </li>
          {showBackup ? (
            <li>
              <NavItem to={`/project/${projectId}/backup`} label="Backup" />
            </li>
          ) : null}
        </ul>
      </div>
    </nav>
  )
}

function NavItem({ to, label, end = false }: { to: string; label: string; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `inline-block rounded-t-md px-3 py-2 text-sm font-semibold transition ${
          isActive
            ? 'border-b-2 border-slate-900 text-slate-900'
            : 'text-slate-600 hover:text-slate-900'
        }`
      }
    >
      {label}
    </NavLink>
  )
}
