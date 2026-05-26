import { Stack, useRouter, useSegments } from 'expo-router'
import { useEffect, useState } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { clienteAuthService } from '../../src/services/clienteAuthService'
import { usePushNotifications } from '../../src/hooks/usePushNotifications'
import { colors } from '../../src/theme'

const ROTAS_PUBLICAS = new Set(['login', 'cadastro'])

export default function ClienteLayout() {
  const [verificando, setVerificando] = useState(true)
  const [autenticado, setAutenticado] = useState(false)
  const router = useRouter()
  const segments = useSegments()

  // Push notifications — registra token quando cliente autenticado
  usePushNotifications(autenticado)

  useEffect(() => {
    void verificarAuth()
  }, [segments.join('/')])

  async function verificarAuth() {
    const auth = await clienteAuthService.isAuthenticated()
    setAutenticado(auth)
    const rotaAtual = segments[segments.length - 1] ?? ''
    if (!auth && !ROTAS_PUBLICAS.has(rotaAtual)) {
      router.replace('/(cliente)/login')
    }
    setVerificando(false)
  }

  if (verificando) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.violet} />
      </View>
    )
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="cadastro" />
      <Stack.Screen name="home" />
      <Stack.Screen name="agendar" />
      <Stack.Screen name="meus-agendamentos" />
      <Stack.Screen name="perfil" />
    </Stack>
  )
}
