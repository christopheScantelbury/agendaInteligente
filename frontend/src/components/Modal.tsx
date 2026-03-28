import { ReactNode, useEffect, useRef } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  headerContent?: ReactNode
  headerClassName?: string
  panelClassName?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showCloseButton?: boolean
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}

let modalIdCounter = 0
let openModalsCount = 0
const modalStack: number[] = []

export default function Modal({
  isOpen,
  onClose,
  title,
  headerContent,
  headerClassName,
  panelClassName,
  children,
  size = 'md',
  showCloseButton = true,
}: ModalProps) {
  const modalIdRef = useRef<number>(0)
  if (modalIdRef.current === 0) {
    modalIdRef.current = ++modalIdCounter
  }

  useEffect(() => {
    if (!isOpen) return
    openModalsCount += 1
    document.body.style.overflow = 'hidden'
    modalStack.push(modalIdRef.current)
    return () => {
      openModalsCount = Math.max(0, openModalsCount - 1)
      const idx = modalStack.lastIndexOf(modalIdRef.current)
      if (idx >= 0) {
        modalStack.splice(idx, 1)
      }
      if (openModalsCount === 0) {
        document.body.style.overflow = 'unset'
      }
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      const topModalId = modalStack[modalStack.length - 1]
      if (topModalId !== modalIdRef.current) return
      e.preventDefault()
      e.stopPropagation()
      onClose()
    }

    document.addEventListener('keydown', handleEscape, true)
    return () => {
      document.removeEventListener('keydown', handleEscape, true)
    }
  }, [isOpen, onClose])

  const closeIfTopMost = () => {
    const topModalId = modalStack[modalStack.length - 1]
    if (topModalId === modalIdRef.current) {
      onClose()
    }
  }

  useEffect(() => {
    return () => {
      if (openModalsCount === 0) {
        document.body.style.overflow = 'unset'
      }
    }
  }, [])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4"
      onClick={(e) => {
        // Bloqueia todos os cliques no backdrop
        if (e.target === e.currentTarget) {
          closeIfTopMost()
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
      aria-labelledby="modal-title"
      style={{ pointerEvents: 'auto' }}
    >
      <div
        className={`bg-white rounded-lg shadow-xl w-full ${sizeClasses[size]} max-h-[90vh] overflow-hidden flex flex-col ${panelClassName || ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`flex items-center justify-between border-b border-slate-200 px-4 py-3 ${headerClassName || ''}`}>
          {headerContent ? (
            <>
              <h2 id="modal-title" className="sr-only">
                {title}
              </h2>
              <div className="min-w-0 flex-1">{headerContent}</div>
            </>
          ) : (
            <h2 id="modal-title" className="text-lg font-semibold text-slate-900">
              {title}
            </h2>
          )}
          {showCloseButton && (
            <button
              onClick={closeIfTopMost}
              className="ml-3 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Fechar modal"
            >
              <X className="h-6 w-6" />
            </button>
          )}
        </div>
        <div className="overflow-y-auto p-6 flex-1">{children}</div>
      </div>
    </div>
  )
}
