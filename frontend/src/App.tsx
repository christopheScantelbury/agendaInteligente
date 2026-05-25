import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
// devtools só é carregado no build de desenvolvimento (tree-shaking remove em prod)
const isDev = import.meta.env.DEV
import { authService } from './services/authService'
import { clientePublicoService } from './services/clientePublicoService'
import { perfilService } from './services/perfilService'
import { ORDEM_REDIRECT_SEM_INICIO } from './constants/menusPermissoes'
import { ErrorBoundary } from './components/ErrorBoundary'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import NotificationContainer from './components/NotificationContainer'
import { NotificationProvider } from './contexts/NotificationContext'
import InstallPrompt from './components/InstallPrompt'
import Login from './pages/Login'
import Cadastro from './pages/Cadastro'
import LoginCliente from './pages/LoginCliente'
import CadastroCliente from './pages/CadastroCliente'
import AgendarCliente from './pages/AgendarCliente'
import MeusAgendamentosCliente from './pages/MeusAgendamentosCliente'
import Dashboard from './pages/Dashboard'
import Unidades from './pages/Unidades'
import Servicos from './pages/Servicos'
import Usuarios from './pages/Usuarios'
import Clientes from './pages/Clientes'
import ClienteFormPage from './pages/ClienteFormPage'
import Agendamentos from './pages/Agendamentos'
import NovoAgendamento from './pages/NovoAgendamento'
import Reclamacoes from './pages/Reclamacoes'
import Notificacoes from './pages/Notificacoes'
import Empresas from './pages/Empresas'
import Perfis from './pages/Perfis'
import Profissionais from './pages/Profissionais'
import Configuracoes from './pages/Configuracoes'
import ConvitesAcesso from './pages/ConvitesAcesso'
import ConvitesCliente from './pages/ConvitesCliente'
import Relatorios from './pages/Relatorios'
import Despesas from './pages/Despesas'
import Comissoes from './pages/Comissoes'
import Performance from './pages/relatorios/Performance'
import ResumoFinanceiro from './pages/relatorios/ResumoFinanceiro'
import RequirePermissao from './components/RequirePermissao'
import Landing from './pages/Landing'
import AnamneseListPage from './pages/anamneses/AnamneseListPage'
import AnamneseFormPage from './pages/anamneses/AnamneseFormPage'


function NavigateToAfterLogin() {
  return <Navigate to={authService.isPerfilCliente() ? '/cliente/agendar' : '/'} replace />
}

function DashboardOrAgendamentos() {
  const location = useLocation()
  const usuario = authService.getUsuario()
  const { data: perfil, isLoading } = useQuery({
    queryKey: ['perfil', 'meu'],
    queryFn: () => perfilService.buscarMeuPerfil(),
    enabled: !!usuario && !authService.isPerfilCliente(),
  })

  if (authService.isPerfilCliente()) {
    return <Navigate to="/agendamentos" replace />
  }

  if (isLoading || !perfil) {
    return <div className="flex justify-center items-center min-h-[200px]">Carregando...</div>
  }

  const perfilNorm = (usuario?.perfil ?? '').toUpperCase().replace('-', '_')
  const isAdminPerfil = perfilNorm === 'ADMINISTRADOR' || perfilNorm === 'ADMIN'
  const podeVerInicio = isAdminPerfil || perfil.permissoesGranulares?.['/'] === 'EDITAR' || perfil.permissoesGranulares?.['/'] === 'VISUALIZAR'
  if (location.pathname === '/' && !podeVerInicio) {
    const ordemRedirect = perfilNorm === 'ADMINISTRADOR'
      ? ORDEM_REDIRECT_SEM_INICIO.filter((path) => path !== '/usuarios')
      : ORDEM_REDIRECT_SEM_INICIO
    const primeiroPermitido = ordemRedirect.find(
      (path) => perfil.permissoesGranulares?.[path] === 'EDITAR' || perfil.permissoesGranulares?.[path] === 'VISUALIZAR'
    )
    return <Navigate to={primeiroPermitido || '/agendamentos'} replace />
  }

  return <Dashboard />
}

function redirectAdminUnico(element: any) {
  const perfil = (authService.getUsuario()?.perfil ?? '').toUpperCase().replace('-', '_')
  if (perfil === 'ADMINISTRADOR') {
    return <Navigate to="/configuracoes" replace />
  }
  return element
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutos
    },
  },
})

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <NotificationProvider>
          <NotificationContainer />
          <InstallPrompt />
          <Router>
            <Routes>
              {/* Rotas públicas para clientes */}
              <Route
                path="/cliente/login"
                element={clientePublicoService.isAuthenticated() ? <Navigate to="/cliente/agendar" /> : <LoginCliente />}
              />
              <Route
                path="/cliente/cadastro"
                element={clientePublicoService.isAuthenticated() ? <Navigate to="/cliente/agendar" /> : <CadastroCliente />}
              />
              <Route
                path="/cliente/agendar"
                element={clientePublicoService.isAuthenticated() ? <AgendarCliente /> : <Navigate to="/cliente/login" />}
              />
              <Route
                path="/cliente/meus-agendamentos"
                element={clientePublicoService.isAuthenticated() ? <MeusAgendamentosCliente /> : <Navigate to="/cliente/login" />}
              />
              <Route path="/reclamacoes" element={<Reclamacoes />} />

              {/* Landing page — unauthenticated root */}
              <Route
                path="/"
                element={
                  clientePublicoService.isAuthenticated()
                    ? <Navigate to="/cliente/agendar" replace />
                    : authService.isAuthenticated()
                      ? (
                        <ProtectedRoute>
                          <Layout>
                            <DashboardOrAgendamentos />
                          </Layout>
                        </ProtectedRoute>
                      )
                      : <Landing />
                }
              />

              {/* Rotas administrativas */}
              <Route
                path="/login"
                element={authService.isAuthenticated() ? <NavigateToAfterLogin /> : <Login />}
              />
              <Route
                path="/cadastro"
                element={authService.isAuthenticated() ? <NavigateToAfterLogin /> : <Cadastro />}
              />
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Routes>
                        <Route path="/" element={<DashboardOrAgendamentos />} />
                        <Route path="/dashboard" element={<DashboardOrAgendamentos />} />
                        <Route path="/clientes" element={<RequirePermissao path="/clientes" fallbackPaths={['/usuarios']}><Clientes /></RequirePermissao>} />
                        <Route path="/clientes/novo" element={<RequirePermissao path="/clientes" fallbackPaths={['/usuarios']}><ClienteFormPage /></RequirePermissao>} />
                        <Route path="/clientes/:id/editar" element={<RequirePermissao path="/clientes" fallbackPaths={['/usuarios']}><ClienteFormPage /></RequirePermissao>} />
                        <Route path="/anamneses" element={<RequirePermissao path="/clientes" fallbackPaths={['/usuarios']}><AnamneseListPage /></RequirePermissao>} />
                        <Route path="/anamneses/nova" element={<RequirePermissao path="/clientes" fallbackPaths={['/usuarios']}><AnamneseFormPage /></RequirePermissao>} />
                        <Route path="/anamneses/:id" element={<RequirePermissao path="/clientes" fallbackPaths={['/usuarios']}><AnamneseFormPage /></RequirePermissao>} />
                        <Route path="/unidades" element={redirectAdminUnico(<RequirePermissao path="/unidades"><Unidades /></RequirePermissao>)} />
                        <Route path="/servicos" element={<RequirePermissao path="/servicos"><Servicos /></RequirePermissao>} />
                        <Route path="/usuarios" element={<RequirePermissao path="/usuarios"><Usuarios /></RequirePermissao>} />
                        <Route path="/configuracoes" element={<Configuracoes />} />
                        <Route
                          path="/profissionais"
                          element={<RequirePermissao path="/profissionais" fallbackPaths={['/usuarios']}><Profissionais /></RequirePermissao>}
                        />
                        <Route path="/atendentes" element={<Navigate to="/profissionais" replace />} />
                        <Route path="/agendamentos" element={<RequirePermissao path="/agendamentos"><Agendamentos /></RequirePermissao>} />
                        <Route path="/agendamentos/novo" element={<RequirePermissao path="/agendamentos"><NovoAgendamento /></RequirePermissao>} />
                        <Route path="/notificacoes" element={<RequirePermissao path="/notificacoes"><Notificacoes /></RequirePermissao>} />
                        <Route path="/empresas" element={redirectAdminUnico(<RequirePermissao path="/empresas"><Empresas /></RequirePermissao>)} />
                        <Route path="/perfis" element={<RequirePermissao path="/perfis"><Perfis /></RequirePermissao>} />
                        <Route path="/convites-acesso" element={<RequirePermissao path="/convites-acesso"><ConvitesAcesso /></RequirePermissao>} />
                        <Route path="/convites-cliente" element={<RequirePermissao path="/convites-cliente"><ConvitesCliente /></RequirePermissao>} />
                        <Route path="/relatorios" element={<Relatorios />} />
                        <Route path="/despesas" element={<Despesas />} />
                        <Route path="/comissoes" element={<Comissoes />} />
                        <Route path="/relatorios/performance" element={<Performance />} />
                        <Route path="/relatorios/financeiro" element={<ResumoFinanceiro />} />
                      </Routes>
                    </Layout>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </Router>
          {isDev && <ReactQueryDevtools initialIsOpen={false} />}
        </NotificationProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App
