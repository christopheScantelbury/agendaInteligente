import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import {
  Calendar,
  Users,
  Home as HomeIcon,
  LogOut,
  Building2,
  Settings,
  UserCog,
  Briefcase,
  Stethoscope,
  Menu,
  X,
  User,
  ChevronDown,
} from 'lucide-react'
import { authService } from '../services/authService'

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
  const navigate = useNavigate()
  const usuario = authService.getUsuario()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)

  const isActive = (path: string, paths?: string[]) => {
    if (paths) {
      return paths.some((p) => location.pathname === p || location.pathname.startsWith(p + '/'))
    }
    return location.pathname === path
  }

  const handleLogout = () => {
    authService.logout()
    navigate('/login')
  }

  const navItems: NavItem[] = [
    { path: '/', label: 'Início', icon: <HomeIcon className="h-5 w-5" /> },
    { path: '/clientes', label: 'Clientes', icon: <Users className="h-5 w-5" /> },
    { path: '/clinicas', label: 'Clínicas', icon: <Building2 className="h-5 w-5" /> },
    { path: '/unidades', label: 'Unidades', icon: <Briefcase className="h-5 w-5" /> },
    { path: '/atendentes', label: 'Atendentes', icon: <UserCog className="h-5 w-5" /> },
    { path: '/servicos', label: 'Serviços', icon: <Stethoscope className="h-5 w-5" /> },
    { path: '/usuarios', label: 'Usuários', icon: <Settings className="h-5 w-5" /> },
    {
      path: '/agendamentos',
      label: 'Agendamentos',
      icon: <Calendar className="h-5 w-5" />,
      paths: ['/agendamentos'],
    },
  ]

  const NavLink = ({ item }: { item: NavItem }) => {
    const active = isActive(item.path, item.paths)
    return (
      <Link
        to={item.path}
        onClick={() => setMobileMenuOpen(false)}
        className={`flex items-center px-3 py-2 rounded-md text-base font-medium transition-colors ${
          active
            ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-500'
            : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
        }`}
      >
        <span className="mr-3">{item.icon}</span>
        {item.label}
      </Link>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo e título */}
            <div className="flex items-center flex-shrink-0">
              <Link to="/" className="flex items-center" onClick={() => setMobileMenuOpen(false)}>
                <Calendar className="h-8 w-8 text-blue-600" />
                <span className="ml-2 text-xl font-bold text-gray-900 hidden sm:block">
                  Agenda Inteligente
                </span>
                <span className="ml-2 text-lg font-bold text-gray-900 sm:hidden">
                  Agenda
                </span>
              </Link>
            </div>

            {/* Menu Desktop - COMPLETAMENTE OCULTO em mobile/tablet */}
            <div className="hidden lg:flex lg:items-center lg:flex-1 lg:justify-center lg:space-x-1 xl:space-x-2">
              {navItems.map((item) => {
                const active = isActive(item.path, item.paths)
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`inline-flex items-center px-2 xl:px-3 py-2 text-xs xl:text-sm font-medium transition-colors whitespace-nowrap ${
                      active
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-600 hover:text-gray-900 hover:border-b-2 hover:border-gray-300'
                    }`}
                  >
                    <span className="mr-1">{item.icon}</span>
                    <span className="hidden xl:inline">{item.label}</span>
                  </Link>
                )
              })}
            </div>

            {/* Menu de Perfil e Menu Mobile */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* Menu de Perfil - Desktop */}
              <div className="hidden sm:relative sm:block">
                <button
                  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Menu do perfil"
                  aria-expanded={profileMenuOpen}
                >
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                    <User className="h-5 w-5 text-white" />
                  </div>
                  <ChevronDown className="h-4 w-4 text-gray-600" />
                </button>

                {/* Dropdown do Perfil */}
                {profileMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setProfileMenuOpen(false)}
                      aria-hidden="true"
                    />
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                      <div className="py-1">
                        <div className="px-4 py-3 border-b border-gray-200">
                          <p className="text-sm font-semibold text-gray-900">{usuario?.nome}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            Perfil: <span className="font-medium">{usuario?.perfil}</span>
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            ID: {usuario?.usuarioId}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setProfileMenuOpen(false)
                            handleLogout()
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center transition-colors"
                        >
                          <LogOut className="h-4 w-4 mr-2" />
                          Sair
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Botão Menu Mobile - SEMPRE VISÍVEL em telas menores que lg */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden text-gray-700 hover:text-gray-900 p-2 rounded-md hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 z-10"
                aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
                aria-expanded={mobileMenuOpen}
                type="button"
              >
                {mobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Menu Mobile - Visível apenas em telas menores que lg */}
        {mobileMenuOpen && (
          <>
            {/* Overlay para fechar ao clicar fora */}
            <div
              className="lg:hidden fixed inset-0 bg-black bg-opacity-25 z-40"
              onClick={() => setMobileMenuOpen(false)}
              aria-hidden="true"
            />
            {/* Menu dropdown */}
            <div className="lg:hidden border-t border-gray-200 bg-white shadow-lg relative z-50">
              <div className="px-2 pt-2 pb-3 space-y-1 max-h-[calc(100vh-4rem)] overflow-y-auto">
                {navItems.map((item) => (
                  <NavLink key={item.path} item={item} />
                ))}
                <div className="pt-4 pb-2 border-t border-gray-200 mt-2">
                  <div className="px-3 py-2 text-sm text-gray-700">
                    <span className="font-medium">{usuario?.nome}</span>
                  </div>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false)
                      handleLogout()
                    }}
                    className="w-full mt-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors flex items-center"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sair
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </nav>

      <main className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}

