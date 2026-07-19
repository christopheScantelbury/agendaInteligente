import api from './api'

export interface PerguntaTemplate {
  id: string
  label: string
  tipo: 'sim_nao' | 'texto' | 'numero'
  comObservacao?: boolean
}

export interface AnamneseTemplate {
  id: number
  nome: string
  descricao?: string
  ativo?: boolean
  unidadeId?: number
  perguntas?: PerguntaTemplate[]
}

export interface AnamneseResumo {
  id: number
  clienteNome: string
  servicoNome?: string
  templateNome?: string
  data: string
}

export interface Anamnese {
  id?: number
  clienteId: number
  clienteNome?: string
  servicoId?: number
  servicoNome?: string
  templateId?: number
  templateNome?: string
  data: string

  // Questionário
  usaRimel?: boolean | null
  usaRimelObs?: string
  procedimentosRecentesOlhos?: boolean | null
  procedimentosRecentesOlhosObs?: string
  alergias?: boolean | null
  alergiasObs?: string
  problemasOculares?: boolean | null
  problemasOcularesObs?: string
  tratamentoOncologico?: boolean | null
  tratamentoOncologicoObs?: string
  tireoide?: boolean | null
  tireoidedObs?: string
  dormeDeLado?: boolean | null
  dormeDeLadoObs?: string
  gravidez?: boolean | null
  gravidezObs?: string
  outrosProblemas?: boolean | null
  outrosProblemasDescricao?: string

  // Avaliação
  mapping?: string
  marcaFios?: string
  espessura?: string
  curvatura?: string
  adesivo?: string

  // Uso de imagem
  usoImagem?: boolean

  // Observações
  observacoes?: string

  /** Respostas das perguntas dinâmicas do template: { perguntaId: { valor, obs } } */
  respostas?: Record<string, { valor?: boolean | string | number | null; obs?: string }>

  unidadeId?: number
  dataCriacao?: string
  dataAtualizacao?: string
}

export type AnamneseFormData = Omit<Anamnese, 'id' | 'clienteNome' | 'templateNome' | 'dataCriacao' | 'dataAtualizacao'>

export const anamneseService = {
  listar: async (params: { unidadeId?: number; clienteId?: number }): Promise<AnamneseResumo[]> => {
    const query = new URLSearchParams()
    if (params.unidadeId) query.append('unidadeId', String(params.unidadeId))
    if (params.clienteId) query.append('clienteId', String(params.clienteId))
    const response = await api.get<AnamneseResumo[]>(`/anamneses?${query.toString()}`)
    return response.data
  },

  buscarPorId: async (id: number): Promise<Anamnese> => {
    const response = await api.get<Anamnese>(`/anamneses/${id}`)
    return response.data
  },

  criar: async (data: AnamneseFormData): Promise<Anamnese> => {
    const response = await api.post<Anamnese>('/anamneses', data)
    return response.data
  },

  atualizar: async (id: number, data: AnamneseFormData): Promise<Anamnese> => {
    const response = await api.put<Anamnese>(`/anamneses/${id}`, data)
    return response.data
  },

  excluir: async (id: number): Promise<void> => {
    await api.delete(`/anamneses/${id}`)
  },

  listarTemplates: async (): Promise<AnamneseTemplate[]> => {
    const response = await api.get<AnamneseTemplate[]>('/anamnese-templates')
    return response.data
  },

  buscarTemplate: async (id: number): Promise<AnamneseTemplate> => {
    const response = await api.get<AnamneseTemplate>(`/anamnese-templates/${id}`)
    return response.data
  },

  criarTemplate: async (data: Omit<AnamneseTemplate, 'id'>): Promise<AnamneseTemplate> => {
    const response = await api.post<AnamneseTemplate>('/anamnese-templates', data)
    return response.data
  },

  atualizarTemplate: async (id: number, data: AnamneseTemplate): Promise<AnamneseTemplate> => {
    const response = await api.put<AnamneseTemplate>(`/anamnese-templates/${id}`, data)
    return response.data
  },

  inativarTemplate: async (id: number): Promise<void> => {
    await api.delete(`/anamnese-templates/${id}`)
  },
}
