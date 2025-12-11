import { useQuery, useMutation, useQueryClient } from 'react-query'
import { agendamentoService, Agendamento } from '../services/agendamentoService'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Link } from 'react-router-dom'
import { Plus, X, CheckCircle } from 'lucide-react'
import { useState } from 'react'

export default function Agendamentos() {
  const queryClient = useQueryClient()
  const [finalizarModal, setFinalizarModal] = useState<{ agendamento: Agendamento; valor: string } | null>(null)

  const { data: agendamentos = [], isLoading } = useQuery(
    'agendamentos',
    agendamentoService.listar
  )

  const cancelMutation = useMutation(agendamentoService.cancelar, {
    onSuccess: () => {
      queryClient.invalidateQueries('agendamentos')
    },
  })

  const finalizarMutation = useMutation(
    ({ id, valorFinal }: { id: number; valorFinal: number }) =>
      agendamentoService.finalizar(id, valorFinal),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('agendamentos')
        setFinalizarModal(null)
        alert('Agendamento finalizado! A nota fiscal será emitida automaticamente.')
      },
    }
  )

  const handleCancelar = (id: number) => {
    if (confirm('Tem certeza que deseja cancelar este agendamento?')) {
      cancelMutation.mutate(id)
    }
  }

  const handleFinalizar = (agendamento: Agendamento) => {
    setFinalizarModal({ agendamento, valor: '' })
  }

  const confirmarFinalizar = () => {
    if (!finalizarModal) return
    const valor = parseFloat(finalizarModal.valor.replace(',', '.'))
    if (isNaN(valor) || valor <= 0) {
      alert('Por favor, informe um valor válido')
      return
    }
    finalizarMutation.mutate({ id: finalizarModal.agendamento.id!, valorFinal: valor })
  }

  if (isLoading) {
    return <div className="text-center py-8">Carregando...</div>
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Agendamentos</h1>
        <Link
          to="/agendamentos/novo"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
        >
          <Plus className="h-5 w-5 mr-2" />
          Novo Agendamento
        </Link>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {agendamentos.map((agendamento) => (
            <li key={agendamento.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {agendamento.cliente?.nome || 'Cliente não informado'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {agendamento.servico?.nome || 'Serviço não informado'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {format(new Date(agendamento.dataHoraInicio), "dd/MM/yyyy 'às' HH:mm", {
                      locale: ptBR,
                    })}
                  </p>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-2 ${
                      agendamento.status === 'CONCLUIDO'
                        ? 'bg-green-100 text-green-800'
                        : agendamento.status === 'CANCELADO'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {agendamento.status}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  {agendamento.status !== 'CANCELADO' && agendamento.status !== 'CONCLUIDO' && (
                    <>
                      <button
                        onClick={() => handleFinalizar(agendamento)}
                        className="text-green-600 hover:text-green-800"
                        title="Finalizar"
                      >
                        <CheckCircle className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleCancelar(agendamento.id!)}
                        className="text-red-600 hover:text-red-800"
                        title="Cancelar"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {finalizarModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">Finalizar Agendamento</h2>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Cliente: <strong>{finalizarModal.agendamento.cliente?.nome}</strong>
              </p>
              <p className="text-sm text-gray-600 mb-2">
                Serviço: <strong>{finalizarModal.agendamento.servico?.nome}</strong>
              </p>
              <p className="text-sm text-gray-600">
                Valor sugerido: <strong>R$ {finalizarModal.agendamento.valorTotal?.toFixed(2)}</strong>
              </p>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Valor Final (R$)
              </label>
              <input
                type="text"
                value={finalizarModal.valor}
                onChange={(e) =>
                  setFinalizarModal({ ...finalizarModal, valor: e.target.value })
                }
                placeholder="0,00"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setFinalizarModal(null)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarFinalizar}
                disabled={finalizarMutation.isLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {finalizarMutation.isLoading ? 'Finalizando...' : 'Finalizar e Emitir NFS-e'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

