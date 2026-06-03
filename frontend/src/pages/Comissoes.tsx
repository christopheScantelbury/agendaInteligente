import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DollarSign, CheckSquare, Square, Trash2, Plus, History } from 'lucide-react'
import {
  comissaoService,
  ComissaoRegra,
  TipoComissao,
} from '../services/comissaoService'
import { atendenteService } from '../services/atendenteService'
import { servicoService } from '../services/servicoService'
import { authService } from '../services/authService'
import Modal from '../components/Modal'
import Button from '../components/Button'
import FormField from '../components/FormField'
import ConfirmDialog from '../components/ConfirmDialog'
import { useNotification } from '../contexts/NotificationContext'
import { getApiErrorMessage } from '../utils/apiError'
import MoneyInput from '../components/forms/MoneyInput'

const formatMoeda = (v: number) =>
  (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const formatDataHora = (s?: string) =>
  s ? new Date(s).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—'

export default function Comissoes() {
  const queryClient = useQueryClient()
  const { showNotification } = useNotification()
  const navigate = useNavigate()
  const usuario = authService.getUsuario()
  const perfil = (usuario?.perfil ?? '').toUpperCase()
  const podeAcessar = perfil === 'ADMIN' || perfil === 'ADMINISTRADOR' || perfil === 'GERENTE'
  const podeGerir = podeAcessar
  if (!podeAcessar) {
    setTimeout(() => navigate('/'), 0)
    return <div className="p-8 text-center text-sm text-slate-500">Acesso negado.</div>
  }

  const [atendenteId, setAtendenteId] = useState<number | null>(null)
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set())
  const [aba, setAba] = useState<'pendentes' | 'regras' | 'pagamentos'>('pendentes')
  const [showPagar, setShowPagar] = useState(false)
  const [showRegra, setShowRegra] = useState(false)
  const [editandoRegra, setEditandoRegra] = useState<ComissaoRegra | null>(null)
  const [confirmExcluirRegra, setConfirmExcluirRegra] = useState<{ open: boolean; id: number | null }>({ open: false, id: null })

  const { data: atendentes = [] } = useQuery({
    queryKey: ['atendentes', 'ativos'],
    queryFn: atendenteService.listar,
  })

  const { data: pendentes = [], isLoading: loadingPendentes } = useQuery({
    queryKey: ['comissoes', 'pendentes', atendenteId],
    queryFn: () => comissaoService.listarPendentes(atendenteId!),
    enabled: !!atendenteId,
  })

  const { data: resumo } = useQuery({
    queryKey: ['comissoes', 'resumo', atendenteId],
    queryFn: () => comissaoService.resumo(atendenteId!),
    enabled: !!atendenteId,
  })

  const { data: regras = [] } = useQuery({
    queryKey: ['comissoes', 'regras', atendenteId],
    queryFn: () => comissaoService.listarRegras(atendenteId!),
    enabled: !!atendenteId,
  })

  const { data: pagamentos = [] } = useQuery({
    queryKey: ['comissoes', 'pagamentos', atendenteId],
    queryFn: () => comissaoService.listarPagamentos(atendenteId!),
    enabled: !!atendenteId,
  })

  const pagarMutation = useMutation({
    mutationFn: ({ ids, forma, obs }: { ids: number[]; forma?: string; obs?: string }) =>
      comissaoService.pagar(atendenteId!, ids, forma, obs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comissoes'] })
      setSelecionados(new Set())
      setShowPagar(false)
      showNotification('success', 'Pagamento registrado')
    },
    onError: (e) => showNotification('error', getApiErrorMessage(e, 'Erro ao pagar comissão')),
  })

  const excluirRegraMutation = useMutation({
    mutationFn: (id: number) => comissaoService.excluirRegra(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comissoes', 'regras', atendenteId] })
      setConfirmExcluirRegra({ open: false, id: null })
      showNotification('success', 'Regra excluída')
    },
    onError: (e) => showNotification('error', getApiErrorMessage(e, 'Erro ao excluir regra')),
  })

  const totalSelecionado = useMemo(() => {
    return pendentes
      .filter((l) => selecionados.has(l.id))
      .reduce((acc, l) => acc + (l.valorComissao ?? 0), 0)
  }, [pendentes, selecionados])

  const toggleSelecionado = (id: number) => {
    setSelecionados((prev) => {
      const novo = new Set(prev)
      if (novo.has(id)) novo.delete(id)
      else novo.add(id)
      return novo
    })
  }

  const selecionarTodos = () => {
    if (selecionados.size === pendentes.length) {
      setSelecionados(new Set())
    } else {
      setSelecionados(new Set(pendentes.map((l) => l.id)))
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-5">
      <header className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center flex-shrink-0">
          <DollarSign className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Comissões</h1>
          <p className="text-sm text-slate-500">Regras, pendências e pagamento por profissional</p>
        </div>
      </header>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        <FormField label="Profissional">
          <select
            value={atendenteId ?? ''}
            onChange={(e) => {
              setAtendenteId(e.target.value ? Number(e.target.value) : null)
              setSelecionados(new Set())
            }}
            className="mt-1 block w-full sm:w-80 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition"
          >
            <option value="">Selecione um profissional</option>
            {atendentes.map((a) => (
              <option key={a.id} value={a.id}>{a.nomeUsuario}</option>
            ))}
          </select>
        </FormField>

        {atendenteId && resumo && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <ResumoCard titulo="Comissão pendente" valor={formatMoeda(resumo.pendente)} cor="text-yellow-700" />
            <ResumoCard titulo="Comissão paga" valor={formatMoeda(resumo.pago)} cor="text-green-700" />
            <ResumoCard titulo="Atendimentos pendentes" valor={String(resumo.quantidadePendente)} cor="text-blue-700" />
            <ResumoCard titulo="Atendimentos pagos" valor={String(resumo.quantidadePaga)} cor="text-slate-700" />
          </div>
        )}
      </div>

      {atendenteId && (
        <>
          <div className="border-b border-slate-200">
            <nav className="-mb-px flex gap-4">
              <TabButton ativo={aba === 'pendentes'} onClick={() => setAba('pendentes')}>
                Pendentes
              </TabButton>
              <TabButton ativo={aba === 'regras'} onClick={() => setAba('regras')}>
                Regras
              </TabButton>
              <TabButton ativo={aba === 'pagamentos'} onClick={() => setAba('pagamentos')}>
                Histórico
              </TabButton>
            </nav>
          </div>

          {aba === 'pendentes' && (
            <div className="bg-white rounded-2xl border border-slate-200">
              <div className="px-4 py-3 border-b flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <button
                    onClick={selecionarTodos}
                    className="text-sm text-violet-700 hover:text-violet-900 flex items-center gap-1"
                  >
                    {selecionados.size === pendentes.length && pendentes.length > 0 ? (
                      <CheckSquare className="h-4 w-4" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                    {selecionados.size === pendentes.length && pendentes.length > 0 ? 'Desmarcar todos' : 'Selecionar todos'}
                  </button>
                  {selecionados.size > 0 && (
                    <button onClick={() => setSelecionados(new Set())} className="text-xs text-slate-500 hover:text-slate-700">
                      Limpar seleção
                    </button>
                  )}
                </div>
                <div className="text-sm">
                  Selecionado: <span className="font-bold text-violet-700">{formatMoeda(totalSelecionado)}</span>
                  <span className="text-slate-500 ml-2">({selecionados.size} de {pendentes.length})</span>
                </div>
                {podeGerir && (
                  <Button
                    disabled={selecionados.size === 0}
                    onClick={() => setShowPagar(true)}
                  >
                    <DollarSign className="h-4 w-4 mr-1" /> Pagar comissão
                  </Button>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <Th className="w-10">{''}</Th>
                      <Th>Data</Th>
                      <Th>Cliente</Th>
                      <Th>Serviço</Th>
                      <Th className="text-right">Valor base</Th>
                      <Th>Regra</Th>
                      <Th className="text-right">Comissão</Th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {loadingPendentes ? (
                      <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">Calculando...</td></tr>
                    ) : pendentes.length === 0 ? (
                      <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">Nenhum atendimento pendente</td></tr>
                    ) : pendentes.map((l) => (
                      <tr key={l.id}
                        className={`hover:bg-slate-50 cursor-pointer ${selecionados.has(l.id) ? 'bg-violet-50' : ''}`}
                        onClick={() => toggleSelecionado(l.id)}>
                        <td className="px-4 py-3">
                          <input type="checkbox" checked={selecionados.has(l.id)}
                            onChange={() => toggleSelecionado(l.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="rounded border-gray-300 text-violet-600 focus:ring-violet-500" />
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">{formatDataHora(l.dataAgendamento)}</td>
                        <td className="px-4 py-3 text-sm text-slate-900">{l.clienteNome ?? '—'}</td>
                        <td className="px-4 py-3 text-sm text-slate-900">{l.servicoNome ?? '—'}</td>
                        <td className="px-4 py-3 text-sm text-right">{formatMoeda(l.valorBase)}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {l.tipoAplicado === 'PERCENTUAL' ? `${l.valorRegra}%` : formatMoeda(l.valorRegra)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-semibold text-violet-700">{formatMoeda(l.valorComissao)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {aba === 'regras' && (
            <div className="bg-white rounded-2xl border border-slate-200">
              <div className="px-4 py-3 border-b flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-800">Regras configuradas</h3>
                {podeGerir && (
                  <Button onClick={() => { setEditandoRegra(null); setShowRegra(true) }}>
                    <Plus className="h-4 w-4 mr-1" /> Nova regra
                  </Button>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <Th>Serviço</Th>
                      <Th>Tipo</Th>
                      <Th className="text-right">Valor</Th>
                      <Th className="text-right">Ações</Th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {regras.length === 0 ? (
                      <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-500">
                        Nenhuma regra. Cálculo usará o percentual do cadastro do profissional.
                      </td></tr>
                    ) : regras.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm text-slate-900">
                          {r.servicoNome ?? <span className="italic text-slate-500">Regra padrão (todos os serviços)</span>}
                        </td>
                        <td className="px-4 py-3 text-sm">{r.tipo === 'PERCENTUAL' ? 'Percentual' : 'Fixo'}</td>
                        <td className="px-4 py-3 text-sm text-right font-semibold">
                          {r.tipo === 'PERCENTUAL' ? `${r.valor}%` : formatMoeda(r.valor)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {podeGerir && (
                            <button onClick={() => setConfirmExcluirRegra({ open: true, id: r.id! })}
                              className="text-red-600 hover:text-red-800 p-1" title="Excluir">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {aba === 'pagamentos' && (
            <div className="bg-white rounded-2xl border border-slate-200">
              <div className="px-4 py-3 border-b flex items-center gap-2">
                <History className="h-4 w-4 text-slate-500" />
                <h3 className="text-sm font-semibold text-gray-800">Histórico de pagamentos</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <Th>Data</Th>
                      <Th className="text-right">Valor</Th>
                      <Th>Atendimentos</Th>
                      <Th>Forma</Th>
                      <Th>Pago por</Th>
                      <Th>Observação</Th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {pagamentos.length === 0 ? (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">Nenhum pagamento</td></tr>
                    ) : pagamentos.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm">{new Date(p.dataPagamento + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                        <td className="px-4 py-3 text-sm text-right font-semibold text-green-700">{formatMoeda(p.valorTotal)}</td>
                        <td className="px-4 py-3 text-sm">{p.quantidadeAtendimentos}</td>
                        <td className="px-4 py-3 text-sm">{p.formaPagamento ?? '—'}</td>
                        <td className="px-4 py-3 text-sm">{p.pagoPorNome ?? '—'}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{p.observacao ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      <Modal isOpen={showPagar} onClose={() => setShowPagar(false)} title="Confirmar pagamento de comissão">
        <PagarForm
          quantidade={selecionados.size}
          total={totalSelecionado}
          onConfirmar={(forma, obs) =>
            pagarMutation.mutate({ ids: Array.from(selecionados), forma, obs })
          }
          onCancelar={() => setShowPagar(false)}
          isLoading={pagarMutation.isPending}
        />
      </Modal>

      <Modal isOpen={showRegra} onClose={() => setShowRegra(false)} title={editandoRegra ? 'Editar regra' : 'Nova regra de comissão'}>
        {atendenteId && (
          <RegraForm
            atendenteId={atendenteId}
            regra={editandoRegra}
            onClose={() => setShowRegra(false)}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['comissoes', 'regras', atendenteId] })
              setShowRegra(false)
              showNotification('success', 'Regra salva')
            }}
          />
        )}
      </Modal>

      <ConfirmDialog
        isOpen={confirmExcluirRegra.open}
        title="Excluir regra"
        message="Confirma a exclusão desta regra de comissão?"
        confirmText="Excluir"
        variant="danger"
        onConfirm={() => confirmExcluirRegra.id && excluirRegraMutation.mutate(confirmExcluirRegra.id)}
        onCancel={() => setConfirmExcluirRegra({ open: false, id: null })}
      />
    </div>
  )
}

function ResumoCard({ titulo, valor, cor }: { titulo: string; valor: string; cor: string }) {
  return (
    <div className="bg-slate-50 rounded p-3">
      <div className="text-xs uppercase tracking-wide text-slate-500">{titulo}</div>
      <div className={`text-lg font-bold mt-1 ${cor}`}>{valor}</div>
    </div>
  )
}

function TabButton({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
        ativo ? 'border-violet-600 text-violet-700' : 'border-transparent text-slate-600 hover:text-slate-900'
      }`}
    >
      {children}
    </button>
  )
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider ${className}`}>
      {children}
    </th>
  )
}

function PagarForm({
  quantidade,
  total,
  onConfirmar,
  onCancelar,
  isLoading,
}: {
  quantidade: number
  total: number
  onConfirmar: (forma?: string, obs?: string) => void
  onCancelar: () => void
  isLoading: boolean
}) {
  const [forma, setForma] = useState('')
  const [obs, setObs] = useState('')
  return (
    <div className="space-y-4">
      <div className="bg-violet-50 border border-violet-200 rounded p-3 text-sm">
        Você está prestes a pagar comissão de <b>{quantidade}</b> atendimento{quantidade > 1 ? 's' : ''} no
        total de <b>{formatMoeda(total)}</b>. Esta ação é irreversível.
      </div>
      <FormField label="Forma de pagamento">
        <select value={forma} onChange={(e) => setForma(e.target.value)}
          className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition">
          <option value="">—</option>
          <option value="DINHEIRO">Dinheiro</option>
          <option value="PIX">PIX</option>
          <option value="TRANSFERENCIA">Transferência</option>
          <option value="OUTRO">Outro</option>
        </select>
      </FormField>
      <FormField label="Observação">
        <textarea rows={2} value={obs} onChange={(e) => setObs(e.target.value)}
          className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition" />
      </FormField>
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button variant="secondary" onClick={onCancelar}>Cancelar</Button>
        <Button onClick={() => onConfirmar(forma || undefined, obs || undefined)} isLoading={isLoading}>
          Confirmar pagamento
        </Button>
      </div>
    </div>
  )
}

function RegraForm({
  atendenteId,
  regra,
  onClose,
  onSuccess,
}: {
  atendenteId: number
  regra: ComissaoRegra | null
  onClose: () => void
  onSuccess: () => void
}) {
  const { showNotification } = useNotification()
  const { data: servicos = [] } = useQuery({
    queryKey: ['servicos'],
    queryFn: servicoService.listarTodos,
  })

  const [form, setForm] = useState<ComissaoRegra>(regra ?? {
    atendenteId,
    servicoId: null,
    tipo: 'PERCENTUAL',
    valor: 0,
  })

  const saveMutation = useMutation({
    mutationFn: (r: ComissaoRegra) => comissaoService.salvarRegra(r),
    onSuccess,
    onError: (e) => showNotification('error', getApiErrorMessage(e, 'Erro ao salvar regra')),
  })

  return (
    <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(form) }} className="space-y-4">
      <FormField label="Serviço (deixe em branco para regra padrão)">
        <select value={form.servicoId ?? ''} onChange={(e) => setForm({ ...form, servicoId: e.target.value ? Number(e.target.value) : null })}
          className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition">
          <option value="">Regra padrão (todos os serviços)</option>
          {servicos.map((s) => (
            <option key={s.id} value={s.id}>{s.nome}</option>
          ))}
        </select>
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Tipo" required>
          <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoComissao })}
            className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition">
            <option value="PERCENTUAL">Percentual (%)</option>
            <option value="FIXO">Valor fixo (R$)</option>
          </select>
        </FormField>
        <FormField label={form.tipo === 'PERCENTUAL' ? 'Percentual (%)' : 'Valor'} required>
          {form.tipo === 'PERCENTUAL' ? (
            <input required type="number" step="0.01" min="0" max="100" value={form.valor || ''}
              onChange={(e) => setForm({ ...form, valor: parseFloat(e.target.value) || 0 })}
              className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition" />
          ) : (
            <MoneyInput required value={form.valor}
              onChange={(v) => setForm({ ...form, valor: v })}
              className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition" />
          )}
        </FormField>
      </div>
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button variant="secondary" type="button" onClick={onClose}>Cancelar</Button>
        <Button type="submit" isLoading={saveMutation.isPending}>Salvar</Button>
      </div>
    </form>
  )
}
