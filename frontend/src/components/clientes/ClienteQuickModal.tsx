import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { X, Phone, MessageCircle, Edit, Trash2 } from 'lucide-react'
import { clienteService } from '../../services/clienteService'
import { useNotification } from '../../contexts/NotificationContext'
import ConfirmDialog from '../ConfirmDialog'
import { useState } from 'react'

interface ClienteQuickModalProps {
  clienteId: number | null
  onClose: () => void
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('pt-BR')
}

function formatBirthDate(dateStr?: string | null): string {
  if (!dateStr) return '—'
  // dataNascimento comes as YYYY-MM-DD (LocalDate)
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}/${year}`
}

export default function ClienteQuickModal({ clienteId, onClose }: ClienteQuickModalProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { showNotification } = useNotification()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const { data: resumo, isLoading } = useQuery({
    queryKey: ['cliente-resumo', clienteId],
    queryFn: () => clienteService.buscarResumo(clienteId!),
    enabled: clienteId != null,
  })

  const deleteMutation = useMutation({
    mutationFn: () => clienteService.excluir(clienteId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] })
      showNotification('success', 'Cliente excluído com sucesso!')
      onClose()
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || 'Erro ao excluir cliente'
      showNotification('error', msg)
    },
  })

  if (!clienteId) return null

  const handleWhatsApp = () => {
    if (resumo?.telefone) {
      const numero = resumo.telefone.replace(/\D/g, '')
      window.open(`https://wa.me/55${numero}`, '_blank')
    }
  }

  const handleLigar = () => {
    if (resumo?.telefone) {
      window.open(`tel:${resumo.telefone}`)
    }
  }

  const handleEditar = () => {
    navigate(`/clientes/${clienteId}/editar`)
    onClose()
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50"
        onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      >
        <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto border border-slate-200">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Acesso Rápido</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>

          {isLoading ? (
            <div className="p-6 text-center text-slate-400">Carregando...</div>
          ) : !resumo ? (
            <div className="p-6 text-center text-slate-400">Cliente não encontrado.</div>
          ) : (
            <div className="p-4 space-y-4">
              {/* Action buttons */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleLigar}
                  disabled={!resumo.telefone}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors"
                >
                  <Phone className="h-4 w-4" />
                  Ligar
                </button>
                <button
                  onClick={handleWhatsApp}
                  disabled={!resumo.telefone}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors"
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </button>
                <button
                  onClick={handleEditar}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-sm rounded-lg transition-colors"
                >
                  <Edit className="h-4 w-4" />
                  Editar
                </button>
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  Excluir
                </button>
              </div>

              {/* Basic info */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1.5">
                <div>
                  <span className="text-slate-500 text-sm">Nome: </span>
                  <span className="text-slate-900 font-medium">{resumo.nome}</span>
                </div>
                {resumo.telefone && (
                  <div>
                    <span className="text-slate-500 text-sm">Telefone: </span>
                    <span className="text-slate-900">{resumo.telefone}</span>
                  </div>
                )}
                {resumo.dataNascimento && (
                  <div>
                    <span className="text-slate-500 text-sm">Data de nascimento: </span>
                    <span className="text-slate-900">{formatBirthDate(resumo.dataNascimento)}</span>
                  </div>
                )}
                {resumo.email && (
                  <div>
                    <span className="text-slate-500 text-sm">E-mail: </span>
                    <span className="text-slate-900">{resumo.email}</span>
                  </div>
                )}
              </div>

              {/* Quick links */}
              <div className="flex gap-2">
                {(['Informações', 'Crédito', 'Anotações'] as const).map((label) => (
                  <button
                    key={label}
                    className="px-3 py-1.5 border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 text-sm rounded-lg transition-colors"
                    onClick={() => showNotification('info', 'Funcionalidade em breve')}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* History */}
              <div className="border-t border-slate-200 pt-3 space-y-1.5">
                <h3 className="text-slate-600 font-semibold text-xs uppercase tracking-wide">Histórico</h3>
                <div>
                  <span className="text-slate-500 text-sm">Último atendimento: </span>
                  <span className="text-slate-900 text-sm">
                    {resumo.ultimoAtendimento
                      ? `${formatDate(resumo.ultimoAtendimento)} (há ${resumo.diasDesdeUltimoAtendimento} dia${resumo.diasDesdeUltimoAtendimento !== 1 ? 's' : ''})`
                      : 'Nenhum atendimento'}
                  </span>
                </div>
                {resumo.ultimosProcedimentos?.length > 0 && (
                  <div>
                    <span className="text-slate-500 text-sm">Últimos procedimentos: </span>
                    <span className="text-slate-900 text-sm">
                      {resumo.ultimosProcedimentos
                        .slice(0, 3)
                        .map((p) => `${p.nome} (${formatDate(p.data)})`)
                        .join(', ')}
                    </span>
                  </div>
                )}
                <div>
                  <span className="text-slate-500 text-sm">Cancelamentos: </span>
                  <span className="text-slate-900 text-sm">{resumo.totalCancelamentos}</span>
                  <span className="text-slate-500 text-sm ml-3">Não compareceu: </span>
                  <span className="text-slate-900 text-sm">{resumo.totalNaoCompareceu}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-sm">Cliente desde: </span>
                  <span className="text-slate-900 text-sm">{formatDate(resumo.clienteDesde)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmDelete}
        title="Confirmar Exclusão"
        message="Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  )
}
