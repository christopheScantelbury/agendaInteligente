import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Briefcase, Plus, Clock, Loader2, AlertCircle, Check, ExternalLink } from 'lucide-react'
import { servicoService, Servico } from '../../services/servicoService'
import { unidadeService } from '../../services/unidadeService'
import { useNotification } from '../../contexts/NotificationContext'
import ConfigPageHeader from '../../components/configuracoes/ConfigPageHeader'
import ProximaEtapaCard from '../../components/configuracoes/ProximaEtapaCard'
import MoneyInput from '../../components/forms/MoneyInput'
import IntegerInput from '../../components/forms/IntegerInput'

const moneyFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

interface FormState {
  nome: string
  duracao: number | undefined
  valor: string
  unidadeId: number | null
}

export default function ServicosConfig() {
  const navigate = useNavigate()
  const { showNotification } = useNotification()
  const queryClient = useQueryClient()

  const { data: servicos = [], isLoading } = useQuery({
    queryKey: ['configuracoes', 'servicos'],
    queryFn: () => servicoService.listar(),
  })

  const { data: unidades = [] } = useQuery({
    queryKey: ['configuracoes', 'unidades'],
    queryFn: () => unidadeService.listar(),
  })

  const [form, setForm] = useState<FormState>({
    nome: '',
    duracao: 30,
    valor: '',
    unidadeId: null,
  })
  const [erros, setErros] = useState<string[]>([])
  const [salvou, setSalvou] = useState(false)

  // Auto-seleciona unidade quando só tem 1
  useEffect(() => {
    if (unidades.length === 1 && !form.unidadeId) {
      setForm((f) => ({ ...f, unidadeId: unidades[0].id ?? null }))
    }
  }, [unidades, form.unidadeId])

  const valorNumber = useMemo(() => {
    const limpo = form.valor.replace(/[^\d,.-]/g, '').replace(',', '.')
    const n = parseFloat(limpo)
    return Number.isFinite(n) ? n : null
  }, [form.valor])

  const duracaoNumber = useMemo(() => {
    const n = form.duracao
    return n != null && n > 0 ? n : null
  }, [form.duracao])

  const criarMutation = useMutation({
    mutationFn: (s: Servico) => servicoService.criar(s),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configuracoes', 'servicos'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'gerente', 'checklist'] })
      setForm((f) => ({ ...f, nome: '', valor: '' }))
      setErros([])
      setSalvou(true)
      showNotification('success', 'Serviço criado!')
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Não foi possível criar o serviço.'
      showNotification('error', msg)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const novosErros: string[] = []
    if (!form.nome.trim()) novosErros.push('Informe o nome do serviço.')
    if (!duracaoNumber) novosErros.push('Informe uma duração válida em minutos.')
    if (valorNumber === null || valorNumber < 0) novosErros.push('Informe um valor válido.')
    if (!form.unidadeId) novosErros.push('Selecione a unidade.')
    if (novosErros.length) {
      setErros(novosErros)
      return
    }
    criarMutation.mutate({
      id: 0,
      nome: form.nome.trim(),
      duracaoMinutos: duracaoNumber!,
      valor: valorNumber!,
      unidadeId: form.unidadeId!,
      ativo: true,
    } as Servico)
  }

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
      <ConfigPageHeader />
      <header>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Briefcase className="h-6 w-6 text-violet-600" />
          Serviços
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Cadastre os serviços que sua empresa oferece. Eles aparecerão na tela de agendamento.
        </p>
      </header>

      {/* Formulário rápido */}
      <section className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6">
        <h2 className="text-base font-semibold text-slate-900 mb-3 flex items-center gap-1.5">
          <Plus className="h-4 w-4 text-violet-600" /> Cadastrar serviço
        </h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="nome" className="block text-xs font-medium text-slate-700 mb-1.5">
              Nome do serviço
            </label>
            <input
              id="nome"
              type="text"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Ex.: Corte feminino, Massagem relaxante, Limpeza de pele"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              maxLength={100}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="duracao" className="block text-xs font-medium text-slate-700 mb-1.5">
                Duração (min)
              </label>
              <IntegerInput
                id="duracao"
                min={5}
                value={form.duracao}
                onChange={(v) => setForm({ ...form, duracao: v })}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              />
            </div>
            <div>
              <label htmlFor="valor" className="block text-xs font-medium text-slate-700 mb-1.5">
                Valor
              </label>
              <MoneyInput
                id="valor"
                value={valorNumber}
                onChange={(v) => setForm({ ...form, valor: v > 0 ? String(v) : '' })}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              />
            </div>
          </div>

          {unidades.length > 1 && (
            <div>
              <label htmlFor="unidade" className="block text-xs font-medium text-slate-700 mb-1.5">
                Unidade
              </label>
              <select
                id="unidade"
                value={form.unidadeId ?? ''}
                onChange={(e) => setForm({ ...form, unidadeId: Number(e.target.value) || null })}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              >
                <option value="">Selecione…</option>
                {unidades.map((u: any) => (
                  <option key={u.id} value={u.id}>
                    {u.nome}
                  </option>
                ))}
              </select>
            </div>
          )}

          {erros.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
              <ul className="text-xs text-red-700 space-y-0.5">
                {erros.map((e) => (
                  <li key={e}>• {e}</li>
                ))}
              </ul>
            </div>
          )}

          <button
            type="submit"
            disabled={criarMutation.isPending}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-semibold transition shadow-sm"
          >
            {criarMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            <Check className="h-4 w-4" />
            Cadastrar serviço
          </button>
        </form>
      </section>

      {/* Lista de serviços */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-slate-700">
            Serviços cadastrados {servicos.length > 0 && <span className="text-slate-400">· {servicos.length}</span>}
          </h2>
          <button
            type="button"
            onClick={() => navigate('/servicos')}
            className="text-xs font-medium text-violet-700 hover:text-violet-900 inline-flex items-center gap-1"
          >
            Gerenciar todos <ExternalLink className="h-3 w-3" />
          </button>
        </div>

        {isLoading ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 flex items-center gap-2 text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
          </div>
        ) : servicos.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-8 text-center">
            <Briefcase className="h-10 w-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">Nenhum serviço cadastrado ainda.</p>
          </div>
        ) : (
          <ul className="bg-white border border-gray-200 rounded-2xl divide-y divide-gray-100 overflow-hidden">
            {servicos.slice(0, 10).map((s) => (
              <li key={s.id} className="px-4 py-3 flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center flex-shrink-0">
                  <Briefcase className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{s.nome}</p>
                  <p className="text-xs text-slate-500 flex items-center gap-2">
                    <span className="inline-flex items-center gap-0.5">
                      <Clock className="h-3 w-3" /> {s.duracaoMinutos} min
                    </span>
                    <span>·</span>
                    <span className="font-medium text-emerald-700">{moneyFmt.format(s.valor ?? 0)}</span>
                  </p>
                </div>
              </li>
            ))}
            {servicos.length > 10 && (
              <li className="px-4 py-3 text-center text-xs text-slate-500">
                + {servicos.length - 10} outros serviços. Veja todos em{' '}
                <button
                  onClick={() => navigate('/servicos')}
                  className="text-violet-700 font-medium hover:underline"
                >
                  Gerenciar serviços
                </button>
              </li>
            )}
          </ul>
        )}
      </section>

      {salvou && <ProximaEtapaCard tarefaAtualId="servico" />}
    </div>
  )
}
