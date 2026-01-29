import React from 'react'
import { View, Text, StyleSheet, ScrollView, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { reclamacaoService, Reclamacao } from '../src/services/reclamacaoService'
import { unidadeService } from '../src/services/unidadeService'
import HeaderWithMenu from '../src/components/HeaderWithMenu'
import Button from '../src/components/Button'
import { useUsuario } from '../src/hooks/useUsuario'
import { Ionicons } from '@expo/vector-icons'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function NotificacoesScreen() {
  const queryClient = useQueryClient()
  const { usuario } = useUsuario()

  const isAdmin = usuario?.perfil === 'ADMIN'
  const unidadeId = usuario?.unidadeId

  const { data: reclamacoes = [], isLoading } = useQuery<Reclamacao[]>({
    queryKey: ['reclamacoes', isAdmin ? 'todas' : 'unidade', unidadeId],
    queryFn: () => {
      if (isAdmin) {
        return reclamacaoService.listarTodas()
      } else if (unidadeId) {
        return reclamacaoService.listarPorUnidade(unidadeId)
      }
      return Promise.resolve([])
    },
    enabled: isAdmin || !!unidadeId,
  })

  const { data: contador = 0 } = useQuery({
    queryKey: ['reclamacoes', 'contador', isAdmin ? 'todas' : 'unidade', unidadeId],
    queryFn: () => {
      if (isAdmin) {
        return reclamacaoService.contarNaoLidas()
      } else if (unidadeId) {
        return reclamacaoService.contarNaoLidasPorUnidade(unidadeId)
      }
      return Promise.resolve(0)
    },
    enabled: isAdmin || !!unidadeId,
    refetchInterval: 30000,
  })

  const { data: unidades = [] } = useQuery({
    queryKey: ['unidades'],
    queryFn: unidadeService.listarTodos,
    enabled: isAdmin,
  })

  const marcarComoLidaMutation = useMutation({
    mutationFn: reclamacaoService.marcarComoLida,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reclamacoes'] })
    },
  })

  const reclamacoesNaoLidas = reclamacoes.filter((r) => !r.lida)
  const reclamacoesLidas = reclamacoes.filter((r) => r.lida)

  const renderReclamacao = ({ item }: { item: Reclamacao }) => {
    const unidade = unidades.find((u) => u.id === item.unidadeId)
    const isLida = item.lida || false

    return (
      <View
        style={[
          styles.reclamacaoCard,
          isLida && styles.reclamacaoCardLida,
          !isLida && styles.reclamacaoCardNaoLida,
        ]}
      >
        {unidade && (
          <View style={styles.unidadeBadge}>
            <Text style={styles.unidadeBadgeText}>{unidade.nome}</Text>
          </View>
        )}
        <Text style={styles.mensagem}>{item.mensagem}</Text>
        <View style={styles.footer}>
          <Text style={styles.data}>
            {item.dataCriacao &&
              format(new Date(item.dataCriacao), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", {
                locale: ptBR,
              })}
          </Text>
          {!isLida && (
            <Button
              variant="secondary"
              size="sm"
              onPress={() => item.id && marcarComoLidaMutation.mutate(item.id)}
              isLoading={marcarComoLidaMutation.isPending}
            >
              <Ionicons name="checkmark" size={16} color="#2563EB" style={{ marginRight: 4 }} />
              Marcar como lida
            </Button>
          )}
          {isLida && item.dataLeitura && (
            <Text style={styles.dataLeitura}>
              Lida em{' '}
              {format(new Date(item.dataLeitura), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", {
                locale: ptBR,
              })}
            </Text>
          )}
        </View>
      </View>
    )
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <HeaderWithMenu title="Notificações" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <HeaderWithMenu title="Notificações" />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="notifications" size={32} color="#2563EB" />
          </View>
          <Text style={styles.subtitle}>
            {contador > 0
              ? `${contador} reclamação${contador > 1 ? 'ões' : ''} não lida${contador > 1 ? 's' : ''}`
              : 'Nenhuma reclamação pendente'}
          </Text>
        </View>

        {reclamacoesNaoLidas.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="alert-circle" size={20} color="#DC2626" />
              <Text style={styles.sectionTitle}>Não Lidas ({reclamacoesNaoLidas.length})</Text>
            </View>
            <FlatList
              data={reclamacoesNaoLidas}
              renderItem={renderReclamacao}
              keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
              scrollEnabled={false}
            />
          </View>
        )}

        {reclamacoesLidas.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={styles.sectionTitle}>Lidas ({reclamacoesLidas.length})</Text>
            </View>
            <FlatList
              data={reclamacoesLidas}
              renderItem={renderReclamacao}
              keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
              scrollEnabled={false}
            />
          </View>
        )}

        {reclamacoes.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-outline" size={48} color="#9CA3AF" />
            <Text style={styles.emptyText}>Nenhuma reclamação encontrada</Text>
          </View>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    backgroundColor: '#DBEAFE',
    borderRadius: 50,
    padding: 16,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  reclamacaoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  reclamacaoCardNaoLida: {
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
  },
  reclamacaoCardLida: {
    borderLeftWidth: 4,
    borderLeftColor: '#D1D5DB',
    opacity: 0.75,
  },
  unidadeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 8,
  },
  unidadeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E40AF',
  },
  mensagem: {
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 12,
    lineHeight: 24,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  data: {
    fontSize: 12,
    color: '#6B7280',
    flex: 1,
  },
  dataLeitura: {
    fontSize: 12,
    color: '#6B7280',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
  },
})
