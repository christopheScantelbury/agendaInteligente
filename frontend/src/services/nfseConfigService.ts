import api from './api'

export interface NfseUnidadeResumo {
  unidadeId: number
  nome: string
  cnpj: string | null
  inscricaoMunicipal: string | null
  configurada: boolean
  notafacilAtivo: boolean
}

export interface NfseCertificado {
  configurado: boolean
  cn?: string | null
  validoDe?: string | null
  validoAte?: string | null
  dataUpload?: string | null
  expirado?: boolean
  diasAteVencer?: number
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
  certificado: NfseCertificado
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

  uploadCertificado: async (unidadeId: number, arquivo: File, senha: string): Promise<NfseUnidadeDados> => {
    const form = new FormData()
    form.append('arquivo', arquivo)
    form.append('senha', senha)
    const { data } = await api.post<NfseUnidadeDados>(
      `/configuracoes/nfse/${unidadeId}/certificado`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )
    return data
  },

  removerCertificado: async (unidadeId: number): Promise<NfseUnidadeDados> => {
    const { data } = await api.delete<NfseUnidadeDados>(`/configuracoes/nfse/${unidadeId}/certificado`)
    return data
  },
}
