import api from './api'

export type StatusDespesa = 'RASCUNHO' | 'APROVADA' | 'PAGA' | 'CANCELADA'
export type RecorrenciaDespesa = 'NENHUMA' | 'MENSAL' | 'TRIMESTRAL' | 'ANUAL'

export interface CategoriaDespesa {
  id?: number
  nome: string
  cor?: string
  ativo?: boolean
  adminUnicoId?: number | null
  padrao?: boolean
}

export interface Despesa {
  id?: number
  nome: string
  descricao?: string
  valor: number
  dataCompetencia: string
  dataVencimento: string
  dataPagamento?: string | null
  categoriaId: number
  categoriaNome?: string
  categoriaCor?: string
  unidadeId: number
  unidadeNome?: string
  fornecedor?: string
  formaPagamento?: string
  status?: StatusDespesa
  recorrencia?: RecorrenciaDespesa
  despesaOrigemId?: number | null
  // #143: parcelamento (persistido)
  numeroParcela?: number | null
  totalParcelas?: number | null
  // #143: campos transientes enviados ao criar (service backend gera filhas)
  dataInicioRecorrencia?: string
  dataFimRecorrencia?: string
  /** PRIMEIRA | NENHUMA - quem nasce ja PAGA no modo FIXA_MENSAL */
  modoPagamentoRecorrencia?: 'PRIMEIRA' | 'NENHUMA'
  /** Quantidade de parcelas no modo PARCELADA. */
  numeroParcelas?: number
  reembolsavel?: boolean
  centroCusto?: string
  criadoPorId?: number
  criadoPorNome?: string
  pagoPorId?: number
  pagoPorNome?: string
  diasAtraso?: number
}

export interface DespesaResumo {
  totalRascunho: number
  totalAprovada: number
  totalPaga: number
  totalCancelada: number
  totalGeral: number
  quantidadeVencidas: number
}

export interface DespesaFiltros {
  inicio?: string
  fim?: string
  unidadeId?: number
  status?: string
  busca?: string
}

const buildParams = (f: DespesaFiltros) => {
  const params: Record<string, string> = {}
  if (f.inicio) params.inicio = f.inicio
  if (f.fim) params.fim = f.fim
  if (f.unidadeId) params.unidadeId = String(f.unidadeId)
  if (f.status) params.status = f.status
  if (f.busca) params.busca = f.busca
  return params
}

export const despesaService = {
  listar: async (filtros: DespesaFiltros = {}): Promise<Despesa[]> => {
    const response = await api.get<Despesa[]>('/despesas', { params: buildParams(filtros) })
    return response.data
  },

  resumo: async (filtros: Omit<DespesaFiltros, 'status' | 'busca'> = {}): Promise<DespesaResumo> => {
    const response = await api.get<DespesaResumo>('/despesas/resumo', { params: buildParams(filtros) })
    return response.data
  },

  buscarPorId: async (id: number): Promise<Despesa> => {
    const response = await api.get<Despesa>(`/despesas/${id}`)
    return response.data
  },

  criar: async (despesa: Despesa): Promise<Despesa> => {
    const response = await api.post<Despesa>('/despesas', despesa)
    return response.data
  },

  atualizar: async (id: number, despesa: Despesa): Promise<Despesa> => {
    const response = await api.put<Despesa>(`/despesas/${id}`, despesa)
    return response.data
  },

  alterarStatus: async (id: number, status: StatusDespesa, dataPagamento?: string): Promise<Despesa> => {
    const response = await api.patch<Despesa>(`/despesas/${id}/status`, { status, dataPagamento })
    return response.data
  },

  excluir: async (id: number): Promise<void> => {
    await api.delete(`/despesas/${id}`)
  },
}

export const categoriaDespesaService = {
  listar: async (): Promise<CategoriaDespesa[]> => {
    const response = await api.get<CategoriaDespesa[]>('/categorias-despesa')
    return response.data
  },

  criar: async (categoria: CategoriaDespesa): Promise<CategoriaDespesa> => {
    const response = await api.post<CategoriaDespesa>('/categorias-despesa', categoria)
    return response.data
  },

  atualizar: async (id: number, categoria: CategoriaDespesa): Promise<CategoriaDespesa> => {
    const response = await api.put<CategoriaDespesa>(`/categorias-despesa/${id}`, categoria)
    return response.data
  },

  inativar: async (id: number): Promise<void> => {
    await api.delete(`/categorias-despesa/${id}`)
  },
}
