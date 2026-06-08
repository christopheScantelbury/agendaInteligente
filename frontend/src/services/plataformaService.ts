import api from './api'

export interface MetricasPlataforma {
  empresasAtivas: number
  totalEmpresas: number
  usuariosAtivos: number
  totalAgendamentos: number
  agendamentosMes: number
  totalNfse: number
  nfseMes: number
  mrr: number | null
  churn: number | null
  inativadas30d?: number
}

export interface EmpresaPlataforma {
  id: number
  nome: string
  razaoSocial?: string
  cnpj?: string
  email?: string
  categoria?: string
  status: 'ATIVA' | 'INATIVA'
  dataCadastro?: string
  ultimaAtividade?: string
  agendamentosMes: number
  plano: string | null
  mrr: number | null
}

export const plataformaService = {
  metricas: async (): Promise<MetricasPlataforma> => {
    const response = await api.get<MetricasPlataforma>('/plataforma/metricas')
    return response.data
  },

  listarEmpresas: async (): Promise<EmpresaPlataforma[]> => {
    const response = await api.get<EmpresaPlataforma[]>('/plataforma/empresas')
    return response.data
  },

  auditLog: async (filtros: AuditLogFiltros = {}): Promise<AuditLogPage> => {
    const response = await api.get<AuditLogPage>('/plataforma/audit-log', { params: filtros })
    return response.data
  },

  assumirSessao: async (empresaId: number, motivo: string): Promise<AssumirSessaoResponse> => {
    const response = await api.post<AssumirSessaoResponse>(
      `/plataforma/empresas/${empresaId}/assumir-sessao`,
      { motivo }
    )
    return response.data
  },
}

export interface AssumirSessaoResponse {
  token: string
  tipo: string
  expiresInMs: number
  alvoUsuarioId: number
  alvoEmail: string
  alvoNome: string
  alvoPerfil: string
  empresaId: number
  empresaNome: string
}

export interface AuditLogFiltros {
  tipoAcao?: string
  autorId?: number
  empresaId?: number
  de?: string
  ate?: string
  page?: number
  size?: number
}

export interface AuditLogEntry {
  id: number
  timestamp: string
  autorId: number | null
  autorEmail: string | null
  autorPerfil: string | null
  tipoAcao: string
  entidade: string | null
  entidadeId: number | null
  descricao: string | null
  ip: string | null
  userAgent: string | null
  metadata: Record<string, unknown> | null
  empresaId: number | null
  impersonatedBy: number | null
}

export interface AuditLogPage {
  content: AuditLogEntry[]
  totalElements: number
  totalPages: number
  number: number
  size: number
}
