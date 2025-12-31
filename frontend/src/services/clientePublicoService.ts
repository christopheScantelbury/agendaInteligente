import api from './api'

export interface ClienteLoginRequest {
  emailOuCpf: string
  senha: string
}

export interface ClienteTokenResponse {
  token: string
  tipo: string
  clienteId: number
  nome: string
  email?: string
}

export interface HorarioDisponivel {
  dataHoraInicio: string
  dataHoraFim: string
  atendenteId: number
  atendenteNome: string
  unidadeId: number
  unidadeNome: string
}

export interface ClienteCadastroRequest {
  nome: string
  cpfCnpj: string
  email?: string
  telefone?: string
  endereco?: string
  numero?: string
  complemento?: string
  bairro?: string
  cep?: string
  cidade?: string
  uf?: string
  senha?: string
}

export const clientePublicoService = {
  cadastrar: async (dados: ClienteCadastroRequest): Promise<any> => {
    const { senha, ...cliente } = dados
    const response = await api.post<any>('/publico/clientes/cadastro', cliente, {
      params: senha ? { senha } : undefined,
    })
    return response.data
  },

  login: async (credentials: ClienteLoginRequest): Promise<ClienteTokenResponse> => {
    const response = await api.post<ClienteTokenResponse>('/publico/clientes/login', credentials)
    const token = response.data.token
    localStorage.setItem('clienteToken', token)
    localStorage.setItem('cliente', JSON.stringify(response.data))
    return response.data
  },

  logout: () => {
    localStorage.removeItem('clienteToken')
    localStorage.removeItem('cliente')
  },

  getToken: (): string | null => {
    return localStorage.getItem('clienteToken')
  },

  getCliente: (): ClienteTokenResponse | null => {
    const cliente = localStorage.getItem('cliente')
    return cliente ? JSON.parse(cliente) : null
  },

  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('clienteToken')
  },

  buscarHorariosDisponiveis: async (
    unidadeId: number,
    servicoId: number,
    dataInicio: string,
    dataFim: string
  ): Promise<HorarioDisponivel[]> => {
    const response = await api.get<HorarioDisponivel[]>('/publico/clientes/horarios-disponiveis', {
      params: { unidadeId, servicoId, dataInicio, dataFim },
    })
    return response.data
  },

  criarAgendamento: async (agendamento: any): Promise<any> => {
    const response = await api.post<any>('/publico/clientes/agendamentos', agendamento)
    return response.data
  },

  meusAgendamentos: async (): Promise<any[]> => {
    const response = await api.get<any[]>('/publico/clientes/meus-agendamentos')
    return response.data
  },

  cancelarAgendamento: async (id: number): Promise<void> => {
    await api.post(`/publico/clientes/agendamentos/${id}/cancelar`)
  },
}

