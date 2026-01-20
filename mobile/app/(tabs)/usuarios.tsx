import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { usuarioService, Usuario } from '../../src/services/usuarioService'
import { authService } from '../../src/services/authService'
import Button from '../../src/components/Button'

export default function UsuariosScreen() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const authenticated = await authService.isAuthenticated()
    setIsAuthenticated(authenticated)
  }

  const { data: usuarios = [], isLoading, error } = useQuery<Usuario[]>({
    queryKey: ['usuarios'],
    queryFn: usuarioService.listar,
    retry: false,
    enabled: isAuthenticated,
  })

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Carregando usuários...</Text>
      </View>
    )
  }

  if (error) {
    Alert.alert('Erro', 'Não foi possível carregar os usuários.')
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Erro ao carregar usuários.</Text>
      </View>
    )
  }

  const getPerfilColor = (perfil: string): string => {
    switch (perfil) {
      case 'ADMIN':
        return '#DC2626'
      case 'GERENTE':
        return '#2563EB'
      case 'ATENDENTE':
        return '#059669'
      default:
        return '#6B7280'
    }
  }

  const renderUsuarioItem = ({ item }: { item: Usuario }) => (
    <View style={styles.usuarioCard}>
      <Text style={styles.usuarioName}>{item.nome}</Text>
      <Text style={styles.usuarioDetail}>Email: {item.email}</Text>
      {item.nomeUnidade && <Text style={styles.usuarioDetail}>Unidade: {item.nomeUnidade}</Text>}
      <View style={styles.statusContainer}>
        <View style={[styles.perfilBadge, { backgroundColor: getPerfilColor(item.perfil) }]}>
          <Text style={styles.perfilText}>{item.perfil}</Text>
        </View>
        <Text style={[styles.statusBadge, item.ativo ? styles.statusActive : styles.statusInactive]}>
          {item.ativo ? 'Ativo' : 'Inativo'}
        </Text>
      </View>
    </View>
  )

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Usuários</Text>
        <Button
          size="sm"
          onPress={() => {
            Alert.alert('Em desenvolvimento', 'Funcionalidade de cadastro em breve')
          }}
        >
          + Novo
        </Button>
      </View>
      <FlatList
        data={usuarios}
        keyExtractor={(item) => item.id?.toString() || item.email}
        renderItem={renderUsuarioItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Nenhum usuário encontrado</Text>
          </View>
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
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
  usuarioCard: {
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
  usuarioName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  usuarioDetail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  statusContainer: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  perfilBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  perfilText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statusBadge: {
    fontSize: 12,
    fontWeight: '600',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  statusActive: {
    backgroundColor: '#D1FAE5',
    color: '#065F46',
  },
  statusInactive: {
    backgroundColor: '#FEE2E2',
    color: '#991B1B',
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
