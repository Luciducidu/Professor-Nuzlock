import { ProjectLayout } from '../components/ProjectLayout'
import {
  NATURE_MATRIX_DE,
  NATURE_MINUS_LABELS,
  NATURE_PLUS_LABELS,
  NATURE_STAT_ORDER,
  type NatureStatKey,
} from '../data/natures.de'

export function ProjectNaturesPage() {
  return (
    <ProjectLayout>
      {() => (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Wesen</h2>
          <p className="mt-1 text-sm text-slate-600">
            Spalte = erhöhter Wert (+), Zeile = gesenkter Wert (-).
          </p>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-[700px] border-collapse text-sm">
              <thead>
                <tr>
                  <th className="border border-slate-200 bg-slate-100 px-3 py-2 text-left font-semibold text-slate-900">
                    -
                  </th>
                  {NATURE_STAT_ORDER.map((plusStat) => (
                    <th
                      key={plusStat}
                      className="border border-slate-200 bg-red-50 px-3 py-2 text-center font-semibold text-red-600"
                    >
                      {NATURE_PLUS_LABELS[plusStat]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {NATURE_STAT_ORDER.map((minusStat) => (
                  <tr key={minusStat}>
                    <th className="border border-slate-200 bg-blue-50 px-3 py-3 text-left font-semibold text-blue-600">
                      {NATURE_MINUS_LABELS[minusStat]}
                    </th>
                    {NATURE_STAT_ORDER.map((plusStat) => (
                      <NatureCell key={`${minusStat}-${plusStat}`} minusStat={minusStat} plusStat={plusStat} />
                    ))}
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

function NatureCell({ minusStat, plusStat }: { minusStat: NatureStatKey; plusStat: NatureStatKey }) {
  const natureName = NATURE_MATRIX_DE[minusStat][plusStat]
  const isNeutral = minusStat === plusStat

  return (
    <td
      className={`border border-slate-200 px-3 py-4 text-center text-[15px] ${
        isNeutral ? 'bg-slate-50 text-slate-700' : 'bg-white text-slate-900'
      }`}
    >
      {natureName}
    </td>
  )
}
