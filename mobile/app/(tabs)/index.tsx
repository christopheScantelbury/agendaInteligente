import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { agendamentoService } from '../../src/services/agendamentoService'
import { authService } from '../../src/services/authService'
import { reclamacaoService } from '../../src/services/reclamacaoService'
import Button from '../../src/components/Button'
import HeaderWithMenu from '../../src/components/HeaderWithMenu'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

export default function Dashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const authenticated = await authService.isAuthenticated()
    setIsAuthenticated(authenticated)
  }

  const usuario = authService.getUsuario()
  const isAdmin = usuario?.perfil === 'ADMIN'
  const isGerente = usuario?.perfil === 'GERENTE'
  const podeVerReclamacoes = isAdmin || isGerente
  const unidadeId = usuario?.unidadeId

  const { data: agendamentos, isLoading, error } = useQuery({
    queryKey: ['agendamentos', 'hoje'],
    queryFn: () => agendamentoService.listar({ dataInicio: new Date().toISOString().split('T')[0] }),
    retry: false,
    enabled: isAuthenticated, // Só executa se autenticado
  })

  const { data: contadorReclamacoes = 0 } = useQuery({
    queryKey: ['reclamacoes', 'contador', isAdmin ? 'todas' : 'unidade', unidadeId],
    queryFn: async () => {
      if (isAdmin) {
        return await reclamacaoService.contarNaoLidas()
      } else if (isGerente && unidadeId) {
        return await reclamacaoService.contarNaoLidasPorUnidade(unidadeId)
      }
      return 0
    },
    enabled: podeVerReclamacoes && isAuthenticated,
    refetchInterval: 30000,
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
            
            {podeVerReclamacoes && (
              <TouchableOpacity
                style={[styles.statCard, contadorReclamacoes > 0 && styles.statCardAlert]}
                onPress={() => router.push('/notificacoes')}
              >
                <View style={styles.statCardHeader}>
                  <Ionicons
                    name="notifications"
                    size={24}
                    color={contadorReclamacoes > 0 ? '#DC2626' : '#2563EB'}
                  />
                  {contadorReclamacoes > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        {contadorReclamacoes > 99 ? '99+' : contadorReclamacoes}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.statNumber, contadorReclamacoes > 0 && styles.statNumberAlert]}>
                  {contadorReclamacoes > 0 ? contadorReclamacoes : 'Nenhuma'}
                </Text>
                <Text style={styles.statLabel}>Reclamações</Text>
                {contadorReclamacoes > 0 && (
                  <Text style={styles.alertText}>Clique para ver detalhes</Text>
                )}
              </TouchableOpacity>
            )}
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
  statCardAlert: {
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
  },
  statCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  badge: {
    backgroundColor: '#DC2626',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  statNumberAlert: {
    color: '#DC2626',
  },
  alertText: {
    fontSize: 10,
    color: '#DC2626',
    marginTop: 4,
    fontWeight: '600',
  },
})
