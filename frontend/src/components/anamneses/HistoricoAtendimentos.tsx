import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, CalendarClock, History } from 'lucide-react'
import {
  atendimentoHistoricoService,
  type AtendimentoHistorico,
  type AtendimentoHistoricoFormData,
} from '../../services/atendimentoHistoricoService'
import { useNotification } from '../../contexts/NotificationContext'
import Modal from '../Modal'
import Button from '../Button'
import ConfirmDialog from '../ConfirmDialog'
import DateInput from '../forms/DateInput'

const today = new Date().toISOString().split('T')[0]

function rotuloAtendimento(index: number) {
  return index === 0 ? 'Cliente nova' : `Atendimento ${index + 1}`
}

function fmtData(d?: string) {
  return d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '—'
}

function CampoView({ label, valor }: { label: string; valor?: string }) {
  if (!valor?.trim()) return null
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-sm text-slate-700 whitespace-pre-line">{valor}</p>
    </div>
  )
}

interface Props {
  clienteId: number
  clienteNome?: string
}

export default function HistoricoAtendimentos({ clienteId, clienteNome }: Props) {
  const { showNotification } = useNotification()
  const queryClient = useQueryClient()
  const queryKey = ['atendimentos-historico', clienteId]

  const [modal, setModal] = useState<{ open: boolean; editando: AtendimentoHistorico | null }>({
    open: false,
    editando: null,
  })
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; id: number | null }>({
    open: false,
    id: null,
  })

  const { data: atendimentos = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => atendimentoHistoricoService.listarPorCliente(clienteId),
    enabled: !!clienteId,
  })

  const emptyForm: AtendimentoHistoricoFormData = {
    clienteId,
    data: today,
    avaliacaoInicial: '',
    procedimento: '',
    orientacoes: '',
    observacoes: '',
    fotos: '',
    proximaManutencao: undefined,
  }
  const [form, setForm] = useState<AtendimentoHistoricoFormData>(emptyForm)

  const abrirNovo = () => {
    setForm(emptyForm)
    setModal({ open: true, editando: null })
  }
  const abrirEdicao = (a: AtendimentoHistorico) => {
    setForm({
      clienteId,
      data: a.data,
      avaliacaoInicial: a.avaliacaoInicial ?? '',
      procedimento: a.procedimento ?? '',
      orientacoes: a.orientacoes ?? '',
      observacoes: a.observacoes ?? '',
      fotos: a.fotos ?? '',
      proximaManutencao: a.proximaManutencao,
    })
    setModal({ open: true, editando: a })
  }

  const saveMutation = useMutation({
    mutationFn: (data: AtendimentoHistoricoFormData) =>
      modal.editando?.id
        ? atendimentoHistoricoService.atualizar(modal.editando.id, data)
        : atendimentoHistoricoService.criar(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
      showNotification('success', modal.editando ? 'Atendimento atualizado!' : 'Atendimento registrado!')
      setModal({ open: false, editando: null })
    },
    onError: (e: any) =>
      showNotification('error', e.response?.data?.message || 'Erro ao salvar atendimento'),
  })

  const deleteMutation = useMutation({
    mutationFn: atendimentoHistoricoService.excluir,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
      showNotification('success', 'Atendimento excluído!')
      setConfirmDelete({ open: false, id: null })
    },
    onError: (e: any) =>
      showNotification('error', e.response?.data?.message || 'Erro ao excluir'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.data) {
      showNotification('error', 'Informe a data do atendimento')
      return
    }
    saveMutation.mutate(form)
  }

  const fieldClass =
    'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500 text-sm'

  return (
    <section className="space-y-4 bg-white rounded-xl shadow-sm border border-gray-100 p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <History className="h-5 w-5 text-violet-600" />
          Histórico de atendimentos
        </h2>
        <Button onClick={abrirNovo}>
          <Plus className="h-4 w-4 mr-1" />
          Novo atendimento
        </Button>
      </div>
      <p className="text-xs text-slate-500 -mt-2">
        Evolução de {clienteNome || 'da cliente'} ao longo do tempo, do primeiro atendimento ao mais recente.
      </p>

      {isLoading ? (
        <p className="text-sm text-slate-400 py-4 text-center">Carregando…</p>
      ) : atendimentos.length === 0 ? (
        <div className="border border-dashed border-slate-300 rounded-2xl p-8 text-center">
          <p className="text-sm text-slate-600">Nenhum atendimento registrado ainda.</p>
          <button
            onClick={abrirNovo}
            className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-violet-700 hover:text-violet-900"
          >
            <Plus className="h-4 w-4" />
            Registrar o primeiro
          </button>
        </div>
      ) : (
        <ol className="relative border-l-2 border-violet-100 ml-2 space-y-4">
          {atendimentos.map((a, index) => (
            <li key={a.id} className="ml-4">
              <span className="absolute -left-[9px] mt-1.5 h-4 w-4 rounded-full bg-violet-500 ring-4 ring-white" />
              <div className="rounded-2xl border border-slate-200 p-4 hover:shadow-sm transition">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        index === 0
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-violet-50 text-violet-700'
                      }`}
                    >
                      {rotuloAtendimento(index)}
                    </span>
                    <p className="text-xs text-slate-500 mt-1">{fmtData(a.data)}</p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => abrirEdicao(a)}
                      className="p-1.5 rounded-lg text-slate-500 hover:bg-violet-50 hover:text-violet-700 transition"
                      aria-label="Editar atendimento"
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setConfirmDelete({ open: true, id: a.id! })}
                      className="p-1.5 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 transition"
                      aria-label="Excluir atendimento"
                      title="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <CampoView label="Avaliação inicial" valor={a.avaliacaoInicial} />
                  <CampoView label="Procedimento" valor={a.procedimento} />
                  <CampoView label="Orientações" valor={a.orientacoes} />
                  <CampoView label="Observações" valor={a.observacoes} />
                  <CampoView label="Fotos" valor={a.fotos} />
                  {a.proximaManutencao && (
                    <p className="flex items-center gap-1.5 text-xs font-medium text-amber-700">
                      <CalendarClock className="h-3.5 w-3.5" />
                      Próxima manutenção: {fmtData(a.proximaManutencao)}
                    </p>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}

      {/* Modal criar/editar */}
      <Modal
        isOpen={modal.open}
        onClose={() => setModal({ open: false, editando: null })}
        title={modal.editando ? 'Editar atendimento' : 'Novo atendimento'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Data <span className="text-red-500">*</span>
              </label>
              <DateInput
                value={form.data}
                onChange={(v) => setForm({ ...form, data: v })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Próxima manutenção</label>
              <DateInput
                value={form.proximaManutencao ?? ''}
                onChange={(v) => setForm({ ...form, proximaManutencao: v || undefined })}
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Avaliação inicial</label>
            <textarea
              rows={2}
              value={form.avaliacaoInicial ?? ''}
              onChange={(e) => setForm({ ...form, avaliacaoInicial: e.target.value })}
              placeholder="Retenção, condição dos fios/pele, etc."
              className={fieldClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Procedimento</label>
            <textarea
              rows={2}
              value={form.procedimento ?? ''}
              onChange={(e) => setForm({ ...form, procedimento: e.target.value })}
              placeholder="Técnica, mapping, curvatura, volume, cola, tempo…"
              className={fieldClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Orientações</label>
            <textarea
              rows={2}
              value={form.orientacoes ?? ''}
              onChange={(e) => setForm({ ...form, orientacoes: e.target.value })}
              className={fieldClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Observações</label>
            <textarea
              rows={2}
              value={form.observacoes ?? ''}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
              className={fieldClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Fotos (links)</label>
            <textarea
              rows={2}
              value={form.fotos ?? ''}
              onChange={(e) => setForm({ ...form, fotos: e.target.value })}
              placeholder="Cole os links das fotos, um por linha"
              className={fieldClass}
            />
          </div>
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setModal({ open: false, editando: null })}
            >
              Cancelar
            </Button>
            <Button type="submit" isLoading={saveMutation.isPending}>
              {modal.editando ? 'Salvar alterações' : 'Registrar atendimento'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={confirmDelete.open}
        title="Excluir atendimento"
        message="Tem certeza que deseja excluir este atendimento do histórico? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={() => {
          if (confirmDelete.id) deleteMutation.mutate(confirmDelete.id)
        }}
        onCancel={() => setConfirmDelete({ open: false, id: null })}
      />
    </section>
  )
}
