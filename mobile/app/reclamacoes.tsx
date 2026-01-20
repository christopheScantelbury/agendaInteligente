import React, { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, Alert, TextInput, TouchableOpacity } from 'react-native'
import { useMutation } from '@tanstack/react-query'
import { reclamacaoService, Reclamacao } from '../src/services/reclamacaoService'
import { unidadeService } from '../src/services/unidadeService'
import { useQuery } from '@tanstack/react-query'
import Button from '../src/components/Button'
import FormField from '../src/components/FormField'
import HeaderWithMenu from '../src/components/HeaderWithMenu'
import { Picker } from '@react-native-picker/picker'
import { Ionicons } from '@expo/vector-icons'

export default function ReclamacoesScreen() {
  const [formData, setFormData] = useState<Reclamacao>({
    mensagem: '',
    unidadeId: undefined,
  })

  const { data: unidades = [] } = useQuery({
    queryKey: ['unidades', 'ativas'],
    queryFn: unidadeService.listar,
  })

  const criarMutation = useMutation({
    mutationFn: reclamacaoService.criar,
    onSuccess: () => {
      Alert.alert('Sucesso', 'Reclamação enviada com sucesso! Obrigado pelo seu feedback.')
      setFormData({ mensagem: '', unidadeId: undefined })
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Erro ao enviar reclamação'
      Alert.alert('Erro', errorMessage)
    },
  })

  const handleSubmit = () => {
    if (!formData.mensagem.trim()) {
      Alert.alert('Atenção', 'Por favor, digite sua reclamação')
      return
    }
    criarMutation.mutate(formData)
  }

  return (
    <View style={styles.container}>
      <HeaderWithMenu title="Reclamações Anônimas" />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="alert-circle" size={32} color="#DC2626" />
          </View>
          <Text style={styles.subtitle}>Sua identidade será mantida em sigilo</Text>
        </View>

        <FormField label="Unidade (opcional)">
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.unidadeId || ''}
              onValueChange={(value) => setFormData({ ...formData, unidadeId: value || undefined })}
              style={styles.picker}
            >
              <Picker.Item label="Selecione uma unidade (opcional)" value="" />
              {unidades.map((unidade) => (
                <Picker.Item key={unidade.id} label={unidade.nome} value={unidade.id} />
              ))}
            </Picker>
          </View>
        </FormField>

        <FormField label="Sua Reclamação" required>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.mensagem}
            onChangeText={(text) => setFormData({ ...formData, mensagem: text })}
            placeholder="Descreva sua reclamação aqui. Seja específico e detalhado para que possamos melhorar nossos serviços."
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={8}
            textAlignVertical="top"
          />
          <Text style={styles.helperText}>
            Sua reclamação será enviada de forma anônima. Nenhuma informação pessoal será coletada.
          </Text>
        </FormField>

        <Button onPress={handleSubmit} isLoading={criarMutation.isPending} style={styles.button}>
          Enviar Reclamação
        </Button>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    backgroundColor: '#FEE2E2',
    borderRadius: 50,
    padding: 16,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    marginTop: 8,
  },
  picker: {
    height: 50,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    color: '#1F2937',
    marginTop: 8,
  },
  textArea: {
    minHeight: 160,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
  },
  button: {
    marginTop: 24,
  },
})
