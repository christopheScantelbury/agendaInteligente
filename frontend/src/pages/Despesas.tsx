import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit, Trash2, Download, Tag, CheckCircle, AlertTriangle, Clock, Lock, Receipt } from 'lucide-react'
import MoneyInput from '../components/forms/MoneyInput'
import {
  despesaService,
  categoriaDespesaService,
  Despesa,
  CategoriaDespesa,
  StatusDespesa,
  RecorrenciaDespesa,
} from '../services/despesaService'
import { unidadeService } from '../services/unidadeService'
import { authService } from '../services/authService'
import Modal from '../components/Modal'
import Button from '../components/Button'
import FormField from '../components/FormField'
import ConfirmDialog from '../components/ConfirmDialog'
import { useNotification } from '../contexts/NotificationContext'
import { getApiErrorMessage } from '../utils/apiError'
import { baixarArquivo } from '../utils/downloadFile'

const STATUS_LABEL: Record<StatusDespesa, string> = {
  RASCUNHO: 'Rascunho',
  APROVADA: 'Aprovada',
  PAGA: 'Paga',
  CANCELADA: 'Cancelada',
}

const STATUS_BADGE: Record<StatusDespesa, string> = {
  RASCUNHO: 'bg-gray-100 text-slate-700 border-gray-200',
  APROVADA: 'bg-blue-50 text-blue-700 border-blue-200',
  PAGA: 'bg-green-50 text-green-700 border-green-200',
  CANCELADA: 'bg-red-50 text-red-700 border-red-200',
}

const RECORRENCIA_LABEL: Record<RecorrenciaDespesa, string> = {
  NENHUMA: 'Não',
  MENSAL: 'Mensal',
  TRIMESTRAL: 'Trimestral',
  ANUAL: 'Anual',
}

function inicioDoMes() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
}
function fimDoMes() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10)
}
const formatMoeda = (v: number) =>
  (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const formatData = (s?: string | null) => {
  if (!s) return '—'
  // Extrai YYYY-MM-DD do início da string (ignora horário ou anos > 4 dígitos)
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return s
  return `${m[3]}/${m[2]}/${m[1]}`
}

export default function Despesas() {
  const queryClient = useQueryClient()
  const { showNotification } = useNotification()
  const navigate = useNavigate()
  const usuario = authService.getUsuario()
  const perfil = (usuario?.perfil ?? '').toUpperCase()
  const podeAcessar = perfil === 'ADMIN' || perfil === 'ADMINISTRADOR' || perfil === 'GERENTE'
  const podeEditar = podeAcessar
  if (!podeAcessar) {
    setTimeout(() => navigate('/'), 0)
    return <div className="p-8 text-center text-sm text-slate-500">Acesso negado.</div>
  }

  const [inicio, setInicio] = useState(inicioDoMes())
  const [fim, setFim] = useState(fimDoMes())
  const [statusFiltro, setStatusFiltro] = useState<string>('TODAS')
  const [busca, setBusca] = useState('')
  const [unidadeIdFiltro, setUnidadeIdFiltro] = useState<number | undefined>()
  const [showForm, setShowForm] = useState(false)
  const [showCategorias, setShowCategorias] = useState(false)
  const [editando, setEditando] = useState<Despesa | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; id: number | null }>({ open: false, id: null })

  const { data: despesas = [], isLoading } = useQuery({
    queryKey: ['despesas', inicio, fim, statusFiltro, busca, unidadeIdFiltro],
    queryFn: () =>
      despesaService.listar({
        inicio,
        fim,
        status: statusFiltro,
        busca: busca || undefined,
        unidadeId: unidadeIdFiltro,
      }),
  })

  const { data: resumo } = useQuery({
    queryKey: ['despesas', 'resumo', inicio, fim, unidadeIdFiltro],
    queryFn: () => despesaService.resumo({ inicio, fim, unidadeId: unidadeIdFiltro }),
  })

  const { data: unidades = [] } = useQuery({
    queryKey: ['unidades'],
    queryFn: unidadeService.listarTodos,
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: StatusDespesa }) =>
      despesaService.alterarStatus(id, status, status === 'PAGA' ? new Date().toISOString().slice(0, 10) : undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['despesas'] })
      showNotification('success', 'Status atualizado')
    },
    onError: (e) => showNotification('error', getApiErrorMessage(e, 'Erro ao alterar status')),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => despesaService.excluir(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['despesas'] })
      showNotification('success', 'Despesa excluída')
      setConfirmDelete({ open: false, id: null })
    },
    onError: (e) => showNotification('error', getApiErrorMessage(e, 'Erro ao excluir')),
  })

  const exportarCSV = () => {
    if (!despesas.length) {
      showNotification('info', 'Sem dados para exportar no período')
      return
    }
    const header = ['Nome', 'Valor', 'Vencimento', 'Categoria', 'Status', 'Unidade', 'Recorrência', 'Fornecedor']
    const linhas = despesas.map((d) => [
      d.nome,
      String(d.valor).replace('.', ','),
      d.dataVencimento,
      d.categoriaNome ?? '',
      STATUS_LABEL[d.status ?? 'RASCUNHO'],
      d.unidadeNome ?? '',
      RECORRENCIA_LABEL[d.recorrencia ?? 'NENHUMA'],
      d.fornecedor ?? '',
    ])
    const csv = [header, ...linhas].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    baixarArquivo(csv, `despesas-${inicio}-a-${fim}.csv`)
    showNotification('success', `${despesas.length} despesa(s) exportada(s)`)
  }

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-5">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center flex-shrink-0">
            <Receipt className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Despesas</h1>
            <p className="text-sm text-slate-500">Controle financeiro operacional</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setShowCategorias(true)}>
            <Tag className="h-4 w-4 mr-1" /> Categorias
          </Button>
          <Button type="button" variant="secondary" onClick={exportarCSV}>
            <Download className="h-4 w-4 mr-1" /> Exportar CSV
          </Button>
          {podeEditar && (
            <Button onClick={() => { setEditando(null); setShowForm(true) }}>
              <Plus className="h-4 w-4 mr-1" /> Adicionar despesa
            </Button>
          )}
        </div>
      </header>

      {resumo && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <ResumoCard titulo="Total no período" valor={formatMoeda(resumo.totalGeral)} cor="text-violet-700" />
          <ResumoCard titulo="Pagas" valor={formatMoeda(resumo.totalPaga)} cor="text-green-700" />
          <ResumoCard titulo="A pagar" valor={formatMoeda(resumo.totalRascunho + resumo.totalAprovada)} cor="text-blue-700" />
          <ResumoCard titulo="Vencidas" valor={String(resumo.quantidadeVencidas)} cor="text-red-700" icon={<AlertTriangle className="h-5 w-5" />} />
        </div>
      )}

      <div className="flex flex-wrap gap-2 items-end bg-white p-3 rounded-2xl border border-slate-200">
        <FormField label="Buscar">
          <input type="text" value={busca} onChange={(e) => setBusca(e.target.value)}
            placeholder="Nome, fornecedor, descrição..."
            className="mt-1 block w-64 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition" />
        </FormField>
        <FormField label="Status">
          <select value={statusFiltro} onChange={(e) => setStatusFiltro(e.target.value)}
            className="mt-1 block rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition">
            <option value="TODAS">Todas</option>
            <option value="NAO_PAGAS">Somente não pagas</option>
            <option value="VENCENDO">Vencendo (7 dias)</option>
            <option value="ATRASADAS">Atrasadas</option>
            <option value="RASCUNHO">Rascunho</option>
            <option value="APROVADA">Aprovada</option>
            <option value="PAGA">Paga</option>
            <option value="CANCELADA">Cancelada</option>
          </select>
        </FormField>
        <FormField label="Início">
          <input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)}
            className="mt-1 block rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition" />
        </FormField>
        <FormField label="Fim">
          <input type="date" value={fim} onChange={(e) => setFim(e.target.value)}
            className="mt-1 block rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition" />
        </FormField>
        {unidades.length > 1 && (
          <FormField label="Unidade">
            <select
              value={unidadeIdFiltro ?? ''}
              onChange={(e) => setUnidadeIdFiltro(e.target.value ? Number(e.target.value) : undefined)}
              className="mt-1 block rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition"
            >
              <option value="">Todas</option>
              {unidades.map((u) => (
                <option key={u.id} value={u.id}>{u.nome}</option>
              ))}
            </select>
          </FormField>
        )}
      </div>

      {/* Mobile: cards */}
      <div className="block sm:hidden space-y-2">
        {isLoading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center text-sm text-slate-500">Carregando...</div>
        ) : despesas.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center text-sm text-slate-500">Nenhuma despesa no período</div>
        ) : despesas.map((d) => (
          <div key={d.id} className="rounded-2xl border border-slate-200 bg-white p-4 hover:shadow-sm transition">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900 truncate">{d.nome}</div>
                {d.fornecedor && <div className="text-xs text-slate-500 truncate">{d.fornecedor}</div>}
              </div>
              <span className={`shrink-0 inline-block px-2 py-0.5 rounded-full text-xs border ${STATUS_BADGE[d.status ?? 'RASCUNHO']}`}>
                {STATUS_LABEL[d.status ?? 'RASCUNHO']}
              </span>
            </div>
            <div className="text-xs text-slate-600 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Valor</span>
                <span className="font-semibold text-slate-900">{formatMoeda(d.valor)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Vencimento</span>
                <span className="font-semibold text-slate-900">
                  {formatData(d.dataVencimento)}
                  {(d.diasAtraso ?? 0) > 0 && (
                    <span className="ml-2 text-red-600 inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {d.diasAtraso}d atraso
                    </span>
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Categoria</span>
                <span className="inline-flex items-center gap-1 text-slate-900">
                  {d.categoriaCor && (
                    <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: d.categoriaCor }} />
                  )}
                  {d.categoriaNome ?? '—'}
                </span>
              </div>
              {d.unidadeNome && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Unidade</span>
                  <span className="text-slate-900">{d.unidadeNome}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Recorrência</span>
                <span className="text-slate-900">{RECORRENCIA_LABEL[d.recorrencia ?? 'NENHUMA']}</span>
              </div>
            </div>
            {podeEditar && (
              <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-slate-100">
                {d.status !== 'PAGA' && d.status !== 'CANCELADA' && (
                  <button
                    onClick={() => statusMutation.mutate({ id: d.id!, status: 'PAGA' })}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100"
                    title="Marcar como paga"
                  >
                    <CheckCircle className="h-3.5 w-3.5" /> Pagar
                  </button>
                )}
                {d.status !== 'PAGA' && d.status !== 'CANCELADA' && (
                  <button onClick={() => { setEditando(d); setShowForm(true) }}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100">
                    <Edit className="h-3.5 w-3.5" /> Editar
                  </button>
                )}
                {d.status !== 'PAGA' && (
                  <button onClick={() => setConfirmDelete({ open: true, id: d.id! })}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100">
                    <Trash2 className="h-3.5 w-3.5" /> Excluir
                  </button>
                )}
                {(d.status === 'PAGA' || d.status === 'CANCELADA') && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-gray-500 bg-gray-50">
                    <Lock className="h-3.5 w-3.5" /> Bloqueada
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Desktop: tabela */}
      <div className="hidden sm:block bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <Th>Nome</Th>
                <Th className="text-right">Valor</Th>
                <Th>Vencimento</Th>
                <Th>Categoria</Th>
                <Th>Status</Th>
                <Th>Unidade</Th>
                <Th>Recorrência</Th>
                <Th className="text-right">Ações</Th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {isLoading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-500">Carregando...</td></tr>
              ) : despesas.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-500">Nenhuma despesa no período</td></tr>
              ) : despesas.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm">
                    <div className="font-medium text-slate-900">{d.nome}</div>
                    {d.fornecedor && <div className="text-xs text-slate-500">{d.fornecedor}</div>}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-semibold text-slate-900">{formatMoeda(d.valor)}</td>
                  <td className="px-4 py-3 text-sm">
                    {formatData(d.dataVencimento)}
                    {(d.diasAtraso ?? 0) > 0 && (
                      <div className="text-xs text-red-600 flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {d.diasAtraso}d atraso
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className="inline-flex items-center gap-1">
                      {d.categoriaCor && (
                        <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: d.categoriaCor }} />
                      )}
                      {d.categoriaNome}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs border ${STATUS_BADGE[d.status ?? 'RASCUNHO']}`}>
                      {STATUS_LABEL[d.status ?? 'RASCUNHO']}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">{d.unidadeNome}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{RECORRENCIA_LABEL[d.recorrencia ?? 'NENHUMA']}</td>
                  <td className="px-4 py-3 text-sm text-right">
                    <div className="flex justify-end gap-1">
                      {podeEditar && d.status !== 'PAGA' && d.status !== 'CANCELADA' && (
                        <button
                          onClick={() => statusMutation.mutate({ id: d.id!, status: 'PAGA' })}
                          className="text-green-600 hover:text-green-800 p-1"
                          title="Marcar como paga"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                      )}
                      {podeEditar && d.status !== 'PAGA' && d.status !== 'CANCELADA' && (
                        <button onClick={() => { setEditando(d); setShowForm(true) }}
                          className="text-blue-600 hover:text-blue-800 p-1" title="Editar">
                          <Edit className="h-4 w-4" />
                        </button>
                      )}
                      {podeEditar && d.status !== 'PAGA' && (
                        <button onClick={() => setConfirmDelete({ open: true, id: d.id! })}
                          className="text-red-600 hover:text-red-800 p-1" title="Excluir">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                      {podeEditar && (d.status === 'PAGA' || d.status === 'CANCELADA') && (
                        <span className="group relative inline-flex p-1 text-gray-400 cursor-not-allowed">
                          <Lock className="h-4 w-4" />
                          <span className="invisible group-hover:visible absolute right-full top-1/2 -translate-y-1/2 mr-2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white shadow-lg z-10">
                            {d.status === 'PAGA' ? 'Despesa paga — bloqueada para edição' : 'Despesa cancelada — bloqueada para edição'}
                          </span>
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editando ? 'Editar despesa' : 'Nova despesa'}>
        <DespesaForm
          despesa={editando}
          unidades={unidades}
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['despesas'] })
            setShowForm(false)
            showNotification('success', editando ? 'Despesa atualizada' : 'Despesa criada')
          }}
        />
      </Modal>

      <Modal isOpen={showCategorias} onClose={() => setShowCategorias(false)} title="Categorias de despesa">
        <CategoriasManager onClose={() => setShowCategorias(false)} />
      </Modal>

      <ConfirmDialog
        isOpen={confirmDelete.open}
        title="Excluir despesa"
        message="Confirma a exclusão? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        variant="danger"
        onConfirm={() => confirmDelete.id && deleteMutation.mutate(confirmDelete.id)}
        onCancel={() => setConfirmDelete({ open: false, id: null })}
      />
    </div>
  )
}

function ResumoCard({ titulo, valor, cor, icon }: { titulo: string; valor: string; cor: string; icon?: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wide text-slate-500">{titulo}</div>
        {icon && <div className={cor}>{icon}</div>}
      </div>
      <div className={`text-xl font-bold mt-1 ${cor}`}>{valor}</div>
    </div>
  )
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider ${className}`}>
      {children}
    </th>
  )
}

// --- Form ---
function DespesaForm({
  despesa,
  unidades,
  onClose,
  onSuccess,
}: {
  despesa: Despesa | null
  unidades: any[]
  onClose: () => void
  onSuccess: () => void
}) {
  const { showNotification } = useNotification()
  const { data: categorias = [] } = useQuery({
    queryKey: ['categorias-despesa'],
    queryFn: categoriaDespesaService.listar,
  })

  const [form, setForm] = useState<Despesa>(() => despesa ?? {
    nome: '',
    valor: 0,
    dataCompetencia: new Date().toISOString().slice(0, 10),
    dataVencimento: new Date().toISOString().slice(0, 10),
    categoriaId: 0,
    unidadeId: unidades[0]?.id ?? 0,
    status: 'RASCUNHO',
    recorrencia: 'NENHUMA',
    reembolsavel: false,
  })

  // #143: tipo de lançamento (Regular / Fixa Mensal / Parcelada).
  // Só aparece quando estamos CRIANDO (não na edição de despesa existente).
  type TipoLancamento = 'REGULAR' | 'FIXA_MENSAL' | 'PARCELADA'
  const [tipoLancamento, setTipoLancamento] = useState<TipoLancamento>('REGULAR')
  const [dataFimRec, setDataFimRec] = useState<string>('')
  const [modoPagamentoRec, setModoPagamentoRec] = useState<'PRIMEIRA' | 'NENHUMA'>('NENHUMA')
  const [numeroParcelas, setNumeroParcelas] = useState<number>(2)
  const isCriando = !despesa?.id

  const saveMutation = useMutation({
    mutationFn: (data: Despesa) =>
      despesa?.id ? despesaService.atualizar(despesa.id, data) : despesaService.criar(data),
    onSuccess,
    onError: (e) => showNotification('error', getApiErrorMessage(e, 'Erro ao salvar despesa')),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nome.trim()) return showNotification('error', 'Nome obrigatório')
    if (!form.valor || form.valor <= 0) return showNotification('error', 'Valor deve ser maior que zero')
    if (!form.categoriaId) return showNotification('error', 'Selecione uma categoria')
    if (!form.unidadeId) return showNotification('error', 'Selecione uma unidade')

    // #143: anexa campos do tipo escolhido só na criação
    const payload: Despesa = { ...form }
    if (isCriando) {
      if (tipoLancamento === 'FIXA_MENSAL') {
        payload.recorrencia = 'MENSAL'
        payload.dataInicioRecorrencia = form.dataVencimento
        if (dataFimRec) payload.dataFimRecorrencia = dataFimRec
        payload.modoPagamentoRecorrencia = modoPagamentoRec
      } else if (tipoLancamento === 'PARCELADA') {
        if (numeroParcelas < 2) return showNotification('error', 'Mínimo de 2 parcelas')
        if (numeroParcelas > 60) return showNotification('error', 'Máximo de 60 parcelas')
        payload.numeroParcelas = numeroParcelas
        payload.recorrencia = 'NENHUMA'
      } else {
        payload.recorrencia = 'NENHUMA'
      }
    }
    saveMutation.mutate(payload)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* #143: tipo de lançamento (só na criação) */}
      {isCriando && (
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1.5">Tipo de lançamento</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {([
              { v: 'REGULAR', label: 'Regular', desc: 'Único lançamento' },
              { v: 'FIXA_MENSAL', label: 'Fixa Mensal', desc: 'Recorrente todo mês' },
              { v: 'PARCELADA', label: 'Parcelada', desc: 'Dividir em N parcelas' },
            ] as { v: TipoLancamento; label: string; desc: string }[]).map((opt) => (
              <button
                key={opt.v}
                type="button"
                onClick={() => setTipoLancamento(opt.v)}
                className={`p-3 rounded-xl border text-left transition ${
                  tipoLancamento === opt.v
                    ? 'border-violet-500 bg-violet-50 ring-2 ring-violet-100'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="text-sm font-semibold text-slate-900">{opt.label}</div>
                <div className="text-xs text-slate-500">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <FormField label="Nome" required>
        <input required type="text" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })}
          className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition" />
      </FormField>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Valor" required>
          <MoneyInput required value={form.valor}
            onChange={(v) => setForm({ ...form, valor: v })}
            className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition" />
        </FormField>
        <FormField label="Fornecedor">
          <input type="text" value={form.fornecedor ?? ''} onChange={(e) => setForm({ ...form, fornecedor: e.target.value })}
            className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition" />
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Data competência" required>
          <input required type="date" value={form.dataCompetencia}
            min="2000-01-01" max="2099-12-31"
            onChange={(e) => setForm({ ...form, dataCompetencia: e.target.value })}
            className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition" />
        </FormField>
        <FormField label={tipoLancamento === 'FIXA_MENSAL' ? 'Início (1º vencimento)' : 'Data vencimento'} required>
          <input required type="date" value={form.dataVencimento}
            min="2000-01-01" max="2099-12-31"
            onChange={(e) => setForm({ ...form, dataVencimento: e.target.value })}
            className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition" />
        </FormField>
      </div>

      {/* #143: campos extras por tipo */}
      {isCriando && tipoLancamento === 'FIXA_MENSAL' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-violet-50/50 rounded-xl border border-violet-100">
          <FormField label="Fim (opcional, default 12 meses)">
            <input type="date" value={dataFimRec} onChange={(e) => setDataFimRec(e.target.value)}
              className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition" />
          </FormField>
          <FormField label="Marcar como pago">
            <select value={modoPagamentoRec} onChange={(e) => setModoPagamentoRec(e.target.value as 'PRIMEIRA' | 'NENHUMA')}
              className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition">
              <option value="NENHUMA">Nenhuma (todas em RASCUNHO)</option>
              <option value="PRIMEIRA">Apenas a primeira</option>
            </select>
          </FormField>
        </div>
      )}
      {isCriando && tipoLancamento === 'PARCELADA' && (
        <div className="p-3 bg-violet-50/50 rounded-xl border border-violet-100">
          <FormField label="Quantidade de parcelas (2 a 60)" required>
            <input required type="number" min={2} max={60} value={numeroParcelas}
              onChange={(e) => setNumeroParcelas(Math.max(2, Math.min(60, Number(e.target.value) || 2)))}
              className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition" />
          </FormField>
          {form.valor > 0 && numeroParcelas > 0 && (
            <p className="text-xs text-slate-500 mt-2">
              Cada parcela: <b className="text-violet-700">R$ {(form.valor / numeroParcelas).toFixed(2).replace('.', ',')}</b>
              {' '}— vencimento mensal a partir de <b>{form.dataVencimento}</b>
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Categoria" required>
          <select required value={form.categoriaId} onChange={(e) => setForm({ ...form, categoriaId: Number(e.target.value) })}
            className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition">
            <option value={0}>Selecione</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Unidade" required>
          <select required value={form.unidadeId} onChange={(e) => setForm({ ...form, unidadeId: Number(e.target.value) })}
            className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition">
            <option value={0}>Selecione</option>
            {unidades.map((u) => (
              <option key={u.id} value={u.id}>{u.nome}</option>
            ))}
          </select>
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Status">
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as StatusDespesa })}
            className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition">
            <option value="RASCUNHO">Rascunho</option>
            <option value="APROVADA">Aprovada</option>
            <option value="PAGA">Paga</option>
            <option value="CANCELADA">Cancelada</option>
          </select>
        </FormField>
        <FormField label="Recorrência">
          <select value={form.recorrencia} onChange={(e) => setForm({ ...form, recorrencia: e.target.value as RecorrenciaDespesa })}
            className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition">
            <option value="NENHUMA">Não recorrente</option>
            <option value="MENSAL">Mensal</option>
            <option value="TRIMESTRAL">Trimestral</option>
            <option value="ANUAL">Anual</option>
          </select>
        </FormField>
      </div>

      <FormField label="Forma de pagamento">
        <select value={form.formaPagamento ?? ''} onChange={(e) => setForm({ ...form, formaPagamento: e.target.value || undefined })}
          className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition">
          <option value="">—</option>
          <option value="DINHEIRO">Dinheiro</option>
          <option value="PIX">PIX</option>
          <option value="CARTAO_CREDITO">Cartão crédito</option>
          <option value="CARTAO_DEBITO">Cartão débito</option>
          <option value="BOLETO">Boleto</option>
          <option value="TRANSFERENCIA">Transferência</option>
        </select>
      </FormField>

      <FormField label="Descrição">
        <textarea rows={2} value={form.descricao ?? ''} onChange={(e) => setForm({ ...form, descricao: e.target.value })}
          className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition" />
      </FormField>

      <FormField label="Centro de custo">
        <input type="text" value={form.centroCusto ?? ''} onChange={(e) => setForm({ ...form, centroCusto: e.target.value })}
          className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition" />
      </FormField>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={!!form.reembolsavel}
          onChange={(e) => setForm({ ...form, reembolsavel: e.target.checked })}
          className="rounded border-gray-300 text-violet-600 focus:ring-violet-500" />
        Reembolsável
      </label>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button variant="secondary" type="button" onClick={onClose}>Cancelar</Button>
        <Button type="submit" isLoading={saveMutation.isPending}>Salvar</Button>
      </div>
    </form>
  )
}

// --- Categorias modal ---
function CategoriasManager({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const { showNotification } = useNotification()
  const { data: categorias = [], isLoading } = useQuery({
    queryKey: ['categorias-despesa'],
    queryFn: categoriaDespesaService.listar,
  })
  const [novaCategoria, setNovaCategoria] = useState({ nome: '', cor: '#7C3AED' })

  const criarMutation = useMutation({
    mutationFn: (cat: CategoriaDespesa) => categoriaDespesaService.criar(cat),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias-despesa'] })
      setNovaCategoria({ nome: '', cor: '#7C3AED' })
      showNotification('success', 'Categoria criada')
    },
    onError: (e) => showNotification('error', getApiErrorMessage(e, 'Erro ao criar categoria')),
  })

  const inativarMutation = useMutation({
    mutationFn: (id: number) => categoriaDespesaService.inativar(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias-despesa'] })
      showNotification('success', 'Categoria removida')
    },
    onError: (e) => showNotification('error', getApiErrorMessage(e, 'Erro ao remover')),
  })

  return (
    <div className="space-y-4">
      <form onSubmit={(e) => { e.preventDefault(); if (novaCategoria.nome.trim()) criarMutation.mutate(novaCategoria) }}
        className="flex gap-2 items-end">
        <FormField label="Nova categoria">
          <input required type="text" value={novaCategoria.nome}
            onChange={(e) => setNovaCategoria({ ...novaCategoria, nome: e.target.value })}
            className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition" />
        </FormField>
        <FormField label="Cor">
          <input type="color" value={novaCategoria.cor}
            onChange={(e) => setNovaCategoria({ ...novaCategoria, cor: e.target.value })}
            className="mt-1 block h-9 w-12 rounded border-gray-300" />
        </FormField>
        <Button type="submit" isLoading={criarMutation.isPending}>Adicionar</Button>
      </form>

      <div className="max-h-64 overflow-y-auto border rounded">
        {isLoading ? (
          <div className="p-4 text-center text-sm text-slate-500">Carregando...</div>
        ) : (
          <ul className="divide-y">
            {categorias.map((c) => (
              <li key={c.id} className="flex items-center justify-between p-2">
                <div className="flex items-center gap-2">
                  {c.cor && <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: c.cor }} />}
                  <span className="text-sm">{c.nome}</span>
                  {c.padrao && <span className="text-xs text-gray-400">(padrão)</span>}
                </div>
                {!c.padrao && c.id && (
                  <button onClick={() => inativarMutation.mutate(c.id!)}
                    className="text-red-600 hover:text-red-800 p-1" title="Remover">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex justify-end pt-4 border-t">
        <Button variant="secondary" onClick={onClose}>Fechar</Button>
      </div>
    </div>
  )
}
