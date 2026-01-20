import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { authService } from './services/authService'
import { clientePublicoService } from './services/clientePublicoService'
import { ErrorBoundary } from './components/ErrorBoundary'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import NotificationContainer from './components/NotificationContainer'
import { NotificationProvider } from './contexts/NotificationContext'
import InstallPrompt from './components/InstallPrompt'
import Login from './pages/Login'
import LoginCliente from './pages/LoginCliente'
import CadastroCliente from './pages/CadastroCliente'
import AgendarCliente from './pages/AgendarCliente'
import MeusAgendamentosCliente from './pages/MeusAgendamentosCliente'
import Dashboard from './pages/Dashboard'
import Clientes from './pages/Clientes'
import Unidades from './pages/Unidades'
import Servicos from './pages/Servicos'
import Usuarios from './pages/Usuarios'
import Atendentes from './pages/Atendentes'
import Agendamentos from './pages/Agendamentos'
import NovoAgendamento from './pages/NovoAgendamento'
import Reclamacoes from './pages/Reclamacoes'
import Notificacoes from './pages/Notificacoes'
import Empresas from './pages/Empresas'
import Perfis from './pages/Perfis'

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

              {/* Rotas administrativas */}
              <Route
                path="/login"
                element={authService.isAuthenticated() ? <Navigate to="/" /> : <Login />}
              />
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/clientes" element={<Clientes />} />
                        <Route path="/unidades" element={<Unidades />} />
                        <Route path="/servicos" element={<Servicos />} />
                        <Route path="/usuarios" element={<Usuarios />} />
                        <Route path="/atendentes" element={<Atendentes />} />
                        <Route path="/agendamentos" element={<Agendamentos />} />
                        <Route path="/agendamentos/novo" element={<NovoAgendamento />} />
                        <Route path="/notificacoes" element={<Notificacoes />} />
                        <Route path="/empresas" element={<Empresas />} />
                        <Route path="/perfis" element={<Perfis />} />
                      </Routes>
                    </Layout>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </Router>
          <ReactQueryDevtools initialIsOpen={false} />
        </NotificationProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App

