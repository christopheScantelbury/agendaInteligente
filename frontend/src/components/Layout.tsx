import { Link, useLocation } from 'react-router-dom'
import { useState, useEffect, useMemo } from 'react'
import {
  Calendar,
  Home as HomeIcon,
  LogOut,
  Settings,
  Briefcase,
  Stethoscope,
  Users,
  Menu,
  X,
  User,
  Bell,
  Building2,
  Shield,
  Link2,
  UserPlus,
  BarChart2,
  ClipboardList,
  Wallet,
  Percent,
} from 'lucide-react'
import { authService } from '../services/authService'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { reclamacaoService } from '../services/reclamacaoService'
import { perfilService } from '../services/perfilService'
import ConfirmDialog from './ConfirmDialog'
import HelpFab from './HelpFab'

interface LayoutProps {
  children: React.ReactNode
}

interface NavItem {
  path: string
  label: string
  icon: React.ReactNode
  paths?: string[] // Para verificar múltiplos paths (ex: agendamentos/novo)
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const queryClient = useQueryClient()
  const usuario = authService.getUsuario()
  const perfilNorm = (usuario?.perfil ?? '').toUpperCase().replace('-', '_')
  const [sidebarOpen, setSidebarOpen] = useState(false) // Mobile toggle
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  // Buscar perfil do usuário para verificar permissões granulares
  const { data: perfilUsuario, isLoading: carregandoPerfil } = useQuery({
    queryKey: ['perfil', 'meu'],
    queryFn: () => perfilService.buscarMeuPerfil(),
    enabled: !!usuario,
    staleTime: 5 * 60 * 1000, // cache 5min — evita refetch ao trocar de rota
  })

  // Função para verificar permissão de menu (respeita configuração do perfil)
  // SEGURANÇA: enquanto o perfil não carrega, esconde TODOS os menus (default deny)
  // pra evitar "flash" mostrando itens que o usuário não tem permissão.
  const temPermissaoMenu = (menuPath: string): boolean => {
    if (!perfilUsuario) return false
    const permissao = perfilUsuario.permissoesGranulares?.[menuPath]
    return permissao === 'EDITAR' || permissao === 'VISUALIZAR'
  }

  // Verificar se é ADMIN ou GERENTE para mostrar notificações
  const isAdminUnico = perfilNorm === 'ADMINISTRADOR'
  const isAdmin = perfilNorm === 'ADMIN' || perfilNorm === 'ADMINISTRADOR'
  const podeVerNotificacoes = isAdmin || usuario?.perfil === 'GERENTE'

  // Buscar contador de reclamações não lidas
  const { data: contadorReclamacoes = 0 } = useQuery({
    queryKey: ['reclamacoes', 'contador'],
    queryFn: () => {
      if (!isAdmin && usuario?.perfil === 'GERENTE' && usuario?.unidadeId) {
        return reclamacaoService.contarNaoLidasPorUnidade(usuario.unidadeId)
      }
      return reclamacaoService.contarNaoLidas()
    },
    enabled: podeVerNotificacoes,
    refetchInterval: 30000, // Atualiza a cada 30 segundos
  })

  // Close mobile sidebar on route change
  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  const isActive = (path: string, paths?: string[]) => {
    if (paths) {
      return paths.some((p) => location.pathname === p || location.pathname.startsWith(p + '/'))
    }
    return location.pathname === path
  }

  const handleLogout = () => {
    setShowLogoutConfirm(true)
  }

  const confirmLogout = () => {
    // Fechar o dialog primeiro
    setShowLogoutConfirm(false)
    // Limpar cache do React Query
    queryClient.clear()
    // Fazer logout
    authService.logout()
    // Usar window.location para garantir recarregamento completo e limpar estado
    setTimeout(() => {
      window.location.href = '/login'
    }, 100)
  }

  // Construir lista de menus baseado em permissões
  const navItems: NavItem[] = useMemo(() => {
    const items: NavItem[] = []
    
    // Início (Dashboard) - desabilitado para CLIENTE (ele vai direto para Agendamentos)
    if (!authService.isPerfilCliente() && temPermissaoMenu('/')) {
      items.push({ path: '/dashboard', label: 'Início', icon: <HomeIcon className="h-5 w-5" /> })
    }
    
    // Empresas - apenas para ADMIN (ADMINISTRADOR usa Configurações)
    if (!isAdminUnico && isAdmin && temPermissaoMenu('/empresas')) {
      items.push({ path: '/empresas', label: 'Empresas', icon: <Building2 className="h-5 w-5" /> })
    }
    
    // Unidades (ADMINISTRADOR usa Configurações)
    if (!isAdminUnico && temPermissaoMenu('/unidades')) {
      items.push({ path: '/unidades', label: 'Unidades', icon: <Briefcase className="h-5 w-5" /> })
    }

    // Configurações (exclusivo ADMINISTRADOR)
    if (isAdminUnico) {
      items.push({ path: '/configuracoes', label: 'Configurações', icon: <Settings className="h-5 w-5" /> })
    }
    
    // Serviços
    if (temPermissaoMenu('/servicos')) {
      items.push({ path: '/servicos', label: 'Serviços', icon: <Stethoscope className="h-5 w-5" /> })
    }
    
    // Clientes
    if (temPermissaoMenu('/clientes') || temPermissaoMenu('/usuarios')) {
      items.push({
        path: '/clientes',
        label: 'Clientes',
        icon: <Users className="h-5 w-5" />,
        paths: ['/clientes'],
      })
      items.push({
        path: '/anamneses',
        label: 'Anamneses',
        icon: <ClipboardList className="h-5 w-5" />,
        paths: ['/anamneses'],
      })
    }

    // Usuários
    if (!isAdminUnico && temPermissaoMenu('/usuarios')) {
      items.push({ path: '/usuarios', label: 'Usuários', icon: <Settings className="h-5 w-5" /> })
    }

    // Profissionais
    if (temPermissaoMenu('/profissionais') || temPermissaoMenu('/usuarios')) {
      items.push({ path: '/profissionais', label: 'Profissionais', icon: <Stethoscope className="h-5 w-5" /> })
    }
    
    // Perfis - exibir para quem tiver permissão granular (ADMIN ou GERENTE com permissão)
    if (temPermissaoMenu('/perfis')) {
      items.push({ path: '/perfis', label: 'Perfis', icon: <Shield className="h-5 w-5" /> })
    }
    
    if (temPermissaoMenu('/convites-acesso')) {
      items.push({ path: '/convites-acesso', label: 'Links de venda de acesso', icon: <Link2 className="h-5 w-5" /> })
    }
    
    if (temPermissaoMenu('/convites-cliente')) {
      items.push({ path: '/convites-cliente', label: 'Links para clientes', icon: <UserPlus className="h-5 w-5" /> })
    }
    
    // Agendamentos (CLIENTE sempre vê; outros perfis conforme permissão granular)
    if (authService.isPerfilCliente() || temPermissaoMenu('/agendamentos')) {
      items.push({
        path: '/agendamentos',
        label: 'Agendamentos',
        icon: <Calendar className="h-5 w-5" />,
        paths: ['/agendamentos'],
      })
    }
    
    // Notificações
    if (podeVerNotificacoes && temPermissaoMenu('/notificacoes')) {
      items.push({
        path: '/notificacoes',
        label: 'Notificações',
        icon: <Bell className="h-5 w-5" />,
      })
    }

    // Despesas — admin, administrador e gerente
    if (isAdmin || usuario?.perfil === 'GERENTE') {
      items.push({
        path: '/despesas',
        label: 'Despesas',
        icon: <Wallet className="h-5 w-5" />,
      })
    }

    // Comissões — admin, administrador e gerente
    if (isAdmin || usuario?.perfil === 'GERENTE') {
      items.push({
        path: '/comissoes',
        label: 'Comissões',
        icon: <Percent className="h-5 w-5" />,
      })
    }

    // Relatórios — para admin, gerente e profissional
    if (!authService.isPerfilCliente()) {
      items.push({
        path: '/relatorios',
        label: 'Relatórios',
        icon: <BarChart2 className="h-5 w-5" />,
      })
    }

    return items
  }, [isAdmin, isAdminUnico, usuario?.perfil, perfilUsuario])

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`
          fixed lg:sticky lg:top-0 lg:h-screen inset-y-0 left-0 z-50
          bg-white shadow-xl lg:shadow-none border-r border-gray-200
          transform transition-all duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          w-64
          flex flex-col
        `}
      >
        {/* Logo Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100">
          <Link to={authService.isPerfilCliente() ? '/agendamentos' : '/dashboard'} className="flex items-center gap-2.5 overflow-hidden">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden className="flex-shrink-0">
              <rect width="32" height="32" rx="9" fill="#7C3AED" />
              <rect x="6" y="6" width="20" height="20" rx="3" fill="white" />
              <rect x="10" y="4" width="4" height="5" rx="1.5" fill="#DDD6FE" />
              <rect x="18" y="4" width="4" height="5" rx="1.5" fill="#DDD6FE" />
              <line x1="10" y1="16" x2="22" y2="16" stroke="#7C3AED" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="10" y1="19.5" x2="18" y2="19.5" stroke="#C4B5FD" strokeWidth="1.2" strokeLinecap="round" />
              <circle cx="22" cy="22" r="4" fill="#10B981" />
              <path d="M20.5 22l1 1 2.5-2.5" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="font-black text-base text-slate-900 tracking-tight whitespace-nowrap">
              Agenda<span className="text-violet-600">Inteligente</span>
            </span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 rounded-md hover:bg-gray-100 text-gray-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {carregandoPerfil && navItems.length === 0 ? (
            // Skeleton: evita sidebar vazia/piscando enquanto o perfil carrega
            <div className="space-y-2" aria-busy="true" aria-label="Carregando menus">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-9 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : navItems.map((item) => {
            const active = isActive(item.path, item.paths)
            const isNotificacoes = item.path === '/notificacoes'
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)} // Auto-close on click (redundant with useEffect but safer)
                className={`
                  flex items-center px-3 py-2.5 rounded-lg transition-colors group relative
                  ${active
                    ? 'bg-violet-50 text-violet-700'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'}
                `}
              >
                <span className={`flex-shrink-0 ${active ? 'text-violet-600' : 'text-gray-500 group-hover:text-gray-700'}`}>
                  {item.icon}
                </span>
                <span className="ml-3 text-sm leading-5 font-medium whitespace-nowrap">
                  {item.label}
                </span>
                {isNotificacoes && contadorReclamacoes > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {contadorReclamacoes > 99 ? '99+' : contadorReclamacoes}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* User Profile */}
        <div className="border-t border-gray-100 p-3">
          <div className="flex items-center justify-start px-2 py-2">
            <div className="h-8 w-8 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0 text-violet-700 font-semibold">
              {usuario?.nome?.charAt(0) || <User className="h-5 w-5" />}
            </div>
            <div className="ml-3 overflow-hidden">
              <p className="text-sm font-medium text-gray-700 truncate">{usuario?.nome}</p>
              <button
                onClick={handleLogout}
                className="text-xs text-red-500 hover:text-red-700 flex items-center mt-0.5"
              >
                <LogOut className="h-3 w-3 mr-1" /> Sair
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0 bg-gray-50">
        {/* Mobile Header */}
        <header className="lg:hidden bg-white shadow-sm h-16 flex items-center justify-between px-4 sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-md"
          >
            <Menu className="h-6 w-6" />
          </button>
          <span className="font-semibold text-gray-900">Agenda Inteligente</span>
          {podeVerNotificacoes ? (
            <Link
              to="/notificacoes"
              className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-md"
            >
              <Bell className="h-6 w-6" />
              {contadorReclamacoes > 0 && (
                <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {contadorReclamacoes > 99 ? '99+' : contadorReclamacoes}
                </span>
              )}
            </Link>
          ) : (
            <div className="w-8"></div>
          )}
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden min-w-0">
          {children}
        </main>
      </div>

      <HelpFab />

      {/* Dialog de Confirmação de Logout */}
      <ConfirmDialog
        isOpen={showLogoutConfirm}
        title="Confirmar Saída"
        message="Tem certeza que deseja sair do sistema?"
        confirmText="Sair"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={confirmLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </div>
  )
}
