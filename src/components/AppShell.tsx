import type { ReactNode } from 'react'
import { InstallAppCard } from './InstallAppCard'

type AppShellProps = {
  title: string
  subtitle?: string
  actions?: ReactNode
  children: ReactNode
}

export function AppShell({ title, subtitle, actions, children }: AppShellProps) {
  return (
    <main className="min-h-screen overflow-y-scroll bg-slate-100 py-10">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">{title}</h1>
            {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
          </div>
          {actions}
        </header>
        <InstallAppCard />
        {children}
      </div>
    </main>
  )
}



