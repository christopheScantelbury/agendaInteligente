import { useState } from 'react'
import ConfirmDialog from '../components/ConfirmDialog'

interface ConfirmOptions {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
  onConfirm: () => void
}

export function useConfirm() {
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean
    options: ConfirmOptions | null
  }>({
    isOpen: false,
    options: null,
  })

  const confirm = (options: ConfirmOptions) => {
    setConfirmState({
      isOpen: true,
      options,
    })
  }

  const handleConfirm = () => {
    if (confirmState.options) {
      confirmState.options.onConfirm()
      setConfirmState({ isOpen: false, options: null })
    }
  }

  const handleCancel = () => {
    setConfirmState({ isOpen: false, options: null })
  }

  const getConfirmComponent = () => {
    if (!confirmState.options) return null
    
    return (
      <ConfirmDialog
        isOpen={confirmState.isOpen}
        title={confirmState.options.title || 'Confirmar'}
        message={confirmState.options.message}
        confirmText={confirmState.options.confirmText}
        cancelText={confirmState.options.cancelText}
        variant={confirmState.options.variant}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    )
  }

  return { confirm, ConfirmComponent: getConfirmComponent() }
}



