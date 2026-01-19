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
    AlertCircle
} from 'lucide-react'
import { agendamentoService } from '../services/agendamentoService'
import { clienteService } from '../services/clienteService'
import { reclamacaoService } from '../services/reclamacaoService'
import { authService } from '../services/authService'
import { Link } from 'react-router-dom'

export default function Dashboard() {
    const usuario = authService.getUsuario()
    const isAdmin = usuario?.perfil === 'ADMIN'
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

    // Cálculos Básicos
    const totalAgendamentos = agendamentos.length
    const agendamentosHoje = agendamentos.filter(a => {
        const hoje = new Date().toISOString().split('T')[0]
        return a.dataHoraInicio.startsWith(hoje)
    }).length

    const agendamentosConcluidos = agendamentos.filter(a => a.status === 'CONCLUIDO').length
    const agendamentosCancelados = agendamentos.filter(a => a.status === 'CANCELADO').length

    const faturamentoTotal = agendamentos
        .filter(a => a.status === 'CONCLUIDO')
        .reduce((acc, curr) => acc + (curr.valorTotal || 0), 0)

    const ticketMedio = agendamentosConcluidos > 0 ? faturamentoTotal / agendamentosConcluidos : 0

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
            icon: Calendar,
            color: 'bg-blue-500',
            bgColor: 'bg-blue-50',
            textColor: 'text-blue-600'
        },
        {
            title: 'Total de Clientes',
            value: clientes.length,
            icon: Users,
            color: 'bg-purple-500',
            bgColor: 'bg-purple-50',
            textColor: 'text-purple-600'
        },
        {
            title: 'Faturamento',
            value: `R$ ${faturamentoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
            icon: DollarSign,
            color: 'bg-green-500',
            bgColor: 'bg-green-50',
            textColor: 'text-green-600'
        },
        {
            title: 'Ticket Médio',
            value: `R$ ${ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
            icon: TrendingUp,
            color: 'bg-indigo-500',
            bgColor: 'bg-indigo-50',
            textColor: 'text-indigo-600'
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
                            <span className={`text-xs font-medium px-2 py-1 rounded-full ${card.bgColor} ${card.textColor}`}>
                                +12%
                            </span>
                        </div>
                        <h3 className="text-gray-500 text-sm font-medium">{card.title}</h3>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
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
                                <span className="text-sm font-medium text-gray-700">Concluídos</span>
                            </div>
                            <span className="font-bold text-gray-900">{agendamentosConcluidos}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                                <Clock className="h-5 w-5 text-blue-500" />
                                <span className="text-sm font-medium text-gray-700">Agendados/Pendentes</span>
                            </div>
                            <span className="font-bold text-gray-900">{totalAgendamentos - agendamentosConcluidos - agendamentosCancelados}</span>
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

                {/* Recent Activity (Placeholder) */}
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
        </div>
    )
}
