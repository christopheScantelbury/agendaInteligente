import { Stack } from 'expo-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useRouter, useSegments } from 'expo-router'
import { authService } from '../src/services/authService'
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
      const authenticated = await authService.isAuthenticated()
      if (authenticated) {
        if (segments[0] === 'login') {
          router.replace('/(tabs)')
        }
      } else {
        if (segments[0] !== 'login') {
          router.replace('/login')
        }
      }
    } catch (error) {
      router.replace('/login')
    } finally {
      setIsCheckingAuth(false)
    }
  }

  if (isCheckingAuth) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    )
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <DrawerProvider>
        <QueryClientProvider client={queryClient}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="login" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="clientes/[id]" />
            <Stack.Screen name="clientes/novo" />
            <Stack.Screen name="agendamentos/novo" />
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
