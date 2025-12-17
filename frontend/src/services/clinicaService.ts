import api from './api'

export interface Clinica {
  id?: number
  nome: string
  razaoSocial?: string
  cnpj: string
  endereco?: string
  numero?: string
  bairro?: string
  cep?: string
  cidade?: string
  uf?: string
  telefone?: string
  email?: string
  inscricaoMunicipal?: string
  inscricaoEstadual?: string
  complemento?: string
  ativo?: boolean
}

export const clinicaService = {
  listar: async (): Promise<Clinica[]> => {
    const response = await api.get<Clinica[]>('/clinicas')
    return response.data
  },

  buscarPorId: async (id: number): Promise<Clinica> => {
    const response = await api.get<Clinica>(`/clinicas/${id}`)
    return response.data
  },

  criar: async (clinica: Clinica): Promise<Clinica> => {
    const response = await api.post<Clinica>('/clinicas', clinica)
    return response.data
  },

  atualizar: async (id: number, clinica: Clinica): Promise<Clinica> => {
    const response = await api.put<Clinica>(`/clinicas/${id}`, clinica)
    return response.data
  },

  excluir: async (id: number): Promise<void> => {
    await api.delete(`/clinicas/${id}`)
  },
}

