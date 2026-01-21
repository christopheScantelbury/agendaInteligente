import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usuarioService, Usuario, PerfilUsuario } from '../services/usuarioService'
import { unidadeService, Unidade } from '../services/unidadeService'
import { authService } from '../services/authService'
import { Plus, Trash2, Edit, Eye, EyeOff } from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import Modal from '../components/Modal'
import Button from '../components/Button'
import FormField from '../components/FormField'
import FilterBar from '../components/FilterBar'
import { useNotification } from '../contexts/NotificationContext'
import ConfirmDialog from '../components/ConfirmDialog'
import { maskEmail } from '../utils/masks'

export default function Usuarios() {
  const { showNotification } = useNotification()
  const [showModal, setShowModal] = useState(false)
  const [editingUsuario, setEditingUsuario] = useState<Usuario | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: number | null }>({ isOpen: false, id: null })
  const queryClient = useQueryClient()

  const { data: usuarios = [], isLoading } = useQuery({
    queryKey: ['usuarios'],
    queryFn: usuarioService.listar,
  })

  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState<{ ativo?: string; perfil?: string }>({})

  // Filtrar usuários
  const usuariosFiltrados = useMemo(() => {
    let filtered = [...usuarios]

    // Filtro de busca
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (u) =>
          u.nome.toLowerCase().includes(term) ||
          u.email.toLowerCase().includes(term) ||
          u.nomesUnidades?.some(nome => nome.toLowerCase().includes(term)) ||
          (u.nomeUnidade && u.nomeUnidade.toLowerCase().includes(term))
      )
    }

    // Filtro de status
    if (filters.ativo !== undefined && filters.ativo !== '') {
      const isAtivo = filters.ativo === 'true'
      filtered = filtered.filter((u) => (u.ativo ?? true) === isAtivo)
    }

    // Filtro de perfil
    if (filters.perfil && filters.perfil !== '') {
      filtered = filtered.filter((u) => u.perfil === filters.perfil)
    }

    return filtered
  }, [usuarios, searchTerm, filters])

  const usuarioLogado = authService.getUsuario()
  const perfilLogado = usuarioLogado?.perfil

  // Buscar usuário completo do logado para obter suas unidades
  const { data: usuarioCompleto } = useQuery({
    queryKey: ['usuario', usuarioLogado?.usuarioId],
    queryFn: () => usuarioService.buscarPorId(usuarioLogado!.usuarioId),
    enabled: !!usuarioLogado?.usuarioId && perfilLogado !== 'ADMIN',
  })

  const { data: todasUnidades = [] } = useQuery({
    queryKey: ['unidades'],
    queryFn: unidadeService.listarTodos,
  })

  // Filtrar unidades baseado no perfil do usuário logado
  const unidadesDisponiveis = useMemo(() => {
    if (perfilLogado === 'ADMIN') {
      return todasUnidades
    }
    
    if (perfilLogado === 'GERENTE' && usuarioCompleto?.unidadesIds && usuarioCompleto.unidadesIds.length > 0) {
      // Obter empresaIds das unidades do gerente
      const unidadesDoGerente = todasUnidades.filter(u => 
        u.id && usuarioCompleto.unidadesIds?.includes(u.id)
      )
      const empresaIds = new Set(
        unidadesDoGerente
          .map(u => u.empresaId)
          .filter((id): id is number => id !== undefined)
      )
      
      // Retornar todas as unidades das mesmas empresas
      return todasUnidades.filter(u => u.empresaId && empresaIds.has(u.empresaId))
    }
    
    // Outros perfis não devem poder cadastrar usuários
    return []
  }, [todasUnidades, perfilLogado, usuarioCompleto])

  const deleteMutation = useMutation({
    mutationFn: usuarioService.excluir,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] })
      showNotification('success', 'Usuário excluído com sucesso!')
      setConfirmDelete({ isOpen: false, id: null })
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Erro ao excluir usuário'
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

  // Verificar permissão de acesso
  if (perfilLogado !== 'ADMIN' && perfilLogado !== 'GERENTE') {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 font-semibold">Acesso negado</p>
        <p className="text-gray-600 mt-2">Você não tem permissão para acessar esta página.</p>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Usuários</h1>
        <Button
          onClick={() => {
            setEditingUsuario(null)
            setShowModal(true)
          }}
        >
          <Plus className="h-5 w-5 mr-2" />
          Novo Usuário
        </Button>
      </div>

      {/* Barra de Filtros */}
      <FilterBar
        onSearchChange={setSearchTerm}
        onFilterChange={setFilters}
        searchPlaceholder="Buscar por nome, email ou unidade..."
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
          {
            key: 'perfil',
            label: 'Perfil',
            type: 'select',
            options: [
              { value: 'ADMIN', label: 'Administrador' },
              { value: 'GERENTE', label: 'Gerente' },
              { value: 'PROFISSIONAL', label: 'Profissional/Atendente' },
              { value: 'CLIENTE', label: 'Cliente' },
            ],
          },
        ]}
      />

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {usuariosFiltrados.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {searchTerm || Object.values(filters).some(v => v !== '' && v !== undefined)
                ? 'Nenhum usuário encontrado com os filtros aplicados'
                : 'Nenhum usuário cadastrado'}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {usuariosFiltrados.map((usuario) => (
            <li key={usuario.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{usuario.nome}</p>
                  <p className="text-sm text-gray-500">Email: {usuario.email}</p>
                  <p className="text-sm text-gray-500">
                    Perfil: <span className="font-medium">{usuario.perfil}</span>
                  </p>
                  {usuario.nomesUnidades && usuario.nomesUnidades.length > 0 && (
                    <p className="text-sm text-gray-500">
                      Unidades: {usuario.nomesUnidades.join(', ')}
                    </p>
                  )}
                  {!usuario.nomesUnidades && usuario.nomeUnidade && (
                    <p className="text-sm text-gray-500">Unidade: {usuario.nomeUnidade}</p>
                  )}
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${usuario.ativo
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                      }`}
                  >
                    {usuario.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setEditingUsuario(usuario)
                      setShowModal(true)
                    }}
                    className="text-blue-600 hover:text-blue-800 transition-colors"
                    aria-label="Editar usuário"
                  >
                    <Edit className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(usuario.id!)}
                    className="text-red-600 hover:text-red-800 transition-colors"
                    aria-label="Excluir usuário"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </li>
            ))}
          </ul>
        )}
        {usuariosFiltrados.length > 0 && (
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-600">
            Mostrando {usuariosFiltrados.length} de {usuarios.length} usuário{usuarios.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false)
          setEditingUsuario(null)
        }}
        title={editingUsuario ? 'Editar Usuário' : 'Novo Usuário'}
        size="md"
      >
        <UsuarioForm
          usuario={editingUsuario}
          unidades={unidadesDisponiveis}
          onClose={() => {
            setShowModal(false)
            setEditingUsuario(null)
          }}
        />
      </Modal>

      <ConfirmDialog
        isOpen={confirmDelete.isOpen}
        title="Confirmar Exclusão"
        message="Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={confirmDeleteAction}
        onCancel={() => setConfirmDelete({ isOpen: false, id: null })}
      />
    </div>
  )
}

function UsuarioForm({
  usuario,
  unidades,
  onClose,
}: {
  usuario: Usuario | null
  unidades: Unidade[]
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const { showNotification } = useNotification()
  const [showPassword, setShowPassword] = useState(false)
  const usuarioLogado = authService.getUsuario()
  const perfilLogado = usuarioLogado?.perfil
  const [formData, setFormData] = useState<Usuario>(
    usuario || {
      nome: '',
      email: '',
      senha: '',
      perfil: 'ATENDENTE',
      unidadesIds: [],
      ativo: true,
    }
  )
  
  // Inicializar formData quando o usuário mudar
  useEffect(() => {
    if (usuario) {
      // Determinar unidadesIds
      let unidadesIds: number[] = []
      if (usuario.unidadesIds && usuario.unidadesIds.length > 0) {
        unidadesIds = usuario.unidadesIds
      } else if (usuario.unidadeId) {
        // Compatibilidade com código antigo
        unidadesIds = [usuario.unidadeId]
      }

      setFormData({
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        senha: '',
        perfil: usuario.perfil,
        unidadesIds: unidadesIds,
        ativo: usuario.ativo ?? true,
      })
    } else {
      setFormData({
        nome: '',
        email: '',
        senha: '',
        perfil: 'ATENDENTE',
        unidadesIds: [],
        ativo: true,
      })
    }
  }, [usuario])

  const saveMutation = useMutation({
    mutationFn: (data: Usuario) =>
      usuario?.id
        ? usuarioService.atualizar(usuario.id, data)
        : usuarioService.criar(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] })
      showNotification('success', usuario ? 'Usuário atualizado com sucesso!' : 'Usuário criado com sucesso!')
      onClose()
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Erro ao salvar usuário'
      showNotification('error', errorMessage)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validação: GERENTE, PROFISSIONAL/ATENDENTE e CLIENTE devem ter pelo menos uma unidade
    const perfilRequerUnidades = ['GERENTE', 'PROFISSIONAL', 'ATENDENTE', 'CLIENTE'].includes(formData.perfil as string)
    if (perfilRequerUnidades && (!formData.unidadesIds || formData.unidadesIds.length === 0)) {
      showNotification('error', 'Selecione pelo menos uma unidade para este perfil')
      return
    }
    
    // Converter ATENDENTE para PROFISSIONAL antes de enviar
    const dadosEnvio = {
      ...formData,
      perfil: formData.perfil === 'ATENDENTE' ? 'PROFISSIONAL' : formData.perfil,
    }
    
    saveMutation.mutate(dadosEnvio)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Nome" required>
        <input
          type="text"
          required
          value={formData.nome}
          onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </FormField>

      <FormField label="Email" required>
        <input
          type="email"
          required
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: maskEmail(e.target.value) })}
          placeholder="exemplo@email.com"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </FormField>

      <FormField label={usuario ? 'Nova Senha (deixe em branco para manter)' : 'Senha'} required={!usuario}>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            required={!usuario}
            value={formData.senha || ''}
            onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
      </FormField>

      <FormField label="Perfil" required>
        <select
          required
          value={formData.perfil}
          onChange={(e) => {
            const novoPerfil = e.target.value as PerfilUsuario
            const perfilAtual = formData.perfil
            
            // Se está mudando de um perfil que requer unidades para outro que também requer, manter unidades
            // Se está mudando para um perfil que não requer unidades, limpar
            // Se está mudando de um perfil que não requer para um que requer, manter vazio (usuário deve selecionar)
            let novasUnidadesIds = formData.unidadesIds || []
            
            const perfilAtualRequerUnidades = ['GERENTE', 'PROFISSIONAL', 'ATENDENTE', 'CLIENTE'].includes(perfilAtual as string)
            const novoPerfilRequerUnidades = ['GERENTE', 'PROFISSIONAL', 'ATENDENTE', 'CLIENTE'].includes(novoPerfil as string)
            
            if (!novoPerfilRequerUnidades) {
              // Se o novo perfil não requer unidades, limpar
              novasUnidadesIds = []
            } else if (perfilAtualRequerUnidades && novoPerfilRequerUnidades) {
              // Se ambos requerem unidades, manter as unidades existentes
              novasUnidadesIds = formData.unidadesIds || []
            }
            // Se está mudando de um perfil que não requer para um que requer, manter vazio (usuário deve selecionar)
            
            setFormData({
              ...formData,
              perfil: novoPerfil,
              unidadesIds: novasUnidadesIds,
            })
          }}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          <option value="ADMIN">Administrador</option>
          <option value="GERENTE">Gerente</option>
          <option value="PROFISSIONAL">Profissional/Atendente</option>
          <option value="CLIENTE">Cliente</option>
        </select>
      </FormField>

      {['GERENTE', 'PROFISSIONAL', 'ATENDENTE', 'CLIENTE'].includes(formData.perfil as string) && (
        <FormField 
          label={`Unidades ${formData.unidadesIds && formData.unidadesIds.length > 0 ? `(${formData.unidadesIds.length} selecionada${formData.unidadesIds.length > 1 ? 's' : ''})` : ''}`} 
          required
        >
          <div className="mt-1 max-h-48 overflow-y-auto border border-gray-300 rounded-md p-3 space-y-2 bg-gray-50">
            {unidades.length === 0 ? (
              <div className="text-sm">
                <p className="text-gray-500 mb-1">Nenhuma unidade disponível</p>
                {perfilLogado === 'GERENTE' && (
                  <p className="text-yellow-600 text-xs">
                    Você só pode cadastrar usuários em unidades da sua empresa.
                  </p>
                )}
              </div>
            ) : (
              unidades
                .filter((unidade) => unidade.id !== undefined)
                .map((unidade) => {
                  const unidadeId = unidade.id!
                  return (
                    <label
                      key={unidadeId}
                      className="flex items-center space-x-3 cursor-pointer hover:bg-white p-2 rounded transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={formData.unidadesIds?.includes(unidadeId) || false}
                        onChange={(e) => {
                          const currentIds = formData.unidadesIds || []
                          const newIds: number[] = e.target.checked
                            ? [...currentIds, unidadeId]
                            : currentIds.filter(id => id !== unidadeId)
                          setFormData({ ...formData, unidadesIds: newIds })
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="flex-1 text-sm text-gray-900">{unidade.nome}</span>
                    </label>
                  )
                })
            )}
          </div>
          {formData.unidadesIds && formData.unidadesIds.length === 0 && (
            <p className="mt-1 text-sm text-red-600">Selecione pelo menos uma unidade</p>
          )}
        </FormField>
      )}

      <FormField label="Status">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={formData.ativo}
            onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="ml-2 text-sm text-gray-700">Ativo</span>
        </label>
      </FormField>

      <div className="flex justify-end space-x-2 pt-4 border-t">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" isLoading={saveMutation.isPending}>
          Salvar
        </Button>
      </div>
    </form>
  )
}

