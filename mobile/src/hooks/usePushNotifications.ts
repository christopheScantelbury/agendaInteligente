import { useEffect, useRef } from 'react'
import { Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import Constants from 'expo-constants'
import { clienteAuthService } from '../services/clienteAuthService'

/**
 * Registra push token do dispositivo no backend.
 * Chamar uma vez por sessão após o cliente estar autenticado.
 *
 * Pré-requisitos pra funcionar de verdade:
 * 1. expo-notifications + expo-device instalados (já no package.json)
 * 2. app.json com expo.extra.eas.projectId real
 * 3. Credenciais FCM/APNs configuradas no Expo dashboard
 * 4. Build EAS (não funciona em Expo Go padrão pra remote push)
 *
 * Sem (2)-(4), o hook não quebra — só pula com warning no console.
 */

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

export function usePushNotifications(clienteAutenticado: boolean) {
  const registeredRef = useRef(false)

  useEffect(() => {
    if (!clienteAutenticado || registeredRef.current) return
    registeredRef.current = true
    void registrarToken()
  }, [clienteAutenticado])

  async function registrarToken() {
    if (!Device.isDevice) {
      console.log('[push] simulator/web — pulando registro')
      return
    }
    try {
      let perm: any = await Notifications.getPermissionsAsync()
      const isGranted = (p: any) => p?.granted === true || p?.status === 'granted'
      if (!isGranted(perm)) {
        perm = await Notifications.requestPermissionsAsync()
      }
      if (!isGranted(perm)) {
        console.log('[push] permissão negada pelo usuário')
        return
      }

      const projectId = (Constants?.expoConfig as any)?.extra?.eas?.projectId
        ?? (Constants as any)?.easConfig?.projectId
      if (!projectId) {
        console.warn('[push] expo.extra.eas.projectId não configurado em app.json — token não pode ser obtido')
        return
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({ projectId })
      const token = tokenData.data
      if (!token) return

      // Envia ao backend (idempotente)
      await clienteAuthService.api.post('/publico/clientes/push-token', {
        token,
        plataforma: Platform.OS, // 'ios' | 'android'
        deviceInfo: `${Device.brand ?? 'unknown'} ${Device.modelName ?? ''} (${Device.osName} ${Device.osVersion})`.trim(),
      })
      console.log('[push] token registrado:', token.substring(0, 30) + '...')
    } catch (err: any) {
      console.warn('[push] falha ao registrar:', err?.message ?? err)
    }
  }
}
