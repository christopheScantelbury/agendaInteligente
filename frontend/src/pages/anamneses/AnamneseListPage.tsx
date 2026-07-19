import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2, Eye, Pencil, ClipboardList, FileText } from 'lucide-react'
import { anamneseService } from '../../services/anamneseService'
import { useNotification } from '../../contexts/NotificationContext'
import ConfirmDialog from '../../components/ConfirmDialog'
import Button from '../../components/Button'

export default function AnamneseListPage() {
  const navigate = useNavigate()
  const { showNotification } = useNotification()
  const queryClient = useQueryClient()

  const [searchTerm, setSearchTerm] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: number | null }>({
    isOpen: false,
    id: null,
  })

  const { data: anamneses = [], isLoading } = useQuery({
    queryKey: ['anamneses'],
    queryFn: () => anamneseService.listar({}),
  })

  const deleteMutation = useMutation({
    mutationFn: anamneseService.excluir,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anamneses'] })
      showNotification('success', 'Ficha excluída com sucesso!')
      setConfirmDelete({ isOpen: false, id: null })
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || 'Erro ao excluir ficha'
      showNotification('error', msg)
    },
  })

  const filtered = anamneses.filter((a) => {
    if (!searchTerm) return true
    return a.clienteNome?.toLowerCase().includes(searchTerm.toLowerCase())
  })

  if (isLoading) {
    return <div className="text-center py-8">Carregando...</div>
  }

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="h-6 w-6 text-violet-600" />
            Anamneses
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Fichas clínicas dos seus clientes.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="secondary" onClick={() => navigate('/anamneses/templates')}>
            <ClipboardList className="h-4 w-4" />
            Templates
          </Button>
          <Button onClick={() => navigate('/anamneses/nova')}>
            <Plus className="h-4 w-4" />
            Nova Ficha
          </Button>
        </div>
      </header>

      {/* Busca */}
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Buscar por nome de cliente..."
        className="block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm placeholder-slate-400 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
      />

      {/* Lista como cards */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center mb-3">
            <FileText className="h-5 w-5" />
          </div>
          <p className="text-sm text-slate-600">
            {searchTerm ? 'Nenhuma ficha encontrada com os filtros aplicados.' : 'Nenhuma ficha cadastrada ainda.'}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((a) => {
            const inicial = (a.clienteNome || '?').charAt(0).toUpperCase()
            return (
              <li
                key={a.id}
                className="bg-white border border-slate-200 rounded-2xl p-4 hover:shadow-sm transition"
              >
                <div className="flex items-start gap-3">
                  {/* Avatar cliente */}
                  <div className="h-10 w-10 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {inicial}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{a.clienteNome}</p>
                    {a.servicoNome && (
                      <p className="text-xs text-slate-500 truncate mt-0.5">{a.servicoNome}</p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-1 flex-wrap">
                      {a.templateNome && <span>{a.templateNome}</span>}
                      {a.templateNome && a.data && <span>·</span>}
                      {a.data && (
                        <span>{new Date(a.data + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                      )}
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => navigate(`/anamneses/${a.id}`)}
                      className="p-2 rounded-lg text-slate-500 hover:bg-violet-50 hover:text-violet-700 transition"
                      aria-label="Ver ficha"
                      title="Visualizar"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => navigate(`/anamneses/${a.id}?editar=1`)}
                      className="p-2 rounded-lg text-slate-500 hover:bg-violet-50 hover:text-violet-700 transition"
                      aria-label="Editar ficha"
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setConfirmDelete({ isOpen: true, id: a.id })}
                      className="p-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 transition"
                      aria-label="Excluir ficha"
                      title="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {filtered.length > 0 && (
        <p className="text-xs text-slate-500 text-center">
          Mostrando {filtered.length} de {anamneses.length} ficha{anamneses.length !== 1 ? 's' : ''}
        </p>
      )}

      <ConfirmDialog
        isOpen={confirmDelete.isOpen}
        title="Confirmar Exclusão"
        message="Tem certeza que deseja excluir esta ficha? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={() => {
          if (confirmDelete.id) deleteMutation.mutate(confirmDelete.id)
        }}
        onCancel={() => setConfirmDelete({ isOpen: false, id: null })}
      />
    </div>
  )
}
