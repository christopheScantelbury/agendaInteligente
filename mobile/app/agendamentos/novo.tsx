import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, Alert, TextInput, TouchableOpacity, Platform } from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { router, useLocalSearchParams } from 'expo-router'
import DateTimePicker from '@react-native-community/datetimepicker'
import { agendamentoService, Agendamento } from '../../src/services/agendamentoService'
import { clienteService } from '../../src/services/clienteService'
import { servicoService } from '../../src/services/servicoService'
import { unidadeService } from '../../src/services/unidadeService'
import { atendenteService } from '../../src/services/atendenteService'
import { authService } from '../../src/services/authService'
import Button from '../../src/components/Button'
import FormField from '../../src/components/FormField'
import HeaderWithMenu from '../../src/components/HeaderWithMenu'
import { Picker } from '@react-native-picker/picker'
import { Ionicons } from '@expo/vector-icons'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function NovoAgendamentoScreen() {
  const params = useLocalSearchParams()
  const queryClient = useQueryClient()
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Estados para data/hora
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showTimePicker, setShowTimePicker] = useState(false)
  const [selectedDateTime, setSelectedDateTime] = useState<Date>(() => {
    if (params.dataHoraInicio) {
      try {
        return parseISO(params.dataHoraInicio as string)
      } catch {
        return new Date()
      }
    }
    return new Date()
  })

  const [formData, setFormData] = useState<Partial<Agendamento>>({
    clienteId: undefined,
    unidadeId: undefined,
    atendenteId: undefined,
    dataHoraInicio: params.dataHoraInicio as string || format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    observacoes: '',
    servicos: [],
  })

  const [servicosSelecionados, setServicosSelecionados] = useState<number[]>([])

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      dataHoraInicio: format(selectedDateTime, "yyyy-MM-dd'T'HH:mm"),
    }))
  }, [selectedDateTime])

  const checkAuth = async () => {
    const authenticated = await authService.isAuthenticated()
    setIsAuthenticated(authenticated)
  }

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: clienteService.listar,
    enabled: isAuthenticated,
  })

  const { data: servicos = [] } = useQuery({
    queryKey: ['servicos'],
    queryFn: servicoService.listar,
    enabled: isAuthenticated,
  })

  const { data: unidades = [] } = useQuery({
    queryKey: ['unidades'],
    queryFn: unidadeService.listarTodos,
    enabled: isAuthenticated,
  })

  const { data: atendentes = [], refetch: refetchAtendentes } = useQuery({
    queryKey: ['atendentes', formData.unidadeId],
    queryFn: () => formData.unidadeId ? atendenteService.listarPorUnidade(formData.unidadeId!) : Promise.resolve([]),
    enabled: !!formData.unidadeId && isAuthenticated,
  })

  const createMutation = useMutation({
    mutationFn: agendamentoService.criar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] })
      Alert.alert('Sucesso', 'Agendamento criado com sucesso!', [
        { text: 'OK', onPress: () => router.back() }
      ])
    },
    onError: (error: any) => {
      Alert.alert('Erro', error.response?.data?.message || 'Erro ao criar agendamento')
    },
  })

  const handleSubmit = () => {
    if (!formData.clienteId || servicosSelecionados.length === 0 || !formData.unidadeId || !formData.atendenteId || !formData.dataHoraInicio) {
      Alert.alert('Atenção', 'Por favor, preencha todos os campos obrigatórios')
      return
    }

    const servicosParaEnvio = servicosSelecionados.map((servicoId) => {
      const servicoEncontrado = servicos.find((s) => s.id === servicoId)
      return {
        servicoId,
        quantidade: 1,
        valor: servicoEncontrado?.valor || 0,
        descricao: servicoEncontrado?.descricao || servicoEncontrado?.nome,
      }
    })

    createMutation.mutate({
      clienteId: formData.clienteId,
      unidadeId: formData.unidadeId,
      atendenteId: formData.atendenteId,
      dataHoraInicio: formData.dataHoraInicio,
      observacoes: formData.observacoes,
      servicos: servicosParaEnvio,
    } as Agendamento)
  }

  const handleServicoToggle = (servicoId: number) => {
    setServicosSelecionados(prev => {
      if (prev.includes(servicoId)) {
        return prev.filter(id => id !== servicoId)
      } else {
        return [...prev, servicoId]
      }
    })
  }

  const handleUnidadeChange = (unidadeId: number) => {
    setFormData({ ...formData, unidadeId, atendenteId: undefined })
    refetchAtendentes()
  }

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios')
    if (selectedDate) {
      const newDateTime = new Date(selectedDateTime)
      newDateTime.setFullYear(selectedDate.getFullYear())
      newDateTime.setMonth(selectedDate.getMonth())
      newDateTime.setDate(selectedDate.getDate())
      setSelectedDateTime(newDateTime)
    }
  }

  const onTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(Platform.OS === 'ios')
    if (selectedTime) {
      const newDateTime = new Date(selectedDateTime)
      newDateTime.setHours(selectedTime.getHours())
      newDateTime.setMinutes(selectedTime.getMinutes())
      setSelectedDateTime(newDateTime)
    }
  }

  const valorTotal = servicosSelecionados.reduce((total, servicoId) => {
    const servico = servicos.find(s => s.id === servicoId)
    return total + (servico?.valor || 0)
  }, 0)

  return (
    <View style={styles.container}>
      <HeaderWithMenu title="Novo Agendamento" />
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Seção: Informações Básicas */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informações Básicas</Text>
          
          <FormField label="Cliente" required>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.clienteId}
                onValueChange={(value) => setFormData({ ...formData, clienteId: value })}
                style={styles.picker}
              >
                <Picker.Item label="Selecione um cliente" value={undefined} />
                {clientes.map((cliente) => (
                  <Picker.Item
                    key={cliente.id}
                    label={cliente.nome}
                    value={cliente.id}
                  />
                ))}
              </Picker>
            </View>
          </FormField>

          <FormField label="Unidade" required>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.unidadeId}
                onValueChange={handleUnidadeChange}
                style={styles.picker}
              >
                <Picker.Item label="Selecione uma unidade" value={undefined} />
                {unidades.map((unidade) => (
                  <Picker.Item
                    key={unidade.id}
                    label={unidade.nome}
                    value={unidade.id}
                  />
                ))}
              </Picker>
            </View>
          </FormField>

          {formData.unidadeId && (
            <FormField label="Atendente" required>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.atendenteId}
                  onValueChange={(value) => setFormData({ ...formData, atendenteId: value })}
                  style={styles.picker}
                >
                  <Picker.Item label="Selecione um atendente" value={undefined} />
                  {atendentes.map((atendente) => (
                    <Picker.Item
                      key={atendente.id}
                      label={atendente.nomeUsuario || `Atendente ${atendente.id}`}
                      value={atendente.id}
                    />
                  ))}
                </Picker>
              </View>
            </FormField>
          )}
        </View>

        {/* Seção: Data e Hora */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data e Hora</Text>
          
          <FormField label="Data" required>
            <TouchableOpacity
              style={styles.dateTimeButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={20} color="#6b7280" />
              <Text style={styles.dateTimeText}>
                {format(selectedDateTime, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>
          </FormField>

          <FormField label="Hora" required>
            <TouchableOpacity
              style={styles.dateTimeButton}
              onPress={() => setShowTimePicker(true)}
            >
              <Ionicons name="time-outline" size={20} color="#6b7280" />
              <Text style={styles.dateTimeText}>
                {format(selectedDateTime, "HH:mm", { locale: ptBR })}
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>
          </FormField>

          {showDatePicker && (
            <DateTimePicker
              value={selectedDateTime}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onDateChange}
              minimumDate={new Date()}
              locale="pt-BR"
            />
          )}

          {showTimePicker && (
            <DateTimePicker
              value={selectedDateTime}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onTimeChange}
              locale="pt-BR"
            />
          )}
        </View>

        {/* Seção: Serviços */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Serviços</Text>
          <Text style={styles.sectionSubtitle}>Selecione um ou mais serviços</Text>
          
          {servicos.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="medical-outline" size={48} color="#d1d5db" />
              <Text style={styles.emptyText}>Nenhum serviço disponível</Text>
            </View>
          ) : (
            <View style={styles.servicosGrid}>
              {servicos.map((servico) => {
                const isSelected = servicosSelecionados.includes(servico.id!)
                return (
                  <TouchableOpacity
                    key={servico.id}
                    style={[styles.servicoCard, isSelected && styles.servicoCardSelected]}
                    onPress={() => handleServicoToggle(servico.id!)}
                  >
                    <View style={styles.servicoHeader}>
                      <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                        {isSelected && (
                          <Ionicons name="checkmark" size={16} color="#ffffff" />
                        )}
                      </View>
                      <View style={styles.servicoInfo}>
                        <Text style={[styles.servicoNome, isSelected && styles.servicoNomeSelected]}>
                          {servico.nome}
                        </Text>
                        <Text style={styles.servicoDetalhes}>
                          {servico.duracaoMinutos} min • R$ {servico.valor.toFixed(2)}
                        </Text>
                      </View>
                    </View>
                    {servico.descricao && (
                      <Text style={styles.servicoDescricao} numberOfLines={2}>
                        {servico.descricao}
                      </Text>
                    )}
                  </TouchableOpacity>
                )
              })}
            </View>
          )}

          {servicosSelecionados.length > 0 && (
            <View style={styles.resumoCard}>
              <Text style={styles.resumoTitle}>Resumo</Text>
              <View style={styles.resumoRow}>
                <Text style={styles.resumoLabel}>Total de serviços:</Text>
                <Text style={styles.resumoValue}>{servicosSelecionados.length}</Text>
              </View>
              <View style={styles.resumoRow}>
                <Text style={styles.resumoLabel}>Valor total:</Text>
                <Text style={styles.resumoTotal}>R$ {valorTotal.toFixed(2)}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Seção: Observações */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Observações</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Adicione observações sobre o agendamento (opcional)"
            value={formData.observacoes || ''}
            onChangeText={(text) => setFormData({ ...formData, observacoes: text })}
            multiline
            numberOfLines={4}
            placeholderTextColor="#9ca3af"
          />
        </View>

        {/* Botões de Ação */}
        <View style={styles.buttonContainer}>
          <Button
            variant="secondary"
            onPress={() => router.back()}
            style={styles.cancelButton}
          >
            Cancelar
          </Button>
          <Button
            onPress={handleSubmit}
            isLoading={createMutation.isPending}
            disabled={createMutation.isPending}
            style={styles.submitButton}
          >
            {createMutation.isPending ? 'Salvando...' : 'Criar Agendamento'}
          </Button>
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
  scrollContent: {
    paddingBottom: 32,
  },
  section: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 14,
    backgroundColor: '#ffffff',
    gap: 12,
  },
  dateTimeText: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  servicosGrid: {
    gap: 12,
  },
  servicoCard: {
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#ffffff',
  },
  servicoCardSelected: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  servicoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  checkboxSelected: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  servicoInfo: {
    flex: 1,
  },
  servicoNome: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  servicoNomeSelected: {
    color: '#2563eb',
  },
  servicoDetalhes: {
    fontSize: 14,
    color: '#6b7280',
  },
  servicoDescricao: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: '#9ca3af',
  },
  resumoCard: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  resumoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  resumoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  resumoLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  resumoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  resumoTotal: {
    fontSize: 18,
    fontWeight: '700',
    color: '#16a34a',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#ffffff',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
  },
  submitButton: {
    flex: 1,
  },
})
