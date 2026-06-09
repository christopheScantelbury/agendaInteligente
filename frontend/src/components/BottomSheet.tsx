import { X } from 'lucide-react'
import { useEffect, ReactNode } from 'react'

interface Props {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  /** Footer fixo (botões de ação) */
  footer?: ReactNode
  /** Altura do sheet em mobile: 'full' (90vh) | 'auto' */
  size?: 'full' | 'auto'
}

/**
 * BottomSheet mobile-first:
 * - Mobile: sheet sobe de baixo, ocupa 90vh (size=full) ou auto
 * - Desktop (≥sm): vira modal centralizado max-w-lg
 *
 * Esc fecha. Backdrop tap fecha. Body scroll bloqueado enquanto aberto.
 */
export default function BottomSheet({ isOpen, onClose, title, children, footer, size = 'full' }: Props) {
  useEffect(() => {
    if (!isOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', handleEsc)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const heightClass = size === 'full' ? 'h-[90vh] sm:h-auto sm:max-h-[85vh]' : 'max-h-[85vh]'

  return (
    <div
      className="fixed inset-0 z-[120] bg-slate-900/50 flex items-end sm:items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-xl flex flex-col pb-[env(safe-area-inset-bottom)] sm:pb-0 ${heightClass}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle mobile */}
        <div className="sm:hidden flex justify-center pt-2 pb-1">
          <div className="h-1 w-10 rounded-full bg-slate-300" aria-hidden />
        </div>

        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 flex-shrink-0">
            <h3 className="text-base font-bold text-slate-900">{title}</h3>
            <button
              onClick={onClose}
              className="p-1 -m-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="border-t border-slate-100 px-5 py-3 bg-white flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
