/**
 * Lista única de todas as telas/funcionalidades configuráveis na tela de Perfis.
 * Usado no Layout (menu), na tela Perfis (formulário de permissões) e no redirecionamento.
 */
export const MENUS_CONFIG = [
  { path: '/', label: 'Início (Dashboard)' },
  { path: '/empresas', label: 'Empresas' },
  { path: '/unidades', label: 'Unidades' },
  { path: '/servicos', label: 'Serviços' },
  { path: '/usuarios', label: 'Usuários' },
  { path: '/clientes', label: 'Clientes' },
  { path: '/profissionais', label: 'Profissionais' },
  { path: '/perfis', label: 'Perfis e Permissões' },
  { path: '/convites-acesso', label: 'Links de venda de acesso' },
  { path: '/convites-cliente', label: 'Links de cadastro de clientes' },
  { path: '/agendamentos', label: 'Agendamentos' },
  { path: '/notificacoes', label: 'Notificações' },
] as const

export type MenuPath = (typeof MENUS_CONFIG)[number]['path']

/** Ordem de prioridade para redirecionar quando usuário não tem acesso ao dashboard */
export const ORDEM_REDIRECT_SEM_INICIO: MenuPath[] = [
  '/servicos',
  '/unidades',
  '/usuarios',
  '/clientes',
  '/profissionais',
  '/perfis',
  '/convites-acesso',
  '/convites-cliente',
  '/agendamentos',
  '/notificacoes',
  '/empresas',
]
