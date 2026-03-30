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
    <main className="min-h-screen overflow-x-hidden overflow-y-scroll bg-slate-100 py-6 sm:py-8 lg:py-10">
      <div className="mx-auto w-full max-w-screen-2xl px-4 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="break-words text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
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



