import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { clientePublicoService } from '../services/clientePublicoService'

export default function LoginCliente() {
  const navigate = useNavigate()
  const [emailOuCpf, setEmailOuCpf] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')
    setLoading(true)

    try {
      await clientePublicoService.login({ emailOuCpf, senha })
      navigate('/cliente/agendar')
    } catch (error: any) {
      setErro(error.response?.data?.message || 'Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Área do Cliente
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Faça login para agendar e gerenciar seus horários
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {erro && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {erro}
            </div>
          )}
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="emailOuCpf" className="sr-only">
                Email ou CPF/CNPJ
              </label>
              <input
                id="emailOuCpf"
                name="emailOuCpf"
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Email ou CPF/CNPJ"
                value={emailOuCpf}
                onChange={(e) => setEmailOuCpf(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="senha" className="sr-only">
                Senha
              </label>
              <input
                id="senha"
                name="senha"
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => navigate('/cliente/cadastro')}
              className="text-sm text-indigo-600 hover:text-indigo-500"
            >
              Não tem conta? Cadastre-se
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}



