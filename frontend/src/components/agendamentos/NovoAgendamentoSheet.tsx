import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Check, ChevronRight, ChevronLeft, Search, User, Briefcase, CalendarClock, CreditCard } from 'lucide-react'
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
  /** Pré-seleciona profissional no Step 2 (vindo do tap em slot na coluna do prof) */
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

/**
 * Wizard 3 passos pra criar agendamento.
 * Mobile: bottom-sheet full-screen. Desktop: modal centralizado.
 *
 * Slice 3 do redesign #140. Edge cases avançados (recorrência, valor por
 * serviço editável) ficam pra próximas iterações — usuário com necessidade
 * complexa usa /agendamentos/novo legado.
 */
export default function NovoAgendamentoSheet({ isOpen, onClose, initialDateTime, initialAtendenteId, onCreated }: Props) {
  const queryClient = useQueryClient()
  const { showNotification } = useNotification()

  const [step, setStep] = useState<Step>(1)
  const [clienteSearch, setClienteSearch] = useState('')
  const [clienteId, setClienteId] = useState<number | null>(null)
  const [unidadeId, setUnidadeId] = useState<number | null>(null)
  const [atendenteId, setAtendenteId] = useState<number | null>(null)
  const [servicosIds, setServicosIds] = useState<number[]>([])
  const [dataHora, setDataHora] = useState<string>(
    initialDateTime ? format(initialDateTime, "yyyy-MM-dd'T'HH:mm") : format(new Date(), "yyyy-MM-dd'T'HH:mm")
  )
  const [formaPagamento, setFormaPagamento] = useState<string>('')
  const [observacoes, setObservacoes] = useState<string>('')

  // Reset quando reabre
  useEffect(() => {
    if (isOpen) {
      setStep(1)
      setClienteSearch('')
      setClienteId(null)
      setUnidadeId(null)
      setAtendenteId(initialAtendenteId ?? null)
      setServicosIds([])
      setObservacoes('')
      setFormaPagamento('')
      setDataHora(
        initialDateTime
          ? format(initialDateTime, "yyyy-MM-dd'T'HH:mm")
          : format(new Date(), "yyyy-MM-dd'T'HH:mm")
      )
    }
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

  // Auto-seleciona unidade se só existir 1
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

  // #136: Quando profissional selecionado, só exibe serviços que ele atende.
  // Servico tem atendentesIds[] (vinculação m-n com atendente).
  const servicosDisponiveis = useMemo(() => {
    if (!atendenteId) return servicos
    return servicos.filter((s) => (s.atendentesIds ?? []).includes(atendenteId))
  }, [servicos, atendenteId])

  // #136: Ao trocar profissional, remover serviços já selecionados que não pertencem
  // ao novo profissional. Mostra um aviso quando algum cai.
  const [aviso136, setAviso136] = useState<string | null>(null)
  useEffect(() => {
    if (!atendenteId || servicosIds.length === 0) {
      if (aviso136) setAviso136(null)
      return
    }
    const idsValidos = new Set(servicosDisponiveis.map((s) => s.id))
    const removidos = servicosIds.filter((id) => !idsValidos.has(id))
    if (removidos.length > 0) {
      setServicosIds((prev) => prev.filter((id) => idsValidos.has(id)))
      setAviso136(
        removidos.length === 1
          ? '1 serviço selecionado não é oferecido por este profissional e foi removido.'
          : `${removidos.length} serviços não são oferecidos por este profissional e foram removidos.`
      )
    } else if (aviso136) {
      setAviso136(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atendenteId, servicosDisponiveis])

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

  const valorTotal = useMemo(
    () =>
      servicos
        .filter((s) => servicosIds.includes(s.id))
        .reduce((acc, s) => acc + Number(s.valor || 0), 0),
    [servicos, servicosIds]
  )

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

  const canAdvance = () => {
    if (step === 1) return clienteId != null
    if (step === 2) return unidadeId != null && atendenteId != null && servicosIds.length > 0 && dataHora
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
    if (clienteId == null || unidadeId == null || atendenteId == null || servicosIds.length === 0) return
    createMutation.mutate({
      clienteId,
      unidadeId,
      atendenteId,
      dataHoraInicio: dataHora,
      observacoes: observacoes.trim() || undefined,
      formaPagamentoPreferida: formaPagamento || undefined,
      servicos: servicosIds.map((id) => ({ servicoId: id })),
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

      {/* STEP 2 — Serviço, profissional, horário */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">O que e quando?</h4>
              <p className="text-xs text-slate-500">Serviço, profissional e horário</p>
            </div>
          </div>

          {unidades.length > 1 && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Unidade</label>
              <select
                value={unidadeId ?? ''}
                onChange={(e) => {
                  setUnidadeId(Number(e.target.value) || null)
                  setAtendenteId(null)
                  setServicosIds([])
                }}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
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

          {/* #136: Profissional vem ANTES de Serviços pra filtrar serviços pelo profissional escolhido */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Profissional</label>
            <select
              value={atendenteId ?? ''}
              onChange={(e) => setAtendenteId(Number(e.target.value) || null)}
              disabled={!unidadeId}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option value="">Selecione...</option>
              {atendentes.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nomeUsuario || `Profissional #${a.id}`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Serviços {servicosIds.length > 0 && <span className="text-violet-600">({servicosIds.length})</span>}
              {atendenteId && (
                <span className="ml-1 text-[10px] text-slate-400 font-normal">
                  · só os deste profissional
                </span>
              )}
            </label>
            {aviso136 && (
              <div className="mb-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                {aviso136}
              </div>
            )}
            {!unidadeId ? (
              <p className="text-xs text-slate-500 py-2">Selecione uma unidade primeiro.</p>
            ) : servicos.length === 0 ? (
              <p className="text-xs text-slate-500 py-2">Nenhum serviço cadastrado nesta unidade.</p>
            ) : atendenteId && servicosDisponiveis.length === 0 ? (
              <div className="text-xs text-slate-500 py-3 px-3 bg-slate-50 border border-slate-200 rounded-xl">
                Este profissional não tem serviços vinculados ainda. Cadastre em{' '}
                <strong>Profissionais</strong> ou escolha outro profissional.
              </div>
            ) : (
              <div className="space-y-1 max-h-44 overflow-y-auto rounded-xl border border-slate-100 p-1">
                {servicosDisponiveis.map((s) => {
                  const checked = servicosIds.includes(s.id)
                  return (
                    <label
                      key={s.id}
                      className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition ${
                        checked ? 'bg-violet-50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          if (e.target.checked) setServicosIds([...servicosIds, s.id])
                          else setServicosIds(servicosIds.filter((id) => id !== s.id))
                        }}
                        className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                      />
                      <span className="flex-1 text-sm text-slate-800 truncate">{s.nome}</span>
                      <span className="text-xs font-semibold text-slate-600">
                        R$ {Number(s.valor).toFixed(2).replace('.', ',')}
                      </span>
                      <span className="text-[11px] text-slate-400">{s.duracaoMinutos}min</span>
                    </label>
                  )
                })}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
              <CalendarClock className="h-3.5 w-3.5" />
              Data e hora
            </label>
            <input
              type="datetime-local"
              value={dataHora}
              onChange={(e) => setDataHora(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            />
          </div>

          {valorTotal > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm">
              <span className="text-emerald-700">Valor total:</span>{' '}
              <span className="font-bold text-emerald-900">
                R$ {valorTotal.toFixed(2).replace('.', ',')}
              </span>
            </div>
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
            <p className="text-slate-700">
              <span className="text-slate-500">Profissional:</span>{' '}
              <span className="font-semibold">
                {atendentes.find((a) => a.id === atendenteId)?.nomeUsuario ?? '—'}
              </span>
            </p>
            <p className="text-slate-700">
              <span className="text-slate-500">Data:</span>{' '}
              <span className="font-semibold">
                {dataHora ? format(new Date(dataHora), "dd/MM/yyyy 'às' HH:mm") : '—'}
              </span>
            </p>
            <p className="text-slate-700">
              <span className="text-slate-500">Serviços:</span>{' '}
              <span className="font-semibold">
                {servicos
                  .filter((s) => servicosIds.includes(s.id))
                  .map((s) => s.nome)
                  .join(', ')}
              </span>
            </p>
            {valorTotal > 0 && (
              <p className="text-emerald-700 font-bold pt-1 border-t border-slate-200 mt-2">
                Total: R$ {valorTotal.toFixed(2).replace('.', ',')}
              </p>
            )}
          </div>
        </div>
      )}
    </BottomSheet>
  )
}
