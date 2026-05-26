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

  buscarHorariosDisponiveis: async (
    unidadeId: number,
    servicoId: number,
    dataInicio: string,
    dataFim: string
  ) => {
    const response = await api.get('/publico/clientes/horarios-disponiveis', {
      params: { unidadeId, servicoId, dataInicio, dataFim },
    })
    return response.data as any[]
  },

  criarAgendamento: async (payload: any) => {
    const response = await api.post('/publico/clientes/agendamentos', payload)
    return response.data
  },
}
