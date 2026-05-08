import api from './api'

export const iaService = {
  sugerirRespostaReclamacao: async (mensagem: string): Promise<string> => {
    const { data } = await api.post('/ia/sugerir-resposta-reclamacao', { mensagem })
    return data.resposta ?? ''
  },

  sugerirServico: async (params: {
    areaAtuacao: string
    nomeBase: string
    duracaoMinutos: number
    valor: number
  }): Promise<{ nome: string; descricao: string }> => {
    const { data } = await api.post('/ia/sugerir-servico', params)
    return { nome: data.nome ?? '', descricao: data.descricao ?? '' }
  },

  mensagemReengajamento: async (params: {
    nomeCliente: string
    nomeNegocio: string
    diasAusente: number
    ultimoServico: string
  }): Promise<string> => {
    const { data } = await api.post('/ia/mensagem-reengajamento', params)
    return data.mensagem ?? ''
  },
}
