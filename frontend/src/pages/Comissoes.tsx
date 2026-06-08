import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DollarSign, CheckSquare, Square, Trash2, Plus, History, Receipt } from 'lucide-react'
import type { ComissaoVale } from '../services/comissaoService'
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
  const [showVales, setShowVales] = useState(false)
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
    mutationFn: ({ ids, forma, obs, valesIds }: { ids: number[]; forma?: string; obs?: string; valesIds?: number[] }) =>
      comissaoService.pagar(atendenteId!, ids, forma, obs, valesIds ?? []),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comissoes'] })
      setSelecionados(new Set())
      setShowPagar(false)
      showNotification('success', 'Pagamento registrado')
    },
    onError: (e) => showNotification('error', getApiErrorMessage(e, 'Erro ao pagar comissão')),
  })

  // #141/#142: lista de vales pendentes pra exibir no modal de pagamento
  const { data: valesPendentes = [] } = useQuery({
    queryKey: ['comissoes', 'vales', atendenteId, 'PENDENTE'],
    queryFn: () => comissaoService.listarVales(atendenteId!, 'PENDENTE'),
    enabled: !!atendenteId,
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
                  <>
                    <Button variant="secondary" onClick={() => setShowVales(true)}>
                      <Receipt className="h-4 w-4 mr-1" /> Vales
                    </Button>
                    <Button
                      disabled={selecionados.size === 0}
                      onClick={() => setShowPagar(true)}
                    >
                      <DollarSign className="h-4 w-4 mr-1" /> Pagar comissão
                    </Button>
                  </>
                )}
              </div>
              {/* Mobile: cards */}
              <div className="block sm:hidden p-3 space-y-2">
                {loadingPendentes ? (
                  <div className="text-center py-6 text-sm text-slate-500">Calculando...</div>
                ) : pendentes.length === 0 ? (
                  <div className="text-center py-6 text-sm text-slate-500">Nenhum atendimento pendente</div>
                ) : pendentes.map((l) => (
                  <div
                    key={l.id}
                    onClick={() => toggleSelecionado(l.id)}
                    className={`rounded-2xl border bg-white p-4 hover:shadow-sm transition cursor-pointer ${
                      selecionados.has(l.id) ? 'border-violet-300 bg-violet-50' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-start gap-2 min-w-0">
                        <input type="checkbox" checked={selecionados.has(l.id)}
                          onChange={() => toggleSelecionado(l.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-0.5 rounded border-gray-300 text-violet-600 focus:ring-violet-500" />
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-900 truncate">{l.clienteNome ?? '—'}</div>
                          <div className="text-xs text-slate-500 truncate">{l.servicoNome ?? '—'}</div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-bold text-violet-700">{formatMoeda(l.valorComissao)}</div>
                        <div className="text-xs text-slate-500">
                          {l.tipoAplicado === 'PERCENTUAL' ? `${l.valorRegra}%` : formatMoeda(l.valorRegra)}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-slate-600 space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Data</span>
                        <span className="text-slate-900">{formatDataHora(l.dataAgendamento)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Valor base</span>
                        <span className="font-semibold text-slate-900">{formatMoeda(l.valorBase)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop: tabela */}
              <div className="hidden sm:block overflow-x-auto">
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
              {/* Mobile: cards */}
              <div className="block sm:hidden p-3 space-y-2">
                {regras.length === 0 ? (
                  <div className="text-center py-6 text-sm text-slate-500">
                    Nenhuma regra. Cálculo usará o percentual do cadastro do profissional.
                  </div>
                ) : regras.map((r) => (
                  <div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-4 hover:shadow-sm transition">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900 truncate">
                          {r.servicoNome ?? <span className="italic text-slate-500">Regra padrão (todos os serviços)</span>}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {r.tipo === 'PERCENTUAL' ? 'Percentual' : 'Fixo'} ·{' '}
                          <span className="font-semibold text-slate-900">
                            {r.tipo === 'PERCENTUAL' ? `${r.valor}%` : formatMoeda(r.valor)}
                          </span>
                        </div>
                      </div>
                      {podeGerir && (
                        <button onClick={() => setConfirmExcluirRegra({ open: true, id: r.id! })}
                          className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100"
                          title="Excluir">
                          <Trash2 className="h-3.5 w-3.5" /> Excluir
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop: tabela */}
              <div className="hidden sm:block overflow-x-auto">
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
              {/* Mobile: cards */}
              <div className="block sm:hidden p-3 space-y-2">
                {pagamentos.length === 0 ? (
                  <div className="text-center py-6 text-sm text-slate-500">Nenhum pagamento</div>
                ) : pagamentos.map((p) => (
                  <div key={p.id} className="rounded-2xl border border-slate-200 bg-white p-4 hover:shadow-sm transition">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="text-sm font-semibold text-slate-900">
                        {new Date(p.dataPagamento + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </div>
                      <div className="text-sm font-bold text-green-700">{formatMoeda(p.valorTotal)}</div>
                    </div>
                    <div className="text-xs text-slate-600 space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Atendimentos</span>
                        <span className="text-slate-900">{p.quantidadeAtendimentos}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Forma</span>
                        <span className="text-slate-900">{p.formaPagamento ?? '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Pago por</span>
                        <span className="text-slate-900 truncate ml-2">{p.pagoPorNome ?? '—'}</span>
                      </div>
                      {p.observacao && (
                        <div>
                          <span className="text-slate-500">Observação:</span>{' '}
                          <span className="text-slate-700">{p.observacao}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop: tabela */}
              <div className="hidden sm:block overflow-x-auto">
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

      <Modal isOpen={showPagar} onClose={() => setShowPagar(false)} title="Pagamento de comissão">
        <PagarForm
          quantidade={selecionados.size}
          total={totalSelecionado}
          valesPendentes={valesPendentes}
          onConfirmar={(forma, obs, valesIds) =>
            pagarMutation.mutate({ ids: Array.from(selecionados), forma, obs, valesIds })
          }
          onCancelar={() => setShowPagar(false)}
          isLoading={pagarMutation.isPending}
        />
      </Modal>

      <Modal isOpen={showVales} onClose={() => setShowVales(false)} title="Vales/Adiantamentos">
        {atendenteId && <ValesManager atendenteId={atendenteId} onClose={() => setShowVales(false)} />}
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
  valesPendentes,
  onConfirmar,
  onCancelar,
  isLoading,
}: {
  quantidade: number
  total: number
  valesPendentes: ComissaoVale[]
  onConfirmar: (forma?: string, obs?: string, valesIds?: number[]) => void
  onCancelar: () => void
  isLoading: boolean
}) {
  const [forma, setForma] = useState('')
  const [obs, setObs] = useState('')
  // #141: vales selecionados para abater
  const [valesSelecionados, setValesSelecionados] = useState<Set<number>>(new Set())

  const totalVales = useMemo(
    () => valesPendentes
      .filter((v) => v.id != null && valesSelecionados.has(v.id))
      .reduce((acc, v) => acc + Number(v.valor ?? 0), 0),
    [valesPendentes, valesSelecionados],
  )
  const liquido = Math.max(0, total - totalVales)
  const excedeu = totalVales > total

  const formaInvalida = !forma

  const toggleVale = (id?: number) => {
    if (id == null) return
    setValesSelecionados((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-4">
      {/* Cabecalho */}
      <div className="bg-violet-50 border border-violet-200 rounded-xl p-3 text-sm space-y-1">
        <div>
          <span className="text-slate-600">Atendimentos selecionados:</span>{' '}
          <b className="text-slate-900">{quantidade}</b>
        </div>
      </div>

      {/* Resumo financeiro */}
      <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-500">Comissão bruta</span>
          <span className="font-semibold text-slate-900">{formatMoeda(total)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Vales a descontar</span>
          <span className={`font-semibold ${totalVales > 0 ? 'text-orange-600' : 'text-slate-400'}`}>
            {totalVales > 0 ? `− ${formatMoeda(totalVales)}` : formatMoeda(0)}
          </span>
        </div>
        <div className="flex justify-between border-t border-slate-200 pt-2 mt-2">
          <span className="text-slate-700 font-semibold">Líquido a pagar</span>
          <span className={`font-bold text-base ${excedeu ? 'text-red-600' : 'text-green-700'}`}>
            {formatMoeda(liquido)}
          </span>
        </div>
        {excedeu && (
          <p className="text-xs text-red-600 mt-1">
            Total de vales excede a comissão. Reduza a seleção.
          </p>
        )}
      </div>

      {/* Lista de vales */}
      {valesPendentes.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Vales disponíveis
            </span>
            <span className="text-xs text-slate-500">
              {valesSelecionados.size} de {valesPendentes.length} selecionado{valesSelecionados.size !== 1 ? 's' : ''}
            </span>
          </div>
          <ul className="space-y-1 max-h-48 overflow-y-auto">
            {valesPendentes.map((v) => (
              <li key={v.id}>
                <button
                  type="button"
                  onClick={() => toggleVale(v.id)}
                  className={`w-full flex items-center justify-between gap-2 px-2 py-2 rounded-lg text-sm transition ${
                    v.id != null && valesSelecionados.has(v.id)
                      ? 'bg-violet-50 border border-violet-200'
                      : 'hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {v.id != null && valesSelecionados.has(v.id)
                      ? <CheckSquare className="h-4 w-4 text-violet-600 flex-shrink-0" />
                      : <Square className="h-4 w-4 text-slate-400 flex-shrink-0" />}
                    <div className="text-left min-w-0">
                      <div className="text-slate-900 truncate">
                        {v.observacao || 'Vale sem observação'}
                      </div>
                      <div className="text-xs text-slate-500">{formatDateBR(v.dataVale)}</div>
                    </div>
                  </div>
                  <span className="font-semibold text-orange-700 flex-shrink-0">
                    {formatMoeda(Number(v.valor))}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <FormField label="Forma de pagamento" required>
        <select value={forma} onChange={(e) => setForma(e.target.value)}
          className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition">
          <option value="">Selecione…</option>
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
        <Button
          onClick={() => onConfirmar(forma || undefined, obs || undefined, Array.from(valesSelecionados))}
          isLoading={isLoading}
          disabled={formaInvalida || excedeu}
        >
          Confirmar pagamento
        </Button>
      </div>
    </div>
  )
}

// #142: gerente de vales (criar, listar, excluir pendentes)
function ValesManager({ atendenteId, onClose: _onClose }: { atendenteId: number; onClose: () => void }) {
  const queryClient = useQueryClient()
  const { showNotification } = useNotification()
  const [aba, setAba] = useState<'pendentes' | 'descontados'>('pendentes')
  const [showForm, setShowForm] = useState(false)
  const [valor, setValor] = useState<number>(0)
  const [observacao, setObservacao] = useState('')
  const [dataVale, setDataVale] = useState(() => new Date().toISOString().slice(0, 10))
  const [confirmExcluir, setConfirmExcluir] = useState<{ open: boolean; id: number | null }>({ open: false, id: null })

  const { data: pendentes = [] } = useQuery({
    queryKey: ['comissoes', 'vales', atendenteId, 'PENDENTE'],
    queryFn: () => comissaoService.listarVales(atendenteId, 'PENDENTE'),
  })
  const { data: descontados = [] } = useQuery({
    queryKey: ['comissoes', 'vales', atendenteId, 'DESCONTADO'],
    queryFn: () => comissaoService.listarVales(atendenteId, 'DESCONTADO'),
  })
  const totalPendente = pendentes.reduce((a, v) => a + Number(v.valor ?? 0), 0)

  const criarMutation = useMutation({
    mutationFn: () => comissaoService.criarVale({
      atendenteId,
      valor,
      dataVale,
      observacao: observacao || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comissoes', 'vales', atendenteId] })
      setShowForm(false)
      setValor(0)
      setObservacao('')
      setDataVale(new Date().toISOString().slice(0, 10))
      showNotification('success', 'Vale registrado')
    },
    onError: (e) => showNotification('error', getApiErrorMessage(e, 'Erro ao criar vale')),
  })

  const excluirMutation = useMutation({
    mutationFn: (id: number) => comissaoService.excluirVale(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comissoes', 'vales', atendenteId] })
      setConfirmExcluir({ open: false, id: null })
      showNotification('success', 'Vale excluído')
    },
    onError: (e) => showNotification('error', getApiErrorMessage(e, 'Erro ao excluir vale')),
  })

  const lista = aba === 'pendentes' ? pendentes : descontados

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-orange-50 border border-orange-200 p-3 text-sm">
        <div className="flex justify-between items-center">
          <span className="text-slate-700">Total de vales pendentes</span>
          <b className="text-orange-700">{formatMoeda(totalPendente)}</b>
        </div>
      </div>

      {!showForm ? (
        <Button onClick={() => setShowForm(true)} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-1" /> Adicionar vale
        </Button>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Valor" required>
              <MoneyInput value={valor} onChange={setValor}
                className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition" />
            </FormField>
            <FormField label="Data" required>
              <input type="date" value={dataVale} onChange={(e) => setDataVale(e.target.value)}
                className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition" />
            </FormField>
          </div>
          <FormField label="Observação">
            <input type="text" value={observacao} onChange={(e) => setObservacao(e.target.value)}
              placeholder="Motivo do vale (opcional)"
              className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition" />
          </FormField>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={() => criarMutation.mutate()} isLoading={criarMutation.isPending} disabled={valor <= 0}>
              Salvar vale
            </Button>
          </div>
        </div>
      )}

      <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
        <button
          type="button"
          onClick={() => setAba('pendentes')}
          className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition ${
            aba === 'pendentes' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'
          }`}
        >
          Ainda não descontados ({pendentes.length})
        </button>
        <button
          type="button"
          onClick={() => setAba('descontados')}
          className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition ${
            aba === 'descontados' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'
          }`}
        >
          Já descontados ({descontados.length})
        </button>
      </div>

      {lista.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-6">
          {aba === 'pendentes' ? 'Nenhum vale pendente.' : 'Nenhum vale descontado.'}
        </p>
      ) : (
        <ul className="space-y-2">
          {lista.map((v) => (
            <li key={v.id} className="rounded-xl border border-slate-200 bg-white p-3 flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="text-sm text-slate-900 truncate">
                  {v.observacao || 'Vale sem observação'}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {formatDateBR(v.dataVale)}
                  {v.status === 'DESCONTADO' && v.pagamentoId && (
                    <span className="ml-2 text-violet-600">· descontado no pagamento #{v.pagamentoId}</span>
                  )}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="font-semibold text-orange-700">{formatMoeda(Number(v.valor))}</div>
                {aba === 'pendentes' && (
                  <button
                    type="button"
                    onClick={() => v.id != null && setConfirmExcluir({ open: true, id: v.id })}
                    className="text-xs text-red-600 hover:text-red-800 mt-1 inline-flex items-center gap-1"
                  >
                    <Trash2 className="h-3 w-3" /> Excluir
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        isOpen={confirmExcluir.open}
        title="Excluir vale"
        message="Confirma a exclusão deste vale? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        variant="danger"
        onConfirm={() => confirmExcluir.id != null && excluirMutation.mutate(confirmExcluir.id)}
        onCancel={() => setConfirmExcluir({ open: false, id: null })}
      />
    </div>
  )
}

function formatDateBR(yyyyMmDd?: string): string {
  if (!yyyyMmDd) return '—'
  try {
    const [y, m, d] = yyyyMmDd.split('-')
    return `${d}/${m}/${y}`
  } catch {
    return yyyyMmDd
  }
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
