import api from './api'

export interface ConviteAcessoCriar {
  maxUnidades: number
  dataExpiracaoLink: string
  dataExpiracaoAcesso: string
  /** #171: cargo que o convidado assume. Sem isso, o backend cai no legado. */
  perfilId?: number | null
}

export interface ConviteAcessoResposta {
  id: number
  token: string
  link: string
  maxUnidades: number
  dataExpiracaoLink: string
  dataExpiracaoAcesso: string
  usadoEm: string | null
  dataCriacao: string
  perfilId?: number | null
  perfilNome?: string | null
}

export interface ConviteClienteCriar {
  unidadeId: number
  dataExpiracao: string
}

export interface ConviteClienteResposta {
  id: number
  token: string
  link: string
  unidadeId: number
  unidadeNome: string
  dataExpiracao: string
  usadoEm: string | null
  dataCriacao: string
}

export const conviteService = {
  listarConvitesAcesso: () =>
    api.get<ConviteAcessoResposta[]>('/convites/acesso').then((r) => r.data),

  criarConviteAcesso: (dto: ConviteAcessoCriar) =>
    api.post<ConviteAcessoResposta>('/convites/acesso', dto).then((r) => r.data),

  listarConvitesCliente: () =>
    api.get<ConviteClienteResposta[]>('/convites/cliente').then((r) => r.data),

  criarConviteCliente: (dto: ConviteClienteCriar) =>
    api.post<ConviteClienteResposta>('/convites/cliente', dto).then((r) => r.data),
}
