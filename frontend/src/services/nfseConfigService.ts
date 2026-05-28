import api from './api'

export interface NfseUnidadeResumo {
  unidadeId: number
  nome: string
  cnpj: string | null
  inscricaoMunicipal: string | null
  configurada: boolean
  notafacilAtivo: boolean
}

export interface NfseUnidadeDados {
  unidadeId: number
  nome: string
  razaoSocial: string | null
  cnpj: string | null
  inscricaoMunicipal: string | null
  inscricaoEstadual: string | null
  regimeTributario: string | null
  endereco: string | null
  numero: string | null
  bairro: string | null
  cep: string | null
  cidade: string | null
  uf: string | null
  municipioIbge: string | null
  email: string | null
  telefone: string | null
  notafacilApiKeyConfigurada: boolean
  notafacilAtivo: boolean
}

export interface NfseUnidadePayload {
  razaoSocial?: string | null
  cnpj?: string | null
  inscricaoMunicipal?: string | null
  inscricaoEstadual?: string | null
  regimeTributario?: string | null
  endereco?: string | null
  numero?: string | null
  bairro?: string | null
  cep?: string | null
  cidade?: string | null
  uf?: string | null
  municipioIbge?: string | null
  email?: string | null
  telefone?: string | null
  /** Só envie se o usuário digitou de fato — vazio significa "não alterar". */
  notafacilApiKey?: string | null
  notafacilAtivo?: boolean | null
}

export const nfseConfigService = {
  listar: async (): Promise<NfseUnidadeResumo[]> => {
    const { data } = await api.get<NfseUnidadeResumo[]>('/configuracoes/nfse')
    return data
  },

  buscar: async (unidadeId: number): Promise<NfseUnidadeDados> => {
    const { data } = await api.get<NfseUnidadeDados>(`/configuracoes/nfse/${unidadeId}`)
    return data
  },

  atualizar: async (unidadeId: number, payload: NfseUnidadePayload): Promise<NfseUnidadeDados> => {
    const { data } = await api.put<NfseUnidadeDados>(`/configuracoes/nfse/${unidadeId}`, payload)
    return data
  },
}
