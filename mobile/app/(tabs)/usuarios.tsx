import React, { useEffect, useState, useMemo } from 'react'
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { usuarioService, Usuario } from '../../src/services/usuarioService'
import { authService } from '../../src/services/authService'
import { perfilService } from '../../src/services/perfilService'
import Button from '../../src/components/Button'
import FilterBar from '../../src/components/FilterBar'
import HeaderWithMenu from '../../src/components/HeaderWithMenu'

export default function UsuariosScreen() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState<{ ativo?: string; perfil?: string }>({})

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

  const { data: perfis = [] } = useQuery({
    queryKey: ['perfis', 'ativos'],
    queryFn: () => perfilService.listarAtivos(),
    enabled: isAuthenticated,
  })

  // Filtrar usuários
  const usuariosFiltrados = useMemo(() => {
    let filtered = [...usuarios]

    // Filtro de busca
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (u) =>
          u.nome.toLowerCase().includes(term) ||
          u.email.toLowerCase().includes(term) ||
          (u.nomeUnidade && u.nomeUnidade.toLowerCase().includes(term))
      )
    }

    // Filtro de status
    if (filters.ativo !== undefined && filters.ativo !== '') {
      const isAtivo = filters.ativo === 'true'
      filtered = filtered.filter((u) => (u.ativo ?? true) === isAtivo)
    }

    // Filtro de perfil (nome do perfil vindo do banco)
    if (filters.perfil && filters.perfil !== '') {
      filtered = filtered.filter((u) => u.perfil === filters.perfil)
    }

    return filtered
  }, [usuarios, searchTerm, filters])

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
    const p = (perfil || '').toUpperCase()
    if (p === 'ADMIN') return '#DC2626'
    if (p === 'GERENTE') return '#2563EB'
    if (p.includes('PROFISSIONAL') || p.includes('ATENDENTE')) return '#059669'
    return '#6B7280'
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

  const perfilOptions = useMemo(
    () => perfis.map((p) => ({ value: p.nome, label: p.descricao || p.nome })),
    [perfis]
  )

  return (
    <View style={styles.container}>
      <HeaderWithMenu title="Usuários" />
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
      <FilterBar
        onSearchChange={setSearchTerm}
        onFilterChange={setFilters}
        searchPlaceholder="Buscar por nome, email ou unidade..."
        filters={[
          {
            key: 'ativo',
            label: 'Status',
            type: 'select',
            options: [
              { value: 'true', label: 'Ativos' },
              { value: 'false', label: 'Inativos' },
            ],
          },
          {
            key: 'perfil',
            label: 'Perfil',
            type: 'select',
            options: perfilOptions,
          },
        ]}
      />
      <FlatList
        data={usuariosFiltrados}
        keyExtractor={(item) => item.id?.toString() || item.email}
        renderItem={renderUsuarioItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchTerm || Object.values(filters).some(v => v !== '' && v !== undefined)
                ? 'Nenhum usuário encontrado com os filtros aplicados'
                : 'Nenhum usuário encontrado'}
            </Text>
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
