import api from './api'
import { Unidade } from './unidadeService'

export interface Cliente {
  id?: number
  nome: string
  cpfCnpj: string
  email?: string
  telefone?: string
  unidadeId?: number
  endereco?: string
  observacao?: string
  numero?: string
  complemento?: string
  bairro?: string
  cep?: string
  cidade?: string
  uf?: string
  dataNascimento?: string
  rg?: string
  senha?: string
  ativo?: boolean
  unidadesIds?: number[]
  unidades?: Unidade[]
}

export interface ClienteRetorno {
  clienteId: number
  clienteNome: string
  clienteTelefone?: string
  ultimoAtendimento: string
  dataRetorno: string
  diasParaRetorno: number
  totalAtendimentos: number
}

export interface ClienteSumido {
  clienteId: number
  clienteNome: string
  clienteTelefone?: string
  ultimoAtendimento: string
  diasSemRetorno: number
  totalAtendimentos: number
}

export interface ProcedimentoResumo {
  nome: string
  data: string
}

export interface ClienteResumo {
  id: number
  nome: string
  telefone?: string
  email?: string
  cpfCnpj?: string
  dataNascimento?: string
  ultimoAtendimento?: string
  diasDesdeUltimoAtendimento?: number
  ultimosProcedimentos: ProcedimentoResumo[]
  totalCancelamentos: number
  totalNaoCompareceu: number
  clienteDesde: string
}

export interface ClienteDuplicata {
  clientes: Cliente[]
  motivoSimilaridade: 'nome' | 'telefone'
}

export const clienteService = {
  listar: async (): Promise<Cliente[]> => {
    const response = await api.get<Cliente[]>('/clientes')
    return response.data
  },

  buscarMeuPerfil: async (): Promise<Cliente | null> => {
    try {
      const response = await api.get<Cliente>('/clientes/meu-perfil')
      return response.status === 200 && response.data ? response.data : null
    } catch {
      return null
    }
  },

  buscarPorId: async (id: number): Promise<Cliente> => {
    const response = await api.get<Cliente>(`/clientes/${id}`)
    return response.data
  },

  criar: async (cliente: Cliente): Promise<Cliente> => {
    const response = await api.post<Cliente>('/clientes', cliente)
    return response.data
  },

  atualizar: async (id: number, cliente: Cliente): Promise<Cliente> => {
    const response = await api.put<Cliente>(`/clientes/${id}`, cliente)
    return response.data
  },

  excluir: async (id: number): Promise<void> => {
    await api.delete(`/clientes/${id}`)
  },

  buscarRetornos: async (
    unidadeId: number,
    servicoId: number,
    diasLimite: number
  ): Promise<ClienteRetorno[]> => {
    const response = await api.get<ClienteRetorno[]>('/clientes/retornos', {
      params: { unidadeId, servicoId, diasLimite },
    })
    return response.data
  },

  buscarSumidos: async (
    unidadeId: number,
    diasSemRetorno: number = 15,
    minAtendimentos: number = 1
  ): Promise<ClienteSumido[]> => {
    const response = await api.get<ClienteSumido[]>('/clientes/sumidos', {
      params: { unidadeId, diasSemRetorno, minAtendimentos },
    })
    return response.data
  },

  buscarResumo: async (id: number): Promise<ClienteResumo> => {
    const response = await api.get<ClienteResumo>(`/clientes/${id}/resumo`)
    return response.data
  },

  buscarDuplicatas: async (unidadeId: number): Promise<ClienteDuplicata[]> => {
    const response = await api.get<ClienteDuplicata[]>('/clientes/duplicatas', {
      params: { unidadeId },
    })
    return response.data
  },
}
