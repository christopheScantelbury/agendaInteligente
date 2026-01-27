import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { clienteService, Cliente } from '../services/clienteService'
import { unidadeService } from '../services/unidadeService'
import { atendenteService } from '../services/atendenteService'
import { servicoService, Servico } from '../services/servicoService'
import { agendamentoService, Agendamento } from '../services/agendamentoService'
import { Plus, Trash2, Edit, Eye, EyeOff, User, Lock, Briefcase, CalendarPlus } from 'lucide-react'
import { useState, useMemo, useEffect } from 'react'
import { useNotification } from '../contexts/NotificationContext'
import ConfirmDialog from '../components/ConfirmDialog'
import FilterBar from '../components/FilterBar'
import RecorrenciaConfig, { RecorrenciaConfig as RecorrenciaConfigType } from '../components/RecorrenciaConfig'
import { maskCPF, maskCNPJ, maskPhone, maskEmail } from '../utils/masks'
import { authService } from '../services/authService'
import { perfilService } from '../services/perfilService'
import { podeEditar } from '../utils/permissions'

export default function Clientes() {
  const { showNotification } = useNotification()
  const [showModal, setShowModal] = useState(false)
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: number | null }>({ isOpen: false, id: null })
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState<{ ativo?: string }>({})
  const queryClient = useQueryClient()
  
  const usuario = authService.getUsuario()
  const { data: perfilUsuario } = useQuery({
    queryKey: ['perfil', 'meu'],
    queryFn: () => perfilService.buscarMeuPerfil(),
    enabled: !!usuario,
  })
  
  const podeEditarClientes = podeEditar(perfilUsuario, '/clientes')

  const { data: clientes = [], isLoading } = useQuery({
    queryKey: ['clientes'],
    queryFn: clienteService.listar,
  })

  // Filtrar clientes
  const clientesFiltrados = useMemo(() => {
    let filtered = [...clientes]

    // Filtro de busca
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (c) =>
          c.nome.toLowerCase().includes(term) ||
          c.cpfCnpj.includes(term) ||
          c.email?.toLowerCase().includes(term) ||
          c.telefone?.includes(term)
      )
    }

    // Filtro de status
    if (filters.ativo !== undefined && filters.ativo !== '') {
      const isAtivo = filters.ativo === 'true'
      filtered = filtered.filter((c) => (c.ativo ?? true) === isAtivo)
    }

    return filtered
  }, [clientes, searchTerm, filters])

  const deleteMutation = useMutation({
    mutationFn: clienteService.excluir,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] })
      showNotification('success', 'Cliente excluído com sucesso!')
      setConfirmDelete({ isOpen: false, id: null })
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Erro ao excluir cliente'
      showNotification('error', errorMessage)
    },
  })

  const handleDelete = (id: number) => {
    setConfirmDelete({ isOpen: true, id })
  }

  const confirmDeleteAction = () => {
    if (confirmDelete.id) {
      deleteMutation.mutate(confirmDelete.id)
    }
  }

  if (isLoading) {
    return <div className="text-center py-8">Carregando...</div>
  }

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Clientes</h1>
        {podeEditarClientes && (
          <button
            onClick={() => {
              setEditingCliente(null)
              setShowModal(true)
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
          >
            <Plus className="h-5 w-5 mr-2" />
            Novo Cliente
          </button>
        )}
      </div>

      {/* Barra de Filtros */}
      <FilterBar
        onSearchChange={setSearchTerm}
        onFilterChange={setFilters}
        searchPlaceholder="Buscar por nome, CPF/CNPJ, email ou telefone..."
        filters={[
          {
            key: 'ativo',
            label: 'Status',
            type: 'select',
            options: [
              { value: 'true', label: 'Ativos' },
              { value: 'false', label: 'Inativos' },
            ],
          },
        ]}
      />

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {clientesFiltrados.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {searchTerm || Object.values(filters).some(v => v !== '' && v !== undefined)
                ? 'Nenhum cliente encontrado com os filtros aplicados'
                : 'Nenhum cliente cadastrado'}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {clientesFiltrados.map((cliente) => (
            <li key={cliente.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{cliente.nome}</p>
                  <p className="text-sm text-gray-500">CPF/CNPJ: {cliente.cpfCnpj}</p>
                  {cliente.email && (
                    <p className="text-sm text-gray-500">Email: {cliente.email}</p>
                  )}
                </div>
                {podeEditarClientes && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setEditingCliente(cliente)
                        setShowModal(true)
                      }}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(cliente.id!)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                )}
              </div>
            </li>
            ))}
          </ul>
        )}
        {clientesFiltrados.length > 0 && (
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-600">
            Mostrando {clientesFiltrados.length} de {clientes.length} cliente{clientes.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {showModal && (
        <ClienteModal
          cliente={editingCliente}
          onClose={() => {
            setShowModal(false)
            setEditingCliente(null)
          }}
        />
      )}

      <ConfirmDialog
        isOpen={confirmDelete.isOpen}
        title="Confirmar Exclusão"
        message="Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={confirmDeleteAction}
        onCancel={() => setConfirmDelete({ isOpen: false, id: null })}
      />
    </div>
  )
}

function ClienteModal({ cliente, onClose }: { cliente: Cliente | null; onClose: () => void }) {
  const queryClient = useQueryClient()
  const { showNotification } = useNotification()
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState<Cliente & { senha?: string; confirmarSenha?: string }>(
    cliente || {
      nome: '',
      cpfCnpj: '',
      email: '',
      telefone: '',
      senha: '',
      confirmarSenha: '',
      unidadesIds: [],
    }
  )

  // Opcional: criar agendamento ao cadastrar novo cliente
  const [queroCriarAgendamento, setQueroCriarAgendamento] = useState(false)
  const [agendamentoUnidadeId, setAgendamentoUnidadeId] = useState<number | ''>('')
  const [agendamentoAtendenteId, setAgendamentoAtendenteId] = useState<number | ''>('')
  const [agendamentoDataHoraInicio, setAgendamentoDataHoraInicio] = useState('')
  const [agendamentoServicosIds, setAgendamentoServicosIds] = useState<number[]>([])
  const [recorrenciaConfig, setRecorrenciaConfig] = useState<RecorrenciaConfigType>({
    recorrente: false,
    tipoRecorrencia: 'SEMANAL',
    tipoTermino: 'OCORRENCIAS',
    numeroOcorrencias: 4,
    intervalo: 1,
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

  useEffect(() => {
    if (cliente) {
      setFormData({
        ...cliente,
        unidadesIds: cliente.unidadesIds || cliente.unidades?.map(u => u.id!).filter((id): id is number => id !== undefined) || [],
        senha: '',
        confirmarSenha: '',
      })
    }
  }, [cliente])

  const saveMutation = useMutation({
    mutationFn: (data: Cliente) =>
      cliente?.id
        ? clienteService.atualizar(cliente.id, data)
        : clienteService.criar(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] })
      showNotification('success', cliente ? 'Cliente atualizado com sucesso!' : 'Cliente criado com sucesso!')
      onClose()
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Erro ao salvar cliente'
      showNotification('error', errorMessage)
    },
  })

  const [salvandoComAgendamento, setSalvandoComAgendamento] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validações de senha
    if (!cliente && (!formData.senha || formData.senha.length < 6)) {
      showNotification('error', 'A senha deve ter no mínimo 6 caracteres')
      return
    }

    if (formData.senha && formData.senha !== formData.confirmarSenha) {
      showNotification('error', 'As senhas não coincidem')
      return
    }

    // Validação de unidades
    if (!formData.unidadesIds || formData.unidadesIds.length === 0) {
      showNotification('error', 'Selecione pelo menos uma unidade para o cliente')
      return
    }

    if (!cliente && queroCriarAgendamento) {
      if (!agendamentoUnidadeId || !agendamentoAtendenteId || !agendamentoDataHoraInicio) {
        showNotification('error', 'Preencha unidade, atendente e data/hora do agendamento')
        return
      }
      if (agendamentoServicosIds.length === 0) {
        showNotification('error', 'Selecione pelo menos um serviço para o agendamento')
        return
      }
      const { confirmarSenha, unidades, ...dadosEnvio } = formData
      setSalvandoComAgendamento(true)
      try {
        const clienteCriado = await clienteService.criar(dadosEnvio)
        const servicosPayload = agendamentoServicosIds.map((servicoId) => {
          const s = servicos.find((sv) => sv.id === servicoId)
          return { servicoId, quantidade: 1, valor: s?.valor ?? 0, descricao: s?.nome }
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
        onClose()
      } catch (err: any) {
        const msg = err.response?.data?.message || 'Erro ao salvar. Tente novamente.'
        showNotification('error', msg)
      } finally {
        setSalvandoComAgendamento(false)
      }
      return
    }

    // Fluxo normal (sem agendamento ou edição)
    const { confirmarSenha, unidades, ...dadosEnvio } = formData
    saveMutation.mutate(dadosEnvio)
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          e.preventDefault()
        }
      }}
      style={{ pointerEvents: 'auto' }}
    >
      <div
        className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl sm:text-2xl font-bold mb-4">
          {cliente ? 'Editar Cliente' : 'Novo Cliente'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
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
          <div>
            <label className="block text-sm font-medium text-gray-700">CPF/CNPJ</label>
            <input
              type="text"
              required
              value={formData.cpfCnpj}
              onChange={(e) => {
                const value = e.target.value
                // Detecta se é CPF (11 dígitos) ou CNPJ (14 dígitos)
                const numbers = value.replace(/\D/g, '')
                const masked = numbers.length <= 11 ? maskCPF(value) : maskCNPJ(value)
                setFormData({ ...formData, cpfCnpj: masked })
              }}
              maxLength={18}
              placeholder="000.000.000-00 ou 00.000.000/0000-00"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={formData.email || ''}
              onChange={(e) => setFormData({ ...formData, email: maskEmail(e.target.value) })}
              placeholder="exemplo@email.com"
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

          {/* Seção de Credenciais de Acesso */}
          <div className="pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              <User className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Credenciais de Acesso ao Sistema</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Configure o email e senha para que o cliente possa acessar o sistema administrativo.
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Email (Usuário) {!cliente && <span className="text-red-500">*</span>}
              </label>
              <input
                type="email"
                required={!cliente}
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: maskEmail(e.target.value) })}
                placeholder="email@exemplo.com"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Este email será usado como usuário para login no sistema
              </p>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700">
                {cliente ? 'Nova Senha (deixe em branco para manter)' : 'Senha'} {!cliente && <span className="text-red-500">*</span>}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required={!cliente}
                  value={formData.senha || ''}
                  onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                  placeholder={cliente ? 'Deixe em branco para manter a senha atual' : 'Mínimo 6 caracteres'}
                  minLength={6}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            {!cliente && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700">
                  Confirmar Senha <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.confirmarSenha || ''}
                    onChange={(e) => setFormData({ ...formData, confirmarSenha: e.target.value })}
                    placeholder="Digite a senha novamente"
                    minLength={6}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {formData.email && formData.senha && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex items-start">
                  <Lock className="h-5 w-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">Usuário criado automaticamente</p>
                    <p className="text-xs text-blue-700 mt-1">
                      Um usuário com perfil CLIENTE será criado automaticamente com estas credenciais.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Seção de Unidades */}
          <div className="pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              <Briefcase className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Unidades</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Selecione uma ou mais unidades às quais o cliente terá acesso.
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Unidades <span className="text-red-500">*</span>
              </label>
              <div className="mt-2 space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-md p-3">
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
                              unidadesIds: currentIds.filter((id) => id !== unidade.id),
                            })
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-3 text-sm text-gray-700">
                        {unidade.nome}
                        {unidade.cidade && (
                          <span className="text-gray-500 ml-2">({unidade.cidade})</span>
                        )}
                      </span>
                    </label>
                  ))
                )}
              </div>
              {formData.unidadesIds && formData.unidadesIds.length > 0 && (
                <p className="mt-2 text-xs text-gray-500">
                  {formData.unidadesIds.length} unidade(s) selecionada(s)
                </p>
              )}
            </div>
          </div>

          {/* Seção: Já criar agendamento (só ao criar novo cliente) */}
          {!cliente && (
            <div className="pt-4 border-t border-gray-200">
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
                <div className="mt-4 space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-600">
                    Preencha os dados do primeiro agendamento. Pode ser único ou recorrente.
                  </p>

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
                                setAgendamentoServicosIds((prev) => prev.filter((id) => id !== s.id))
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
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:space-x-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={saveMutation.isPending || salvandoComAgendamento}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saveMutation.isPending || salvandoComAgendamento}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {saveMutation.isPending || salvandoComAgendamento
                ? 'Salvando...'
                : queroCriarAgendamento && !cliente
                  ? 'Cadastrar e criar agendamento'
                  : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

