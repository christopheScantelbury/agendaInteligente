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

  const getButtonStyles = () => {
    switch (variant) {
      case 'danger':
        return 'bg-red-600 hover:bg-red-700 text-white'
      case 'warning':
        return 'bg-yellow-600 hover:bg-yellow-700 text-white'
      case 'info':
        return 'bg-blue-600 hover:bg-blue-700 text-white'
      default:
        return 'bg-red-600 hover:bg-red-700 text-white'
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]"
      onClick={(e) => {
        // Bloqueia cliques no backdrop - só fecha se clicar diretamente no backdrop
        if (e.target === e.currentTarget) {
          onCancel()
        }
      }}
      onMouseDown={(e) => {
        // Previne cliques que passam pelo backdrop
        if (e.target === e.currentTarget) {
          e.preventDefault()
        }
      }}
      role="dialog"
      aria-modal="true"
      style={{ pointerEvents: 'auto' }}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="text-gray-600 mb-6">{message}</p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className={`px-4 py-2 rounded-md transition-colors ${getButtonStyles()}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

