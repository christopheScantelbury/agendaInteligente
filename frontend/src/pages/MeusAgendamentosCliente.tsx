import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, LogOut } from 'lucide-react'
import { clientePublicoService } from '../services/clientePublicoService'
import { useNotification } from '../contexts/NotificationContext'
import { useConfirm } from '../hooks/useConfirm'

export default function MeusAgendamentosCliente() {
  const navigate = useNavigate()
  const { showNotification } = useNotification()
  const { confirm, ConfirmComponent } = useConfirm()
  const [agendamentos, setAgendamentos] = useState<any[]>([])
  const [cancelamentos, setCancelamentos] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!clientePublicoService.isAuthenticated()) {
      navigate('/cliente/login')
      return
    }

    carregarAgendamentos()
  }, [navigate])

  const carregarAgendamentos = async () => {
    setLoading(true)

    try {
      const [ativos, historicoCancelamentos] = await Promise.all([
        clientePublicoService.meusAgendamentos(),
        clientePublicoService.meusCancelamentos(),
      ])

      setAgendamentos(ativos)
      setCancelamentos(historicoCancelamentos)
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Erro ao carregar agendamentos'
      showNotification('error', errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const cancelarAgendamento = async (id: number) => {
    confirm({
      message: 'Tem certeza que deseja cancelar este agendamento?',
      title: 'Confirmar Cancelamento',
      variant: 'warning',
      onConfirm: async () => {
        setLoading(true)

        try {
          await clientePublicoService.cancelarAgendamento(id)
          showNotification('success', 'Agendamento cancelado e movido para o histórico.')
          await carregarAgendamentos()
        } catch (error: any) {
          const errorMessage = error.response?.data?.message || 'Erro ao cancelar agendamento'
          showNotification('error', errorMessage)
        } finally {
          setLoading(false)
        }
      },
    })
  }

  const formatarDataHora = (dataHora: string) => {
    const date = new Date(dataHora)
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AGENDADO':
        return 'bg-gray-900 text-white'
      case 'CONFIRMADO':
      case 'EM_ANDAMENTO':
      case 'PROCEDIMENTO_FIM':
        return 'bg-blue-100 text-blue-800'
      case 'CANCELADO':
        return 'bg-red-100 text-red-800'
      case 'NO_SHOW':
        return 'bg-orange-100 text-orange-800'
      case 'CONCLUIDO':
      case 'FINALIZADO':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'EM_ANDAMENTO':
        return 'Em procedimento'
      case 'PROCEDIMENTO_FIM':
        return 'Procedimento finalizado'
      case 'NO_SHOW':
        return 'Não compareceu'
      default:
        return status
    }
  }

  const cliente = clientePublicoService.getCliente()
  const semDados = agendamentos.length === 0 && cancelamentos.length === 0

  const renderAgendamentoCard = (agendamento: any, mostrarAcaoCancelar: boolean) => (
    <div
      key={agendamento.id}
      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                agendamento.status
              )}`}
            >
              {getStatusLabel(agendamento.status)}
            </span>
          </div>
          <div className="text-sm text-gray-600 space-y-1">
            <div>
              <strong>Data/Hora:</strong> {formatarDataHora(agendamento.dataHoraInicio)}
            </div>
            {agendamento.unidade && (
              <div>
                <strong>Unidade:</strong> {agendamento.unidade.nome}
              </div>
            )}
            {agendamento.atendente && (
              <div>
                <strong>Atendente:</strong> {agendamento.atendente.usuario?.nome || agendamento.atendente.nome}
              </div>
            )}
            {agendamento.servicos && agendamento.servicos.length > 0 && (
              <div>
                <strong>Serviços:</strong>{' '}
                {agendamento.servicos
                  .map((s: any) => s.servico?.nome || s.descricao)
                  .join(', ')}
              </div>
            )}
            {agendamento.valorTotal && (
              <div>
                <strong>Valor:</strong> R$ {Number(agendamento.valorTotal).toFixed(2)}
              </div>
            )}
          </div>
        </div>
        {mostrarAcaoCancelar && agendamento.status === 'AGENDADO' && (
          <button
            onClick={() => cancelarAgendamento(agendamento.id)}
            disabled={loading}
            className="ml-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 text-sm"
          >
            Cancelar
          </button>
        )}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-gray-900 truncate">Meus Agendamentos</h1>
              {cliente && (
                <p className="text-sm text-gray-600 mt-1 truncate">Olá, {cliente.nome}</p>
              )}
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => navigate('/cliente/agendar')}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm transition text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                <span>Novo</span>
              </button>
              <button
                onClick={() => {
                  clientePublicoService.logout()
                  // window.location.href força re-mount pra re-avaliar guards
                  window.location.href = '/cliente/login'
                }}
                className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 hover:text-gray-800 transition text-sm font-medium"
                aria-label="Sair"
                title="Sair"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sair</span>
              </button>
            </div>
          </div>

          {loading && semDados ? (
            <div className="text-center py-8">Carregando...</div>
          ) : semDados ? (
            <div className="text-center py-8 text-gray-500">
              Você não possui agendamentos.
              <br />
              <button
                onClick={() => navigate('/cliente/agendar')}
                className="mt-4 text-indigo-600 hover:text-indigo-500"
              >
                Fazer um agendamento
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              <section className="space-y-3">
                <h2 className="text-lg font-semibold text-gray-900">Agendamentos ativos</h2>
                {agendamentos.length === 0 ? (
                  <p className="text-sm text-gray-500">Você não possui agendamentos ativos.</p>
                ) : (
                  <div className="space-y-4">
                    {agendamentos.map((agendamento) => renderAgendamentoCard(agendamento, true))}
                  </div>
                )}
              </section>

              <section className="space-y-3 border-t border-gray-100 pt-6">
                <h2 className="text-lg font-semibold text-gray-900">Histórico de cancelamentos</h2>
                {cancelamentos.length === 0 ? (
                  <p className="text-sm text-gray-500">Nenhum cancelamento registrado.</p>
                ) : (
                  <div className="space-y-4">
                    {cancelamentos.map((agendamento) => renderAgendamentoCard(agendamento, false))}
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </div>
      {ConfirmComponent}
    </div>
  )
}
