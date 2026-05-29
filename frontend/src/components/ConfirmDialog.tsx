import { X } from 'lucide-react'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
  variant?: 'danger' | 'warning' | 'info'
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
  variant = 'danger',
}: ConfirmDialogProps) {
  if (!isOpen) return null

  const getConfirmButtonStyles = () => {
    switch (variant) {
      case 'danger':
        return 'bg-red-600 hover:bg-red-700 text-white shadow-sm shadow-red-200'
      case 'warning':
        return 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm shadow-amber-200'
      case 'info':
        return 'bg-violet-600 hover:bg-violet-700 text-white shadow-sm shadow-violet-200'
      default:
        return 'bg-red-600 hover:bg-red-700 text-white shadow-sm shadow-red-200'
    }
  }

  return (
    <div
      className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-[100] p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onCancel()
        }
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          e.preventDefault()
        }
      }}
      role="dialog"
      aria-modal="true"
      style={{ pointerEvents: 'auto' }}
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-sm w-full border border-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3 mb-3">
            <h3 className="text-base font-bold text-slate-900">{title}</h3>
            <button
              onClick={onCancel}
              className="p-1 -m-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="text-sm text-slate-600 mb-5">{message}</p>
          <div className="flex justify-end gap-2">
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${getConfirmButtonStyles()}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
