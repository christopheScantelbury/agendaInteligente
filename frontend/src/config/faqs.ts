/**
 * Mapa de FAQs por rota.
 * A chave pode ser uma rota exata ou um prefixo (matchea com startsWith).
 * Mais específico vence mais genérico.
 */

export interface FaqItem {
  pergunta: string
  resposta: string
}

export interface FaqContexto {
  titulo?: string
  faqs: FaqItem[]
  tourId?: string // se a tela tem onboarding, qual chave usar pra refazer
}

const FAQS_POR_PREFIXO: Array<{ prefixo: string; ctx: FaqContexto }> = [
  // Profissional
  {
    prefixo: '/profissional/hoje',
    ctx: {
      titulo: 'Modo Dia',
      faqs: [
        { pergunta: 'Como faço check-in de um cliente?', resposta: 'Toque no card do agendamento e selecione "Cliente chegou". O status muda para CONFIRMADO e o card fica verde.' },
        { pergunta: 'O que fazer quando o cliente não compareceu?', resposta: 'Toque no card e selecione "Marcar como no-show". O agendamento fica registrado como ausência.' },
        { pergunta: 'Como finalizar e cobrar?', resposta: 'Após iniciar o atendimento, toque no card e selecione "Finalizar e cobrar". Confirme o valor e escolha a forma de pagamento.' },
      ],
      tourId: 'profissional',
    },
  },
  {
    prefixo: '/profissional/agenda',
    ctx: {
      titulo: 'Agenda 7 dias',
      faqs: [
        { pergunta: 'Como ver detalhes de um dia futuro?', resposta: 'Toque no dia para abrir a timeline daquele dia em modo dia.' },
        { pergunta: 'O faturamento previsto inclui cancelados?', resposta: 'Não. Apenas agendamentos ativos contam para o previsto.' },
      ],
    },
  },
  // Cliente
  {
    prefixo: '/cliente/agendar',
    ctx: {
      titulo: 'Agendar',
      faqs: [
        { pergunta: 'Como mudar de horário depois?', resposta: 'Vá em "Meus horários" no menu inferior e toque em "Cancelar" no agendamento. Depois marque um novo.' },
        { pergunta: 'O que significa "Pagar no local"?', resposta: 'Você combina o pagamento diretamente com o estabelecimento (dinheiro, Pix ou cartão na hora).' },
        { pergunta: 'Esse horário pode ser ocupado por outro cliente?', resposta: 'O sistema revalida o horário antes de confirmar. Se for ocupado, voltamos para você escolher outro.' },
      ],
    },
  },
  {
    prefixo: '/cliente',
    ctx: {
      titulo: 'Início',
      faqs: [
        { pergunta: 'Como marcar um novo horário?', resposta: 'Toque no botão violet "+ Marcar novo horário" no centro da tela.' },
        { pergunta: 'Onde vejo meu histórico?', resposta: 'Toque em "Histórico" abaixo dos favoritos para ver agendamentos passados.' },
      ],
      tourId: 'cliente',
    },
  },
  // Gerente
  {
    prefixo: '/gerente/dashboard',
    ctx: {
      titulo: 'Dashboard',
      faqs: [
        { pergunta: 'Como o faturamento é calculado?', resposta: 'Soma apenas agendamentos com status CONCLUÍDO no mês atual. Valor final cobrado tem prioridade sobre valor previsto.' },
        { pergunta: 'A ocupação real é diferente da exibida?', resposta: 'A ocupação é estimada com base em 8 slots/dia por profissional ativo. É uma referência, não um cálculo exato.' },
        { pergunta: 'Posso comparar períodos personalizados no gráfico?', resposta: 'Use os botões 7d, 30d, 90d ou 1 ano. A linha tracejada cinza mostra o período anterior comparável.' },
      ],
      tourId: 'gerente',
    },
  },
  // Plataforma
  {
    prefixo: '/plataforma',
    ctx: {
      titulo: 'Plataforma',
      faqs: [
        { pergunta: 'Por que MRR e Churn estão "Em breve"?', resposta: 'Dependem da integração com Stripe (gateway de pagamento) que está no roadmap.' },
        { pergunta: 'Como acessar dados de uma empresa específica?', resposta: 'Em breve via "Assumir sessão" (rastreado em auditoria).' },
      ],
    },
  },
  // Geral
  {
    prefixo: '/agendamentos',
    ctx: {
      titulo: 'Agendamentos',
      faqs: [
        { pergunta: 'Como criar um agendamento recorrente?', resposta: 'No formulário, marque "Recorrente" e escolha o tipo (diário, semanal ou mensal) e a data de término.' },
      ],
    },
  },
  {
    prefixo: '/configuracoes',
    ctx: {
      titulo: 'Configurações',
      faqs: [
        { pergunta: 'Como personalizar minha página pública?', resposta: 'Em "Página pública" personalize cores, logo e link. O link curto é o que você envia aos clientes.' },
        { pergunta: 'Como configurar emissão de NFS-e?', resposta: 'Envie seu certificado A1 e configure a prefeitura. A emissão fica automática após cada atendimento concluído.' },
      ],
    },
  },
]

const FAQ_DEFAULT: FaqContexto = {
  titulo: 'Ajuda',
  faqs: [
    { pergunta: 'Como falar com o suporte?', resposta: 'Use o botão "Falar com suporte" abaixo. Atendemos via WhatsApp em horário comercial.' },
    { pergunta: 'Onde encontro tutoriais?', resposta: 'Em breve teremos uma base de conhecimento. Por enquanto, fale conosco no suporte.' },
  ],
}

export function faqsPorRota(pathname: string): FaqContexto {
  // Procura match mais específico (prefixo mais longo)
  const matches = FAQS_POR_PREFIXO.filter((f) => pathname.startsWith(f.prefixo))
  if (matches.length === 0) return FAQ_DEFAULT
  matches.sort((a, b) => b.prefixo.length - a.prefixo.length)
  return matches[0].ctx
}

/** WhatsApp do suporte — placeholder por enquanto */
export const SUPORTE_WHATSAPP = 'https://wa.me/5511999999999?text=Ol%C3%A1%2C%20preciso%20de%20ajuda%20no%20AgendaInteligente'
