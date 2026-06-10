import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import { usuarioService, Usuario } from '../services/usuarioService'
import { unidadeService, Unidade } from '../services/unidadeService'
import { perfilService, Perfil } from '../services/perfilService'
import { atendenteService, Atendente } from '../services/atendenteService'
import { servicoService, Servico } from '../services/servicoService'
import { authService } from '../services/authService'
import { podeEditar } from '../utils/permissions'
import { Plus, Trash2, Edit, Eye, EyeOff, Stethoscope, Lock, UserCircle2 } from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import { matchSearch } from '../utils/normalize'
import Modal from '../components/Modal'
import Button from '../components/Button'
import FormField from '../components/FormField'
import FilterBar from '../components/FilterBar'
import { useNotification } from '../contexts/NotificationContext'
import ConfirmDialog from '../components/ConfirmDialog'
import { maskEmail, maskCPF, maskPhone } from '../utils/masks'

export default function Usuarios() {
  const { showNotification } = useNotification()
  const [showModal, setShowModal] = useState(false)
  const [editingUsuario, setEditingUsuario] = useState<Usuario | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: number | null }>({ isOpen: false, id: null })
  const [senhaModal, setSenhaModal] = useState<{ open: boolean; usuario: Usuario | null }>({ open: false, usuario: null })
  const [novaSenhaInput, setNovaSenhaInput] = useState('')
  const queryClient = useQueryClient()

  const { data: usuarios = [], isLoading } = useQuery({
    queryKey: ['usuarios'],
    queryFn: usuarioService.listar,
  })

  const { data: perfis = [] } = useQuery({
    queryKey: ['perfis'],
    queryFn: perfilService.listarTodos,
  })

  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState<{ ativo?: string; perfil?: string }>({})

  const location = useLocation()
  const navigate = useNavigate()
  const unidadeIdFromState = (location.state as { unidadeId?: number })?.unidadeId
  const usuarioLogado = authService.getUsuario()
  const perfilLogado = usuarioLogado?.perfil
  const perfilNorm = (perfilLogado ?? '').toUpperCase().replace('-', '_')
  const isAdmin = perfilNorm === 'ADMIN' || perfilNorm === 'ADMINISTRADOR'
  const perfisDisponiveisParaAdministrador = useMemo(() => {
    if (perfilNorm !== 'ADMINISTRADOR') return perfis
    const permitidos = new Set(['ADMINISTRADOR', 'PROFISSIONAL', 'ATENDENTE'])
    return perfis.filter((p) => permitidos.has((p.nome ?? '').toUpperCase()))
  }, [perfilNorm, perfis])

  const { data: perfilUsuarioPermissoes } = useQuery({
    queryKey: ['perfil', 'meu'],
    queryFn: () => perfilService.buscarMeuPerfil(),
    enabled: !!usuarioLogado,
  })
  const podeEditarUsuarios = podeEditar(perfilUsuarioPermissoes, '/usuarios')

  const usuariosFiltrados = useMemo(() => {
    let filtered = [...usuarios]

    if (searchTerm) {
      filtered = filtered.filter(
        (u) =>
          matchSearch(u.nome, searchTerm) ||
          matchSearch(u.email, searchTerm) ||
          u.nomesUnidades?.some((nome) => matchSearch(nome, searchTerm)) ||
          (u.nomeUnidade && matchSearch(u.nomeUnidade, searchTerm))
      )
    }

    // Filtro de status
    if (filters.ativo !== undefined && filters.ativo !== '') {
      const isAtivo = filters.ativo === 'true'
      filtered = filtered.filter((u) => (u.ativo ?? true) === isAtivo)
    }

    // Filtro de perfil (por perfilId – lista vem da tela Perfis)
    if (filters.perfil && filters.perfil !== '') {
      const perfilIdFiltro = Number(filters.perfil)
      filtered = filtered.filter((u) => u.perfilId === perfilIdFiltro)
    }

    return filtered
  }, [usuarios, searchTerm, filters])

  useEffect(() => {
    if (unidadeIdFromState) {
      setEditingUsuario(null)
      setShowModal(true)
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [unidadeIdFromState, navigate, location.pathname])

  // Buscar usuário completo do logado para obter suas unidades (não necessário para ADMIN)
  const { data: usuarioCompleto } = useQuery({
    queryKey: ['usuario', usuarioLogado?.usuarioId],
    queryFn: () => usuarioService.buscarPorId(usuarioLogado!.usuarioId),
    enabled: !!usuarioLogado?.usuarioId && !isAdmin,
  })

  const { data: todasUnidades = [] } = useQuery({
    queryKey: ['unidades'],
    queryFn: unidadeService.listarTodos,
  })

  // Filtrar unidades baseado no perfil do usuário logado
  const unidadesDisponiveis = useMemo(() => {
    if (isAdmin) {
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

  const alterarSenhaMutation = useMutation({
    mutationFn: ({ id, novaSenha }: { id: number; novaSenha: string }) =>
      usuarioService.alterarSenha(id, novaSenha),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] })
      showNotification('success', 'Senha alterada com sucesso.')
      setSenhaModal({ open: false, usuario: null })
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || 'Erro ao alterar senha'
      showNotification('error', msg)
    },
  })

  if (isLoading) {
    return <div className="text-center py-8">Carregando...</div>
  }

  // Verificar permissão de acesso
  if (!isAdmin && perfilNorm !== 'GERENTE') {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 font-semibold">Acesso negado</p>
        <p className="text-gray-600 mt-2">Você não tem permissão para acessar esta página.</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <UserCircle2 className="h-6 w-6 text-violet-600" />
            Usuários
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Logins do sistema, perfis e unidades de acesso.
          </p>
        </div>
        {podeEditarUsuarios && (
          <Button
            onClick={() => {
              setEditingUsuario(null)
              setShowModal(true)
            }}
          >
            <Plus className="h-4 w-4" />
            Novo Usuário
          </Button>
        )}
      </header>

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
            options: perfisDisponiveisParaAdministrador
              .filter((p) => p.id != null)
              .map((p) => ({ value: String(p.id!), label: p.nome })),
          },
        ]}
      />

      {usuariosFiltrados.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center mb-3">
            <UserCircle2 className="h-5 w-5" />
          </div>
          <p className="text-sm text-slate-600">
            {searchTerm || Object.values(filters).some(v => v !== '' && v !== undefined)
              ? 'Nenhum usuário encontrado com os filtros aplicados.'
              : 'Nenhum usuário cadastrado ainda.'}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {usuariosFiltrados.map((usuario) => {
            const ativo = usuario.ativo ?? true
            const inicial = (usuario.nome || '?').charAt(0).toUpperCase()
            const nomePerfil = perfis.find((p) => p.id === usuario.perfilId)?.nome ?? usuario.perfil ?? null
            const unidadesTexto = usuario.nomesUnidades && usuario.nomesUnidades.length > 0
              ? usuario.nomesUnidades.join(', ')
              : usuario.nomeUnidade ?? null
            return (
              <li
                key={usuario.id}
                className="bg-white border border-slate-200 rounded-2xl p-4 hover:shadow-sm transition"
              >
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {inicial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-slate-900 truncate">{usuario.nome}</p>
                      {nomePerfil && (
                        <span className="inline-flex items-center rounded-full bg-violet-50 text-violet-700 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                          {nomePerfil}
                        </span>
                      )}
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                          ativo ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{usuario.email}</p>
                    {unidadesTexto && (
                      <p className="text-xs text-slate-400 truncate mt-1">{unidadesTexto}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {isAdmin && (
                      <button
                        onClick={() => setSenhaModal({ open: true, usuario })}
                        className="p-2 rounded-lg text-slate-500 hover:bg-amber-50 hover:text-amber-700 transition"
                        aria-label="Alterar senha"
                        title="Alterar senha"
                      >
                        <Lock className="h-4 w-4" />
                      </button>
                    )}
                    {podeEditarUsuarios && (
                      <>
                        <button
                          onClick={() => {
                            setEditingUsuario(usuario)
                            setShowModal(true)
                          }}
                          className="p-2 rounded-lg text-slate-500 hover:bg-violet-50 hover:text-violet-700 transition"
                          aria-label="Editar usuário"
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(usuario.id!)}
                          className="p-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 transition"
                          aria-label="Excluir usuário"
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {usuariosFiltrados.length > 0 && (
        <p className="text-xs text-slate-500 text-center">
          Mostrando {usuariosFiltrados.length} de {usuarios.length} usuário{usuarios.length !== 1 ? 's' : ''}
        </p>
      )}

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
          perfis={perfisDisponiveisParaAdministrador}
          initialUnidadeId={unidadeIdFromState ?? undefined}
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

      {isAdmin && (
        <Modal
          isOpen={senhaModal.open}
          onClose={() => {
            setSenhaModal({ open: false, usuario: null })
            setNovaSenhaInput('')
          }}
          title="Alterar senha"
          size="sm"
        >
          {senhaModal.usuario && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Usuário: <strong>{senhaModal.usuario.nome}</strong> ({senhaModal.usuario.email})
              </p>
              <FormField label="Nova senha">
                <input
                  type="password"
                  value={novaSenhaInput}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNovaSenhaInput(e.target.value)}
                  placeholder="Digite a nova senha"
                  autoComplete="new-password"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 sm:text-sm"
                />
              </FormField>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSenhaModal({ open: false, usuario: null })
                    setNovaSenhaInput('')
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => {
                    const senha = novaSenhaInput.trim()
                    if (!senha) {
                      showNotification('error', 'Informe a nova senha.')
                      return
                    }
                    alterarSenhaMutation.mutate({
                      id: senhaModal.usuario!.id!,
                      novaSenha: senha,
                    })
                  }}
                  disabled={alterarSenhaMutation.isPending || !novaSenhaInput.trim()}
                >
                  {alterarSenhaMutation.isPending ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}

/** Perfil é considerado atendente quando a flag atendente do perfil está ativa (vindo do banco). */
function isPerfilAtendente(perfis: Perfil[], perfilId: number | undefined): boolean {
  if (!perfilId) return false
  const perfil = perfis.find((p) => p.id === perfilId)
  if (!perfil) return false
  const nomePerfil = (perfil.nome ?? '').toUpperCase()
  return perfil.atendente === true || nomePerfil === 'PROFISSIONAL' || nomePerfil === 'ATENDENTE'
}

type FormDataUsuario = Usuario & {
  perfilId?: number
  atendenteCpf?: string
  atendenteTelefone?: string
  atendentePercentualComissao?: number
  atendenteServicosIds?: number[]
  atendenteId?: number
}

function UsuarioForm({
  usuario,
  unidades,
  perfis,
  initialUnidadeId,
  onClose,
}: {
  usuario: Usuario | null
  unidades: Unidade[]
  perfis: Perfil[]
  initialUnidadeId?: number
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const { showNotification } = useNotification()
  const [showPassword, setShowPassword] = useState(false)
  const usuarioLogado = authService.getUsuario()
  const perfilLogado = usuarioLogado?.perfil
  const [formData, setFormData] = useState<FormDataUsuario>(
    usuario
      ? { ...usuario, perfilId: usuario.perfilId ?? undefined, senha: '' }
      : { nome: '', email: '', senha: '', perfilId: undefined, unidadesIds: [], ativo: true }
  )

  const perfilAtendente = isPerfilAtendente(perfis, formData.perfilId)
  const [filtroServicos, setFiltroServicos] = useState('')
  const { data: servicos = [] } = useQuery({
    queryKey: ['servicos'],
    queryFn: servicoService.listar,
  })
  const servicosAtivos = useMemo(
    () => (servicos as Servico[]).filter((s) => s.ativo !== false),
    [servicos]
  )
  const servicosFiltrados = useMemo(() => {
    if (!filtroServicos.trim()) return servicosAtivos
    const term = filtroServicos.toLowerCase().trim()
    return servicosAtivos.filter(
      (s) =>
        s.nome?.toLowerCase().includes(term) ||
        (typeof s.descricao === 'string' && s.descricao.toLowerCase().includes(term))
    )
  }, [servicosAtivos, filtroServicos])
  const { data: atendenteExistente } = useQuery({
    queryKey: ['atendente', 'usuario', usuario?.id],
    queryFn: () => atendenteService.buscarPorUsuarioId(usuario!.id!),
    enabled: !!usuario?.id && perfilAtendente,
    retry: false,
  })

  useEffect(() => {
    if (usuario) {
      let unidadesIds: number[] = []
      if (usuario.unidadesIds && usuario.unidadesIds.length > 0) {
        unidadesIds = usuario.unidadesIds
      } else if (usuario.unidadeId) {
        unidadesIds = [usuario.unidadeId]
      }
      const perfilId =
        usuario.perfilId ??
        (usuario.perfil && perfis.length
          ? perfis.find((p) => p.nome?.toUpperCase() === usuario.perfil)?.id
          : undefined)
      setFormData({
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        senha: '',
        perfilId: perfilId ?? undefined,
        perfil: usuario.perfil,
        unidadesIds,
        ativo: usuario.ativo ?? true,
        atendenteId: undefined,
        atendenteCpf: '',
        atendenteTelefone: '',
        atendentePercentualComissao: undefined,
        atendenteServicosIds: [],
      })
    } else {
      const unidadesIds =
        initialUnidadeId && unidades.some((u) => u.id === initialUnidadeId)
          ? [initialUnidadeId]
          : []
      setFormData({
        nome: '',
        email: '',
        senha: '',
        perfilId: undefined,
        unidadesIds,
        ativo: true,
        atendenteCpf: '',
        atendenteTelefone: '',
        atendentePercentualComissao: undefined,
        atendenteServicosIds: [],
      })
    }
  }, [usuario, perfis, initialUnidadeId, unidades])

  // Preencher dados do atendente quando carregar (edição)
  useEffect(() => {
    if (atendenteExistente) {
      setFormData((prev) => ({
        ...prev,
        atendenteId: atendenteExistente.id,
        atendenteCpf: atendenteExistente.cpf ?? '',
        atendenteTelefone: atendenteExistente.telefone ?? '',
        atendentePercentualComissao:
          atendenteExistente.percentualComissao != null ? Number(atendenteExistente.percentualComissao) : undefined,
        atendenteServicosIds: atendenteExistente.servicosIds ?? [],
      }))
    }
  }, [atendenteExistente])

  const saveMutation = useMutation({
    mutationFn: (data: Usuario) =>
      usuario?.id
        ? usuarioService.atualizar(usuario.id, data)
        : usuarioService.criar(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] })
      queryClient.invalidateQueries({ queryKey: ['atendentes'] })
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Erro ao salvar usuário'
      showNotification('error', errorMessage)
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.perfilId) {
      showNotification('error', 'Selecione um perfil')
      return
    }

    const perfilSelecionado = perfis.find((p) => p.id === formData.perfilId)
    const perfilRequerUnidades = perfilSelecionado?.nome?.toUpperCase() !== 'ADMIN'
    if (perfilRequerUnidades && (!formData.unidadesIds || formData.unidadesIds.length === 0)) {
      showNotification('error', 'Selecione pelo menos uma unidade. Apenas o perfil Administrador não exige unidade.')
      return
    }

    if (perfilAtendente) {
      if (!formData.atendenteCpf?.trim()) {
        showNotification('error', 'CPF é obrigatório para perfil atendente/profissional')
        return
      }
      if (!formData.unidadesIds?.length) {
        showNotification('error', 'Selecione pelo menos uma unidade')
        return
      }
    }

    const dadosUsuario = {
      ...formData,
      perfilId: formData.perfilId,
      perfil: undefined,
      unidadesIds: formData.unidadesIds,
    }
    try {
      const usuarioSalvo = await saveMutation.mutateAsync(dadosUsuario)
      const usuarioId = usuarioSalvo.id ?? usuario?.id
      if (perfilAtendente && usuarioId && formData.unidadesIds?.length) {
        const unidadeId = formData.unidadesIds[0]
        const payload: Partial<Atendente> = {
          usuarioId,
          unidadeId,
          cpf: (formData.atendenteCpf ?? '').replace(/\D/g, ''),
          telefone: formData.atendenteTelefone?.replace(/\D/g, ''),
          percentualComissao: formData.atendentePercentualComissao ?? 0,
          servicosIds: formData.atendenteServicosIds ?? [],
          ativo: formData.ativo ?? true,
        }
        if (formData.atendenteId) {
          await atendenteService.atualizar(formData.atendenteId, payload as Atendente)
        } else {
          await atendenteService.criar(payload as Atendente)
        }
        queryClient.invalidateQueries({ queryKey: ['atendentes'] })
      }
      queryClient.invalidateQueries({ queryKey: ['usuarios'] })
      showNotification('success', usuario ? 'Usuário atualizado com sucesso!' : 'Usuário criado com sucesso!')
      onClose()
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Erro ao salvar'
      showNotification('error', msg)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Nome" required>
        <input
          type="text"
          required
          value={formData.nome}
          onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500"
        />
      </FormField>

      <FormField label="Email" required>
        <input
          type="email"
          required
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: maskEmail(e.target.value) })}
          placeholder="exemplo@email.com"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500"
        />
      </FormField>

      <FormField label={usuario ? 'Nova Senha (deixe em branco para manter)' : 'Senha'} required={!usuario}>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            required={!usuario}
            value={formData.senha || ''}
            onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500"
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
          value={formData.perfilId ?? ''}
          onChange={(e) => {
            const perfilId = e.target.value ? Number(e.target.value) : undefined
            const ehAtendente = perfilId ? isPerfilAtendente(perfis, perfilId) : false
            setFormData({
              ...formData,
              perfilId,
              unidadesIds: perfilId ? (formData.unidadesIds ?? []) : [],
              ...(!ehAtendente && {
                atendenteCpf: '',
                atendenteTelefone: '',
                atendentePercentualComissao: undefined,
                atendenteServicosIds: [],
                atendenteId: undefined,
              }),
            })
          }}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500"
        >
          <option value="">Selecione um perfil</option>
          {perfis
            .filter((p) => p.id != null && p.ativo !== false)
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
        </select>
      </FormField>

      {formData.perfilId != null &&
        perfis.find((p) => p.id === formData.perfilId)?.nome?.toUpperCase() !== 'ADMIN' && (
        <FormField 
          label={`Unidades ${formData.unidadesIds && formData.unidadesIds.length > 0 ? `(${formData.unidadesIds.length} selecionada${formData.unidadesIds.length > 1 ? 's' : ''})` : ''}`} 
          required
        >
          <p className="text-xs text-gray-500 mb-2">Selecione pelo menos uma unidade onde este usuário atua.</p>
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
                        className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
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

      {/* Seção Atendente: CPF, telefone, comissão e serviços (quando perfil for atendente/profissional) */}
      {perfilAtendente && (
        <div className="border-t pt-4 space-y-4">
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-violet-600" />
            Dados do atendente / profissional
          </h3>
          <p className="text-xs text-gray-500">
            Unidade de atuação: primeira unidade selecionada acima. Serviços que esta pessoa pode prestar:
          </p>
          <FormField label="CPF" required>
            <input
              type="text"
              required
              value={formData.atendenteCpf ?? ''}
              onChange={(e) => setFormData({ ...formData, atendenteCpf: maskCPF(e.target.value) })}
              placeholder="000.000.000-00"
              maxLength={14}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500"
            />
          </FormField>
          <FormField label="Telefone">
            <input
              type="text"
              value={formData.atendenteTelefone ?? ''}
              onChange={(e) => setFormData({ ...formData, atendenteTelefone: maskPhone(e.target.value) })}
              placeholder="(00) 00000-0000"
              maxLength={15}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500"
            />
          </FormField>
          <FormField label="Percentual de comissão (%)">
            <input
              type="text"
              inputMode="decimal"
              value={formData.atendentePercentualComissao === undefined || formData.atendentePercentualComissao === null
                ? ''
                : String(formData.atendentePercentualComissao).replace('.', ',')}
              onChange={(e) => {
                const cleaned = e.target.value
                  .replace(/[^\d,.]/g, '')
                  .replace(/[.,]/g, ',')
                  .replace(/(,.*?),/g, '$1')
                if (cleaned === '') {
                  setFormData({ ...formData, atendentePercentualComissao: undefined })
                  return
                }
                const numValue = parseFloat(cleaned.replace(',', '.'))
                if (!isNaN(numValue)) {
                  setFormData({ ...formData, atendentePercentualComissao: Math.max(0, Math.min(100, numValue)) })
                }
              }}
              placeholder="0,00"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500"
            />
          </FormField>
          <FormField label="Serviços que este atendente presta">
            <input
              type="text"
              value={filtroServicos}
              onChange={(e) => setFiltroServicos(e.target.value)}
              placeholder="Buscar serviço por nome ou descrição..."
              className="mt-1 mb-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500 text-sm"
            />
            <div className="mt-1 max-h-44 overflow-y-auto border border-gray-300 rounded-md p-3 space-y-2 bg-gray-50">
              {servicosAtivos.length === 0 ? (
                <p className="text-sm text-gray-500">Nenhum serviço cadastrado</p>
              ) : servicosFiltrados.length === 0 ? (
                <p className="text-sm text-gray-500">Nenhum serviço encontrado com &quot;{filtroServicos}&quot;</p>
              ) : (
                servicosFiltrados.map((s) => (
                  <label
                    key={s.id}
                    className="flex items-center space-x-3 cursor-pointer hover:bg-white p-2 rounded transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={formData.atendenteServicosIds?.includes(s.id) ?? false}
                      onChange={(e) => {
                        const ids = formData.atendenteServicosIds ?? []
                        const newIds = e.target.checked
                          ? [...ids, s.id]
                          : ids.filter((id) => id !== s.id)
                        setFormData({ ...formData, atendenteServicosIds: newIds })
                      }}
                      className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                    />
                    <span className="text-sm text-gray-900">
                      {s.nome}
                      {s.valor != null && (
                        <span className="text-gray-500 ml-1">R$ {Number(s.valor).toFixed(2)}</span>
                      )}
                    </span>
                  </label>
                ))
              )}
            </div>
          </FormField>
        </div>
      )}

      <FormField label="Status">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={formData.ativo}
            onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
            className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
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
