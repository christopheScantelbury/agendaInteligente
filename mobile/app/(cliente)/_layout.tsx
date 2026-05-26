import { Stack, useRouter, useSegments } from 'expo-router'
import { useEffect, useState } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { clienteAuthService } from '../../src/services/clienteAuthService'
import { colors } from '../../src/theme'

const ROTAS_PUBLICAS = new Set(['login', 'cadastro'])

export default function ClienteLayout() {
  const [verificando, setVerificando] = useState(true)
  const router = useRouter()
  const segments = useSegments()

  useEffect(() => {
    void verificarAuth()
  }, [segments.join('/')])

  async function verificarAuth() {
    const autenticado = await clienteAuthService.isAuthenticated()
    const rotaAtual = segments[segments.length - 1] ?? ''
    if (!autenticado && !ROTAS_PUBLICAS.has(rotaAtual)) {
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
