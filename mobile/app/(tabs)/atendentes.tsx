import React, { useEffect, useState, useMemo } from 'react'
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { atendenteService, Atendente } from '../../src/services/atendenteService'
import { unidadeService } from '../../src/services/unidadeService'
import { authService } from '../../src/services/authService'
import Button from '../../src/components/Button'
import FilterBar from '../../src/components/FilterBar'

export default function AtendentesScreen() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState<{ ativo?: string; unidadeId?: string }>({})

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const authenticated = await authService.isAuthenticated()
    setIsAuthenticated(authenticated)
  }

  const { data: atendentes = [], isLoading, error } = useQuery<Atendente[]>({
    queryKey: ['atendentes'],
    queryFn: atendenteService.listarTodos,
    retry: false,
    enabled: isAuthenticated,
  })

  const { data: unidades = [] } = useQuery({
    queryKey: ['unidades'],
    queryFn: unidadeService.listarTodos,
    enabled: isAuthenticated,
  })

  // Filtrar atendentes
  const atendentesFiltrados = useMemo(() => {
    let filtered = [...atendentes]

    // Filtro de busca
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (a) =>
          a.nomeUsuario?.toLowerCase().includes(term) ||
          a.cpf?.includes(term) ||
          a.telefone?.includes(term) ||
          a.nomeUnidade?.toLowerCase().includes(term)
      )
    }

    // Filtro de status
    if (filters.ativo !== undefined && filters.ativo !== '') {
      const isAtivo = filters.ativo === 'true'
      filtered = filtered.filter((a) => (a.ativo ?? true) === isAtivo)
    }

    // Filtro de unidade
    if (filters.unidadeId && filters.unidadeId !== '') {
      filtered = filtered.filter((a) => a.unidadeId === parseInt(filters.unidadeId!))
    }

    return filtered
  }, [atendentes, searchTerm, filters])

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Carregando atendentes...</Text>
      </View>
    )
  }

  if (error) {
    Alert.alert('Erro', 'Não foi possível carregar os atendentes.')
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Erro ao carregar atendentes.</Text>
      </View>
    )
  }

  const renderAtendenteItem = ({ item }: { item: Atendente }) => (
    <View style={styles.atendenteCard}>
      <Text style={styles.atendenteName}>{item.nomeUsuario || 'Nome não informado'}</Text>
      <Text style={styles.atendenteDetail}>CPF: {item.cpf}</Text>
      {item.nomeUnidade && <Text style={styles.atendenteDetail}>Unidade: {item.nomeUnidade}</Text>}
      {item.telefone && <Text style={styles.atendenteDetail}>Telefone: {item.telefone}</Text>}
      {(item.percentualComissao !== undefined && item.percentualComissao !== null) && (
        <Text style={styles.atendenteDetail}>
          Comissão: {typeof item.percentualComissao === 'number' 
            ? item.percentualComissao.toFixed(2) 
            : parseFloat(String(item.percentualComissao)).toFixed(2)}%
        </Text>
      )}
      <View style={styles.statusContainer}>
        <Text style={[styles.statusBadge, item.ativo ? styles.statusActive : styles.statusInactive]}>
          {item.ativo ? 'Ativo' : 'Inativo'}
        </Text>
      </View>
    </View>
  )

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Atendentes</Text>
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
        searchPlaceholder="Buscar por nome, CPF, telefone ou unidade..."
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
          ...(unidades.length > 0
            ? [
                {
                  key: 'unidadeId',
                  label: 'Unidade',
                  type: 'select' as const,
                  options: unidades
                    .filter((u) => u.id !== undefined)
                    .map((u) => ({
                      value: u.id!.toString(),
                      label: u.nome,
                    })),
                },
              ]
            : []),
        ]}
      />
      <FlatList
        data={atendentesFiltrados}
        keyExtractor={(item) => item.id?.toString() || item.cpf}
        renderItem={renderAtendenteItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchTerm || Object.values(filters).some(v => v !== '' && v !== undefined)
                ? 'Nenhum atendente encontrado com os filtros aplicados'
                : 'Nenhum atendente encontrado'}
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
  atendenteCard: {
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
  atendenteName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  atendenteDetail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  statusContainer: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  statusBadge: {
    fontSize: 12,
    fontWeight: '600',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    alignSelf: 'flex-start',
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
