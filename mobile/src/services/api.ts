import axios, { AxiosError } from 'axios'
import Constants from 'expo-constants'
import * as SecureStore from 'expo-secure-store'
import { router } from 'expo-router'

// URL da API - prioridade:
// 1. Variável de ambiente EXPO_PUBLIC_API_URL (para builds de produção)
// 2. Configuração do app.json (extra.apiUrl)
// 3. Padrão localhost (apenas para desenvolvimento local)
const API_URL = 
  process.env.EXPO_PUBLIC_API_URL || 
  Constants.expoConfig?.extra?.apiUrl || 
  'http://localhost:8080/api'

// Log da URL da API em desenvolvimento
if (__DEV__) {
  console.log('🔗 API URL configurada:', API_URL)
}

const api = axios.create({
  baseURL: API_URL,
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
api.interceptors.request.use(async (config) => {
  // Adiciona Transaction ID para rastreamento
  const transactionId = generateTransactionId()
  config.headers['X-Transaction-ID'] = transactionId
  
  // Prioriza token de cliente, depois token de usuário
  const clienteToken = await SecureStore.getItemAsync('clienteToken')
  const usuarioToken = await SecureStore.getItemAsync('token')
  const token = clienteToken || usuarioToken
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  
  // Log em desenvolvimento
  if (__DEV__) {
    console.log('📤 Request:', {
      method: config.method?.toUpperCase(),
      url: config.url,
      baseURL: config.baseURL,
      hasToken: !!token,
    })
  }
  
  return config
})

// Interceptor para tratar erros de autenticação
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    // Trata erros de autenticação (401 e 403)
    if (error.response?.status === 401 || error.response?.status === 403) {
      await SecureStore.deleteItemAsync('token')
      await SecureStore.deleteItemAsync('usuario')
      await SecureStore.deleteItemAsync('clienteToken')
      await SecureStore.deleteItemAsync('cliente')
      
      // Redireciona para login apenas se não estiver já na tela de login
      if (__DEV__) {
        console.log('🔒 Não autenticado, redirecionando para login...')
      }
      // Não redireciona aqui para evitar loops, o _layout.tsx já faz isso
    }
    
    // Log de erros para debug
    if (__DEV__) {
      console.error('❌ API Error:', {
        url: error.config?.url,
        method: error.config?.method,
        baseURL: error.config?.baseURL,
        fullURL: error.config ? `${error.config.baseURL}${error.config.url}` : 'N/A',
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        code: error.code,
      })
    }
    
    return Promise.reject(error)
  }
)

export default api
