import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { clientePublicoService } from '../services/clientePublicoService'
import { useNotification } from '../contexts/NotificationContext'
import { useConfirm } from '../hooks/useConfirm'

export default function MeusAgendamentosCliente() {
  const navigate = useNavigate()
  const { showNotification } = useNotification()
  const { confirm, ConfirmComponent } = useConfirm()
  const [agendamentos, setAgendamentos] = useState<any[]>([])
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
      const dados = await clientePublicoService.meusAgendamentos()
      setAgendamentos(dados)
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
          showNotification('success', 'Agendamento cancelado com sucesso!')
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
        return 'bg-blue-100 text-blue-800'
      case 'CONFIRMADO':
        return 'bg-green-100 text-green-800'
      case 'CANCELADO':
        return 'bg-red-100 text-red-800'
      case 'CONCLUIDO':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const cliente = clientePublicoService.getCliente()

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Meus Agendamentos</h1>
              {cliente && (
                <p className="text-sm text-gray-600 mt-1">Olá, {cliente.nome}</p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => navigate('/cliente/agendar')}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Novo Agendamento
              </button>
              <button
                onClick={() => {
                  clientePublicoService.logout()
                  navigate('/cliente/login')
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Sair
              </button>
            </div>
          </div>

          {loading && agendamentos.length === 0 ? (
            <div className="text-center py-8">Carregando...</div>
          ) : agendamentos.length === 0 ? (
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
            <div className="space-y-4">
              {agendamentos.map((agendamento) => (
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
                          {agendamento.status}
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
                            <strong>Atendente:</strong> {agendamento.atendente.usuario?.nome}
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
                            <strong>Valor:</strong> R${' '}
                            {Number(agendamento.valorTotal).toFixed(2)}
                          </div>
                        )}
                      </div>
                    </div>
                    {agendamento.status === 'AGENDADO' && (
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
              ))}
            </div>
          )}
        </div>
      </div>
      {ConfirmComponent}
    </div>
  )
}

