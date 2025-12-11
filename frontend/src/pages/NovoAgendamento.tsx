import { useQuery, useMutation } from 'react-query'
import { useNavigate } from 'react-router-dom'
import { agendamentoService, Agendamento } from '../services/agendamentoService'
import { clienteService } from '../services/clienteService'
import { servicoService } from '../services/servicoService'
import { unidadeService } from '../services/unidadeService'
import { atendenteService } from '../services/atendenteService'
import { useState } from 'react'

export default function NovoAgendamento() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState<Partial<Agendamento>>({
    clienteId: undefined,
    servicoId: undefined,
    unidadeId: undefined,
    atendenteId: undefined,
    dataHoraInicio: '',
    observacoes: '',
  })

  const { data: clientes = [] } = useQuery('clientes', clienteService.listar)
  const { data: servicos = [] } = useQuery('servicos', servicoService.listar)
  const { data: unidades = [] } = useQuery('unidades', unidadeService.listar)
  const { data: atendentes = [], refetch: refetchAtendentes } = useQuery(
    ['atendentes', formData.unidadeId],
    () => formData.unidadeId ? atendenteService.listarPorUnidade(formData.unidadeId!) : Promise.resolve([]),
    { enabled: !!formData.unidadeId }
  )

  const createMutation = useMutation(agendamentoService.criar, {
    onSuccess: () => {
      navigate('/agendamentos')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.clienteId && formData.servicoId && formData.unidadeId && formData.atendenteId && formData.dataHoraInicio) {
      createMutation.mutate({
        clienteId: formData.clienteId,
        servicoId: formData.servicoId,
        unidadeId: formData.unidadeId,
        atendenteId: formData.atendenteId,
        dataHoraInicio: formData.dataHoraInicio,
        observacoes: formData.observacoes,
      } as Agendamento)
    }
  }

  const handleUnidadeChange = (unidadeId: number) => {
    setFormData({ ...formData, unidadeId, atendenteId: undefined })
    refetchAtendentes()
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Novo Agendamento</h1>

      <div className="bg-white shadow rounded-lg p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Cliente</label>
            <select
              required
              value={formData.clienteId || ''}
              onChange={(e) =>
                setFormData({ ...formData, clienteId: parseInt(e.target.value) })
              }
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">Selecione um cliente</option>
              {clientes.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.nome} - {cliente.cpfCnpj}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Unidade</label>
            <select
              required
              value={formData.unidadeId || ''}
              onChange={(e) => handleUnidadeChange(parseInt(e.target.value))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">Selecione uma unidade</option>
              {unidades.map((unidade) => (
                <option key={unidade.id} value={unidade.id}>
                  {unidade.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Atendente</label>
            <select
              required
              value={formData.atendenteId || ''}
              onChange={(e) =>
                setFormData({ ...formData, atendenteId: parseInt(e.target.value) })
              }
              disabled={!formData.unidadeId}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100"
            >
              <option value="">Selecione um atendente</option>
              {atendentes.map((atendente) => (
                <option key={atendente.id} value={atendente.id}>
                  {atendente.nomeUsuario}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Serviço</label>
            <select
              required
              value={formData.servicoId || ''}
              onChange={(e) =>
                setFormData({ ...formData, servicoId: parseInt(e.target.value) })
              }
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">Selecione um serviço</option>
              {servicos
                .filter((s) => s.ativo)
                .map((servico) => (
                  <option key={servico.id} value={servico.id}>
                    {servico.nome} - R$ {servico.valor.toFixed(2)} ({servico.duracaoMinutos} min)
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Data e Hora de Início
            </label>
            <input
              type="datetime-local"
              required
              value={formData.dataHoraInicio}
              onChange={(e) => setFormData({ ...formData, dataHoraInicio: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Observações</label>
            <textarea
              value={formData.observacoes || ''}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              rows={4}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => navigate('/agendamentos')}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={createMutation.isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {createMutation.isLoading ? 'Salvando...' : 'Criar Agendamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

