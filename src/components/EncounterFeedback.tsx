export function EncounterWarningBox({
  title,
  message,
}: {
  title: string
  message: string
}) {
  return (
    <div className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-900">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-rose-100 text-base font-bold text-rose-700">
          !
        </div>
        <div>
          <p className="font-semibold text-rose-800">{title}</p>
          <p className="mt-1 text-rose-700">{message}</p>
        </div>
      </div>
    </div>
  )
}

export function EncounterValidBox({ message = 'Eingabe gültig' }: { message?: string }) {
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
      <p className="font-medium">{message}</p>
    </div>
  )
}

export function EncounterDraftBox({
  title,
  message,
}: {
  title: string
  message: string
}) {
  return (
    <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
      <p className="font-semibold text-sky-800">{title}</p>
      <p className="mt-1 text-sky-700">{message}</p>
    </div>
  )
}
