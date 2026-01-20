import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, Alert, TextInput, TouchableOpacity, Switch } from 'react-native'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { router, useLocalSearchParams } from 'expo-router'
import { perfilService, Perfil } from '../../src/services/perfilService'
import Button from '../../src/components/Button'
import FormField from '../../src/components/FormField'
import HeaderWithMenu from '../../src/components/HeaderWithMenu'

// Lista de menus disponíveis no sistema
const MENUS_DISPONIVEIS = [
  { path: '/', label: 'Início' },
  { path: '/clientes', label: 'Clientes' },
  { path: '/empresas', label: 'Empresas' },
  { path: '/unidades', label: 'Unidades' },
  { path: '/atendentes', label: 'Atendentes' },
  { path: '/servicos', label: 'Serviços' },
  { path: '/usuarios', label: 'Usuários' },
  { path: '/perfis', label: 'Perfis' },
  { path: '/agendamentos', label: 'Agendamentos' },
  { path: '/notificacoes', label: 'Notificações' },
]

export default function NovoPerfilScreen() {
  const params = useLocalSearchParams()
  const perfilId = params.id ? Number(params.id) : null
  const queryClient = useQueryClient()

  const { data: perfilExistente } = useQuery<Perfil>({
    queryKey: ['perfil', perfilId],
    queryFn: () => perfilService.buscarPorId(perfilId!),
    enabled: !!perfilId,
  })

  const [formData, setFormData] = useState<Perfil>({
    nome: '',
    descricao: '',
    sistema: false,
    ativo: true,
    permissoesMenu: [],
  })

  useEffect(() => {
    if (perfilExistente) {
      setFormData(perfilExistente)
    }
  }, [perfilExistente])

  const toggleMenu = (menuPath: string) => {
    const currentMenus = formData.permissoesMenu || []
    if (currentMenus.includes(menuPath)) {
      setFormData({
        ...formData,
        permissoesMenu: currentMenus.filter((path) => path !== menuPath),
      })
    } else {
      setFormData({
        ...formData,
        permissoesMenu: [...currentMenus, menuPath],
      })
    }
  }

  const saveMutation = useMutation({
    mutationFn: async (data: Perfil) => {
      return perfilId
        ? perfilService.atualizar(perfilId, data)
        : perfilService.criar(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['perfis'] })
      Alert.alert('Sucesso', perfilId ? 'Perfil atualizado com sucesso!' : 'Perfil criado com sucesso!', [
        { text: 'OK', onPress: () => router.back() },
      ])
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Erro ao salvar perfil'
      Alert.alert('Erro', errorMessage)
    },
  })

  const handleSubmit = () => {
    if (!formData.nome.trim()) {
      Alert.alert('Atenção', 'O nome do perfil é obrigatório')
      return
    }

    if (perfilExistente?.sistema) {
      Alert.alert('Erro', 'Não é possível editar perfis do sistema')
      return
    }

    saveMutation.mutate(formData)
  }

  return (
    <View style={styles.container}>
      <HeaderWithMenu title={perfilId ? 'Editar Perfil' : 'Novo Perfil'} />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <FormField label="Nome do Perfil" required>
          <TextInput
            style={styles.input}
            value={formData.nome}
            onChangeText={(text) => setFormData({ ...formData, nome: text.toUpperCase() })}
            placeholder="Ex: VENDEDOR, SUPERVISOR"
            placeholderTextColor="#9ca3af"
            editable={!perfilExistente?.sistema}
          />
        </FormField>

        <FormField label="Descrição">
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.descricao || ''}
            onChangeText={(text) => setFormData({ ...formData, descricao: text })}
            placeholder="Descreva as responsabilidades deste perfil..."
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={3}
            editable={!perfilExistente?.sistema}
          />
        </FormField>

        <View style={styles.permissionsContainer}>
          <Text style={styles.permissionsTitle}>Permissões de Menu</Text>
          <Text style={styles.permissionsSubtitle}>Selecione os menus que este perfil terá acesso</Text>
          <View style={styles.menuList}>
            {MENUS_DISPONIVEIS.map((menu) => {
              const isSelected = formData.permissoesMenu?.includes(menu.path) || false
              return (
                <TouchableOpacity
                  key={menu.path}
                  style={[styles.menuItem, isSelected && styles.menuItemSelected]}
                  onPress={() => !perfilExistente?.sistema && toggleMenu(menu.path)}
                  disabled={perfilExistente?.sistema}
                >
                  <View style={styles.menuItemContent}>
                    <Text style={[styles.menuLabel, isSelected && styles.menuLabelSelected]}>
                      {menu.label}
                    </Text>
                    <Text style={styles.menuPath}>{menu.path}</Text>
                  </View>
                  <Switch
                    value={isSelected}
                    onValueChange={() => toggleMenu(menu.path)}
                    disabled={perfilExistente?.sistema}
                    trackColor={{ false: '#D1D5DB', true: '#2563EB' }}
                    thumbColor={isSelected ? '#FFFFFF' : '#F3F4F6'}
                  />
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <Button variant="secondary" onPress={() => router.back()} style={styles.button}>
            Cancelar
          </Button>
          <Button
            onPress={handleSubmit}
            isLoading={saveMutation.isPending}
            style={styles.button}
            disabled={perfilExistente?.sistema}
          >
            {perfilId ? 'Atualizar' : 'Salvar'}
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
  permissionsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  permissionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  permissionsSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  menuList: {
    gap: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  menuItemSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  menuItemContent: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 2,
  },
  menuLabelSelected: {
    color: '#2563EB',
  },
  menuPath: {
    fontSize: 12,
    color: '#9CA3AF',
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
