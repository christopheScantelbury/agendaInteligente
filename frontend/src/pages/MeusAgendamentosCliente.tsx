import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, LogOut, CalendarCheck2 } from 'lucide-react'
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
      className="bg-white border border-slate-200 rounded-2xl p-4 hover:shadow-sm transition"
    >
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${getStatusColor(
                agendamento.status
              )}`}
            >
              {getStatusLabel(agendamento.status)}
            </span>
          </div>
          <div className="text-sm text-slate-600 space-y-1">
            <div>
              <span className="text-slate-500">Data/Hora:</span>{' '}
              <span className="font-semibold text-slate-900">{formatarDataHora(agendamento.dataHoraInicio)}</span>
            </div>
            {agendamento.unidade && (
              <div>
                <span className="text-slate-500">Unidade:</span> {agendamento.unidade.nome}
              </div>
            )}
            {agendamento.atendente && (
              <div>
                <span className="text-slate-500">Atendente:</span>{' '}
                {agendamento.atendente.usuario?.nome || agendamento.atendente.nome}
              </div>
            )}
            {agendamento.servicos && agendamento.servicos.length > 0 && (
              <div>
                <span className="text-slate-500">Serviços:</span>{' '}
                {agendamento.servicos
                  .map((s: any) => s.servico?.nome || s.descricao)
                  .join(', ')}
              </div>
            )}
            {agendamento.valorTotal && (
              <div>
                <span className="text-slate-500">Valor:</span>{' '}
                <span className="font-semibold text-slate-900">
                  R$ {Number(agendamento.valorTotal).toFixed(2).replace('.', ',')}
                </span>
              </div>
            )}
          </div>
        </div>
        {mostrarAcaoCancelar && agendamento.status === 'AGENDADO' && (
          <button
            onClick={() => cancelarAgendamento(agendamento.id)}
            disabled={loading}
            className="px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-xl hover:bg-red-100 disabled:opacity-50 text-xs font-semibold whitespace-nowrap"
          >
            Cancelar
          </button>
        )}
      </div>
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <CalendarCheck2 className="h-6 w-6 text-violet-600" />
            Meus Agendamentos
          </h1>
          {cliente && (
            <p className="text-sm text-slate-500 mt-0.5 truncate">Olá, {cliente.nome}</p>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => navigate('/cliente/agendar')}
            className="inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all bg-violet-600 text-white hover:bg-violet-700 shadow-sm shadow-violet-200 px-4 py-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Novo
          </button>
          <button
            onClick={() => {
              clientePublicoService.logout()
              window.location.href = '/cliente/login'
            }}
            className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 hover:text-slate-800 transition text-sm font-medium"
            aria-label="Sair"
            title="Sair"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </header>

      {loading && semDados ? (
        <div className="text-center py-8 text-slate-400">Carregando...</div>
      ) : semDados ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center mb-3">
            <CalendarCheck2 className="h-5 w-5" />
          </div>
          <p className="text-sm text-slate-600">Você não possui agendamentos ainda.</p>
          <button
            onClick={() => navigate('/cliente/agendar')}
            className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-violet-700 hover:text-violet-900"
          >
            <Plus className="h-4 w-4" />
            Fazer um agendamento
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              Agendamentos ativos
            </h2>
            {agendamentos.length === 0 ? (
              <p className="text-sm text-slate-500">Você não possui agendamentos ativos.</p>
            ) : (
              <ul className="space-y-2">
                {agendamentos.map((agendamento) => (
                  <li key={agendamento.id}>{renderAgendamentoCard(agendamento, true)}</li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-3 border-t border-slate-100 pt-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              Histórico de cancelamentos
            </h2>
            {cancelamentos.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhum cancelamento registrado.</p>
            ) : (
              <ul className="space-y-2">
                {cancelamentos.map((agendamento) => (
                  <li key={agendamento.id}>{renderAgendamentoCard(agendamento, false)}</li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
      {ConfirmComponent}
    </div>
  )
}
