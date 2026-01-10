import React from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { servicoService, Servico } from '../../src/services/servicoService'
import Button from '../../src/components/Button'
import HeaderWithMenu from '../../src/components/HeaderWithMenu'

export default function Servicos() {
  const { data: servicos = [], isLoading } = useQuery({
    queryKey: ['servicos'],
    queryFn: servicoService.listarTodos,
  })

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

      {isLoading ? (
        <Text style={styles.loading}>Carregando...</Text>
      ) : (
        <FlatList
          data={servicos}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>Nenhum serviço encontrado</Text>
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
