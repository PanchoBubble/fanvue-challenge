import { useEffect, useRef } from 'react'

interface OnlineIndicatorProps {
  count: number
  users?: string[]
  open: boolean
  onToggle: () => void
  onClose: () => void
}

export function OnlineIndicator({
  count,
  users,
  open,
  onToggle,
  onClose,
}: OnlineIndicatorProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, onClose])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={onToggle}
        className="text-dim flex h-[34px] cursor-pointer items-center gap-1.5 rounded-md border border-white/[0.13] px-3 text-sm transition-colors hover:bg-white/5"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
        <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-emerald-500 px-1.5 py-0.5 text-xs leading-none font-semibold text-white">
          {count}
        </span>
      </button>

      {open && (
        <div className="border-border-subtle bg-surface-page absolute top-full right-0 z-50 mt-2 w-48 overflow-hidden rounded-lg border shadow-lg">
          <div className="border-border-subtle border-b px-3 py-2 text-xs font-semibold tracking-wider uppercase opacity-60">
            Online
          </div>
          <ul className="max-h-60 overflow-y-auto py-1">
            {users && users.length > 0 ? (
              users.map((u) => (
                <li
                  key={u}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm"
                >
                  <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                  {u}
                </li>
              ))
            ) : (
              <li className="text-dim px-3 py-1.5 text-sm">Loading...</li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
