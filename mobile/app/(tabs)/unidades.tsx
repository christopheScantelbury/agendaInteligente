import React, { useEffect, useState, useMemo } from 'react'
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert, TouchableOpacity, Image } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { unidadeService, Unidade } from '../../src/services/unidadeService'
import { empresaService } from '../../src/services/empresaService'
import { authService } from '../../src/services/authService'
import Button from '../../src/components/Button'
import FilterBar from '../../src/components/FilterBar'

export default function UnidadesScreen() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState<{ ativo?: string; empresaId?: string }>({})

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const authenticated = await authService.isAuthenticated()
    setIsAuthenticated(authenticated)
  }

  const { data: unidades = [], isLoading, error } = useQuery<Unidade[]>({
    queryKey: ['unidades'],
    queryFn: unidadeService.listarTodos,
    retry: false,
    enabled: isAuthenticated,
  })

  const { data: empresas = [] } = useQuery({
    queryKey: ['empresas'],
    queryFn: empresaService.listarTodos,
    enabled: isAuthenticated,
  })

  // Filtrar unidades
  const unidadesFiltradas = useMemo(() => {
    let filtered = [...unidades]

    // Filtro de busca
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (u) =>
          u.nome.toLowerCase().includes(term) ||
          u.descricao?.toLowerCase().includes(term) ||
          u.cidade?.toLowerCase().includes(term) ||
          u.telefone?.includes(term)
      )
    }

    // Filtro de status
    if (filters.ativo !== undefined && filters.ativo !== '') {
      const isAtivo = filters.ativo === 'true'
      filtered = filtered.filter((u) => (u.ativo ?? true) === isAtivo)
    }

    // Filtro de empresa
    if (filters.empresaId && filters.empresaId !== '') {
      filtered = filtered.filter((u) => u.empresaId === parseInt(filters.empresaId!))
    }

    return filtered
  }, [unidades, searchTerm, filters])

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Carregando unidades...</Text>
      </View>
    )
  }

  if (error) {
    Alert.alert('Erro', 'Não foi possível carregar as unidades.')
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Erro ao carregar unidades.</Text>
      </View>
    )
  }

  const renderUnidadeItem = ({ item }: { item: Unidade }) => {
    return (
    <TouchableOpacity
      style={styles.unidadeCard}
      onPress={() => router.push(`/unidades/novo?id=${item.id}`)}
    >
      <View style={styles.cardHeader}>
        {item.logo && (
          <Image source={{ uri: item.logo }} style={styles.logo} />
        )}
        <View style={styles.cardHeaderText}>
          <Text style={styles.unidadeName}>{item.nome}</Text>
          {item.descricao && <Text style={styles.unidadeDescription}>{item.descricao}</Text>}
        </View>
      </View>
      {item.endereco && (
        <Text style={styles.unidadeDetail}>
          {item.endereco}
          {item.numero && `, ${item.numero}`}
          {item.bairro && ` - ${item.bairro}`}
        </Text>
      )}
      {item.cidade && item.uf && (
        <Text style={styles.unidadeDetail}>{item.cidade} - {item.uf}</Text>
      )}
      {item.telefone && <Text style={styles.unidadeDetail}>Tel: {item.telefone}</Text>}
      {item.email && <Text style={styles.unidadeDetail}>Email: {item.email}</Text>}
      <View style={styles.statusContainer}>
        <Text style={[styles.statusBadge, item.ativo ? styles.statusActive : styles.statusInactive]}>
          {item.ativo ? 'Ativa' : 'Inativa'}
        </Text>
      </View>
    </TouchableOpacity>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Unidades</Text>
        <Button
          size="sm"
          onPress={() => {
            router.push('/unidades/novo')
          }}
        >
          + Nova
        </Button>
      </View>
      <FilterBar
        onSearchChange={setSearchTerm}
        onFilterChange={setFilters}
        searchPlaceholder="Buscar por nome, descrição, cidade ou telefone..."
        filters={[
          {
            key: 'ativo',
            label: 'Status',
            type: 'select',
            options: [
              { value: 'true', label: 'Ativas' },
              { value: 'false', label: 'Inativas' },
            ],
          },
          ...(empresas.length > 0
            ? [
                {
                  key: 'empresaId',
                  label: 'Empresa',
                  type: 'select' as const,
                  options: (empresas as Array<{ id?: number; nome: string }>).map((e) => ({
                    value: e.id?.toString() || '',
                    label: e.nome,
                  })),
                },
              ]
            : []),
        ]}
      />
      <FlatList
        data={unidadesFiltradas}
        keyExtractor={(item) => item.id?.toString() || item.nome}
        renderItem={renderUnidadeItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchTerm || Object.values(filters).some(v => v !== '' && v !== undefined)
                ? 'Nenhuma unidade encontrada com os filtros aplicados'
                : 'Nenhuma unidade encontrada'}
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
  unidadeCard: {
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  logo: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardHeaderText: {
    flex: 1,
  },
  unidadeName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  unidadeDescription: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 8,
  },
  unidadeDetail: {
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
