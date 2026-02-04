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
        <div className="flex h-screen flex-col items-center justify-center gap-4 bg-surface-page">
          <p className="text-sm text-error">Something went wrong</p>
          <button
            onClick={() => this.setState({ error: null })}
            className="rounded-lg border border-border-card px-4 py-2 text-sm text-dim hover:bg-white/5 transition-colors"
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
