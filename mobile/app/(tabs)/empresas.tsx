import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert, TouchableOpacity, Image } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { empresaService, Empresa } from '../../src/services/empresaService'
import { authService } from '../../src/services/authService'
import Button from '../../src/components/Button'
import HeaderWithMenu from '../../src/components/HeaderWithMenu'

export default function EmpresasScreen() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const authenticated = await authService.isAuthenticated()
    setIsAuthenticated(authenticated)
  }

  const { data: empresas = [], isLoading, error } = useQuery<Empresa[]>({
    queryKey: ['empresas'],
    queryFn: empresaService.listarTodos,
    retry: false,
    enabled: isAuthenticated,
  })

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Carregando empresas...</Text>
      </View>
    )
  }

  if (error) {
    Alert.alert('Erro', 'Não foi possível carregar as empresas.')
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Erro ao carregar empresas.</Text>
      </View>
    )
  }

  const renderEmpresaItem = ({ item }: { item: Empresa }) => (
    <TouchableOpacity
      style={styles.empresaCard}
      onPress={() => router.push(`/empresas/novo?id=${item.id}` as any)}
    >
      <View style={styles.cardContent}>
        {item.logo && (
          <Image source={{ uri: item.logo }} style={styles.empresaLogo} />
        )}
        <View style={styles.textContainer}>
          <Text style={styles.empresaName}>{item.nome}</Text>
          {item.razaoSocial && <Text style={styles.empresaDetail}>{item.razaoSocial}</Text>}
          {item.cnpj && <Text style={styles.empresaDetail}>CNPJ: {item.cnpj}</Text>}
          {item.email && <Text style={styles.empresaDetail}>Email: {item.email}</Text>}
          {item.telefone && <Text style={styles.empresaDetail}>Tel: {item.telefone}</Text>}
          {item.corApp && (
            <View style={styles.colorDisplay}>
              <Text style={styles.empresaDetail}>Cor do App: </Text>
              <View style={[styles.colorBox, { backgroundColor: item.corApp }]} />
              <Text style={styles.empresaDetail}>{item.corApp}</Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.statusContainer}>
        <Text style={[styles.statusBadge, item.ativo ? styles.statusActive : styles.statusInactive]}>
          {item.ativo ? 'Ativa' : 'Inativa'}
        </Text>
      </View>
    </TouchableOpacity>
  )

  return (
    <View style={styles.container}>
      <HeaderWithMenu title="Empresas" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Empresas</Text>
        <Button
          size="sm"
          onPress={() => {
            router.push('/empresas/novo' as any)
          }}
        >
          + Nova
        </Button>
      </View>
      <FlatList
        data={empresas}
        keyExtractor={(item) => item.id?.toString() || item.nome}
        renderItem={renderEmpresaItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Nenhuma empresa encontrada</Text>
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
  empresaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  empresaLogo: {
    width: 50,
    height: 50,
    resizeMode: 'contain',
    marginRight: 12,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  textContainer: {
    flex: 1,
  },
  empresaName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  empresaDetail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  colorDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  colorBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#d1d5db',
    marginRight: 4,
  },
  statusContainer: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignSelf: 'flex-start',
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
