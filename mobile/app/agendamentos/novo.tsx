import React, { useState, useEffect, useMemo } from 'react'
import { View, Text, StyleSheet, ScrollView, Alert, TextInput, TouchableOpacity, Platform, Modal } from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { router, useLocalSearchParams } from 'expo-router'
import DateTimePicker from '@react-native-community/datetimepicker'
import { agendamentoService, Agendamento } from '../../src/services/agendamentoService'
import { clienteService, Cliente } from '../../src/services/clienteService'
import { servicoService, Servico } from '../../src/services/servicoService'
import { unidadeService } from '../../src/services/unidadeService'
import { atendenteService } from '../../src/services/atendenteService'
import { authService } from '../../src/services/authService'
import Button from '../../src/components/Button'
import FormField from '../../src/components/FormField'
import HeaderWithMenu from '../../src/components/HeaderWithMenu'
import RecorrenciaConfig, { RecorrenciaConfig as RecorrenciaConfigType } from '../../src/components/RecorrenciaConfig'
import { Picker } from '@react-native-picker/picker'
import { Ionicons } from '@expo/vector-icons'
import { format, parseISO, isBefore } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function NovoAgendamentoScreen() {
  const params = useLocalSearchParams()
  const queryClient = useQueryClient()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [usuario, setUsuario] = useState<{ perfil?: string; unidadeId?: number; usuarioId?: number } | null>(null)

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
  const [buscaCliente, setBuscaCliente] = useState('')
  const [buscaServico, setBuscaServico] = useState('')
  const [mostrarModalCliente, setMostrarModalCliente] = useState(false)
  const [mostrarModalServico, setMostrarModalServico] = useState(false)
  const [recorrenciaConfig, setRecorrenciaConfig] = useState<RecorrenciaConfigType>({
    recorrente: false,
  })

  useEffect(() => {
    checkAuth()
    loadUsuario()
  }, [])

  const loadUsuario = async () => {
    const usuarioData = await authService.getUsuario()
    setUsuario(usuarioData)
  }

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

  const clientesFiltrados = useMemo(() => {
    if (!buscaCliente) return clientes
    const buscaLower = buscaCliente.toLowerCase()
    return clientes.filter(c => 
      c.nome.toLowerCase().includes(buscaLower) || 
      c.cpfCnpj.includes(buscaCliente)
    )
  }, [clientes, buscaCliente])

  const servicosFiltrados = useMemo(() => {
    if (!buscaServico) return servicos.filter(s => s.ativo)
    const buscaLower = buscaServico.toLowerCase()
    return servicos.filter(s => 
      s.ativo && (
        s.nome.toLowerCase().includes(buscaLower) ||
        s.descricao?.toLowerCase().includes(buscaLower)
      )
    )
  }, [servicos, buscaServico])

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      dataHoraInicio: format(selectedDateTime, "yyyy-MM-dd'T'HH:mm"),
    }))
  }, [selectedDateTime])

  const perfil = usuario?.perfil

  const { data: todasUnidades = [] } = useQuery({
    queryKey: ['unidades'],
    queryFn: unidadeService.listarTodos,
    enabled: isAuthenticated,
  })

  const unidadesFiltradas = useMemo(() => {
    if (perfil === 'ADMIN') {
      return todasUnidades
    }
    if (perfil === 'GERENTE' && usuario?.unidadeId) {
      return todasUnidades.filter(u => u.id === usuario.unidadeId)
    }
    if ((perfil === 'PROFISSIONAL' || perfil === 'ATENDENTE') && usuario?.unidadeId) {
      return todasUnidades.filter(u => u.id === usuario.unidadeId)
    }
    return todasUnidades
  }, [todasUnidades, perfil, usuario?.unidadeId])

  const { data: todosAtendentes = [], refetch: refetchAtendentes } = useQuery({
    queryKey: ['atendentes', formData.unidadeId],
    queryFn: () => formData.unidadeId ? atendenteService.listarPorUnidade(formData.unidadeId!) : Promise.resolve([]),
    enabled: !!formData.unidadeId && isAuthenticated,
  })

  const atendentesFiltrados = useMemo(() => {
    if (perfil === 'ADMIN' || perfil === 'GERENTE') {
      return todosAtendentes
    }
    if ((perfil === 'PROFISSIONAL' || perfil === 'ATENDENTE') && usuario?.usuarioId) {
      return todosAtendentes.filter(a => a.usuarioId === usuario.usuarioId)
    }
    return todosAtendentes
  }, [todosAtendentes, perfil, usuario?.usuarioId])

  // Auto-selecionar unidade e atendente para PROFISSIONAL
  useEffect(() => {
    if ((perfil === 'PROFISSIONAL' || perfil === 'ATENDENTE') && usuario?.unidadeId && unidadesFiltradas.length > 0) {
      setFormData(prev => ({
        ...prev,
        unidadeId: prev.unidadeId || usuario.unidadeId
      }))
    }
  }, [perfil, usuario?.unidadeId, unidadesFiltradas])

  useEffect(() => {
    if ((perfil === 'PROFISSIONAL' || perfil === 'ATENDENTE') && atendentesFiltrados.length > 0) {
      const meuAtendente = atendentesFiltrados.find(a => a.usuarioId === usuario?.usuarioId)
      if (meuAtendente) {
        setFormData(prev => ({
          ...prev,
          atendenteId: prev.atendenteId || meuAtendente.id
        }))
      }
    }
  }, [perfil, atendentesFiltrados, usuario?.usuarioId])

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

    // Validar se a data não está no passado
    const dataSelecionada = parseISO(formData.dataHoraInicio)
    const agora = new Date()
    
    if (isBefore(dataSelecionada, agora)) {
      Alert.alert('Atenção', 'A data/hora selecionada não pode ser no passado. Por favor, selecione uma data futura.')
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

    const payload: any = {
      clienteId: formData.clienteId,
      unidadeId: formData.unidadeId,
      atendenteId: formData.atendenteId,
      dataHoraInicio: formData.dataHoraInicio,
      observacoes: formData.observacoes,
      servicos: servicosParaEnvio,
    }

    // Adiciona configuração de recorrência se estiver habilitada
    if (recorrenciaConfig.recorrente) {
      // Validação para recorrência semanal
      if (recorrenciaConfig.tipoRecorrencia === 'SEMANAL' && 
          (!recorrenciaConfig.diasDaSemana || recorrenciaConfig.diasDaSemana.length === 0)) {
        Alert.alert('Erro', 'Selecione pelo menos um dia da semana para recorrência semanal')
        return
      }

      // Validação para término por data
      if (recorrenciaConfig.tipoTermino === 'DATA' && !recorrenciaConfig.dataTermino) {
        Alert.alert('Erro', 'Informe a data de término para a recorrência')
        return
      }

      // Validação para término por ocorrências
      if (recorrenciaConfig.tipoTermino === 'OCORRENCIAS' && 
          (!recorrenciaConfig.numeroOcorrencias || recorrenciaConfig.numeroOcorrencias < 1)) {
        Alert.alert('Erro', 'Informe o número de ocorrências (mínimo 1)')
        return
      }

      payload.recorrencia = {
        recorrente: true,
        tipoRecorrencia: recorrenciaConfig.tipoRecorrencia,
        diasDaSemana: recorrenciaConfig.diasDaSemana,
        tipoTermino: recorrenciaConfig.tipoTermino,
        dataTermino: recorrenciaConfig.dataTermino,
        numeroOcorrencias: recorrenciaConfig.numeroOcorrencias,
        intervalo: recorrenciaConfig.intervalo || 1,
      }
    }

    createMutation.mutate(payload as Agendamento)
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
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#6b7280" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar cliente por nome ou CPF/CNPJ..."
                value={buscaCliente}
                onChangeText={setBuscaCliente}
                placeholderTextColor="#9ca3af"
              />
              {buscaCliente ? (
                <TouchableOpacity onPress={() => setBuscaCliente('')}>
                  <Ionicons name="close-circle" size={20} color="#6b7280" />
                </TouchableOpacity>
              ) : null}
            </View>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.clienteId}
                onValueChange={(value) => setFormData({ ...formData, clienteId: value })}
                style={styles.picker}
              >
                <Picker.Item label="Selecione um cliente" value={undefined} />
                {clientesFiltrados.map((cliente) => (
                  <Picker.Item
                    key={cliente.id}
                    label={`${cliente.nome} - ${cliente.cpfCnpj}`}
                    value={cliente.id}
                  />
                ))}
              </Picker>
            </View>
            {clientesFiltrados.length === 0 && buscaCliente && (
              <View style={styles.notFoundContainer}>
                <Text style={styles.notFoundText}>Cliente não encontrado</Text>
                <Button
                  onPress={() => setMostrarModalCliente(true)}
                  style={styles.addButton}
                >
                  <Ionicons name="add" size={16} color="#ffffff" />
                  <Text style={styles.addButtonText}>Adicionar Novo</Text>
                </Button>
              </View>
            )}
          </FormField>

          <FormField label="Unidade" required>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.unidadeId}
                onValueChange={handleUnidadeChange}
                style={styles.picker}
              >
                <Picker.Item label="Selecione uma unidade" value={undefined} />
                {unidadesFiltradas.map((unidade) => (
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
                  {atendentesFiltrados.map((atendente) => (
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
          
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#6b7280" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar serviço por nome..."
              value={buscaServico}
              onChangeText={setBuscaServico}
              placeholderTextColor="#9ca3af"
            />
            {buscaServico ? (
              <TouchableOpacity onPress={() => setBuscaServico('')}>
                <Ionicons name="close-circle" size={20} color="#6b7280" />
              </TouchableOpacity>
            ) : null}
          </View>
          
          {servicosFiltrados.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="medical-outline" size={48} color="#d1d5db" />
              <Text style={styles.emptyText}>
                {buscaServico ? 'Serviço não encontrado' : 'Nenhum serviço disponível'}
              </Text>
              {buscaServico && (
                <Button
                  onPress={() => setMostrarModalServico(true)}
                  style={styles.addButton}
                >
                  <Ionicons name="add" size={16} color="#ffffff" />
                  <Text style={styles.addButtonText}>Adicionar Novo</Text>
                </Button>
              )}
            </View>
          ) : (
            <View style={styles.servicosGrid}>
              {servicosFiltrados.map((servico) => {
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

        {/* Seção: Recorrência */}
        <View style={styles.section}>
          <RecorrenciaConfig
            value={recorrenciaConfig}
            onChange={setRecorrenciaConfig}
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

      {/* Modal de Criar Cliente */}
      <Modal
        visible={mostrarModalCliente}
        transparent
        animationType="slide"
        onRequestClose={() => setMostrarModalCliente(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Novo Cliente</Text>
              <TouchableOpacity onPress={() => setMostrarModalCliente(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <ClienteForm
              onClose={() => setMostrarModalCliente(false)}
              onSuccess={(cliente) => {
                setFormData({ ...formData, clienteId: cliente.id })
                setMostrarModalCliente(false)
                setBuscaCliente('')
              }}
            />
          </View>
        </View>
      </Modal>

      {/* Modal de Criar Serviço */}
      <Modal
        visible={mostrarModalServico}
        transparent
        animationType="slide"
        onRequestClose={() => setMostrarModalServico(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Novo Serviço</Text>
              <TouchableOpacity onPress={() => setMostrarModalServico(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <ServicoForm
              onClose={() => setMostrarModalServico(false)}
              onSuccess={(servico) => {
                setServicosSelecionados([...servicosSelecionados, servico.id])
                setMostrarModalServico(false)
                setBuscaServico('')
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  )
}

function ClienteForm({ onClose, onSuccess }: { onClose: () => void; onSuccess: (cliente: Cliente) => void }) {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState<Cliente>({
    nome: '',
    cpfCnpj: '',
    email: '',
    telefone: '',
  })

  const saveMutation = useMutation({
    mutationFn: clienteService.criar,
    onSuccess: (cliente) => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] })
      Alert.alert('Sucesso', 'Cliente criado com sucesso!')
      onSuccess(cliente)
    },
    onError: (error: any) => {
      Alert.alert('Erro', error.response?.data?.message || 'Erro ao criar cliente')
    },
  })

  const handleSubmit = () => {
    if (!formData.nome || !formData.cpfCnpj) {
      Alert.alert('Atenção', 'Preencha os campos obrigatórios')
      return
    }
    saveMutation.mutate(formData)
  }

  return (
    <ScrollView style={styles.modalBody}>
      <FormField label="Nome" required>
        <TextInput
          style={styles.input}
          value={formData.nome}
          onChangeText={(text) => setFormData({ ...formData, nome: text })}
          placeholder="Nome do cliente"
        />
      </FormField>
      <FormField label="CPF/CNPJ" required>
        <TextInput
          style={styles.input}
          value={formData.cpfCnpj}
          onChangeText={(text) => setFormData({ ...formData, cpfCnpj: text })}
          placeholder="CPF ou CNPJ"
        />
      </FormField>
      <FormField label="Email">
        <TextInput
          style={styles.input}
          value={formData.email || ''}
          onChangeText={(text) => setFormData({ ...formData, email: text })}
          placeholder="Email (opcional)"
          keyboardType="email-address"
        />
      </FormField>
      <FormField label="Telefone">
        <TextInput
          style={styles.input}
          value={formData.telefone || ''}
          onChangeText={(text) => setFormData({ ...formData, telefone: text })}
          placeholder="Telefone (opcional)"
          keyboardType="phone-pad"
        />
      </FormField>
      <View style={styles.modalFooter}>
        <Button variant="secondary" onPress={onClose} style={styles.modalButton}>
          Cancelar
        </Button>
        <Button onPress={handleSubmit} isLoading={saveMutation.isPending} style={styles.modalButton}>
          Salvar
        </Button>
      </View>
    </ScrollView>
  )
}

function ServicoForm({ onClose, onSuccess }: { onClose: () => void; onSuccess: (servico: Servico) => void }) {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState<Servico>({
    id: 0,
    nome: '',
    descricao: '',
    valor: 0,
    duracaoMinutos: 30,
    ativo: true,
  })

  const saveMutation = useMutation({
    mutationFn: servicoService.criar,
    onSuccess: (servico) => {
      queryClient.invalidateQueries({ queryKey: ['servicos'] })
      Alert.alert('Sucesso', 'Serviço criado com sucesso!')
      onSuccess(servico)
    },
    onError: (error: any) => {
      Alert.alert('Erro', error.response?.data?.message || 'Erro ao criar serviço')
    },
  })

  const handleSubmit = () => {
    if (!formData.nome || formData.valor <= 0) {
      Alert.alert('Atenção', 'Preencha os campos obrigatórios')
      return
    }
    saveMutation.mutate(formData)
  }

  return (
    <ScrollView style={styles.modalBody}>
      <FormField label="Nome" required>
        <TextInput
          style={styles.input}
          value={formData.nome}
          onChangeText={(text) => setFormData({ ...formData, nome: text })}
          placeholder="Nome do serviço"
        />
      </FormField>
      <FormField label="Descrição">
        <TextInput
          style={[styles.input, styles.textArea]}
          value={formData.descricao || ''}
          onChangeText={(text) => setFormData({ ...formData, descricao: text })}
          placeholder="Descrição (opcional)"
          multiline
          numberOfLines={3}
        />
      </FormField>
      <View style={styles.row}>
        <View style={styles.halfField}>
          <FormField label="Valor (R$)" required>
            <TextInput
              style={styles.input}
              value={formData.valor.toString()}
              onChangeText={(text) => setFormData({ ...formData, valor: parseFloat(text) || 0 })}
              placeholder="0.00"
              keyboardType="decimal-pad"
            />
          </FormField>
        </View>
        <View style={styles.halfField}>
          <FormField label="Duração (min)" required>
            <TextInput
              style={styles.input}
              value={formData.duracaoMinutos.toString()}
              onChangeText={(text) => setFormData({ ...formData, duracaoMinutos: parseInt(text) || 30 })}
              placeholder="30"
              keyboardType="number-pad"
            />
          </FormField>
        </View>
      </View>
      <View style={styles.modalFooter}>
        <Button variant="secondary" onPress={onClose} style={styles.modalButton}>
          Cancelar
        </Button>
        <Button onPress={handleSubmit} isLoading={saveMutation.isPending} style={styles.modalButton}>
          Salvar
        </Button>
      </View>
    </ScrollView>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    marginBottom: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  notFoundContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde047',
    borderRadius: 8,
    marginTop: 8,
  },
  notFoundText: {
    fontSize: 14,
    color: '#92400e',
    flex: 1,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  modalBody: {
    padding: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  modalButton: {
    flex: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#ffffff',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfField: {
    flex: 1,
  },
})
