import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { servicoService, Servico } from '../services/servicoService'
import { unidadeService } from '../services/unidadeService'
import { usuarioService } from '../services/usuarioService'
import { atendenteService } from '../services/atendenteService'
import { authService } from '../services/authService'
import { perfilService } from '../services/perfilService'
import { podeEditar } from '../utils/permissions'
import { Plus, Trash2, Edit, Sparkles, Scissors, Search, X } from 'lucide-react'
import { useState, useMemo, useEffect } from 'react'
import MoneyInput from '../components/forms/MoneyInput'
import IntegerInput from '../components/forms/IntegerInput'
import Modal from '../components/Modal'
import Button from '../components/Button'
import FormField from '../components/FormField'
import FilterBar from '../components/FilterBar'
import { useNotification } from '../contexts/NotificationContext'
import ConfirmDialog from '../components/ConfirmDialog'
import { iaService } from '../services/iaService'
import { useCategoria } from '../hooks/useCategoria'
import { useIsWebLayout } from '../hooks/useIsWebLayout'

export default function Servicos() {
  const { showNotification } = useNotification()
  const { dict } = useCategoria()
  const isWeb = useIsWebLayout()
  const [showModal, setShowModal] = useState(false)
  const [editingServico, setEditingServico] = useState<Servico | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: number | null }>({ isOpen: false, id: null })
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState<{ ativo?: string }>({})
  const queryClient = useQueryClient()
  const usuario = authService.getUsuario()

  const { data: perfil } = useQuery({
    queryKey: ['perfil', 'meu'],
    queryFn: () => perfilService.buscarMeuPerfil(),
    enabled: !!usuario,
  })
  const podeEditarServicos = podeEditar(perfil, '/servicos')

  const { data: servicos = [], isLoading } = useQuery({
    queryKey: ['servicos'],
    queryFn: servicoService.listarTodos,
  })

  const { data: todasUnidades = [] } = useQuery({
    queryKey: ['unidades'],
    queryFn: unidadeService.listarTodos,
  })

  // Função helper para obter nome da unidade
  const getNomeUnidade = (unidadeId: number) => {
    const unidade = todasUnidades.find(u => u.id === unidadeId)
    return unidade?.nome || 'Unidade não encontrada'
  }

  const servicosFiltrados = useMemo(() => {
    let filtered = [...servicos]

    // Filtro de busca
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (s) =>
          s.nome.toLowerCase().includes(term) ||
          s.descricao?.toLowerCase().includes(term)
      )
    }

    // Filtro de status
    if (filters.ativo !== undefined && filters.ativo !== '') {
      const isAtivo = filters.ativo === 'true'
      filtered = filtered.filter((s) => (s.ativo ?? true) === isAtivo)
    }

    return filtered
  }, [servicos, searchTerm, filters])

  const deleteMutation = useMutation({
    mutationFn: servicoService.excluir,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servicos'] })
      showNotification('success', 'Serviço excluído com sucesso!')
      setConfirmDelete({ isOpen: false, id: null })
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Erro ao excluir serviço'
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

  const pageClassName = `${isWeb ? 'max-w-[1920px] w-full p-6 xl:p-8' : 'max-w-3xl p-4 sm:p-6'} mx-auto space-y-6`
  const hasActiveFilters = searchTerm || Object.values(filters).some((v) => v !== '' && v !== undefined)

  return (
    <div className={pageClassName}>
      {isWeb ? (
        <>
          <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <Scissors className="h-6 w-6 text-violet-600" />
                {dict.rotuloServicoPlural}
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Cadastre e gerencie os {dict.rotuloServicoPlural.toLowerCase()} oferecidos.
              </p>
            </div>

            <div className="flex flex-col gap-2 w-full sm:w-auto items-stretch sm:items-end">
              {podeEditarServicos && (
                <Button
                  onClick={() => {
                    setEditingServico(null)
                    setShowModal(true)
                  }}
                >
                  <Plus className="h-4 w-4" />
                  Novo {dict.rotuloServico}
                </Button>
              )}
            </div>
          </header>

          <div className="flex justify-start">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar por nome ou descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white text-slate-900 border border-slate-200 rounded-xl pl-9 pr-9 py-2 text-sm placeholder-slate-400 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label="Limpar busca"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {servicosFiltrados.length === 0 ? (
              <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center">
                <div className="mx-auto h-12 w-12 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center mb-3">
                  <Scissors className="h-5 w-5" />
                </div>
                <p className="text-sm text-slate-600">
                  {hasActiveFilters
                    ? 'Nenhum serviço encontrado com os filtros aplicados.'
                    : 'Nenhum serviço cadastrado ainda.'}
                </p>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full table-fixed border-collapse">
                  <colgroup>
                    <col className="w-[44%]" />
                    <col className="w-[14%]" />
                    <col className="w-[16%]" />
                    <col className="w-[18%]" />
                    <col className="w-[8%]" />
                  </colgroup>
                  <thead className="bg-slate-50">
                    <tr className="border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      <th scope="col" className="px-4 py-3 text-left">Nome</th>
                      <th scope="col" className="px-4 py-3 text-left pl-4">Duração</th>
                      <th scope="col" className="px-4 py-3 text-left pl-4">Preço</th>
                      <th scope="col" className="px-4 py-3 text-left pl-4">Custo do serviço</th>
                      <th scope="col" className="px-4 py-3 text-right">Ações</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {servicosFiltrados.map((servico) => {
                      const custoServico = (servico as any).custoServico ?? (servico as any).custo ?? null
                      return (
                        <tr
                          key={servico.id}
                          className="hover:bg-slate-50 transition align-middle"
                        >
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="h-9 w-9 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center flex-shrink-0">
                                <Scissors className="h-4 w-4" />
                              </div>
                              <p className="text-sm font-semibold text-slate-900 truncate min-w-0">
                                {servico.nome}
                              </p>
                            </div>
                          </td>

                          <td className="px-4 py-4 text-left pl-4 whitespace-nowrap text-sm text-slate-700">
                            {servico.duracaoMinutos} min
                          </td>

                          <td className="px-4 py-4 text-left pl-4 whitespace-nowrap text-sm font-semibold text-slate-700">
                            R$ {servico.valor.toFixed(2).replace('.', ',')}
                          </td>

                          <td className="px-4 py-4 text-left pl-4 whitespace-nowrap text-sm text-slate-500">
                            {custoServico != null && Number.isFinite(Number(custoServico))
                              ? `R$ ${Number(custoServico).toFixed(2).replace('.', ',')}`
                              : <span className="inline-flex w-8 justify-center">—</span>}
                          </td>

                          <td className="px-4 py-4 text-right whitespace-nowrap">
                            {podeEditarServicos ? (
                              <div className="inline-flex items-center gap-1">
                                <button
                                  onClick={() => {
                                    setEditingServico(servico)
                                    setShowModal(true)
                                  }}
                                  className="p-2 rounded-lg text-slate-500 hover:bg-violet-50 hover:text-violet-700 transition"
                                  aria-label="Editar serviço"
                                  title="Editar"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(servico.id)}
                                  className="p-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 transition"
                                  aria-label="Excluir serviço"
                                  title="Excluir"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            ) : (
                              <span />
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {servicosFiltrados.length > 0 && (
              <p className="text-xs text-slate-500 text-center">
                Mostrando {servicosFiltrados.length} de {servicos.length} {dict.rotuloServicoPlural.toLowerCase()}
              </p>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Header */}
          <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <Scissors className="h-6 w-6 text-violet-600" />
                {dict.rotuloServicoPlural}
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Cadastre e gerencie os {dict.rotuloServicoPlural.toLowerCase()} oferecidos.
              </p>
            </div>
            {podeEditarServicos && (
              <Button
                onClick={() => {
                  setEditingServico(null)
                  setShowModal(true)
                }}
              >
                <Plus className="h-4 w-4" />
                Novo {dict.rotuloServico}
              </Button>
            )}
          </header>

          {/* Barra de Filtros */}
          <FilterBar
            onSearchChange={setSearchTerm}
            onFilterChange={setFilters}
            searchPlaceholder="Buscar por nome ou descrição..."
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

          {/* Lista de serviços como cards */}
          {servicosFiltrados.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center">
              <div className="mx-auto h-12 w-12 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center mb-3">
                <Scissors className="h-5 w-5" />
              </div>
              <p className="text-sm text-slate-600">
                {searchTerm || Object.values(filters).some(v => v !== '' && v !== undefined)
                  ? 'Nenhum serviço encontrado com os filtros aplicados.'
                  : 'Nenhum serviço cadastrado ainda.'}
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {servicosFiltrados.map((servico) => (
                <li
                  key={servico.id}
                  className="bg-white border border-slate-200 rounded-2xl p-4 hover:shadow-sm transition"
                >
                  <div className="flex items-start gap-3">
                    {/* Ícone */}
                    <div className="h-10 w-10 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center flex-shrink-0">
                      <Scissors className="h-5 w-5" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-slate-900 truncate">{servico.nome}</p>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                            servico.ativo
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {servico.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                      {servico.descricao && (
                        <p className="text-xs text-slate-500 truncate mt-0.5">{servico.descricao}</p>
                      )}
                      <p className="text-xs text-slate-500 mt-1">
                        <span className="font-semibold text-slate-700">
                          R$ {servico.valor.toFixed(2).replace('.', ',')}
                        </span>
                        {' · '}
                        {servico.duracaoMinutos} min
                        {servico.unidadeId ? (
                          <> · {getNomeUnidade(servico.unidadeId)}</>
                        ) : null}
                      </p>
                    </div>

                    {/* Ações */}
                    {podeEditarServicos && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => {
                            setEditingServico(servico)
                            setShowModal(true)
                          }}
                          className="p-2 rounded-lg text-slate-500 hover:bg-violet-50 hover:text-violet-700 transition"
                          aria-label="Editar serviço"
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(servico.id)}
                          className="p-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 transition"
                          aria-label="Excluir serviço"
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
          )}

          {/* Rodapé com contagem */}
          {servicosFiltrados.length > 0 && (
            <p className="text-xs text-slate-500 text-center">
              Mostrando {servicosFiltrados.length} de {servicos.length} {dict.rotuloServicoPlural.toLowerCase()}
            </p>
          )}
        </>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false)
          setEditingServico(null)
        }}
        title={editingServico ? 'Editar Serviço' : 'Novo Serviço'}
        size="md"
      >
        <ServicoForm
          servico={editingServico}
          onClose={() => {
            setShowModal(false)
            setEditingServico(null)
          }}
        />
      </Modal>

      <ConfirmDialog
        isOpen={confirmDelete.isOpen}
        title="Confirmar Exclusão"
        message="Tem certeza que deseja excluir este serviço? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={confirmDeleteAction}
        onCancel={() => setConfirmDelete({ isOpen: false, id: null })}
      />
    </div>
  )
}

function ServicoForm({
  servico,
  onClose,
}: {
  servico: Servico | null
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const { showNotification } = useNotification()
  const usuario = authService.getUsuario()
  const perfilLogado = usuario?.perfil

  // Buscar todas as unidades
  const { data: todasUnidades = [] } = useQuery({
    queryKey: ['unidades'],
    queryFn: unidadeService.listarTodos,
  })

  // Buscar usuário completo para obter suas unidades (se não for admin)
  const { data: usuarioCompleto } = useQuery({
    queryKey: ['usuario', usuario?.usuarioId],
    queryFn: () => {
      if (!usuario?.usuarioId) return Promise.resolve(null)
      return usuarioService.buscarPorId(usuario.usuarioId)
    },
    enabled: !!usuario?.usuarioId && perfilLogado !== 'ADMIN',
  })

  // Filtrar unidades baseado no perfil
  const unidadesDisponiveis = useMemo(() => {
    // ADMIN e ADMINISTRADOR veem todas as unidades retornadas pelo backend
    // (o backend já filtra por adminUnicoId para ADMINISTRADOR)
    if (perfilLogado === 'ADMIN' || perfilLogado === 'ADMINISTRADOR') {
      return todasUnidades
    }
    // Para GERENTE e PROFISSIONAL, usar unidades do usuário completo
    if (usuarioCompleto?.unidadesIds && usuarioCompleto.unidadesIds.length > 0) {
      return todasUnidades.filter(u => usuarioCompleto.unidadesIds?.includes(u.id!))
    }
    // Fallback: usar unidadeId se existir
    if (usuario?.unidadeId) {
      return todasUnidades.filter(u => u.id === usuario.unidadeId)
    }
    return []
  }, [todasUnidades, perfilLogado, usuarioCompleto?.unidadesIds, usuario?.unidadeId])

  const [formData, setFormData] = useState<Servico>({
    id: 0,
    nome: '',
    descricao: '',
    valor: 0,
    duracaoMinutos: 30,
    unidadeId: 0,
    ativo: true,
  })
  const [loadingIa, setLoadingIa] = useState(false)
  const [atendentesIdsSelecionados, setAtendentesIdsSelecionados] = useState<number[]>([])

  const { data: atendentesUnidade = [] } = useQuery({
    queryKey: ['atendentes', 'unidade', formData.unidadeId],
    queryFn: () => atendenteService.listarPorUnidade(formData.unidadeId),
    enabled: formData.unidadeId > 0,
  })

  // Atualizar formData quando servico ou unidadesDisponiveis mudarem
  useEffect(() => {
    if (servico) {
      // Ao editar: usar dados do serviço
      setFormData({
        id: servico.id,
        nome: servico.nome || '',
        descricao: servico.descricao || '',
        valor: servico.valor || 0,
        duracaoMinutos: servico.duracaoMinutos || 30,
        unidadeId: servico.unidadeId || 0,
        ativo: servico.ativo !== undefined ? servico.ativo : true,
      })
      setAtendentesIdsSelecionados(servico.atendentesIds ?? [])
    } else {
      // Ao criar: usar unidade padrão se houver apenas uma disponível
      const unidadePadrao = unidadesDisponiveis.length === 1 ? unidadesDisponiveis[0].id! : 0
      setFormData({
        id: 0,
        nome: '',
        descricao: '',
        valor: 0,
        duracaoMinutos: 30,
        unidadeId: unidadePadrao,
        ativo: true,
      })
      setAtendentesIdsSelecionados([])
    }
  }, [servico, unidadesDisponiveis])

  const saveMutation = useMutation({
    mutationFn: (data: Servico) =>
      servico?.id
        ? servicoService.atualizar(servico.id, data)
        : servicoService.criar(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servicos'] })
      showNotification('success', servico ? 'Serviço atualizado com sucesso!' : 'Serviço criado com sucesso!')
      onClose()
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Erro ao salvar serviço'
      showNotification('error', errorMessage)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validação adicional
    if (!formData.unidadeId || formData.unidadeId === 0) {
      showNotification('error', 'Por favor, selecione uma unidade')
      return
    }

    if (!formData.nome || formData.nome.trim() === '') {
      showNotification('error', 'Por favor, informe o nome do serviço')
      return
    }

    if (!formData.valor || formData.valor <= 0) {
      showNotification('error', 'Por favor, informe um valor válido')
      return
    }

    if (!formData.duracaoMinutos || formData.duracaoMinutos <= 0) {
      showNotification('error', 'Por favor, informe uma duração válida')
      return
    }

    saveMutation.mutate({ ...formData, atendentesIds: atendentesIdsSelecionados })
  }

  const handleSugerirComIa = async () => {
    if (!formData.nome.trim()) {
      showNotification('error', 'Digite um nome base para o serviço primeiro')
      return
    }
    setLoadingIa(true)
    try {
      const unidadeSelecionada = unidadesDisponiveis.find(u => u.id === formData.unidadeId)
      const areaAtuacao = unidadeSelecionada?.descricao || 'serviços gerais'
      const sugestao = await iaService.sugerirServico({
        areaAtuacao,
        nomeBase: formData.nome,
        duracaoMinutos: formData.duracaoMinutos,
        valor: formData.valor,
      })
      if (sugestao.nome) setFormData(prev => ({ ...prev, nome: sugestao.nome, descricao: sugestao.descricao }))
    } finally {
      setLoadingIa(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Nome" required>
        <div className="flex gap-2 mt-1">
          <input
            type="text"
            required
            value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500"
            placeholder="Ex: Corte feminino"
          />
          <button
            type="button"
            onClick={handleSugerirComIa}
            disabled={loadingIa}
            title="Gerar nome e descrição com IA"
            className="flex-shrink-0 inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-lg transition-colors disabled:opacity-60 whitespace-nowrap"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {loadingIa ? 'Gerando...' : 'Sugerir com IA'}
          </button>
        </div>
      </FormField>

      <FormField label="Descrição">
        <textarea
          value={formData.descricao || ''}
          onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500 text-sm"
          rows={2}
          placeholder="Descrição gerada pela IA aparecerá aqui"
        />
      </FormField>

      <FormField label="Unidade" required>
        <p className="text-xs text-gray-500 mb-2">O serviço ficará disponível apenas nesta unidade.</p>
        <select
          required
          value={formData.unidadeId || ''}
          onChange={(e) => setFormData({ ...formData, unidadeId: parseInt(e.target.value) })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500"
          disabled={unidadesDisponiveis.length === 1}
        >
          <option value="">Selecione uma unidade</option>
          {unidadesDisponiveis.map((unidade) => (
            <option key={unidade.id} value={unidade.id}>
              {unidade.nome}
            </option>
          ))}
        </select>
        {unidadesDisponiveis.length === 0 && (
          <p className="mt-1 text-sm text-red-600">Você não tem acesso a nenhuma unidade</p>
        )}
      </FormField>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Valor" required>
          <MoneyInput
            required
            value={formData.valor}
            onChange={(v) => setFormData({ ...formData, valor: v })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-200 focus:outline-none"
          />
        </FormField>

        <FormField label="Duração (minutos)" required>
          <IntegerInput
            min={1}
            required
            value={formData.duracaoMinutos}
            onChange={(v) => setFormData({ ...formData, duracaoMinutos: v ?? 30 })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500"
          />
        </FormField>
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

      <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-800">
          Profissionais que realizam este serviço
          {atendentesIdsSelecionados.length > 0 && (
            <span className="ml-2 text-xs font-normal text-violet-600">
              {atendentesIdsSelecionados.length} selecionado{atendentesIdsSelecionados.length > 1 ? 's' : ''}
            </span>
          )}
        </h3>
        {!formData.unidadeId ? (
          <p className="text-sm text-gray-500">Selecione uma unidade para listar os profissionais.</p>
        ) : atendentesUnidade.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhum profissional cadastrado nesta unidade. Cadastre em <strong>Profissionais</strong> para poder vinculá-los aqui.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
            {atendentesUnidade.map((atendente) => (
              <label key={atendente.id} className="flex items-center gap-2 cursor-pointer rounded-md px-2 py-1.5 hover:bg-white transition-colors">
                <input
                  type="checkbox"
                  checked={atendentesIdsSelecionados.includes(atendente.id!)}
                  onChange={(e) => {
                    const id = atendente.id!
                    if (e.target.checked) {
                      setAtendentesIdsSelecionados((prev) => [...prev, id])
                    } else {
                      setAtendentesIdsSelecionados((prev) => prev.filter((x) => x !== id))
                    }
                  }}
                  className="rounded border-gray-300 text-violet-600 focus:ring-violet-500 flex-shrink-0"
                />
                <span className="text-sm text-gray-700 truncate">{atendente.nomeUsuario ?? atendente.usuarioId}</span>
              </label>
            ))}
          </div>
        )}
      </div>

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
