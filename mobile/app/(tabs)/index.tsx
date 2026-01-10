import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { agendamentoService } from '../../src/services/agendamentoService'
import { authService } from '../../src/services/authService'
import Button from '../../src/components/Button'
import HeaderWithMenu from '../../src/components/HeaderWithMenu'
import { router } from 'expo-router'

export default function Dashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const authenticated = await authService.isAuthenticated()
    setIsAuthenticated(authenticated)
  }

  const { data: agendamentos, isLoading, error } = useQuery({
    queryKey: ['agendamentos', 'hoje'],
    queryFn: () => agendamentoService.listar({ dataInicio: new Date().toISOString().split('T')[0] }),
    retry: false,
    enabled: isAuthenticated, // Só executa se autenticado
  })

  return (
    <View style={styles.container}>
      <HeaderWithMenu title="Dashboard" />
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
        
        {isLoading ? (
          <Text>Carregando...</Text>
        ) : (
          <View style={styles.stats}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{agendamentos?.length || 0}</Text>
              <Text style={styles.statLabel}>Agendamentos Hoje</Text>
            </View>
          </View>
        )}

        <Button
          onPress={() => router.push('/agendamentos/novo')}
          style={styles.button}
        >
          Novo Agendamento
        </Button>
      </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#111827',
  },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    minWidth: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  button: {
    marginTop: 16,
  },
})
