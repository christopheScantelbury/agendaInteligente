import React, { createContext, useContext, useState, useCallback } from 'react'

export type NotificationType = 'success' | 'error' | 'warning' | 'info'

export interface Notification {
  id: string
  type: NotificationType
  message: string
  duration?: number
}

interface NotificationContextType {
  notifications: Notification[]
  showNotification: (type: NotificationType, message: string, duration?: number) => void
  removeNotification: (id: string) => void
  clearNotifications: () => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const showNotification = useCallback((type: NotificationType, message: string, duration = 5000) => {
    const id = Math.random().toString(36).substring(7)
    const notification: Notification = { id, type, message, duration }

    setNotifications((prev) => [...prev, notification])

    // Scroll para o topo quando houver nova notificação
    window.scrollTo({ top: 0, behavior: 'smooth' })

    // Remover automaticamente após a duração especificada
    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id)
      }, duration)
    }

    return id
  }, [])

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const clearNotifications = useCallback(() => {
    setNotifications([])
  }, [])

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        showNotification,
        removeNotification,
        clearNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotification() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotification deve ser usado dentro de NotificationProvider')
  }
  return context
}

