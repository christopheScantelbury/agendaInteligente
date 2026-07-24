import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ClipboardList, Eye, FileText, Pencil, Trash2 } from 'lucide-react'
import { anamneseService } from '../../services/anamneseService'
import { clienteService } from '../../services/clienteService'
import { useNotification } from '../../contexts/NotificationContext'
import ConfirmDialog from '../../components/ConfirmDialog'

function formatarDataBR(data?: string | null) {
  if (!data) return '—'
  const dataNormalizada = data.length <= 10 ? `${data}T00:00:00` : data
  const parsed = new Date(dataNormalizada)
  if (Number.isNaN(parsed.getTime())) return '—'
  return new Intl.DateTimeFormat('pt-BR').format(parsed)
}

export default function ClienteAnamnesesPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const clienteId = id ? Number(id) : null
  const clienteIdValido = clienteId != null && Number.isFinite(clienteId)
  const { showNotification } = useNotification()
  const queryClient = useQueryClient()
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: number | null }>({
    isOpen: false,
    id: null,
  })

  const { data: cliente } = useQuery({
    queryKey: ['cliente-resumo', clienteId],
    queryFn: () => clienteService.buscarResumo(clienteId!),
    enabled: clienteIdValido,
  })

  const { data: anamneses = [], isLoading } = useQuery({
    queryKey: ['anamneses', clienteId],
    queryFn: () => anamneseService.listar({ clienteId: clienteId! }),
    enabled: clienteIdValido,
  })

  const deleteMutation = useMutation({
    mutationFn: anamneseService.excluir,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anamneses', clienteId] })
      queryClient.invalidateQueries({ queryKey: ['anamneses'] })
      showNotification('success', 'Ficha excluída com sucesso!')
      setConfirmDelete({ isOpen: false, id: null })
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || 'Erro ao excluir ficha'
      showNotification('error', msg)
    },
  })

  if (!clienteIdValido) {
    return (
      <div className="mx-auto max-w-3xl p-4 sm:p-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-500">
          Cliente não encontrado.
        </div>
      </div>
    )
  }

  if (isLoading) {
    return <div className="py-8 text-center">Carregando...</div>
  }

  return (
    <div className="mx-auto max-w-3xl w-full p-4 sm:p-6 space-y-6">
      <header className="space-y-3">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => navigate(`/clientes/${clienteId}/informacoes`)}
            className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-slate-900 truncate">
              {cliente?.nome ?? 'Anamneses da cliente'}
            </h1>
            <p className="text-sm text-slate-500">
              Lista de anamneses registradas para esta cliente.
            </p>
          </div>
        </div>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-slate-900">
            <ClipboardList className="h-5 w-5 text-violet-600" />
            <div>
              <p className="text-sm font-semibold">Anamneses</p>
              <p className="text-xs text-slate-500">
                {anamneses.length} ficha{anamneses.length === 1 ? '' : 's'} encontrada{anamneses.length === 1 ? '' : 's'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {anamneses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 text-violet-600">
            <FileText className="h-5 w-5" />
          </div>
          <p className="text-sm text-slate-600">
            Nenhuma anamnese cadastrada para esta cliente.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {anamneses.map((a) => (
            <li
              key={a.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-700">
                  {String(a.templateNome?.charAt(0) ?? 'A').toUpperCase()}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {a.templateNome || 'Anamnese'}
                  </p>
                  {a.servicoNome && (
                    <p className="mt-0.5 truncate text-xs text-slate-500">{a.servicoNome}</p>
                  )}
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    <span>{formatarDataBR(a.data)}</span>
                  </div>
                </div>

                <div className="flex flex-shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => navigate(`/anamneses/${a.id}`)}
                    className="rounded-lg p-2 text-slate-500 transition hover:bg-violet-50 hover:text-violet-700"
                    aria-label="Ver ficha"
                    title="Visualizar"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/anamneses/${a.id}?editar=1`)}
                    className="rounded-lg p-2 text-slate-500 transition hover:bg-violet-50 hover:text-violet-700"
                    aria-label="Editar ficha"
                    title="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete({ isOpen: true, id: a.id ?? null })}
                    className="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600"
                    aria-label="Excluir ficha"
                    title="Excluir"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
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
