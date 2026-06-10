import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import { atendenteService, Atendente } from '../services/atendenteService'
import { unidadeService } from '../services/unidadeService'
import { usuarioService, Usuario } from '../services/usuarioService'
import { servicoService } from '../services/servicoService'
import { Plus, Trash2, Edit } from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import Modal from '../components/Modal'
import Button from '../components/Button'
import FormField from '../components/FormField'
import FilterBar from '../components/FilterBar'
import { useNotification } from '../contexts/NotificationContext'
import ConfirmDialog from '../components/ConfirmDialog'
import { maskEmail, maskCPF, maskCNPJ, unmask } from '../utils/masks'
import PhoneInput from '../components/forms/PhoneInput'
import { authService } from '../services/authService'
import { perfilService } from '../services/perfilService'
import { podeEditar } from '../utils/permissions'
import { getApiErrorMessage } from '../utils/apiError'
import { useCategoria } from '../hooks/useCategoria'

type ProfissionalListItem = Atendente & {
  itemKey: string
  tipoRegistro: 'ATENDENTE' | 'ADMINISTRADOR'
}

export default function Atendentes() {
  const { showNotification } = useNotification()
  const { dict } = useCategoria()
  const [showModal, setShowModal] = useState(false)
  const [editingAtendente, setEditingAtendente] = useState<Atendente | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: number | null }>({ isOpen: false, id: null })
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState<{ ativo?: string }>({})
  const [initialUnidadeId, setInitialUnidadeId] = useState<number | undefined>(undefined)
  const queryClient = useQueryClient()
  const usuario = authService.getUsuario()
  const location = useLocation()
  const navigate = useNavigate()
  const unidadeIdFromState = (location.state as { unidadeId?: number } | null)?.unidadeId

  const { data: perfilUsuarioPermissoes } = useQuery({
    queryKey: ['perfil', 'meu'],
    queryFn: () => perfilService.buscarMeuPerfil(),
    enabled: !!usuario,
  })
  const podeEditarProfissionais =
    podeEditar(perfilUsuarioPermissoes, '/profissionais') || podeEditar(perfilUsuarioPermissoes, '/usuarios')

  const { data: atendentes = [], isLoading } = useQuery({
    queryKey: ['atendentes'],
    queryFn: atendenteService.listarTodos,
  })
  const { data: usuarios = [] } = useQuery({
    queryKey: ['usuarios'],
    queryFn: usuarioService.listar,
  })

  const emailPorUsuarioId = useMemo(() => {
    const mapa = new Map<number, string>()
    usuarios.forEach((u) => {
      if (u.id) mapa.set(u.id, u.email)
    })
    return mapa
  }, [usuarios])

  const administradores = useMemo<ProfissionalListItem[]>(() => {
    return usuarios
      .filter((usuario) => (usuario.perfil ?? '').toUpperCase().trim() === 'ADMINISTRADOR')
      .map((usuario) => ({
        itemKey: `admin-${usuario.id}`,
        id: usuario.id,
        usuarioId: usuario.id ?? 0,
        unidadeId: usuario.unidadeId ?? 0,
        cpf: '',
        telefone: usuario.telefone,
        ativo: usuario.ativo ?? true,
        nomeUsuario: usuario.nome,
        emailUsuario: usuario.email,
        percentualComissao: undefined,
        tipoRegistro: 'ADMINISTRADOR',
      }))
  }, [usuarios])

  const profissionaisNaTela = useMemo<ProfissionalListItem[]>(() => {
    const administradoresIds = new Set(administradores.map((item) => item.usuarioId))
    const atendentesNormalizados = atendentes
      .filter((atendente) => !administradoresIds.has(atendente.usuarioId))
      .map((atendente) => ({
        ...atendente,
        itemKey: `atendente-${atendente.id ?? atendente.usuarioId}`,
        tipoRegistro: 'ATENDENTE' as const,
      }))

    return [...administradores, ...atendentesNormalizados]
  }, [administradores, atendentes])

  // Filtrar atendentes
  const atendentesFiltrados = useMemo(() => {
    let filtered = [...profissionaisNaTela]

    // Filtro de busca
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (a) =>
          a.nomeUsuario?.toLowerCase().includes(term) ||
          a.emailUsuario?.toLowerCase().includes(term) ||
          emailPorUsuarioId.get(a.usuarioId)?.toLowerCase().includes(term)
      )
    }

    // Filtro de status
    if (filters.ativo !== undefined && filters.ativo !== '') {
      const isAtivo = filters.ativo === 'true'
      filtered = filtered.filter((a) => (a.ativo ?? true) === isAtivo)
    }

    return filtered
  }, [profissionaisNaTela, searchTerm, filters, emailPorUsuarioId])

  const deleteMutation = useMutation({
    mutationFn: atendenteService.excluir,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['atendentes'] })
      showNotification('success', 'Profissional excluído com sucesso!')
      setConfirmDelete({ isOpen: false, id: null })
    },
    onError: (error: any) => {
      showNotification('error', getApiErrorMessage(error, 'Erro ao excluir profissional'))
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

  useEffect(() => {
    if (unidadeIdFromState) {
      setInitialUnidadeId(unidadeIdFromState)
      setEditingAtendente(null)
      setShowModal(true)
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [unidadeIdFromState, navigate, location.pathname])

  if (isLoading) {
    return <div className="text-center py-8">Carregando...</div>
  }

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{dict.rotuloAtendentePlural}</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Gerencie sua equipe de profissionais.
          </p>
        </div>
        {podeEditarProfissionais && (
          <Button
            onClick={() => {
              setInitialUnidadeId(undefined)
              setEditingAtendente(null)
              setShowModal(true)
            }}
          >
            <Plus className="h-4 w-4" />
            Novo {dict.rotuloAtendente}
          </Button>
        )}
      </header>

      {/* Barra de Filtros */}
      <FilterBar
        onSearchChange={setSearchTerm}
        onFilterChange={setFilters}
        searchPlaceholder="Buscar por nome ou email..."
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

      {/* Lista de profissionais como cards */}
      {atendentesFiltrados.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center mb-3">
            <Plus className="h-5 w-5" />
          </div>
          <p className="text-sm text-slate-600">
            {searchTerm || Object.values(filters).some(v => v !== '' && v !== undefined)
              ? 'Nenhum profissional encontrado com os filtros aplicados.'
              : 'Nenhum profissional cadastrado ainda.'}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {atendentesFiltrados.map((atendente) => {
            const isAdmin = atendente.tipoRegistro === 'ADMINISTRADOR'
            const nome = atendente.nomeUsuario || 'Profissional'
            const email = atendente.emailUsuario || emailPorUsuarioId.get(atendente.usuarioId)
            const inicial = nome.charAt(0).toUpperCase()
            const comissaoNum = atendente.percentualComissao != null
              ? (typeof atendente.percentualComissao === 'number'
                  ? atendente.percentualComissao
                  : parseFloat(String(atendente.percentualComissao)))
              : 0
            return (
              <li
                key={atendente.itemKey}
                className="bg-white border border-slate-200 rounded-2xl p-4 hover:shadow-sm transition"
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="h-10 w-10 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {inicial}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-slate-900 truncate">{nome}</p>
                      {isAdmin && (
                        <span className="inline-flex items-center rounded-full bg-violet-50 text-violet-700 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                          Administrador
                        </span>
                      )}
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                          atendente.ativo
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {atendente.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                    {email && (
                      <p className="text-xs text-slate-500 truncate mt-0.5">{email}</p>
                    )}
                    {!isAdmin && (
                      <p className="text-xs text-slate-500 mt-1">
                        Comissão:{' '}
                        <span className="font-semibold text-slate-700">
                          {comissaoNum.toFixed(2).replace('.', ',')}%
                        </span>
                      </p>
                    )}
                  </div>

                  {/* Ações */}
                  {podeEditarProfissionais && !isAdmin && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => {
                          setEditingAtendente(atendente)
                          setShowModal(true)
                        }}
                        className="p-2 rounded-lg text-slate-500 hover:bg-violet-50 hover:text-violet-700 transition"
                        aria-label="Editar profissional"
                        title="Editar"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(atendente.id!)}
                        className="p-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 transition"
                        aria-label="Excluir profissional"
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {/* Rodapé com contagem */}
      {atendentesFiltrados.length > 0 && (
        <p className="text-xs text-slate-500 text-center">
          Mostrando {atendentesFiltrados.length} de {profissionaisNaTela.length}{' '}
          {profissionaisNaTela.length !== 1 ? 'profissionais' : 'profissional'}
        </p>
      )}

      {podeEditarProfissionais && (
        <Modal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false)
            setEditingAtendente(null)
            setInitialUnidadeId(undefined)
          }}
          title={editingAtendente ? 'Editar Profissional' : 'Novo Profissional'}
          size="lg"
        >
          <AtendenteForm
            atendente={editingAtendente}
            usuarios={usuarios}
            initialUnidadeId={initialUnidadeId}
            onClose={() => {
              setShowModal(false)
              setEditingAtendente(null)
              setInitialUnidadeId(undefined)
            }}
          />
        </Modal>
      )}

      {podeEditarProfissionais && (
        <ConfirmDialog
          isOpen={confirmDelete.isOpen}
          title="Confirmar Exclusão"
          message="Tem certeza que deseja excluir este profissional? Esta ação não pode ser desfeita."
          confirmText="Excluir"
          cancelText="Cancelar"
          variant="danger"
          onConfirm={confirmDeleteAction}
          onCancel={() => setConfirmDelete({ isOpen: false, id: null })}
        />
      )}
    </div>
  )
}

function AtendenteForm({
  atendente,
  usuarios,
  initialUnidadeId,
  onClose,
}: {
  atendente: Atendente | null
  usuarios: Usuario[]
  initialUnidadeId?: number
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const { showNotification } = useNotification()
  const usuarioLogado = authService.getUsuario()
  const perfilNorm = (usuarioLogado?.perfil ?? '').toUpperCase().replace('-', '_')
  const isAdministrador = perfilNorm === 'ADMINISTRADOR' || perfilNorm === 'ADMIN_UNICO'
  const [formData, setFormData] = useState<Atendente>({
    unidadeId: 0,
    usuarioId: 0,
    cpf: '',
    telefone: '',
    percentualComissao: undefined,
    ativo: true,
  })

  const { data: unidades = [] } = useQuery({
    queryKey: ['unidades'],
    queryFn: unidadeService.listarTodos,
  })

  const usuarioEdicao = useMemo(
    () => usuarios.find((u) => u.id === atendente?.usuarioId),
    [usuarios, atendente?.usuarioId]
  )
  const { data: usuarioEdicaoDetalhe } = useQuery({
    queryKey: ['usuarios', 'edicao-profissional', atendente?.usuarioId],
    queryFn: () => usuarioService.buscarPorId(atendente!.usuarioId!),
    enabled: !!atendente?.usuarioId && !usuarioEdicao,
    retry: false,
  })
  const usuarioEdicaoResolvido = usuarioEdicao ?? usuarioEdicaoDetalhe

  const unidadePadraoAdministradorId = useMemo(() => {
    if (!isAdministrador) return 0
    if (usuarioLogado?.unidadeId && usuarioLogado.unidadeId > 0) return usuarioLogado.unidadeId
    const primeiraUnidadeValida = unidades.find((u) => (u.id ?? 0) > 0)
    return primeiraUnidadeValida?.id ?? 0
  }, [isAdministrador, usuarioLogado?.unidadeId, unidades])

  const unidadeIdEfetiva = formData.unidadeId && formData.unidadeId > 0
    ? formData.unidadeId
    : isAdministrador ? unidadePadraoAdministradorId : 0

  const { data: servicosDisponiveis = [] } = useQuery({
    queryKey: ['servicos', 'unidade', unidadeIdEfetiva],
    queryFn: () => servicoService.listarAtivosPorUnidade(unidadeIdEfetiva),
    enabled: unidadeIdEfetiva > 0,
  })

  const [servicosIdsSelecionados, setServicosIdsSelecionados] = useState<number[]>([])

  const [usuarioNovo, setUsuarioNovo] = useState({
    nome: '',
    email: '',
    senha: '',
    perfilId: undefined as number | undefined,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { data: perfis = [] } = useQuery({
    queryKey: ['perfis'],
    queryFn: perfilService.listarTodos,
  })
  const perfisDisponiveis = useMemo(() => {
    const ativos = perfis.filter((p) => p.id != null && p.ativo !== false)
    const dedupePorNome = (lista: typeof ativos) => {
      const unicos = new Map<string, (typeof ativos)[number]>()
      lista.forEach((perfil) => {
        const chave = (perfil.nome ?? '').toUpperCase().trim()
        if (!chave) return
        if (!unicos.has(chave)) unicos.set(chave, perfil)
      })
      return Array.from(unicos.values())
    }

    if (isAdministrador) {
      const permitidos = new Set(['ADMINISTRADOR', 'PROFISSIONAL', 'SECRETARIA', 'ATENDENTE'])
      const filtrados = ativos.filter((p) => permitidos.has((p.nome ?? '').toUpperCase().trim()))
      // Se SECRETARIA ainda não existe no banco, usa ATENDENTE como fallback.
      const temSecretaria = filtrados.some((p) => (p.nome ?? '').toUpperCase().trim() === 'SECRETARIA')
      const normalizados = temSecretaria
        ? filtrados.filter((p) => (p.nome ?? '').toUpperCase().trim() !== 'ATENDENTE')
        : filtrados
      return dedupePorNome(normalizados)
    }
    return dedupePorNome(ativos.filter((p) => {
      const nome = (p.nome ?? '').toUpperCase()
      return p.atendente === true || nome === 'PROFISSIONAL' || nome === 'SECRETARIA' || nome === 'ATENDENTE'
    }))
  }, [perfis, isAdministrador])
  const perfilPadraoId = useMemo(
    () => perfisDisponiveis.find((p) => (p.nome ?? '').toUpperCase() === 'PROFISSIONAL')?.id ?? perfisDisponiveis[0]?.id,
    [perfisDisponiveis]
  )

  // Carrega dados do atendente quando edita
  useEffect(() => {
    if (atendente) {
      setFormData({
        unidadeId: atendente.unidadeId || 0,
        usuarioId: atendente.usuarioId || 0,
        cpf: atendente.cpf || '',
        telefone: atendente.telefone || '',
        percentualComissao: atendente.percentualComissao !== undefined && atendente.percentualComissao !== null && atendente.percentualComissao !== 0
          ? atendente.percentualComissao
          : undefined,
        ativo: atendente.ativo !== undefined ? atendente.ativo : true,
      })
      setServicosIdsSelecionados(atendente.servicosIds ?? [])
      setUsuarioNovo({
        nome: usuarioEdicaoResolvido?.nome || '',
        email: usuarioEdicaoResolvido?.email || '',
        senha: '',
        perfilId: usuarioEdicaoResolvido?.perfilId ?? perfilPadraoId,
      })
    } else {
      // Reset para novo atendente
      setFormData({
        unidadeId: initialUnidadeId && initialUnidadeId > 0
          ? initialUnidadeId
          : isAdministrador
            ? unidadePadraoAdministradorId
            : 0,
        usuarioId: 0,
        cpf: '',
        telefone: '',
        percentualComissao: undefined,
        ativo: true,
      })
      setUsuarioNovo({ nome: '', email: '', senha: '', perfilId: perfilPadraoId })
      setServicosIdsSelecionados([])
    }
    // Dep: atendente?.id apenas — evita reset acidental quando perfis/unidades terminam de carregar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atendente?.id])


  const saveMutation = useMutation({
    mutationFn: (data: Atendente) =>
      atendente?.id
        ? atendenteService.atualizar(atendente.id, data)
        : atendenteService.criar(data),
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    const unidadeIdFinal = formData.unidadeId && formData.unidadeId > 0
      ? formData.unidadeId
      : initialUnidadeId && initialUnidadeId > 0
        ? initialUnidadeId
        : isAdministrador
          ? unidadePadraoAdministradorId
          : formData.unidadeId

    if (!unidadeIdFinal || unidadeIdFinal === 0) {
      showNotification('error', 'Não foi possível identificar a unidade padrão.')
      setIsSubmitting(false)
      return
    }

    if (!usuarioNovo.nome.trim()) {
      showNotification('error', 'Nome é obrigatório')
      setIsSubmitting(false)
      return
    }
    if (!usuarioNovo.email.trim()) {
      showNotification('error', 'Email é obrigatório')
      setIsSubmitting(false)
      return
    }
    if (!atendente?.id && (!usuarioNovo.senha || usuarioNovo.senha.length < 6)) {
      showNotification('error', 'Senha é obrigatória e deve ter no mínimo 6 caracteres')
      setIsSubmitting(false)
      return
    }
    if (!usuarioNovo.perfilId) {
      showNotification('error', 'Selecione um perfil')
      setIsSubmitting(false)
      return
    }
    const cpfCnpjNumeros = (formData.cpf || '').replace(/\D/g, '')
    if (!cpfCnpjNumeros) {
      showNotification('error', 'CPF/CNPJ é obrigatório')
      setIsSubmitting(false)
      return
    }
    if (cpfCnpjNumeros.length !== 11 && cpfCnpjNumeros.length !== 14) {
      showNotification('error', 'CPF deve ter 11 dígitos ou CNPJ 14 dígitos')
      setIsSubmitting(false)
      return
    }

    const dataToSave = {
      ...formData,
      unidadeId: unidadeIdFinal,
      cpf: cpfCnpjNumeros,
      percentualComissao: formData.percentualComissao === undefined || formData.percentualComissao === null
        ? 0
        : formData.percentualComissao,
      servicosIds: servicosIdsSelecionados,
    }

    let usuarioCriadoId: number | null = null
    try {
      let usuarioId = formData.usuarioId || atendente?.usuarioId || usuarioEdicaoResolvido?.id || 0

      if (atendente?.id && usuarioId) {
        const payloadUsuario: any = {
          nome: usuarioNovo.nome.trim(),
          email: usuarioNovo.email.trim(),
          perfilId: usuarioNovo.perfilId,
          unidadesIds: [unidadeIdFinal],
          telefone: (formData.telefone || '').replace(/\D/g, ''),
          ativo: formData.ativo ?? true,
        }
        if (usuarioNovo.senha.trim()) {
          payloadUsuario.senha = usuarioNovo.senha.trim()
        }
        await usuarioService.atualizar(usuarioId, payloadUsuario)
      } else {
        const usuarioCriado = await usuarioService.criar({
          nome: usuarioNovo.nome.trim(),
          email: usuarioNovo.email.trim(),
          senha: usuarioNovo.senha.trim(),
          perfilId: usuarioNovo.perfilId,
          unidadesIds: [unidadeIdFinal],
          telefone: (formData.telefone || '').replace(/\D/g, ''),
          ativo: formData.ativo ?? true,
        } as any)
        usuarioId = usuarioCriado.id || 0
        usuarioCriadoId = usuarioId
      }

      if (!usuarioId) {
        showNotification('error', 'Não foi possível criar o usuário do profissional')
        setIsSubmitting(false)
        return
      }

      await saveMutation.mutateAsync({ ...dataToSave, usuarioId } as any)
      queryClient.invalidateQueries({ queryKey: ['atendentes'] })
      showNotification('success', atendente ? 'Profissional atualizado com sucesso!' : 'Profissional criado com sucesso!')
      onClose()
    } catch (error: any) {
      if (!atendente?.id && usuarioCriadoId) {
        try {
          await usuarioService.excluir(usuarioCriadoId)
        } catch (_) {
          // rollback best-effort
        }
      }
      showNotification('error', getApiErrorMessage(error, 'Erro ao salvar profissional'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {!isAdministrador && (
        <FormField label="Unidade" required>
          <select
            required
            value={formData.unidadeId}
            onChange={(e) => setFormData({ ...formData, unidadeId: parseInt(e.target.value) })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500"
          >
            <option value="0">Selecione uma unidade</option>
            {unidades.map((unidade) => (
              <option key={unidade.id} value={unidade.id}>
                {unidade.nome}
              </option>
            ))}
          </select>
        </FormField>
      )}

      <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 space-y-4">
        <h3 className="text-sm font-semibold text-gray-800">Dados de Acesso</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <FormField label="Nome" required>
              <input
                type="text"
                required
                value={usuarioNovo.nome}
                onChange={(e) => setUsuarioNovo((prev) => ({ ...prev, nome: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500"
              />
            </FormField>
          </div>

          <FormField label="Email" required>
            <input
              type="email"
              required
              value={usuarioNovo.email}
              onChange={(e) => setUsuarioNovo((prev) => ({ ...prev, email: maskEmail(e.target.value) }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500"
            />
          </FormField>

          <FormField label="Perfil" required>
            <select
              required
              value={usuarioNovo.perfilId ?? ''}
              onChange={(e) => setUsuarioNovo((prev) => ({ ...prev, perfilId: e.target.value ? Number(e.target.value) : undefined }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500"
            >
              <option value="">Selecione um perfil</option>
              {perfisDisponiveis.map((perfil) => (
                <option key={perfil.id} value={perfil.id}>
                  {(perfil.nome ?? '').toUpperCase().trim() === 'ATENDENTE' ? 'SECRETARIA' : perfil.nome}
                </option>
              ))}
            </select>
          </FormField>

          <div className="md:col-span-2">
            <FormField label={atendente?.id ? 'Senha (opcional na edição)' : 'Senha'} required={!atendente?.id}>
              <input
                type="password"
                required={!atendente?.id}
                value={usuarioNovo.senha}
                onChange={(e) => setUsuarioNovo((prev) => ({ ...prev, senha: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500"
              />
            </FormField>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 space-y-4">
        <h3 className="text-sm font-semibold text-gray-800">Dados Profissionais</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="CPF/CNPJ" required>
            {/* #144: CPF/CNPJ sempre exibido por completo, nunca mascarado parcialmente. */}
            <input
              type="text"
              required
              value={formData.cpf || ''}
              onChange={(e) => {
                const value = e.target.value
                const numbers = unmask(value)
                const masked = numbers.length <= 11 ? maskCPF(value) : maskCNPJ(value)
                setFormData({ ...formData, cpf: masked })
              }}
              maxLength={18}
              placeholder="000.000.000-00 ou 00.000.000/0000-00"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500"
            />
          </FormField>

          <FormField label="Telefone">
            {/* #144: máscara automática (10 ou 11 dígitos) durante a digitação. */}
            <PhoneInput
              value={formData.telefone || ''}
              onChange={(masked) => setFormData({ ...formData, telefone: masked })}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-200 focus:outline-none"
            />
          </FormField>

          <div className="md:col-span-2">
            <FormField label="Percentual de Comissão (%)">
              <input
                type="text"
                inputMode="decimal"
                value={formData.percentualComissao !== undefined && formData.percentualComissao !== null && formData.percentualComissao !== 0
                  ? String(formData.percentualComissao).replace('.', ',')
                  : ''}
                onChange={(e) => {
                  // aceita dígitos e UMA vírgula/ponto; bloqueia letras e múltiplos separadores
                  const cleaned = e.target.value
                    .replace(/[^\d,.]/g, '')
                    .replace(/[.,]/g, ',')
                    .replace(/(,.*?),/g, '$1')
                  if (cleaned === '') {
                    setFormData({ ...formData, percentualComissao: 0 })
                    return
                  }
                  const numValue = parseFloat(cleaned.replace(',', '.'))
                  if (!isNaN(numValue)) {
                    const clamped = Math.max(0, Math.min(100, numValue))
                    setFormData({ ...formData, percentualComissao: clamped })
                  }
                }}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500"
                placeholder="0,00"
              />
              <p className="mt-1 text-xs text-gray-500">Percentual de comissão sobre os serviços prestados (0.00 a 100.00). Deixe vazio para 0%.</p>
            </FormField>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-800">
          Serviços
          {servicosIdsSelecionados.length > 0 && (
            <span className="ml-2 text-xs font-normal text-violet-600">
              {servicosIdsSelecionados.length} selecionado{servicosIdsSelecionados.length > 1 ? 's' : ''}
            </span>
          )}
        </h3>
        {unidadeIdEfetiva === 0 ? (
          <p className="text-sm text-gray-500">Selecione uma unidade para listar os serviços.</p>
        ) : servicosDisponiveis.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhum serviço cadastrado nesta unidade. Cadastre serviços em <strong>Serviços</strong> para poder vinculá-los aqui.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
            {servicosDisponiveis.map((servico) => (
              <label key={servico.id} className="flex items-center gap-2 cursor-pointer rounded-md px-2 py-1.5 hover:bg-white transition-colors">
                <input
                  type="checkbox"
                  checked={servicosIdsSelecionados.includes(servico.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setServicosIdsSelecionados((prev) => [...prev, servico.id])
                    } else {
                      setServicosIdsSelecionados((prev) => prev.filter((id) => id !== servico.id))
                    }
                  }}
                  className="rounded border-gray-300 text-violet-600 focus:ring-violet-500 flex-shrink-0"
                />
                <span className="text-sm text-gray-700 truncate flex-1">{servico.nome}</span>
                <span className="text-xs text-gray-400 flex-shrink-0">{servico.duracaoMinutos}min</span>
              </label>
            ))}
          </div>
        )}
      </div>

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
        <Button type="submit" isLoading={isSubmitting || saveMutation.isPending}>
          Salvar
        </Button>
      </div>
    </form>
  )
}
