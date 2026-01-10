import React, { useState } from 'react'
import { View, Text, TextInput, StyleSheet, ScrollView, Alert } from 'react-native'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { router } from 'expo-router'
import { clienteService, Cliente } from '../../src/services/clienteService'
import Button from '../../src/components/Button'
import FormField from '../../src/components/FormField'
import HeaderWithMenu from '../../src/components/HeaderWithMenu'

export default function NovoCliente() {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState<Partial<Cliente>>({
    nome: '',
    cpfCnpj: '',
    email: '',
    telefone: '',
    endereco: '',
    numero: '',
    cep: '',
    cidade: '',
    uf: '',
  })

  const createMutation = useMutation({
    mutationFn: (data: Cliente) => clienteService.criar(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] })
      Alert.alert('Sucesso', 'Cliente criado com sucesso!', [
        { text: 'OK', onPress: () => router.back() }
      ])
    },
    onError: (error: any) => {
      Alert.alert('Erro', error.response?.data?.message || 'Erro ao criar cliente')
    },
  })

  const handleSubmit = () => {
    if (!formData.nome || !formData.cpfCnpj) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos obrigatórios.')
      return
    }
    createMutation.mutate(formData as Cliente)
  }

  return (
    <View style={styles.container}>
      <HeaderWithMenu title="Novo Cliente" />
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
            title={createMutation.isPending ? 'Salvando...' : 'Salvar'}
            isLoading={createMutation.isPending}
            disabled={createMutation.isPending}
            style={styles.submitButton}
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
  cancelButton: {
    marginTop: 12,
  },
})
