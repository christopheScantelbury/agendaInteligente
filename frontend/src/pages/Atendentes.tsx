import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import { atendenteService, Atendente } from '../services/atendenteService'
import { unidadeService } from '../services/unidadeService'
import { usuarioService, Usuario } from '../services/usuarioService'
import { Plus, Trash2, Edit } from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import Modal from '../components/Modal'
import Button from '../components/Button'
import FormField from '../components/FormField'
import FilterBar from '../components/FilterBar'
import { useNotification } from '../contexts/NotificationContext'
import ConfirmDialog from '../components/ConfirmDialog'
import { maskPhone, maskEmail, maskCPF, maskCNPJ } from '../utils/masks'
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
    <div className="w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{dict.rotuloAtendentePlural}</h1>
        {podeEditarProfissionais && (
          <Button
            onClick={() => {
              setInitialUnidadeId(undefined)
              setEditingAtendente(null)
              setShowModal(true)
            }}
          >
            <Plus className="h-5 w-5 mr-2" />
            Novo {dict.rotuloAtendente}
          </Button>
        )}
      </div>

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

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {atendentesFiltrados.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {searchTerm || Object.values(filters).some(v => v !== '' && v !== undefined)
                ? 'Nenhum profissional encontrado com os filtros aplicados'
                : 'Nenhum profissional cadastrado'}
            </p>
          </div>
        ) : (
          <div>
            <div className="hidden sm:grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wide">
              <div className="col-span-4">Nome</div>
              <div className="col-span-4">Email</div>
              <div className="col-span-2">Comissão</div>
              <div className="col-span-1">Ativo</div>
              {podeEditarProfissionais && <div className="col-span-1 text-right">Ações</div>}
            </div>
          <ul className="divide-y divide-gray-200">
            {atendentesFiltrados.map((atendente) => (
            <li key={atendente.itemKey} className="px-6 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4 items-center">
                <div className="sm:col-span-4 text-sm font-medium text-gray-900 truncate">
                  {atendente.nomeUsuario || 'Profissional'}
                  {atendente.tipoRegistro === 'ADMINISTRADOR' && (
                    <span className="ml-2 inline-flex items-center rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-800">
                      Administrador
                    </span>
                  )}
                </div>
                <div className="sm:col-span-4 text-sm text-gray-600 truncate">
                  {atendente.emailUsuario || emailPorUsuarioId.get(atendente.usuarioId) || '—'}
                </div>
                <div className="sm:col-span-2 text-sm text-gray-700">
                  {atendente.tipoRegistro === 'ADMINISTRADOR'
                    ? '—'
                    : (atendente.percentualComissao !== undefined && atendente.percentualComissao !== null)
                    ? `${typeof atendente.percentualComissao === 'number'
                        ? atendente.percentualComissao.toFixed(2)
                        : parseFloat(String(atendente.percentualComissao)).toFixed(2)}%`
                    : '0.00%'}
                </div>
                <div className="sm:col-span-1">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${atendente.ativo
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                      }`}
                  >
                    {atendente.ativo ? 'Sim' : 'Não'}
                  </span>
                </div>
                {podeEditarProfissionais && atendente.tipoRegistro !== 'ADMINISTRADOR' && (
                  <div className="sm:col-span-1 flex items-center justify-start sm:justify-end gap-2">
                    <button
                      onClick={() => {
                        setEditingAtendente(atendente)
                        setShowModal(true)
                      }}
                      className="inline-flex items-center justify-center rounded-md border border-blue-200 bg-blue-50 p-2 text-blue-700 hover:bg-blue-100 transition-colors"
                      aria-label="Editar profissional"
                      title="Editar"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(atendente.id!)}
                      className="inline-flex items-center justify-center rounded-md border border-red-200 bg-red-50 p-2 text-red-700 hover:bg-red-100 transition-colors"
                      aria-label="Excluir profissional"
                      title="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </li>
            ))}
          </ul>
          </div>
        )}
        {atendentesFiltrados.length > 0 && (
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-600">
            Mostrando {atendentesFiltrados.length} de {profissionaisNaTela.length} {profissionaisNaTela.length !== 1 ? 'profissionais' : 'profissional'}
          </div>
        )}
      </div>

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
    }
  }, [atendente, usuarioEdicaoResolvido, initialUnidadeId, isAdministrador, unidadePadraoAdministradorId, perfilPadraoId])


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
        : formData.percentualComissao
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
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </FormField>
          </div>

          <FormField label="Email" required>
            <input
              type="email"
              required
              value={usuarioNovo.email}
              onChange={(e) => setUsuarioNovo((prev) => ({ ...prev, email: maskEmail(e.target.value) }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </FormField>

          <FormField label="Perfil" required>
            <select
              required
              value={usuarioNovo.perfilId ?? ''}
              onChange={(e) => setUsuarioNovo((prev) => ({ ...prev, perfilId: e.target.value ? Number(e.target.value) : undefined }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </FormField>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 space-y-4">
        <h3 className="text-sm font-semibold text-gray-800">Dados Profissionais</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="CPF/CNPJ" required>
            <input
              type="text"
              required
              value={formData.cpf || ''}
              onChange={(e) => {
                const value = e.target.value
                const numbers = value.replace(/\D/g, '')
                const masked = numbers.length <= 11 ? maskCPF(value) : maskCNPJ(value)
                setFormData({ ...formData, cpf: masked })
              }}
              maxLength={18}
              placeholder="000.000.000-00 ou 00.000.000/0000-00"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </FormField>

          <FormField label="Telefone">
            <input
              type="text"
              value={formData.telefone || ''}
              onChange={(e) => setFormData({ ...formData, telefone: maskPhone(e.target.value) })}
              maxLength={15}
              placeholder="(00) 00000-0000"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </FormField>

          <div className="md:col-span-2">
            <FormField label="Percentual de Comissão (%)">
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.percentualComissao !== undefined && formData.percentualComissao !== null && formData.percentualComissao !== 0
                  ? formData.percentualComissao
                  : ''}
                onChange={(e) => {
                  const value = e.target.value
                  if (value === '') {
                    setFormData({ ...formData, percentualComissao: 0 })
                  } else {
                    const numValue = parseFloat(value)
                    setFormData({
                      ...formData,
                      percentualComissao: isNaN(numValue) ? 0 : numValue
                    })
                  }
                }}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="0.00"
              />
              <p className="mt-1 text-xs text-gray-500">Percentual de comissão sobre os serviços prestados (0.00 a 100.00). Deixe vazio para 0%.</p>
            </FormField>
          </div>
        </div>
      </div>

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
        <Button type="submit" isLoading={isSubmitting || saveMutation.isPending}>
          Salvar
        </Button>
      </div>
    </form>
  )
}
