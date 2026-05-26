import { Stack } from 'expo-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useRouter, useSegments } from 'expo-router'
import { authService } from '../src/services/authService'
import { clienteAuthService } from '../src/services/clienteAuthService'
import { View, ActivityIndicator, StyleSheet } from 'react-native'
import { DrawerProvider } from '../src/contexts/DrawerContext'
import { GestureHandlerRootView } from 'react-native-gesture-handler'

const queryClient = new QueryClient()

export default function RootLayout() {
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const router = useRouter()
  const segments = useSegments()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const segRoot = segments[0] ?? ''
      // Rota cliente tem seu próprio guard em (cliente)/_layout.tsx — não interferir
      if (segRoot === '(cliente)') {
        setIsCheckingAuth(false)
        return
      }

      const adminAuth = await authService.isAuthenticated()
      const clienteAuth = await clienteAuthService.isAuthenticated()

      // Default app: cliente final (público de massa do mobile)
      if (!adminAuth && !clienteAuth) {
        router.replace('/(cliente)/login')
      } else if (clienteAuth && !adminAuth) {
        router.replace('/(cliente)/home')
      } else if (adminAuth && segRoot === 'login') {
        router.replace('/(tabs)')
      }
    } catch (error) {
      router.replace('/(cliente)/login')
    } finally {
      setIsCheckingAuth(false)
    }
  }

  if (isCheckingAuth) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    )
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <DrawerProvider>
        <QueryClientProvider client={queryClient}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(cliente)" />
            <Stack.Screen name="login" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="clientes/[id]" />
            <Stack.Screen name="clientes/novo" />
            <Stack.Screen name="agendamentos/novo" />
            <Stack.Screen name="empresas/novo" />
            <Stack.Screen name="perfis/novo" />
          </Stack>
        </QueryClientProvider>
      </DrawerProvider>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
})
