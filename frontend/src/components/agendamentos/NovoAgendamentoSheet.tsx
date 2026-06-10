import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
  Check, ChevronRight, ChevronLeft, Search, User, Briefcase, CreditCard,
  X, UserPlus
} from 'lucide-react'
import BottomSheet from '../BottomSheet'
import { clienteService } from '../../services/clienteService'
import { unidadeService } from '../../services/unidadeService'
import { servicoService } from '../../services/servicoService'
import { atendenteService } from '../../services/atendenteService'
import { agendamentoService } from '../../services/agendamentoService'
import { useNotification } from '../../contexts/NotificationContext'
import { getApiErrorMessage } from '../../utils/apiError'
import { matchSearch } from '../../utils/normalize'

interface Props {
  isOpen: boolean
  onClose: () => void
  /** Pré-preenche data/hora (vindo do tap em slot vazio na timeline) */
  initialDateTime?: Date
  /** Pré-seleciona profissional no primeiro bloco (vindo do tap em slot da timeline) */
  initialAtendenteId?: number
  onCreated?: () => void
}

type Step = 1 | 2 | 3

const FORMAS_PAGAMENTO = [
  { value: '', label: 'A combinar' },
  { value: 'PIX', label: 'PIX' },
  { value: 'DINHEIRO', label: 'Dinheiro' },
  { value: 'CARTAO_CREDITO', label: 'Cartão de crédito' },
  { value: 'CARTAO_DEBITO', label: 'Cartão de débito' },
  { value: 'TRANSFERENCIA', label: 'Transferência' },
]

interface Bloco {
  /** id local pra key do React */
  uid: string
  atendenteId: number | null
  servicoIds: number[]
  /** Data + hora em formato datetime-local. Inicia herdando do bloco anterior. */
  dataHora: string
}

const novoBloco = (atendenteId: number | null, dataHora: string): Bloco => ({
  uid: `b-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
  atendenteId,
  servicoIds: [],
  dataHora,
})

const splitDataHora = (v: string): { data: string; hora: string } => {
  if (!v) return { data: '', hora: '' }
  const [data, hora = ''] = v.split('T')
  return { data, hora: hora.slice(0, 5) }
}
const mergeDataHora = (data: string, hora: string): string =>
  data && hora ? `${data}T${hora}` : ''

/**
 * Wizard 3 passos pra criar agendamento.
 *
 * Step 2 reescrito (issue #155): em vez de 1 profissional + lista de serviços,
 * o usuário monta um ou mais BLOCOS (profissional + serviços + data/hora).
 * No save, o backend recebe 1 agendamento com servicos[] tendo atendenteId
 * e dataHoraInicio por item — cada item respeita seu bloco.
 */
export default function NovoAgendamentoSheet({
  isOpen, onClose, initialDateTime, initialAtendenteId, onCreated,
}: Props) {
  const queryClient = useQueryClient()
  const { showNotification } = useNotification()

  const initialDateTimeStr = initialDateTime
    ? format(initialDateTime, "yyyy-MM-dd'T'HH:mm")
    : format(new Date(), "yyyy-MM-dd'T'HH:mm")

  const [step, setStep] = useState<Step>(1)
  const [clienteSearch, setClienteSearch] = useState('')
  const [clienteId, setClienteId] = useState<number | null>(null)
  const [unidadeId, setUnidadeId] = useState<number | null>(null)
  const [blocos, setBlocos] = useState<Bloco[]>([
    novoBloco(initialAtendenteId ?? null, initialDateTimeStr),
  ])
  const [formaPagamento, setFormaPagamento] = useState<string>('')
  const [observacoes, setObservacoes] = useState<string>('')

  // Reset ao abrir
  useEffect(() => {
    if (isOpen) {
      setStep(1)
      setClienteSearch('')
      setClienteId(null)
      setUnidadeId(null)
      setObservacoes('')
      setFormaPagamento('')
      setBlocos([novoBloco(initialAtendenteId ?? null, initialDateTimeStr)])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialDateTime, initialAtendenteId])

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: clienteService.listar,
    enabled: isOpen,
  })

  const { data: unidades = [] } = useQuery({
    queryKey: ['unidades'],
    queryFn: unidadeService.listarTodos,
    enabled: isOpen,
  })

  useEffect(() => {
    if (unidades.length === 1 && !unidadeId) {
      setUnidadeId(unidades[0].id ?? null)
    }
  }, [unidades, unidadeId])

  const { data: servicos = [] } = useQuery({
    queryKey: ['servicos', 'unidade', unidadeId],
    queryFn: () => servicoService.listarAtivosPorUnidade(unidadeId!),
    enabled: !!unidadeId,
  })

  const { data: atendentes = [] } = useQuery({
    queryKey: ['atendentes', 'unidade', unidadeId],
    queryFn: () => atendenteService.listarPorUnidade(unidadeId!),
    enabled: !!unidadeId,
  })

  // Serviços disponíveis para um profissional. Servico tem atendentesIds[] (m-n).
  const servicosPorAtendente = (atId: number | null) => {
    if (!atId) return servicos
    return servicos.filter((s) => (s.atendentesIds ?? []).includes(atId))
  }

  const clientesFiltrados = useMemo(() => {
    if (!clienteSearch.trim()) return clientes.slice(0, 20)
    return clientes
      .filter((c) => matchSearch(c.nome, clienteSearch) || (c.telefone && c.telefone.includes(clienteSearch)))
      .slice(0, 20)
  }, [clientes, clienteSearch])

  const clienteSelecionado = useMemo(
    () => clientes.find((c) => c.id === clienteId) ?? null,
    [clientes, clienteId]
  )

  const valorTotal = useMemo(() => {
    return blocos.reduce((acc, b) => {
      const v = servicos
        .filter((s) => b.servicoIds.includes(s.id))
        .reduce((sub, s) => sub + Number(s.valor || 0), 0)
      return acc + v
    }, 0)
  }, [blocos, servicos])

  const createMutation = useMutation({
    mutationFn: agendamentoService.criar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] })
      showNotification('success', 'Agendamento criado com sucesso!')
      onCreated?.()
      onClose()
    },
    onError: (error: any) => {
      showNotification('error', getApiErrorMessage(error, 'Erro ao criar agendamento'))
    },
  })

  // Bloco helpers
  const updateBloco = (uid: string, patch: Partial<Bloco>) => {
    setBlocos((prev) =>
      prev.map((b) => {
        if (b.uid !== uid) return b
        const next = { ...b, ...patch }
        // Se o profissional mudou, remove serviços que não pertencem ao novo prof
        if (patch.atendenteId !== undefined && patch.atendenteId !== b.atendenteId) {
          const disponivel = new Set(servicosPorAtendente(patch.atendenteId ?? null).map((s) => s.id))
          next.servicoIds = next.servicoIds.filter((id) => disponivel.has(id))
        }
        return next
      })
    )
  }

  const adicionarBloco = () => {
    setBlocos((prev) => {
      const ultimo = prev[prev.length - 1]
      return [...prev, novoBloco(null, ultimo?.dataHora ?? initialDateTimeStr)]
    })
  }

  const removerBloco = (uid: string) => {
    setBlocos((prev) => (prev.length === 1 ? prev : prev.filter((b) => b.uid !== uid)))
  }

  const adicionarServicoAoBloco = (uid: string, servicoId: number) => {
    setBlocos((prev) =>
      prev.map((b) =>
        b.uid === uid && !b.servicoIds.includes(servicoId)
          ? { ...b, servicoIds: [...b.servicoIds, servicoId] }
          : b
      )
    )
  }
  const removerServicoDoBloco = (uid: string, servicoId: number) => {
    setBlocos((prev) =>
      prev.map((b) =>
        b.uid === uid ? { ...b, servicoIds: b.servicoIds.filter((id) => id !== servicoId) } : b
      )
    )
  }

  const canAdvance = () => {
    if (step === 1) return clienteId != null
    if (step === 2) {
      if (!unidadeId) return false
      if (blocos.length === 0) return false
      return blocos.every(
        (b) => b.atendenteId != null && b.servicoIds.length > 0 && !!b.dataHora
      )
    }
    return true
  }

  const handleNext = () => {
    if (!canAdvance()) return
    if (step < 3) setStep((step + 1) as Step)
    else handleSubmit()
  }
  const handleBack = () => {
    if (step > 1) setStep((step - 1) as Step)
  }

  const handleSubmit = () => {
    if (clienteId == null || unidadeId == null || blocos.length === 0) return

    // Atendente principal = primeiro bloco. dataHoraInicio = menor entre os blocos.
    const principal = blocos[0]
    if (principal.atendenteId == null) return
    const menorData = blocos
      .map((b) => b.dataHora)
      .filter(Boolean)
      .sort()[0]

    // Achata blocos em items: cada serviço vira 1 item com seu atendenteId + dataHora.
    // Se TODO o agendamento tem 1 só atendente e 1 só dataHora, manda só servicoId
    // (compat com endpoints/legado).
    const todosMesmoAt = blocos.every((b) => b.atendenteId === principal.atendenteId)
    const todosMesmaData = blocos.every((b) => b.dataHora === principal.dataHora)

    const servicosPayload = blocos.flatMap((b) =>
      b.servicoIds.map((sId) => {
        const item: any = { servicoId: sId }
        if (!todosMesmoAt && b.atendenteId != null) item.atendenteId = b.atendenteId
        if (!todosMesmaData && b.dataHora) item.dataHoraInicio = b.dataHora
        return item
      })
    )

    createMutation.mutate({
      clienteId,
      unidadeId,
      atendenteId: principal.atendenteId,
      dataHoraInicio: menorData,
      observacoes: observacoes.trim() || undefined,
      formaPagamentoPreferida: formaPagamento || undefined,
      servicos: servicosPayload,
    })
  }

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Novo agendamento"
      size="full"
      footer={
        <div className="flex items-center justify-between gap-3">
          {/* Progress dots */}
          <div className="flex items-center gap-1.5">
            {[1, 2, 3].map((n) => (
              <span
                key={n}
                className={`h-1.5 rounded-full transition-all ${
                  n === step ? 'w-6 bg-violet-600' : n < step ? 'w-3 bg-violet-300' : 'w-3 bg-slate-200'
                }`}
              />
            ))}
            <span className="text-[11px] text-slate-500 ml-2">{step}/3</span>
          </div>

          <div className="flex items-center gap-2">
            {step > 1 && (
              <button
                onClick={handleBack}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition"
              >
                <ChevronLeft className="h-4 w-4" />
                Voltar
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={!canAdvance() || createMutation.isPending}
              className="inline-flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-semibold bg-violet-600 text-white hover:bg-violet-700 shadow-sm shadow-violet-200 disabled:bg-slate-300 disabled:shadow-none transition"
            >
              {step < 3 ? (
                <>
                  Próximo
                  <ChevronRight className="h-4 w-4" />
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  {createMutation.isPending ? 'Salvando...' : 'Criar'}
                </>
              )}
            </button>
          </div>
        </div>
      }
    >
      {/* STEP 1 — Cliente */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Quem é o cliente?</h4>
              <p className="text-xs text-slate-500">Busque por nome ou telefone</p>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              autoFocus
              value={clienteSearch}
              onChange={(e) => setClienteSearch(e.target.value)}
              placeholder="Buscar cliente..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm placeholder-slate-400 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            />
          </div>

          {clienteSelecionado && (
            <div className="bg-violet-50 border border-violet-200 rounded-xl p-3 flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-violet-200 text-violet-800 flex items-center justify-center text-sm font-bold flex-shrink-0">
                {clienteSelecionado.nome.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-violet-900 truncate">{clienteSelecionado.nome}</p>
                {clienteSelecionado.telefone && (
                  <p className="text-xs text-violet-700">{clienteSelecionado.telefone}</p>
                )}
              </div>
              <button
                onClick={() => setClienteId(null)}
                className="text-xs text-violet-700 font-semibold hover:text-violet-900"
              >
                Trocar
              </button>
            </div>
          )}

          {!clienteSelecionado && (
            <ul className="space-y-1 max-h-[55vh] overflow-y-auto">
              {clientesFiltrados.length === 0 ? (
                <li className="text-center py-6 text-sm text-slate-500">Nenhum cliente encontrado.</li>
              ) : (
                clientesFiltrados.map((c) => (
                  <li key={c.id}>
                    <button
                      onClick={() => setClienteId(c.id!)}
                      className="w-full text-left flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-violet-300 hover:bg-violet-50 transition"
                    >
                      <div className="h-8 w-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {c.nome.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{c.nome}</p>
                        {c.telefone && <p className="text-xs text-slate-500">{c.telefone}</p>}
                      </div>
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
      )}

      {/* STEP 2 — Blocos (profissional + serviços + data/hora) */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">O que, com quem e quando?</h4>
              <p className="text-xs text-slate-500">
                Pode misturar profissionais — adicione um bloco para cada
              </p>
            </div>
          </div>

          {unidades.length > 1 && (
            <div className="min-w-0">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Unidade</label>
              <select
                value={unidadeId ?? ''}
                onChange={(e) => {
                  setUnidadeId(Number(e.target.value) || null)
                  setBlocos([novoBloco(null, initialDateTimeStr)])
                }}
                className="block w-full min-w-0 box-border px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              >
                <option value="">Selecione...</option>
                {unidades.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome}
                  </option>
                ))}
              </select>
            </div>
          )}

          {!unidadeId ? (
            <p className="text-xs text-slate-500 py-2">Selecione uma unidade primeiro.</p>
          ) : (
            <>
              {blocos.map((bloco, idx) => {
                const disponiveis = servicosPorAtendente(bloco.atendenteId)
                const selecionados = servicos.filter((s) => bloco.servicoIds.includes(s.id))
                const naoSelecionados = disponiveis.filter((s) => !bloco.servicoIds.includes(s.id))
                const dh = splitDataHora(bloco.dataHora)

                return (
                  <div
                    key={bloco.uid}
                    className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 space-y-3 overflow-hidden"
                  >
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-violet-700">
                        <span className="h-5 w-5 rounded-full bg-violet-100 flex items-center justify-center">
                          {idx + 1}
                        </span>
                        Bloco {idx + 1}
                      </span>
                      {blocos.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removerBloco(bloco.uid)}
                          className="text-xs text-rose-600 font-semibold hover:text-rose-700 inline-flex items-center gap-1"
                        >
                          <X className="h-3.5 w-3.5" />
                          Remover
                        </button>
                      )}
                    </div>

                    {/* Profissional */}
                    <div className="min-w-0">
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Profissional
                      </label>
                      <select
                        value={bloco.atendenteId ?? ''}
                        onChange={(e) =>
                          updateBloco(bloco.uid, { atendenteId: Number(e.target.value) || null })
                        }
                        className="block w-full min-w-0 box-border px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                      >
                        <option value="">Selecione...</option>
                        {atendentes.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.nomeUsuario || `Profissional #${a.id}`}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Serviços */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Serviços {selecionados.length > 0 && (
                          <span className="text-violet-600">({selecionados.length})</span>
                        )}
                      </label>

                      {/* Serviços já selecionados */}
                      {selecionados.length > 0 && (
                        <div className="space-y-1 mb-2">
                          {selecionados.map((s) => (
                            <div
                              key={s.id}
                              className="flex items-center gap-2 p-2 rounded-lg bg-violet-50 border border-violet-100"
                            >
                              <span className="flex-1 text-sm text-slate-800 truncate">{s.nome}</span>
                              <span className="text-xs font-semibold text-slate-600">
                                R$ {Number(s.valor).toFixed(2).replace('.', ',')}
                              </span>
                              <span className="text-[11px] text-slate-400">{s.duracaoMinutos}min</span>
                              <button
                                type="button"
                                onClick={() => removerServicoDoBloco(bloco.uid, s.id)}
                                className="text-rose-500 hover:text-rose-700"
                                aria-label="Remover serviço"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Adicionar serviço (select) */}
                      {!bloco.atendenteId ? (
                        <p className="text-xs text-slate-500 py-1.5">
                          Escolha o profissional primeiro.
                        </p>
                      ) : naoSelecionados.length === 0 ? (
                        <p className="text-xs text-slate-500 py-1.5">
                          {selecionados.length > 0
                            ? 'Todos os serviços deste profissional já foram adicionados.'
                            : 'Este profissional não tem serviços vinculados.'}
                        </p>
                      ) : (
                        <select
                          value=""
                          onChange={(e) => {
                            const id = Number(e.target.value)
                            if (id) adicionarServicoAoBloco(bloco.uid, id)
                          }}
                          className="block w-full min-w-0 box-border px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                        >
                          <option value="">
                            {selecionados.length > 0
                              ? '+ Adicionar outro serviço…'
                              : 'Selecione um serviço…'}
                          </option>
                          {naoSelecionados.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.nome} — R$ {Number(s.valor).toFixed(2).replace('.', ',')} ·{' '}
                              {s.duracaoMinutos}min
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Data + Hora (separados pra ficar mais responsivo em mobile).
                        iOS Safari: <input type=date/time> tem intrinsic min-width;
                        precisa min-w-0 + box-border pra não estourar o grid. */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="min-w-0">
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Data</label>
                        <input
                          type="date"
                          value={dh.data}
                          onChange={(e) =>
                            updateBloco(bloco.uid, {
                              dataHora: mergeDataHora(e.target.value, dh.hora || '09:00'),
                            })
                          }
                          className="block w-full min-w-0 box-border px-3 py-2.5 rounded-xl border border-slate-200 text-sm appearance-none bg-white focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                        />
                      </div>
                      <div className="min-w-0">
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Hora</label>
                        <input
                          type="time"
                          value={dh.hora}
                          onChange={(e) =>
                            updateBloco(bloco.uid, {
                              dataHora: mergeDataHora(dh.data, e.target.value),
                            })
                          }
                          className="block w-full min-w-0 box-border px-3 py-2.5 rounded-xl border border-slate-200 text-sm appearance-none bg-white focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                        />
                      </div>
                    </div>
                  </div>
                )
              })}

              <button
                type="button"
                onClick={adicionarBloco}
                className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 border-dashed border-violet-200 text-violet-700 font-semibold text-sm hover:bg-violet-50 transition"
              >
                <UserPlus className="h-4 w-4" />
                Adicionar profissional
              </button>

              {valorTotal > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm">
                  <span className="text-emerald-700">Valor total:</span>{' '}
                  <span className="font-bold text-emerald-900">
                    R$ {valorTotal.toFixed(2).replace('.', ',')}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* STEP 3 — Pagamento + observações */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Pagamento</h4>
              <p className="text-xs text-slate-500">Forma de pagamento e observações (opcional)</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Forma de pagamento</label>
            <select
              value={formaPagamento}
              onChange={(e) => setFormaPagamento(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            >
              {FORMAS_PAGAMENTO.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Observações</label>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={3}
              placeholder="Detalhes adicionais (opcional)"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm placeholder-slate-400 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 resize-none"
            />
          </div>

          {/* Resumo */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5 text-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Resumo</p>
            <p className="text-slate-700">
              <span className="text-slate-500">Cliente:</span>{' '}
              <span className="font-semibold">{clienteSelecionado?.nome}</span>
            </p>

            {blocos.map((bloco, idx) => {
              const at = atendentes.find((a) => a.id === bloco.atendenteId)
              const servs = servicos.filter((s) => bloco.servicoIds.includes(s.id))
              return (
                <div key={bloco.uid} className="pt-1.5 border-t border-slate-200 mt-1.5 first:border-0 first:mt-0 first:pt-0">
                  {blocos.length > 1 && (
                    <p className="text-[11px] font-bold text-violet-700 mb-0.5">Bloco {idx + 1}</p>
                  )}
                  <p className="text-slate-700">
                    <span className="text-slate-500">Profissional:</span>{' '}
                    <span className="font-semibold">{at?.nomeUsuario ?? '—'}</span>
                  </p>
                  <p className="text-slate-700">
                    <span className="text-slate-500">Data:</span>{' '}
                    <span className="font-semibold">
                      {bloco.dataHora
                        ? format(new Date(bloco.dataHora), "dd/MM/yyyy 'às' HH:mm")
                        : '—'}
                    </span>
                  </p>
                  <p className="text-slate-700">
                    <span className="text-slate-500">Serviços:</span>{' '}
                    <span className="font-semibold">
                      {servs.map((s) => s.nome).join(', ')}
                    </span>
                  </p>
                </div>
              )
            })}

            {valorTotal > 0 && (
              <p className="text-emerald-700 font-bold pt-2 border-t border-slate-200 mt-2">
                Total: R$ {valorTotal.toFixed(2).replace('.', ',')}
              </p>
            )}
          </div>
        </div>
      )}
    </BottomSheet>
  )
}
