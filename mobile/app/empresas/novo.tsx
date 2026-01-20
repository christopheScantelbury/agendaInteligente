import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, Alert, TextInput, TouchableOpacity, Image } from 'react-native'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { router, useLocalSearchParams } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { empresaService, Empresa } from '../../src/services/empresaService'
import Button from '../../src/components/Button'
import FormField from '../../src/components/FormField'
import HeaderWithMenu from '../../src/components/HeaderWithMenu'
import { maskPhone, maskCEP, maskCNPJ, maskEmail, maskNumber } from '../../src/utils/masks'

export default function NovaEmpresaScreen() {
  const params = useLocalSearchParams()
  const empresaId = params.id ? Number(params.id) : null
  const queryClient = useQueryClient()

  const { data: empresaExistente } = useQuery<Empresa>({
    queryKey: ['empresa', empresaId],
    queryFn: () => empresaService.buscarPorId(empresaId!),
    enabled: !!empresaId,
  })

  const [formData, setFormData] = useState<Empresa>({
    nome: '',
    razaoSocial: '',
    cnpj: '',
    email: '',
    telefone: '',
    endereco: '',
    numero: '',
    bairro: '',
    cep: '',
    cidade: '',
    uf: '',
    ativo: true,
    logo: undefined,
    corApp: '#2563EB',
  })

  const [logoPreview, setLogoPreview] = useState<string | undefined>(empresaExistente?.logo)

  useEffect(() => {
    if (empresaExistente) {
      setFormData(empresaExistente)
      setLogoPreview(empresaExistente.logo)
    }
  }, [empresaExistente])

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
        const base64 = `data:image/jpeg;base64,${asset.base64}`
        setLogoPreview(base64)
        setFormData({ ...formData, logo: base64 })
      }
    }
  }

  const removeImage = () => {
    setLogoPreview(undefined)
    setFormData({ ...formData, logo: undefined })
  }

  const saveMutation = useMutation({
    mutationFn: async (data: Empresa) => {
      return empresaId
        ? empresaService.atualizar(empresaId, data)
        : empresaService.criar(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresas'] })
      Alert.alert('Sucesso', empresaId ? 'Empresa atualizada com sucesso!' : 'Empresa criada com sucesso!', [
        { text: 'OK', onPress: () => router.back() },
      ])
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Erro ao salvar empresa'
      Alert.alert('Erro', errorMessage)
    },
  })

  const handleSubmit = () => {
    if (!formData.nome.trim()) {
      Alert.alert('Atenção', 'O nome da empresa é obrigatório')
      return
    }

    saveMutation.mutate(formData)
  }

  return (
    <View style={styles.container}>
      <HeaderWithMenu title={empresaId ? 'Editar Empresa' : 'Nova Empresa'} />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <FormField label="Nome da Empresa" required>
          <TextInput
            style={styles.input}
            value={formData.nome}
            onChangeText={(text) => setFormData({ ...formData, nome: text })}
            placeholder="Digite o nome da empresa"
            placeholderTextColor="#9ca3af"
          />
        </FormField>

        <FormField label="Razão Social">
          <TextInput
            style={styles.input}
            value={formData.razaoSocial || ''}
            onChangeText={(text) => setFormData({ ...formData, razaoSocial: text })}
            placeholder="Razão social"
            placeholderTextColor="#9ca3af"
          />
        </FormField>

        <View style={styles.row}>
          <View style={styles.halfField}>
            <FormField label="CNPJ">
              <TextInput
                style={styles.input}
                value={formData.cnpj || ''}
                onChangeText={(text) => setFormData({ ...formData, cnpj: maskCNPJ(text) })}
                placeholder="00.000.000/0000-00"
                placeholderTextColor="#9ca3af"
                maxLength={18}
              />
            </FormField>
          </View>
          <View style={styles.halfField}>
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
          </View>
        </View>

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
            placeholder="Rua, Avenida, etc"
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

        <FormField label="Cor Principal do App">
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
            {empresaId ? 'Atualizar' : 'Salvar'}
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
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  uploadButtonText: {
    color: '#6B7280',
    fontSize: 14,
  },
  colorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  colorPreview: {
    width: 40,
    height: 40,
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
