import { useQuery, useMutation } from '@tanstack/react-query'
import { useNavigate, useLocation } from 'react-router-dom'
import { agendamentoService, Agendamento } from '../services/agendamentoService'
import { clienteService } from '../services/clienteService'
import { servicoService, Servico } from '../services/servicoService'
import { unidadeService } from '../services/unidadeService'
import { atendenteService } from '../services/atendenteService'
import { useState, useEffect, useMemo } from 'react'
import { useNotification } from '../contexts/NotificationContext'

export default function NovoAgendamento() {
  const navigate = useNavigate()
  const location = useLocation()
  const { showNotification } = useNotification()

  const [formData, setFormData] = useState<Partial<Agendamento>>({
    clienteId: undefined,
    unidadeId: undefined,
    atendenteId: undefined,
    dataHoraInicio: '',
    observacoes: '',
    servicos: [],
  })

  useEffect(() => {
    if (location.state) {
      const { dataHoraInicio, unidadeId } = location.state
      setFormData(prev => ({
        ...prev,
        dataHoraInicio: dataHoraInicio || prev.dataHoraInicio,
        unidadeId: unidadeId || prev.unidadeId
      }))
    }
  }, [location.state])

  const [servicosSelecionados, setServicosSelecionados] = useState<number[]>([])
  const [filtroServicos, setFiltroServicos] = useState('')

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: clienteService.listar,
  })
  const { data: servicosPorUnidade = [] } = useQuery({
    queryKey: ['servicos', 'unidade', formData.unidadeId],
    queryFn: () => formData.unidadeId ? servicoService.listarAtivosPorUnidade(formData.unidadeId!) : Promise.resolve([]),
    enabled: !!formData.unidadeId,
  })
  const servicos: Servico[] = formData.unidadeId ? servicosPorUnidade : []
  const servicosFiltrados = useMemo(() => {
    if (!filtroServicos.trim()) return servicos
    const term = filtroServicos.toLowerCase().trim()
    return servicos.filter(
      (s) =>
        s.nome?.toLowerCase().includes(term) ||
        (typeof s.descricao === 'string' && s.descricao.toLowerCase().includes(term))
    )
  }, [servicos, filtroServicos])

  const { data: unidades = [] } = useQuery({
    queryKey: ['unidades'],
    queryFn: unidadeService.listarTodos,
  })
  const { data: atendentes = [], refetch: refetchAtendentes } = useQuery({
    queryKey: ['atendentes', formData.unidadeId],
    queryFn: () => formData.unidadeId ? atendenteService.listarPorUnidade(formData.unidadeId!) : Promise.resolve([]),
    enabled: !!formData.unidadeId,
  })

  const createMutation = useMutation({
    mutationFn: agendamentoService.criar,
    onSuccess: () => {
      showNotification('success', 'Agendamento criado com sucesso!')
      navigate('/agendamentos')
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || 'Erro ao criar agendamento. Tente novamente.'
      showNotification('error', msg)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.unidadeId) {
      showNotification('error', 'Selecione uma unidade')
      return
    }
    if (servicosSelecionados.length === 0) {
      showNotification('error', 'Selecione pelo menos um serviço')
      return
    }
    if (!formData.clienteId || !formData.atendenteId || !formData.dataHoraInicio) {
      showNotification('error', 'Preencha cliente, atendente e data/hora')
      return
    }
    const servicosParaEnvio: Array<{ servicoId: number; quantidade: number; valor: number; descricao?: string }> = servicosSelecionados.map((servicoId: number) => {
      const servicoEncontrado = servicos.find((s) => s.id === servicoId)
      return {
        servicoId,
        quantidade: 1,
        valor: servicoEncontrado?.valor || 0,
        descricao: servicoEncontrado?.descricao || servicoEncontrado?.nome
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
    setServicosSelecionados([])
    setFiltroServicos('')
    refetchAtendentes()
  }

  return (
    <div className="w-full">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">Novo Agendamento</h1>

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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Serviços {servicosSelecionados.length > 0 && `(${servicosSelecionados.length} selecionado${servicosSelecionados.length > 1 ? 's' : ''})`}
            </label>
            {!formData.unidadeId ? (
              <p className="mt-1 text-sm text-gray-500">Selecione primeiro uma unidade para ver os serviços disponíveis.</p>
            ) : (
              <>
                <input
                  type="text"
                  value={filtroServicos}
                  onChange={(e) => setFiltroServicos(e.target.value)}
                  placeholder="Buscar serviço por nome ou descrição..."
                  className="mt-1 mb-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                />
                <div className="mt-1 space-y-2 max-h-60 overflow-y-auto border border-gray-300 rounded-md p-3">
                  {servicos.length === 0 ? (
                    <p className="text-sm text-gray-500">Nenhum serviço ativo nesta unidade.</p>
                  ) : servicosFiltrados.length === 0 ? (
                    <p className="text-sm text-gray-500">Nenhum serviço encontrado com &quot;{filtroServicos}&quot;</p>
                  ) : (
                    servicosFiltrados.map((servico) => (
                      <label key={servico.id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                        <input
                          type="checkbox"
                          checked={servicosSelecionados.includes(servico.id)}
                          onChange={() => handleServicoToggle(servico.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="flex-1">
                          <span className="font-medium">{servico.nome}</span>
                          <span className="text-gray-600 ml-2">
                            - R$ {servico.valor.toFixed(2)} ({servico.duracaoMinutos} min)
                          </span>
                        </span>
                      </label>
                    ))
                  )}
                </div>
                {servicosSelecionados.length === 0 && servicos.length > 0 && (
                  <p className="mt-1 text-sm text-red-600">Selecione pelo menos um serviço</p>
                )}
              </>
            )}
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
              disabled={createMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Salvando...' : 'Criar Agendamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

