import React, { useState, useMemo } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { clienteService, Cliente } from '../../src/services/clienteService'
import Button from '../../src/components/Button'
import HeaderWithMenu from '../../src/components/HeaderWithMenu'
import FilterBar from '../../src/components/FilterBar'

export default function Clientes() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState<{ ativo?: string }>({})
  
  const { data: clientes = [], isLoading } = useQuery({
    queryKey: ['clientes'],
    queryFn: clienteService.listar,
  })

  // Filtrar clientes
  const clientesFiltrados = useMemo(() => {
    let filtered = [...clientes]

    // Filtro de busca
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (c) =>
          c.nome.toLowerCase().includes(term) ||
          c.cpfCnpj.includes(term) ||
          c.email?.toLowerCase().includes(term) ||
          c.telefone?.includes(term)
      )
    }

    // Filtro de status
    if (filters.ativo !== undefined && filters.ativo !== '') {
      const isAtivo = filters.ativo === 'true'
      filtered = filtered.filter((c) => (c.ativo ?? true) === isAtivo)
    }

    return filtered
  }, [clientes, searchTerm, filters])

  const renderItem = ({ item }: { item: Cliente }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => router.push(`/clientes/${item.id}`)}
    >
      <Text style={styles.cardTitle}>{item.nome}</Text>
      {item.email && <Text style={styles.cardText}>{item.email}</Text>}
      {item.telefone && <Text style={styles.cardText}>{item.telefone}</Text>}
      <Text style={styles.cardCpf}>{item.cpfCnpj}</Text>
    </TouchableOpacity>
  )

  return (
    <View style={styles.container}>
      <HeaderWithMenu title="Clientes" />
      <View style={styles.header}>
        <Button size="sm" onPress={() => router.push('/clientes/novo')}>
          + Novo
        </Button>
      </View>

      <FilterBar
        onSearchChange={setSearchTerm}
        onFilterChange={setFilters}
        searchPlaceholder="Buscar por nome, CPF/CNPJ, email ou telefone..."
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
          data={clientesFiltrados}
          renderItem={renderItem}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {searchTerm || Object.values(filters).some(v => v !== '' && v !== undefined)
                ? 'Nenhum cliente encontrado com os filtros aplicados'
                : 'Nenhum cliente encontrado'}
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
  cardText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  cardCpf: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
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
