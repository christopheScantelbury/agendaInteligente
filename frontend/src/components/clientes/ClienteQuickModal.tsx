import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Phone, MessageCircle, Edit, Trash2, User, Cake, Mail, Info, ChevronRight, CreditCard, FileText, Clock, Briefcase } from 'lucide-react'
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

  const infoItemClass = 'flex items-center gap-3 text-sm'
  const infoIconClass = 'h-4 w-4 text-violet-600 shrink-0'

  const handleWhatsApp = () => {
    if (resumo?.telefone) {
      const numero = resumo.telefone.replace(/\D/g, '')
      window.open(`https://wa.me/55${numero}`, '_blank')
    }
  }

  const handleEditar = () => {
    navigate(`/clientes/${clienteId}/editar`)
    onClose()
  }

  const handleInformacoes = () => {
    navigate(`/clientes/${clienteId}/informacoes`)
    onClose()
  }

  const handleCredito = () => {
    showNotification('info', 'Funcionalidade em breve')
  }

  const handleAnotacoes = () => {
    showNotification('info', 'Funcionalidade em breve')
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50"
        onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      >
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto border border-slate-200">

          {isLoading ? (
            <div className="p-6 pt-6 text-center text-slate-400">Carregando...</div>
          ) : !resumo ? (
            <div className="p-6 pt-6 text-center text-slate-400">Cliente não encontrado.</div>
          ) : (
            <div className="p-4 pt-4 space-y-4">
              {/* Action buttons */}
              <div className="flex flex-wrap gap-2">
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
                <div className={infoItemClass}>
                  <User className={infoIconClass} />
                  <span className="text-slate-900 font-medium">{resumo.nome}</span>
                </div>
                {resumo.telefone && (
                  <div className={infoItemClass}>
                    <Phone className={infoIconClass} />
                    <span className="text-slate-900">{resumo.telefone}</span>
                  </div>
                )}
                {resumo.dataNascimento && (
                  <div className={infoItemClass}>
                    <Cake className={infoIconClass} />
                    <span className="text-slate-900">{formatBirthDate(resumo.dataNascimento)}</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleInformacoes}
                  className="w-full flex items-center gap-3 rounded-md py-1 text-left hover:bg-slate-100 transition-colors"
                >
                  <span className="flex items-center gap-3 min-w-0 flex-1">
                    <Info className={infoIconClass} />
                    <span className="text-sm font-medium text-slate-900 truncate">Informações do cliente</span>
                  </span>
                  <ChevronRight className={infoIconClass + ' ml-auto'} />
                </button>
                {resumo.email && (
                  <div className={infoItemClass}>
                    <Mail className={infoIconClass} />
                    <span className="text-slate-900">{resumo.email}</span>
                  </div>
                )}
              </div>

              {/* Atalhos do cliente */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1.5">
                <button
                  type="button"
                  onClick={handleCredito}
                  className="w-full flex items-center gap-3 rounded-md py-1 text-left hover:bg-slate-100 transition-colors"
                >
                  <span className="flex items-center gap-3 min-w-0 flex-1">
                    <CreditCard className={infoIconClass} />
                    <span className="text-sm font-medium text-slate-900 truncate">Crédito do cliente</span>
                  </span>
                  <ChevronRight className={infoIconClass + ' ml-auto'} />
                </button>
                <button
                  type="button"
                  onClick={handleAnotacoes}
                  className="w-full flex items-center gap-3 rounded-md py-1 text-left hover:bg-slate-100 transition-colors"
                >
                  <span className="flex items-center gap-3 min-w-0 flex-1">
                    <FileText className={infoIconClass} />
                    <span className="text-sm font-medium text-slate-900 truncate">Anotações</span>
                  </span>
                  <ChevronRight className={infoIconClass + ' ml-auto'} />
                </button>
              </div>

              {/* History */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1.5">
                <div className={infoItemClass}>
                  <Clock className={infoIconClass} />
                  <div className="min-w-0">
                    <span className="text-slate-500 text-sm">Último atendimento</span>
                    <div className="text-slate-900 text-sm">
                      {resumo.ultimoAtendimento
                        ? `${formatDate(resumo.ultimoAtendimento)} (há ${resumo.diasDesdeUltimoAtendimento} dia${resumo.diasDesdeUltimoAtendimento !== 1 ? 's' : ''})`
                        : 'Nenhum atendimento'}
                    </div>
                  </div>
                </div>
                <div className={infoItemClass}>
                  <Briefcase className={infoIconClass} />
                  <div className="min-w-0">
                    <span className="text-slate-500 text-sm">Procedimento realizado</span>
                    <div className="text-slate-900 text-sm">
                      {resumo.ultimosProcedimentos?.length > 0
                        ? `${resumo.ultimosProcedimentos[0].nome} (${formatDate(resumo.ultimosProcedimentos[0].data)})`
                        : 'Nenhum procedimento'}
                    </div>
                  </div>
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
