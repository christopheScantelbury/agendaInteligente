import api from './api'

export type TipoComissao = 'PERCENTUAL' | 'FIXO'
export type StatusComissao = 'PENDENTE' | 'PAGA'

export interface ComissaoRegra {
  id?: number
  atendenteId: number
  servicoId?: number | null
  servicoNome?: string | null
  tipo: TipoComissao
  valor: number
}

export interface ComissaoLancamento {
  id: number
  atendenteId: number
  atendenteNome?: string
  agendamentoId: number
  dataAgendamento?: string
  clienteNome?: string
  agendamentoServicoId?: number
  servicoNome?: string
  valorBase: number
  tipoAplicado: TipoComissao
  valorRegra: number
  valorComissao: number
  status: StatusComissao
  pagamentoId?: number | null
}

export interface ComissaoPagamento {
  id: number
  atendenteId: number
  atendenteNome?: string
  valorTotal: number
  /** #141: bruto antes do desconto de vales (campo novo, retrocompatível). */
  valorBruto?: number
  /** #141: total de vales descontados neste pagamento. */
  valorVales?: number
  dataPagamento: string
  pagoPorNome?: string
  formaPagamento?: string
  observacao?: string
  dataCriacao?: string
  lancamentosIds?: number[]
  quantidadeAtendimentos?: number
}

export type StatusVale = 'PENDENTE' | 'DESCONTADO'

export interface ComissaoVale {
  id?: number
  atendenteId: number
  valor: number
  dataVale: string             // YYYY-MM-DD
  observacao?: string
  status?: StatusVale
  pagamentoId?: number | null
  dataCriacao?: string
  dataDescontado?: string
}

export interface ComissaoResumo {
  atendenteId: number
  atendenteNome?: string
  pendente: number
  pago: number
  quantidadePendente: number
  quantidadePaga: number
}

export const comissaoService = {
  listarRegras: async (atendenteId: number): Promise<ComissaoRegra[]> => {
    const response = await api.get<ComissaoRegra[]>('/comissoes/regras', { params: { atendenteId } })
    return response.data
  },

  salvarRegra: async (regra: ComissaoRegra): Promise<ComissaoRegra> => {
    const response = await api.post<ComissaoRegra>('/comissoes/regras', regra)
    return response.data
  },

  excluirRegra: async (id: number): Promise<void> => {
    await api.delete(`/comissoes/regras/${id}`)
  },

  listarPendentes: async (atendenteId: number): Promise<ComissaoLancamento[]> => {
    const response = await api.get<ComissaoLancamento[]>('/comissoes/pendentes', { params: { atendenteId } })
    return response.data
  },

  resumo: async (atendenteId: number): Promise<ComissaoResumo> => {
    const response = await api.get<ComissaoResumo>('/comissoes/resumo', { params: { atendenteId } })
    return response.data
  },

  pagar: async (
    atendenteId: number,
    lancamentosIds: number[],
    formaPagamento?: string,
    observacao?: string,
    valesIds: number[] = [],
  ): Promise<ComissaoPagamento> => {
    const response = await api.post<ComissaoPagamento>('/comissoes/pagar', {
      atendenteId,
      lancamentosIds,
      valesIds,
      formaPagamento,
      observacao,
    })
    return response.data
  },

  listarPagamentos: async (atendenteId: number): Promise<ComissaoPagamento[]> => {
    const response = await api.get<ComissaoPagamento[]>('/comissoes/pagamentos', { params: { atendenteId } })
    return response.data
  },

  // ---------- Vales (#142) ----------

  listarVales: async (atendenteId: number, status?: StatusVale): Promise<ComissaoVale[]> => {
    const params: any = { atendenteId }
    if (status) params.status = status
    const response = await api.get<ComissaoVale[]>('/comissoes/vales', { params })
    return response.data
  },

  somaValesPendentes: async (atendenteId: number): Promise<number> => {
    const response = await api.get<{ total: number }>('/comissoes/vales/soma-pendentes', { params: { atendenteId } })
    return Number(response.data?.total ?? 0)
  },

  criarVale: async (vale: ComissaoVale): Promise<ComissaoVale> => {
    const response = await api.post<ComissaoVale>('/comissoes/vales', vale)
    return response.data
  },

  excluirVale: async (id: number): Promise<void> => {
    await api.delete(`/comissoes/vales/${id}`)
  },
}
