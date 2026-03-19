import { ProjectLayout } from '../components/ProjectLayout'
import { TYPE_EFFECTIVENESS_GEN4, TYPE_NAMES_DE, type TypeKey } from '../data/typeChart.gen4.de'

const TYPE_ORDER = Object.keys(TYPE_NAMES_DE) as TypeKey[]

function getMultiplier(attacker: TypeKey, defender: TypeKey): 2 | 0.5 | 0 | 1 {
  const row = TYPE_EFFECTIVENESS_GEN4[attacker]
  if (row.x0.includes(defender)) return 0
  if (row.x2.includes(defender)) return 2
  if (row.x05.includes(defender)) return 0.5
  return 1
}

export function ProjectTypesPage() {
  return (
    <ProjectLayout>
      {() => (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Typen</h2>
          <p className="mt-1 text-sm text-slate-600">
            Angreifer = Attacken-Typ (Zeilen), Verteidiger = Pokémon-Typ (Spalten). Bei zwei Typen werden die Multiplikatoren multipliziert.
          </p>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
              <span className="font-semibold">Links:</span> Angreifer
              <span className="mx-2 text-sky-400">•</span>
              <span className="font-semibold">Zeilen</span>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              <span className="font-semibold">Oben:</span> Verteidiger
              <span className="mx-2 text-emerald-400">•</span>
              <span className="font-semibold">Spalten</span>
            </div>
          </div>

          <div className="mt-4 -mx-2 overflow-x-auto px-2 xl:mx-[-1.5rem] xl:px-6">
            <table className="min-w-[1120px] border-collapse text-sm xl:min-w-full">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 min-w-[150px] border border-slate-200 bg-slate-100 px-3 py-3 text-left font-semibold text-slate-900">
                    <div className="space-y-1">
                      <div>Links: Angreifer</div>
                      <div className="text-xs font-medium text-slate-600">Oben: Verteidiger</div>
                    </div>
                  </th>
                  {TYPE_ORDER.map((defender) => (
                    <th
                      key={defender}
                      className="min-w-[64px] border border-slate-200 bg-slate-100 px-2 py-3 text-center font-semibold text-slate-900"
                    >
                      {TYPE_NAMES_DE[defender]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TYPE_ORDER.map((attacker) => (
                  <tr key={attacker}>
                    <th className="sticky left-0 z-10 min-w-[150px] border border-slate-200 bg-white px-3 py-3 text-left font-semibold text-slate-900">
                      {TYPE_NAMES_DE[attacker]}
                    </th>
                    {TYPE_ORDER.map((defender) => {
                      const mult = getMultiplier(attacker, defender)
                      return (
                        <td
                          key={`${attacker}-${defender}`}
                          className={`min-w-[64px] border border-slate-200 px-2 py-3 text-center ${
                            mult === 2
                              ? 'bg-red-100 text-red-700 font-semibold'
                              : mult === 0.5
                                ? 'bg-green-100 text-green-700 font-semibold'
                                : mult === 0
                                  ? 'bg-red-200 text-red-700 font-bold'
                                  : 'text-slate-400'
                          }`}
                        >
                          {mult === 2 ? '2×' : null}
                          {mult === 0.5 ? '0,5×' : null}
                          {mult === 0 ? '✖' : null}
                          {mult === 1 ? '-' : null}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </ProjectLayout>
  )
}
