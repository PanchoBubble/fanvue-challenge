import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { EllipsisVertical, Pencil, Trash2 } from 'lucide-react'

interface ThreadMenuProps {
  onEdit: () => void
  onDelete: () => void
}

export function ThreadMenu({ onEdit, onDelete }: ThreadMenuProps) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-dim transition-colors hover:bg-white/10 hover:text-white md:opacity-0 md:group-hover:opacity-100"
        aria-label="Thread options"
      >
        <EllipsisVertical className="h-4 w-4" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-8 z-20 w-36 overflow-hidden rounded-lg border border-border-card bg-surface-card shadow-lg"
          >
            <button
              onClick={(e) => {
                e.stopPropagation()
                setOpen(false)
                onEdit()
              }}
              className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-sm text-dim transition-colors hover:bg-white/5 hover:text-white"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setOpen(false)
                onDelete()
              }}
              className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-sm text-red-400 transition-colors hover:bg-white/5 hover:text-red-300"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
