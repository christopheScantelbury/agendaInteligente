import React, { useState, useEffect } from 'react'
import { View, Text, TextInput, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { router, useLocalSearchParams } from 'expo-router'
import { clienteService, Cliente } from '../../src/services/clienteService'
import Button from '../../src/components/Button'
import FormField from '../../src/components/FormField'
import HeaderWithMenu from '../../src/components/HeaderWithMenu'

export default function EditarCliente() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState<Partial<Cliente>>({})

  const { data: cliente, isLoading } = useQuery({
    queryKey: ['cliente', id],
    queryFn: () => clienteService.buscarPorId(Number(id)),
    enabled: !!id,
  })

  useEffect(() => {
    if (cliente) {
      setFormData(cliente)
    }
  }, [cliente])

  const updateMutation = useMutation({
    mutationFn: (data: Cliente) => clienteService.atualizar(Number(id), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] })
      queryClient.invalidateQueries({ queryKey: ['cliente', id] })
      Alert.alert('Sucesso', 'Cliente atualizado com sucesso!', [
        { text: 'OK', onPress: () => router.back() }
      ])
    },
    onError: (error: any) => {
      Alert.alert('Erro', error.response?.data?.message || 'Erro ao atualizar cliente')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => clienteService.excluir(Number(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] })
      Alert.alert('Sucesso', 'Cliente excluído com sucesso!', [
        { text: 'OK', onPress: () => router.back() }
      ])
    },
    onError: (error: any) => {
      Alert.alert('Erro', error.response?.data?.message || 'Erro ao excluir cliente')
    },
  })

  const handleSubmit = () => {
    if (!formData.nome || !formData.cpfCnpj) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos obrigatórios.')
      return
    }
    updateMutation.mutate(formData as Cliente)
  }

  const handleDelete = () => {
    Alert.alert(
      'Confirmar Exclusão',
      'Tem certeza que deseja excluir este cliente?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(),
        },
      ]
    )
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    )
  }

  if (!cliente) {
    return (
      <View style={styles.container}>
        <HeaderWithMenu title="Cliente não encontrado" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Cliente não encontrado</Text>
          <Button onPress={() => router.back()} variant="secondary">
            Voltar
          </Button>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <HeaderWithMenu title="Editar Cliente" />
      <ScrollView style={styles.scrollView}>
        <View style={styles.form}>
          <FormField label="Nome" required>
            <TextInput
              style={styles.input}
              value={formData.nome || ''}
              onChangeText={(text) => setFormData({ ...formData, nome: text })}
              placeholder="Nome completo"
            />
          </FormField>

          <FormField label="CPF/CNPJ" required>
            <TextInput
              style={styles.input}
              value={formData.cpfCnpj || ''}
              onChangeText={(text) => setFormData({ ...formData, cpfCnpj: text })}
              placeholder="000.000.000-00"
            />
          </FormField>

          <FormField label="Email">
            <TextInput
              style={styles.input}
              value={formData.email || ''}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              placeholder="email@exemplo.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </FormField>

          <FormField label="Telefone">
            <TextInput
              style={styles.input}
              value={formData.telefone || ''}
              onChangeText={(text) => setFormData({ ...formData, telefone: text })}
              placeholder="(00) 00000-0000"
              keyboardType="phone-pad"
            />
          </FormField>

          <FormField label="Endereço">
            <TextInput
              style={styles.input}
              value={formData.endereco || ''}
              onChangeText={(text) => setFormData({ ...formData, endereco: text })}
              placeholder="Rua, Avenida, etc"
            />
          </FormField>

          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <FormField label="Número">
                <TextInput
                  style={styles.input}
                  value={formData.numero || ''}
                  onChangeText={(text) => setFormData({ ...formData, numero: text })}
                  placeholder="123"
                />
              </FormField>
            </View>
            <View style={styles.halfWidth}>
              <FormField label="CEP">
                <TextInput
                  style={styles.input}
                  value={formData.cep || ''}
                  onChangeText={(text) => setFormData({ ...formData, cep: text })}
                  placeholder="00000-000"
                  keyboardType="numeric"
                />
              </FormField>
            </View>
          </View>

          <FormField label="Cidade">
            <TextInput
              style={styles.input}
              value={formData.cidade || ''}
              onChangeText={(text) => setFormData({ ...formData, cidade: text })}
              placeholder="Cidade"
            />
          </FormField>

          <FormField label="UF">
            <TextInput
              style={styles.input}
              value={formData.uf || ''}
              onChangeText={(text) => setFormData({ ...formData, uf: text.toUpperCase() })}
              placeholder="UF"
              maxLength={2}
            />
          </FormField>

          <Button
            onPress={handleSubmit}
            title={updateMutation.isPending ? 'Salvando...' : 'Salvar'}
            isLoading={updateMutation.isPending}
            disabled={updateMutation.isPending}
            style={styles.submitButton}
          />

          <Button
            onPress={handleDelete}
            title={deleteMutation.isPending ? 'Excluindo...' : 'Excluir Cliente'}
            variant="danger"
            isLoading={deleteMutation.isPending}
            disabled={deleteMutation.isPending}
            style={styles.deleteButton}
          />

          <Button
            onPress={() => router.back()}
            title="Cancelar"
            variant="secondary"
            style={styles.cancelButton}
          />
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#dc2626',
    marginBottom: 20,
  },
  form: {
    padding: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    padding: 10,
    fontSize: 16,
    color: '#1f2937',
    backgroundColor: '#ffffff',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  submitButton: {
    marginTop: 20,
  },
  deleteButton: {
    marginTop: 12,
  },
  cancelButton: {
    marginTop: 12,
  },
})
