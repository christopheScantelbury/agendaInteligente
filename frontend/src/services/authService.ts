import api from './api'

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
    localStorage.setItem('token', token)
    localStorage.setItem('usuario', JSON.stringify(response.data))
    return response.data
  },

  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
  },

  getToken: (): string | null => {
    return localStorage.getItem('token')
  },

  getUsuario: (): TokenResponse | null => {
    const usuario = localStorage.getItem('usuario')
    return usuario ? JSON.parse(usuario) : null
  },

  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('token')
  },
}

