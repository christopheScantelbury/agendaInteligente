import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { clientePublicoService, ClienteCadastroRequest } from '../services/clientePublicoService'
import FormField from '../components/FormField'
import { useNotification } from '../contexts/NotificationContext'

export default function CadastroCliente() {
  const navigate = useNavigate()
  const { showNotification } = useNotification()
  const [formData, setFormData] = useState<ClienteCadastroRequest>({
    nome: '',
    cpfCnpj: '',
    email: '',
    telefone: '',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cep: '',
    cidade: '',
    uf: '',
    dataNascimento: '',
    senha: '',
  })
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [rg, setRg] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')

    // Validações
    if (formData.senha && formData.senha.length < 6) {
      setErro('A senha deve ter no mínimo 6 caracteres')
      return
    }

    if (formData.senha !== confirmarSenha) {
      setErro('As senhas não coincidem')
      return
    }

    setLoading(true)

    try {
      // Preparar dados para envio
      const dadosEnvio: any = {
        ...formData,
      }

      // Adicionar rg se preenchido
      if (rg) {
        dadosEnvio.rg = rg
      }

      await clientePublicoService.cadastrar(dadosEnvio)
      showNotification('success', 'Cadastro realizado com sucesso! Faça login para continuar.')
      navigate('/cliente/login')
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Erro ao realizar cadastro. Tente novamente.'
      setErro(errorMessage)
      showNotification('error', errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const formatarCep = (value: string) => {
    const apenasNumeros = value.replace(/\D/g, '')
    return apenasNumeros.replace(/(\d{5})(\d{3})/, '$1-$2')
  }

  const formatarTelefone = (value: string) => {
    const apenasNumeros = value.replace(/\D/g, '')
    if (apenasNumeros.length <= 10) {
      return apenasNumeros.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
    } else {
      return apenasNumeros.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Cadastro de Cliente
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Preencha seus dados para criar sua conta
          </p>
        </div>

        {erro && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {erro}
          </div>
        )}

        <form className="mt-8 space-y-6 bg-white p-6 rounded-lg shadow" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nome Completo */}
            <div className="md:col-span-2">
              <FormField label="Nome Completo" required>
                <input
                  type="text"
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Digite seu nome completo"
                />
              </FormField>
            </div>

            {/* CPF/CNPJ */}
            <FormField label="CPF/CNPJ" required>
              <input
                type="text"
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                value={formData.cpfCnpj}
                onChange={(e) => {
                  const apenasNumeros = e.target.value.replace(/\D/g, '')
                  setFormData({ ...formData, cpfCnpj: apenasNumeros })
                }}
                placeholder="000.000.000-00 ou 00.000.000/0000-00"
                maxLength={18}
              />
            </FormField>

            {/* RG */}
            <FormField label="RG">
              <input
                type="text"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                value={rg}
                onChange={(e) => setRg(e.target.value)}
                placeholder="Digite seu RG"
              />
            </FormField>

            {/* Data de Nascimento */}
            <FormField label="Data de Nascimento" required>
              <input
                type="date"
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                value={formData.dataNascimento}
                onChange={(e) => setFormData({ ...formData, dataNascimento: e.target.value })}
                max={new Date().toISOString().split('T')[0]}
              />
            </FormField>

            {/* Email */}
            <FormField label="Email" required>
              <input
                type="email"
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="seu@email.com"
              />
            </FormField>

            {/* Telefone */}
            <FormField label="Telefone" required>
              <input
                type="text"
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                value={formData.telefone || ''}
                onChange={(e) => {
                  const formatted = formatarTelefone(e.target.value)
                  setFormData({ ...formData, telefone: formatted.replace(/\D/g, '') })
                }}
                placeholder="(00) 00000-0000"
                maxLength={15}
              />
            </FormField>

            {/* CEP */}
            <FormField label="CEP">
              <input
                type="text"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                value={formData.cep || ''}
                onChange={(e) => {
                  const formatted = formatarCep(e.target.value)
                  setFormData({ ...formData, cep: formatted.replace(/\D/g, '') })
                }}
                placeholder="00000-000"
                maxLength={9}
              />
            </FormField>

            {/* Endereço */}
            <FormField label="Endereço">
              <input
                type="text"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                value={formData.endereco || ''}
                onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                placeholder="Rua, Avenida, etc"
              />
            </FormField>

            {/* Número */}
            <FormField label="Número">
              <input
                type="text"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                value={formData.numero || ''}
                onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                placeholder="123"
              />
            </FormField>

            {/* Complemento */}
            <FormField label="Complemento">
              <input
                type="text"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                value={formData.complemento || ''}
                onChange={(e) => setFormData({ ...formData, complemento: e.target.value })}
                placeholder="Apto, Bloco, etc"
              />
            </FormField>

            {/* Bairro */}
            <FormField label="Bairro">
              <input
                type="text"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                value={formData.bairro || ''}
                onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                placeholder="Nome do bairro"
              />
            </FormField>

            {/* Cidade */}
            <FormField label="Cidade">
              <input
                type="text"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                value={formData.cidade || ''}
                onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                placeholder="Nome da cidade"
              />
            </FormField>

            {/* UF */}
            <FormField label="UF">
              <select
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                value={formData.uf || ''}
                onChange={(e) => setFormData({ ...formData, uf: e.target.value })}
              >
                <option value="">Selecione</option>
                <option value="AC">AC</option>
                <option value="AL">AL</option>
                <option value="AP">AP</option>
                <option value="AM">AM</option>
                <option value="BA">BA</option>
                <option value="CE">CE</option>
                <option value="DF">DF</option>
                <option value="ES">ES</option>
                <option value="GO">GO</option>
                <option value="MA">MA</option>
                <option value="MT">MT</option>
                <option value="MS">MS</option>
                <option value="MG">MG</option>
                <option value="PA">PA</option>
                <option value="PB">PB</option>
                <option value="PR">PR</option>
                <option value="PE">PE</option>
                <option value="PI">PI</option>
                <option value="RJ">RJ</option>
                <option value="RN">RN</option>
                <option value="RS">RS</option>
                <option value="RO">RO</option>
                <option value="RR">RR</option>
                <option value="SC">SC</option>
                <option value="SP">SP</option>
                <option value="SE">SE</option>
                <option value="TO">TO</option>
              </select>
            </FormField>

            {/* Senha */}
            <FormField label="Senha" required>
              <input
                type="password"
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                value={formData.senha || ''}
                onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                placeholder="Mínimo 6 caracteres"
                minLength={6}
              />
            </FormField>

            {/* Confirmar Senha */}
            <FormField label="Confirmar Senha" required>
              <input
                type="password"
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                placeholder="Digite a senha novamente"
                minLength={6}
              />
            </FormField>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Cadastrando...' : 'Cadastrar'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/cliente/login')}
              className="flex-1 flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancelar
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => navigate('/cliente/login')}
              className="text-sm text-indigo-600 hover:text-indigo-500"
            >
              Já tem conta? Faça login
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

