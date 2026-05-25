import api from './api'

export type TipoUsuario = 'cliente' | 'usuario'

export interface SolicitarRecuperacaoRequest {
  emailOuCpf: string
}

export interface RedefinirSenhaRequest {
  token: string
  novaSenha: string
}

export const recuperacaoSenhaService = {
  solicitar: async (tipo: TipoUsuario, dados: SolicitarRecuperacaoRequest): Promise<void> => {
    await api.post(`/publico/recuperacao-senha/${tipo}/solicitar`, dados)
  },

  redefinir: async (tipo: TipoUsuario, dados: RedefinirSenhaRequest): Promise<void> => {
    await api.post(`/publico/recuperacao-senha/${tipo}/redefinir`, dados)
  },
}
