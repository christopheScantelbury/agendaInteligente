import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, Alert, TextInput } from 'react-native'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { router, useLocalSearchParams } from 'expo-router'
import { unidadeService, Unidade } from '../../src/services/unidadeService'
import { empresaService } from '../../src/services/empresaService'
import Button from '../../src/components/Button'
import FormField from '../../src/components/FormField'
import HeaderWithMenu from '../../src/components/HeaderWithMenu'
import { maskPhone, maskCEP, maskNumber, maskEmail } from '../../src/utils/masks'
import { Picker } from '@react-native-picker/picker'

export default function NovaUnidadeScreen() {
  const params = useLocalSearchParams()
  const unidadeId = params.id ? Number(params.id) : null
  const queryClient = useQueryClient()

  const { data: unidadeExistente } = useQuery<Unidade>({
    queryKey: ['unidade', unidadeId],
    queryFn: () => unidadeService.buscarPorId(unidadeId!),
    enabled: !!unidadeId,
  })

  const [formData, setFormData] = useState<Unidade>({
    nome: '',
    descricao: '',
    endereco: '',
    numero: '',
    bairro: '',
    cep: '',
    cidade: '',
    uf: '',
    telefone: '',
    email: '',
    ativo: true,
    horarioAbertura: '08:00',
    horarioFechamento: '18:00',
    empresaId: undefined,
  })

  const { data: empresas = [] } = useQuery({
    queryKey: ['empresas'],
    queryFn: empresaService.listarAtivas,
  })

  useEffect(() => {
    if (unidadeExistente) {
      setFormData({
        ...unidadeExistente,
      })
    }
  }, [unidadeExistente])

  const saveMutation = useMutation({
    mutationFn: async (data: Unidade) => {
      return unidadeId
        ? unidadeService.atualizar(unidadeId, data)
        : unidadeService.criar(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unidades'] })
      Alert.alert('Sucesso', unidadeId ? 'Unidade atualizada com sucesso!' : 'Unidade criada com sucesso!', [
        { text: 'OK', onPress: () => router.back() },
      ])
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Erro ao salvar unidade'
      Alert.alert('Erro', errorMessage)
    },
  })

  const handleSubmit = () => {
    if (!formData.nome.trim()) {
      Alert.alert('Atenção', 'O nome da unidade é obrigatório')
      return
    }

    saveMutation.mutate(formData)
  }

  return (
    <View style={styles.container}>
      <HeaderWithMenu title={unidadeId ? 'Editar Unidade' : 'Nova Unidade'} />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <FormField label="Empresa" required>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.empresaId || ''}
              onValueChange={(value) => setFormData({ ...formData, empresaId: value || undefined })}
              style={styles.picker}
            >
              <Picker.Item label="Selecione uma empresa" value="" />
              {empresas.map((empresa) => (
                <Picker.Item key={empresa.id} label={empresa.nome} value={empresa.id} />
              ))}
            </Picker>
          </View>
        </FormField>

        <FormField label="Nome da Unidade" required>
          <TextInput
            style={styles.input}
            value={formData.nome}
            onChangeText={(text) => setFormData({ ...formData, nome: text })}
            placeholder="Digite o nome da unidade"
            placeholderTextColor="#9ca3af"
          />
        </FormField>

        <FormField label="Descrição">
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.descricao || ''}
            onChangeText={(text) => setFormData({ ...formData, descricao: text })}
            placeholder="Digite uma descrição"
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={3}
          />
        </FormField>

        <View style={styles.row}>
          <View style={styles.halfField}>
            <FormField label="Horário de Abertura">
              <TextInput
                style={styles.input}
                value={formData.horarioAbertura || ''}
                onChangeText={(text) => setFormData({ ...formData, horarioAbertura: text })}
                placeholder="08:00"
                placeholderTextColor="#9ca3af"
              />
            </FormField>
          </View>
          <View style={styles.halfField}>
            <FormField label="Horário de Fechamento">
              <TextInput
                style={styles.input}
                value={formData.horarioFechamento || ''}
                onChangeText={(text) => setFormData({ ...formData, horarioFechamento: text })}
                placeholder="18:00"
                placeholderTextColor="#9ca3af"
              />
            </FormField>
          </View>
        </View>

        <FormField label="CEP">
          <TextInput
            style={styles.input}
            value={formData.cep || ''}
            onChangeText={(text) => setFormData({ ...formData, cep: maskCEP(text) })}
            placeholder="00000-000"
            placeholderTextColor="#9ca3af"
            maxLength={9}
          />
        </FormField>

        <FormField label="Endereço">
          <TextInput
            style={styles.input}
            value={formData.endereco || ''}
            onChangeText={(text) => setFormData({ ...formData, endereco: text })}
            placeholder="Rua, Avenida, etc."
            placeholderTextColor="#9ca3af"
          />
        </FormField>

        <View style={styles.row}>
          <View style={styles.halfField}>
            <FormField label="Número">
              <TextInput
                style={styles.input}
                value={formData.numero || ''}
                onChangeText={(text) => setFormData({ ...formData, numero: maskNumber(text) })}
                placeholder="123"
                placeholderTextColor="#9ca3af"
              />
            </FormField>
          </View>
          <View style={styles.halfField}>
            <FormField label="Bairro">
              <TextInput
                style={styles.input}
                value={formData.bairro || ''}
                onChangeText={(text) => setFormData({ ...formData, bairro: text })}
                placeholder="Bairro"
                placeholderTextColor="#9ca3af"
              />
            </FormField>
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.halfField}>
            <FormField label="Cidade">
              <TextInput
                style={styles.input}
                value={formData.cidade || ''}
                onChangeText={(text) => setFormData({ ...formData, cidade: text })}
                placeholder="Cidade"
                placeholderTextColor="#9ca3af"
              />
            </FormField>
          </View>
          <View style={styles.halfField}>
            <FormField label="UF">
              <TextInput
                style={styles.input}
                value={formData.uf || ''}
                onChangeText={(text) => setFormData({ ...formData, uf: text.toUpperCase() })}
                placeholder="UF"
                placeholderTextColor="#9ca3af"
                maxLength={2}
              />
            </FormField>
          </View>
        </View>

        <FormField label="Telefone">
          <TextInput
            style={styles.input}
            value={formData.telefone || ''}
            onChangeText={(text) => setFormData({ ...formData, telefone: maskPhone(text) })}
            placeholder="(00) 00000-0000"
            placeholderTextColor="#9ca3af"
            keyboardType="phone-pad"
            maxLength={15}
          />
        </FormField>

        <FormField label="Email">
          <TextInput
            style={styles.input}
            value={formData.email || ''}
            onChangeText={(text) => setFormData({ ...formData, email: maskEmail(text) })}
            placeholder="email@exemplo.com"
            placeholderTextColor="#9ca3af"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </FormField>

        <View style={styles.buttonContainer}>
          <Button variant="secondary" onPress={() => router.back()} style={styles.button}>
            Cancelar
          </Button>
          <Button onPress={handleSubmit} isLoading={saveMutation.isPending} style={styles.button}>
            {unidadeId ? 'Atualizar' : 'Salvar'}
          </Button>
        </View>
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
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfField: {
    flex: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    color: '#1F2937',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
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
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 16,
  },
  button: {
    flex: 1,
  },
})
