import { useEffect, useState } from 'react'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export function InstallAppCard() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installMessage, setInstallMessage] = useState('')

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
  }, [])

  const handleInstall = async () => {
    if (!installPrompt) return

    await installPrompt.prompt()
    const result = await installPrompt.userChoice
    if (result.outcome === 'accepted') {
      setInstallMessage('Installation gestartet.')
      setInstallPrompt(null)
    }
  }

  return (
    <div className="mb-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
      <p>Du kannst Professor Nuzlock als App installieren.</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {installPrompt ? (
          <button
            type="button"
            onClick={() => void handleInstall()}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700"
          >
            App installieren
          </button>
        ) : (
          <span className="text-xs text-slate-500">Installation im Browser-Menü möglich.</span>
        )}
        {installMessage ? <span className="text-xs text-emerald-700">{installMessage}</span> : null}
      </div>
    </div>
  )
}
