import api from './api'

export type CategoriaEmpresa =
  | 'ACADEMIA'
  | 'CONSULTORIO_MEDICO'
  | 'CONSULTORIO_DENTARIO'
  | 'SALAO_BELEZA'
  | 'ESTETICA'
  | 'FISIOTERAPIA'
  | 'PSICOLOGIA'
  | 'NUTRICIONISTA'
  | 'VETERINARIA'
  | 'OUTROS'

/** Rótulos das categorias — fonte única (cadastro público + tela de Empresas). */
export const CATEGORIAS_EMPRESA: Array<{ value: CategoriaEmpresa; label: string }> = [
  { value: 'SALAO_BELEZA', label: 'Salão de beleza' },
  { value: 'ESTETICA', label: 'Estética' },
  { value: 'ACADEMIA', label: 'Academia' },
  { value: 'CONSULTORIO_MEDICO', label: 'Consultório médico' },
  { value: 'CONSULTORIO_DENTARIO', label: 'Consultório odontológico' },
  { value: 'FISIOTERAPIA', label: 'Fisioterapia' },
  { value: 'PSICOLOGIA', label: 'Psicologia' },
  { value: 'NUTRICIONISTA', label: 'Nutrição' },
  { value: 'VETERINARIA', label: 'Veterinária' },
  { value: 'OUTROS', label: 'Outros' },
]

export interface Empresa {
  id?: number
  nome: string
  razaoSocial?: string
  cnpj?: string
  email?: string
  telefone?: string
  endereco?: string
  numero?: string
  bairro?: string
  cep?: string
  cidade?: string
  uf?: string
  ativo?: boolean
  logo?: string
  corApp?: string
  categoria?: CategoriaEmpresa
  // ── #158 ──
  slugPublico?: string
  planoId?: number
  planoNome?: string
  planoPreco?: number
  planoInicio?: string
  planoExpiracao?: string
}

export interface EmpresaEstatisticas {
  unidades: number
  profissionais: number
  agendamentosMesAtual: number
  clientesAtivos: number
  nfseMesAtual: number
  nfseLimiteMes: number | null
  planoNome: string | null
  planoVencimento: string | null
}

export const empresaService = {
  listarTodos: async (): Promise<Empresa[]> => {
    const response = await api.get<Empresa[]>('/empresas')
    return response.data
  },

  listarAtivas: async (): Promise<Empresa[]> => {
    const response = await api.get<Empresa[]>('/empresas/ativas')
    return response.data
  },

  buscarPorId: async (id: number): Promise<Empresa> => {
    const response = await api.get<Empresa>(`/empresas/${id}`)
    return response.data
  },

  criar: async (empresa: Empresa): Promise<Empresa> => {
    const response = await api.post<Empresa>('/empresas', empresa)
    return response.data
  },

  atualizar: async (id: number, empresa: Empresa): Promise<Empresa> => {
    const response = await api.put<Empresa>(`/empresas/${id}`, empresa)
    return response.data
  },

  excluir: async (id: number): Promise<void> => {
    await api.delete(`/empresas/${id}`)
  },

  /** #158: KPIs do modal Editar Empresa. */
  estatisticas: async (id: number): Promise<EmpresaEstatisticas> => {
    const { data } = await api.get<EmpresaEstatisticas>(`/empresas/${id}/estatisticas`)
    return data
  },

  /** #158: trocar plano comercial (ADMIN global). */
  trocarPlano: async (id: number, planoId: number): Promise<Empresa> => {
    const { data } = await api.post<Empresa>(`/empresas/${id}/plano`, { planoId })
    return data
  },
}
