import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
    Users,
    Calendar,
    DollarSign,
    TrendingUp,
    Clock,
    CheckCircle2,
    XCircle,
    Bell,
    AlertCircle,
    Sparkles,
    UserX,
    Copy,
    ClipboardCheck,
} from 'lucide-react'
import { agendamentoService } from '../services/agendamentoService'
import { clienteService } from '../services/clienteService'
import { reclamacaoService } from '../services/reclamacaoService'
import { authService } from '../services/authService'
import { inteligenciaService } from '../services/inteligenciaService'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function Dashboard() {
    const usuario = authService.getUsuario()
    const perfilNorm = (usuario?.perfil ?? '').toUpperCase().replace('-', '_')
    const isAdmin = perfilNorm === 'ADMIN' || perfilNorm === 'ADMINISTRADOR'
    const isGerente = usuario?.perfil === 'GERENTE'
    const podeVerReclamacoes = isAdmin || isGerente
    const unidadeId = usuario?.unidadeId

    const { data: agendamentos = [], isLoading: isLoadingAgendamentos } = useQuery({
        queryKey: ['agendamentos'],
        queryFn: agendamentoService.listar,
    })

    const { data: clientes = [], isLoading: isLoadingClientes } = useQuery({
        queryKey: ['clientes'],
        queryFn: clienteService.listar,
    })

    const { data: contadorReclamacoes = 0 } = useQuery({
        queryKey: ['reclamacoes', 'contador', isAdmin ? 'todas' : 'unidade', unidadeId],
        queryFn: () => {
            if (isAdmin) {
                return reclamacaoService.contarNaoLidas()
            } else if (isGerente && unidadeId) {
                return reclamacaoService.contarNaoLidasPorUnidade(unidadeId)
            }
            return Promise.resolve(0)
        },
        enabled: podeVerReclamacoes,
        refetchInterval: 30000,
    })

    const { data: insightsSemanal = [] } = useQuery({
        queryKey: ['insights-semanais', unidadeId],
        queryFn: () => inteligenciaService.insightsSemanal(unidadeId ?? undefined),
        enabled: !authService.isPerfilCliente(),
        staleTime: 30 * 60 * 1000,
    })

    const { data: clientesRisco = [] } = useQuery({
        queryKey: ['clientes-risco', unidadeId],
        queryFn: () => inteligenciaService.clientesEmRisco(unidadeId ?? undefined),
        enabled: !authService.isPerfilCliente(),
        staleTime: 10 * 60 * 1000,
    })

    const { data: churnProfissional = [] } = useQuery({
        queryKey: ['churn-profissional', unidadeId],
        queryFn: () => inteligenciaService.churnPorProfissional(unidadeId ?? undefined),
        enabled: !authService.isPerfilCliente(),
        staleTime: 10 * 60 * 1000,
    })

    // Cálculos Básicos
    const hoje = new Date().toISOString().split('T')[0]
    const totalAgendamentos = agendamentos.length

    const agendamentosHojeList = agendamentos
        .filter(a => a.dataHoraInicio?.startsWith(hoje))
        .sort((a, b) => new Date(a.dataHoraInicio).getTime() - new Date(b.dataHoraInicio).getTime())

    const agendamentosHoje = agendamentosHojeList.length
    const agendamentosFinalizados = agendamentos.filter(a => a.status === 'FINALIZADO' || a.status === 'CONCLUIDO').length
    const agendamentosCancelados = agendamentos.filter(a => a.status === 'CANCELADO').length
    const agendamentosHojeConcluidos = agendamentosHojeList.filter(a => a.status === 'FINALIZADO' || a.status === 'CONCLUIDO').length

    const faturamentoTotal = agendamentos
        .filter(a => a.status === 'FINALIZADO' || a.status === 'CONCLUIDO')
        .reduce((acc, curr) => acc + (curr.valorFinal || curr.valorTotal || 0), 0)

    const faturamentoHoje = agendamentosHojeList
        .filter(a => a.status === 'FINALIZADO' || a.status === 'CONCLUIDO')
        .reduce((acc, curr) => acc + (curr.valorFinal || curr.valorTotal || 0), 0)

    const ticketMedio = agendamentosFinalizados > 0 ? faturamentoTotal / agendamentosFinalizados : 0

    const proximoAgendamento = agendamentosHojeList.find(a =>
        (a.status === 'AGENDADO' || a.status === 'CONFIRMADO') &&
        new Date(a.dataHoraInicio) > new Date()
    )

    const moneyFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

    if (isLoadingAgendamentos || isLoadingClientes) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        )
    }

    const kpiCards = [
        {
            title: 'Agendamentos Hoje',
            value: agendamentosHoje,
            sub: `${agendamentosHojeConcluidos} concluído${agendamentosHojeConcluidos !== 1 ? 's' : ''}`,
            icon: Calendar,
            bgColor: 'bg-violet-50',
            textColor: 'text-violet-600'
        },
        {
            title: 'Total de Clientes',
            value: clientes.length,
            sub: 'cadastrados',
            icon: Users,
            bgColor: 'bg-blue-50',
            textColor: 'text-blue-600'
        },
        {
            title: 'Faturamento Geral',
            value: moneyFmt.format(faturamentoTotal),
            sub: `Hoje: ${moneyFmt.format(faturamentoHoje)}`,
            icon: DollarSign,
            bgColor: 'bg-green-50',
            textColor: 'text-green-600'
        },
        {
            title: 'Ticket Médio',
            value: moneyFmt.format(ticketMedio),
            sub: `${agendamentosFinalizados} concluídos`,
            icon: TrendingUp,
            bgColor: 'bg-amber-50',
            textColor: 'text-amber-600'
        }
    ]

    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-sm text-gray-500">Visão geral do negócio</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {kpiCards.map((card, index) => (
                    <div key={index} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-4">
                            <div className={`${card.bgColor} p-3 rounded-lg`}>
                                <card.icon className={`h-6 w-6 ${card.textColor}`} />
                            </div>
                        </div>
                        <h3 className="text-gray-500 text-sm font-medium">{card.title}</h3>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
                        {card.sub && <p className="text-xs text-gray-400 mt-0.5">{card.sub}</p>}
                    </div>
                ))}
                
                {/* Card de Reclamações (apenas para ADMIN e GERENTE) */}
                {podeVerReclamacoes && (
                    <Link
                        to="/notificacoes"
                        className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow cursor-pointer"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className={`p-3 rounded-lg ${contadorReclamacoes > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
                                <Bell className={`h-6 w-6 ${contadorReclamacoes > 0 ? 'text-red-600' : 'text-gray-600'}`} />
                            </div>
                            {contadorReclamacoes > 0 && (
                                <span className="bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">
                                    {contadorReclamacoes > 99 ? '99+' : contadorReclamacoes}
                                </span>
                            )}
                        </div>
                        <h3 className="text-gray-500 text-sm font-medium">Reclamações</h3>
                        <div className="flex items-center gap-2 mt-1">
                            <p className="text-2xl font-bold text-gray-900">
                                {contadorReclamacoes > 0 ? contadorReclamacoes : 'Nenhuma'}
                            </p>
                            {contadorReclamacoes > 0 && (
                                <AlertCircle className="h-5 w-5 text-red-500" />
                            )}
                        </div>
                        {contadorReclamacoes > 0 && (
                            <p className="text-xs text-red-600 mt-2 font-medium">Clique para ver detalhes</p>
                        )}
                    </Link>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Status Distribution */}
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">Status dos Agendamentos</h2>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                                <span className="text-sm font-medium text-gray-700">Finalizados</span>
                            </div>
                                <span className="font-bold text-gray-900">{agendamentosFinalizados}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                                <Clock className="h-5 w-5 text-blue-500" />
                                <span className="text-sm font-medium text-gray-700">Agendados/Pendentes</span>
                            </div>
                            <span className="font-bold text-gray-900">{totalAgendamentos - agendamentosFinalizados - agendamentosCancelados}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                                <XCircle className="h-5 w-5 text-red-500" />
                                <span className="text-sm font-medium text-gray-700">Cancelados</span>
                            </div>
                            <span className="font-bold text-gray-900">{agendamentosCancelados}</span>
                        </div>
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">Atividade Recente</h2>
                    <div className="space-y-6">
                        {agendamentos.slice(0, 5).map((agendamento) => (
                            <div key={agendamento.id} className="flex items-start gap-4">
                                <div className="h-2 w-2 mt-2 rounded-full bg-indigo-500 shrink-0" />
                                <div>
                                    <p className="text-sm font-medium text-gray-900">
                                        {agendamento.cliente?.nome} - {agendamento.servicos?.[0]?.descricao || 'Serviço'}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {new Date(agendamento.dataHoraInicio).toLocaleDateString('pt-BR')} às {new Date(agendamento.dataHoraInicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                        ))}
                        {agendamentos.length === 0 && (
                            <p className="text-sm text-gray-500">Nenhuma atividade recente.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Agenda de Hoje */}
            {!authService.isPerfilCliente() && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-violet-500" />
                            Agenda de Hoje
                            <span className="ml-2 text-sm font-normal text-gray-500">
                                {format(new Date(), "dd 'de' MMMM", { locale: ptBR })}
                            </span>
                        </h2>
                        <div className="flex gap-4 text-sm">
                            <span className="text-gray-500">{agendamentosHoje} agendamento{agendamentosHoje !== 1 ? 's' : ''}</span>
                            {agendamentosHojeConcluidos > 0 && (
                                <span className="text-violet-600 font-semibold">{moneyFmt.format(faturamentoHoje)}</span>
                            )}
                        </div>
                    </div>

                    {proximoAgendamento && (
                        <div className="mb-4 p-3 rounded-xl bg-violet-50 border border-violet-100 flex items-center gap-3">
                            <Clock className="h-5 w-5 text-violet-500 shrink-0" />
                            <div>
                                <p className="text-xs font-semibold text-violet-600">Próximo</p>
                                <p className="text-sm font-medium text-gray-900">
                                    {format(new Date(proximoAgendamento.dataHoraInicio), 'HH:mm')} · {proximoAgendamento.cliente?.nome} — {proximoAgendamento.servicos?.[0]?.descricao || 'Serviço'}
                                </p>
                            </div>
                        </div>
                    )}

                    {agendamentosHojeList.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-6">Nenhum agendamento para hoje.</p>
                    ) : (
                        <div className="relative">
                            <div className="absolute left-[23px] top-0 bottom-0 w-px bg-gray-200" />
                            <div className="space-y-3">
                                {agendamentosHojeList.map(a => {
                                    const statusColors: Record<string, string> = {
                                        AGENDADO: 'bg-slate-800',
                                        CONFIRMADO: 'bg-blue-500',
                                        EM_ANDAMENTO: 'bg-violet-500',
                                        PROCEDIMENTO_FIM: 'bg-violet-700',
                                        CONCLUIDO: 'bg-green-500',
                                        FINALIZADO: 'bg-green-500',
                                        CANCELADO: 'bg-red-400',
                                        NO_SHOW: 'bg-orange-400',
                                    }
                                    const dot = statusColors[a.status] ?? 'bg-gray-400'
                                    return (
                                        <div key={a.id} className="flex items-start gap-4 pl-1">
                                            <div className={`mt-1.5 h-3 w-3 rounded-full shrink-0 ${dot} ring-2 ring-white z-10`} />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-baseline justify-between gap-2">
                                                    <p className="text-sm font-semibold text-gray-800 truncate">
                                                        {format(new Date(a.dataHoraInicio), 'HH:mm')} · {a.cliente?.nome || '—'}
                                                    </p>
                                                    <span className="text-xs text-gray-400 shrink-0">
                                                        {a.atendente?.nomeUsuario || a.atendente?.nome || ''}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-500 truncate">
                                                    {a.servicos?.[0]?.descricao || a.servicos?.[0]?.servico?.nome || 'Serviço'}
                                                    {a.valorTotal ? ` · ${moneyFmt.format(a.valorTotal)}` : ''}
                                                </p>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* IA Panels — apenas para não-clientes */}
            {!authService.isPerfilCliente() && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* IA-2: Insights Semanais */}
                    <div className="bg-gradient-to-br from-violet-50 to-white rounded-xl shadow-sm p-6 border border-violet-100">
                        <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-violet-500" /> Insight Semanal
                        </h2>
                        {insightsSemanal.length > 0 ? (
                            <div className="space-y-3">
                                {insightsSemanal.slice(0, 2).map(insight => (
                                    <div key={insight.id} className="rounded-lg bg-white border border-violet-100 p-3">
                                        <p className="text-xs text-violet-500 font-medium mb-1">
                                            Semana de {format(new Date(insight.semana), "dd 'de' MMMM", { locale: ptBR })}
                                        </p>
                                        <p className="text-sm text-gray-700 leading-snug">{insight.texto}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-400">Os insights são gerados toda segunda-feira.</p>
                        )}
                    </div>

                    {/* IA-3: Clientes em Risco */}
                    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                        <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
                            <UserX className="h-4 w-4 text-amber-500" /> Clientes em Risco
                            {clientesRisco.length > 0 && (
                                <span className="ml-auto text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">
                                    {clientesRisco.length}
                                </span>
                            )}
                        </h2>
                        {clientesRisco.length > 0 ? (
                            <div className="space-y-2">
                                {clientesRisco.slice(0, 4).map(c => (
                                    <ClienteRiscoItem key={c.clienteId} cliente={c} />
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-400">Nenhum cliente ausente há mais de 30 dias. 🎉</p>
                        )}
                    </div>

                    {/* IA-7: Churn por Profissional */}
                    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                        <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-rose-500" /> Alerta de Churn
                            {churnProfissional.length > 0 && (
                                <span className="ml-auto text-xs bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-semibold">
                                    {churnProfissional.length}
                                </span>
                            )}
                        </h2>
                        {churnProfissional.length > 0 ? (
                            <div className="space-y-2">
                                {churnProfissional.slice(0, 4).map(p => (
                                    <div key={p.atendenteId} className="flex items-center justify-between p-2 rounded-lg bg-rose-50">
                                        <span className="text-sm font-medium text-gray-800 truncate max-w-[60%]">{p.atendenteNome}</span>
                                        <span className="text-xs font-bold text-rose-600">{p.taxaChurn.toFixed(0)}% churn</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-400">Nenhuma perda significativa de clientes por profissional.</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

function ClienteRiscoItem({ cliente }: { cliente: { clienteId: number; clienteNome: string; diasAusente: number; mensagemSugerida: string } }) {
    const [copiado, setCopiado] = useState(false)
    const [expandido, setExpandido] = useState(false)

    const copiar = () => {
        navigator.clipboard.writeText(cliente.mensagemSugerida)
        setCopiado(true)
        setTimeout(() => setCopiado(false), 2000)
    }

    return (
        <div className="rounded-lg border border-amber-100 bg-amber-50 p-2.5">
            <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-800 truncate">{cliente.clienteNome}</span>
                <span className="text-xs text-amber-600 font-medium shrink-0 ml-1">{cliente.diasAusente}d ausente</span>
            </div>
            {cliente.mensagemSugerida && (
                <div className="mt-1.5 flex items-center gap-2">
                    <button
                        onClick={() => setExpandido(!expandido)}
                        className="text-[10px] text-amber-700 hover:underline"
                    >
                        {expandido ? 'Ocultar' : 'Ver'} mensagem IA
                    </button>
                    {expandido && (
                        <button onClick={copiar} className="text-amber-600 hover:text-amber-800">
                            {copiado ? <ClipboardCheck className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                    )}
                </div>
            )}
            {expandido && cliente.mensagemSugerida && (
                <p className="text-xs text-gray-600 mt-1 leading-snug">{cliente.mensagemSugerida}</p>
            )}
        </div>
    )
}
