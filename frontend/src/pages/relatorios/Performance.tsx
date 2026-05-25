import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { DollarSign, TrendingDown, TrendingUp, Calendar, Users, Clock, Briefcase } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { relatorioService } from '../../services/relatorioService'
import { atendenteService } from '../../services/atendenteService'
import { authService } from '../../services/authService'
import FormField from '../../components/FormField'

const formatMoeda = (v: number) =>
  (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function periodoPreset(preset: string): { inicio: string; fim: string } | null {
  const hoje = new Date()
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  switch (preset) {
    case 'HOJE':
      return { inicio: fmt(hoje), fim: fmt(hoje) }
    case 'SEMANA': {
      const dia = hoje.getDay()
      const inicio = new Date(hoje); inicio.setDate(hoje.getDate() - dia)
      const fim = new Date(inicio); fim.setDate(inicio.getDate() + 6)
      return { inicio: fmt(inicio), fim: fmt(fim) }
    }
    case 'MES': {
      const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
      const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
      return { inicio: fmt(inicio), fim: fmt(fim) }
    }
    case 'MES_PASSADO': {
      const inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)
      const fim = new Date(hoje.getFullYear(), hoje.getMonth(), 0)
      return { inicio: fmt(inicio), fim: fmt(fim) }
    }
    default:
      return null
  }
}

export default function Performance() {
  const navigate = useNavigate()
  const usuario = authService.getUsuario()
  const perfil = (usuario?.perfil ?? '').toUpperCase()
  if (perfil !== 'ADMIN' && perfil !== 'ADMINISTRADOR' && perfil !== 'GERENTE') {
    setTimeout(() => navigate('/'), 0)
    return <div className="p-8 text-center text-sm text-gray-500">Acesso negado.</div>
  }

  const [aba, setAba] = useState<'EMPRESA' | 'PROFISSIONAL'>('EMPRESA')
  const [preset, setPreset] = useState('MES')
  const mesAtual = periodoPreset('MES')!
  const [inicio, setInicio] = useState(mesAtual.inicio)
  const [fim, setFim] = useState(mesAtual.fim)
  const [atendenteId, setAtendenteId] = useState<number | undefined>()

  const { data: atendentes = [] } = useQuery({
    queryKey: ['atendentes', 'ativos'],
    queryFn: atendenteService.listar,
    enabled: aba === 'PROFISSIONAL',
  })

  const { data: perf, isLoading } = useQuery({
    queryKey: ['relatorio-performance', inicio, fim, aba === 'PROFISSIONAL' ? atendenteId : null],
    queryFn: () => relatorioService.performance(inicio, fim, aba === 'PROFISSIONAL' ? atendenteId : undefined),
    enabled: aba === 'EMPRESA' || (aba === 'PROFISSIONAL' && !!atendenteId),
  })

  const handlePreset = (p: string) => {
    setPreset(p)
    if (p === 'PERSONALIZADO') return
    const r = periodoPreset(p)
    if (r) { setInicio(r.inicio); setFim(r.fim) }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Performance</h1>
          <p className="text-sm text-gray-500">Indicadores de resultado e esforço</p>
        </div>
        <div className="flex gap-2 text-sm">
          <Link to="/relatorios" className="text-violet-600 hover:text-violet-800">← Relatórios</Link>
          <Link to="/relatorios/financeiro" className="text-violet-600 hover:text-violet-800">Resumo Financeiro</Link>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-4">
          <TabBtn ativo={aba === 'EMPRESA'} onClick={() => setAba('EMPRESA')}>Empresa</TabBtn>
          <TabBtn ativo={aba === 'PROFISSIONAL'} onClick={() => setAba('PROFISSIONAL')}>Profissionais</TabBtn>
        </nav>
      </div>

      <div className="bg-white rounded-lg shadow p-4 flex flex-wrap gap-3 items-end">
        <FormField label="Período">
          <select value={preset} onChange={(e) => handlePreset(e.target.value)}
            className="mt-1 block rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500">
            <option value="HOJE">Hoje</option>
            <option value="SEMANA">Semana atual</option>
            <option value="MES">Mês atual</option>
            <option value="MES_PASSADO">Mês passado</option>
            <option value="PERSONALIZADO">Personalizado</option>
          </select>
        </FormField>
        <FormField label="Início">
          <input type="date" value={inicio} onChange={(e) => { setInicio(e.target.value); setPreset('PERSONALIZADO') }}
            className="mt-1 block rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500" />
        </FormField>
        <FormField label="Fim">
          <input type="date" value={fim} onChange={(e) => { setFim(e.target.value); setPreset('PERSONALIZADO') }}
            className="mt-1 block rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500" />
        </FormField>
        {aba === 'PROFISSIONAL' && (
          <FormField label="Profissional">
            <select value={atendenteId ?? ''} onChange={(e) => setAtendenteId(e.target.value ? Number(e.target.value) : undefined)}
              className="mt-1 block rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500">
              <option value="">Selecione...</option>
              {atendentes.map((a) => (
                <option key={a.id} value={a.id}>{a.nomeUsuario}</option>
              ))}
            </select>
          </FormField>
        )}
        <div className="ml-auto text-xs text-gray-500">
          {new Date(inicio + 'T00:00:00').toLocaleDateString('pt-BR')} – {new Date(fim + 'T00:00:00').toLocaleDateString('pt-BR')}
        </div>
      </div>

      {aba === 'PROFISSIONAL' && !atendenteId && (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-4 text-sm text-yellow-800">
          Selecione um profissional para visualizar os indicadores.
        </div>
      )}

      {isLoading && <div className="text-center text-sm text-gray-500 py-8">Carregando...</div>}

      {perf && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <BalancoCard titulo="Receita" valor={formatMoeda(perf.receita)} cor="text-green-700" icon={<DollarSign />} />
            <BalancoCard titulo="Despesa" valor={formatMoeda(perf.despesa)} cor="text-red-700" icon={<TrendingDown />} />
            <BalancoCard titulo="Lucro" valor={formatMoeda(perf.lucro)}
              cor={perf.lucro >= 0 ? 'text-violet-700' : 'text-red-700'} icon={<TrendingUp />} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <EsforcoCard titulo="Dias no período" valor={String(perf.diasNoPeriodo)} icon={<Calendar />} />
            <EsforcoCard titulo="Atendimentos" valor={String(perf.atendimentos)} icon={<Briefcase />} />
            <EsforcoCard titulo="Clientes atendidos" valor={String(perf.clientesAtendidos)} icon={<Users />} />
            <EsforcoCard titulo="Horas atendidas" valor={String(perf.horasAtendidas) + 'h'} icon={<Clock />} />
          </div>
        </>
      )}
    </div>
  )
}

function TabBtn({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`pb-2 px-1 text-sm font-medium border-b-2 ${
        ativo ? 'border-violet-600 text-violet-700' : 'border-transparent text-gray-600 hover:text-gray-900'
      }`}>{children}</button>
  )
}

function BalancoCard({ titulo, valor, cor, icon }: { titulo: string; valor: string; cor: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wide text-gray-500">{titulo}</div>
        <div className={cor}>{icon}</div>
      </div>
      <div className={`text-2xl font-bold mt-2 ${cor}`}>{valor}</div>
    </div>
  )
}

function EsforcoCard({ titulo, valor, icon }: { titulo: string; valor: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg shadow p-3">
      <div className="flex items-center gap-2 text-xs uppercase text-gray-500">
        <span className="text-violet-500">{icon}</span> {titulo}
      </div>
      <div className="text-xl font-bold mt-1 text-gray-900">{valor}</div>
    </div>
  )
}
