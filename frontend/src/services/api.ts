import axios, { AxiosError } from 'axios'
import { getApiErrorMessage } from '../utils/apiError'

// Strip BOM (﻿) that can appear when env var is set via some CLI tools on Windows
const apiBaseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8080/api').replace(/^﻿/, '')

const api = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 segundos
})

// Função para gerar Transaction ID único
const generateTransactionId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
}

// Interceptor para adicionar token e transaction ID
api.interceptors.request.use((config) => {
  const transactionId = generateTransactionId()
  config.headers['X-Transaction-ID'] = transactionId

  const clienteToken = localStorage.getItem('clienteToken')
  const usuarioToken = localStorage.getItem('token')
  const token = clienteToken || usuarioToken

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Interceptor para tratar erros de autenticação e log consistente
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('usuario')
      window.location.href = '/login'
    }

    if (import.meta.env.DEV) {
      const msg = getApiErrorMessage(error)
      console.error('API Error:', {
        url: error.config?.url,
        method: error.config?.method,
        status: error.response?.status,
        message: msg,
      })
    }

    return Promise.reject(error)
  }
)

export default api

