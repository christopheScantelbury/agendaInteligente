import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert, TouchableOpacity } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { perfilService, Perfil } from '../../src/services/perfilService'
import { authService } from '../../src/services/authService'
import Button from '../../src/components/Button'
import HeaderWithMenu from '../../src/components/HeaderWithMenu'
import { Ionicons } from '@expo/vector-icons'

export default function PerfisScreen() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const authenticated = await authService.isAuthenticated()
    setIsAuthenticated(authenticated)
  }

  const { data: perfis = [], isLoading, error } = useQuery<Perfil[]>({
    queryKey: ['perfis'],
    queryFn: perfilService.listarTodos,
    retry: false,
    enabled: isAuthenticated,
  })

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Carregando perfis...</Text>
      </View>
    )
  }

  if (error) {
    Alert.alert('Erro', 'Não foi possível carregar os perfis.')
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Erro ao carregar perfis.</Text>
      </View>
    )
  }

  const renderPerfilItem = ({ item }: { item: Perfil }) => (
    <TouchableOpacity
      style={styles.perfilCard}
      onPress={() => router.push(`/perfis/novo?id=${item.id}` as any)}
      disabled={item.sistema}
    >
      <View style={styles.cardContent}>
        {item.sistema ? (
          <Ionicons name="lock-closed" size={24} color="#9CA3AF" style={styles.icon} />
        ) : (
          <Ionicons name="shield" size={24} color="#2563EB" style={styles.icon} />
        )}
        <View style={styles.textContainer}>
          <View style={styles.titleRow}>
            <Text style={styles.perfilName}>{item.nome}</Text>
            {item.sistema && (
              <View style={styles.sistemaBadge}>
                <Text style={styles.sistemaBadgeText}>Sistema</Text>
              </View>
            )}
          </View>
          {item.descricao && <Text style={styles.perfilDetail}>{item.descricao}</Text>}
          {item.permissoesMenu && item.permissoesMenu.length > 0 && (
            <Text style={styles.perfilDetail}>
              {item.permissoesMenu.length} menu(s) permitido(s)
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  )

  return (
    <View style={styles.container}>
      <HeaderWithMenu title="Perfis e Permissões" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Perfis</Text>
        <Button
          size="sm"
          onPress={() => {
            router.push('/perfis/novo' as any)
          }}
        >
          + Novo
        </Button>
      </View>
      <FlatList
        data={perfis}
        keyExtractor={(item) => item.id?.toString() || item.nome}
        renderItem={renderPerfilItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Nenhum perfil encontrado</Text>
          </View>
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#4B5563',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#DC2626',
  },
  listContent: {
    padding: 16,
  },
  perfilCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  perfilName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginRight: 8,
  },
  sistemaBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sistemaBadgeText: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '600',
  },
  perfilDetail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
  },
})
