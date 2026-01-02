import { useNotification } from '../contexts/NotificationContext'
import { X, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react'
import { useEffect, useRef } from 'react'

export default function NotificationContainer() {
  const { notifications, removeNotification } = useNotification()
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (notifications.length > 0 && containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [notifications.length])

  if (notifications.length === 0) return null

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5" />
      case 'error':
        return <XCircle className="h-5 w-5" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5" />
      case 'info':
        return <Info className="h-5 w-5" />
      default:
        return <Info className="h-5 w-5" />
    }
  }

  const getStyles = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800'
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800'
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800'
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800'
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800'
    }
  }

  return (
    <div
      ref={containerRef}
      className="fixed top-0 left-0 right-0 z-[99999] px-4 pt-4 pointer-events-none"
      style={{ position: 'fixed', zIndex: 99999 }}
    >
      <div className="max-w-7xl mx-auto space-y-2">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`
              pointer-events-auto
              border rounded-lg shadow-2xl p-4
              flex items-start gap-3
              animate-in slide-in-from-top-5
              ${getStyles(notification.type)}
            `}
            style={{ zIndex: 99999 }}
          >
            <div className="flex-shrink-0 mt-0.5">
              {getIcon(notification.type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium break-words">{notification.message}</p>
            </div>
            <button
              onClick={() => removeNotification(notification.id)}
              className="flex-shrink-0 text-current opacity-70 hover:opacity-100 transition-opacity"
              aria-label="Fechar notificação"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

