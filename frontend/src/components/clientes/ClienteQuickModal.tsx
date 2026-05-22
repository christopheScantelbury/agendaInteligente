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
        <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <h2 className="text-lg font-semibold text-white">Acesso Rápido</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>

          {isLoading ? (
            <div className="p-6 text-center text-gray-400">Carregando...</div>
          ) : !resumo ? (
            <div className="p-6 text-center text-gray-400">Cliente não encontrado.</div>
          ) : (
            <div className="p-4 space-y-4">
              {/* Action buttons */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleLigar}
                  disabled={!resumo.telefone}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm rounded-md transition-colors"
                >
                  <Phone className="h-4 w-4" />
                  Ligar
                </button>
                <button
                  onClick={handleWhatsApp}
                  disabled={!resumo.telefone}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm rounded-md transition-colors"
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </button>
                <button
                  onClick={handleEditar}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white text-sm rounded-md transition-colors"
                >
                  <Edit className="h-4 w-4" />
                  Editar
                </button>
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-md transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  Excluir
                </button>
              </div>

              {/* Basic info */}
              <div className="bg-gray-900 rounded-md p-3 space-y-1.5">
                <div>
                  <span className="text-gray-400 text-sm">Nome: </span>
                  <span className="text-white font-medium">{resumo.nome}</span>
                </div>
                {resumo.telefone && (
                  <div>
                    <span className="text-gray-400 text-sm">Telefone: </span>
                    <span className="text-white">{resumo.telefone}</span>
                  </div>
                )}
                {resumo.dataNascimento && (
                  <div>
                    <span className="text-gray-400 text-sm">Data de nascimento: </span>
                    <span className="text-white">{formatBirthDate(resumo.dataNascimento)}</span>
                  </div>
                )}
                {resumo.email && (
                  <div>
                    <span className="text-gray-400 text-sm">E-mail: </span>
                    <span className="text-white">{resumo.email}</span>
                  </div>
                )}
              </div>

              {/* Quick links */}
              <div className="flex gap-2">
                {(['Informações', 'Crédito', 'Anotações'] as const).map((label) => (
                  <button
                    key={label}
                    className="px-3 py-1.5 border border-gray-600 text-gray-300 hover:text-white hover:border-gray-400 text-sm rounded-md transition-colors"
                    onClick={() => showNotification('info', 'Funcionalidade em breve')}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* History */}
              <div className="border-t border-gray-700 pt-3 space-y-1.5">
                <h3 className="text-gray-300 font-medium text-sm uppercase tracking-wide">Histórico</h3>
                <div>
                  <span className="text-gray-400 text-sm">Último atendimento: </span>
                  <span className="text-white text-sm">
                    {resumo.ultimoAtendimento
                      ? `${formatDate(resumo.ultimoAtendimento)} (há ${resumo.diasDesdeUltimoAtendimento} dia${resumo.diasDesdeUltimoAtendimento !== 1 ? 's' : ''})`
                      : 'Nenhum atendimento'}
                  </span>
                </div>
                {resumo.ultimosProcedimentos?.length > 0 && (
                  <div>
                    <span className="text-gray-400 text-sm">Últimos procedimentos: </span>
                    <span className="text-white text-sm">
                      {resumo.ultimosProcedimentos
                        .slice(0, 3)
                        .map((p) => `${p.nome} (${formatDate(p.data)})`)
                        .join(', ')}
                    </span>
                  </div>
                )}
                <div>
                  <span className="text-gray-400 text-sm">Cancelamentos: </span>
                  <span className="text-white text-sm">{resumo.totalCancelamentos}</span>
                  <span className="text-gray-400 text-sm ml-3">Não compareceu: </span>
                  <span className="text-white text-sm">{resumo.totalNaoCompareceu}</span>
                </div>
                <div>
                  <span className="text-gray-400 text-sm">Cliente desde: </span>
                  <span className="text-white text-sm">{formatDate(resumo.clienteDesde)}</span>
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
