import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authService } from '../services/authService'

export default function Cadastro() {
  const navigate = useNavigate()
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [areaAtuacao, setAreaAtuacao] = useState('')
  const [quantidadeUnidades, setQuantidadeUnidades] = useState(1)
  const [telefone, setTelefone] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')

    if (senha.length < 6) {
      setErro('A senha deve ter no mínimo 6 caracteres')
      return
    }

    if (!Number.isFinite(quantidadeUnidades) || quantidadeUnidades < 1) {
      setErro('Informe uma quantidade de unidades válida')
      return
    }

    setLoading(true)
    try {
      await authService.cadastrar({
        nome,
        email,
        areaAtuacao,
        quantidadeUnidades,
        telefone: telefone.trim() || undefined,
        senha,
      })
      navigate('/login')
    } catch (error: any) {
      setErro(error.response?.data?.message || 'Erro ao realizar cadastro')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900">Criar conta</h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Preencha os dados para se cadastrar
          </p>
        </div>

        {erro && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {erro}
          </div>
        )}

        <form className="space-y-4 bg-white p-6 rounded-lg shadow" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-1">
              Nome
            </label>
            <input
              id="nome"
              type="text"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              placeholder="Seu nome"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              placeholder="seu@email.com"
            />
          </div>

          <div>
            <label htmlFor="areaAtuacao" className="block text-sm font-medium text-gray-700 mb-1">
              Área de atuação
            </label>
            <input
              id="areaAtuacao"
              type="text"
              required
              value={areaAtuacao}
              onChange={(e) => setAreaAtuacao(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              placeholder="Ex.: Clínica odontológica"
            />
          </div>

          <div>
            <label htmlFor="quantidadeUnidades" className="block text-sm font-medium text-gray-700 mb-1">
              Quantas unidades
            </label>
            <input
              id="quantidadeUnidades"
              type="number"
              min={1}
              required
              value={quantidadeUnidades}
              onChange={(e) => setQuantidadeUnidades(e.target.value ? Number(e.target.value) : NaN)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="telefone" className="block text-sm font-medium text-gray-700 mb-1">
              Telefone (não obrigatório)
            </label>
            <input
              id="telefone"
              type="tel"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              placeholder="(00) 00000-0000"
            />
          </div>

          <div>
            <label htmlFor="senha" className="block text-sm font-medium text-gray-700 mb-1">
              Senha
            </label>
            <input
              id="senha"
              type="password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              placeholder="Mínimo de 6 caracteres"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Cadastrando...' : 'Cadastrar'}
          </button>

          <p className="text-center text-sm text-gray-600">
            Já tem conta?{' '}
            <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
              Faça login
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
