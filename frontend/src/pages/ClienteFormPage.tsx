import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Briefcase, CalendarPlus } from 'lucide-react'
import { clienteService, Cliente } from '../services/clienteService'
import { unidadeService } from '../services/unidadeService'
import { atendenteService } from '../services/atendenteService'
import { servicoService, Servico } from '../services/servicoService'
import { agendamentoService, Agendamento } from '../services/agendamentoService'
import RecorrenciaConfig, { RecorrenciaConfig as RecorrenciaConfigType } from '../components/RecorrenciaConfig'
import Button from '../components/Button'
import { useNotification } from '../contexts/NotificationContext'
import { maskCPF, maskCNPJ, maskPhone, maskEmail, maskCEP } from '../utils/masks'

type ClienteFormData = Cliente

const EMPTY_FORM: ClienteFormData = {
  nome: '',
  cpfCnpj: '',
  email: '',
  telefone: '',
  dataNascimento: '',
  rg: '',
  cep: '',
  endereco: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  uf: '',
  ativo: true,
  unidadesIds: [],
}

export default function ClienteFormPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { showNotification } = useNotification()
  const queryClient = useQueryClient()

  const isEditing = !!id
  const clienteId = id ? Number(id) : undefined
  const hasValidClienteId = clienteId != null && Number.isFinite(clienteId)

  const [formData, setFormData] = useState<ClienteFormData>(EMPTY_FORM)

  const [queroCriarAgendamento, setQueroCriarAgendamento] = useState(false)
  const [agendamentoUnidadeId, setAgendamentoUnidadeId] = useState<number | ''>('')
  const [agendamentoAtendenteId, setAgendamentoAtendenteId] = useState<number | ''>('')
  const [agendamentoDataHoraInicio, setAgendamentoDataHoraInicio] = useState('')
  const [agendamentoServicosIds, setAgendamentoServicosIds] = useState<number[]>([])
  const [salvandoComAgendamento, setSalvandoComAgendamento] = useState(false)
  const [recorrenciaConfig, setRecorrenciaConfig] = useState<RecorrenciaConfigType>({
    recorrente: false,
    tipoRecorrencia: 'SEMANAL',
    tipoTermino: 'OCORRENCIAS',
    numeroOcorrencias: 4,
    intervalo: 1,
  })

  const { data: clienteExistente, isLoading: isLoadingCliente } = useQuery({
    queryKey: ['cliente', clienteId],
    queryFn: () => clienteService.buscarPorId(clienteId!),
    enabled: isEditing && hasValidClienteId,
  })

  const { data: unidades = [] } = useQuery({
    queryKey: ['unidades'],
    queryFn: unidadeService.listarTodos,
  })

  const { data: servicos = [] } = useQuery({
    queryKey: ['servicos'],
    queryFn: servicoService.listar,
  })

  const { data: atendentesAgendamento = [] } = useQuery({
    queryKey: ['atendentes', agendamentoUnidadeId],
    queryFn: () =>
      agendamentoUnidadeId ? atendenteService.listarPorUnidade(agendamentoUnidadeId as number) : Promise.resolve([]),
    enabled: !!agendamentoUnidadeId,
  })

  const unidadeUnica = unidades.length === 1 ? unidades[0] : undefined
  const unidadeUnicaId = unidadeUnica?.id
  const mostrarSecaoUnidades = unidades.length !== 1

  useEffect(() => {
    if (!isEditing) {
      setFormData(EMPTY_FORM)
      return
    }

    if (clienteExistente) {
      const unidadesIds = clienteExistente.unidadesIds
        || clienteExistente.unidades?.map((u) => u.id!).filter((value): value is number => value !== undefined)
        || []

      const unidadePrincipal = clienteExistente.unidadeId
      const unidadesComPrincipal = unidadePrincipal && !unidadesIds.includes(unidadePrincipal)
        ? [unidadePrincipal, ...unidadesIds]
        : unidadesIds

      setFormData({
        ...clienteExistente,
        cpfCnpj: clienteExistente.cpfCnpj || '',
        email: clienteExistente.email || '',
        telefone: clienteExistente.telefone || '',
        dataNascimento: clienteExistente.dataNascimento || '',
        rg: clienteExistente.rg || '',
        cep: clienteExistente.cep || '',
        endereco: clienteExistente.endereco || '',
        numero: clienteExistente.numero || '',
        complemento: clienteExistente.complemento || '',
        bairro: clienteExistente.bairro || '',
        cidade: clienteExistente.cidade || '',
        uf: clienteExistente.uf || '',
        ativo: clienteExistente.ativo ?? true,
        unidadesIds: unidadesComPrincipal,
      })
    }
  }, [isEditing, clienteExistente])

  useEffect(() => {
    if (!unidadeUnicaId) return

    setFormData((prev) => {
      if (prev.unidadesIds?.length === 1 && prev.unidadesIds[0] === unidadeUnicaId) {
        return prev
      }

      return {
        ...prev,
        unidadeId: unidadeUnicaId,
        unidadesIds: [unidadeUnicaId],
      }
    })

    setAgendamentoUnidadeId((prev) => (prev === '' ? unidadeUnicaId : prev))
  }, [unidadeUnicaId])

  const saveMutation = useMutation({
    mutationFn: (data: Cliente) =>
      isEditing && hasValidClienteId
        ? clienteService.atualizar(clienteId!, data)
        : clienteService.criar(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] })
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] })
      showNotification('success', isEditing ? 'Cliente atualizado com sucesso!' : 'Cliente criado com sucesso!')
      navigate('/clientes')
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Erro ao salvar cliente'
      showNotification('error', errorMessage)
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.unidadesIds || formData.unidadesIds.length === 0) {
      showNotification('error', 'Selecione pelo menos uma unidade para o cliente')
      return
    }

    const { unidades, ...dadosBase } = formData
    const dadosEnvio: Cliente = {
      ...dadosBase,
      unidadeId: formData.unidadesIds[0],
      unidadesIds: formData.unidadesIds,
      uf: formData.uf?.toUpperCase().slice(0, 2),
    }

    if (!isEditing && queroCriarAgendamento) {
      if (!agendamentoUnidadeId || !agendamentoAtendenteId || !agendamentoDataHoraInicio) {
        showNotification('error', 'Preencha unidade, atendente e data/hora do agendamento')
        return
      }
      if (agendamentoServicosIds.length === 0) {
        showNotification('error', 'Selecione pelo menos um serviço para o agendamento')
        return
      }

      setSalvandoComAgendamento(true)
      try {
        const clienteCriado = await clienteService.criar(dadosEnvio)
        const servicosPayload = agendamentoServicosIds.map((servicoId) => {
          const servico = servicos.find((item) => item.id === servicoId)
          return {
            servicoId,
            quantidade: 1,
            valor: servico?.valor ?? 0,
            descricao: servico?.nome,
          }
        })

        const agendamentoPayload: Agendamento = {
          clienteId: clienteCriado.id!,
          unidadeId: agendamentoUnidadeId as number,
          atendenteId: agendamentoAtendenteId as number,
          dataHoraInicio: agendamentoDataHoraInicio,
          servicos: servicosPayload,
          recorrencia: recorrenciaConfig.recorrente ? recorrenciaConfig : undefined,
        }

        await agendamentoService.criar(agendamentoPayload)
        queryClient.invalidateQueries({ queryKey: ['clientes'] })
        queryClient.invalidateQueries({ queryKey: ['agendamentos'] })
        showNotification('success', 'Cliente e agendamento criados com sucesso!')
        navigate('/clientes')
      } catch (error: any) {
        const message = error.response?.data?.message || 'Erro ao salvar. Tente novamente.'
        showNotification('error', message)
      } finally {
        setSalvandoComAgendamento(false)
      }
      return
    }

    saveMutation.mutate(dadosEnvio)
  }

  if (isEditing && !hasValidClienteId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Editar Cliente</h1>
        <p className="text-red-600">ID de cliente inválido.</p>
        <Button variant="secondary" onClick={() => navigate('/clientes')}>Voltar</Button>
      </div>
    )
  }

  if (isEditing && isLoadingCliente) {
    return <div className="text-center py-8">Carregando...</div>
  }

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{isEditing ? 'Editar Cliente' : 'Novo Cliente'}</h1>
          <p className="text-sm text-gray-600 mt-1">Preencha os dados completos do cliente.</p>
        </div>
        <Button variant="secondary" onClick={() => navigate('/clientes')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section className="space-y-4 bg-white rounded-xl shadow-sm border border-gray-100 p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900">Dados pessoais</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700">Nome</label>
            <input
              type="text"
              required
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">CPF/CNPJ</label>
              <input
                type="text"
                value={formData.cpfCnpj}
                onChange={(e) => {
                  const raw = e.target.value
                  const numbers = raw.replace(/\D/g, '')
                  const masked = numbers.length <= 11 ? maskCPF(raw) : maskCNPJ(raw)
                  setFormData({ ...formData, cpfCnpj: masked })
                }}
                maxLength={18}
                placeholder="000.000.000-00 ou 00.000.000/0000-00"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">RG</label>
              <input
                type="text"
                value={formData.rg || ''}
                onChange={(e) => setFormData({ ...formData, rg: e.target.value })}
                placeholder="Documento de identidade"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: maskEmail(e.target.value) })}
                placeholder="email@exemplo.com"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Telefone</label>
              <input
                type="text"
                value={formData.telefone || ''}
                onChange={(e) => setFormData({ ...formData, telefone: maskPhone(e.target.value) })}
                maxLength={15}
                placeholder="(00) 00000-0000"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Data de nascimento</label>
            <input
              type="date"
              value={formData.dataNascimento || ''}
              onChange={(e) => setFormData({ ...formData, dataNascimento: e.target.value })}
              max={new Date().toISOString().split('T')[0]}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </section>

        <section className="space-y-4 bg-white rounded-xl shadow-sm border border-gray-100 p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900">Endereço</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">CEP</label>
              <input
                type="text"
                value={formData.cep || ''}
                onChange={(e) => setFormData({ ...formData, cep: maskCEP(e.target.value) })}
                placeholder="00000-000"
                maxLength={9}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Endereço</label>
              <input
                type="text"
                value={formData.endereco || ''}
                onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                placeholder="Rua, avenida..."
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Número</label>
              <input
                type="text"
                value={formData.numero || ''}
                onChange={(e) => setFormData({ ...formData, numero: e.target.value.replace(/\D/g, '') })}
                placeholder="123"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Complemento</label>
              <input
                type="text"
                value={formData.complemento || ''}
                onChange={(e) => setFormData({ ...formData, complemento: e.target.value })}
                placeholder="Apartamento, bloco..."
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Bairro</label>
              <input
                type="text"
                value={formData.bairro || ''}
                onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                placeholder="Bairro"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Cidade</label>
              <input
                type="text"
                value={formData.cidade || ''}
                onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                placeholder="Cidade"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">UF</label>
            <input
              type="text"
              value={formData.uf || ''}
              onChange={(e) => setFormData({ ...formData, uf: e.target.value.toUpperCase().slice(0, 2) })}
              placeholder="UF"
              maxLength={2}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </section>

        {mostrarSecaoUnidades ? (
          <section className="space-y-4 bg-white rounded-xl shadow-sm border border-gray-100 p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">Unidades</h2>
            </div>

            <p className="text-sm text-gray-600">Selecione uma ou mais unidades às quais o cliente terá acesso.</p>

            <div className="space-y-2 max-h-56 overflow-y-auto border border-gray-200 rounded-md p-3">
              {unidades.length === 0 ? (
                <p className="text-sm text-gray-500">Nenhuma unidade disponível</p>
              ) : (
                unidades.map((unidade) => (
                  <label
                    key={unidade.id}
                    className="flex items-center p-2 rounded hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={formData.unidadesIds?.includes(unidade.id!) || false}
                      onChange={(e) => {
                        const currentIds = formData.unidadesIds || []
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            unidadesIds: [...currentIds, unidade.id!],
                          })
                        } else {
                          setFormData({
                            ...formData,
                            unidadesIds: currentIds.filter((itemId) => itemId !== unidade.id),
                          })
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-3 text-sm text-gray-700">
                      {unidade.nome}
                      {unidade.cidade && <span className="text-gray-500 ml-2">({unidade.cidade})</span>}
                    </span>
                  </label>
                ))
              )}
            </div>

            {formData.unidadesIds && formData.unidadesIds.length > 0 && (
              <p className="text-xs text-gray-500">
                {formData.unidadesIds.length} unidade(s) selecionada(s)
              </p>
            )}
          </section>
        ) : (
          <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">Unidade</h2>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Unidade selecionada automaticamente: <strong>{unidadeUnica?.nome}</strong>
              {unidadeUnica?.cidade ? ` (${unidadeUnica.cidade})` : ''}
            </p>
          </section>
        )}

        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 sm:p-6">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.ativo ?? true}
              onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm font-medium text-gray-700">Cliente ativo</span>
          </label>
        </section>

        {!isEditing && (
          <section className="xl:col-span-2 space-y-4 bg-white rounded-xl shadow-sm border border-gray-100 p-5 sm:p-6">
            <label className="flex items-center gap-2 cursor-pointer p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
              <input
                type="checkbox"
                checked={queroCriarAgendamento}
                onChange={(e) => {
                  setQueroCriarAgendamento(e.target.checked)
                  if (!e.target.checked) {
                    setAgendamentoUnidadeId('')
                    setAgendamentoAtendenteId('')
                    setAgendamentoDataHoraInicio('')
                    setAgendamentoServicosIds([])
                  }
                }}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
              />
              <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <CalendarPlus className="w-5 h-5 text-blue-600" />
                Já criar um agendamento para este cliente
              </span>
            </label>

            {queroCriarAgendamento && (
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-600">
                  Preencha os dados do primeiro agendamento. Pode ser único ou recorrente.
                </p>

                {unidadeUnicaId ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unidade do agendamento</label>
                    <p className="text-sm text-gray-700 bg-white border border-gray-200 rounded-md px-3 py-2">
                      {unidadeUnica?.nome}
                      {unidadeUnica?.cidade ? ` (${unidadeUnica.cidade})` : ''}
                    </p>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unidade do agendamento</label>
                    <select
                      value={agendamentoUnidadeId}
                      onChange={(e) => {
                        setAgendamentoUnidadeId(e.target.value ? Number(e.target.value) : '')
                        setAgendamentoAtendenteId('')
                      }}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                    >
                      <option value="">Selecione</option>
                      {unidades.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.nome}
                          {u.cidade ? ` (${u.cidade})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Atendente</label>
                  <select
                    value={agendamentoAtendenteId}
                    onChange={(e) => setAgendamentoAtendenteId(e.target.value ? Number(e.target.value) : '')}
                    disabled={!agendamentoUnidadeId}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm disabled:bg-gray-100"
                  >
                    <option value="">Selecione</option>
                    {atendentesAgendamento.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nomeUsuario}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Serviços</label>
                  <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-md p-3 bg-white">
                    {(servicos || []).filter((s) => s.ativo !== false).map((s: Servico) => (
                      <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={agendamentoServicosIds.includes(s.id!)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setAgendamentoServicosIds((prev) => [...prev, s.id!])
                            } else {
                              setAgendamentoServicosIds((prev) => prev.filter((itemId) => itemId !== s.id))
                            }
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm">
                          {s.nome}
                          {s.valor != null && <span className="text-gray-500 ml-1">R$ {Number(s.valor).toFixed(2)}</span>}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data e hora</label>
                  <input
                    type="datetime-local"
                    value={agendamentoDataHoraInicio}
                    onChange={(e) => setAgendamentoDataHoraInicio(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                  />
                </div>

                <RecorrenciaConfig value={recorrenciaConfig} onChange={setRecorrenciaConfig} />
              </div>
            )}
          </section>
        )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-5 flex flex-col-reverse sm:flex-row justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => navigate('/clientes')}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={saveMutation.isPending || salvandoComAgendamento}>
            {saveMutation.isPending || salvandoComAgendamento
              ? 'Salvando...'
              : !isEditing && queroCriarAgendamento
                ? 'Cadastrar e criar agendamento'
                : 'Salvar'}
          </Button>
        </div>
      </form>
    </div>
  )
}
