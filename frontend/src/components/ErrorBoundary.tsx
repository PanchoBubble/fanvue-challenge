import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="bg-surface-page flex h-dvh flex-col items-center justify-center gap-4">
          <p className="text-error text-sm">Something went wrong</p>
          <button
            onClick={() => this.setState({ error: null })}
            className="border-border-card text-dim rounded-lg border px-4 py-2 text-sm transition-colors hover:bg-white/5"
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
