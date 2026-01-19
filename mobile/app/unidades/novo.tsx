import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, Alert, TextInput, TouchableOpacity, Image } from 'react-native'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { router, useLocalSearchParams } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { unidadeService, Unidade } from '../../src/services/unidadeService'
import Button from '../../src/components/Button'
import FormField from '../../src/components/FormField'
import HeaderWithMenu from '../../src/components/HeaderWithMenu'

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
    logo: undefined,
    corApp: '#2563EB',
  })

  const [logoPreview, setLogoPreview] = useState<string | null>(null)

  useEffect(() => {
    if (unidadeExistente) {
      setFormData({
        ...unidadeExistente,
        corApp: unidadeExistente.corApp || '#2563EB',
      })
      setLogoPreview(unidadeExistente.logo || null)
    }
  }, [unidadeExistente])

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Precisamos de permissão para acessar suas fotos.')
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    })

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0]
      if (asset.base64) {
        // Comprimir imagem no cliente (redimensionar para max 200x200)
        const base64 = `data:image/jpeg;base64,${asset.base64}`
        setLogoPreview(base64)
        setFormData({ ...formData, logo: base64 })
      }
    }
  }

  const removeImage = () => {
    setLogoPreview(null)
    setFormData({ ...formData, logo: undefined })
  }

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
            onChangeText={(text) => setFormData({ ...formData, cep: text })}
            placeholder="00000-000"
            placeholderTextColor="#9ca3af"
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
                onChangeText={(text) => setFormData({ ...formData, numero: text })}
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
            onChangeText={(text) => setFormData({ ...formData, telefone: text })}
            placeholder="(00) 00000-0000"
            placeholderTextColor="#9ca3af"
            keyboardType="phone-pad"
          />
        </FormField>

        <FormField label="Email">
          <TextInput
            style={styles.input}
            value={formData.email || ''}
            onChangeText={(text) => setFormData({ ...formData, email: text })}
            placeholder="email@exemplo.com"
            placeholderTextColor="#9ca3af"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </FormField>

        {/* Logo */}
        <FormField label="Logo da Empresa">
          <View style={styles.logoContainer}>
            {logoPreview ? (
              <View style={styles.logoPreviewContainer}>
                <Image source={{ uri: logoPreview }} style={styles.logoPreview} />
                <TouchableOpacity style={styles.removeLogoButton} onPress={removeImage}>
                  <Text style={styles.removeLogoText}>×</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
                <Text style={styles.uploadButtonText}>Selecionar Imagem</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.helperText}>Tamanho máximo: 200x200px. A imagem será comprimida automaticamente.</Text>
        </FormField>

        {/* Cor do App */}
        <FormField label="Cor do App">
          <View style={styles.colorContainer}>
            <View style={[styles.colorPreview, { backgroundColor: formData.corApp || '#2563EB' }]} />
            <TextInput
              style={[styles.input, styles.colorInput]}
              value={formData.corApp || '#2563EB'}
              onChangeText={(text) => {
                if (/^#[0-9A-Fa-f]{0,6}$/.test(text) || text === '') {
                  setFormData({ ...formData, corApp: text || '#2563EB' })
                }
              }}
              placeholder="#2563EB"
              placeholderTextColor="#9ca3af"
              maxLength={7}
            />
          </View>
          <Text style={styles.helperText}>Cor principal que será usada no app (formato hexadecimal)</Text>
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
  logoContainer: {
    marginTop: 8,
  },
  logoPreviewContainer: {
    position: 'relative',
    alignSelf: 'flex-start',
  },
  logoPreview: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  removeLogoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#DC2626',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeLogoText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  uploadButton: {
    backgroundColor: '#2563EB',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  uploadButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  colorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  colorPreview: {
    width: 50,
    height: 50,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  colorInput: {
    flex: 1,
  },
  helperText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
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
