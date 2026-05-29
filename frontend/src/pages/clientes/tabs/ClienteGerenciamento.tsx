import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Edit, Trash2, ChevronLeft, ChevronRight, ArrowUpDown, UserPlus } from 'lucide-react'
import { clienteService } from '../../../services/clienteService'
import { authService } from '../../../services/authService'
import { perfilService } from '../../../services/perfilService'
import { podeEditar } from '../../../utils/permissions'
import { matchSearch } from '../../../utils/normalize'
import { useNotification } from '../../../contexts/NotificationContext'
import { useCategoria } from '../../../hooks/useCategoria'
import ConfirmDialog from '../../../components/ConfirmDialog'
import ClienteQuickModal from '../../../components/clientes/ClienteQuickModal'

const PAGE_SIZE = 10

interface Props {
  searchTerm: string
}

export default function ClienteGerenciamento({ searchTerm }: Props) {
  const { showNotification } = useNotification()
  const { dict } = useCategoria()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: number | null }>({ isOpen: false, id: null })
  const [filterAtivo, setFilterAtivo] = useState<string>('')
  const [page, setPage] = useState(0)
  const [quickModalId, setQuickModalId] = useState<number | null>(null)
  const [sortAsc, setSortAsc] = useState(true)

  const usuario = authService.getUsuario()
  const { data: perfilUsuario } = useQuery({
    queryKey: ['perfil', 'meu'],
    queryFn: () => perfilService.buscarMeuPerfil(),
    enabled: !!usuario,
  })
  const podeEditarClientes = podeEditar(perfilUsuario, '/usuarios')

  const { data: clientes = [], isLoading } = useQuery({
    queryKey: ['clientes'],
    queryFn: clienteService.listar,
  })

  const clientesFiltrados = useMemo(() => {
    let filtered = [...clientes]
    if (searchTerm) {
      filtered = filtered.filter(
        (c) =>
          matchSearch(c.nome, searchTerm) ||
          (c.telefone && c.telefone.replace(/\D/g, '').includes(searchTerm.replace(/\D/g, '')))
      )
    }
    if (filterAtivo !== '') {
      const isAtivo = filterAtivo === 'true'
      filtered = filtered.filter((c) => (c.ativo ?? true) === isAtivo)
    }
    filtered.sort((a, b) =>
      sortAsc
        ? a.nome.localeCompare(b.nome, 'pt-BR')
        : b.nome.localeCompare(a.nome, 'pt-BR')
    )
    return filtered
  }, [clientes, searchTerm, filterAtivo, sortAsc])

  const totalPages = Math.ceil(clientesFiltrados.length / PAGE_SIZE)
  const clientesPaginados = clientesFiltrados.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  // Reset to page 0 when filters change
  useMemo(() => { setPage(0) }, [searchTerm, filterAtivo]) // eslint-disable-line react-hooks/exhaustive-deps

  const deleteMutation = useMutation({
    mutationFn: clienteService.excluir,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] })
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] })
      showNotification('success', 'Cliente excluído com sucesso!')
      setConfirmDelete({ isOpen: false, id: null })
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Erro ao excluir cliente'
      showNotification('error', errorMessage)
    },
  })

  function formatDate(dateStr?: string | null): string {
    if (!dateStr) return '—'
    const [year, month, day] = dateStr.split('-')
    return `${day}/${month}/${year}`
  }

  if (isLoading) {
    return <div className="text-center py-8 text-slate-400">Carregando...</div>
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={filterAtivo}
            onChange={(e) => setFilterAtivo(e.target.value)}
            className="bg-white text-slate-900 border border-slate-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          >
            <option value="">Todos os status</option>
            <option value="true">Ativos</option>
            <option value="false">Inativos</option>
          </select>
          <button
            onClick={() => setSortAsc((v) => !v)}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition"
            title={`Ordenar por nome (${sortAsc ? 'A-Z' : 'Z-A'})`}
          >
            Nome <ArrowUpDown className="h-3 w-3" />
          </button>
          <span className="text-slate-500 text-sm">{clientesFiltrados.length} cliente{clientesFiltrados.length !== 1 ? 's' : ''}</span>
        </div>
        {podeEditarClientes && (
          <button
            onClick={() => navigate('/clientes/novo')}
            className="inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all bg-violet-600 text-white hover:bg-violet-700 shadow-sm shadow-violet-200 px-4 py-2 text-sm"
          >
            <Plus className="h-4 w-4" />
            Novo {dict.rotuloCliente}
          </button>
        )}
      </div>

      {/* Cards */}
      {clientesFiltrados.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center mb-3">
            <UserPlus className="h-5 w-5" />
          </div>
          <p className="text-sm text-slate-600">
            {searchTerm || filterAtivo !== ''
              ? 'Nenhum cliente encontrado com os filtros aplicados.'
              : 'Nenhum cliente cadastrado ainda.'}
          </p>
        </div>
      ) : (
        <>
          <ul className="space-y-2">
            {clientesPaginados.map((cliente) => {
              const ativo = cliente.ativo ?? true
              const inicial = (cliente.nome || '?').charAt(0).toUpperCase()
              return (
                <li
                  key={cliente.id}
                  className="bg-white border border-slate-200 rounded-2xl p-4 hover:shadow-sm transition"
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <button
                      onClick={() => setQuickModalId(cliente.id!)}
                      className="h-10 w-10 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-sm font-bold flex-shrink-0 hover:bg-violet-200 transition"
                      title="Ver detalhes"
                    >
                      {inicial}
                    </button>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => setQuickModalId(cliente.id!)}
                          className="text-sm font-semibold text-slate-900 truncate hover:text-violet-700 text-left"
                        >
                          {cliente.nome}
                        </button>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                            ativo
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                      {cliente.telefone && (
                        <p className="text-xs text-slate-500 truncate mt-0.5">{cliente.telefone}</p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-1 flex-wrap">
                        {cliente.endereco && <span className="truncate max-w-[200px]">{cliente.endereco}</span>}
                        {cliente.endereco && cliente.dataNascimento && <span>·</span>}
                        {cliente.dataNascimento && <span>Nasc. {formatDate(cliente.dataNascimento)}</span>}
                      </div>
                    </div>

                    {/* Ações */}
                    {podeEditarClientes && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => navigate(`/clientes/${cliente.id}/editar`)}
                          className="p-2 rounded-lg text-slate-500 hover:bg-violet-50 hover:text-violet-700 transition"
                          aria-label="Editar cliente"
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setConfirmDelete({ isOpen: true, id: cliente.id! })}
                          className="p-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 transition"
                          aria-label="Excluir cliente"
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-1">
              <span className="text-xs text-slate-500">
                Página {page + 1} de {totalPages}
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  aria-label="Página anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page === totalPages - 1}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  aria-label="Próxima página"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        isOpen={confirmDelete.isOpen}
        title="Confirmar Exclusão"
        message="Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={() => confirmDelete.id && deleteMutation.mutate(confirmDelete.id)}
        onCancel={() => setConfirmDelete({ isOpen: false, id: null })}
      />

      <ClienteQuickModal clienteId={quickModalId} onClose={() => setQuickModalId(null)} />
    </div>
  )
}
