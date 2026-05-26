import axios from 'axios'
import Constants from 'expo-constants'
import * as SecureStore from 'expo-secure-store'

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (Constants.expoConfig?.extra?.apiUrl as string) ??
  'http://localhost:8080/api'

const TOKEN_KEY = 'cliente_token'
const CLIENTE_KEY = 'cliente_data'

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync(TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export interface ClienteLogin {
  emailOuCpf: string
  senha: string
}

export interface ClienteCadastro {
  nome: string
  cpfCnpj: string
  email: string
  telefone: string
  dataNascimento: string
  senha: string
}

export interface ClienteTokenResponse {
  token: string
  tipo: string
  clienteId: number
  nome: string
  email?: string
}

export interface UnidadePublica {
  id: number
  nome: string
  descricao?: string
  endereco?: string
  bairro?: string
  cidade?: string
  uf?: string
  telefone?: string
  empresaNome?: string
  empresaCategoria?: string
}

export interface ServicoPublico {
  id: number
  nome: string
  descricao?: string
  valor: number
  duracaoMinutos: number
}

export interface HorarioDisponivel {
  dataHora: string // ISO
  atendenteId: number
  atendenteNome?: string
  disponivel: boolean
}

export const clienteAuthService = {
  api,

  login: async (credentials: ClienteLogin): Promise<ClienteTokenResponse> => {
    const response = await api.post<ClienteTokenResponse>('/publico/clientes/login', credentials)
    await SecureStore.setItemAsync(TOKEN_KEY, response.data.token)
    await SecureStore.setItemAsync(CLIENTE_KEY, JSON.stringify(response.data))
    return response.data
  },

  cadastrar: async (dados: ClienteCadastro): Promise<void> => {
    const { senha, ...cliente } = dados
    await api.post('/publico/clientes/cadastro', cliente, {
      params: { senha },
    })
  },

  logout: async (): Promise<void> => {
    await SecureStore.deleteItemAsync(TOKEN_KEY)
    await SecureStore.deleteItemAsync(CLIENTE_KEY)
  },

  isAuthenticated: async (): Promise<boolean> => {
    const token = await SecureStore.getItemAsync(TOKEN_KEY)
    return !!token
  },

  getCliente: async (): Promise<ClienteTokenResponse | null> => {
    const raw = await SecureStore.getItemAsync(CLIENTE_KEY)
    return raw ? JSON.parse(raw) : null
  },

  // Dados de domínio
  meusAgendamentos: async () => {
    const response = await api.get('/publico/clientes/meus-agendamentos')
    return response.data as any[]
  },

  listarUnidades: async (): Promise<UnidadePublica[]> => {
    const response = await api.get<UnidadePublica[]>('/publico/clientes/unidades')
    return response.data
  },

  listarServicos: async (unidadeId: number): Promise<ServicoPublico[]> => {
    const response = await api.get<ServicoPublico[]>(`/publico/clientes/unidades/${unidadeId}/servicos`)
    return response.data
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

  criarAgendamento: async (payload: any) => {
    const response = await api.post('/publico/clientes/agendamentos', payload)
    return response.data
  },
}
