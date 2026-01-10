import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { unidadeService, Unidade } from '../../src/services/unidadeService'
import { authService } from '../../src/services/authService'
import Button from '../../src/components/Button'

export default function UnidadesScreen() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)

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

  const renderUnidadeItem = ({ item }: { item: Unidade }) => (
    <View style={styles.unidadeCard}>
      <Text style={styles.unidadeName}>{item.nome}</Text>
      {item.descricao && <Text style={styles.unidadeDescription}>{item.descricao}</Text>}
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
    </View>
  )

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Unidades</Text>
        <Button
          size="sm"
          onPress={() => {
            // TODO: Navegar para tela de cadastro
            Alert.alert('Em desenvolvimento', 'Funcionalidade de cadastro em breve')
          }}
        >
          + Nova
        </Button>
      </View>
      <FlatList
        data={unidades}
        keyExtractor={(item) => item.id?.toString() || item.nome}
        renderItem={renderUnidadeItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Nenhuma unidade encontrada</Text>
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
  unidadeName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
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
