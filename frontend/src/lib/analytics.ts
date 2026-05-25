import posthog from 'posthog-js'

/**
 * Wrapper de analytics — usa PostHog se VITE_POSTHOG_KEY estiver definido,
 * senão no-op silencioso. Permite rodar em dev/teste sem chave.
 */

let initialized = false

export function initAnalytics(): void {
  if (initialized) return
  const key = import.meta.env.VITE_POSTHOG_KEY
  if (!key) {
    if (import.meta.env.DEV) {
      console.info('[analytics] PostHog desabilitado (sem VITE_POSTHOG_KEY).')
    }
    return
  }
  const host = import.meta.env.VITE_POSTHOG_HOST ?? 'https://us.i.posthog.com'
  posthog.init(key, {
    api_host: host,
    persistence: 'localStorage',
    autocapture: false, // só eventos explícitos
    capture_pageview: true,
    capture_pageleave: true,
    disable_session_recording: true,
  })
  initialized = true
}

export function track(event: string, properties?: Record<string, unknown>): void {
  if (!initialized) return
  try {
    posthog.capture(event, properties)
  } catch (err) {
    if (import.meta.env.DEV) console.warn('[analytics] capture falhou', err)
  }
}

export function identify(userId: string | number, traits?: Record<string, unknown>): void {
  if (!initialized) return
  try {
    posthog.identify(String(userId), traits)
  } catch (err) {
    if (import.meta.env.DEV) console.warn('[analytics] identify falhou', err)
  }
}

export function resetAnalytics(): void {
  if (!initialized) return
  try {
    posthog.reset()
  } catch (err) {
    if (import.meta.env.DEV) console.warn('[analytics] reset falhou', err)
  }
}

/**
 * Eventos padronizados — usar essas constantes em vez de strings soltas.
 */
export const Events = {
  LOGIN_SUCCESS: 'login_success',
  LOGOUT: 'logout',

  // Cliente
  CLIENTE_HOME_VISITADA: 'cliente_home_visitada',
  CLIENTE_AGENDAMENTO_INICIADO: 'cliente_agendamento_iniciado',
  CLIENTE_AGENDAMENTO_PASSO1: 'cliente_agendamento_passo1_servico',
  CLIENTE_AGENDAMENTO_PASSO2: 'cliente_agendamento_passo2_horario',
  CLIENTE_AGENDAMENTO_PASSO3: 'cliente_agendamento_passo3_confirmar',
  CLIENTE_AGENDAMENTO_CONCLUIDO: 'cliente_agendamento_concluido',
  CLIENTE_AGENDAMENTO_ABANDONADO: 'cliente_agendamento_abandonado',

  // Profissional
  PROFISSIONAL_CHECKIN: 'profissional_checkin',
  PROFISSIONAL_INICIAR_ATENDIMENTO: 'profissional_iniciar_atendimento',
  PROFISSIONAL_FINALIZAR: 'profissional_finalizar',
  PROFISSIONAL_NO_SHOW: 'profissional_no_show',

  // Gerente
  GERENTE_DASHBOARD_ABERTO: 'gerente_dashboard_aberto',
  GERENTE_CHECKLIST_TAREFA_CLICADA: 'gerente_checklist_tarefa_clicada',
  GERENTE_CHECKLIST_COMPLETO: 'gerente_checklist_completo',

  // Onboarding (todos os perfis)
  ONBOARDING_TOUR_INICIADO: 'onboarding_tour_iniciado',
  ONBOARDING_TOUR_PULADO: 'onboarding_tour_pulado',
  ONBOARDING_TOUR_COMPLETO: 'onboarding_tour_completo',
} as const

export type EventName = (typeof Events)[keyof typeof Events]
