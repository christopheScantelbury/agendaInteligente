import api from './api'
import * as SecureStore from 'expo-secure-store'

export interface LoginRequest {
  email: string
  senha: string
}

export interface TokenResponse {
  token: string
  tipo: string
  usuarioId: number
  unidadeId: number
  nome: string
  perfil: string
}

export const authService = {
  login: async (credentials: LoginRequest): Promise<TokenResponse> => {
    const response = await api.post<TokenResponse>('/auth/login', credentials)
    const token = response.data.token
    await SecureStore.setItemAsync('token', token)
    await SecureStore.setItemAsync('usuario', JSON.stringify(response.data))
    return response.data
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('token')
    await SecureStore.deleteItemAsync('usuario')
  },

  getToken: async (): Promise<string | null> => {
    return await SecureStore.getItemAsync('token')
  },

  getUsuario: async (): Promise<TokenResponse | null> => {
    const usuario = await SecureStore.getItemAsync('usuario')
    return usuario ? JSON.parse(usuario) : null
  },

  isAuthenticated: async (): Promise<boolean> => {
    const token = await SecureStore.getItemAsync('token')
    return !!token
  },
}
