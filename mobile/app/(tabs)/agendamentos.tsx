import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Alert } from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { router } from 'expo-router'
import { Calendar } from 'react-native-calendars'
import { agendamentoService, Agendamento } from '../../src/services/agendamentoService'
import { authService } from '../../src/services/authService'
import { format, parseISO, startOfDay, isSameDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Button from '../../src/components/Button'
import HeaderWithMenu from '../../src/components/HeaderWithMenu'
import { Ionicons } from '@expo/vector-icons'

export default function Agendamentos() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'))
  const [showModal, setShowModal] = useState(false)
  const [selectedAgendamento, setSelectedAgendamento] = useState<Agendamento | null>(null)

  const queryClient = useQueryClient()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const authenticated = await authService.isAuthenticated()
    setIsAuthenticated(authenticated)
  }

  const { data: agendamentos = [], isLoading } = useQuery({
    queryKey: ['agendamentos'],
    queryFn: agendamentoService.listar,
    retry: false,
    enabled: isAuthenticated,
  })

  // Função auxiliar para obter cor do status (definida antes do useMemo)
  const getStatusColor = (status?: string): string => {
    switch (status) {
      case 'CONFIRMADO':
        return '#16a34a'
      case 'CANCELADO':
        return '#dc2626'
      case 'FINALIZADO':
        return '#2563eb'
      default:
        return '#f59e0b'
    }
  }

  // Preparar dados do calendário
  const markedDates = React.useMemo(() => {
    const marked: any = {}
    
    agendamentos.forEach((agendamento) => {
      if (agendamento.dataHoraInicio) {
        const date = format(parseISO(agendamento.dataHoraInicio), 'yyyy-MM-dd')
        if (!marked[date]) {
          marked[date] = {
            marked: true,
            dots: [],
            selected: date === selectedDate,
          }
        }
        
        // Adicionar dot colorido baseado no status
        const statusColor = getStatusColor(agendamento.status)
        marked[date].dots.push({
          color: statusColor,
          selectedDotColor: statusColor,
        })
      }
    })

    // Marcar data selecionada
    if (selectedDate && !marked[selectedDate]) {
      marked[selectedDate] = {
        selected: true,
        selectedColor: '#2563eb',
      }
    } else if (marked[selectedDate]) {
      marked[selectedDate].selected = true
      marked[selectedDate].selectedColor = '#2563eb'
    }

    return marked
  }, [agendamentos, selectedDate])

  // Filtrar agendamentos do dia selecionado
  const agendamentosDoDia = React.useMemo(() => {
    if (!selectedDate) return []
    return agendamentos.filter((agendamento) => {
      if (!agendamento.dataHoraInicio) return false
      const date = format(parseISO(agendamento.dataHoraInicio), 'yyyy-MM-dd')
      return date === selectedDate
    })
  }, [agendamentos, selectedDate])

  const getStatusLabel = (status?: string): string => {
    switch (status) {
      case 'CONFIRMADO':
        return 'Confirmado'
      case 'CANCELADO':
        return 'Cancelado'
      case 'FINALIZADO':
        return 'Finalizado'
      default:
        return 'Pendente'
    }
  }

  const handleDateSelect = (day: any) => {
    setSelectedDate(day.dateString)
  }

  const handleAgendamentoPress = (agendamento: Agendamento) => {
    setSelectedAgendamento(agendamento)
    setShowModal(true)
  }

  const cancelMutation = useMutation({
    mutationFn: (id: number) => agendamentoService.cancelar(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] })
      Alert.alert('Sucesso', 'Agendamento cancelado com sucesso!')
      setShowModal(false)
    },
    onError: (error: any) => {
      Alert.alert('Erro', error.response?.data?.message || 'Erro ao cancelar agendamento')
    },
  })

  const handleCancelar = () => {
    if (!selectedAgendamento?.id) return
    Alert.alert(
      'Confirmar Cancelamento',
      'Tem certeza que deseja cancelar este agendamento?',
      [
        { text: 'Não', style: 'cancel' },
        {
          text: 'Sim',
          style: 'destructive',
          onPress: () => cancelMutation.mutate(selectedAgendamento.id!),
        },
      ]
    )
  }

  return (
    <View style={styles.container}>
      <HeaderWithMenu title="Agendamentos" />
      
      <ScrollView style={styles.scrollView}>
        {/* Calendário */}
        <View style={styles.calendarContainer}>
          <Calendar
            current={selectedDate}
            onDayPress={handleDateSelect}
            markedDates={markedDates}
            markingType="multi-dot"
            theme={{
              backgroundColor: '#ffffff',
              calendarBackground: '#ffffff',
              textSectionTitleColor: '#6b7280',
              selectedDayBackgroundColor: '#2563eb',
              selectedDayTextColor: '#ffffff',
              todayTextColor: '#2563eb',
              dayTextColor: '#111827',
              textDisabledColor: '#d1d5db',
              dotColor: '#2563eb',
              selectedDotColor: '#ffffff',
              arrowColor: '#2563eb',
              monthTextColor: '#111827',
              textDayFontWeight: '500',
              textMonthFontWeight: 'bold',
              textDayHeaderFontWeight: '600',
              textDayFontSize: 14,
              textMonthFontSize: 16,
              textDayHeaderFontSize: 12,
            }}
            locale="ptBR"
            firstDay={1} // Segunda-feira
            enableSwipeMonths
          />
        </View>

        {/* Agendamentos do dia selecionado */}
        <View style={styles.agendamentosContainer}>
          <Text style={styles.sectionTitle}>
            {format(parseISO(selectedDate), "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </Text>
          
          {isLoading ? (
            <Text style={styles.loading}>Carregando...</Text>
          ) : agendamentosDoDia.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={48} color="#d1d5db" />
              <Text style={styles.emptyText}>Nenhum agendamento neste dia</Text>
            </View>
          ) : (
            agendamentosDoDia.map((agendamento) => (
              <TouchableOpacity
                key={agendamento.id}
                style={styles.card}
                onPress={() => handleAgendamentoPress(agendamento)}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>
                    {agendamento.cliente?.nome || 'Cliente não informado'}
                  </Text>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(agendamento.status) },
                    ]}
                  >
                    <Text style={styles.statusText}>
                      {getStatusLabel(agendamento.status)}
                    </Text>
                  </View>
                </View>
                <Text style={styles.cardTime}>
                  {format(parseISO(agendamento.dataHoraInicio), 'HH:mm', { locale: ptBR })}
                </Text>
                {agendamento.atendente?.nome && (
                  <Text style={styles.cardText}>
                    Atendente: {agendamento.atendente.nome}
                  </Text>
                )}
                {agendamento.servicos && agendamento.servicos.length > 0 && (
                  <Text style={styles.cardText}>
                    Serviços: {agendamento.servicos.map((s) => s.descricao || 'Serviço').join(', ')}
                  </Text>
                )}
                {agendamento.valorTotal && (
                  <Text style={styles.cardValue}>R$ {agendamento.valorTotal.toFixed(2)}</Text>
                )}
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Botão Novo Agendamento */}
        <View style={styles.fabContainer}>
          <Button
            onPress={() => router.push('/agendamentos/novo')}
            style={styles.fab}
          >
            <Ionicons name="add" size={24} color="#ffffff" style={styles.fabIcon} />
            <Text style={styles.fabText}>Novo Agendamento</Text>
          </Button>
        </View>
      </ScrollView>

      {/* Modal de Detalhes */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detalhes do Agendamento</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {selectedAgendamento && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Cliente:</Text>
                  <Text style={styles.modalValue}>
                    {selectedAgendamento.cliente?.nome || 'Não informado'}
                  </Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Data/Hora:</Text>
                  <Text style={styles.modalValue}>
                    {format(
                      parseISO(selectedAgendamento.dataHoraInicio),
                      "dd/MM/yyyy 'às' HH:mm",
                      { locale: ptBR }
                    )}
                  </Text>
                </View>
                {selectedAgendamento.atendente?.nome && (
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Atendente:</Text>
                    <Text style={styles.modalValue}>{selectedAgendamento.atendente.nome}</Text>
                  </View>
                )}
                {selectedAgendamento.servicos && selectedAgendamento.servicos.length > 0 && (
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Serviços:</Text>
                    <Text style={styles.modalValue}>
                      {selectedAgendamento.servicos.map((s) => s.descricao || 'Serviço').join(', ')}
                    </Text>
                  </View>
                )}
                {selectedAgendamento.valorTotal && (
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Valor Total:</Text>
                    <Text style={styles.modalValue}>R$ {selectedAgendamento.valorTotal.toFixed(2)}</Text>
                  </View>
                )}
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Status:</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(selectedAgendamento.status) },
                    ]}
                  >
                    <Text style={styles.statusText}>
                      {getStatusLabel(selectedAgendamento.status)}
                    </Text>
                  </View>
                </View>
                {selectedAgendamento.observacoes && (
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Observações:</Text>
                    <Text style={styles.modalValue}>{selectedAgendamento.observacoes}</Text>
                  </View>
                )}
              </ScrollView>
            )}

            <View style={styles.modalFooter}>
              {selectedAgendamento?.status !== 'CANCELADO' &&
                selectedAgendamento?.status !== 'FINALIZADO' && (
                  <Button
                    variant="danger"
                    onPress={handleCancelar}
                    isLoading={cancelMutation.isPending}
                    style={styles.modalButton}
                  >
                    Cancelar Agendamento
                  </Button>
                )}
              <Button
                variant="secondary"
                onPress={() => setShowModal(false)}
                style={styles.modalButton}
              >
                Fechar
              </Button>
            </View>
          </View>
        </View>
      </Modal>
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
  calendarContainer: {
    backgroundColor: '#ffffff',
    margin: 16,
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  agendamentosContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
    textTransform: 'capitalize',
  },
  loading: {
    textAlign: 'center',
    marginTop: 32,
    color: '#6b7280',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  cardTime: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 4,
  },
  cardText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#16a34a',
    marginTop: 8,
  },
  fabContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabIcon: {
    marginRight: 8,
  },
  fabText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
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
  modalRow: {
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
  },
  modalValue: {
    fontSize: 16,
    color: '#111827',
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 12,
  },
  modalButton: {
    width: '100%',
  },
})
