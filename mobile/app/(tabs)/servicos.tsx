import React, { useState, useMemo } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { servicoService, Servico } from '../../src/services/servicoService'
import Button from '../../src/components/Button'
import HeaderWithMenu from '../../src/components/HeaderWithMenu'
import FilterBar from '../../src/components/FilterBar'

export default function Servicos() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState<{ ativo?: string }>({})
  
  const { data: servicos = [], isLoading } = useQuery({
    queryKey: ['servicos'],
    queryFn: servicoService.listarTodos,
  })

  const servicosFiltrados = useMemo(() => {
    let filtered = [...servicos]

    // Filtro de busca
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (s) =>
          s.nome.toLowerCase().includes(term) ||
          s.descricao?.toLowerCase().includes(term)
      )
    }

    // Filtro de status
    if (filters.ativo !== undefined && filters.ativo !== '') {
      const isAtivo = filters.ativo === 'true'
      filtered = filtered.filter((s) => (s.ativo ?? true) === isAtivo)
    }

    return filtered
  }, [servicos, searchTerm, filters])

  const renderItem = ({ item }: { item: Servico }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => router.push(`/servicos/${item.id}`)}
    >
      <Text style={styles.cardTitle}>{item.nome}</Text>
      {item.descricao && <Text style={styles.cardDescription}>{item.descricao}</Text>}
      <View style={styles.cardFooter}>
        <Text style={styles.cardValue}>R$ {item.valor.toFixed(2)}</Text>
        <Text style={styles.cardDuration}>{item.duracaoMinutos} min</Text>
      </View>
    </TouchableOpacity>
  )

  return (
    <View style={styles.container}>
      <HeaderWithMenu title="Serviços" />
      <View style={styles.header}>
        <Button size="sm" onPress={() => router.push('/servicos/novo')}>
          + Novo
        </Button>
      </View>

      <FilterBar
        onSearchChange={setSearchTerm}
        onFilterChange={setFilters}
        searchPlaceholder="Buscar por nome ou descrição..."
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
        ]}
      />

      {isLoading ? (
        <Text style={styles.loading}>Carregando...</Text>
      ) : (
        <FlatList
          data={servicosFiltrados}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {searchTerm || Object.values(filters).some(v => v !== '' && v !== undefined)
                ? 'Nenhum serviço encontrado com os filtros aplicados'
                : 'Nenhum serviço encontrado'}
            </Text>
          }
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  list: {
    padding: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  cardDuration: {
    fontSize: 14,
    color: '#6b7280',
  },
  loading: {
    textAlign: 'center',
    marginTop: 32,
    color: '#6b7280',
  },
  empty: {
    textAlign: 'center',
    marginTop: 32,
    color: '#6b7280',
    fontSize: 16,
  },
})
