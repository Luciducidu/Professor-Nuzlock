import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

type ProjectErrorBoundaryProps = {
  children: ReactNode
}

type ProjectErrorBoundaryState = {
  hasError: boolean
}

export class ProjectErrorBoundary extends Component<ProjectErrorBoundaryProps, ProjectErrorBoundaryState> {
  state: ProjectErrorBoundaryState = {
    hasError: false,
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Projektseite abgestürzt', error, info)
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800 shadow-sm">
        <p className="text-base font-semibold text-rose-900">Beim Laden dieser Projektseite ist ein Fehler aufgetreten.</p>
        <p className="mt-2">Die restliche Website bleibt nutzbar. Du kannst die Seite neu laden oder zur Startseite zurückkehren.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-md bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-500"
          >
            Neu laden
          </button>
          <Link
            to="/"
            className="rounded-md border border-rose-300 bg-white px-4 py-2 text-sm font-semibold text-rose-800 transition hover:bg-rose-100"
          >
            Zur Startseite
          </Link>
        </div>
      </div>
    )
  }
}
