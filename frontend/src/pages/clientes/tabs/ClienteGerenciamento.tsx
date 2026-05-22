import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Edit, Trash2, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react'
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
    return <div className="text-center py-8 text-gray-400">Carregando...</div>
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <select
            value={filterAtivo}
            onChange={(e) => setFilterAtivo(e.target.value)}
            className="bg-gray-700 text-gray-200 border border-gray-600 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Todos os status</option>
            <option value="true">Ativos</option>
            <option value="false">Inativos</option>
          </select>
          <span className="text-gray-400 text-sm">{clientesFiltrados.length} cliente{clientesFiltrados.length !== 1 ? 's' : ''}</span>
        </div>
        {podeEditarClientes && (
          <button
            onClick={() => navigate('/clientes/novo')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors"
          >
            <Plus className="h-4 w-4" />
            Novo {dict.rotuloCliente}
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        {clientesFiltrados.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            {searchTerm || filterAtivo !== ''
              ? 'Nenhum cliente encontrado com os filtros aplicados'
              : 'Nenhum cliente cadastrado.'}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">
                      <button
                        onClick={() => setSortAsc((v) => !v)}
                        className="flex items-center gap-1 hover:text-gray-200 transition-colors"
                      >
                        Nome <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Telefone</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium hidden lg:table-cell">Endereço</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium hidden md:table-cell">Data Nasc.</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium hidden sm:table-cell">Status</th>
                    {podeEditarClientes && (
                      <th className="text-right px-4 py-3 text-gray-400 font-medium">Ações</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {clientesPaginados.map((cliente) => (
                    <tr key={cliente.id} className="hover:bg-gray-700/50 transition-colors">
                      <td className="px-4 py-3">
                        <button
                          className="text-blue-400 hover:text-blue-300 font-medium text-left"
                          onClick={() => setQuickModalId(cliente.id!)}
                        >
                          {cliente.nome}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-gray-300">{cliente.telefone || '—'}</td>
                      <td className="px-4 py-3 text-gray-300 hidden lg:table-cell">{cliente.endereco || '—'}</td>
                      <td className="px-4 py-3 text-gray-300 hidden md:table-cell">
                        {formatDate(cliente.dataNascimento)}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          (cliente.ativo ?? true)
                            ? 'bg-green-900/50 text-green-400'
                            : 'bg-gray-700 text-gray-400'
                        }`}>
                          {(cliente.ativo ?? true) ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      {podeEditarClientes && (
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => navigate(`/clientes/${cliente.id}/editar`)}
                              className="text-blue-400 hover:text-blue-300 transition-colors"
                              aria-label="Editar"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setConfirmDelete({ isOpen: true, id: cliente.id! })}
                              className="text-red-400 hover:text-red-300 transition-colors"
                              aria-label="Excluir"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700">
                <span className="text-gray-400 text-sm">
                  Página {page + 1} de {totalPages}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page === totalPages - 1}
                    className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

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
