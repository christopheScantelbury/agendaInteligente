import type { CategoriaEmpresa } from '../../services/empresaService'

/**
 * Terminologia, iconografia e tema visual de cada categoria de empresa.
 *
 * Quatro categorias têm dicionário próprio inicialmente (CONSULTORIO_MEDICO,
 * SALAO_BELEZA, ACADEMIA e OUTROS — fallback). As demais 6 categorias do
 * enum caem no fallback de OUTROS até serem mapeadas pelo produto.
 *
 * `OUTROS` é também o default no backend (migration V52), garantindo que
 * empresas existentes que ainda não escolheram categoria recebam o fallback.
 */
export type CategoriaDict = {
  /** Nome do tipo de estabelecimento — usado em títulos e em "Sua [empresa]". */
  rotuloEmpresa: string
  /** Quem presta o serviço. Plural usado em listagens. */
  rotuloAtendente: string
  rotuloAtendentePlural: string
  /** Quem recebe o serviço. */
  rotuloCliente: string
  rotuloClientePlural: string
  /** O que é oferecido. */
  rotuloServico: string
  rotuloServicoPlural: string
  /** O evento agendado. */
  rotuloAgendamento: string
  rotuloAgendamentoPlural: string
  /** Emoji curto para usar em chips/badges. */
  iconeEmoji: string
}

const FALLBACK: CategoriaDict = {
  rotuloEmpresa: 'Empresa',
  rotuloAtendente: 'Profissional',
  rotuloAtendentePlural: 'Profissionais',
  rotuloCliente: 'Cliente',
  rotuloClientePlural: 'Clientes',
  rotuloServico: 'Serviço',
  rotuloServicoPlural: 'Serviços',
  rotuloAgendamento: 'Agendamento',
  rotuloAgendamentoPlural: 'Agendamentos',
  iconeEmoji: '📅',
}

export const CATEGORIA_DICT: Record<CategoriaEmpresa, CategoriaDict> = {
  CONSULTORIO_MEDICO: {
    rotuloEmpresa: 'Clínica',
    rotuloAtendente: 'Médico',
    rotuloAtendentePlural: 'Médicos',
    rotuloCliente: 'Paciente',
    rotuloClientePlural: 'Pacientes',
    rotuloServico: 'Procedimento',
    rotuloServicoPlural: 'Procedimentos',
    rotuloAgendamento: 'Consulta',
    rotuloAgendamentoPlural: 'Consultas',
    iconeEmoji: '🩺',
  },
  SALAO_BELEZA: {
    rotuloEmpresa: 'Salão',
    rotuloAtendente: 'Profissional',
    rotuloAtendentePlural: 'Profissionais',
    rotuloCliente: 'Cliente',
    rotuloClientePlural: 'Clientes',
    rotuloServico: 'Serviço',
    rotuloServicoPlural: 'Serviços',
    rotuloAgendamento: 'Atendimento',
    rotuloAgendamentoPlural: 'Atendimentos',
    iconeEmoji: '💇',
  },
  ACADEMIA: {
    rotuloEmpresa: 'Academia',
    rotuloAtendente: 'Professor',
    rotuloAtendentePlural: 'Professores',
    rotuloCliente: 'Aluno',
    rotuloClientePlural: 'Alunos',
    rotuloServico: 'Aula',
    rotuloServicoPlural: 'Aulas',
    rotuloAgendamento: 'Aula',
    rotuloAgendamentoPlural: 'Aulas',
    iconeEmoji: '🏋️',
  },
  // As demais categorias caem no fallback até serem mapeadas pelo produto.
  CONSULTORIO_DENTARIO: FALLBACK,
  ESTETICA: FALLBACK,
  FISIOTERAPIA: FALLBACK,
  PSICOLOGIA: FALLBACK,
  NUTRICIONISTA: FALLBACK,
  VETERINARIA: FALLBACK,
  OUTROS: FALLBACK,
}

/**
 * Retorna o dicionário da categoria informada, com fallback seguro.
 * Use o hook `useCategoria()` na maioria dos casos — esta função é exposta
 * para testes e para usos fora de componente React.
 */
export function getCategoriaDict(categoria: CategoriaEmpresa | null | undefined): CategoriaDict {
  if (!categoria) return FALLBACK
  return CATEGORIA_DICT[categoria] ?? FALLBACK
}
