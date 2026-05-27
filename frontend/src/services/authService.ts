import api from './api'
import { Events, resetAnalytics, track } from '../lib/analytics'
import { isJwtExpired } from '../utils/jwt'

export interface LoginRequest {
  email: string
  senha: string
}

export interface CadastroRequest {
  nome: string
  email: string
  areaAtuacao: string
  quantidadeUnidades: number
  telefone?: string
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
  cadastrar: async (dados: CadastroRequest): Promise<void> => {
    await api.post('/auth/cadastro', dados)
  },

  login: async (credentials: LoginRequest): Promise<TokenResponse> => {
    const response = await api.post<TokenResponse>('/auth/login', credentials)
    const token = response.data.token
    localStorage.setItem('token', token)
    localStorage.setItem('usuario', JSON.stringify(response.data))
    return response.data
  },

  logout: () => {
    track(Events.LOGOUT, { tipo: 'usuario' })
    resetAnalytics()
    // Limpar todos os dados de autenticação
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
    // Limpar qualquer outro dado relacionado
    sessionStorage.clear()
  },

  getToken: (): string | null => {
    return localStorage.getItem('token')
  },

  getUsuario: (): TokenResponse | null => {
    const usuario = localStorage.getItem('usuario')
    return usuario ? JSON.parse(usuario) : null
  },

  isAuthenticated: (): boolean => {
    const token = localStorage.getItem('token')
    if (!token) return false
    if (isJwtExpired(token)) {
      // Token expirado — limpa storage para forçar re-login limpo
      localStorage.removeItem('token')
      localStorage.removeItem('usuario')
      return false
    }
    return true
  },

  /** Compara perfil ignorando maiúsculas (backend pode retornar "Cliente" ou "CLIENTE"). */
  isPerfilCliente: (): boolean => {
    const u = authService.getUsuario()
    return (u?.perfil ?? '').toUpperCase() === 'CLIENTE'
  },

  isPerfilAdmin: (): boolean => {
    const u = authService.getUsuario()
    const perfil = (u?.perfil ?? '').toUpperCase().replace('-', '_')
    return perfil === 'ADMIN' || perfil === 'ADMINISTRADOR'
  },

  isPerfilProfissional: (): boolean => {
    const u = authService.getUsuario()
    return (u?.perfil ?? '').toUpperCase() === 'PROFISSIONAL'
  },

  isPerfilGerente: (): boolean => {
    const u = authService.getUsuario()
    return (u?.perfil ?? '').toUpperCase() === 'GERENTE'
  },
}
